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

export interface AiGameCopyDraft {
  shortDescription: string;
  sellingPoints: string[];
  seoTitle: string;
  source?: 'openai' | 'fallback';
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

export async function uploadAdminImage(
  file: File,
  token?: string | null
): Promise<{ message: string; imageUrl: string }> {
  const response = await fetch(`${apiClient.defaults.baseURL}/admin/upload-image`, {
    method: 'POST',
    headers: {
      ...(authHeader(token) || {}),
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || '圖片上傳失敗';
    throw new Error(message);
  }
  return payload;
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

export async function updateAdminFulfillmentStatus(
  orderId: string,
  fulfillmentStatus: Order['fulfillmentStatus'],
  token?: string | null,
  note?: string
): Promise<{ message: string; order: Order; userId: number }> {
  const response = await apiClient.patch(
    `/admin/orders/${orderId}/fulfillment-status`,
    { fulfillmentStatus, note },
    {
      headers: authHeader(token),
    }
  );
  return response.data;
}

export async function updateAdminShippingDetails(
  orderId: string,
  payload: { carrier?: string; trackingNumber?: string },
  token?: string | null
): Promise<{ message: string; order: Order; userId: number }> {
  const response = await apiClient.patch(
    `/admin/orders/${orderId}/shipping-details`,
    payload,
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

export async function generateAdminGameCopy(payload: {
  name: string;
  price?: string;
  description?: string;
}): Promise<AiGameCopyDraft> {
  const response = await fetch('/api/ai-admin-copy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || 'AI 文案生成失敗');
  }
  return {
    shortDescription: data?.shortDescription || '',
    sellingPoints: Array.isArray(data?.sellingPoints) ? data.sellingPoints : [],
    seoTitle: data?.seoTitle || '',
    source: data?.source || 'fallback',
  };
}
