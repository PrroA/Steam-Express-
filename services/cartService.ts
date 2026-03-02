import { apiClient, authHeader } from './apiClient';
import type { CartItem, Order } from '../types/domain';

export async function fetchCart(token?: string | null): Promise<CartItem[]> {
  const response = await apiClient.get('/cart', {
    headers: authHeader(token),
  });
  return response.data;
}

export async function addToCart(
  gameId: number,
  token?: string | null,
  variantId?: string
): Promise<{ message: string; cart: CartItem[] }> {
  const response = await apiClient.post(
    '/cart',
    { id: gameId, variantId },
    {
      headers: authHeader(token),
    }
  );
  return response.data;
}

export async function updateCartQuantity(
  id: number,
  quantity: number,
  token?: string | null
): Promise<{ message: string; cart: CartItem[] }> {
  const response = await apiClient.patch(
    `/cart/${id}`,
    { quantity },
    {
      headers: authHeader(token),
    }
  );
  return response.data;
}

export async function removeFromCart(
  id: number,
  token?: string | null
): Promise<{ message: string; cart: CartItem[] }> {
  const response = await apiClient.delete(`/cart/${id}`, {
    headers: authHeader(token),
  });
  return response.data;
}

export async function checkout(
  token?: string | null
): Promise<{ message: string; order: Order }> {
  const response = await apiClient.post(
    '/checkout',
    {},
    {
      headers: authHeader(token),
    }
  );
  return response.data;
}
