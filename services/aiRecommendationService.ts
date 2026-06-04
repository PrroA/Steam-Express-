import type { Game } from '../types/domain';

export interface UserPreferenceProfile {
  averagePrice: number;
  topKeywords: string[];
  recentlyViewedIds?: number[];
  wishlistIds?: number[];
  cartIds?: number[];
  checkoutCreatedCount?: number;
}

export interface AiRecommendationItem {
  game: Game;
  score: number;
  reasons: string[];
}

export type ReasonProduct = {
  id: number;
  name: string;
  price: string;
  description?: string;
  variants?: Array<{ price: string; stock: number }>;
};

function parsePrice(priceText: string) {
  return parseFloat((priceText || '$0').replace('$', '')) || 0;
}

function tokenize(text = '') {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff\s]/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 2);
}

function hasStock(product: ReasonProduct) {
  return !Array.isArray(product.variants) || product.variants.some((variant) => Number(variant.stock) > 0);
}

export function buildRecommendationReasons({
  product,
  preference,
  recentlyViewedIds = [],
}: {
  product: ReasonProduct;
  preference: UserPreferenceProfile;
  recentlyViewedIds?: number[];
}) {
  const reasons: string[] = [];
  const keywords = new Set((preference.topKeywords || []).map((keyword) => keyword.toLowerCase()));
  const wishlistIds = new Set((preference.wishlistIds || []).map(Number));
  const cartIds = new Set((preference.cartIds || []).map(Number));
  const viewedIds = new Set([...(preference.recentlyViewedIds || []), ...recentlyViewedIds].map(Number));
  const tokens = tokenize(`${product.name || ''} ${product.description || ''}`);
  const price = parsePrice(product.price);
  const baselinePrice = preference.averagePrice || 0;

  if (wishlistIds.has(product.id)) {
    reasons.push('你曾把這款商品加入願望清單，適合優先回來確認。');
  }

  if (cartIds.has(product.id)) {
    reasons.push('你曾把這款商品加入購物車，可以接著完成結帳判斷。');
  }

  if (viewedIds.has(product.id)) {
    reasons.push('你最近看過這款商品，代表它和目前購物方向有關。');
  }

  const keywordHits = tokens.filter((token) => keywords.has(token));
  if (keywordHits.length > 0) {
    reasons.push(`和你最近關注的 ${keywordHits.slice(0, 2).join('、')} 類型相近。`);
  }

  if (baselinePrice > 0) {
    const distance = Math.abs(price - baselinePrice);
    const closeness = Math.max(0, 1 - distance / Math.max(1, baselinePrice));
    if (closeness > 0.6) {
      reasons.push(`價格接近你最近關注的區間，約 $${baselinePrice.toFixed(2)}。`);
    }
  }

  if (!hasStock(product)) {
    reasons.push('目前庫存不多，建議先放入願望清單觀察。');
  } else if (reasons.length < 2) {
    reasons.push('目前仍有庫存，可以直接加入購物車比較。');
  }

  if (reasons.length === 0) {
    reasons.push('商品條件穩定，適合作為下一個瀏覽選項。');
  }

  return reasons.slice(0, 2);
}

export function buildAiRecommendations({
  games,
  recentlyViewedGames,
  preference,
  limit = 3,
}: {
  games: Game[];
  recentlyViewedGames: Game[];
  preference: UserPreferenceProfile;
  limit?: number;
}): AiRecommendationItem[] {
  if (!Array.isArray(games) || games.length === 0) return [];

  const recentlyViewedIds = recentlyViewedGames.map((game) => game.id);
  const keywords = new Set((preference.topKeywords || []).map((keyword) => keyword.toLowerCase()));
  const baselinePrice = preference.averagePrice || 0;
  const wishlistIds = new Set((preference.wishlistIds || []).map(Number));
  const cartIds = new Set((preference.cartIds || []).map(Number));
  const viewedIds = new Set([...(preference.recentlyViewedIds || []), ...recentlyViewedIds].map(Number));

  return games
    .map((game) => {
      const reasons = buildRecommendationReasons({ product: game, preference, recentlyViewedIds });
      const contentText = `${game.name || ''} ${game.description || ''}`;
      const tokens = tokenize(contentText);
      const price = parsePrice(game.price);

      let score = 30;
      if (wishlistIds.has(game.id)) score += 28;
      if (cartIds.has(game.id)) score += 22;
      if (viewedIds.has(game.id)) score += 14;
      if ((preference.checkoutCreatedCount || 0) > 0) score += 4;

      if (keywords.size > 0) {
        const overlap = tokens.filter((token) => keywords.has(token)).length;
        if (overlap > 0) {
          score += Math.min(40, overlap * 12);
        }
      }

      if (baselinePrice > 0) {
        const distance = Math.abs(price - baselinePrice);
        const closeness = Math.max(0, 1 - distance / Math.max(1, baselinePrice));
        score += Math.round(closeness * 25);
      }

      if (hasStock(game)) {
        score += 10;
      } else {
        score -= 12;
      }

      return {
        game,
        score: Math.max(0, Math.min(100, score)),
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score || parsePrice(a.game.price) - parsePrice(b.game.price))
    .slice(0, limit);
}
