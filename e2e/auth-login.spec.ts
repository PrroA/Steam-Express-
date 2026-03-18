import { expect, test } from '@playwright/test';
import { createTestAccount, registerUser } from './helpers/api';

test('user can login and see current account in header', async ({ page, request }) => {
  const account = createTestAccount('auth_login');
  const registerResponse = await registerUser(request, account);
  expect(registerResponse.ok()).toBeTruthy();

  await page.goto('/login');
  await page.locator('input[placeholder*="帳號"]').fill(account.username);
  await page.locator('input[placeholder*="密碼"]').fill(account.password);
  await page.getByRole('button', { name: '登入' }).click();

  await expect(page).toHaveURL(/\/(cart|wishlist|orders|transactions|admin|$)/);
  await expect(page.getByText('目前登入')).toBeVisible();
  await expect(page.getByText(account.username)).toBeVisible();
  await expect(page.getByRole('button', { name: '登出' })).toBeVisible();
});
