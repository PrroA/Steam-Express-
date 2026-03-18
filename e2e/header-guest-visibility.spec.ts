import { expect, test } from '@playwright/test';

test('guest only sees login/register in mobile menu', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('token'));
  await page.reload();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '開啟選單' }).click();

  await expect(page.getByText('選單')).toBeVisible();
  await expect(page.getByText('登入 / 註冊')).toBeVisible();

  await expect(page.getByText('購物車')).toHaveCount(0);
  await expect(page.getByText('願望清單')).toHaveCount(0);
  await expect(page.getByText('訂單')).toHaveCount(0);
  await expect(page.getByText('交易記錄')).toHaveCount(0);
  await expect(page.getByText('後台管理')).toHaveCount(0);
});
