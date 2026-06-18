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

  const agentResponse = await request.post(`${getApiBaseUrl()}/chat/rag`, {
    data: { message: 'assistant recommend an RPG under $30 and add to compare' },
  });
  expect(agentResponse.ok()).toBeTruthy();

  const agentPayload = await agentResponse.json();
  expect(agentPayload.mode).toBe('shopping-agent');
  expect(agentPayload.agentPlan?.steps?.length).toBeGreaterThan(0);

  const adminToken = await loginAdmin(request);

  await page.goto('/');
  await page.evaluate((token) => localStorage.setItem('token', token), adminToken);
  await page.goto('/admin');

  await expect(page.getByTestId('admin-ai-usage-panel')).toBeVisible();
  await expect(page.getByText('recommend a game').first()).toBeVisible();
  await expect(page.getByTestId('admin-ai-usage-grounded-rate')).toBeVisible();
  await expect(page.getByTestId('admin-ai-usage-fallback-rate')).toBeVisible();
  await expect(page.getByTestId('admin-ai-usage-average-duration')).toBeVisible();
  await expect(page.getByTestId('admin-ai-usage-agent-runs')).toBeVisible();
  await expect(page.getByTestId('admin-ai-usage-agent-actions')).toBeVisible();

  const totalText = await page.getByTestId('admin-ai-usage-total').innerText();
  const totalMatch = totalText.match(/\d+/);
  expect(totalMatch).toBeTruthy();
  expect(Number(totalMatch?.[0])).toBeGreaterThan(0);

  const agentRunsText = await page.getByTestId('admin-ai-usage-agent-runs').innerText();
  const agentRunsMatch = agentRunsText.match(/\d+/);
  expect(agentRunsMatch).toBeTruthy();
  expect(Number(agentRunsMatch?.[0])).toBeGreaterThan(0);

  const agentActionsText = await page.getByTestId('admin-ai-usage-agent-actions').innerText();
  const agentActionsMatch = agentActionsText.match(/\d+/);
  expect(agentActionsMatch).toBeTruthy();
  expect(Number(agentActionsMatch?.[0])).toBeGreaterThan(0);

  await expect(page.getByTestId('admin-ai-usage-grounded-rate')).toContainText('%');
  await expect(page.getByTestId('admin-ai-usage-fallback-rate')).toContainText('%');
});
