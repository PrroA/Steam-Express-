/* eslint-disable no-console */
const stateModule = require('../backend-build/state');
const {
  buildDeterministicRagAnswerSamples,
  evaluateRagAnswers,
} = require('../backend-build/ragAnswerEvaluation');

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

const summary = evaluateRagAnswers(buildDeterministicRagAnswerSamples(state));
const percent = (value) => `${(value * 100).toFixed(1)}%`;

console.log(`RAG answer evaluation: ${summary.total} cases`);
console.log(`Overall Pass Rate: ${percent(summary.passRate)} (${summary.passed}/${summary.total})`);
console.log(`Source Accuracy: ${percent(summary.sourceAccuracyRate)}`);
console.log(`Safety Rate: ${percent(summary.safetyRate)}`);
console.log(`User Copy Rate: ${percent(summary.userCopyRate)}`);

if (summary.failures.length > 0) {
  console.error('Answer quality failures:');
  summary.failures.forEach((failure) => {
    const details = failure.checks
      .filter((check) => !check.passed)
      .map((check) => `${check.name}: ${check.detail}`)
      .join('; ');
    console.error(`- ${failure.id}: ${details}`);
  });
  process.exitCode = 1;
}
