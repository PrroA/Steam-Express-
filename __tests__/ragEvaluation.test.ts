import type { AppState } from '../types/backend';
import { defaultRagEvaluationCases, evaluateRagRetrieval } from '../backend/ragEvaluation';

const mockState: AppState = {
  users: [],
  messages: [],
  reviews: {},
  carts: {},
  orders: {},
  wishlists: {},
  resetTokens: {},
  games: [
    {
      id: 1,
      name: 'Cyberpunk 2077',
      price: '$59.99',
      description: 'A futuristic RPG.',
      image: '/cp2077_game-thumbnail.webp',
      isActive: true,
      variants: [
        { id: 'standard', name: 'Standard', price: '$59.99', stock: 25 },
        { id: 'ultimate', name: 'Ultimate', price: '$79.99', stock: 10 },
      ],
    },
    {
      id: 6,
      name: 'Dark Souls III',
      price: '$14.99',
      description: 'A dark fantasy RPG.',
      image: '/DarkSouls3.jpeg',
      isActive: true,
      variants: [{ id: 'standard', name: 'Standard', price: '$14.99', stock: 22 }],
    },
  ],
};

describe('RAG retrieval evaluation', () => {
  test('default evaluation cases cover service and catalog retrieval', () => {
    expect(defaultRagEvaluationCases.map((item) => item.id)).toEqual([
      'payment-help',
      'refund-policy',
      'shipping-status',
      'account-login',
      'wishlist-alert',
      'cheap-game',
      'named-game',
    ]);
  });

  test('passes the baseline evaluation set', () => {
    const summary = evaluateRagRetrieval(mockState);

    expect(summary.total).toBe(defaultRagEvaluationCases.length);
    expect(summary.passed).toBe(summary.total);
    expect(summary.hitRate).toBe(1);
    expect(summary.results.every((result) => result.passed)).toBe(true);
  });

  test('reports failed cases with expected label and top match', () => {
    const summary = evaluateRagRetrieval(mockState, [
      {
        id: 'missing-document',
        query: '怎麼付款？',
        expectedDocId: 'not-real',
      },
    ]);

    expect(summary.passed).toBe(0);
    expect(summary.hitRate).toBe(0);
    expect(summary.results[0]).toMatchObject({
      id: 'missing-document',
      passed: false,
      expected: 'not-real',
    });
    expect(summary.results[0].topMatch?.id).toBeTruthy();
  });
});
