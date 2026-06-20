import type { AppState } from '../types/backend';
import { localHybridRetriever } from './rag';
import type { RagDocumentType, Retriever } from './rag';

export type RagEvaluationCase = {
  id: string;
  query: string;
  expectedDocId?: string;
  expectedType?: RagDocumentType;
  expectedNoMatch?: boolean;
  topK?: number;
};

export type RagEvaluationResult = {
  id: string;
  query: string;
  passed: boolean;
  top1Passed: boolean;
  hitAtKPassed: boolean;
  expected: string;
  rank: number | null;
  topMatch: {
    id: string;
    title: string;
    type: RagDocumentType;
    score: number;
  } | null;
  matchedIds: string[];
};

export type RagEvaluationSummary = {
  total: number;
  passed: number;
  hitRate: number;
  top1Passed: number;
  hitAtKPassed: number;
  top1Accuracy: number;
  hitRateAtK: number;
  failures: RagEvaluationResult[];
  results: RagEvaluationResult[];
};

export const defaultRagEvaluationCases: RagEvaluationCase[] = [
  {
    id: 'payment-help',
    query: '信用卡付款失敗後可以重新付款嗎？',
    expectedDocId: 'faq-payment-001',
  },
  {
    id: 'refund-policy',
    query: '買錯遊戲可以申請退款嗎？',
    expectedDocId: 'policy-refund-003',
  },
  {
    id: 'shipping-status',
    query: '付款完成後什麼時候會出貨？',
    expectedDocId: 'policy-shipping-005',
  },
  {
    id: 'account-login',
    query: '我可以自己註冊帳號登入嗎？',
    expectedDocId: 'policy-account-004',
  },
  {
    id: 'wishlist-alert',
    query: '願望清單可以查看收藏商品的價格嗎？',
    expectedDocId: 'faq-wishlist-006',
  },
  {
    id: 'order-lookup',
    query: '我要去哪裡查看訂單狀態？',
    expectedDocId: 'faq-order-002',
  },
  {
    id: 'cheap-game',
    query: '推薦一款預算二十美元內的黑暗奇幻 RPG 遊戲',
    expectedDocId: 'catalog-game-6',
  },
  {
    id: 'named-game',
    query: 'Cyberpunk 2077 有哪些版本和庫存？',
    expectedDocId: 'catalog-game-1',
  },
  {
    id: 'out-of-scope',
    query: '請告訴我明天台北的天氣',
    expectedNoMatch: true,
  },
];

function getExpectedLabel(testCase: RagEvaluationCase) {
  if (testCase.expectedNoMatch) return 'no-match';
  if (testCase.expectedDocId) return testCase.expectedDocId;
  if (testCase.expectedType) return `type:${testCase.expectedType}`;
  return 'any';
}

function getExpectedRank(
  testCase: RagEvaluationCase,
  matchedIds: string[],
  matchedTypes: RagDocumentType[]
): number | null {
  if (testCase.expectedNoMatch) return matchedIds.length === 0 ? 1 : null;
  if (testCase.expectedDocId) {
    const index = matchedIds.indexOf(testCase.expectedDocId);
    return index >= 0 ? index + 1 : null;
  }
  if (testCase.expectedType) {
    const index = matchedTypes.indexOf(testCase.expectedType);
    return index >= 0 ? index + 1 : null;
  }
  return matchedIds.length > 0 ? 1 : null;
}

export function evaluateRagRetrieval(
  state: AppState,
  cases: RagEvaluationCase[] = defaultRagEvaluationCases,
  retriever: Retriever = localHybridRetriever
): RagEvaluationSummary {
  const results = cases.map((testCase) => {
    const matches = retriever.search(state, testCase.query, { topK: testCase.topK || 3 });
    const matchedIds = matches.map((match) => match.doc.id);
    const matchedTypes = matches.map((match) => match.doc.type);
    const rank = getExpectedRank(testCase, matchedIds, matchedTypes);
    const top1Passed = rank === 1;
    const hitAtKPassed = rank !== null;
    const topMatch = matches[0]
      ? {
          id: matches[0].doc.id,
          title: matches[0].doc.title,
          type: matches[0].doc.type,
          score: matches[0].score,
        }
      : null;

    return {
      id: testCase.id,
      query: testCase.query,
      passed: hitAtKPassed,
      top1Passed,
      hitAtKPassed,
      expected: getExpectedLabel(testCase),
      rank,
      topMatch,
      matchedIds,
    };
  });

  const top1Passed = results.filter((result) => result.top1Passed).length;
  const hitAtKPassed = results.filter((result) => result.hitAtKPassed).length;
  const total = results.length;

  return {
    total,
    passed: hitAtKPassed,
    hitRate: total > 0 ? hitAtKPassed / total : 0,
    top1Passed,
    hitAtKPassed,
    top1Accuracy: total > 0 ? top1Passed / total : 0,
    hitRateAtK: total > 0 ? hitAtKPassed / total : 0,
    failures: results.filter((result) => !result.top1Passed),
    results,
  };
}
