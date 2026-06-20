import type { AppState } from '../types/backend';
import { defaultRagEvaluationCases, evaluateRagRetrieval } from '../backend/ragEvaluation';
import type { RagDocument, Retriever } from '../backend/rag';

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
      description: 'A futuristic open-world RPG.',
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
      description: 'A dark fantasy action RPG.',
      image: '/DarkSouls3.jpeg',
      isActive: true,
      variants: [{ id: 'standard', name: 'Standard', price: '$14.99', stock: 22 }],
    },
    {
      id: 7,
      name: 'Cyber Runner 2078',
      price: '$29.99',
      description: 'A futuristic runner game.',
      image: '/placeholder.jpg',
      isActive: true,
      variants: [{ id: 'standard', name: 'Standard', price: '$29.99', stock: 8 }],
    },
  ],
};

function buildSearchResult(doc: RagDocument, score: number) {
  return {
    doc,
    score,
    scoreBreakdown: { exact: 0, title: score, content: 0, tags: 0, intent: 0 },
  };
}

describe('RAG retrieval evaluation', () => {
  test('covers service, catalog, ambiguous, and out-of-scope retrieval', () => {
    expect(defaultRagEvaluationCases.map((item) => item.id)).toEqual([
      'payment-help',
      'refund-policy',
      'shipping-status',
      'account-login',
      'wishlist-alert',
      'order-lookup',
      'cheap-game',
      'named-game',
      'out-of-scope',
    ]);
  });

  test('passes the baseline with every expected document ranked first', () => {
    const summary = evaluateRagRetrieval(mockState);

    expect(summary.total).toBe(defaultRagEvaluationCases.length);
    expect(summary.top1Passed).toBe(summary.total);
    expect(summary.hitAtKPassed).toBe(summary.total);
    expect(summary.top1Accuracy).toBe(1);
    expect(summary.hitRateAtK).toBe(1);
    expect(summary.failures).toEqual([]);
  });

  test('distinguishes a top-3 hit from a correct top-1 result', () => {
    const wrongDoc: RagDocument = { id: 'wrong', title: '其他文件', type: 'faq', content: '其他內容' };
    const expectedDoc: RagDocument = { id: 'expected', title: '正確文件', type: 'policy', content: '正確內容' };
    const retriever: Retriever = {
      search: () => [buildSearchResult(wrongDoc, 10), buildSearchResult(expectedDoc, 8)],
    };

    const summary = evaluateRagRetrieval(
      mockState,
      [{ id: 'ranking-check', query: '模糊問題', expectedDocId: 'expected' }],
      retriever
    );

    expect(summary.hitRateAtK).toBe(1);
    expect(summary.top1Accuracy).toBe(0);
    expect(summary.results[0]).toMatchObject({ rank: 2, passed: true, top1Passed: false });
    expect(summary.failures).toHaveLength(1);
  });

  test('reports a missing expected document with the actual top match', () => {
    const summary = evaluateRagRetrieval(mockState, [
      {
        id: 'missing-document',
        query: '如何使用信用卡付款？',
        expectedDocId: 'not-real',
      },
    ]);

    expect(summary.passed).toBe(0);
    expect(summary.top1Accuracy).toBe(0);
    expect(summary.results[0]).toMatchObject({
      id: 'missing-document',
      passed: false,
      rank: null,
      expected: 'not-real',
    });
    expect(summary.results[0].topMatch?.id).toBe('faq-payment-001');
  });

  test('does not retrieve storefront documents for an unrelated question', () => {
    const summary = evaluateRagRetrieval(mockState, [
      {
        id: 'unrelated-question',
        query: '請幫我寫一首關於春天的詩',
        expectedNoMatch: true,
      },
    ]);

    expect(summary.top1Accuracy).toBe(1);
    expect(summary.results[0]).toMatchObject({
      expected: 'no-match',
      rank: 1,
      topMatch: null,
      matchedIds: [],
    });
  });

  test('ranks the exact product above a similarly named product', () => {
    const summary = evaluateRagRetrieval(mockState, [
      {
        id: 'similar-product-name',
        query: 'Cyberpunk 2077 Ultimate 還有庫存嗎？',
        expectedDocId: 'catalog-game-1',
      },
    ]);

    expect(summary.top1Accuracy).toBe(1);
    expect(summary.results[0].topMatch?.id).toBe('catalog-game-1');
  });
});
