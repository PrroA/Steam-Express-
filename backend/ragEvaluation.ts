import type { AppState } from '../types/backend';
import { localHybridRetriever } from './rag';
import type { RagDocumentType, Retriever } from './rag';

export type RagEvaluationCase = {
  id: string;
  query: string;
  expectedDocId?: string;
  expectedType?: RagDocumentType;
  topK?: number;
};

export type RagEvaluationResult = {
  id: string;
  query: string;
  passed: boolean;
  expected: string;
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
  results: RagEvaluationResult[];
};

export const defaultRagEvaluationCases: RagEvaluationCase[] = [
  {
    id: 'payment-help',
    query: '我可以怎麼付款？信用卡不能用怎麼辦？',
    expectedDocId: 'faq-payment-001',
  },
  {
    id: 'refund-policy',
    query: '如果買錯遊戲可以退款嗎？',
    expectedDocId: 'policy-refund-003',
  },
  {
    id: 'shipping-status',
    query: '付款完成後什麼時候出貨？',
    expectedDocId: 'policy-shipping-005',
  },
  {
    id: 'account-login',
    query: '我可以用試用帳號登入嗎？',
    expectedDocId: 'policy-account-004',
  },
  {
    id: 'wishlist-alert',
    query: '願望清單可以做什麼？會提醒降價嗎？',
    expectedDocId: 'faq-wishlist-006',
  },
  {
    id: 'cheap-game',
    query: '推薦一款便宜的 RPG 遊戲',
    expectedType: 'catalog',
  },
  {
    id: 'named-game',
    query: 'Cyberpunk 2077 有哪些版本和庫存？',
    expectedDocId: 'catalog-game-1',
  },
];

function getExpectedLabel(testCase: RagEvaluationCase) {
  if (testCase.expectedDocId) return testCase.expectedDocId;
  if (testCase.expectedType) return `type:${testCase.expectedType}`;
  return 'any';
}

function isCasePassed(testCase: RagEvaluationCase, matchedIds: string[], matchedTypes: RagDocumentType[]) {
  if (testCase.expectedDocId) return matchedIds.includes(testCase.expectedDocId);
  if (testCase.expectedType) return matchedTypes.includes(testCase.expectedType);
  return matchedIds.length > 0;
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
      passed: isCasePassed(testCase, matchedIds, matchedTypes),
      expected: getExpectedLabel(testCase),
      topMatch,
      matchedIds,
    };
  });

  const passed = results.filter((result) => result.passed).length;

  return {
    total: results.length,
    passed,
    hitRate: results.length > 0 ? passed / results.length : 0,
    results,
  };
}
