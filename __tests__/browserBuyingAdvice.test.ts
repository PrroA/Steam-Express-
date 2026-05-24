import {
  buildFallbackBuyingAdvice,
  buildFallbackComparisonAdvice,
  getBrowserAiCapability,
} from '../utils/browserBuyingAdvice';

describe('buildFallbackBuyingAdvice', () => {
  test('builds stable advice without an external AI provider', () => {
    const advice = buildFallbackBuyingAdvice(
      {
        id: 4,
        name: 'The Witcher 3',
        price: '$29.99',
        description: 'A legendary RPG fantasy adventure.',
        image: '/witcher.jpg',
        variants: [
          { id: 'standard', name: 'Standard', price: '$29.99', stock: 5 },
          { id: 'complete', name: 'Complete Edition', price: '$39.99', stock: 3 },
        ],
      },
      {
        recentlyViewedIds: [1, 2],
        recentlyViewedNames: ['Elden Ring'],
        topKeywords: ['rpg', 'fantasy'],
        averagePrice: 30,
      }
    );

    expect(advice.source).toBe('fallback');
    expect(advice.verdict).toBe('recommended');
    expect(advice.reasons.join(' ')).toContain('rpg');
    expect(advice.bestEdition).toBe('Standard');
    expect(advice.nextAction).toContain('購物車');
  });

  test('reports a friendly fallback status when browser AI is unavailable', async () => {
    const previousLanguageModel = window.LanguageModel;
    const previousAi = window.ai;
    delete window.LanguageModel;
    delete window.ai;

    const capability = await getBrowserAiCapability();

    expect(capability.canUseModel).toBe(false);
    expect(capability.label).toBe('目前使用商品資料分析');

    window.LanguageModel = previousLanguageModel;
    window.ai = previousAi;
  });

  test('builds comparison advice from products and client preference', () => {
    const advice = buildFallbackComparisonAdvice(
      [
        {
          id: 4,
          name: 'The Witcher 3',
          price: '$29.99',
          description: 'A legendary RPG fantasy adventure.',
          image: '/witcher.jpg',
          variants: [{ id: 'standard', name: 'Standard', price: '$29.99', stock: 5 }],
        },
        {
          id: 5,
          name: 'Racing Pack',
          price: '$19.99',
          description: 'Fast arcade racing.',
          image: '/racing.jpg',
          variants: [{ id: 'standard', name: 'Standard', price: '$19.99', stock: 8 }],
        },
      ],
      {
        recentlyViewedIds: [],
        recentlyViewedNames: ['Elden Ring'],
        topKeywords: ['rpg', 'fantasy'],
        averagePrice: 30,
      }
    );

    expect(advice.source).toBe('fallback');
    expect(advice.winnerName).toBe('The Witcher 3');
    expect(advice.reasons.join(' ')).toContain('偏好線索');
    expect(advice.nextAction).toContain('The Witcher 3');
  });
});
