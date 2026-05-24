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
});
