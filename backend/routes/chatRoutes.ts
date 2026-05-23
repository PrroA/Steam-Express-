import jwt from 'jsonwebtoken';
import type { Request, Response } from 'express';
import type { Socket } from 'socket.io';
import type { RouteDeps } from './types';
import type { CartItem, Game, GptReplyBody, JwtUser, Order } from '../../types/backend';
import { persistState } from '../persistence';
import { retrieveRagContext } from '../rag';
import type { RagSearchResult } from '../rag';

type TypedRequest<TBody> = Request & { body: TBody };
type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };
type ChatSource = { id: string; title: string; type: 'faq' | 'policy' | 'catalog' | 'order'; score: number };
type RagDebugPayload = {
  retriever: 'local-hybrid';
  query: string;
  matches: Array<{
    id: string;
    title: string;
    type: string;
    score: number;
    scoreBreakdown?: RagSearchResult['scoreBreakdown'];
    metadata?: RagSearchResult['doc']['metadata'];
  }>;
};
type RecommendationResult = {
  reply: string;
  sources: ChatSource[];
  contextText: string;
  personalized: boolean;
};
type PersonalizationProfile = {
  userId: number;
  wishlistIds: Set<number>;
  cartIds: Set<number>;
  purchasedIds: Set<number>;
  interestTerms: Set<string>;
  hasSignals: boolean;
};

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b-instruct';
const OPENAI_CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';

const serviceScopePattern =
  /(商城|商品|推薦|便宜|低價|預算|遊戲|價格|庫存|版本|購物車|結帳|付款|訂單|退款|配送|出貨|帳號|登入|願望清單|客服|game|price|cart|checkout|payment|order|refund|shipping|wishlist|account|login)/i;
const recommendationPattern = /(推薦|便宜|低價|預算|好玩|新手|熱門|遊戲|商品|庫存|版本|recommend|cheap|price|game|stock)/i;
const orderLookupPattern = /(我的訂單|訂單狀態|查訂單|最近訂單|訂單進度|付款狀態|出貨狀態|my order|order status)/i;

async function queryOllama(messages: ChatMessage[], temperature = 0.4): Promise<string | null> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false,
        options: { temperature },
      }),
    });

    if (!response.ok) return null;
    const payload = (await response.json()) as { message?: { content?: string } };
    return payload?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

async function queryAssistant({
  openaiClient,
  messages,
  temperature = 0.4,
}: {
  openaiClient: RouteDeps['openaiClient'];
  messages: ChatMessage[];
  temperature?: number;
}): Promise<{ reply: string; provider: 'openai' | 'ollama' } | null> {
  if (openaiClient) {
    try {
      const completion = await openaiClient.chat.completions.create({
        model: OPENAI_CHAT_MODEL,
        temperature,
        messages,
      });
      const reply = completion.choices?.[0]?.message?.content?.trim();
      if (reply) return { reply, provider: 'openai' };
    } catch (error) {
      const typedError = error as { message?: string };
      console.error('OpenAI completion failed:', typedError?.message || error);
    }
  }

  const localReply = await queryOllama(messages, temperature);
  if (localReply) return { reply: localReply, provider: 'ollama' };

  return null;
}

function getOptionalUser(req: Request, secretKey: string): JwtUser | null {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, secretKey) as JwtUser;
    if (typeof decoded.id !== 'number') return null;
    return decoded;
  } catch {
    return null;
  }
}

function isServiceQuestion(message: string) {
  return serviceScopePattern.test(message);
}

function isProductRecommendationQuestion(message: string) {
  return recommendationPattern.test(message);
}

function isOrderLookupQuestion(message: string) {
  return orderLookupPattern.test(message);
}

function toPrice(value: string | number | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: string | number | undefined) {
  return `$${toPrice(value).toFixed(2)}`;
}

function getGameLowestPrice(game: Game) {
  const variantPrices = (game.variants || []).map((variant) => toPrice(variant.price)).filter((price) => price > 0);
  return variantPrices.length > 0 ? Math.min(...variantPrices) : toPrice(game.price);
}

function getAvailableStock(game: Game) {
  return (game.variants || []).reduce((sum, variant) => sum + Math.max(0, Number(variant.stock) || 0), 0);
}

