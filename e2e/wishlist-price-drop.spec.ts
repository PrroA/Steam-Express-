import { expect, test } from '@playwright/test';
import { authHeaders, createTestAccount, getApiBaseUrl, loginToken, registerUser } from './helpers/api';

function parsePrice(priceText: string) {
  return Number(String(priceText || '0').replace('$', '')) || 0;
}

test('wishlist keeps price-drop alerts disabled for the demo flow', async ({ page, request }) => {
  const buyer = createTestAccount('wishlist_drop');
  const registerResponse = await registerUser(request, buyer);
  expect(registerResponse.ok()).toBeTruthy();
  const buyerToken = await loginToken(request, buyer);

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
      localStorage.setItem(
        'wishlistPriceDropAlerts',
        JSON.stringify([{ id: gameId, title: '舊版降價通知', unread: true }])
      );
    },
    { gameId: game.id, price: initialPrice }
  );

  await page.goto('/wishlist');
  await expect(page.getByRole('heading', { name: '想玩的遊戲' })).toBeVisible();
  await expect(page.getByText('最新降價通知')).toHaveCount(0);
  await expect.poll(async () => page.evaluate(() => localStorage.getItem('wishlistPriceDropAlerts'))).toBeNull();

  const bellButton = page.locator('button[aria-label="通知"]').first();
  await expect(bellButton).toBeVisible();
  await bellButton.click();
  await expect(page.getByRole('navigation').getByText('目前沒有新的訂單通知。')).toBeVisible();
});
