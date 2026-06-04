import { expect, test, type APIRequestContext } from '@playwright/test';
import { getApiBaseUrl } from './helpers/api';

async function loginAdmin(request: APIRequestContext) {
  const response = await request.post(`${getApiBaseUrl()}/login`, {
    data: { username: 'admin', password: 'admin' },
  });
  expect(response.ok()).toBeTruthy();

  const payload = (await response.json()) as { token: string };
  expect(payload.token).toBeTruthy();
  return payload.token;
}

test('admin can edit game basic data from admin panel', async ({ page, request }) => {
  const adminToken = await loginAdmin(request);
  const newName = `E2E Game ${Date.now()}`;

  await page.goto('/');
  await page.evaluate((token) => localStorage.setItem('token', token), adminToken);
  await page.goto('/admin');

  await expect(page.getByTestId('admin-game-management-panel')).toBeVisible();

  const gameManagementPanel = page.getByTestId('admin-game-management-panel');
  const firstEditor = page.getByTestId('admin-game-basic-editor').first();
  await expect(firstEditor).toBeVisible();

  const nameInput = firstEditor.getByTestId('admin-game-name-input');
  const saveBasicButton = firstEditor.getByTestId('admin-game-basic-save');
  const originalName = await nameInput.inputValue();

  try {
    await nameInput.fill(newName);
    await saveBasicButton.click();
    await expect(gameManagementPanel.getByText(newName)).toBeVisible();

    await page.reload();
    await expect(page.getByTestId('admin-game-management-panel').getByText(newName)).toBeVisible();
  } finally {
    const restoreEditor = page.getByTestId('admin-game-basic-editor').first();
    await restoreEditor.getByTestId('admin-game-name-input').fill(originalName);
    await restoreEditor.getByTestId('admin-game-basic-save').click();
    await expect(page.getByTestId('admin-game-management-panel').getByText(originalName)).toBeVisible();
  }
});
