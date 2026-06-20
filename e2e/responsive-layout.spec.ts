import { expect, test } from '@playwright/test';
import { authHeaders, getApiBaseUrl } from './helpers/api';

type CatalogGame = {
  id: number;
  isActive?: boolean;
  variants?: Array<{ id: string; stock: number }>;
};

test('mobile storefront keeps the header and support entry compact', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await expect(page.getByRole('link', { name: 'STEAM PRACTICE' })).toBeVisible();
  await expect(page.getByRole('button', { name: '開啟選單' })).toBeVisible();
  await expect(page.getByRole('button', { name: '開啟客服入口' })).toHaveCount(0);

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(hasHorizontalOverflow).toBe(false);

  await page.goto('/game/1');

  const supportButton = page.getByRole('button', { name: '開啟客服入口' });
  await expect(supportButton).toBeVisible();

  const supportBox = await supportButton.boundingBox();
  expect(supportBox).not.toBeNull();
  expect(supportBox?.width).toBeLessThanOrEqual(56);
  expect(supportBox?.height).toBeLessThanOrEqual(56);
});

test('mobile AI support keeps prompts and composer in the main viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/ChatPage');

  await expect(page.getByTestId('chat-mobile-prompts')).toBeVisible();
  await expect(page.getByTestId('chat-mobile-prompts').getByRole('button')).toHaveCount(3);
  await expect(page.getByTestId('chat-sidebar')).toBeHidden();
  await expect(page.getByTestId('chat-input')).toBeVisible();
  await expect(page.getByTestId('chat-send')).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test('mobile checkout keeps the primary action with the current step', async ({ page, request }) => {
  const demoResponse = await request.post(`${getApiBaseUrl()}/demo-login`);
  expect(demoResponse.ok()).toBeTruthy();
  const demo = await demoResponse.json();
  const token = String(demo.token || '');
  expect(token).not.toBe('');

  const gamesResponse = await request.get(`${getApiBaseUrl()}/games`);
  expect(gamesResponse.ok()).toBeTruthy();
  const games = (await gamesResponse.json()) as CatalogGame[];
  const game = games.find((item) => item.isActive !== false && item.variants?.some((variant) => variant.stock > 0));
  const variant = game?.variants?.find((item) => item.stock > 0);
  expect(game).toBeTruthy();
  expect(variant).toBeTruthy();

  const addCartResponse = await request.post(`${getApiBaseUrl()}/cart`, {
    data: { id: game?.id, variantId: variant?.id },
    headers: authHeaders(token),
  });
  expect(addCartResponse.ok()).toBeTruthy();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.evaluate((value) => localStorage.setItem('token', value), token);
  await page.goto('/cart');

  await expect(page.getByTestId('checkout-stepper')).toBeVisible();
  await expect(page.getByTestId('checkout-mobile-actions')).toBeVisible();
  await expect(page.getByTestId('checkout-next-payment-mobile')).toBeVisible();
  await expect(page.getByTestId('checkout-next-payment')).toBeHidden();
  await expect(page.getByRole('button', { name: '開啟客服入口' })).toHaveCount(0);

  await page.getByTestId('checkout-next-payment-mobile').click();
  await expect(page.getByTestId('checkout-full-name')).toBeVisible();
  await expect(page.getByTestId('checkout-next-review-mobile')).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(hasHorizontalOverflow).toBe(false);
});