function extractInterestTerms(text: string) {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((term) => term.length >= 3);
}

function getGameTerms(game: Game) {
  return extractInterestTerms(`${game.name} ${game.description || ''}`);
}

function describeVariants(game: Game) {
  const available = (game.variants || []).filter((variant) => Number(variant.stock) > 0);
  if (available.length === 0) return '目前沒有可購買版本';
  return available
    .slice(0, 2)
    .map((variant) => `${variant.name} ${money(variant.price)}，庫存 ${variant.stock}`)
    .join('；');
}

function buildPersonalizationProfile(state: RouteDeps['state'], userId: number): PersonalizationProfile {
  const wishlistIds = new Set(state.wishlists[userId] || []);
  const cartIds = new Set((state.carts[userId] || []).map((item) => item.id));
  const purchasedIds = new Set<number>();
  const interestTerms = new Set<string>();

  const addGameTerms = (gameId: number) => {
    const game = state.games.find((item) => item.id === gameId);
    if (!game) return;
    for (const term of getGameTerms(game)) {
      interestTerms.add(term);
    }
  };

  for (const gameId of wishlistIds) addGameTerms(gameId);
  for (const gameId of cartIds) addGameTerms(gameId);
  for (const order of state.orders[userId] || []) {
    for (const item of order.items || []) {
      purchasedIds.add(item.id);
      addGameTerms(item.id);
    }
  }

  return {
    userId,
    wishlistIds,
    cartIds,
    purchasedIds,
    interestTerms,
    hasSignals: wishlistIds.size > 0 || cartIds.size > 0 || purchasedIds.size > 0,
  };
}

function getPersonalizedScore(game: Game, profile: PersonalizationProfile | null) {
  if (!profile?.hasSignals) return 0;

  let score = 0;
  if (profile.wishlistIds.has(game.id)) score += 24;
  if (profile.cartIds.has(game.id)) score += 18;
  if (profile.purchasedIds.has(game.id) && !profile.wishlistIds.has(game.id) && !profile.cartIds.has(game.id)) {
    score -= 5;
  }

  const overlap = getGameTerms(game).filter((term) => profile.interestTerms.has(term)).length;
  score += Math.min(overlap * 3, 12);
  return score;
}

function getPersonalizedReasons(game: Game, profile: PersonalizationProfile | null) {
  const reasons: string[] = [];
  if (!profile?.hasSignals) return reasons;

  if (profile.wishlistIds.has(game.id)) reasons.push('在你的願望清單裡');
  if (profile.cartIds.has(game.id)) reasons.push('你已經放進購物車');

  const overlap = getGameTerms(game).filter((term) => profile.interestTerms.has(term)).length;
  if (!profile.wishlistIds.has(game.id) && !profile.cartIds.has(game.id) && overlap > 0) {
    reasons.push('和你關注過的商品相近');
  }
  if (profile.purchasedIds.has(game.id) && reasons.length === 0) {
    reasons.push('你之前買過，適合回購或確認其他版本');
  }

  return reasons;
}

