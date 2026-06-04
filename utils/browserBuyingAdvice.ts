import type { CartItem, Game } from '../types/domain';
import type { ClientPreferenceProfile } from './aiPreferenceProfile';

export type BuyingAdviceVerdict = 'recommended' | 'consider' | 'skip';

export type BuyingAdvice = {
  verdict: BuyingAdviceVerdict;
  summary: string;
  reasons: string[];
  concerns: string[];
  evidence: string[];
  bestEdition: string;
  nextAction: string;
  source: 'browser-ai' | 'fallback';
};

export type ComparisonAdvice = {
  winnerId: number;
  winnerName: string;
  summary: string;
  reasons: string[];
  tradeoffs: string[];
  nextAction: string;
  source: 'browser-ai' | 'fallback';
};

export type CartReviewAdvice = {
  verdict: 'ready' | 'check' | 'adjust';
  summary: string;
  highlights: string[];
  concerns: string[];
  nextAction: string;
  source: 'browser-ai' | 'fallback';
};

export type BrowserAiCapability = {
  status: 'available' | 'downloadable' | 'downloading' | 'unavailable';
  label: string;
  description: string;
  canUseModel: boolean;
};

type BrowserLanguageModelSession = {
  prompt(input: string): Promise<string>;
  destroy?: () => void;
};

type BrowserLanguageModelFactory = {
  availability?: () => Promise<'unavailable' | 'downloadable' | 'downloading' | 'available'>;
  create: (options?: { systemPrompt?: string }) => Promise<BrowserLanguageModelSession>;
};

declare global {
  interface Window {
    LanguageModel?: BrowserLanguageModelFactory;
    ai?: {
      languageModel?: BrowserLanguageModelFactory;
    };
  }
}

function parsePrice(priceText?: string) {
  return parseFloat((priceText || '$0').replace('$', '')) || 0;
}

function getLowestVariant(game: Game) {
  const variants = game.variants || [];
  if (variants.length === 0) return null;
  return variants.reduce((best, variant) => (parsePrice(variant.price) < parsePrice(best.price) ? variant : best));
}

function getTotalStock(game: Game) {
  return (game.variants || []).reduce((sum, variant) => sum + Math.max(0, Number(variant.stock) || 0), 0);
}

function getGamePrice(game: Game) {
  return parsePrice(getLowestVariant(game)?.price || game.price);
}

function getCartItemPrice(item: CartItem) {
  return parsePrice(item.price);
}

function getCartTotal(cart: CartItem[]) {
  return cart.reduce((sum, item) => sum + getCartItemPrice(item) * Math.max(1, item.quantity || 1), 0);
}

function normalizeList(value: unknown, fallback: string[], maxLength: number) {
  if (!Array.isArray(value)) return fallback;
  const list = value.map((item) => String(item || '').trim()).filter(Boolean).slice(0, maxLength);
  return list.length > 0 ? list : fallback;
}

function normalizeVerdict(value: unknown): BuyingAdviceVerdict {
  if (value === 'recommended' || value === 'consider' || value === 'skip') return value;
  return 'consider';
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const matched = text.match(/\{[\s\S]*\}/);
    if (!matched) return null;
    try {
      return JSON.parse(matched[0]);
    } catch {
      return null;
    }
  }
}

function getBrowserLanguageModelFactory() {
  if (typeof window === 'undefined') return null;
  return window.LanguageModel || window.ai?.languageModel || null;
}

export async function getBrowserAiCapability(): Promise<BrowserAiCapability> {
  const languageModel = getBrowserLanguageModelFactory();
  if (!languageModel) {
    return {
      status: 'unavailable',
      label: '目前使用商品資料分析',
      description: '你的瀏覽器目前沒有可用的本機 AI，仍會根據商品、版本與近期偏好提供建議。',
      canUseModel: false,
    };
  }

  try {
    const availability = languageModel.availability ? await languageModel.availability() : 'available';
    if (availability === 'available') {
      return {
        status: 'available',
        label: '本機 AI 可用',
        description: '可在你的瀏覽器中整理購買建議，不需要額外的付費金鑰。',
        canUseModel: true,
      };
    }

    if (availability === 'downloadable') {
      return {
        status: 'downloadable',
        label: '可啟用本機 AI',
        description: '瀏覽器可以準備本機 AI。若準備時間較久，會先用商品資料提供建議。',
        canUseModel: true,
      };
    }

    if (availability === 'downloading') {
      return {
        status: 'downloading',
        label: '本機 AI 準備中',
        description: '瀏覽器正在準備本機 AI，目前先用商品資料提供建議。',
        canUseModel: false,
      };
    }
  } catch {
    return {
      status: 'unavailable',
      label: '目前使用商品資料分析',
      description: '暫時無法確認本機 AI 狀態，仍會根據商品、版本與近期偏好提供建議。',
      canUseModel: false,
    };
  }

  return {
    status: 'unavailable',
    label: '目前使用商品資料分析',
    description: '你的瀏覽器目前沒有可用的本機 AI，仍會根據商品、版本與近期偏好提供建議。',
    canUseModel: false,
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('timeout')), timeoutMs);
    promise
      .then(resolve)
      .catch(reject)
      .finally(() => window.clearTimeout(timer));
  });
}

