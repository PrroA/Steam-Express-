import { expect, test, type APIRequestContext } from '@playwright/test';
import { getApiBaseUrl } from './helpers/api';

type CatalogGame = {
  id: number;
  isActive?: boolean;
};

async function expectNoMojibake(pageText: string) {
  expect(pageText).not.toMatch(/[�\u0080-\u009f\uF000-\uF8FF]/u);
}

async function getDemoGameIds(request: APIRequestContext) {
  const response = await request.get(`${getApiBaseUrl()}/games`);
  expect(response.ok()).toBeTruthy();
  const games = (await response.json()) as CatalogGame[];
  const activeIds = games.filter((game) => game.isActive !== false).map((game) => game.id);
  expect(activeIds.length).toBeGreaterThanOrEqual(2);
  return activeIds.slice(0, 2);
}

test('AI demo flow exposes chat, product advice, and comparison advice', async ({ page, request }) => {
  const [firstGameId, secondGameId] = await getDemoGameIds(request);

  await page.goto('/ChatPage');
  await expect(page.getByTestId('ai-chat-page')).toBeVisible();
  await expectNoMojibake(await page.locator('body').innerText());
  await page.getByTestId('chat-input').fill('怎麼付款？');
  await page.getByTestId('chat-send').click();
  await expect(page.getByTestId('chat-message-user').last()).toContainText('怎麼付款');
  await expect(page.getByTestId('chat-message-assistant').last()).toContainText(/付款|訂單|結帳/);
  await expectNoMojibake(await page.locator('body').innerText());

  await page.goto(`/game/${firstGameId}`);
  await expect(page.getByTestId('ai-product-summary')).toBeVisible();
  await expectNoMojibake(await page.locator('body').innerText());
  await page.getByTestId('ai-buying-advice-button').click();
  await expect(page.getByTestId('ai-buying-advice-result')).toBeVisible();
  await expectNoMojibake(await page.locator('body').innerText());

  await page.goto(`/compare?ids=${firstGameId},${secondGameId}`);
  await expect(page.getByTestId('compare-ai-advice-button')).toBeVisible();
  await expectNoMojibake(await page.locator('body').innerText());
  await page.getByTestId('compare-ai-advice-button').click();
  await expect(page.getByTestId('compare-ai-advice-result')).toBeVisible();
  await expectNoMojibake(await page.locator('body').innerText());
});
