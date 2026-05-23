export const ORDER_STATUS = {
  PENDING: 'pending',
  PAYMENT_FAILED: 'payment_failed',
  PAID: 'paid',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const FULFILLMENT_STATUS = {
  PENDING_SHIPMENT: 'pending_shipment',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
} as const;

export type FulfillmentStatus =
  (typeof FULFILLMENT_STATUS)[keyof typeof FULFILLMENT_STATUS];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [ORDER_STATUS.PENDING]: '待付款',
  [ORDER_STATUS.PAYMENT_FAILED]: '付款失敗',
  [ORDER_STATUS.PAID]: '已付款',
  [ORDER_STATUS.CANCELLED]: '已取消',
  [ORDER_STATUS.REFUNDED]: '已退款',
};

export const FULFILLMENT_STATUS_LABELS: Record<FulfillmentStatus, string> = {
  [FULFILLMENT_STATUS.PENDING_SHIPMENT]: '待出貨',
  [FULFILLMENT_STATUS.SHIPPED]: '已出貨',
  [FULFILLMENT_STATUS.DELIVERED]: '已送達',
};

export const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.PAYMENT_FAILED,
  ORDER_STATUS.PAID,
  ORDER_STATUS.CANCELLED,
  ORDER_STATUS.REFUNDED,
];

export const FULFILLMENT_STATUS_OPTIONS: FulfillmentStatus[] = [
  FULFILLMENT_STATUS.PENDING_SHIPMENT,
  FULFILLMENT_STATUS.SHIPPED,
  FULFILLMENT_STATUS.DELIVERED,
];

const LEGACY_ORDER_STATUS: Record<string, OrderStatus> = {
  pending: ORDER_STATUS.PENDING,
  payment_failed: ORDER_STATUS.PAYMENT_FAILED,
  paid: ORDER_STATUS.PAID,
  cancelled: ORDER_STATUS.CANCELLED,
  refunded: ORDER_STATUS.REFUNDED,
  '未付款': ORDER_STATUS.PENDING,
  '付款失敗': ORDER_STATUS.PAYMENT_FAILED,
  '已付款': ORDER_STATUS.PAID,
  '已取消': ORDER_STATUS.CANCELLED,
  '已退款': ORDER_STATUS.REFUNDED,
  '?芯?甈?': ORDER_STATUS.PENDING,
  '隞狡憭望?': ORDER_STATUS.PAYMENT_FAILED,
  '撌脖?甈?': ORDER_STATUS.PAID,
  '撌脣?瘨?': ORDER_STATUS.CANCELLED,
  '撌脤甈?': ORDER_STATUS.REFUNDED,
};

const LEGACY_FULFILLMENT_STATUS: Record<string, FulfillmentStatus> = {
  pending_shipment: FULFILLMENT_STATUS.PENDING_SHIPMENT,
  shipped: FULFILLMENT_STATUS.SHIPPED,
  delivered: FULFILLMENT_STATUS.DELIVERED,
  '待出貨': FULFILLMENT_STATUS.PENDING_SHIPMENT,
  '已出貨': FULFILLMENT_STATUS.SHIPPED,
  '已送達': FULFILLMENT_STATUS.DELIVERED,
  '敺鞎?': FULFILLMENT_STATUS.PENDING_SHIPMENT,
  '撌脣鞎?': FULFILLMENT_STATUS.SHIPPED,
  '撌脤?': FULFILLMENT_STATUS.DELIVERED,
};

export function normalizeOrderStatus(status?: string | null): OrderStatus {
  return LEGACY_ORDER_STATUS[String(status || '').trim()] || ORDER_STATUS.PENDING;
}

export function normalizeFulfillmentStatus(
  status?: string | null
): FulfillmentStatus {
  return (
    LEGACY_FULFILLMENT_STATUS[String(status || '').trim()] ||
    FULFILLMENT_STATUS.PENDING_SHIPMENT
  );
}

export function getOrderStatusLabel(status?: string | null) {
  return ORDER_STATUS_LABELS[normalizeOrderStatus(status)];
}

export function getFulfillmentStatusLabel(status?: string | null) {
  return FULFILLMENT_STATUS_LABELS[normalizeFulfillmentStatus(status)];
}

export function normalizeOrderRecord<T extends {
  status?: string;
  fulfillmentStatus?: string;
  statusHistory?: Array<{ status?: string }>;
}>(order: T): T & { status: OrderStatus; fulfillmentStatus?: FulfillmentStatus } {
  const normalized = order as T & {
    status: OrderStatus;
    fulfillmentStatus?: FulfillmentStatus;
  };
  normalized.status = normalizeOrderStatus(order.status);
  if (order.fulfillmentStatus) {
    normalized.fulfillmentStatus = normalizeFulfillmentStatus(order.fulfillmentStatus);
  }
  if (Array.isArray(order.statusHistory)) {
    order.statusHistory.forEach((event) => {
      event.status = normalizeOrderStatus(event.status);
    });
  }
  return normalized;
}
