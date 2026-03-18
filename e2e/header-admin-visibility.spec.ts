import { expect, test } from '@playwright/test';

test('admin user can see admin entry in desktop and mobile menu', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[placeholder*="帳號"]').fill('admin');
  await page.locator('input[placeholder*="密碼"]').fill('admin');
  await page.getByRole('button', { name: '登入' }).click();

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await expect(page.getByText('目前登入')).toBeVisible();
  await expect(page.getByText('admin (Admin)')).toBeVisible();
  await expect(page.getByText('後台管理')).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '開啟選單' }).click();
  await expect(page.getByText('選單')).toBeVisible();
  await expect(page.getByText('後台管理')).toBeVisible();
});
