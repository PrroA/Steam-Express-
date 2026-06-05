import { createPaymentAuditEvent } from '../backend/paymentAudit';
import type { Order } from '../types/backend';
import { applyDemoQuickPayEvent } from '../backend/routes/orderRoutes';

function createOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-demo',
    items: [],
    total: 19.99,
    date: '2026-06-06T00:00:00.000Z',
    status: 'pending',
    fulfillmentStatus: 'pending_shipment',
    statusHistory: [{ status: 'pending', at: '2026-06-06T00:00:00.000Z' }],
    ...overrides,
  };
}

describe('payment audit event builder', () => {
  test('normalizes Stripe payment audit data', () => {
    expect(
      createPaymentAuditEvent({
        source: 'stripe-webhook',
        providerPaymentId: 'pi_123',
        orderId: 'order-1',
        userId: '7',
        status: 'succeeded',
        reason: 'marked-paid',
        createdAt: '2026-06-06T00:00:00.000Z',
      })
    ).toEqual({
      provider: 'stripe',
      source: 'stripe-webhook',
      providerPaymentId: 'pi_123',
      orderId: 'order-1',
      userId: 7,
      status: 'succeeded',
      reason: 'marked-paid',
      createdAt: '2026-06-06T00:00:00.000Z',
    });
  });

  test('uses demo provider for quick pay audit events', () => {
    expect(
      createPaymentAuditEvent({
        source: 'demo-quick-pay',
        orderId: 'order-demo',
        userId: 3,
        status: 'succeeded',
        reason: 'demo-paid',
        createdAt: '2026-06-06T00:00:00.000Z',
      })
    ).toMatchObject({
      provider: 'demo',
      providerPaymentId: null,
      userId: 3,
    });
  });

  test('demo quick pay produces a succeeded audit event', () => {
    const order = createOrder();

    const result = applyDemoQuickPayEvent({
      order,
      userId: 7,
      transactionId: 'TXN-test',
    });

    expect(result.changed).toBe(true);
    expect(order.status).toBe('paid');
    expect(result.auditEvent).toEqual(
      expect.objectContaining({
        provider: 'demo',
        source: 'demo-quick-pay',
        providerPaymentId: 'TXN-test',
        orderId: order.id,
        userId: 7,
        status: 'succeeded',
        reason: 'demo-paid',
      })
    );
  });

  test('demo quick pay failure produces a failed audit event', () => {
    const order = createOrder();

    const result = applyDemoQuickPayEvent({
      order,
      userId: 7,
      simulateFailure: true,
    });

    expect(result.changed).toBe(true);
    expect(order.status).toBe('payment_failed');
    expect(result.auditEvent).toEqual(
      expect.objectContaining({
        provider: 'demo',
        status: 'failed',
        reason: 'demo-payment-failed',
      })
    );
  });
});
