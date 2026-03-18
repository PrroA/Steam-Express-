import { apiClient, authHeader } from './apiClient';
import type { CartItem, Order } from '../types/domain';

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId?: string;
}

export interface Transaction {
  orderId: string;
  transactionId: string;
  paidAt: string;
  total: number;
}

export interface ReorderResponse {
  message: string;
  cart: CartItem[];
  addedCount: number;
  skipped: Array<{ id: number; name: string; reason: string }>;
}

export async function fetchOrders(token?: string | null): Promise<Order[]> {
  const response = await apiClient.get('/orders', {
    headers: authHeader(token),
  });
  return response.data;
}

export async function fetchOrderById(
  orderId: string,
  token?: string | null
): Promise<Order> {
  const response = await apiClient.get(`/orders/${orderId}`, {
    headers: authHeader(token),
  });
  return response.data;
}

export async function createPaymentIntent(
  orderId: string,
  token?: string | null
): Promise<PaymentIntentResponse> {
  const response = await apiClient.post(
    '/create-payment-intent',
    { orderId },
    {
      headers: authHeader(token),
    }
  );
  return response.data;
}

export async function payOrder(
  orderId: string,
  token?: string | null,
  simulateFailure?: boolean
): Promise<{ message: string; order: Order }> {
  const response = await apiClient.post(
    '/pay',
    { orderId, simulateFailure },
    {
      headers: authHeader(token),
    }
  );
  return response.data;
}

export async function cancelOrder(
  orderId: string,
  token?: string | null
): Promise<{ message: string; order: Order }> {
  const response = await apiClient.post(
    `/orders/${orderId}/cancel`,
    {},
    {
      headers: authHeader(token),
    }
  );
  return response.data;
}

export async function retryOrderPayment(
  orderId: string,
  token?: string | null
): Promise<{ message: string; order: Order }> {
  const response = await apiClient.post(
    `/orders/${orderId}/retry-payment`,
    {},
    {
      headers: authHeader(token),
    }
  );
  return response.data;
}

export async function reorderOrder(
  orderId: string,
  token?: string | null
): Promise<ReorderResponse> {
  const response = await apiClient.post(
    `/orders/${orderId}/reorder`,
    {},
    {
      headers: authHeader(token),
    }
  );
  return response.data;
}

export async function refundOrder(
  orderId: string,
  token?: string | null
): Promise<{ message: string; order: Order }> {
  const response = await apiClient.post(
    `/orders/${orderId}/refund`,
    {},
    {
      headers: authHeader(token),
    }
  );
  return response.data;
}

export async function fetchTransactions(token?: string | null): Promise<Transaction[]> {
  const response = await apiClient.get('/transactions', {
    headers: authHeader(token),
  });
  return response.data;
}
