import type { AppState } from '../types/backend';

export type RagDocumentType = 'faq' | 'policy' | 'catalog' | 'order';

export interface RagDocumentMetadata {
  gameId?: number;
  userId?: number;
  tags?: string[];
  updatedAt?: string;
  price?: string;
  stock?: number;
}

export interface RagDocument {
  id: string;
  title: string;
  type: RagDocumentType;
  content: string;
  metadata?: RagDocumentMetadata;
}

export interface RagSearchOptions {
  topK?: number;
  types?: RagDocumentType[];
  userId?: number;
}

export interface RagScoreBreakdown {
  exact: number;
  title: number;
  content: number;
  tags: number;
  intent: number;
}

export interface RagSearchResult {
  doc: RagDocument;
  score: number;
  scoreBreakdown: RagScoreBreakdown;
}

export interface Retriever {
  search(state: AppState, query: string, options?: RagSearchOptions): RagSearchResult[];
}

const staticKnowledge: RagDocument[] = [
  {
    id: 'faq-payment-001',
    title: '付款方式與付款失敗',
    type: 'faq',
    content:
      '結帳後會建立訂單。信用卡付款會在訂單中心完成；若信用卡付款暫時無法載入，也可以使用快速付款完成流程。付款未成功時，訂單會保留在訂單中心，可以重新付款。',
    metadata: {
      tags: ['付款', '信用卡', '結帳', '付款失敗', '快速付款'],
      updatedAt: '2026-05-24',
    },
  },
  {
    id: 'faq-order-002',
    title: '訂單查詢',
    type: 'faq',
    content:
      '登入後可以到訂單中心查看自己的訂單、付款狀態、出貨狀態與訂單明細。AI 客服也可以在登入後摘要最近訂單狀態，但不會替使用者付款、取消或退款。',
    metadata: {
      tags: ['訂單', '訂單中心', '付款狀態', '出貨狀態', '登入'],
      updatedAt: '2026-05-24',
    },
  },
  {
    id: 'policy-refund-003',
    title: '退款規則',
    type: 'policy',
    content:
      'demo 商城支援在訂單詳情申請退款。退款完成後訂單會顯示已退款，並把庫存補回。正式環境通常需要串接金流 webhook 與客服審核流程。',
    metadata: {
      tags: ['退款', '已退款', '訂單詳情', '庫存', '客服審核'],
      updatedAt: '2026-05-24',
    },
  },
  {
    id: 'policy-account-004',
    title: '帳號與試用登入',
    type: 'policy',
    content:
      '使用者可以註冊帳號或使用試用帳號快速登入。登入後才能管理購物車、願望清單、訂單中心與個人資料。',
    metadata: {
      tags: ['帳號', '登入', '註冊', '試用帳號', '個人資料'],
      updatedAt: '2026-05-24',
    },
  },
  {
    id: 'policy-shipping-005',
    title: '配送與出貨',
    type: 'policy',
    content:
      '訂單付款完成後會進入待出貨狀態。管理員可以在後台查看訂單並更新出貨資訊。demo 版本不會真的寄送商品。',
    metadata: {
      tags: ['配送', '出貨', '待出貨', '物流', '管理後台'],
      updatedAt: '2026-05-24',
    },
  },
  {
    id: 'faq-wishlist-006',
    title: '願望清單',
    type: 'faq',
    content:
      '願望清單可以收藏感興趣的商品，之後回來快速查看價格與商品狀態。demo 版本的降價通知會在畫面上以自然提示呈現。',
    metadata: {
      tags: ['願望清單', '收藏', '降價通知', '價格'],
      updatedAt: '2026-05-24',
    },
  },
];

function normalizeText(text: string) {
  return String(text || '').toLowerCase();
}

