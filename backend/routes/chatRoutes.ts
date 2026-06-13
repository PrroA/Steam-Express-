import jwt from 'jsonwebtoken';
import type { Request, Response } from 'express';
import type { Socket } from 'socket.io';
import type { RouteDeps } from './types';
import type { CartItem, Game, GptReplyBody, JwtUser, Order } from '../../types/backend';
import { persistState } from '../persistence';
import { retrieveRagContext } from '../rag';
import type { RagSearchResult } from '../rag';
import { getAiUsageEvents, getAiUsageSummary, recordAiUsage } from '../aiUsageLog';

type TypedRequest<TBody> = Request & { body: TBody };
type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };
type ChatSource = {
  id: string;
  title: string;
  type: 'faq' | 'policy' | 'catalog' | 'order';
  score: number;
  gameId?: number;
  price?: string;
  image?: string;
  reason?: string;
  href?: string;
};
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
type ProductDecisionResult = RecommendationResult & {
  topPick?: Game;
};
type ProductComparisonRow = {
  gameId: number;
  name: string;
  price: string;
  stock: number;
  fit: string;
  tradeoff: string;
  href: string;
};
type ProductComparisonResult = RecommendationResult & {
  comparison: ProductComparisonRow[];
};
type ProductSearchIntent = {
  budgetMax: number | null;
  budgetLabel: string | null;
  labels: string[];
  terms: string[];
  avoidTerms: string[];
  onlyInStock: boolean;
};
type CartReviewItem = {
  gameId: number;
  name: string;
  quantity: number;
  variantName?: string;
  lineTotal: string;
  advice: string;
  href: string;
};
type CartReviewResult = {
  reply: string;
  grounded: boolean;
  sources: ChatSource[];
  cartReview: {
    total: string;
    itemCount: number;
    verdict: string;
    nextStep: string;
    items: CartReviewItem[];
  };
};
type OrderCareResult = {
  reply: string;
  sources: ChatSource[];
  orderCare: {
    orderId: string;
    shortId: string;
    status: string;
    fulfillmentStatus: string;
    total: string;
    items: string;
    primaryAction: string;
    nextStep: string;
    canRequestRefund: boolean;
    href: string;
  };
};
type ShoppingAgentStep = {
  id: string;
  title: string;
  status: 'done' | 'suggested' | 'blocked';
  detail: string;
  href?: string;
  gameId?: number;
};
type ShoppingAgentResult = RecommendationResult & {
  agentPlan: {
    goal: string;
    summary: string;
    nextHref?: string;
    steps: ShoppingAgentStep[];
  };
};
type ClientPreferenceProfile = NonNullable<GptReplyBody['clientProfile']>;
type PersonalizationProfile = {
  userId: number | null;
  wishlistIds: Set<number>;
  cartIds: Set<number>;
  purchasedIds: Set<number>;
  recentlyViewedIds: Set<number>;
  interestTerms: Set<string>;
  averagePrice: number;
  checkoutCreatedCount: number;
  hasSignals: boolean;
};

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b-instruct';
const OPENAI_CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';

const serviceScopePattern =
  /(商城|商品|推薦|便宜|低價|預算|遊戲|價格|庫存|版本|購物車|結帳|付款|訂單|退款|配送|出貨|帳號|登入|願望清單|客服|game|price|cart|checkout|payment|order|refund|shipping|wishlist|account|login)/i;
const recommendationPattern = /(推薦|便宜|低價|預算|好玩|新手|熱門|遊戲|商品|庫存|版本|recommend|cheap|price|game|stock)/i;
const productSearchPattern =
  /(找|搜尋|查詢|篩選|有沒有|想玩|適合|新手|放鬆|劇情|多人|合作|恐怖|不要|以下|預算|便宜|search|find|filter|looking for)/i;
const productDecisionPattern =
  /(比較|比一比|哪一款|哪款|怎麼選|該買|適合|預算|不超過|以內|推薦.*還是|compare|versus|\bvs\b|which|choose|budget|under|below|for me)/i;
const productComparisonPattern = /(比較|比一比|差異|哪個|哪一款|哪款|vs|versus|compare|comparison|better)/i;
const cartReviewPattern = /(購物車.*健檢|檢查.*購物車|購物車.*適合|購物車.*建議|結帳前.*建議|cart.*review|review.*cart|check.*cart)/i;
const orderCarePattern =
  /(訂單.*接下來|訂單.*怎麼辦|訂單.*退款|這筆.*退款|這筆.*怎麼辦|付款後.*怎麼辦|付款後.*處理|售後|after.*order|order.*next|refund.*order)/i;
const orderLookupPattern = /(我的訂單|訂單狀態|查訂單|最近訂單|訂單進度|付款狀態|出貨狀態|my order|order status)/i;

const shoppingAgentPattern =
  /(幫我|代我|自動|購物助理|AI 助理|agent|assistant|加入比較|加入願望清單|收藏|wishlist|add.*compare|add.*wishlist)/i;

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

function isProductSearchQuestion(message: string) {
  if (!productSearchPattern.test(message)) return false;
  if (/推薦|recommend/i.test(message)) return false;
  if (!/(找|搜尋|查詢|篩選|有沒有|想玩|想找|search|find|filter|looking for)/i.test(message)) return false;
  if (/訂單|付款|退款|出貨|配送|帳號|登入|註冊|order|payment|refund|shipping|account|login/i.test(message)) {
    return false;
  }
  return true;
}

function isProductDecisionQuestion(message: string) {
  const hasDecisionQualifier =
    /(比較|比一比|哪一款|哪款|怎麼選|該買|預算|不超過|低於|小於|以內|compare|versus|\bvs\b|which|choose|budget|under|below)/i.test(
      message
    );
  return hasDecisionQualifier && productDecisionPattern.test(message) && recommendationPattern.test(message);
}

function isProductComparisonQuestion(message: string, state: RouteDeps['state']) {
  return productComparisonPattern.test(message) && findMentionedGames(state.games, message).length >= 2;
}

function isCartReviewQuestion(message: string) {
  return cartReviewPattern.test(message);
}

function isOrderCareQuestion(message: string) {
  return orderCarePattern.test(message);
}

function isOrderLookupQuestion(message: string) {
  return orderLookupPattern.test(message);
}

function wantsWishlistAction(message: string) {
  return /(願望清單|收藏|wishlist|save)/i.test(message);
}

function wantsCompareAction(message: string) {
  return /(加入比較|比一比|比較|compare|versus|\bvs\b)/i.test(message);
}

