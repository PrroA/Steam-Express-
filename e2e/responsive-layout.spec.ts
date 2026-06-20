import { expect, test } from '@playwright/test';

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