function parsePrice(value: string | undefined) {
  const parsed = Number(String(value || '').replace('$', ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function getGameStock(game: AppState['games'][number]) {
  return (game.variants || []).reduce((sum, variant) => sum + Math.max(0, Number(variant.stock) || 0), 0);
}

export function buildCatalogDocuments(state: AppState): RagDocument[] {
  return state.games
    .filter((game) => game.isActive !== false)
    .map((game) => {
      const variantText =
        game.variants && game.variants.length > 0
          ? game.variants
              .map((variant) => `${variant.name}，價格 ${variant.price}，庫存 ${variant.stock}`)
              .join('；')
          : '目前沒有版本或庫存資料';

      const stock = getGameStock(game);
      return {
        id: `catalog-game-${game.id}`,
        title: game.name,
        type: 'catalog' as const,
        content: `${game.name}。商品描述：${game.description || '暫無描述'}。基本價格：${game.price}。版本與庫存：${variantText}`,
        metadata: {
          gameId: game.id,
          tags: ['商品', '遊戲', '價格', '庫存', game.name, ...(game.variants || []).map((variant) => variant.name)],
          updatedAt: new Date().toISOString(),
          price: game.price,
          stock,
        },
      };
    });
}

function extractTerms(text: string) {
  const baseTerms = normalizeText(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((term) => term.length >= 2);

  const cjkChars = (text.match(/[\u4e00-\u9fff]/g) || []).join('');
  const cjkBigrams: string[] = [];
  for (let i = 0; i < cjkChars.length - 1; i += 1) {
    const gram = cjkChars.slice(i, i + 2);
    if (gram.length === 2) cjkBigrams.push(gram);
  }

  return Array.from(new Set([...baseTerms, ...cjkBigrams]));
}

function getIntentBoost(query: string, doc: RagDocument) {
  if (doc.type === 'catalog' && /(推薦|便宜|低價|預算|遊戲|商品|庫存|版本|價格|recommend|cheap|price|stock|game)/i.test(query)) {
    return 6;
  }

  if ((doc.type === 'faq' || doc.type === 'policy') && /(付款|訂單|退款|配送|出貨|帳號|登入|願望清單|payment|order|refund|shipping|account|login|wishlist)/i.test(query)) {
    return 6;
  }

  return 0;
}

function scoreDocument(query: string, doc: RagDocument): RagSearchResult {
  const q = normalizeText(query.trim());
  const title = normalizeText(doc.title);
  const content = normalizeText(doc.content);
  const tags = (doc.metadata?.tags || []).map(normalizeText);
  const terms = extractTerms(query);

  const scoreBreakdown: RagScoreBreakdown = {
    exact: q && `${title} ${content}`.includes(q) ? 10 : 0,
    title: 0,
    content: 0,
    tags: 0,
    intent: getIntentBoost(query, doc),
  };

  for (const term of terms) {
    if (title.includes(term)) scoreBreakdown.title += 5;
    if (content.includes(term)) scoreBreakdown.content += 2;
    if (tags.some((tag) => tag.includes(term) || term.includes(tag))) scoreBreakdown.tags += 4;
  }

  if (doc.type === 'catalog' && /(便宜|低價|預算|cheap)/i.test(query)) {
    const price = parsePrice(doc.metadata?.price);
    if (price > 0 && price <= 20) scoreBreakdown.intent += 3;
  }

  const score =
    scoreBreakdown.exact +
    scoreBreakdown.title +
    scoreBreakdown.content +
    scoreBreakdown.tags +
    scoreBreakdown.intent;

  return { doc, score, scoreBreakdown };
}

export class LocalHybridRetriever implements Retriever {
  search(state: AppState, query: string, options: RagSearchOptions = {}) {
    const topK = options.topK || 4;
    const docs = [...staticKnowledge, ...buildCatalogDocuments(state)].filter((doc) => {
      if (options.types && !options.types.includes(doc.type)) return false;
      if (doc.metadata?.userId && options.userId && doc.metadata.userId !== options.userId) return false;
      return true;
    });

    return docs
      .map((doc) => scoreDocument(query, doc))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}

export const localHybridRetriever = new LocalHybridRetriever();

export function retrieveRagContext(state: AppState, message: string, topK = 4) {
  return localHybridRetriever.search(state, message, { topK });
}