function isShoppingAgentQuestion(message: string) {
  if (!shoppingAgentPattern.test(message)) return false;
  if (/order|payment|refund|shipping|account|login|訂單|付款|退款|配送|出貨|帳號|登入/i.test(message)) {
    return false;
  }
  return (
    recommendationPattern.test(message) ||
    productDecisionPattern.test(message) ||
    productSearchPattern.test(message) ||
    wantsWishlistAction(message) ||
    wantsCompareAction(message)
  );
}

function toPrice(value: string | number | undefined) {
  const parsed =
    typeof value === 'number'
      ? value
      : Number(String(value || '').replace(/[$,\s]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: string | number | undefined) {
  return `$${toPrice(value).toFixed(2)}`;
}

function getCartItemUnitPrice(item: CartItem) {
  if (item.variantId && item.variants) {
    const selectedVariant = item.variants.find((variant) => variant.id === item.variantId);
    if (selectedVariant) return toPrice(selectedVariant.price);
  }
  return getGameLowestPrice(item);
}

function getGameLowestPrice(game: Game) {
  const variantPrices = (game.variants || []).map((variant) => toPrice(variant.price)).filter((price) => price > 0);
  return variantPrices.length > 0 ? Math.min(...variantPrices) : toPrice(game.price);
}

function getAvailableStock(game: Game) {
  return (game.variants || []).reduce((sum, variant) => sum + Math.max(0, Number(variant.stock) || 0), 0);
}

function createCatalogSource(game: Game, index: number, reason?: string): ChatSource {
  return {
    id: `catalog-game-${game.id}`,
    title: game.name,
    type: 'catalog',
    score: Math.max(1, 10 - index),
    gameId: game.id,
    price: money(getGameLowestPrice(game)),
    image: game.image,
    reason,
    href: `/game/${game.id}`,
  };
}

function normalizeForMatch(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, ' ').trim();
}

function getNameTokens(name: string) {
  return normalizeForMatch(name)
    .split(/\s+/)
    .filter((token) => token.length >= 2 && token !== 'the');
}

function isGameMentioned(game: Game, message: string) {
  const normalizedMessage = normalizeForMatch(message);
  const normalizedName = normalizeForMatch(game.name);
  if (normalizedMessage.includes(normalizedName)) return true;

  const tokens = getNameTokens(game.name);
  if (tokens.length === 0) return false;
  const requiredMatches = Math.min(tokens.length, 2);
  return tokens.filter((token) => normalizedMessage.includes(token)).length >= requiredMatches;
}

function findMentionedGames(games: Game[], message: string) {
  return games.filter((game) => game.isActive !== false && isGameMentioned(game, message));
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

function normalizeClientProfile(clientProfile?: ClientPreferenceProfile) {
  const normalizeIds = (ids?: number[]) =>
    Array.isArray(ids)
      ? ids
          .map((id) => Number(id))
          .filter((id) => Number.isInteger(id) && id > 0)
          .slice(0, 12)
      : [];

  return {
    recentlyViewedIds: normalizeIds(clientProfile?.recentlyViewedIds),
    wishlistIds: normalizeIds(clientProfile?.wishlistIds),
    cartIds: normalizeIds(clientProfile?.cartIds),
    interactedGameIds: normalizeIds(clientProfile?.interactedGameIds),
    recentlyViewedNames: Array.isArray(clientProfile?.recentlyViewedNames)
      ? clientProfile.recentlyViewedNames.map((name) => String(name || '').trim()).filter(Boolean).slice(0, 8)
      : [],
    topKeywords: Array.isArray(clientProfile?.topKeywords)
      ? clientProfile.topKeywords.map((keyword) => String(keyword || '').trim()).filter(Boolean).slice(0, 8)
      : [],
    averagePrice: Number(clientProfile?.averagePrice || 0),
    checkoutCreatedCount: Math.max(0, Number(clientProfile?.checkoutCreatedCount || 0)),
  };
}

function hasClientPreferenceSignals(clientProfile?: ClientPreferenceProfile) {
  const normalized = normalizeClientProfile(clientProfile);
  return (
    normalized.recentlyViewedIds.length > 0 ||
    normalized.wishlistIds.length > 0 ||
    normalized.cartIds.length > 0 ||
    normalized.interactedGameIds.length > 0 ||
    normalized.recentlyViewedNames.length > 0 ||
    normalized.topKeywords.length > 0 ||
    normalized.averagePrice > 0 ||
    normalized.checkoutCreatedCount > 0
  );
}

function buildPersonalizationProfile(
  state: RouteDeps['state'],
  userId: number | null,
  clientProfile?: ClientPreferenceProfile
): PersonalizationProfile {
  const normalizedClientProfile = normalizeClientProfile(clientProfile);
  const wishlistIds = new Set([
    ...(userId ? state.wishlists[userId] || [] : []),
    ...normalizedClientProfile.wishlistIds,
  ]);
  const cartIds = new Set([
    ...(userId ? (state.carts[userId] || []).map((item) => item.id) : []),
    ...normalizedClientProfile.cartIds,
  ]);
  const purchasedIds = new Set<number>();
  const recentlyViewedIds = new Set([
    ...normalizedClientProfile.recentlyViewedIds,
    ...normalizedClientProfile.interactedGameIds,
  ]);
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
  for (const gameId of recentlyViewedIds) addGameTerms(gameId);
  for (const keyword of normalizedClientProfile.topKeywords) {
    for (const term of extractInterestTerms(keyword)) {
      interestTerms.add(term);
    }
  }
  for (const name of normalizedClientProfile.recentlyViewedNames) {
    for (const term of extractInterestTerms(name)) {
      interestTerms.add(term);
    }
  }
  if (userId) {
    for (const order of state.orders[userId] || []) {
      for (const item of order.items || []) {
        purchasedIds.add(item.id);
        addGameTerms(item.id);
      }
    }
  }

  return {
    userId,
    wishlistIds,
    cartIds,
    purchasedIds,
    recentlyViewedIds,
    interestTerms,
    averagePrice: Number.isFinite(normalizedClientProfile.averagePrice) ? normalizedClientProfile.averagePrice : 0,
    checkoutCreatedCount: normalizedClientProfile.checkoutCreatedCount,
    hasSignals:
      wishlistIds.size > 0 ||
      cartIds.size > 0 ||
      purchasedIds.size > 0 ||
      recentlyViewedIds.size > 0 ||
      interestTerms.size > 0 ||
      normalizedClientProfile.checkoutCreatedCount > 0,
  };
}

function getPersonalizedScore(game: Game, profile: PersonalizationProfile | null) {
  if (!profile?.hasSignals) return 0;

  let score = 0;
  if (profile.wishlistIds.has(game.id)) score += 24;
  if (profile.cartIds.has(game.id)) score += 18;
  if (profile.recentlyViewedIds.has(game.id)) score += 10;
  if (profile.purchasedIds.has(game.id) && !profile.wishlistIds.has(game.id) && !profile.cartIds.has(game.id)) {
    score -= 5;
  }

  const overlap = getGameTerms(game).filter((term) => profile.interestTerms.has(term)).length;
  score += Math.min(overlap * 3, 12);
  if (profile.averagePrice > 0) {
    const price = getGameLowestPrice(game);
    const closeness = Math.max(0, 1 - Math.abs(price - profile.averagePrice) / Math.max(1, profile.averagePrice));
    score += Math.round(closeness * 8);
  }
  return score;
}

function getPersonalizedReasons(game: Game, profile: PersonalizationProfile | null) {
  const reasons: string[] = [];
  if (!profile?.hasSignals) return reasons;

  if (profile.wishlistIds.has(game.id)) reasons.push('在你的願望清單裡');
  if (profile.cartIds.has(game.id)) reasons.push('你已經放進購物車');
  if (!profile.wishlistIds.has(game.id) && !profile.cartIds.has(game.id) && profile.recentlyViewedIds.has(game.id)) {
    reasons.push('你最近看過這款商品');
  }

  const overlap = getGameTerms(game).filter((term) => profile.interestTerms.has(term)).length;
  if (
    !profile.wishlistIds.has(game.id) &&
    !profile.cartIds.has(game.id) &&
    !profile.recentlyViewedIds.has(game.id) &&
    overlap > 0
  ) {
    reasons.push('和你關注過的商品相近');
  }
  if (profile.averagePrice > 0 && reasons.length < 2) {
    const price = getGameLowestPrice(game);
    const closeness = Math.max(0, 1 - Math.abs(price - profile.averagePrice) / Math.max(1, profile.averagePrice));
    if (closeness > 0.6) reasons.push('價格接近你最近關注的區間');
  }
  if (profile.checkoutCreatedCount > 0 && reasons.length < 2) {
    reasons.push('適合接續你最近的結帳流程');
  }
  if (profile.purchasedIds.has(game.id) && reasons.length === 0) {
    reasons.push('你之前買過，適合回購或確認其他版本');
  }

  return reasons;
}

function extractBudget(message: string) {
  const normalized = message.replace(/,/g, '');
  const explicitBudget = normalized.match(/(?:預算|不超過|低於|小於|以內|budget|under|below)\s*(?:是|大概|約|around|about)?\s*\$?\s*(\d+(?:\.\d+)?)/i);
  if (explicitBudget) return Number(explicitBudget[1]);

  const dollarAmount = normalized.match(/\$\s*(\d+(?:\.\d+)?)/);
  return dollarAmount ? Number(dollarAmount[1]) : null;
}

function extractDecisionTerms(message: string) {
  const lowerMessage = message.toLowerCase();
  const termGroups: Array<{ label: string; terms: string[]; patterns: RegExp[] }> = [
    { label: 'RPG', terms: ['rpg', 'role', 'fantasy'], patterns: [/rpg/i, /角色|奇幻|魔幻|開放世界/] },
    { label: '開放世界', terms: ['open-world', 'open', 'world', 'adventure'], patterns: [/open[-\s]?world/i, /開放世界|冒險|探索/] },
    { label: '劇情', terms: ['story', 'legendary', 'experience'], patterns: [/story/i, /劇情|故事|沉浸/] },
    { label: '動作', terms: ['action', 'dark', 'souls'], patterns: [/action/i, /動作|戰鬥|高難度|硬派/] },
    { label: '恐怖生存', terms: ['survival', 'horror'], patterns: [/survival|horror/i, /恐怖|生存/] },
    { label: '便宜', terms: ['cheap', 'price', 'low'], patterns: [/cheap|budget/i, /便宜|低價|省錢/] },
  ];

  const matchedLabels: string[] = [];
  const matchedTerms = new Set<string>();

  for (const group of termGroups) {
    if (group.patterns.some((pattern) => pattern.test(message))) {
      matchedLabels.push(group.label);
      for (const term of group.terms) matchedTerms.add(term);
    }
  }

  for (const term of extractInterestTerms(lowerMessage)) {
    matchedTerms.add(term);
  }

  return {
    labels: matchedLabels,
    terms: Array.from(matchedTerms),
  };
}

function extractProductSearchIntent(message: string): ProductSearchIntent {
  const lowerMessage = message.toLowerCase();
  const labels: string[] = [];
  const terms = new Set<string>();
  const avoidTerms = new Set<string>();

  const addGroup = (label: string, groupTerms: string[], patterns: RegExp[]) => {
    if (patterns.some((pattern) => pattern.test(message))) {
      labels.push(label);
      groupTerms.forEach((term) => terms.add(term));
    }
  };

  addGroup('RPG / 奇幻', ['rpg', 'fantasy', 'role'], [/rpg/i, /角色|奇幻|魔法|巫師|冒險/]);
  addGroup('開放世界 / 探索', ['open', 'world', 'adventure'], [/open[-\s]?world/i, /開放世界|探索|自由|冒險/]);
  addGroup('劇情取向', ['story', 'legendary', 'experience'], [/story/i, /劇情|故事|沉浸|敘事/]);
  addGroup('輕鬆入門', ['magical', 'experience', 'adventure'], [/新手|入門|放鬆|輕鬆|休閒/]);
  addGroup('多人 / 合作', ['online', 'multiplayer', 'premium'], [/多人|合作|連線|朋友|online|multiplayer/i]);
  addGroup('恐怖 / 生存', ['horror', 'survival'], [/恐怖|生存|horror|survival/i]);

  if (/不要.*恐怖|不想.*恐怖|avoid.*horror|no horror/i.test(message)) {
    avoidTerms.add('horror');
    avoidTerms.add('survival');
  }

  for (const term of extractInterestTerms(lowerMessage)) {
    if (!['find', 'search', 'game', 'games', 'looking', 'for', 'under', 'below'].includes(term)) {
      terms.add(term);
    }
  }

  const normalized = message.replace(/,/g, '');
  let budgetMax: number | null = null;
  let budgetLabel: string | null = null;
  const budgetMatch =
    normalized.match(/(?:預算|低於|不超過|以下|under|below|max|budget)\s*\$?\s*(\d+(?:\.\d+)?)/i) ||
    normalized.match(/\$?\s*(\d+(?:\.\d+)?)\s*(?:元|美金|美元|塊)?\s*(?:以下|以內|內|under|below)/i);

  if (budgetMatch) {
    const rawBudget = Number(budgetMatch[1]);
    if (Number.isFinite(rawBudget)) {
      budgetLabel = budgetMatch[0].trim();
      budgetMax = /元|塊/.test(budgetMatch[0]) && rawBudget > 100 ? rawBudget / 30 : rawBudget;
    }
  }

  return {
    budgetMax,
    budgetLabel,
    labels,
    terms: Array.from(terms),
    avoidTerms: Array.from(avoidTerms),
    onlyInStock: /有庫存|現貨|可買|in stock|available/i.test(message),
  };
}

function scoreGameForSearch(game: Game, intent: ProductSearchIntent, profile: PersonalizationProfile | null) {
  const price = getGameLowestPrice(game);
  const stock = getAvailableStock(game);
  const gameText = `${game.name} ${game.description || ''}`.toLowerCase();
  let score = getPersonalizedScore(game, profile);

  if (stock > 0) score += 8;
  if (intent.onlyInStock && stock <= 0) score -= 80;

  if (intent.budgetMax !== null) {
    if (price <= intent.budgetMax) score += 30 + Math.max(0, intent.budgetMax - price) / 4;
    else score -= Math.min((price - intent.budgetMax) * 2, 60);
  }

  for (const term of intent.terms) {
    if (gameText.includes(term)) score += 14;
  }

  for (const term of intent.avoidTerms) {
    if (gameText.includes(term)) score -= 45;
  }

  if (intent.labels.length === 0 && /rpg|fantasy|adventure/i.test(gameText)) score += 3;
  return score;
}

function buildSearchReason(game: Game, intent: ProductSearchIntent, profile: PersonalizationProfile | null) {
  const reasons: string[] = [];
  const price = getGameLowestPrice(game);
  const stock = getAvailableStock(game);
  const gameText = `${game.name} ${game.description || ''}`.toLowerCase();

  if (intent.budgetMax !== null && price <= intent.budgetMax) {
    reasons.push(`符合預算，最低版本約 ${money(price)}`);
  }

  const matchedLabels = intent.labels.filter((label) => {
    if (label.includes('RPG')) return /rpg|fantasy|magical/i.test(gameText);
    if (label.includes('開放')) return /open|world|adventure/i.test(gameText);
    if (label.includes('劇情')) return /legendary|experience|survival/i.test(gameText);
    if (label.includes('輕鬆')) return /magical|experience|adventure/i.test(gameText);
    if (label.includes('恐怖')) return /horror|survival/i.test(gameText);
    return false;
  });
  if (matchedLabels.length > 0) reasons.push(`符合「${matchedLabels.slice(0, 2).join('、')}」`);

  if (stock > 0) reasons.push(`目前還有 ${stock} 件可選版本`);

  const personalReason = getPersonalizedReasons(game, profile)[0];
  if (personalReason) reasons.push(personalReason);

  return reasons.slice(0, 3).join('，') || '和你的搜尋條件最接近';
}

function buildProductSearch(
  state: RouteDeps['state'],
  message: string,
  user: JwtUser | null,
  clientProfile?: ClientPreferenceProfile
): RecommendationResult {
  const intent = extractProductSearchIntent(message);
  const profile = buildPersonalizationProfile(state, user?.id ?? null, clientProfile);
  const activeGames = state.games.filter((game) => game.isActive !== false);
  const ranked = activeGames
    .map((game) => ({
      game,
      score: scoreGameForSearch(game, intent, profile),
    }))
    .sort((a, b) => b.score - a.score || getGameLowestPrice(a.game) - getGameLowestPrice(b.game));

  const picks = ranked.slice(0, 3).map((item) => item.game);
  const sources = picks
    .slice(0, 2)
    .map((game, index) => createCatalogSource(game, index, buildSearchReason(game, intent, profile)));

  if (picks.length === 0) {
    return {
      reply: '目前沒有找到很接近的商品。你可以換成類型、預算或遊玩風格來問，例如「想找 30 美金以下的 RPG」。',
      sources: [],
      contextText: '沒有符合搜尋條件的商品。',
      personalized: Boolean(profile?.hasSignals),
    };
  }

  const conditionText = [
    intent.budgetLabel ? `預算條件：${intent.budgetLabel}` : '',
    intent.labels.length > 0 ? `偏好：${intent.labels.join('、')}` : '',
    intent.avoidTerms.length > 0 ? '已避開不想要的類型' : '',
    profile?.hasSignals ? '也參考你的願望清單、購物車或訂單紀錄' : '',
  ]
    .filter(Boolean)
    .join('；');

  const lines = picks.map((game, index) => {
    const reason = buildSearchReason(game, intent, profile);
    return `${index + 1}. ${game.name} - ${money(getGameLowestPrice(game))}，${reason}`;
  });

  const reply = [
    conditionText ? `我依照「${conditionText}」幫你篩出這幾款：` : '我先依照你的描述幫你篩出這幾款：',
    ...lines,
    '可以點商品卡片看詳情；如果你想再縮小範圍，可以補上預算、遊玩時長或想避開的類型。',
  ].join('\n');

  return {
    reply,
    sources,
    contextText: reply,
    personalized: Boolean(profile?.hasSignals),
  };
}

function buildDecisionReasons({
  game,
  budget,
  decisionTerms,
  profile,
}: {
  game: Game;
  budget: number | null;
  decisionTerms: string[];
  profile: PersonalizationProfile | null;
}) {
  const price = getGameLowestPrice(game);
  const stock = getAvailableStock(game);
  const gameText = `${game.name} ${game.description || ''}`.toLowerCase();
  const reasons: string[] = [];

  if (budget !== null) {
    if (price <= budget) {
      reasons.push(`符合 $${budget.toFixed(2)} 內的預算`);
    } else {
      reasons.push(`超出預算，但可當作加價選項`);
    }
  }

  const matchedTerms = decisionTerms.filter((term) => gameText.includes(term));
  if (matchedTerms.length > 0) {
    reasons.push(`符合你提到的 ${matchedTerms.slice(0, 2).join('、')} 偏好`);
  }

  if (stock > 0) {
    reasons.push(`目前還有 ${stock} 件可選版本`);
  } else {
    reasons.push('目前沒有可購買庫存');
  }

  const personalReasons = getPersonalizedReasons(game, profile);
  if (personalReasons.length > 0) reasons.push(personalReasons[0]);

  return reasons;
}

function scoreGameForDecision({
  game,
  budget,
  decisionTerms,
  profile,
}: {
  game: Game;
  budget: number | null;
  decisionTerms: string[];
  profile: PersonalizationProfile | null;
}) {
  const price = getGameLowestPrice(game);
  const stock = getAvailableStock(game);
  const gameText = `${game.name} ${game.description || ''}`.toLowerCase();
  let score = getPersonalizedScore(game, profile);

  if (stock > 0) score += Math.min(stock / 4, 10);
  if (budget !== null) {
    if (price <= budget) {
      score += 35;
      score += Math.max(0, budget - price) / 3;
    } else {
      score -= Math.min((price - budget) * 1.5, 45);
    }
  }

  for (const term of decisionTerms) {
    if (gameText.includes(term)) score += 12;
  }

  if (/rpg|fantasy|adventure/i.test(gameText)) score += 4;
  return score;
}

function buildProductDecision(
  state: RouteDeps['state'],
  message: string,
  user: JwtUser | null,
  clientProfile?: ClientPreferenceProfile
): ProductDecisionResult {
  const activeGames = state.games.filter((game) => game.isActive !== false);
  const budget = extractBudget(message);
  const { labels, terms } = extractDecisionTerms(message);
  const profile = buildPersonalizationProfile(state, user?.id ?? null, clientProfile);

  const ranked = activeGames
    .map((game) => ({
      game,
      score: scoreGameForDecision({ game, budget, decisionTerms: terms, profile }),
    }))
    .sort((a, b) => b.score - a.score || getGameLowestPrice(a.game) - getGameLowestPrice(b.game));

  const picks = ranked.slice(0, 3).map((item) => item.game);
  const sources: ChatSource[] = picks
    .slice(0, 2)
    .map((game, index) =>
      createCatalogSource(game, index, index === 0 ? '最符合這次的預算與偏好' : '可當作替代選項比較')
    );

  if (picks.length === 0) {
    return {
      reply: '目前沒有可比較的商品。你可以先回到商店看看是否有上架中的遊戲，或告訴我想玩的類型，我再幫你縮小選擇。',
      sources,
      contextText: '目前沒有可比較的商品。',
      personalized: Boolean(profile?.hasSignals),
    };
  }

  const topPick = picks[0];
  const preferenceText = [
    budget !== null ? `預算 $${budget.toFixed(2)}` : '',
    labels.length > 0 ? `偏好 ${labels.join('、')}` : '',
    profile?.hasSignals ? '參考你的願望清單、購物車或購買紀錄' : '',
  ]
    .filter(Boolean)
    .join('，');

  const lines = picks.map((game, index) => {
    const reasons = buildDecisionReasons({ game, budget, decisionTerms: terms, profile });
    return `${index + 1}. ${game.name} - 最低 ${money(getGameLowestPrice(game))}。${reasons.slice(0, 3).join('、')}。`;
  });

  const reply = [
    preferenceText
      ? `我會用「${preferenceText}」來幫你比較。`
      : '我先用價格、庫存和商品內容幫你做比較。',
    `首選是 ${topPick.name}，因為它在你的條件下整體最穩。`,
    ...lines,
    `如果你現在要直接買，我會先選 ${topPick.name}；如果你想要更精準，可以再告訴我你偏好劇情、戰鬥、開放世界或恐怖生存。`,
  ].join('\n');

  return {
    reply,
    sources,
    contextText: reply,
    personalized: Boolean(profile?.hasSignals),
    topPick,
  };
}

function describeFit(game: Game, message: string, profile: PersonalizationProfile | null) {
  const gameText = `${game.name} ${game.description || ''}`.toLowerCase();
  const hints: string[] = [];

  if (/rpg|fantasy|角色|奇幻|魔幻/i.test(message) && /rpg|fantasy/i.test(gameText)) {
    hints.push('符合 RPG / 奇幻偏好');
  }
  if (/開放世界|探索|open[-\s]?world/i.test(message) && /open|world|adventure/i.test(gameText)) {
    hints.push('適合想探索大地圖');
  }
  if (/劇情|故事|story/i.test(message) && /legendary|experience|survival/i.test(gameText)) {
    hints.push('比較偏沉浸與劇情體驗');
  }
  if (/恐怖|生存|horror|survival/i.test(message) && /horror|survival/i.test(gameText)) {
    hints.push('符合恐怖或生存取向');
  }

  const personalReasons = getPersonalizedReasons(game, profile);
  hints.push(...personalReasons.slice(0, 1));

  if (hints.length > 0) return hints.slice(0, 2).join('，');
  if (/rpg|fantasy|adventure/i.test(gameText)) return '適合想玩角色扮演或冒險的人';
  return '適合想先從價格與庫存穩定的商品開始';
}

function describeTradeoff(game: Game, message: string) {
  const price = getGameLowestPrice(game);
  const stock = getAvailableStock(game);
  const budget = extractBudget(message);

  if (budget !== null && price > budget) return `最低價格超出 $${budget.toFixed(2)} 預算`;
  if (stock <= 0) return '目前沒有可購買庫存';
  if (stock < 10) return '庫存較少，想買要盡快決定';
  if (price >= 50) return '價格較高，適合確定喜歡再入手';
  return '整體風險低，但特色可能沒有那麼明確';
}

function buildProductComparison(
  state: RouteDeps['state'],
  message: string,
  user: JwtUser | null,
  clientProfile?: ClientPreferenceProfile
): ProductComparisonResult {
  const mentionedGames = findMentionedGames(state.games, message).slice(0, 3);
  const { terms } = extractDecisionTerms(message);
  const budget = extractBudget(message);
  const profile = buildPersonalizationProfile(state, user?.id ?? null, clientProfile);
  const ranked = [...mentionedGames].sort(
    (a, b) =>
      scoreGameForDecision({ game: b, budget, decisionTerms: terms, profile }) -
        scoreGameForDecision({ game: a, budget, decisionTerms: terms, profile }) ||
      getGameLowestPrice(a) - getGameLowestPrice(b)
  );
  const topPick = ranked[0];
  const comparison: ProductComparisonRow[] = ranked.map((game) => ({
    gameId: game.id,
    name: game.name,
    price: money(getGameLowestPrice(game)),
    stock: getAvailableStock(game),
    fit: describeFit(game, message, profile),
    tradeoff: describeTradeoff(game, message),
    href: `/game/${game.id}`,
  }));
  const sources = ranked
    .slice(0, 2)
    .map((game, index) => createCatalogSource(game, index, index === 0 ? '比較後的優先選擇' : '比較用候選商品'));

  if (!topPick) {
    return {
      reply: '我目前沒有找到足夠的商品可以比較。你可以直接輸入兩款商品名稱，例如「Elden Ring 跟 The Witcher 3 比較」。',
      sources: [],
      contextText: '沒有找到足夠商品可以比較。',
      personalized: Boolean(profile?.hasSignals),
      comparison: [],
    };
  }

  const lines = comparison.map(
    (row) => `${row.name}：${row.price}，庫存 ${row.stock}，適合點：${row.fit}，取捨：${row.tradeoff}`
  );
  const reply = [
    `我會先選 ${topPick.name}。`,
    '比較下來它在你這次提到的條件裡比較平衡；下面是重點差異：',
    ...lines,
    `如果你想快速下決定，先看 ${topPick.name}；如果你更在意價格、劇情或挑戰性，可以再告訴我，我會重新排序。`,
  ].join('\n');

  return {
    reply,
    sources,
    contextText: reply,
    personalized: Boolean(profile?.hasSignals),
    comparison,
  };
}

function buildShoppingAgentPlan(
  state: RouteDeps['state'],
  message: string,
  user: JwtUser | null,
  clientProfile?: ClientPreferenceProfile
): ShoppingAgentResult {
  const decision = buildProductDecision(state, message, user, clientProfile);
  const pickedIds = decision.sources
    .map((source) => source.gameId)
    .filter((id): id is number => Number.isInteger(id))
    .slice(0, 3);
  const pickedGames = pickedIds
    .map((id) => state.games.find((game) => game.id === id))
    .filter((game): game is Game => Boolean(game));
  const topPick = decision.topPick || pickedGames[0];
  const compareIds = pickedGames.length >= 2 ? pickedGames.map((game) => game.id) : topPick ? [topPick.id] : [];
  const compareHref = compareIds.length >= 2 ? `/compare?ids=${compareIds.join(',')}` : undefined;
  const steps: ShoppingAgentStep[] = [
    {
      id: 'understand-goal',
      title: '理解需求',
      status: 'done',
      detail: '已把你的訊息拆成預算、類型偏好、是否要比較或收藏等條件。',
    },
    {
      id: 'rank-products',
      title: '篩選商品',
      status: decision.sources.length > 0 ? 'done' : 'blocked',
      detail:
        decision.sources.length > 0
          ? `已根據商品資料與你的偏好挑出 ${decision.sources.length} 個候選。`
          : '目前找不到足夠商品可以完成這個任務。',
    },
  ];

  if (topPick) {
    steps.push({
      id: 'top-pick',
      title: '選出主推薦',
      status: 'done',
      detail: `主推薦是 ${topPick.name}，最低價格 ${money(getGameLowestPrice(topPick))}，目前庫存 ${getAvailableStock(topPick)}。`,
      href: `/game/${topPick.id}`,
      gameId: topPick.id,
    });
  }

  if (wantsCompareAction(message)) {
    steps.push({
      id: 'open-compare',
      title: '建立比較清單',
      status: compareHref ? 'suggested' : 'blocked',
      detail: compareHref
        ? `已準備 ${compareIds.length} 款商品的比較頁，點擊後可看價格、庫存與 AI 比較摘要。`
        : '至少需要 2 款候選商品才能建立比較清單。',
      href: compareHref,
    });
  }

  if (wantsWishlistAction(message)) {
    if (!user) {
      steps.push({
        id: 'save-wishlist',
        title: '加入願望清單',
        status: 'blocked',
        detail: '需要登入後才能替你寫入願望清單。',
        href: '/login',
      });
    } else if (topPick) {
      if (!state.wishlists[user.id]) state.wishlists[user.id] = [];
      const alreadySaved = state.wishlists[user.id].includes(topPick.id);
      if (!alreadySaved) {
        state.wishlists[user.id].push(topPick.id);
        persistState(state);
      }
      steps.push({
        id: 'save-wishlist',
        title: '加入願望清單',
        status: 'done',
        detail: alreadySaved ? `${topPick.name} 已經在你的願望清單。` : `已把 ${topPick.name} 加入你的願望清單。`,
        href: '/wishlist',
        gameId: topPick.id,
      });
    }
  }

  const nextHref = compareHref || (topPick ? `/game/${topPick.id}` : undefined);
  const nextAction = compareHref
    ? '下一步建議打開比較頁確認差異。'
    : topPick
      ? `下一步建議查看 ${topPick.name} 的版本與庫存。`
      : '下一步建議換一組更明確的預算或遊戲類型。';
  const summary = topPick
    ? `我已用 Agent 流程幫你完成篩選，主推薦是 ${topPick.name}。`
    : '我已嘗試執行購物助理流程，但目前沒有足夠商品可推薦。';

  return {
    reply: [summary, decision.reply, nextAction].join('\n\n'),
    sources: decision.sources,
    contextText: decision.contextText,
    personalized: decision.personalized,
    agentPlan: {
      goal: message,
      summary,
      nextHref,
      steps,
    },
  };
}

function buildRecommendation(
  state: RouteDeps['state'],
  message: string,
  user: JwtUser | null,
  clientProfile?: ClientPreferenceProfile
): RecommendationResult {
  const activeGames = state.games.filter((game) => game.isActive !== false);
  const cheapIntent = /(便宜|低價|預算|cheap|price)/i.test(message);
  const stockIntent = /(庫存|現貨|stock)/i.test(message);
  const personalIntent = /(我的|我喜歡|適合我|個人|personal|for me)/i.test(message);
  const profile = buildPersonalizationProfile(state, user?.id ?? null, clientProfile);

  const ranked = [...activeGames].sort((a, b) => {
    const personalDelta = getPersonalizedScore(b, profile) - getPersonalizedScore(a, profile);
    if ((personalIntent || profile?.hasSignals) && personalDelta !== 0) return personalDelta;
    if (stockIntent) return getAvailableStock(b) - getAvailableStock(a);
    if (cheapIntent) return getGameLowestPrice(a) - getGameLowestPrice(b);
    return getAvailableStock(b) - getAvailableStock(a) || getGameLowestPrice(a) - getGameLowestPrice(b);
  });

  const picks = ranked.slice(0, 3);
  const sources: ChatSource[] = picks
    .slice(0, 2)
    .map((game, index) => createCatalogSource(game, index, index === 0 ? '優先推薦' : '也值得看看'));

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

function getCartItemAdvice(item: CartItem, lineTotal: number, total: number) {
  const gameText = `${item.name} ${item.description || ''}`.toLowerCase();
  if (total > 80 && lineTotal >= total * 0.45) {
    return '這款佔總金額比較高，結帳前可以先確認是不是最想玩的。';
  }
  if (/rpg|fantasy|adventure/i.test(gameText)) {
    return '適合保留，這類型通常遊玩時間較長。';
  }
  if (/horror|survival/i.test(gameText)) {
    return '比較吃個人口味，如果還不確定可以先放願望清單。';
  }
  return '可以保留作為候選，結帳前再和其他商品比較一次。';
}

function buildCartReview(cart: CartItem[]): CartReviewResult {
  if (cart.length === 0) {
    return {
      reply: '你的購物車目前是空的。可以先挑 1 到 2 款想玩的遊戲加入購物車，我再幫你看總價和取捨。',
      grounded: true,
      sources: [],
      cartReview: {
        total: '$0.00',
        itemCount: 0,
        verdict: '購物車目前沒有商品',
        nextStep: '先回到商店挑選商品',
        items: [],
      },
    };
  }

  const itemRows = cart.map((item) => {
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const lineTotal = getCartItemUnitPrice(item) * quantity;
    return { item, quantity, lineTotal };
  });
  const total = itemRows.reduce((sum, row) => sum + row.lineTotal, 0);
  const itemCount = itemRows.reduce((sum, row) => sum + row.quantity, 0);
  const sortedRows = [...itemRows].sort((a, b) => b.lineTotal - a.lineTotal);
  const largest = sortedRows[0];
  const verdict =
    total >= 90
      ? '總價偏高，建議先保留最想玩的 1 到 2 款。'
      : total >= 50
        ? '內容夠完整，結帳前可以再確認是否都會近期玩。'
        : '總價輕量，適合直接完成這次 demo 結帳流程。';
  const nextStep =
    total >= 90 && largest
      ? `如果想壓低預算，可以先確認 ${largest.item.name} 是否現在就要買。`
      : '如果內容都確認了，可以前往結帳建立訂單。';
  const items: CartReviewItem[] = sortedRows.slice(0, 3).map(({ item, quantity, lineTotal }) => ({
    gameId: item.id,
    name: item.name,
    quantity,
    variantName: item.variantName,
    lineTotal: money(lineTotal),
    advice: getCartItemAdvice(item, lineTotal, total),
    href: `/game/${item.id}`,
  }));
  const sources = sortedRows
    .slice(0, 2)
    .map(({ item }, index) => createCatalogSource(item, index, index === 0 ? '購物車中金額最高的商品' : '購物車中的候選商品'));
  const itemLines = items.map(
    (item) => `${item.name}${item.variantName ? `（${item.variantName}）` : ''} x${item.quantity}：${item.lineTotal}，${item.advice}`
  );

  return {
    reply: [`我幫你看了一下購物車，目前共 ${itemCount} 件，總計 ${money(total)}。`, verdict, ...itemLines, nextStep].join(
      '\n'
    ),
    grounded: true,
    sources,
    cartReview: {
      total: money(total),
      itemCount,
      verdict,
      nextStep,
      items,
    },
  };
}

function getLatestOrder(orders: Order[]) {
  return [...orders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
}

function getOrderCareAction(order: Order) {
  if (order.status === 'pending') {
    return {
      primaryAction: '前往付款',
      nextStep: '這筆訂單還沒付款完成，可以回到訂單詳情繼續付款。',
      canRequestRefund: false,
    };
  }
  if (order.status === 'payment_failed') {
    return {
      primaryAction: '重新付款',
      nextStep: '付款上次沒有成功，建議回到訂單詳情重新付款，或改用快速付款完成流程。',
      canRequestRefund: false,
    };
  }
  if (order.status === 'paid') {
    if (order.fulfillmentStatus === 'delivered') {
      return {
        primaryAction: '查看訂單',
        nextStep: '這筆訂單已送達。如果商品不符合預期，可以在訂單詳情查看是否需要申請退款。',
        canRequestRefund: true,
      };
    }
    if (order.fulfillmentStatus === 'shipped') {
      return {
        primaryAction: '查看出貨',
        nextStep: '這筆訂單已出貨，可以到訂單詳情查看配送資訊。',
        canRequestRefund: true,
      };
    }
    return {
      primaryAction: '等待出貨',
      nextStep: '付款已完成，接下來等候商店出貨即可。',
      canRequestRefund: true,
    };
  }
  if (order.status === 'refunded') {
    return {
      primaryAction: '查看退款',
      nextStep: '這筆訂單已完成退款，商品庫存在 demo 流程中也會補回。',
      canRequestRefund: false,
    };
  }
  if (order.status === 'cancelled') {
    return {
      primaryAction: '查看訂單',
      nextStep: '這筆訂單已取消。如果還想購買，可以回商店重新加入購物車。',
      canRequestRefund: false,
    };
  }
  return {
    primaryAction: '查看訂單',
    nextStep: '可以到訂單詳情查看目前狀態。',
    canRequestRefund: false,
  };
}

function buildOrderCare(orders: Order[]): OrderCareResult | null {
  const latest = getLatestOrder(orders);
  if (!latest) return null;

  const action = getOrderCareAction(latest);
  const shortId = latest.id.slice(-6);
  const items = summarizeItems(latest.items) || `${latest.items.length} 件商品`;
  const href = `/orders/${latest.id}`;

  return {
    reply: [
      `我先看最近一筆訂單 ${shortId}。`,
      `目前是「${statusLabel(latest.status)}」，出貨狀態是「${fulfillmentLabel(latest.fulfillmentStatus)}」，金額 ${money(latest.total)}。`,
      action.nextStep,
      action.canRequestRefund ? '如果你想退款，可以從訂單詳情進去申請；我不會直接替你操作退款。' : '目前這個狀態不需要走退款流程。',
    ].join('\n'),
    sources: [
      {
        id: latest.id,
        title: `訂單 ${shortId}`,
        type: 'order' as const,
        score: 10,
      },
    ],
    orderCare: {
      orderId: latest.id,
      shortId,
      status: statusLabel(latest.status),
      fulfillmentStatus: fulfillmentLabel(latest.fulfillmentStatus),
      total: money(latest.total),
      items,
      primaryAction: action.primaryAction,
      nextStep: action.nextStep,
      canRequestRefund: action.canRequestRefund,
      href,
    },
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
      return '先把商品加入購物車並完成結帳，訂單建立後可以使用信用卡付款；如果信用卡付款暫時無法載入，也可以用快速付款完成流程。';
    }
    if (/(配送|出貨|shipping|delivery)/i.test(message)) {
      return '付款完成後訂單會進入待出貨。你可以在訂單中心查看目前出貨狀態。';
    }
    if (/(帳號|登入|密碼|account|login|password)/i.test(message)) {
      return '你可以註冊帳號或使用試用帳號快速登入。登入後可以管理購物車、願望清單和訂單中心。';
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

export function registerChatRoutes({ app, io, state, openaiClient, secretKey, authenticate, isAdmin }: RouteDeps) {
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

  app.get('/admin/ai-usage', authenticate, isAdmin, (req: Request, res: Response) => {
    const limit = Number(req.query?.limit || 30);
    return res.json({
      summary: getAiUsageSummary(),
      events: getAiUsageEvents(limit),
    });
  });

  app.post('/chat/rag', async (req: TypedRequest<GptReplyBody>, res: Response) => {
    const message = req.body?.message?.trim();
    if (!message) {
      return res.status(400).json({ error: '請輸入想詢問的內容。' });
    }

    const user = getOptionalUser(req, secretKey);
    const startedAt = Date.now();
    const originalJson = res.json.bind(res);
    res.json = ((payload: unknown) => {
      if (res.statusCode < 400 && payload && typeof payload === 'object') {
        const body = payload as {
          mode?: string;
          grounded?: boolean;
          provider?: string | null;
          sources?: unknown[];
        };
        recordAiUsage({
          requestId: ((req as any).requestId as string) || 'unknown',
          userId: user?.id ?? null,
          mode: body.mode,
          grounded: body.grounded,
          provider: body.provider || null,
          sourceCount: Array.isArray(body.sources) ? body.sources.length : 0,
          statusCode: res.statusCode,
          durationMs: Date.now() - startedAt,
          message,
        });
      }
      return originalJson(payload);
    }) as typeof res.json;
    const clientProfile = req.body?.clientProfile;
    const hasClientSignals = hasClientPreferenceSignals(clientProfile);
    const debugEnabled = shouldIncludeRagDebug(req);

    if (isOrderCareQuestion(message)) {
      if (!user) {
        return res.json({
          reply: '登入後我才能幫你查看自己的訂單售後狀態。你可以使用試用帳號快速登入，再到訂單中心建立或查看訂單。',
          grounded: false,
          mode: 'order-auth-required',
          sources: [],
          ...(debugEnabled ? { debug: buildRagDebug(message) } : {}),
        });
      }

      const care = buildOrderCare(state.orders[user.id] || []);
      if (!care) {
        return res.json({
          reply: '目前還沒有看到你的訂單。你可以先到商店選商品加入購物車，結帳後我就能幫你整理付款、出貨和退款下一步。',
          grounded: true,
          mode: 'order-care-empty',
          sources: [],
          ...(debugEnabled ? { debug: buildRagDebug(message) } : {}),
        });
      }

      return res.json({
        reply: care.reply,
        grounded: true,
        mode: 'order-care',
        sources: care.sources,
        orderCare: care.orderCare,
        ...(debugEnabled ? { debug: buildRagDebug(message) } : {}),
      });
    }

    if (isOrderLookupQuestion(message)) {
      if (!user) {
        return res.json({
          reply: '登入後我才能幫你查看自己的訂單狀態。你也可以先到訂單中心查看，或使用試用帳號快速登入體驗完整流程。',
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

    if (isCartReviewQuestion(message)) {
      if (!user) {
        return res.json({
          reply: '登入後我才能幫你查看自己的購物車。你可以使用試用帳號快速登入，再把商品加入購物車，我就能幫你做結帳前建議。',
          grounded: false,
          mode: 'cart-auth-required',
          sources: [],
          ...(debugEnabled ? { debug: buildRagDebug(message) } : {}),
        });
      }

      const review = buildCartReview(state.carts[user.id] || []);
      return res.json({
        reply: review.reply,
        grounded: review.grounded,
        mode: 'cart-review',
        sources: review.sources,
        cartReview: review.cartReview,
        ...(debugEnabled ? { debug: buildRagDebug(message) } : {}),
      });
    }

    if (isShoppingAgentQuestion(message)) {
      const agent = buildShoppingAgentPlan(state, message, user, clientProfile);
      const debugMatches = debugEnabled ? retrieveRagContext(state, message, 4) : [];
      return res.json({
        reply: agent.reply,
        grounded: agent.sources.length > 0,
        mode: user || hasClientSignals ? 'personalized-shopping-agent' : 'shopping-agent',
        sources: agent.sources,
        agentPlan: agent.agentPlan,
        ...(debugEnabled ? { debug: buildRagDebug(message, debugMatches) } : {}),
      });
    }

    if (isProductComparisonQuestion(message, state)) {
      const comparison = buildProductComparison(state, message, user, clientProfile);
      const debugMatches = debugEnabled ? retrieveRagContext(state, message, 4) : [];
      return res.json({
        reply: comparison.reply,
        grounded: comparison.sources.length > 0,
        mode: user || hasClientSignals ? 'personalized-product-comparison' : 'product-comparison',
        sources: comparison.sources,
        comparison: comparison.comparison,
        ...(debugEnabled ? { debug: buildRagDebug(message, debugMatches) } : {}),
      });
    }

    if (isProductSearchQuestion(message) && !/(哪一款|哪款|哪個|選|比較|choose|which|vs|versus|compare)/i.test(message)) {
      const search = buildProductSearch(state, message, user, clientProfile);
      const polished = await polishRecommendationReply({ openaiClient, message, recommendation: search });
      const debugMatches = debugEnabled ? retrieveRagContext(state, message, 4) : [];
      return res.json({
        reply: polished?.reply || search.reply,
        grounded: search.sources.length > 0,
        mode: user || hasClientSignals ? 'personalized-product-search' : 'product-search',
        provider: polished?.provider,
        sources: search.sources,
        ...(debugEnabled ? { debug: buildRagDebug(message, debugMatches) } : {}),
      });
    }

    if (isProductDecisionQuestion(message)) {
      const decision = buildProductDecision(state, message, user, clientProfile);
      const polished = await polishRecommendationReply({ openaiClient, message, recommendation: decision });
      const debugMatches = debugEnabled ? retrieveRagContext(state, message, 4) : [];
      return res.json({
        reply: polished?.reply || decision.reply,
        grounded: decision.sources.length > 0,
        mode: user || hasClientSignals ? 'personalized-product-decision' : 'product-decision',
        provider: polished?.provider,
        sources: decision.sources,
        ...(debugEnabled ? { debug: buildRagDebug(message, debugMatches) } : {}),
      });
    }

    if (isProductRecommendationQuestion(message)) {
      const recommendation = buildRecommendation(state, message, user, clientProfile);
      const polished = await polishRecommendationReply({ openaiClient, message, recommendation });
      const debugMatches = debugEnabled ? retrieveRagContext(state, message, 4) : [];
      return res.json({
        reply: polished?.reply || recommendation.reply,
        grounded: recommendation.sources.length > 0,
        mode: user || hasClientSignals ? 'personalized-recommendation' : 'product-recommendation',
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
