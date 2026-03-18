import { expect, test } from '@playwright/test';

test('admin can edit game basic data from admin panel', async ({ page }) => {
  const newName = `E2E 商品 ${Date.now()}`;

  await page.goto('/login');
  await page.locator('input[placeholder*="帳號"]').fill('admin');
  await page.locator('input[placeholder*="密碼"]').fill('admin');
  await page.getByRole('button', { name: '登入' }).click();

  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: '後台管理' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '商品管理' })).toBeVisible();

  const firstBasicEditor = page
    .locator('div')
    .filter({ hasText: '基本資料編輯' })
    .first();

  await expect(firstBasicEditor).toBeVisible();
  await firstBasicEditor.locator('input[placeholder="商品名稱"]').fill(newName);
  await firstBasicEditor.locator('button', { hasText: '更新商品基本資料' }).click();

  await expect(page.getByText('商品基本資料已更新')).toBeVisible();
  await page.reload();
  await expect(page.getByText(newName).first()).toBeVisible();
});