function buildRecommendation(state: RouteDeps['state'], message: string, user: JwtUser | null): RecommendationResult {
  const activeGames = state.games.filter((game) => game.isActive !== false);
  const cheapIntent = /(便宜|低價|預算|cheap|price)/i.test(message);
  const stockIntent = /(庫存|現貨|stock)/i.test(message);
  const personalIntent = /(我的|我喜歡|適合我|個人|personal|for me)/i.test(message);
  const profile = user ? buildPersonalizationProfile(state, user.id) : null;

  const ranked = [...activeGames].sort((a, b) => {
    const personalDelta = getPersonalizedScore(b, profile) - getPersonalizedScore(a, profile);
    if ((personalIntent || profile?.hasSignals) && personalDelta !== 0) return personalDelta;
    if (stockIntent) return getAvailableStock(b) - getAvailableStock(a);
    if (cheapIntent) return getGameLowestPrice(a) - getGameLowestPrice(b);
    return getAvailableStock(b) - getAvailableStock(a) || getGameLowestPrice(a) - getGameLowestPrice(b);
  });

  const picks = ranked.slice(0, 3);
  const sources: ChatSource[] = picks.slice(0, 2).map((game, index) => ({
    id: `catalog-game-${game.id}`,
    title: game.name,
    type: 'catalog',
    score: 10 - index,
  }));

  if (picks.length === 0) {
    return {
      reply: '目前商品資料還沒準備好。你可以先回到商店頁看看最新上架的遊戲。',
      sources,
      contextText: '目前沒有可推薦商品。',
      personalized: Boolean(profile?.hasSignals),
    };
  }

  const intro =
    profile?.hasSignals
      ? '我會參考你的願望清單、購物車和曾經買過的商品，再搭配價格與庫存來推薦：'
      : cheapIntent
        ? '如果你想先用低預算入手，我會優先看價格和庫存：'
        : stockIntent
          ? '如果你想找目前比較好買到的商品，我會優先看庫存：'
          : user
            ? '目前還沒有足夠的個人偏好資料，我先依照價格和庫存推薦這幾款：'
            : '我會先推薦這幾款比較適合從商店開始逛的遊戲：';

  const lineDetails = picks.map((game, index) => {
    const stock = getAvailableStock(game);
    const stockText = stock > 0 ? `目前可購買庫存約 ${stock} 件` : '目前庫存偏少';
    const reasons = getPersonalizedReasons(game, profile);
    const reasonText = reasons.length > 0 ? `推薦原因：${reasons.join('、')}。` : '';
    return {
      replyLine: `${index + 1}. ${game.name}，最低 ${money(getGameLowestPrice(game))}，${stockText}。${reasonText}${describeVariants(game)}`,
      contextLine: `${index + 1}. ${game.name}；最低價格 ${money(getGameLowestPrice(game))}；${stockText}；${reasonText || '推薦原因：價格、庫存與商品資料符合詢問。'}版本：${describeVariants(game)}`,
    };
  });

  return {
    reply: `${intro}\n${lineDetails.map((item) => item.replyLine).join('\n')}\n\n想讓推薦更貼近你，可以先把喜歡的商品加入願望清單，或把考慮中的版本放進購物車。`,
    sources,
    contextText: `${intro}\n${lineDetails.map((item) => item.contextLine).join('\n')}`,
    personalized: Boolean(profile?.hasSignals),
  };
}

async function polishRecommendationReply({
  openaiClient,
  message,
  recommendation,
}: {
  openaiClient: RouteDeps['openaiClient'];
  message: string;
  recommendation: RecommendationResult;
}) {
  const result = await queryAssistant({
    openaiClient,
    temperature: 0.35,
    messages: [
      {
        role: 'system',
        content:
          '你是遊戲商城的 AI 選品顧問。請用自然繁體中文回覆，像真人客服在推薦商品。只能根據提供的候選商品與原因回答，不要捏造評分、折扣或不存在的特色。不要出現 API、server、token、模型、provider 等工程字眼。回覆 3 到 6 句，可用條列但不要太機械。',
      },
      {
        role: 'user',
        content: `使用者問題：${message}\n\n候選商品與推薦理由：\n${recommendation.contextText}\n\n請把以上內容整理成自然、有選品感的推薦回覆。`,
      },
    ],
  });

  return result;
}

function statusLabel(status: Order['status']) {
  const labels: Record<Order['status'], string> = {
    pending: '待付款',
    payment_failed: '付款未成功',
    paid: '付款完成',
    cancelled: '已取消',
    refunded: '已退款',
  };
  return labels[status] || '處理中';
}

function fulfillmentLabel(status: Order['fulfillmentStatus']) {
  if (status === 'shipped') return '已出貨';
  if (status === 'delivered') return '已送達';
  return '待出貨';
}

function formatOrderDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function summarizeItems(items: CartItem[]) {
  return items
    .slice(0, 2)
    .map((item) => `${item.name}${item.variantName ? `（${item.variantName}）` : ''} x${item.quantity || 1}`)
    .join('、');
}

