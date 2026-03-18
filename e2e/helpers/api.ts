import type { APIRequestContext } from '@playwright/test';

const API_BASE_URL = process.env.E2E_API_BASE_URL || 'http://localhost:4000';

function uniqueSuffix() {
  return `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

export function createTestAccount(prefix = 'e2e_user') {
  const suffix = uniqueSuffix();
  return {
    username: `${prefix}_${suffix}`,
    password: `Aa123456!_${suffix}`,
  };
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export async function registerUser(
  request: APIRequestContext,
  credentials: { username: string; password: string }
) {
  const response = await request.post(`${API_BASE_URL}/register`, { data: credentials });
  return response;
}

export async function loginToken(
  request: APIRequestContext,
  credentials: { username: string; password: string }
) {
  const response = await request.post(`${API_BASE_URL}/login`, { data: credentials });
  if (!response.ok()) {
    throw new Error(`Login failed (${response.status()})`);
  }
  const payload = (await response.json()) as { token: string };
  return payload.token;
}

export function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}
