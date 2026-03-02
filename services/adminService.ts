import { apiClient, authHeader } from './apiClient';
import type { Game, Order } from '../types/domain';

export interface AdminOrder extends Order {
  userId: number;
}

export interface AdminDashboard {
  totalOrders: number;
  paidOrders: number;
  refundedOrders: number;
  cancelledOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  totalItemsSold: number;
  lowStockGames: Array<{
    id: number;
    name: string;
    variants: Array<{ id: string; name: string; stock: number }>;
  }>;
}

export async function fetchAdminGames(token?: string | null): Promise<Game[]> {
  const response = await apiClient.get('/admin/games', {
    headers: authHeader(token),
  });
  return response.data;
}

export async function updateGameActiveStatus(
  gameId: number,
  isActive: boolean,
  token?: string | null
): Promise<{ message: string; game: Game }> {
  const response = await apiClient.patch(
    `/admin/games/${gameId}/status`,
    { isActive },
    {
      headers: authHeader(token),
    }
  );
  return response.data;
}

export async function updateAdminGame(
  gameId: number,
  payload: { name?: string; description?: string; image?: string; price?: string },
  token?: string | null
): Promise<{ message: string; game: Game }> {
  const response = await apiClient.patch(`/admin/games/${gameId}`, payload, {
    headers: authHeader(token),
  });
  return response.data;
}

export async function ensureAdminGameVariant(
  gameId: number,
  token?: string | null
): Promise<{ message: string; game: Game }> {
  const response = await apiClient.post(
    `/admin/games/${gameId}/ensure-variant`,
    {},
    {
      headers: authHeader(token),
    }
  );
  return response.data;
}

export async function updateGameVariant(
  gameId: number,
  variantId: string,
  payload: { name?: string; stock?: number; price?: string },
  token?: string | null
): Promise<{ message: string; game: Game }> {
  const response = await apiClient.patch(`/admin/games/${gameId}/variants/${variantId}`, payload, {
    headers: authHeader(token),
  });
  return response.data;
}

export async function fetchAdminOrders(token?: string | null): Promise<AdminOrder[]> {
  const response = await apiClient.get('/admin/orders', {
    headers: authHeader(token),
  });
  return response.data;
}

export async function updateAdminOrderStatus(
  orderId: string,
  status: Order['status'],
  token?: string | null,
  note?: string
): Promise<{ message: string; order: Order; userId: number }> {
  const response = await apiClient.patch(
    `/admin/orders/${orderId}/status`,
    { status, note },
    {
      headers: authHeader(token),
    }
  );
  return response.data;
}

export async function fetchAdminDashboard(token?: string | null): Promise<AdminDashboard> {
  const response = await apiClient.get('/admin/dashboard', {
    headers: authHeader(token),
  });
  return response.data;
}