function buildOrderStatusReply(orders: Order[]) {
  if (orders.length === 0) {
    return {
      reply: '目前還沒有看到你的訂單。你可以先到商店選商品加入購物車，結帳後就會出現在訂單中心。',
      sources: [] as ChatSource[],
    };
  }

  const latest = [...orders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3);
  const lines = latest.map((order, index) => {
    const shortId = order.id.slice(-6);
    const itemText = summarizeItems(order.items) || `${order.items.length} 件商品`;
    const actionHint =
      order.status === 'pending'
        ? '可以回到訂單詳情繼續付款。'
        : order.status === 'payment_failed'
          ? '可以在訂單詳情重新付款。'
          : order.status === 'paid'
            ? '接下來等候出貨即可。'
            : '';

    return `${index + 1}. 訂單 ${shortId}：${statusLabel(order.status)}，${fulfillmentLabel(order.fulfillmentStatus)}，金額 ${money(order.total)}，${formatOrderDate(order.date)} 建立。${itemText}。${actionHint}`;
  });

  return {
    reply: `我幫你整理最近的訂單狀態：\n${lines.join('\n')}`,
    sources: latest.slice(0, 2).map((order, index) => ({
      id: order.id,
      title: `訂單 ${order.id.slice(-6)}`,
      type: 'order' as const,
      score: 10 - index,
    })),
  };
}

function buildFallbackReply(message: string, grounded: boolean) {
  if (!isServiceQuestion(message)) {
    return '我主要能協助商城裡的商品、購物車、付款、訂單、退款、配送和帳號問題。你可以問我「推薦便宜的遊戲」或「我的訂單狀態」。';
  }

  if (grounded) {
    if (/(退款|refund)/i.test(message)) {
      return '可以在訂單詳情申請退款。退款完成後訂單會顯示已退款，demo 版本也會把商品庫存補回。';
    }
    if (/(付款|結帳|信用卡|payment|checkout|card)/i.test(message)) {
      return '先把商品加入購物車並完成結帳，訂單建立後可以使用信用卡測試付款；如果信用卡付款暫時無法載入，也可以用 Demo 快速付款完成流程。';
    }
    if (/(配送|出貨|shipping|delivery)/i.test(message)) {
      return '付款完成後訂單會進入待出貨。你可以在訂單中心查看目前出貨狀態。';
    }
    if (/(帳號|登入|密碼|account|login|password)/i.test(message)) {
      return '你可以註冊帳號或使用 Demo 快速登入。登入後可以管理購物車、願望清單和訂單中心。';
    }
    return '我可以依照商店資料協助你整理商品、付款、訂單、退款、配送和帳號相關問題。';
  }

  return '目前 AI 暫時無法使用，但你仍然可以完成商店流程。建議先到商店選商品、加入購物車，再到訂單中心付款或查看狀態。';
}

function buildSystemPrompt(grounded: boolean) {
  const base =
    '你是 Steam Practice 商城的客服助理。請用自然繁體中文回答一般使用者，不要出現 API、server、token、PaymentIntent、500 等工程字眼。不要替使用者執行付款、退款、取消訂單或修改資料，只能說明下一步。';

  if (!grounded) {
    return `${base} 如果問題不在商城客服範圍，請簡短引導回商品、購物車、付款、訂單、退款、配送、帳號或願望清單。`;
  }

  return `${base} 請只根據提供的商城資料回答；如果資料不足，請說明可以到商店頁或訂單中心確認。回答控制在 4 到 8 句。`;
}

function shouldIncludeRagDebug(req: Request) {
  const debug = req.query?.debug;
  const requested = debug === '1' || debug === 'true';
  const allowed = process.env.NODE_ENV !== 'production' || process.env.ENABLE_RAG_DEBUG === 'true';
  return requested && allowed;
}

function buildRagDebug(query: string, matches: RagSearchResult[] = []): RagDebugPayload {
  return {
    retriever: 'local-hybrid',
    query,
    matches: matches.map((item) => ({
      id: item.doc.id,
      title: item.doc.title,
      type: item.doc.type,
      score: item.score,
      scoreBreakdown: item.scoreBreakdown,
      metadata: item.doc.metadata,
    })),
  };
}