export function buildFallbackBuyingAdvice(game: Game, profile: ClientPreferenceProfile): BuyingAdvice {
  const lowestVariant = getLowestVariant(game);
  const stock = getTotalStock(game);
  const price = parsePrice(lowestVariant?.price || game.price);
  const averagePrice = Number(profile.averagePrice || 0);
  const keywordText = profile.topKeywords.slice(0, 2).join('、');
  const preferenceText = profile.topKeywords.slice(0, 2).join('、') || profile.recentlyViewedNames.slice(0, 2).join('、');

  const reasons = [
    keywordText ? `這款和你近期關注的 ${keywordText} 類型有關` : '商品資訊完整，適合先從玩法與版本判斷',
    averagePrice > 0 && Math.abs(price - averagePrice) / Math.max(1, averagePrice) < 0.45
      ? `價格接近你常看的區間，入手壓力不會太高`
      : `目前最低版本約 $${price.toFixed(2)}，可以先評估預算`,
  ];

  const concerns =
    stock <= 0
      ? ['目前可選版本庫存不足，建議先加入願望清單']
      : ['如果你還不確定這個類型，可以先比較標準版和高階版本的差異'];

  return {
    verdict: stock <= 0 ? 'consider' : 'recommended',
    summary: stock <= 0 ? '這款可以先追蹤，等有庫存再決定。' : '這款適合列入優先考慮，可以先從版本差異開始看。',
    reasons,
    concerns,
    evidence: [
      `目前最低版本約 $${price.toFixed(2)}`,
      `版本總庫存 ${stock} 件`,
      preferenceText ? `參考近期偏好：${preferenceText}` : '目前沒有明顯近期偏好，主要依商品資料判斷',
    ],
    bestEdition: lowestVariant ? lowestVariant.name : '標準版',
    nextAction: stock <= 0 ? '加入願望清單，之後再回來確認。' : '先選標準版加入購物車，再到購物車確認總價。',
    source: 'fallback',
  };
}

export function buildFallbackComparisonAdvice(games: Game[], profile: ClientPreferenceProfile): ComparisonAdvice {
  const candidates = games.slice(0, 3);
  const keywordSet = new Set(profile.topKeywords.map((keyword) => keyword.toLowerCase()));
  const averagePrice = Number(profile.averagePrice || 0);

  const scored = candidates
    .map((game) => {
      const text = `${game.name} ${game.description || ''}`.toLowerCase();
      const keywordHits = Array.from(keywordSet).filter((keyword) => text.includes(keyword)).length;
      const price = getGamePrice(game);
      const stock = getTotalStock(game);
      const priceScore =
        averagePrice > 0 ? Math.max(0, 25 - Math.abs(price - averagePrice) / Math.max(1, averagePrice) * 25) : 12;
      const stockScore = stock > 0 ? 18 : -20;
      const keywordScore = keywordHits * 18;

      return {
        game,
        price,
        stock,
        keywordHits,
        score: 40 + keywordScore + priceScore + stockScore,
      };
    })
    .sort((a, b) => b.score - a.score);

  const winner = scored[0];
  if (!winner) {
    return {
      winnerId: 0,
      winnerName: '尚未選出',
      summary: '目前比較資料不足，可以先回商品頁加入 2 到 3 款商品。',
      reasons: ['需要至少兩款商品才能做出有意義的比較'],
      tradeoffs: ['先挑選你最有興趣的商品，再回來比較'],
      nextAction: '回商店繼續選商品。',
      source: 'fallback',
    };
  }

  const reasons = [
    winner.keywordHits > 0
      ? `最符合你近期關注的類型，命中 ${winner.keywordHits} 個偏好線索`
      : '綜合價格、庫存與商品內容後最適合優先考慮',
    winner.stock > 0 ? `目前仍有 ${winner.stock} 件可選版本` : '雖然目前庫存偏少，但整體條件仍值得追蹤',
  ];

  const tradeoffs = scored
    .slice(1)
    .map((item) => `${item.game.name} 可以當備選，價格約 $${item.price.toFixed(2)}，庫存 ${item.stock} 件`)
    .slice(0, 2);

  return {
    winnerId: winner.game.id,
    winnerName: winner.game.name,
    summary: `如果只能先選一款，我會先看 ${winner.game.name}。`,
    reasons,
    tradeoffs: tradeoffs.length > 0 ? tradeoffs : ['其他商品仍可加入願望清單，之後再回來比較價格與庫存'],
    nextAction: `先查看 ${winner.game.name} 的版本與庫存，再決定是否加入購物車。`,
    source: 'fallback',
  };
}

