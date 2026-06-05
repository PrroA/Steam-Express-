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

export interface PaymentAuditStorage {
  save(event: PaymentAuditEvent): void;
  list?(limit: number): PaymentAuditEvent[];
  clear?(): void;
}

let storage: PaymentAuditStorage | null = null;

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

export function configurePaymentAuditStorage(nextStorage: PaymentAuditStorage | null) {
  storage = nextStorage;
}

export function recordPaymentAuditEvent(event: PaymentAuditEvent) {
  storage?.save(event);
  return event;
}

export function getPaymentAuditEvents(limit = 30) {
  return storage?.list?.(limit) || [];
}

export function getPaymentAuditEventsForTests(limit = 30) {
  if (process.env.NODE_ENV !== 'test') return [];
  return getPaymentAuditEvents(limit);
}

export function resetPaymentAuditForTests() {
  if (process.env.NODE_ENV === 'test') {
    storage?.clear?.();
  }
}