export function registerChatRoutes({ app, io, state, openaiClient, secretKey }: RouteDeps) {
  const { messages } = state;

  io.on('connection', (socket: Socket) => {
    socket.emit('chatHistory', messages);

    socket.on('sendMessage', (message: { user?: string; text: string }) => {
      const newMessage = {
        user: message.user || '訪客',
        text: message.text,
        timestamp: new Date().toLocaleTimeString(),
      };
      messages.push(newMessage);
      persistState(state);
      io.emit('receiveMessage', newMessage);
    });
  });

  app.post('/gpt-reply', async (req: TypedRequest<GptReplyBody>, res: Response) => {
    const message = req.body?.message?.trim();
    if (!message) {
      return res.status(400).json({ error: '請輸入想詢問的內容。' });
    }

    const result = await queryAssistant({
      openaiClient,
      messages: [
        { role: 'system', content: buildSystemPrompt(false) },
        { role: 'user', content: message },
      ],
    });

    return res.json({
      reply: result?.reply || buildFallbackReply(message, false),
      provider: result?.provider,
    });
  });

  app.post('/chat/rag', async (req: TypedRequest<GptReplyBody>, res: Response) => {
    const message = req.body?.message?.trim();
    if (!message) {
      return res.status(400).json({ error: '請輸入想詢問的內容。' });
    }

    const user = getOptionalUser(req, secretKey);
    const debugEnabled = shouldIncludeRagDebug(req);

    if (isOrderLookupQuestion(message)) {
      if (!user) {
        return res.json({
          reply: '登入後我才能幫你查看自己的訂單狀態。你也可以先到訂單中心查看，或使用 Demo 快速登入體驗完整流程。',
          grounded: false,
          mode: 'order-auth-required',
          sources: [],
          ...(debugEnabled ? { debug: buildRagDebug(message) } : {}),
        });
      }

      const summary = buildOrderStatusReply(state.orders[user.id] || []);
      return res.json({
        reply: summary.reply,
        grounded: true,
        mode: 'order-status',
        sources: summary.sources,
        ...(debugEnabled ? { debug: buildRagDebug(message) } : {}),
      });
    }

    if (isProductRecommendationQuestion(message)) {
      const recommendation = buildRecommendation(state, message, user);
      const polished = await polishRecommendationReply({ openaiClient, message, recommendation });
      const debugMatches = debugEnabled ? retrieveRagContext(state, message, 4) : [];
      return res.json({
        reply: polished?.reply || recommendation.reply,
        grounded: recommendation.sources.length > 0,
        mode: user ? 'personalized-recommendation' : 'product-recommendation',
        provider: polished?.provider,
        sources: recommendation.sources,
        ...(debugEnabled ? { debug: buildRagDebug(message, debugMatches) } : {}),
      });
    }

    const contexts = retrieveRagContext(state, message, 4);
    const sourceItems: ChatSource[] = contexts.map((item) => ({
      id: item.doc.id,
      title: item.doc.title,
      type: item.doc.type,
      score: item.score,
    }));
    const grounded = contexts.length > 0;

    if (!grounded && !isServiceQuestion(message)) {
      return res.json({
        reply: buildFallbackReply(message, false),
        grounded: false,
        mode: 'out-of-scope',
        sources: [],
        ...(debugEnabled ? { debug: buildRagDebug(message, contexts) } : {}),
      });
    }

    const contextText = contexts
      .map((item, index) => `[資料 ${index + 1}] ${item.doc.title}：${item.doc.content}`)
      .join('\n');

    const result = await queryAssistant({
      openaiClient,
      temperature: grounded ? 0.2 : 0.35,
      messages: [
        { role: 'system', content: buildSystemPrompt(grounded) },
        {
          role: 'user',
          content: grounded
            ? `使用者問題：${message}\n\n商城資料：\n${contextText}`
            : `使用者問題：${message}`,
        },
      ],
    });

    return res.json({
      reply: result?.reply || buildFallbackReply(message, grounded),
      grounded,
      mode: grounded ? (result ? 'service-rag' : 'service-rag-fallback') : result ? 'general-service' : 'service-fallback',
      provider: result?.provider,
      sources: sourceItems,
      ...(debugEnabled ? { debug: buildRagDebug(message, contexts) } : {}),
    });
  });
}
