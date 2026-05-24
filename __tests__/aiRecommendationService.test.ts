import { buildRecommendationReasons } from '../services/aiRecommendationService';

describe('buildRecommendationReasons', () => {
  test('uses keywords and price range for recommendation reasons', () => {
    const reasons = buildRecommendationReasons({
      product: {
        id: 4,
        name: 'The Witcher 3',
        price: '$29.99',
        description: 'A legendary RPG fantasy adventure.',
        variants: [{ price: '$29.99', stock: 10 }],
      },
      preference: {
        averagePrice: 30,
        topKeywords: ['rpg', 'fantasy'],
      },
    });

    expect(reasons.join(' ')).toContain('rpg');
    expect(reasons.join(' ')).toContain('價格接近');
  });

  test('can explain recently viewed products', () => {
    const reasons = buildRecommendationReasons({
      product: {
        id: 7,
        name: 'Cyberpunk 2077',
        price: '$39.99',
        description: 'Futuristic city adventure.',
        variants: [{ price: '$39.99', stock: 4 }],
      },
      preference: {
        averagePrice: 0,
        topKeywords: [],
      },
      recentlyViewedIds: [7],
    });

    expect(reasons.join(' ')).toContain('最近看過');
  });
});
