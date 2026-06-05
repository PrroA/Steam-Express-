export type PaymentAuditSource = 'stripe-webhook' | 'stripe-confirm-api' | 'demo-quick-pay';
export type PaymentAuditStatus = 'succeeded' | 'failed' | 'ignored';

export interface PaymentAuditEvent {
  provider: 'stripe' | 'demo';
  source: PaymentAuditSource;
  providerPaymentId: string | null;
  orderId: string | null;
  userId: number | null;
  status: PaymentAuditStatus;
  reason: string;
  createdAt: string;
}

export function createPaymentAuditEvent(input: {
  provider?: 'stripe' | 'demo';
  source: PaymentAuditSource;
  providerPaymentId?: string | null;
  orderId?: string | null;
  userId?: number | string | null;
  status: PaymentAuditStatus;
  reason: string;
  createdAt?: string;
}): PaymentAuditEvent {
  const userId = Number(input.userId);

  return {
    provider: input.provider || (input.source === 'demo-quick-pay' ? 'demo' : 'stripe'),
    source: input.source,
    providerPaymentId: input.providerPaymentId || null,
    orderId: input.orderId || null,
    userId: Number.isFinite(userId) && userId > 0 ? userId : null,
    status: input.status,
    reason: input.reason,
    createdAt: input.createdAt || new Date().toISOString(),
  };
}
