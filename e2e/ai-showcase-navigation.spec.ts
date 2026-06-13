import { expect, test } from '@playwright/test';

test('storefront entry points keep the shopping flow simple', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '先挑商品，再比較與結帳' })).toBeVisible();

  await page.getByRole('link', { name: '查看商品' }).first().click();
  await expect(page.locator('#games')).toBeVisible();
  await page.getByRole('link', { name: '查看商品' }).nth(1).click();
  await expect(page).toHaveURL(/\/game\/\d+$/);
  await expect(page.getByTestId('ai-product-summary')).toBeVisible();

  await page.goto('/');
  await page.getByRole('link', { name: '詢問 AI 客服' }).click();
  await expect(page).toHaveURL(/\/ChatPage$/);
  await expect(page.getByText('常用入口')).toBeVisible();

  await page.getByRole('button', { name: '讓客服推薦一款' }).click();
  await expect(page.getByTestId('chat-message-user').last()).toContainText('推薦一款適合我的遊戲');
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
  await expect(page.getByText('已選擇 1 款商品，再選一款就能開始比較。')).toBeVisible();

  await compareButtons.nth(1).click();
  await expect(page.getByText('已選擇 2 款商品，可以前往比較頁看差異。')).toBeVisible();

  await page.getByRole('link', { name: '前往比較' }).click();
  await expect(page).toHaveURL(/\/compare$/);
  await expect(page.getByRole('heading', { name: '商品比較' })).toBeVisible();
  await expect(page.getByTestId('compare-ai-advice-button')).toBeVisible();
});
