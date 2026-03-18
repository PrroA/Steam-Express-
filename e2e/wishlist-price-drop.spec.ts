import { expect, test } from '@playwright/test';
import {
  authHeaders,
  createTestAccount,
  getApiBaseUrl,
  loginToken,
  registerUser,
} from './helpers/api';

function parsePrice(priceText: string) {
  return Number(String(priceText || '0').replace('$', '')) || 0;
}

test('wishlist price drop creates bell notification', async ({ page, request }) => {
  const buyer = createTestAccount('wishlist_drop');
  const registerResponse = await registerUser(request, buyer);
  expect(registerResponse.ok()).toBeTruthy();
  const buyerToken = await loginToken(request, buyer);
  const adminToken = await loginToken(request, { username: 'admin', password: 'admin' });

  const gamesResponse = await request.get(`${getApiBaseUrl()}/games`);
  expect(gamesResponse.ok()).toBeTruthy();
  const games = (await gamesResponse.json()) as Array<{ id: number; name: string; price: string }>;
  expect(games.length).toBeGreaterThan(0);
  const game = games[0];

  const addWishlistResponse = await request.post(`${getApiBaseUrl()}/wishlist`, {
    data: { id: game.id },
    headers: authHeaders(buyerToken),
  });
  expect(addWishlistResponse.ok()).toBeTruthy();

  await page.goto('/');
  await page.evaluate((value) => localStorage.setItem('token', value), buyerToken);

  const initialPrice = parsePrice(game.price);
  await page.evaluate(
    ({ gameId, price }) => {
      localStorage.setItem('wishlistPriceSnapshot', JSON.stringify({ [gameId]: String(price) }));
      localStorage.removeItem('wishlistPriceDropAlerts');
    },
    { gameId: game.id, price: initialPrice }
  );

  const loweredPrice = Math.max(1, initialPrice - 1).toFixed(2);
  const dropResponse = await request.patch(`${getApiBaseUrl()}/admin/games/${game.id}`, {
    data: { price: loweredPrice },
    headers: authHeaders(adminToken),
  });
  expect(dropResponse.ok()).toBeTruthy();

  await page.goto('/wishlist');
  await expect(page.getByText('最新降價通知')).toBeVisible();
  const alertCount = await page.evaluate(() => {
    const raw = localStorage.getItem('wishlistPriceDropAlerts');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.length : 0;
  });
  expect(alertCount).toBeGreaterThan(0);

  const bellButton = page.locator('button[aria-label="降價通知"]').first();
  await expect(bellButton).toBeVisible();
  await bellButton.click();
  await expect(page.getByText(game.name).first()).toBeVisible();
});
