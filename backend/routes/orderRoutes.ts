import { v4 as uuidv4 } from 'uuid';
import type { Request, Response } from 'express';
import type { RouteDeps } from './types';
import { persistState } from '../persistence';
import { createPaymentAuditEvent, recordPaymentAuditEvent } from '../paymentAudit';
import {
  FULFILLMENT_STATUS,
  FULFILLMENT_STATUS_OPTIONS,
  ORDER_STATUS,
  ORDER_STATUS_OPTIONS,
  normalizeFulfillmentStatus,
  normalizeOrderRecord,
  normalizeOrderStatus,
  type FulfillmentStatus,
} from '../orderStatus';
import type {
  AddCartBody,
  CheckoutBody,
  CreatePaymentIntentBody,
  ConfirmPaymentIntentBody,
  GameVariant,
  IdParam,
  Order,
  OrderIdParam,
  PayBody,
  TypedAuthenticatedRequest,
  UpdateCartBody,
} from '../../types/backend';

type TypedRequest<
  TBody = unknown,
  TParams extends object = Record<string, string>
> = Request & { body: TBody; params: TParams };
type TypedAuthRequest<
  TBody = unknown,
  TParams extends object = Record<string, string>
> = TypedAuthenticatedRequest<TBody, TParams>;

function pushOrderStatus(order: Order, status: Order['status'], note?: string) {
  const normalizedStatus = normalizeOrderStatus(status);
  order.status = normalizedStatus;
  order.statusHistory.push({ status: normalizedStatus, at: new Date().toISOString(), note });
}

function getStripeErrorMessage(error: any) {
  return String(error?.message || error?.raw?.message || error?.type || '');
}

function isExpectedStripeDemoFallback(error: any) {
  const message = getStripeErrorMessage(error);
  const rawCode = String(error?.code || error?.raw?.code || error?.detail?.code || error?.raw?.detail?.code || '');
  return (
    error?.type === 'StripeConnectionError' ||
    rawCode === 'EACCES' ||
    /connection to Stripe|network|timeout|ECONNRESET|ECONNREFUSED|EACCES/i.test(message)
  );
}

function sendStripeDemoFallback(res: Response, error: any) {
  console.warn('[payments] Stripe test payment unavailable; Demo quick pay fallback remains available.', {
    type: error?.type,
    code: error?.code || error?.raw?.code || error?.detail?.code || error?.raw?.detail?.code,
  });
  return res.status(503).json({
    error: {
      code: 'STRIPE_TEMPORARILY_UNAVAILABLE',
      message: '信用卡付款暫時無法使用，你可以先用快速付款完成這筆訂單。',
    },
  });
}

function findVariant(game: { variants?: GameVariant[] }, variantId?: string) {
  if (!game.variants || game.variants.length === 0) return null;
  if (!variantId) return game.variants[0] || null;
  return game.variants.find((variant) => variant.id === variantId) || null;
}

function restockOrderItems(order: Order, games: RouteDeps['state']['games']) {
  if (order.stockRestored) return;

  order.items.forEach((item) => {
    const game = games.find((g) => g.id === item.id);
    if (!game?.variants || game.variants.length === 0) return;
    const variant = game.variants.find((v) => v.id === item.variantId);
    if (!variant) return;
    variant.stock += item.quantity;
  });

  order.stockRestored = true;
}

function findOrderAcrossUsers(orders: RouteDeps['state']['orders'], orderId: string) {
  for (const [userId, userOrders] of Object.entries(orders)) {
    const order = (userOrders || []).find((item) => item.id === orderId);
    if (order) {
      return { userId: Number(userId), order: normalizeOrderRecord(order) };
    }
  }
  return null;
}

function normalizeOrdersForAdmin(orders: RouteDeps['state']['orders']) {
  return Object.entries(orders).flatMap(([userId, userOrders]) => {
    if (!Array.isArray(userOrders)) return [];
    return userOrders
      .filter((order) => order && typeof order === 'object' && typeof order.id === 'string')
      .map((order) => ({ ...normalizeOrderRecord(order), userId: Number(userId) }));
  });
}

function getOrderAmountInCents(order: Order) {
  const total = Number(order.total || 0);
  return Math.round(total * 100);
}

