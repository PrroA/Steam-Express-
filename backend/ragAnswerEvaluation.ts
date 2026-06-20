import type { AppState } from '../types/backend';
import { buildCustomerServiceFallbackReply } from './customerServiceReply';
import { retrieveRagContext } from './rag';

export type RagAnswerEvaluationCase = {
  id: string;
  query: string;
  expectedGrounded: boolean;
  expectedSourceIds?: string[];
  requiredReplyTerms?: string[][];
  outOfScope?: boolean;
};

export type RagAnswerSample = {
  id: string;
  query: string;
  reply: string;
  grounded: boolean;
  sourceIds: string[];
};

export type RagAnswerCheck = {
  name: 'reply' | 'grounding' | 'sources' | 'relevance' | 'safety' | 'user-copy';
  passed: boolean;
  detail: string;
};

export type RagAnswerEvaluationResult = {
  id: string;
  query: string;
  passed: boolean;
  checks: RagAnswerCheck[];
};

export type RagAnswerEvaluationSummary = {
  total: number;
  passed: number;
  passRate: number;
  sourceAccuracyRate: number;
  safetyRate: number;
  userCopyRate: number;
  failures: RagAnswerEvaluationResult[];
  results: RagAnswerEvaluationResult[];
};

export const defaultRagAnswerEvaluationCases: RagAnswerEvaluationCase[] = [
  {
    id: 'payment-answer',
    query: '信用卡付款失敗後可以怎麼做？',
    expectedGrounded: true,
    expectedSourceIds: ['faq-payment-001'],
    requiredReplyTerms: [['付款'], ['信用卡', '快速付款']],
  },
  {
    id: 'refund-answer',
    query: '買錯遊戲可以退款嗎？',
    expectedGrounded: true,
    expectedSourceIds: ['policy-refund-003'],
    requiredReplyTerms: [['退款'], ['訂單詳情']],
  },
  {
    id: 'shipping-answer',
    query: '付款完成後什麼時候出貨？',
    expectedGrounded: true,
    expectedSourceIds: ['policy-shipping-005'],
    requiredReplyTerms: [['出貨', '配送'], ['訂單中心']],
  },
  {
    id: 'account-answer',
    query: '我要怎麼註冊帳號登入？',
    expectedGrounded: true,
    expectedSourceIds: ['policy-account-004'],
    requiredReplyTerms: [['註冊'], ['登入']],
  },
  {
    id: 'wishlist-answer',
    query: '願望清單可以做什麼？',
    expectedGrounded: true,
    expectedSourceIds: ['faq-wishlist-006'],
    requiredReplyTerms: [['願望清單'], ['收藏', '價格']],
  },
  {
    id: 'order-answer',
    query: '我要去哪裡查看訂單狀態？',
    expectedGrounded: true,
    expectedSourceIds: ['faq-order-002'],
    requiredReplyTerms: [['訂單中心'], ['狀態']],
  },
  {
    id: 'out-of-scope-answer',
    query: '請告訴我明天台北的天氣',
    expectedGrounded: false,
    outOfScope: true,
    requiredReplyTerms: [['商品', '訂單', '付款']],
  },
];

const engineeringTermPattern = /\b(?:api|server|token|paymentintent)\b|\b(?:http|status)\s*500\b|stack\s*trace/i;
const unsafeActionPattern = /(?:我|已經?|已)(?:已經)?(?:替|幫)(?:你|您).{0,10}(?:付款|退款|取消訂單|修改資料)/i;
const serviceGuidancePattern = /(商品|購物車|付款|訂單|退款|配送|帳號|願望清單)/i;

function findCase(cases: RagAnswerEvaluationCase[], id: string) {
  return cases.find((item) => item.id === id);
}

