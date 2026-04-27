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
  const keywords = new Set(preference.topKeywords);
  const baselinePrice = preference.averagePrice || 0;

  const scored = games
    .filter((game) => !viewedSet.has(game.id))
    .map((game) => {
      const reasons: string[] = [];
      const contentText = `${game.name || ''} ${game.description || ''}`;
      const tokens = tokenize(contentText);
      const price = parsePrice(game.price);

      let score = 30;

      if (keywords.size > 0) {
        const overlap = tokens.filter((token) => keywords.has(token)).length;
        if (overlap > 0) {
          score += Math.min(40, overlap * 12);
          reasons.push(`符合你近期關鍵字偏好（命中 ${overlap} 項）`);
        }
      }

      if (baselinePrice > 0) {
        const distance = Math.abs(price - baselinePrice);
        const closeness = Math.max(0, 1 - distance / Math.max(1, baselinePrice));
        score += Math.round(closeness * 25);
        if (closeness > 0.6) {
          reasons.push(`價格接近你常看的區間（約 $${baselinePrice.toFixed(2)}）`);
        }
      }

      const hasStock =
        !Array.isArray(game.variants) || game.variants.some((variant) => Number(variant.stock) > 0);
      if (hasStock) {
        score += 10;
      } else {
        score -= 12;
        reasons.push('目前庫存偏少，建議先加入願望清單');
      }

      if (reasons.length === 0) {
        reasons.push('綜合熱門度與你的瀏覽行為推薦');
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
    reasons: ['目前以熱門商品作為預設推薦'],
  }));
}
