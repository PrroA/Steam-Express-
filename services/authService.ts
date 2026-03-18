import { apiClient } from './apiClient';

export interface LoginResponse {
  token: string;
}

export async function loginUser(username: string, password: string): Promise<LoginResponse> {
  const response = await apiClient.post('/login', { username, password });
  return response.data;
}

export async function registerUser(username: string, password: string, email?: string): Promise<{
  message: string;
  user: { id: number; username: string; email?: string };
}> {
  const response = await apiClient.post('/register', { username, password, email });
  return response.data;
}

export async function requestPasswordReset(account: string): Promise<{
  message: string;
  resetToken?: string;
  resetUrl?: string;
  emailSent?: boolean;
}> {
  // Backward-compatible payload:
  // - New backend reads `account`
  // - Older backend may still read `username`
  const response = await apiClient.post('/forgot-password', {
    account,
    username: account,
    email: account,
  });
  return response.data;
}

export async function confirmPasswordReset(
  resetToken: string,
  newPassword: string
): Promise<{ message: string }> {
  const response = await apiClient.post('/confirm-reset-password', { resetToken, newPassword });
  return response.data;
}