export function buildFallbackCartReviewAdvice(cart: CartItem[], profile: ClientPreferenceProfile): CartReviewAdvice {
  if (cart.length === 0) {
    return {
      verdict: 'adjust',
      summary: '購物車目前是空的，先挑一款想玩的遊戲再結帳。',
      highlights: ['可以從最近看過或願望清單中的遊戲開始挑選'],
      concerns: ['目前沒有商品可以建立訂單'],
      nextAction: '回到商店選一款遊戲加入購物車。',
      source: 'fallback',
    };
  }

  const total = getCartTotal(cart);
  const averagePrice = Number(profile.averagePrice || 0);
  const duplicateNames = Array.from(
    new Set(
      cart
        .filter((item, index) => cart.findIndex((candidate) => candidate.id === item.id) !== index)
        .map((item) => item.name)
    )
  );
  const highQuantityItems = cart.filter((item) => item.quantity > 1);
  const hasKnownPreference = profile.topKeywords.length > 0 || profile.recentlyViewedNames.length > 0;
  const isAboveUsualSpend = averagePrice > 0 && total > averagePrice * Math.max(2, cart.length);

  const highlights = [
    `目前共 ${cart.length} 款商品，預估小計 $${total.toFixed(2)}`,
    hasKnownPreference
      ? `會參考你近期看過的 ${profile.topKeywords.slice(0, 2).join('、') || profile.recentlyViewedNames[0]} 類型`
      : '商品數量不多，適合先確認版本與價格後再送出',
  ];

  const concerns: string[] = [];
  if (duplicateNames.length > 0) {
    concerns.push(`${duplicateNames.slice(0, 2).join('、')} 有多個版本在購物車，送出前建議確認是不是都需要。`);
  }
  if (highQuantityItems.length > 0) {
    concerns.push(`${highQuantityItems[0].name} 數量大於 1，請確認不是誤點。`);
  }
  if (isAboveUsualSpend) {
    concerns.push('這次總金額比你近期常看的價格高，建議再確認預算。');
  }
  if (concerns.length === 0) {
    concerns.push('目前沒有明顯需要調整的地方。');
  }

  const verdict: CartReviewAdvice['verdict'] =
    duplicateNames.length > 0 || highQuantityItems.length > 0 ? 'adjust' : isAboveUsualSpend ? 'check' : 'ready';

  return {
    verdict,
    summary:
      verdict === 'ready'
        ? '這份購物車看起來可以繼續結帳。'
        : verdict === 'check'
          ? '購物車可以送出，但建議先確認預算。'
          : '送出前建議先檢查版本或數量。',
    highlights: highlights.slice(0, 3),
    concerns: concerns.slice(0, 3),
    nextAction:
      verdict === 'ready'
        ? '下一步可以填寫聯絡資料並建立訂單。'
        : '先調整購物車內容，確認後再前往填寫資料。',
    source: 'fallback',
  };
}

export async function generateBrowserBuyingAdvice(game: Game, profile: ClientPreferenceProfile): Promise<BuyingAdvice> {
  const fallback = buildFallbackBuyingAdvice(game, profile);
  const languageModel = getBrowserLanguageModelFactory();
  if (!languageModel) return fallback;

  try {
    const capability = await getBrowserAiCapability();
    if (!capability.canUseModel) return fallback;

    const session = await withTimeout(
      languageModel.create({
        systemPrompt:
          '你是遊戲商城的購買決策助理。請根據商品、版本、庫存與使用者偏好，用繁體中文給一般玩家看的建議。只輸出 JSON，不要提到模型、API、server、token 或技術細節。',
      }),
      20000
    );

    const raw = await withTimeout(
      session.prompt(
        JSON.stringify({
          product: {
            name: game.name,
            price: game.price,
            description: game.description,
            variants: game.variants || [],
          },
          preference: profile,
          outputShape: {
            verdict: 'recommended | consider | skip',
            summary: 'string',
            reasons: ['string'],
            concerns: ['string'],
            evidence: ['string'],
            bestEdition: 'string',
            nextAction: 'string',
          },
        })
      ),
      30000
    );
    session.destroy?.();

    const parsed = safeJsonParse(raw);
    if (!parsed || typeof parsed !== 'object') return fallback;

    return {
      verdict: normalizeVerdict((parsed as BuyingAdvice).verdict),
      summary: String((parsed as BuyingAdvice).summary || fallback.summary).trim(),
      reasons: normalizeList((parsed as BuyingAdvice).reasons, fallback.reasons, 3),
      concerns: normalizeList((parsed as BuyingAdvice).concerns, fallback.concerns, 2),
      evidence: normalizeList((parsed as BuyingAdvice).evidence, fallback.evidence, 3),
      bestEdition: String((parsed as BuyingAdvice).bestEdition || fallback.bestEdition).trim(),
      nextAction: String((parsed as BuyingAdvice).nextAction || fallback.nextAction).trim(),
      source: 'browser-ai',
    };
  } catch {
    return fallback;
  }
}

