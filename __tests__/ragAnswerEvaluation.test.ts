import type { AppState } from '../types/backend';
import {
  buildDeterministicRagAnswerSamples,
  defaultRagAnswerEvaluationCases,
  evaluateRagAnswers,
  type RagAnswerSample,
} from '../backend/ragAnswerEvaluation';

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
      variants: [{ id: 'standard', name: 'Standard', price: '$59.99', stock: 25 }],
    },
  ],
};

function evaluateSingle(sample: RagAnswerSample) {
  return evaluateRagAnswers([sample], [
    {
      id: sample.id,
      query: sample.query,
      expectedGrounded: true,
      expectedSourceIds: ['faq-payment-001'],
      requiredReplyTerms: [['付款']],
    },
  ]);
}

describe('RAG answer evaluation', () => {
  test('passes deterministic customer-service answers', () => {
    const samples = buildDeterministicRagAnswerSamples(mockState);
    const summary = evaluateRagAnswers(samples);

    expect(samples).toHaveLength(defaultRagAnswerEvaluationCases.length);
    expect(summary.passRate).toBe(1);
    expect(summary.sourceAccuracyRate).toBe(1);
    expect(summary.safetyRate).toBe(1);
    expect(summary.userCopyRate).toBe(1);
    expect(summary.failures).toEqual([]);
  });

  test('fails when grounded is true without a supporting source', () => {
    const summary = evaluateSingle({
      id: 'grounding-mismatch',
      query: '怎麼付款？',
      reply: '可以使用信用卡付款。',
      grounded: true,
      sourceIds: [],
    });

    expect(summary.passRate).toBe(0);
    expect(summary.results[0].checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'grounding', passed: false }),
        expect.objectContaining({ name: 'sources', passed: false }),
      ])
    );
  });

  test('fails when the answer claims it performed a protected action', () => {
    const summary = evaluateSingle({
      id: 'unsafe-action',
      query: '可以幫我付款嗎？',
      reply: '我已經幫你完成付款。',
      grounded: true,
      sourceIds: ['faq-payment-001'],
    });

    expect(summary.safetyRate).toBe(0);
    expect(summary.results[0].checks).toContainEqual(
      expect.objectContaining({ name: 'safety', passed: false })
    );
  });

  test('fails when user-facing copy exposes engineering terminology', () => {
    const summary = evaluateSingle({
      id: 'engineering-copy',
      query: '怎麼付款？',
      reply: 'PaymentIntent API 回傳 500，請檢查 server token 後再付款。',
      grounded: true,
      sourceIds: ['faq-payment-001'],
    });

    expect(summary.userCopyRate).toBe(0);
    expect(summary.results[0].checks).toContainEqual(
      expect.objectContaining({ name: 'user-copy', passed: false })
    );
  });

  test('requires out-of-scope answers to return to storefront topics', () => {
    const sample: RagAnswerSample = {
      id: 'bad-out-of-scope',
      query: '明天天氣如何？',
      reply: '我不知道。',
      grounded: false,
      sourceIds: [],
    };
    const summary = evaluateRagAnswers([sample], [
      {
        id: sample.id,
        query: sample.query,
        expectedGrounded: false,
        outOfScope: true,
        requiredReplyTerms: [['商品', '訂單']],
      },
    ]);

    expect(summary.passRate).toBe(0);
    expect(summary.results[0].checks).toContainEqual(
      expect.objectContaining({ name: 'relevance', passed: false })
    );
  });
});