function getCartSubtotal(items: Order['items']) {
  return items.reduce((sum, item) => {
    const price = parseFloat((item.price || '0').replace('$', ''));
    return sum + (isNaN(price) ? 0 : price * item.quantity);
  }, 0);
}

function getShippingFee(subtotal: number) {
  return subtotal >= 60 ? 0 : 5;
}

function markOrderPaidFromStripe(order: Order, paymentIntentId: string, note: string) {
  normalizeOrderRecord(order);
  if (
    ([ORDER_STATUS.CANCELLED, ORDER_STATUS.REFUNDED] as Array<Order['status']>).includes(
      order.status
    )
  ) {
    return false;
  }

  if (!order.paymentDetails) {
    order.paymentDetails = {
      transactionId: paymentIntentId,
      paidAt: new Date().toISOString(),
    };
  }
  if (!order.fulfillmentStatus) {
    order.fulfillmentStatus = FULFILLMENT_STATUS.PENDING_SHIPMENT;
  }
  if (order.status !== ORDER_STATUS.PAID) {
    pushOrderStatus(order, ORDER_STATUS.PAID, note);
  }
  return true;
}

export function applyStripePaymentIntentEvent({
  eventType,
  paymentIntent,
  orders,
}: {
  eventType: 'payment_intent.succeeded' | 'payment_intent.payment_failed';
  paymentIntent: {
    id: string;
    metadata?: { orderId?: string; userId?: string };
  };
  orders: RouteDeps['state']['orders'];
}) {
  const orderId = paymentIntent.metadata?.orderId;
  if (!orderId) {
    return {
      changed: false,
      reason: 'missing-order-id' as const,
      auditEvent: createPaymentAuditEvent({
        source: 'stripe-webhook',
        providerPaymentId: paymentIntent.id,
        orderId: null,
        userId: paymentIntent.metadata?.userId,
        status: 'ignored',
        reason: 'missing-order-id',
      }),
    };
  }

  const metadataUserId = Number(paymentIntent.metadata?.userId);
  let found: { userId: number; order: Order } | null = null;
  if (metadataUserId && Array.isArray(orders[metadataUserId])) {
    const order = orders[metadataUserId].find((item) => item.id === orderId);
    if (order) {
      found = { userId: metadataUserId, order };
    }
  }
  if (!found) {
    found = findOrderAcrossUsers(orders, orderId);
  }

  if (!found) {
    return {
      changed: false,
      reason: 'order-not-found' as const,
      auditEvent: createPaymentAuditEvent({
        source: 'stripe-webhook',
        providerPaymentId: paymentIntent.id,
        orderId,
        userId: paymentIntent.metadata?.userId,
        status: 'ignored',
        reason: 'order-not-found',
      }),
    };
  }

  const { order, userId } = found;
  if (eventType === 'payment_intent.succeeded') {
    normalizeOrderRecord(order);
    if (
      ([ORDER_STATUS.CANCELLED, ORDER_STATUS.REFUNDED] as Array<Order['status']>).includes(order.status) ||
      order.status === ORDER_STATUS.PAID
    ) {
      return {
        changed: false,
        reason: 'order-not-payable' as const,
        order,
        auditEvent: createPaymentAuditEvent({
          source: 'stripe-webhook',
          providerPaymentId: paymentIntent.id,
          orderId,
          userId,
          status: 'ignored',
          reason: 'order-not-payable',
        }),
      };
    }

    const changed = markOrderPaidFromStripe(order, paymentIntent.id, 'Stripe webhook: payment_intent.succeeded');
    return {
      changed,
      reason: 'marked-paid' as const,
      order,
      auditEvent: createPaymentAuditEvent({
        source: 'stripe-webhook',
        providerPaymentId: paymentIntent.id,
        orderId,
        userId,
        status: changed ? 'succeeded' : 'ignored',
        reason: 'marked-paid',
      }),
    };
  }

  if (normalizeOrderStatus(order.status) === ORDER_STATUS.PENDING) {
    pushOrderStatus(order, ORDER_STATUS.PAYMENT_FAILED, 'Stripe webhook: payment_intent.payment_failed');
    return {
      changed: true,
      reason: 'marked-payment-failed' as const,
      order,
      auditEvent: createPaymentAuditEvent({
        source: 'stripe-webhook',
        providerPaymentId: paymentIntent.id,
        orderId,
        userId,
        status: 'failed',
        reason: 'marked-payment-failed',
      }),
    };
  }

  return {
    changed: false,
    reason: 'order-not-pending' as const,
    order,
    auditEvent: createPaymentAuditEvent({
      source: 'stripe-webhook',
      providerPaymentId: paymentIntent.id,
      orderId,
      userId,
      status: 'ignored',
      reason: 'order-not-pending',
    }),
  };
}

