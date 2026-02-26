import { apiClient, authHeader } from './apiClient';
import type { UserProfile } from '../types/domain';

export async function fetchProfile(token?: string | null): Promise<UserProfile> {
  const response = await apiClient.get('/profile', {
    headers: authHeader(token),
  });
  return response.data;
}

export async function updateProfile(
  payload: { username: string; email: string },
  token?: string | null
): Promise<{ message: string; user: UserProfile }> {
  const response = await apiClient.put('/profile', payload, {
    headers: authHeader(token),
  });
  return response.data;
}
