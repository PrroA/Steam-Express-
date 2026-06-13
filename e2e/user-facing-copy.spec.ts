import { expect, test, type Page } from '@playwright/test';
import { createTestAccount, loginToken, registerUser } from './helpers/api';

const forbiddenCopyPatterns = [
  /\bAPI\b/i,
  /\bserver\b/i,
  /\bbackend\b/i,
  /\btoken\b/i,
  /\bPaymentIntent\b/i,
  /\bclientSecret\b/i,
  /\bStripe\b/i,
  /\bDemo\b/i,
  /\blocalhost\b/i,
  /\bCORS\b/i,
  /\bCSP\b/i,
  /\b500\b/,
  /\uFFFD/,
  /銝|閮|蝞|鞈|甈|憭|瘜|撌|隢|嚗|摰|雿|餃|摮|脣|湔/,
];

async function expectUserFacingCopy(page: Page, pageName: string) {
  const visibleText = await page.locator('body').innerText();
  for (const pattern of forbiddenCopyPatterns) {
    expect(visibleText, `${pageName} exposed technical copy matching ${pattern}`).not.toMatch(pattern);
  }
}

test('main user-facing pages do not expose engineering copy', async ({ page, request }) => {
  const account = createTestAccount('copy_guard');
  const registerResponse = await registerUser(request, account);
  expect(registerResponse.ok()).toBeTruthy();
  const token = await loginToken(request, account);

  await page.goto('/');
  await expect(page.getByRole('heading', { name: '找到下一款想玩的遊戲' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '先挑商品，再比較與結帳' })).toBeVisible();
  await expectUserFacingCopy(page, 'home');

  await page.goto('/login');
  await expect(page.getByRole('heading', { name: '登入你的商城帳號' })).toBeVisible();
  await expectUserFacingCopy(page, 'login');

  await page.goto('/');
  await page.evaluate((value) => localStorage.setItem('token', value), token);

  const firstGameLink = page.getByRole('link', { name: '查看商品' }).nth(1);
  await expect(firstGameLink).toBeVisible();
  await firstGameLink.click();
  await expect(page.getByTestId('ai-product-summary')).toBeVisible();
  await expectUserFacingCopy(page, 'game detail');

  await page.goto('/cart');
  await expect(page.getByRole('heading', { name: /購物車|購物車是空的/ })).toBeVisible();
  await expectUserFacingCopy(page, 'cart');

  await page.goto('/orders');
  await expect(page.getByRole('heading', { name: '我的訂單' })).toBeVisible();
  await expectUserFacingCopy(page, 'orders');

  await page.goto('/wishlist');
  await expect(page.getByRole('heading', { name: /願望清單|願望清單是空的/ })).toBeVisible();
  await expectUserFacingCopy(page, 'wishlist');

  await page.goto('/compare');
  await expect(page.getByRole('heading', { name: '目前沒有可比較商品' })).toBeVisible();
  await expectUserFacingCopy(page, 'compare');

  await page.goto('/ChatPage');
  await expect(page.getByTestId('ai-chat-page')).toBeVisible();
  await expect(page.getByText('常用入口')).toBeVisible();
  await expectUserFacingCopy(page, 'chat');
});
