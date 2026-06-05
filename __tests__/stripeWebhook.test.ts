import type { Order } from '../types/backend';
import { applyStripePaymentIntentEvent } from '../backend/routes/orderRoutes';

function createOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    items: [],
    total: 59.99,
    date: '2026-06-06T00:00:00.000Z',
    status: 'pending',
    fulfillmentStatus: 'pending_shipment',
    statusHistory: [{ status: 'pending', at: '2026-06-06T00:00:00.000Z' }],
    ...overrides,
  };
}

describe('Stripe webhook payment intent handling', () => {
  test('marks pending order as paid on payment_intent.succeeded', () => {
    const order = createOrder();
    const orders = { 7: [order] };

    const result = applyStripePaymentIntentEvent({
      eventType: 'payment_intent.succeeded',
      paymentIntent: {
        id: 'pi_123',
        metadata: { orderId: order.id, userId: '7' },
      },
      orders,
    });

    expect(result.changed).toBe(true);
    expect(order.status).toBe('paid');
    expect(order.paymentDetails).toEqual(
      expect.objectContaining({
        transactionId: 'pi_123',
      })
    );
    expect(order.statusHistory.at(-1)).toEqual(
      expect.objectContaining({
        status: 'paid',
        note: 'Stripe webhook: payment_intent.succeeded',
      })
    );
    expect(result.auditEvent).toEqual(
      expect.objectContaining({
        provider: 'stripe',
        source: 'stripe-webhook',
        providerPaymentId: 'pi_123',
        orderId: order.id,
        userId: 7,
        status: 'succeeded',
      })
    );
  });

  test('marks pending order as payment failed on payment_intent.payment_failed', () => {
    const order = createOrder();

    const result = applyStripePaymentIntentEvent({
      eventType: 'payment_intent.payment_failed',
      paymentIntent: {
        id: 'pi_failed',
        metadata: { orderId: order.id, userId: '7' },
      },
      orders: { 7: [order] },
    });

    expect(result.changed).toBe(true);
    expect(order.status).toBe('payment_failed');
    expect(order.statusHistory.at(-1)).toEqual(
      expect.objectContaining({
        status: 'payment_failed',
        note: 'Stripe webhook: payment_intent.payment_failed',
      })
    );
    expect(result.auditEvent).toEqual(
      expect.objectContaining({
        providerPaymentId: 'pi_failed',
        status: 'failed',
        reason: 'marked-payment-failed',
      })
    );
  });

  test('does not overwrite cancelled or refunded orders', () => {
    const cancelled = createOrder({ id: 'cancelled-order', status: 'cancelled' });
    const refunded = createOrder({ id: 'refunded-order', status: 'refunded' });

    const cancelledResult = applyStripePaymentIntentEvent({
      eventType: 'payment_intent.succeeded',
      paymentIntent: {
        id: 'pi_cancelled',
        metadata: { orderId: cancelled.id, userId: '7' },
      },
      orders: { 7: [cancelled, refunded] },
    });
    const refundedResult = applyStripePaymentIntentEvent({
      eventType: 'payment_intent.succeeded',
      paymentIntent: {
        id: 'pi_refunded',
        metadata: { orderId: refunded.id, userId: '7' },
      },
      orders: { 7: [cancelled, refunded] },
    });

    expect(cancelledResult.changed).toBe(false);
    expect(refundedResult.changed).toBe(false);
    expect(cancelled.status).toBe('cancelled');
    expect(refunded.status).toBe('refunded');
  });

  test('can find an order even when user metadata is missing', () => {
    const order = createOrder();

    const result = applyStripePaymentIntentEvent({
      eventType: 'payment_intent.succeeded',
      paymentIntent: {
        id: 'pi_without_user',
        metadata: { orderId: order.id },
      },
      orders: { 9: [order] },
    });

    expect(result.changed).toBe(true);
    expect(order.status).toBe('paid');
  });
});
