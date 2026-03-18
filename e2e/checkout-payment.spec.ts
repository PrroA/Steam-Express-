import { expect, test } from '@playwright/test';
import {
  authHeaders,
  createTestAccount,
  getApiBaseUrl,
  loginToken,
  registerUser,
} from './helpers/api';

test('user can checkout and mark order as paid', async ({ page, request }) => {
  const account = createTestAccount('checkout_flow');
  const registerResponse = await registerUser(request, account);
  expect(registerResponse.ok()).toBeTruthy();
  const token = await loginToken(request, account);

  const gamesResponse = await request.get(`${getApiBaseUrl()}/games`);
  expect(gamesResponse.ok()).toBeTruthy();
  const games = (await gamesResponse.json()) as Array<{ id: number }>;
  expect(games.length).toBeGreaterThan(0);

  const addCartResponse = await request.post(`${getApiBaseUrl()}/cart`, {
    data: { id: games[0].id },
    headers: authHeaders(token),
  });
  expect(addCartResponse.ok()).toBeTruthy();

  await page.goto('/');
  await page.evaluate((value) => localStorage.setItem('token', value), token);
  await page.goto('/cart');

  await page.getByRole('button', { name: '前往付款資訊' }).click();
  await page.locator('input[placeholder="王小明"]').fill('王小明');
  await page.locator('input[placeholder="0912345678"]').fill('0912345678');
  await page.locator('input[placeholder="you@example.com"]').fill('buyer@example.com');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: '前往確認送出' }).click();
  await page.getByRole('button', { name: '建立訂單並前往付款' }).click();

  await expect(page).toHaveURL(/\/orders\?orderId=/);
  const url = new URL(page.url());
  const orderId = url.searchParams.get('orderId');
  expect(orderId).toBeTruthy();
  if (!orderId) {
    throw new Error('orderId is missing after checkout redirect');
  }

  const payResponse = await request.post(`${getApiBaseUrl()}/pay`, {
    data: { orderId },
    headers: authHeaders(token),
  });
  expect(payResponse.ok()).toBeTruthy();

  await page.goto(`/orders?orderId=${orderId}&payment=success`);
  await expect(page.getByText('付款成功')).toBeVisible();
});
