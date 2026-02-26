import { apiClient } from './apiClient';

export interface LoginResponse {
  token: string;
}

export async function loginUser(username: string, password: string): Promise<LoginResponse> {
  const response = await apiClient.post('/login', { username, password });
  return response.data;
}

export async function registerUser(username: string, password: string): Promise<{
  message: string;
  user: { id: number; username: string };
}> {
  const response = await apiClient.post('/register', { username, password });
  return response.data;
}

export async function requestPasswordReset(username: string): Promise<{
  message: string;
  resetToken: string;
}> {
  const response = await apiClient.post('/forgot-password', { username });
  return response.data;
}

export async function confirmPasswordReset(
  resetToken: string,
  newPassword: string
): Promise<{ message: string }> {
  const response = await apiClient.post('/confirm-reset-password', { resetToken, newPassword });
  return response.data;
}