function buildChecks(sample: RagAnswerSample, testCase: RagAnswerEvaluationCase): RagAnswerCheck[] {
  const expectedSources = testCase.expectedSourceIds || [];
  const missingSources = expectedSources.filter((id) => !sample.sourceIds.includes(id));
  const missingReplyGroups = (testCase.requiredReplyTerms || []).filter(
    (terms) => !terms.some((term) => sample.reply.toLowerCase().includes(term.toLowerCase()))
  );
  const groundingPassed =
    sample.grounded === testCase.expectedGrounded &&
    (sample.grounded ? sample.sourceIds.length > 0 : sample.sourceIds.length === 0);
  const relevancePassed =
    missingReplyGroups.length === 0 && (!testCase.outOfScope || serviceGuidancePattern.test(sample.reply));

  return [
    {
      name: 'reply',
      passed: sample.reply.trim().length > 0,
      detail: sample.reply.trim().length > 0 ? 'answer is present' : 'answer is empty',
    },
    {
      name: 'grounding',
      passed: groundingPassed,
      detail: groundingPassed
        ? 'grounded flag matches source availability'
        : `expected grounded=${testCase.expectedGrounded}, received grounded=${sample.grounded} with ${sample.sourceIds.length} sources`,
    },
    {
      name: 'sources',
      passed: missingSources.length === 0,
      detail: missingSources.length === 0 ? 'expected sources are present' : `missing sources: ${missingSources.join(', ')}`,
    },
    {
      name: 'relevance',
      passed: relevancePassed,
      detail: relevancePassed
        ? 'answer contains the expected customer guidance'
        : `missing answer terms: ${missingReplyGroups.map((terms) => terms.join('|')).join(', ')}`,
    },
    {
      name: 'safety',
      passed: !unsafeActionPattern.test(sample.reply),
      detail: unsafeActionPattern.test(sample.reply) ? 'answer claims a protected action was performed' : 'no protected action claim',
    },
    {
      name: 'user-copy',
      passed: !engineeringTermPattern.test(sample.reply),
      detail: engineeringTermPattern.test(sample.reply) ? 'answer exposes engineering terminology' : 'copy is user-facing',
    },
  ];
}

export function buildDeterministicRagAnswerSamples(
  state: AppState,
  cases: RagAnswerEvaluationCase[] = defaultRagAnswerEvaluationCases
): RagAnswerSample[] {
  return cases.map((testCase) => {
    const matches = retrieveRagContext(state, testCase.query, 4);
    const grounded = matches.length > 0;
    return {
      id: testCase.id,
      query: testCase.query,
      reply: buildCustomerServiceFallbackReply(testCase.query, grounded),
      grounded,
      sourceIds: matches.map((item) => item.doc.id),
    };
  });
}

export function evaluateRagAnswers(
  samples: RagAnswerSample[],
  cases: RagAnswerEvaluationCase[] = defaultRagAnswerEvaluationCases
): RagAnswerEvaluationSummary {
  const results = samples.map((sample) => {
    const testCase = findCase(cases, sample.id);
    if (!testCase) {
      const checks: RagAnswerCheck[] = [
        { name: 'reply', passed: false, detail: `evaluation case not found for ${sample.id}` },
      ];
      return { id: sample.id, query: sample.query, passed: false, checks };
    }

    const checks = buildChecks(sample, testCase);
    return {
      id: sample.id,
      query: sample.query,
      passed: checks.every((check) => check.passed),
      checks,
    };
  });

  const total = results.length;
  const countPassed = (name: RagAnswerCheck['name']) =>
    results.filter((result) => result.checks.find((check) => check.name === name)?.passed).length;
  const passed = results.filter((result) => result.passed).length;

  return {
    total,
    passed,
    passRate: total > 0 ? passed / total : 0,
    sourceAccuracyRate: total > 0 ? countPassed('sources') / total : 0,
    safetyRate: total > 0 ? countPassed('safety') / total : 0,
    userCopyRate: total > 0 ? countPassed('user-copy') / total : 0,
    failures: results.filter((result) => !result.passed),
    results,
  };
}
