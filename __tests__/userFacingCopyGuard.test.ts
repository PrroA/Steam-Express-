import fs from 'fs';
import path from 'path';

const targetFiles = [
  'components/Carousel.tsx',
  'components/GameCard.tsx',
  'components/admin/AddGamePanel.tsx',
  'components/admin/AdminActionPanel.tsx',
  'components/admin/AiUsagePanel.tsx',
  'components/admin/GameManagementPanel.tsx',
  'components/admin/OrderManagementPanel.tsx',
  'components/admin/PaymentAuditPanel.tsx',
  'components/home/AiRecommendationSection.tsx',
  'pages/ChatPage.tsx',
  'pages/admin.tsx',
  'pages/compare.tsx',
  'pages/ConfirmResetPassword.tsx',
  'pages/index.tsx',
  'pages/login.tsx',
  'pages/profile.tsx',
  'pages/register.tsx',
  'pages/ResetPassword.tsx',
  'pages/transactions.tsx',
  'pages/orders/[orderId].tsx',
  'services/orderService.ts',
];

const forbiddenCopyPatterns = [
  /\uFFFD/,
  /銝|閮|蝞|鞈|甈|憭|瘜|撌|隢|嚗|摰|雿|餃|摮|脣|湔/,
  /\bAPI\b/i,
  /\bserver\b/i,
  /\bbackend\b/i,
  /\bPaymentIntent\b/i,
  /\bclientSecret\b/i,
  /\bwebhook\b/i,
  /\b500\b/,
  /後端/,
  /工程/,
];

const allowedInternalStringPatterns = [
  /^token$/,
  /^react/,
  /^\.\.?\//,
  /^\/[a-z0-9-/?]+$/i,
  /^\$/,
  /^[a-z0-9_-]+$/i,
  /^[#.:[\]\s()%-]+$/,
];

function extractStringLiterals(source: string) {
  const matches = source.matchAll(/(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g);
  return Array.from(matches, (match) => match[2]).filter(Boolean);
}

function isUserFacingCandidate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return !allowedInternalStringPatterns.some((pattern) => pattern.test(trimmed));
}

describe('user-facing copy guard', () => {
  test('recently polished customer pages do not expose mojibake or engineering terms', () => {
    const findings = targetFiles.flatMap((file) => {
      const absolutePath = path.join(process.cwd(), file);
      const source = fs.readFileSync(absolutePath, 'utf8');
      return extractStringLiterals(source)
        .filter(isUserFacingCandidate)
        .flatMap((literal) =>
          forbiddenCopyPatterns
            .filter((pattern) => pattern.test(literal))
            .map((pattern) => `${file}: ${JSON.stringify(literal)} matched ${pattern}`)
        );
    });

    expect(findings).toEqual([]);
  });
});