export function applyDemoQuickPayEvent({
  order,
  userId,
  simulateFailure = false,
  transactionId = `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
}: {
  order: Order;
  userId: number;
  simulateFailure?: boolean;
  transactionId?: string;
}) {
  normalizeOrderRecord(order);
  if (order.status === ORDER_STATUS.PAID) {
    return {
      changed: false,
      reason: 'already-paid' as const,
      statusCode: 400,
      message: '訂單已付款，無法重複支付',
      auditEvent: createPaymentAuditEvent({
        source: 'demo-quick-pay',
        providerPaymentId: order.paymentDetails?.transactionId || null,
        orderId: order.id,
        userId,
        status: 'ignored',
        reason: 'already-paid',
      }),
    };
  }
  if (order.status === ORDER_STATUS.CANCELLED || order.status === ORDER_STATUS.REFUNDED) {
    return {
      changed: false,
      reason: 'order-not-payable' as const,
      statusCode: 400,
      message: '目前訂單狀態不可付款',
      auditEvent: createPaymentAuditEvent({
        source: 'demo-quick-pay',
        providerPaymentId: null,
        orderId: order.id,
        userId,
        status: 'ignored',
        reason: 'order-not-payable',
      }),
    };
  }

  if (simulateFailure) {
    pushOrderStatus(order, ORDER_STATUS.PAYMENT_FAILED, '支付通道回傳失敗');
    return {
      changed: true,
      reason: 'demo-payment-failed' as const,
      statusCode: 400,
      message: '支付失敗，請重試',
      auditEvent: createPaymentAuditEvent({
        source: 'demo-quick-pay',
        providerPaymentId: null,
        orderId: order.id,
        userId,
        status: 'failed',
        reason: 'demo-payment-failed',
      }),
    };
  }

  order.paymentDetails = {
    transactionId,
    paidAt: new Date().toISOString(),
  };
  if (!order.fulfillmentStatus) {
    order.fulfillmentStatus = FULFILLMENT_STATUS.PENDING_SHIPMENT;
  }
  pushOrderStatus(order, ORDER_STATUS.PAID, '支付成功');
  return {
    changed: true,
    reason: 'demo-paid' as const,
    statusCode: 200,
    message: '支付成功',
    auditEvent: createPaymentAuditEvent({
      source: 'demo-quick-pay',
      providerPaymentId: transactionId,
      orderId: order.id,
      userId,
      status: 'succeeded',
      reason: 'demo-paid',
    }),
  };
}

export function registerOrderRoutes({ app, state, authenticate, isAdmin, stripeClient }: RouteDeps) {
  const { carts, orders, games } = state;
  const hasStripeSecret = Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_dummy'
  );

  app.get('/cart', authenticate, (req: TypedAuthRequest, res: Response) => {
    return res.json(carts[req.user.id] || []);
  });

  app.post('/cart', authenticate, (req: TypedAuthRequest<AddCartBody>, res: Response) => {
    const userId = req.user.id;
    const { id, variantId } = req.body;
    const game = games.find((g) => g.id === id);
    if (!game || game.isActive === false) {
      return res.status(404).json({ message: '找不到這項商品' });
    }

    const selectedVariant = findVariant(game, variantId);
    if (game.variants?.length && !selectedVariant) {
      return res.status(400).json({ message: '無效的版本選擇' });
    }

    if (!carts[userId]) {
      carts[userId] = [];
    }

    const cartItem = carts[userId].find((item) => item.id === id && item.variantId === selectedVariant?.id);
    const nextQuantity = (cartItem?.quantity || 0) + 1;
    if (selectedVariant && nextQuantity > selectedVariant.stock) {
      return res.status(400).json({ message: '庫存不足，無法加入更多商品' });
    }

    if (cartItem) {
      cartItem.quantity += 1;
    } else {
      carts[userId].push({
        ...game,
        price: selectedVariant?.price || game.price,
        quantity: 1,
        variantId: selectedVariant?.id,
        variantName: selectedVariant?.name,
      });
    }

    persistState(state);
    return res.status(201).json({ message: '已加入購物車', cart: carts[userId] });
  });

  app.patch('/cart/:id', authenticate, (req: TypedAuthRequest<UpdateCartBody, IdParam>, res: Response) => {
    const userId = req.user.id;
    const itemId = parseInt(req.params.id, 10);
    const { quantity, variantId } = req.body;
    const cart = carts[userId];

    if (!cart) {
      return res.status(404).json({ message: '購物車不存在' });
    }

    const item = cart.find((i) => i.id === itemId && (!variantId || i.variantId === variantId));
    if (!item) {
      return res.status(404).json({ message: '商品未找到' });
    }

    if (quantity <= 0) {
      carts[userId] = cart.filter((i) => !(i.id === itemId && i.variantId === item.variantId));
      persistState(state);
      return res.status(200).json({ message: '購物車已更新', cart: carts[userId] });
    }

    const game = games.find((g) => g.id === item.id);
    const selectedVariant = game?.variants?.find((variant) => variant.id === item.variantId);
    if (selectedVariant && quantity > selectedVariant.stock) {
      return res.status(400).json({ message: '庫存不足，無法更新為此數量' });
    }

    item.quantity = quantity;
    persistState(state);
    return res.status(200).json({ message: '購物車已更新', cart: carts[userId] });
  });

  app.delete('/cart/:id', authenticate, (req: TypedAuthRequest<unknown, IdParam>, res: Response) => {
    const userId = req.user.id;
    const itemId = parseInt(req.params.id, 10);
    const query = req.query as { variantId?: string };
    const variantId = typeof query.variantId === 'string' ? query.variantId : undefined;
    const cart = carts[userId];
    if (!cart) {
      return res.status(404).json({ message: '購物車不存在' });
    }

    carts[userId] = cart.filter((item) => !(item.id === itemId && (!variantId || item.variantId === variantId)));
    persistState(state);
    return res.status(200).json({ message: '商品已移除', cart: carts[userId] });
  });

  app.get('/orders', authenticate, (req: TypedAuthRequest, res: Response) => {
    const userId = req.user.id;
    if (!orders[userId]) {
      orders[userId] = [];
    }
    return res.status(200).json(orders[userId].map((order) => normalizeOrderRecord(order)));
  });

  app.get('/orders/:orderId', authenticate, (req: TypedAuthRequest<unknown, OrderIdParam>, res: Response) => {
    const userId = req.user.id;
    const order = (orders[userId] || []).find((item) => item.id === req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: '訂單未找到' });
    }
    return res.status(200).json(normalizeOrderRecord(order));
  });

  app.get('/admin/orders', authenticate, isAdmin, (req: TypedAuthRequest, res: Response) => {
    const allOrders = normalizeOrdersForAdmin(orders);
    return res.status(200).json(allOrders);
  });

  app.get('/admin/dashboard', authenticate, isAdmin, (req: TypedAuthRequest, res: Response) => {
    const allOrders = normalizeOrdersForAdmin(orders).map(({ userId, ...order }) => order);
    const totalOrders = allOrders.length;
    const paidOrders = allOrders.filter((order) => order?.status === ORDER_STATUS.PAID).length;
    const refundedOrders = allOrders.filter((order) => order?.status === ORDER_STATUS.REFUNDED).length;
    const cancelledOrders = allOrders.filter((order) => order?.status === ORDER_STATUS.CANCELLED).length;
    const pendingOrders = allOrders.filter((order) => order?.status === ORDER_STATUS.PENDING).length;
    const totalRevenue = allOrders
      .filter((order) => order?.status === ORDER_STATUS.PAID)
      .reduce((sum, order) => sum + (Number(order?.total) || 0), 0);
    const totalItemsSold = allOrders
      .filter((order) => order?.status === ORDER_STATUS.PAID)
      .reduce(
        (sum, order) =>
          sum +
          (Array.isArray(order?.items)
            ? order.items.reduce((itemSum, item) => itemSum + (item?.quantity || 0), 0)
            : 0),
        0
      );
    const lowStockGames = games
      .filter((game) => game.isActive !== false)
      .map((game) => ({
        id: game.id,
        name: game.name,
        variants: (game.variants || []).filter((variant) => variant.stock <= 5),
      }))
      .filter((game) => game.variants.length > 0);

    return res.status(200).json({
      totalOrders,
      paidOrders,
      refundedOrders,
      cancelledOrders,
      pendingOrders,
      totalRevenue,
      totalItemsSold,
      lowStockGames,
    });
  });

  app.patch(
    '/admin/orders/:orderId/status',
    authenticate,
    isAdmin,
    (req: TypedAuthRequest<{ status: Order['status']; note?: string }, OrderIdParam>, res: Response) => {
      const found = findOrderAcrossUsers(orders, req.params.orderId);
      if (!found) {
        return res.status(404).json({ message: '訂單未找到' });
      }

      const { order } = found;
      const { note } = req.body;
      const status = normalizeOrderStatus(req.body.status);
      const allowedStatus: Array<Order['status']> = [...ORDER_STATUS_OPTIONS];
      if (!allowedStatus.includes(status)) {
        return res.status(400).json({ message: '無效的訂單狀態' });
      }

      if ((status === ORDER_STATUS.CANCELLED || status === ORDER_STATUS.REFUNDED) && !order.stockRestored) {
        restockOrderItems(order, games);
      }

      if (status === ORDER_STATUS.PAID && !order.paymentDetails) {
        order.paymentDetails = {
          transactionId: `ADMIN-${Date.now()}`,
          paidAt: new Date().toISOString(),
        };
        if (!order.fulfillmentStatus) {
          order.fulfillmentStatus = FULFILLMENT_STATUS.PENDING_SHIPMENT;
        }
      }

      pushOrderStatus(order, status, note || '管理員手動更新');
      persistState(state);
      return res.status(200).json({ message: '訂單狀態已更新', order, userId: found.userId });
    }
  );

  app.patch(
    '/admin/orders/:orderId/fulfillment-status',
    authenticate,
    isAdmin,
    (
      req: TypedAuthRequest<{ fulfillmentStatus: FulfillmentStatus; note?: string }, OrderIdParam>,
      res: Response
    ) => {
      const found = findOrderAcrossUsers(orders, req.params.orderId);
      if (!found) {
        return res.status(404).json({ message: '訂單未找到' });
      }

      const { order } = found;
      const fulfillmentStatus = normalizeFulfillmentStatus(req.body.fulfillmentStatus);
      const allowedFulfillmentStatus: FulfillmentStatus[] = [...FULFILLMENT_STATUS_OPTIONS];
      if (!allowedFulfillmentStatus.includes(fulfillmentStatus)) {
        return res.status(400).json({ message: '無效的出貨狀態' });
      }

      if (order.status !== ORDER_STATUS.PAID && fulfillmentStatus !== FULFILLMENT_STATUS.PENDING_SHIPMENT) {
        return res.status(400).json({ message: '僅已付款訂單可更新為已出貨或已送達' });
      }

      order.fulfillmentStatus = fulfillmentStatus;
      if (!order.shippingDetails) {
        order.shippingDetails = {};
      }
      if (fulfillmentStatus === FULFILLMENT_STATUS.SHIPPED) {
        order.shippingDetails.shippedAt = order.shippingDetails.shippedAt || new Date().toISOString();
      }
      if (fulfillmentStatus === FULFILLMENT_STATUS.DELIVERED) {
        order.shippingDetails.shippedAt = order.shippingDetails.shippedAt || new Date().toISOString();
        order.shippingDetails.deliveredAt = new Date().toISOString();
      }
      persistState(state);
      return res.status(200).json({ message: '出貨狀態已更新', order, userId: found.userId });
    }
  );

  app.patch(
    '/admin/orders/:orderId/shipping-details',
    authenticate,
    isAdmin,
    (
      req: TypedAuthRequest<{ carrier?: string; trackingNumber?: string }, OrderIdParam>,
      res: Response
    ) => {
      const found = findOrderAcrossUsers(orders, req.params.orderId);
      if (!found) {
        return res.status(404).json({ message: '訂單未找到' });
      }

      const { order } = found;
      const carrier = (req.body?.carrier || '').trim();
      const trackingNumber = (req.body?.trackingNumber || '').trim();

      order.shippingDetails = {
        ...(order.shippingDetails || {}),
        carrier: carrier || undefined,
        trackingNumber: trackingNumber || undefined,
      };
      persistState(state);
      return res.status(200).json({ message: '物流資訊已更新', order, userId: found.userId });
    }
  );

  app.post('/orders/:orderId/cancel', authenticate, (req: TypedAuthRequest<unknown, OrderIdParam>, res: Response) => {
    const userId = req.user.id;
    const order = (orders[userId] || []).find((item) => item.id === req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: '訂單未找到' });
    }
    normalizeOrderRecord(order);
    if (
      !([ORDER_STATUS.PENDING, ORDER_STATUS.PAYMENT_FAILED] as Array<Order['status']>).includes(
        order.status
      )
    ) {
      return res.status(400).json({ message: '目前狀態不可取消訂單' });
    }

    restockOrderItems(order, games);
    pushOrderStatus(order, ORDER_STATUS.CANCELLED, '使用者取消訂單');
    persistState(state);
    return res.status(200).json({ message: '訂單已取消', order });
  });

  app.post('/orders/:orderId/reorder', authenticate, (req: TypedAuthRequest<unknown, OrderIdParam>, res: Response) => {
    const userId = req.user.id;
    const sourceOrder = (orders[userId] || []).find((item) => item.id === req.params.orderId);
    if (!sourceOrder) {
      return res.status(404).json({ message: '訂單未找到' });
    }
    if (!sourceOrder.items?.length) {
      return res.status(400).json({ message: '此訂單無可重購商品' });
    }

    if (!carts[userId]) {
      carts[userId] = [];
    }

    const skipped: Array<{ id: number; name: string; reason: string }> = [];
    let addedCount = 0;

    for (const item of sourceOrder.items) {
      const game = games.find((g) => g.id === item.id);
      if (!game || game.isActive === false) {
        skipped.push({ id: item.id, name: item.name || '未知商品', reason: '商品已下架或不存在' });
        continue;
      }

      const variant = game.variants?.find((v) => v.id === item.variantId);
      const currentInCart = carts[userId].find((c) => c.id === item.id && c.variantId === item.variantId);
      const existingQty = currentInCart?.quantity || 0;
      const desiredQty = existingQty + (item.quantity || 1);

      if (variant && desiredQty > variant.stock) {
        skipped.push({ id: item.id, name: game.name, reason: '庫存不足' });
        continue;
      }

      if (currentInCart) {
        currentInCart.quantity = desiredQty;
      } else {
        carts[userId].push({
          ...game,
          price: variant?.price || game.price,
          quantity: item.quantity || 1,
          variantId: variant?.id || item.variantId,
          variantName: variant?.name || item.variantName,
        });
      }

      addedCount += 1;
    }

    if (addedCount === 0) {
      return res.status(400).json({ message: '無可加入購物車的商品', skipped });
    }

    persistState(state);
    return res.status(200).json({
      message: skipped.length > 0 ? '部分商品已加入購物車' : '已將商品加入購物車',
      cart: carts[userId],
      addedCount,
      skipped,
    });
  });

  app.post('/orders/:orderId/retry-payment', authenticate, (req: TypedAuthRequest<unknown, OrderIdParam>, res: Response) => {
    const userId = req.user.id;
    const order = (orders[userId] || []).find((item) => item.id === req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: '訂單未找到' });
    }
    normalizeOrderRecord(order);
    if (order.status !== ORDER_STATUS.PAYMENT_FAILED) {
      return res.status(400).json({ message: '只有付款失敗訂單可重試付款' });
    }

    pushOrderStatus(order, ORDER_STATUS.PENDING, '重新嘗試付款');
    persistState(state);
    return res.status(200).json({ message: '訂單已切換為待付款，可重新付款', order });
  });

  app.post('/orders/:orderId/refund', authenticate, (req: TypedAuthRequest<unknown, OrderIdParam>, res: Response) => {
    const userId = req.user.id;
    const order = (orders[userId] || []).find((item) => item.id === req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: '訂單未找到' });
    }
    normalizeOrderRecord(order);
    if (order.status !== ORDER_STATUS.PAID) {
      return res.status(400).json({ message: '僅已付款訂單可退款' });
    }

    restockOrderItems(order, games);
    pushOrderStatus(order, ORDER_STATUS.REFUNDED, '使用者申請退款');
    persistState(state);
    return res.status(200).json({ message: '退款完成', order });
  });

  app.post('/checkout', authenticate, async (req: TypedAuthRequest<CheckoutBody>, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: '未授權的請求' });
      }

      const userCart = carts[userId];
      if (!userCart || userCart.length === 0) {
        return res.status(400).json({ message: '購物車為空，無法結帳' });
      }
      if (!orders[userId]) {
        orders[userId] = [];
      }

      for (const item of userCart) {
        const game = games.find((g) => g.id === item.id);
        const variant = game?.variants?.find((v) => v.id === item.variantId);
        if (variant && variant.stock < item.quantity) {
          return res.status(400).json({ message: `${game?.name || '商品'} 庫存不足` });
        }
      }

      for (const item of userCart) {
        const game = games.find((g) => g.id === item.id);
        const variant = game?.variants?.find((v) => v.id === item.variantId);
        if (variant) {
          variant.stock -= item.quantity;
        }
      }

      const customerInfo = {
        fullName: req.body?.fullName?.trim() || undefined,
        phone: req.body?.phone?.trim() || undefined,
        contactEmail: req.body?.contactEmail?.trim() || undefined,
        shippingAddress: req.body?.shippingAddress?.trim() || undefined,
        orderNote: req.body?.orderNote?.trim() || undefined,
        paymentMethod: req.body?.paymentMethod || undefined,
      };

      const subtotal = getCartSubtotal(userCart);
      const newOrder: Order = {
        id: uuidv4(),
        items: [...userCart],
        total: subtotal + getShippingFee(subtotal),
        date: new Date().toISOString(),
        status: ORDER_STATUS.PENDING,
        statusHistory: [
          {
            status: ORDER_STATUS.PENDING,
            at: new Date().toISOString(),
            note: '訂單建立',
          },
        ],
        stockRestored: false,
        customerInfo,
        fulfillmentStatus: FULFILLMENT_STATUS.PENDING_SHIPMENT,
      };

      orders[userId].push(newOrder);
      carts[userId] = [];
      persistState(state);
      return res.status(200).json({ message: '結帳成功！', order: newOrder });
    } catch (error) {
      console.error('結帳錯誤:', error);
      return res.status(500).json({ message: '目前無法完成操作，請稍後再試。' });
    }
  });

  app.post('/pay', authenticate, (req: TypedAuthRequest<PayBody>, res: Response) => {
    const userId = req.user.id;
    const { orderId, simulateFailure } = req.body;
    const order = orders[userId]?.find((o) => o.id === orderId);
    if (!order) {
      return res.status(404).json({ message: '訂單未找到' });
    }

    const result = applyDemoQuickPayEvent({ order, userId, simulateFailure });
    if (result.changed) {
      recordPaymentAuditEvent(result.auditEvent);
      persistState(state);
    }

    return res.status(result.statusCode).json({ message: result.message, order });
  });

  app.get('/transactions', authenticate, (req: TypedAuthRequest, res: Response) => {
    const userId = req.user.id;
    const transactions = (orders[userId] || [])
      .filter((order) => order.paymentDetails)
      .map((order) => ({
        orderId: order.id,
        transactionId: order.paymentDetails?.transactionId,
        paidAt: order.paymentDetails?.paidAt,
        total: order.total,
      }));
    return res.status(200).json(transactions);
  });

  app.post('/stripe/webhook', (req: Request, res: Response) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return res.status(500).json({ message: '目前無法確認付款狀態，請稍後再試。' });
    }

    const signature = req.headers['stripe-signature'];
    if (!signature || Array.isArray(signature)) {
      return res.status(400).json({ message: '付款資料不完整，請重新付款。' });
    }

    let event;
    try {
      event = stripeClient.webhooks.constructEvent(req.body, signature, webhookSecret);
    } catch (error: any) {
      console.error('Stripe webhook 驗證失敗:', error?.message || error);
      return res.status(400).json({ message: '付款資料驗證未通過，請重新付款。' });
    }

    if (event.type === 'payment_intent.succeeded' || event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as {
        id: string;
        metadata?: { orderId?: string; userId?: string };
      };
      const result = applyStripePaymentIntentEvent({
        eventType: event.type,
        paymentIntent: intent,
        orders,
      });

      if (result.changed) {
        recordPaymentAuditEvent(result.auditEvent);
        persistState(state);
      }
    }

    return res.json({ received: true });
  });

  app.post('/create-payment-intent', authenticate, async (req: TypedAuthRequest<CreatePaymentIntentBody>, res: Response) => {
    try {
      if (!hasStripeSecret) {
        return res.status(503).json({
          error: {
            code: 'STRIPE_NOT_CONFIGURED',
            message: '信用卡付款暫時無法使用，你可以先用快速付款完成這筆訂單。',
          },
        });
      }

      const userId = req.user.id;
      const { orderId } = req.body;
      if (!orderId) {
        return res.status(400).json({ error: '缺少 orderId' });
      }

      const order = (orders[userId] || []).find((item) => item.id === orderId);
      if (!order) {
        return res.status(404).json({ error: '訂單未找到' });
      }
      normalizeOrderRecord(order);
      if (order.status !== ORDER_STATUS.PENDING) {
        return res.status(400).json({ error: '只有未付款訂單可建立付款流程' });
      }

      const amount = getOrderAmountInCents(order);
      if (amount < 50) {
        return res.status(400).json({ error: '金額不可低於 $0.50 USD' });
      }

      const paymentIntent = await stripeClient.paymentIntents.create({
        amount,
        currency: 'usd',
        automatic_payment_methods: { enabled: true },
        metadata: {
          orderId: order.id,
          userId: String(userId),
        },
      });
      return res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
    } catch (error: any) {
      if (isExpectedStripeDemoFallback(error)) {
        return sendStripeDemoFallback(res, error);
      }
      console.error('建立信用卡付款流程失敗:', getStripeErrorMessage(error));
      return res.status(500).json({
        error: {
          code: 'PAYMENT_INTENT_FAILED',
          message: '信用卡付款暫時無法使用，你可以先用快速付款完成這筆訂單。',
        },
      });
    }
  });

  app.post('/confirm-payment-intent', authenticate, async (req: TypedAuthRequest<ConfirmPaymentIntentBody>, res: Response) => {
    try {
      if (!hasStripeSecret) {
        return res.status(503).json({
          error: {
            code: 'STRIPE_NOT_CONFIGURED',
            message: '信用卡付款暫時無法確認，請稍後再試。',
          },
        });
      }

      const userId = req.user.id;
      const { orderId, paymentIntentId } = req.body;
      if (!orderId || !paymentIntentId) {
        return res.status(400).json({ error: '缺少 orderId 或 paymentIntentId' });
      }

      const order = (orders[userId] || []).find((item) => item.id === orderId);
      if (!order) {
        return res.status(404).json({ error: '訂單未找到' });
      }

      const paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId);
      if (paymentIntent.metadata?.orderId !== orderId || paymentIntent.metadata?.userId !== String(userId)) {
        return res.status(403).json({ error: '付款資訊與訂單不符' });
      }
      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({ error: '付款尚未成功，請再試一次。' });
      }

      markOrderPaidFromStripe(order, paymentIntent.id, 'Stripe confirm API: payment_intent.succeeded');
      persistState(state);
      return res.status(200).json({ message: '付款已確認', order });
    } catch (error: any) {
      if (isExpectedStripeDemoFallback(error)) {
        return sendStripeDemoFallback(res, error);
      }
      console.error('信用卡付款確認失敗:', getStripeErrorMessage(error));
      return res.status(500).json({
        error: {
          code: 'PAYMENT_CONFIRM_FAILED',
          message: '付款還沒完成，請再試一次，或先用快速付款完成這筆訂單。',
        },
      });
    }
  });
}