export async function generateBrowserCartReviewAdvice(
  cart: CartItem[],
  profile: ClientPreferenceProfile
): Promise<CartReviewAdvice> {
  const fallback = buildFallbackCartReviewAdvice(cart, profile);
  const languageModel = getBrowserLanguageModelFactory();
  if (!languageModel || cart.length === 0) return fallback;

  try {
    const capability = await getBrowserAiCapability();
    if (!capability.canUseModel) return fallback;

    const session = await withTimeout(
      languageModel.create({
        systemPrompt:
          '你是遊戲商城的結帳前購物車檢查助理。請用自然繁體中文幫一般玩家確認購物車是否適合送出，重點看總價、版本、數量與偏好。只輸出 JSON，不要提到模型、API、server、token 或技術細節。',
      }),
      20000
    );

    const raw = await withTimeout(
      session.prompt(
        JSON.stringify({
          cart: cart.map((item) => ({
            id: item.id,
            name: item.name,
            variantName: item.variantName,
            price: item.price,
            quantity: item.quantity,
            description: item.description,
          })),
          total: getCartTotal(cart),
          preference: profile,
          outputShape: {
            verdict: 'ready | check | adjust',
            summary: 'string',
            highlights: ['string'],
            concerns: ['string'],
            nextAction: 'string',
          },
        })
      ),
      30000
    );
    session.destroy?.();

    const parsed = safeJsonParse(raw);
    if (!parsed || typeof parsed !== 'object') return fallback;
    const verdict = (parsed as CartReviewAdvice).verdict;

    return {
      verdict: verdict === 'ready' || verdict === 'check' || verdict === 'adjust' ? verdict : fallback.verdict,
      summary: String((parsed as CartReviewAdvice).summary || fallback.summary).trim(),
      highlights: normalizeList((parsed as CartReviewAdvice).highlights, fallback.highlights, 3),
      concerns: normalizeList((parsed as CartReviewAdvice).concerns, fallback.concerns, 3),
      nextAction: String((parsed as CartReviewAdvice).nextAction || fallback.nextAction).trim(),
      source: 'browser-ai',
    };
  } catch {
    return fallback;
  }
}

export async function generateBrowserComparisonAdvice(
  games: Game[],
  profile: ClientPreferenceProfile
): Promise<ComparisonAdvice> {
  const fallback = buildFallbackComparisonAdvice(games, profile);
  const languageModel = getBrowserLanguageModelFactory();
  if (!languageModel || games.length < 2) return fallback;

  try {
    const capability = await getBrowserAiCapability();
    if (!capability.canUseModel) return fallback;

    const session = await withTimeout(
      languageModel.create({
        systemPrompt:
          '你是遊戲商城的比較決策助理。請根據商品、價格、庫存與使用者偏好，選出最適合先看的商品。只輸出 JSON，不要提到模型、API、server、token 或技術細節。',
      }),
      20000
    );

    const raw = await withTimeout(
      session.prompt(
        JSON.stringify({
          products: games.slice(0, 3).map((game) => ({
            id: game.id,
            name: game.name,
            price: game.price,
            description: game.description,
            stock: getTotalStock(game),
            variants: game.variants || [],
          })),
          preference: profile,
          outputShape: {
            winnerId: 'number',
            winnerName: 'string',
            summary: 'string',
            reasons: ['string'],
            tradeoffs: ['string'],
            nextAction: 'string',
          },
        })
      ),
      30000
    );
    session.destroy?.();

    const parsed = safeJsonParse(raw);
    if (!parsed || typeof parsed !== 'object') return fallback;

    const winnerId = Number((parsed as ComparisonAdvice).winnerId);
    const matchedWinner = games.find((game) => game.id === winnerId);

    return {
      winnerId: matchedWinner?.id || fallback.winnerId,
      winnerName: matchedWinner?.name || String((parsed as ComparisonAdvice).winnerName || fallback.winnerName),
      summary: String((parsed as ComparisonAdvice).summary || fallback.summary).trim(),
      reasons: normalizeList((parsed as ComparisonAdvice).reasons, fallback.reasons, 3),
      tradeoffs: normalizeList((parsed as ComparisonAdvice).tradeoffs, fallback.tradeoffs, 2),
      nextAction: String((parsed as ComparisonAdvice).nextAction || fallback.nextAction).trim(),
      source: 'browser-ai',
    };
  } catch {
    return fallback;
  }
}
