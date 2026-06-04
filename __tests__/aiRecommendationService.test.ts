import { buildAiRecommendations, buildRecommendationReasons } from '../services/aiRecommendationService';
import type { Game } from '../types/domain';

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

  test('explains wishlist and cart behavior', () => {
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
        wishlistIds: [7],
        cartIds: [7],
      },
    });

    expect(reasons.join(' ')).toContain('願望清單');
    expect(reasons.join(' ')).toContain('購物車');
  });
});

describe('buildAiRecommendations', () => {
  const games: Game[] = [
    {
      id: 1,
      name: 'Elden Ring',
      price: '$59.99',
      description: 'Open world fantasy RPG adventure.',
      image: '/elden.jpg',
      variants: [{ id: 'standard', name: 'Standard', price: '$59.99', stock: 10 }],
    },
    {
      id: 2,
      name: 'Puzzle City',
      price: '$9.99',
      description: 'Small casual puzzle game.',
      image: '/puzzle.jpg',
      variants: [{ id: 'standard', name: 'Standard', price: '$9.99', stock: 10 }],
    },
  ];

  test('prioritizes products with explicit user behavior signals', () => {
    const recommendations = buildAiRecommendations({
      games,
      recentlyViewedGames: [],
      preference: {
        averagePrice: 60,
        topKeywords: ['fantasy', 'rpg'],
        wishlistIds: [1],
      },
    });

    expect(recommendations[0].game.id).toBe(1);
    expect(recommendations[0].reasons.join(' ')).toContain('願望清單');
  });
});
