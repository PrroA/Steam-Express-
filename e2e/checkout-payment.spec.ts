import { expect, test } from '@playwright/test';
import {
  authHeaders,
  createTestAccount,
  getApiBaseUrl,
  loginToken,
  registerUser,
} from './helpers/api';

type CatalogGame = {
  id: number;
  isActive?: boolean;
  variants?: Array<{ id: string; stock: number }>;
};

test('demo flow can review cart, checkout, and complete demo payment', async ({ page, request }) => {
  const account = createTestAccount('demo_flow');
  const registerResponse = await registerUser(request, account);
  expect(registerResponse.ok()).toBeTruthy();
  const token = await loginToken(request, account);

  const gamesResponse = await request.get(`${getApiBaseUrl()}/games`);
  expect(gamesResponse.ok()).toBeTruthy();
  const games = (await gamesResponse.json()) as CatalogGame[];
  const game = games.find((item) => item.isActive !== false && item.variants?.some((variant) => variant.stock > 0));
  expect(game).toBeTruthy();
  const variant = game?.variants?.find((item) => item.stock > 0);

  const addCartResponse = await request.post(`${getApiBaseUrl()}/cart`, {
    data: { id: game?.id, variantId: variant?.id },
    headers: authHeaders(token),
  });
  expect(addCartResponse.ok()).toBeTruthy();

  await page.goto('/');
  await page.evaluate((value) => localStorage.setItem('token', value), token);
  await page.goto('/cart');

  await expect(page.getByText('AI 購物車檢查')).toBeVisible();
  await page.getByTestId('cart-ai-review').click();
  await expect(page.getByText(/可以結帳|先確認預算|建議調整/)).toBeVisible();

  await page.getByTestId('checkout-next-payment').click();
  await page.getByTestId('checkout-full-name').fill('Demo User');
  await page.getByTestId('checkout-phone').fill('0912345678');
  await page.getByTestId('checkout-email').fill('demo@example.com');
  await page.getByTestId('checkout-shipping-address').fill('Demo checkout address');
  await page.getByTestId('checkout-agree').check();
  await page.getByTestId('checkout-next-review').click();
  await page.getByTestId('checkout-submit').click();

  await expect(page).toHaveURL(/\/orders\?orderId=/);
  const url = new URL(page.url());
  const orderId = url.searchParams.get('orderId');
  expect(orderId).toBeTruthy();
  if (!orderId) throw new Error('orderId is missing after checkout redirect');

  await expect(page.getByTestId('demo-quick-pay').first()).toBeVisible();
  await page.getByTestId('demo-quick-pay').first().click();

  await expect.poll(
    async () => {
      const orderResponse = await request.get(`${getApiBaseUrl()}/orders/${orderId}`, {
        headers: authHeaders(token),
      });
      if (!orderResponse.ok()) return 'missing';
      const order = await orderResponse.json();
      return order.status;
    },
    { timeout: 15_000 }
  ).toBe('paid');
});
