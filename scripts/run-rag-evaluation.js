/* eslint-disable no-console */
const stateModule = require('../backend-build/state');
const { evaluateRagRetrieval } = require('../backend-build/ragEvaluation');

const state = {
  users: stateModule.users,
  messages: stateModule.messages,
  reviews: stateModule.reviews,
  carts: stateModule.carts,
  orders: stateModule.orders,
  wishlists: stateModule.wishlists,
  resetTokens: stateModule.resetTokens,
  games: stateModule.games,
};

const summary = evaluateRagRetrieval(state);
const percent = (value) => `${(value * 100).toFixed(1)}%`;

console.log(`RAG evaluation: ${summary.total} cases`);
console.log(`Top-1 Accuracy: ${percent(summary.top1Accuracy)} (${summary.top1Passed}/${summary.total})`);
console.log(`Hit Rate@3: ${percent(summary.hitRateAtK)} (${summary.hitAtKPassed}/${summary.total})`);

if (summary.failures.length > 0) {
  console.error('Top-1 failures:');
  summary.failures.forEach((failure) => {
    const actual = failure.topMatch ? `${failure.topMatch.id} (${failure.topMatch.title})` : 'no match';
    console.error(`- ${failure.id}: expected ${failure.expected}, received ${actual}, rank ${failure.rank || 'not found'}`);
  });
  process.exitCode = 1;
}
