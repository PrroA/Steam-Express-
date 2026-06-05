import { createPaymentAuditEvent } from '../backend/paymentAudit';

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
});
