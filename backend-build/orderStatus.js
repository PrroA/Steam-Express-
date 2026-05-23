"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FULFILLMENT_STATUS_OPTIONS = exports.ORDER_STATUS_OPTIONS = exports.FULFILLMENT_STATUS = exports.ORDER_STATUS = void 0;
exports.normalizeOrderStatus = normalizeOrderStatus;
exports.normalizeFulfillmentStatus = normalizeFulfillmentStatus;
exports.normalizeOrderRecord = normalizeOrderRecord;
exports.ORDER_STATUS = {
    PENDING: 'pending',
    PAYMENT_FAILED: 'payment_failed',
    PAID: 'paid',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded',
};
exports.FULFILLMENT_STATUS = {
    PENDING_SHIPMENT: 'pending_shipment',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
};
exports.ORDER_STATUS_OPTIONS = [
    exports.ORDER_STATUS.PENDING,
    exports.ORDER_STATUS.PAYMENT_FAILED,
    exports.ORDER_STATUS.PAID,
    exports.ORDER_STATUS.CANCELLED,
    exports.ORDER_STATUS.REFUNDED,
];
exports.FULFILLMENT_STATUS_OPTIONS = [
    exports.FULFILLMENT_STATUS.PENDING_SHIPMENT,
    exports.FULFILLMENT_STATUS.SHIPPED,
    exports.FULFILLMENT_STATUS.DELIVERED,
];
const LEGACY_ORDER_STATUS = {
    pending: exports.ORDER_STATUS.PENDING,
    payment_failed: exports.ORDER_STATUS.PAYMENT_FAILED,
    paid: exports.ORDER_STATUS.PAID,
    cancelled: exports.ORDER_STATUS.CANCELLED,
    refunded: exports.ORDER_STATUS.REFUNDED,
    '未付款': exports.ORDER_STATUS.PENDING,
    '待付款': exports.ORDER_STATUS.PENDING,
    '付款失敗': exports.ORDER_STATUS.PAYMENT_FAILED,
    '付款未成功': exports.ORDER_STATUS.PAYMENT_FAILED,
    '已付款': exports.ORDER_STATUS.PAID,
    '付款完成': exports.ORDER_STATUS.PAID,
    '已取消': exports.ORDER_STATUS.CANCELLED,
    '已退款': exports.ORDER_STATUS.REFUNDED,
};
const LEGACY_FULFILLMENT_STATUS = {
    pending_shipment: exports.FULFILLMENT_STATUS.PENDING_SHIPMENT,
    shipped: exports.FULFILLMENT_STATUS.SHIPPED,
    delivered: exports.FULFILLMENT_STATUS.DELIVERED,
    '待出貨': exports.FULFILLMENT_STATUS.PENDING_SHIPMENT,
    '準備出貨': exports.FULFILLMENT_STATUS.PENDING_SHIPMENT,
    '已出貨': exports.FULFILLMENT_STATUS.SHIPPED,
    '已送達': exports.FULFILLMENT_STATUS.DELIVERED,
};
function normalizeOrderStatus(status) {
    return LEGACY_ORDER_STATUS[String(status || '').trim()] || exports.ORDER_STATUS.PENDING;
}
function normalizeFulfillmentStatus(status) {
    return (LEGACY_FULFILLMENT_STATUS[String(status || '').trim()] ||
        exports.FULFILLMENT_STATUS.PENDING_SHIPMENT);
}
function normalizeOrderRecord(order) {
    const normalized = order;
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
