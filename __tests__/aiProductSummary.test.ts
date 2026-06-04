jest.mock('openai', () => jest.fn());

import { buildFallbackProductSummary } from '../pages/api/ai-product-summary';

describe('buildFallbackProductSummary', () => {
  test('builds a user-facing summary from product data without an AI key', () => {
    const summary = buildFallbackProductSummary({
      id: 4,
      name: 'The Witcher 3',
      price: '$29.99',
      description: 'A legendary RPG.',
      variants: [
        { name: 'Standard', price: '$29.99', stock: 40 },
        { name: 'Complete Edition', price: '$39.99', stock: 15 },
      ],
    });

    expect(summary.source).toBe('fallback');
    expect(summary.fitFor.join(' ')).toContain('角色養成');
    expect(summary.highlights.join(' ')).toContain('$29.99');
    expect(summary.highlights.join(' ')).toContain('55');
    expect(summary.buyingTip).toContain('標準版');
  });

  test('api fallback can include client preference hints', async () => {
    const { default: handler } = await import('../pages/api/ai-product-summary');
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));

    await handler(
      {
        method: 'POST',
        body: {
          product: {
            id: 4,
            name: 'The Witcher 3',
            price: '$29.99',
            description: 'A legendary RPG.',
          },
          userProfile: {
            recentlyViewedNames: ['Elden Ring'],
            topKeywords: ['rpg', 'fantasy'],
          },
        },
      } as any,
      { status } as any
    );

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        highlights: expect.arrayContaining([expect.stringContaining('最近關注')]),
        buyingTip: expect.stringContaining('最近看的遊戲'),
      })
    );
  });
});
