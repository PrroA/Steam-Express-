import type { Game } from '../types/domain';

export interface UserPreferenceProfile {
  averagePrice: number;
  topKeywords: string[];
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
    .filter((word) => word.length >= 2);
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
  const tokens = tokenize(`${product.name || ''} ${product.description || ''}`);
  const price = parsePrice(product.price);
  const baselinePrice = preference.averagePrice || 0;

  const keywordHits = tokens.filter((token) => keywords.has(token));
  if (keywordHits.length > 0) {
    reasons.push(`符合你近期關注的 ${keywordHits.slice(0, 2).join('、')} 類型`);
  }

  if (baselinePrice > 0) {
    const distance = Math.abs(price - baselinePrice);
    const closeness = Math.max(0, 1 - distance / Math.max(1, baselinePrice));
    if (closeness > 0.6) {
      reasons.push(`價格接近你常看的區間（約 $${baselinePrice.toFixed(2)}）`);
    }
  }

  if (recentlyViewedIds.includes(product.id)) {
    reasons.push('你最近看過這款，可以接著比較版本與價格');
  }

  const hasStock =
    !Array.isArray(product.variants) || product.variants.some((variant) => Number(variant.stock) > 0);
  if (!hasStock) {
    reasons.push('目前庫存偏少，建議先加入願望清單');
  }

  if (reasons.length === 0) {
    reasons.push('綜合瀏覽偏好、價格帶與商品內容推薦');
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

  const viewedSet = new Set(recentlyViewedGames.map((game) => game.id));
  const recentlyViewedIds = recentlyViewedGames.map((game) => game.id);
  const keywords = new Set(preference.topKeywords);
  const baselinePrice = preference.averagePrice || 0;

  const scored = games
    .filter((game) => !viewedSet.has(game.id))
    .map((game) => {
      const reasons = buildRecommendationReasons({ product: game, preference, recentlyViewedIds });
      const contentText = `${game.name || ''} ${game.description || ''}`;
      const tokens = tokenize(contentText);
      const price = parsePrice(game.price);

      let score = 30;

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

      const hasStock =
        !Array.isArray(game.variants) || game.variants.some((variant) => Number(variant.stock) > 0);
      if (hasStock) {
        score += 10;
      } else {
        score -= 12;
      }

      return {
        game,
        score: Math.max(0, Math.min(100, score)),
        reasons: reasons.slice(0, 2),
      };
    })
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    return scored.slice(0, limit);
  }

  return games.slice(0, limit).map((game) => ({
    game,
    score: 50,
    reasons: buildRecommendationReasons({ product: game, preference, recentlyViewedIds: [] }),
  }));
}
