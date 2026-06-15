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

type ServiceError = Error & { code?: string; status?: number };
type ApiErrorPayload = {
  error?: { code?: string };
  code?: string;
};
type ApiErrorLike = {
  response?: {
    status?: number;
    data?: ApiErrorPayload;
  };
};

function isApiErrorLike(error: unknown): error is ApiErrorLike {
  return Boolean(error && typeof error === 'object' && 'response' in error);
}

function buildUserFacingError(error: unknown, message: string): ServiceError {
  const response = isApiErrorLike(error) ? error.response : undefined;
  const payload = response?.data;
  const nextError = new Error(message) as ServiceError;
  nextError.code = payload?.error?.code || payload?.code;
  nextError.status = response?.status;
  return nextError;
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
  try {
    const response = await apiClient.post(
      '/create-payment-intent',
      { orderId },
      {
        headers: authHeader(token),
      }
    );
    return response.data;
  } catch (error) {
    throw buildUserFacingError(
      error,
      '信用卡付款暫時無法使用，你可以先用快速付款完成這筆訂單。'
    );
  }
}

export async function confirmPaymentIntent(
  orderId: string,
  paymentIntentId: string,
  token?: string | null
): Promise<{ message: string; order: Order }> {
  try {
    const response = await apiClient.post(
      '/confirm-payment-intent',
      { orderId, paymentIntentId },
      {
        headers: authHeader(token),
      }
    );
    return response.data;
  } catch (error) {
    throw buildUserFacingError(
      error,
      '付款還沒完成，請再試一次，或先用快速付款完成這筆訂單。'
    );
  }
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
