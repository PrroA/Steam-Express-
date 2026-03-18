import { expect, test } from '@playwright/test';
import { createTestAccount, registerUser } from './helpers/api';

test('non-admin user cannot see admin entry in desktop and mobile menu', async ({ page, request }) => {
  const account = createTestAccount('non_admin_visibility');
  const registerResponse = await registerUser(request, account);
  expect(registerResponse.ok()).toBeTruthy();

  await page.goto('/login');
  await page.locator('input[placeholder*="帳號"]').fill(account.username);
  await page.locator('input[placeholder*="密碼"]').fill(account.password);
  await page.getByRole('button', { name: '登入' }).click();

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await expect(page.getByText('目前登入')).toBeVisible();
  await expect(page.getByText(account.username)).toBeVisible();
  await expect(page.getByText('後台管理')).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '開啟選單' }).click();
  await expect(page.getByText('選單')).toBeVisible();
  await expect(page.getByText('後台管理')).toHaveCount(0);
});
