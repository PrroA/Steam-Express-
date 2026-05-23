import type { AppState } from '../types/backend';

export interface RagDocument {
  id: string;
  title: string;
  type: 'faq' | 'policy' | 'catalog';
  content: string;
}

const staticKnowledge: RagDocument[] = [
  {
    id: 'faq-payment-001',
    title: '付款方式',
    type: 'faq',
    content:
      '結帳後會建立待付款訂單。使用者可以在訂單中心選擇信用卡測試付款，或在本機展示時使用 Demo 快速付款完成流程。付款完成後，訂單狀態會更新為付款完成。',
  },
  {
    id: 'faq-order-002',
    title: '訂單狀態',
    type: 'faq',
    content:
      '訂單狀態包含待付款、付款未成功、付款完成、已取消與已退款。使用者可以在訂單中心查看訂單狀態、重新付款、取消訂單、申請退款或再次購買。',
  },
  {
    id: 'policy-refund-003',
    title: '退款規則',
    type: 'policy',
    content:
      '付款完成的訂單可以在訂單中心申請退款。退款完成後，訂單狀態會更新為已退款，展示資料中的商品庫存也會回補。實際正式環境需要串接付款服務 webhook 與退款審核流程。',
  },
  {
    id: 'policy-account-004',
    title: '帳號與登入',
    type: 'policy',
    content:
      '使用者可以註冊帳號、登入、使用 Demo 帳號快速體驗，也可以在忘記密碼時使用重設密碼流程。管理後台只允許管理員帳號進入。',
  },
  {
    id: 'policy-shipping-005',
    title: '配送與出貨',
    type: 'policy',
    content:
      '訂單的出貨狀態包含準備出貨、已出貨與已送達。管理員可以在後台更新出貨狀態與物流資訊，使用者可以在訂單中心查看最新進度。',
  },
  {
    id: 'faq-wishlist-006',
    title: '願望清單',
    type: 'faq',
    content:
      '願望清單用來收藏想玩的遊戲。使用者可以從願望清單移除商品，或把商品加入購物車。本展示版本不提供自動降價通知。',
  },
];

function buildCatalogDocuments(state: AppState): RagDocument[] {
  return state.games
    .filter((game) => game.isActive !== false)
    .map((game) => {
      const variantText =
        game.variants && game.variants.length > 0
          ? game.variants
              .map((variant) => `${variant.name}，價格 ${variant.price}，庫存 ${variant.stock}`)
              .join('；')
          : '目前沒有額外版本資訊';

      return {
        id: `catalog-game-${game.id}`,
        title: game.name,
        type: 'catalog' as const,
        content: `${game.name}。介紹：${game.description || '暫無介紹'}。價格：${game.price}。版本：${variantText}`,
      };
    });
}

function extractTerms(text: string) {
  const baseTerms = text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((term) => term.length >= 2);

  const cjkChars = (text.match(/[\u4e00-\u9fff]/g) || []).join('');
  const cjkBigrams: string[] = [];
  for (let i = 0; i < cjkChars.length - 1; i += 1) {
    const gram = cjkChars.slice(i, i + 2);
    if (gram.length === 2) {
      cjkBigrams.push(gram);
    }
  }

  return Array.from(new Set([...baseTerms, ...cjkBigrams]));
}

function scoreDocument(query: string, doc: RagDocument) {
  const q = query.trim().toLowerCase();
  const body = `${doc.title} ${doc.content}`.toLowerCase();
  const terms = extractTerms(q);

  let score = 0;
  if (q && body.includes(q)) {
    score += 8;
  }
  for (const term of terms) {
    if (body.includes(term)) {
      score += 2;
    }
  }

  if (doc.type === 'catalog' && /(遊戲|商品|推薦|價格|庫存|版本|便宜|開放世界|game|price|stock)/i.test(query)) {
    score += 3;
  }
  if ((doc.type === 'faq' || doc.type === 'policy') && /(付款|訂單|退款|出貨|配送|帳號|登入|願望清單)/.test(query)) {
    score += 3;
  }

  return score;
}

export function retrieveRagContext(state: AppState, message: string, topK = 4) {
  const docs = [...staticKnowledge, ...buildCatalogDocuments(state)];
  return docs
    .map((doc) => ({ doc, score: scoreDocument(message, doc) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
