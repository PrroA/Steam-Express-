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

test('admin can see AI usage after a customer support answer', async ({ page, request }) => {
  const chatResponse = await request.post(`${getApiBaseUrl()}/chat/rag`, {
    data: { message: 'recommend a game' },
  });
  expect(chatResponse.ok()).toBeTruthy();

  const chatPayload = await chatResponse.json();
  expect(chatPayload.mode).toBeTruthy();

  const adminToken = await loginAdmin(request);

  await page.goto('/');
  await page.evaluate((token) => localStorage.setItem('token', token), adminToken);
  await page.goto('/admin');

  await expect(page.getByTestId('admin-ai-usage-panel')).toBeVisible();
  await expect(page.getByText('recommend a game')).toBeVisible();
  await expect(page.getByTestId('admin-ai-usage-grounded-rate')).toBeVisible();
  await expect(page.getByTestId('admin-ai-usage-fallback-rate')).toBeVisible();
  await expect(page.getByTestId('admin-ai-usage-average-duration')).toBeVisible();

  const totalText = await page.getByTestId('admin-ai-usage-total').innerText();
  const totalMatch = totalText.match(/\d+/);
  expect(totalMatch).toBeTruthy();
  expect(Number(totalMatch?.[0])).toBeGreaterThan(0);

  await expect(page.getByTestId('admin-ai-usage-grounded-rate')).toContainText('%');
  await expect(page.getByTestId('admin-ai-usage-fallback-rate')).toContainText('%');
});
