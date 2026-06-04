import { expect, test, type APIRequestContext } from '@playwright/test';
import { getApiBaseUrl } from './helpers/api';

type CatalogGame = {
  id: number;
  isActive?: boolean;
};

async function getFirstDemoGameId(request: APIRequestContext) {
  const response = await request.get(`${getApiBaseUrl()}/games`);
  expect(response.ok()).toBeTruthy();
  const games = (await response.json()) as CatalogGame[];
  const firstActiveGame = games.find((game) => game.isActive !== false);
  expect(firstActiveGame?.id).toBeTruthy();
  return firstActiveGame!.id;
}

test('AI showcase entry points guide users through the demo flow', async ({ page, request }) => {
  const firstGameId = await getFirstDemoGameId(request);

  await page.goto('/');
  await expect(page.getByRole('heading', { name: '從選商品到售後，一條線展示' })).toBeVisible();

  const productDecisionLink = page.getByRole('link', { name: '挑一款商品' });
  await expect(productDecisionLink).toHaveAttribute('href', `/game/${firstGameId}`);
  await productDecisionLink.click();
  await expect(page).toHaveURL(new RegExp(`/game/${firstGameId}$`));
  await expect(page.getByTestId('ai-product-summary')).toBeVisible();

  await page.goto('/');
  await page.getByRole('link', { name: '前往比較' }).click();
  await expect(page).toHaveURL(/\/compare$/);
  await expect(page.getByRole('heading', { name: '目前沒有可比較商品' })).toBeVisible();
  await expect(page.getByRole('link', { name: '回商店挑商品' })).toHaveAttribute('href', '/#games');
  await expect(page.getByRole('link', { name: '先問 AI 推薦' })).toHaveAttribute('href', '/ChatPage');

  await page.goto('/');
  await page.getByRole('link', { name: '詢問客服' }).click();
  await expect(page).toHaveURL(/\/ChatPage$/);
  await expect(page.getByText('AI 展示順序')).toBeVisible();

  await page.getByRole('button', { name: '3. 直接問 AI 客服' }).click();
  await expect(page.getByTestId('chat-message-user').last()).toContainText('推薦一款適合新手');
});

test('legacy chat route redirects to the AI support page', async ({ page }) => {
  await page.goto('/ChatUIWithMCP');

  await expect(page).toHaveURL(/\/ChatPage$/);
  await expect(page.getByTestId('ai-chat-page')).toBeVisible();
});

test('home page lets users add products before opening comparison', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('compareGameIds'));
  await page.reload();

  const compareButtons = page.getByRole('button', { name: '加入比較' });
  await expect(compareButtons.first()).toBeVisible();

  await compareButtons.nth(0).click();
  await expect(page.getByText('已選 1 款商品，再選一款就能開始比較。')).toBeVisible();

  await compareButtons.nth(1).click();
  await expect(page.getByText('已選 2 款商品，可以讓 AI 幫你整理差異。')).toBeVisible();

  await page.getByRole('link', { name: '前往比較' }).click();
  await expect(page).toHaveURL(/\/compare$/);
  await expect(page.getByRole('heading', { name: '商品比較' })).toBeVisible();
  await expect(page.getByTestId('compare-ai-advice-button')).toBeVisible();
});
