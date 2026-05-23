import type { AppState } from '../types/backend';
import { buildCatalogDocuments, LocalHybridRetriever, retrieveRagContext } from '../backend/rag';

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
      id: 101,
      name: 'Budget Quest',
      price: '$9.99',
      description: 'A short RPG for new players.',
      image: '/budget.jpg',
      isActive: true,
      variants: [
        { id: 'standard', name: 'Standard', price: '$9.99', stock: 8 },
        { id: 'deluxe', name: 'Deluxe', price: '$14.99', stock: 2 },
      ],
    },
    {
      id: 102,
      name: 'Hidden Admin Game',
      price: '$99.99',
      description: 'Inactive game.',
      image: '/hidden.jpg',
      isActive: false,
    },
  ],
};

describe('RAG retrieval', () => {
  test('builds catalog documents with metadata for future vector indexing', () => {
    const docs = buildCatalogDocuments(mockState);

    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({
      id: 'catalog-game-101',
      title: 'Budget Quest',
      type: 'catalog',
      metadata: {
        gameId: 101,
        price: '$9.99',
        stock: 10,
      },
    });
    expect(docs[0].metadata?.tags).toEqual(expect.arrayContaining(['商品', '遊戲', 'Budget Quest']));
  });

  test('hybrid retriever scores tags and intent without changing result shape', () => {
    const results = retrieveRagContext(mockState, '推薦便宜的遊戲', 3);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].doc.type).toBe('catalog');
    expect(results[0].score).toBeGreaterThan(0);
    expect(results[0].scoreBreakdown.intent).toBeGreaterThan(0);
    expect(results[0].doc.metadata?.gameId).toBe(101);
  });

  test('retriever can be filtered by document type', () => {
    const retriever = new LocalHybridRetriever();
    const results = retriever.search(mockState, '退款怎麼處理', { types: ['policy'], topK: 2 });

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((item) => item.doc.type === 'policy')).toBe(true);
    expect(results[0].scoreBreakdown.tags + results[0].scoreBreakdown.intent).toBeGreaterThan(0);
  });
});
