import {
  FULFILLMENT_STATUS,
  getFulfillmentStatusLabel,
  getOrderStatusLabel,
  normalizeFulfillmentStatus,
  normalizeOrderStatus,
} from './orderStatus';

const STORAGE_KEY = 'siteAlerts';
const LEGACY_WISHLIST_KEY = 'wishlistPriceDropAlerts';
const ORDER_SNAPSHOT_KEY = 'orderStatusSnapshot';
const MAX_ALERTS = 50;
const ORDER_ALERT_TYPES = new Set(['order-status', 'order-fulfillment']);

function isBrowser() {
  return typeof window !== 'undefined';
}

function normalizeAlert(alert) {
  if (!alert || typeof alert !== 'object') return null;
  return {
    id: String(alert.id || ''),
    type: alert.type || '',
    title: alert.title || '',
    message: alert.message || '',
    createdAt: alert.createdAt || new Date().toISOString(),
    unread: alert.unread !== false,
    payload: alert.payload || {},
  };
}

function readAlerts() {
  if (!isBrowser()) return [];
  try {
    localStorage.removeItem(LEGACY_WISHLIST_KEY);
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.map(normalizeAlert).filter((alert) => alert && ORDER_ALERT_TYPES.has(alert.type))
      : [];
  } catch {
    return [];
  }
}

function writeAlerts(alerts) {
  if (!isBrowser()) return;
  const orderOnlyAlerts = alerts.filter((alert) => ORDER_ALERT_TYPES.has(alert.type));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orderOnlyAlerts));
  window.dispatchEvent(new CustomEvent('site-alerts-updated', { detail: { alerts: orderOnlyAlerts } }));
}

function upsertAlerts(nextAlerts) {
  if (!isBrowser() || !Array.isArray(nextAlerts) || nextAlerts.length === 0) return [];

  const existing = readAlerts();
  const existingMap = new Map(existing.map((item) => [`${item.type}:${item.id}`, item]));

  nextAlerts.forEach((alert) => {
    const normalized = normalizeAlert(alert);
    if (!normalized || !ORDER_ALERT_TYPES.has(normalized.type)) return;

    const key = `${normalized.type}:${normalized.id}`;
    const prev = existingMap.get(key);
    const hasChanged =
      !prev ||
      prev.title !== normalized.title ||
      prev.message !== normalized.message ||
      JSON.stringify(prev.payload || {}) !== JSON.stringify(normalized.payload || {});

    if (!hasChanged) return;
    existingMap.set(key, { ...normalized, unread: true, createdAt: new Date().toISOString() });
  });

  const merged = [...existingMap.values()]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, MAX_ALERTS);

  writeAlerts(merged);
  return merged;
}

export function getSiteAlerts() {
  return readAlerts();
}

export function getSiteUnreadCount() {
  return getSiteAlerts().filter((item) => item.unread).length;
}

export function markSiteAlertsAsRead() {
  if (!isBrowser()) return [];
  const next = getSiteAlerts().map((item) => ({ ...item, unread: false }));
  writeAlerts(next);
  return next;
}

export function markSiteAlertsAsReadByType(type) {
  if (!isBrowser()) return [];
  const next = getSiteAlerts().map((item) => (item.type === type ? { ...item, unread: false } : item));
  writeAlerts(next);
  return next;
}

export function clearSiteAlerts() {
  if (!isBrowser()) return;
  writeAlerts([]);
}

export function clearSiteAlertsByType(type) {
  if (!isBrowser()) return [];
  const next = getSiteAlerts().filter((item) => item.type !== type);
  writeAlerts(next);
  return next;
}

export function removeSiteAlert(id, createdAt) {
  if (!isBrowser()) return [];
  const next = getSiteAlerts().filter((item) => !(String(item.id) === String(id) && item.createdAt === createdAt));
  writeAlerts(next);
  return next;
}

export function markSiteAlertAsRead(id, createdAt) {
  if (!isBrowser()) return [];
  const next = getSiteAlerts().map((item) =>
    String(item.id) === String(id) && item.createdAt === createdAt ? { ...item, unread: false } : item
  );
  writeAlerts(next);
  return next;
}

export function upsertWishlistPriceDropAlerts() {
  return [];
}

export function upsertOrderStatusAlertsFromOrders(orders) {
  if (!isBrowser() || !Array.isArray(orders)) return [];

  const prevSnapshotRaw = localStorage.getItem(ORDER_SNAPSHOT_KEY);
  const prevSnapshot = prevSnapshotRaw ? JSON.parse(prevSnapshotRaw) : null;
  const nextSnapshot = {};

  orders.forEach((order) => {
    if (!order?.id) return;
    nextSnapshot[order.id] = {
      status: normalizeOrderStatus(order.status),
      fulfillmentStatus: normalizeFulfillmentStatus(order.fulfillmentStatus || FULFILLMENT_STATUS.PENDING_SHIPMENT),
    };
  });

  if (!prevSnapshot || typeof prevSnapshot !== 'object') {
    localStorage.setItem(ORDER_SNAPSHOT_KEY, JSON.stringify(nextSnapshot));
    return [];
  }

  const generated = [];

  orders.forEach((order) => {
    if (!order?.id) return;
    const prev = prevSnapshot[order.id];
    if (!prev) return;

    const nextStatus = normalizeOrderStatus(order.status);
    if (prev.status !== nextStatus) {
      generated.push({
        id: `${order.id}:status`,
        type: 'order-status',
        title: `訂單狀態更新：${order.id.slice(0, 8)}...`,
        message: `${getOrderStatusLabel(prev.status)} 變成 ${getOrderStatusLabel(nextStatus)}`,
        payload: { orderId: order.id, status: nextStatus },
      });
    }

    const nextFulfillment = normalizeFulfillmentStatus(order.fulfillmentStatus || FULFILLMENT_STATUS.PENDING_SHIPMENT);
    if (prev.fulfillmentStatus !== nextFulfillment) {
      generated.push({
        id: `${order.id}:fulfillment`,
        type: 'order-fulfillment',
        title: `出貨狀態更新：${order.id.slice(0, 8)}...`,
        message: `${getFulfillmentStatusLabel(prev.fulfillmentStatus)} 變成 ${getFulfillmentStatusLabel(nextFulfillment)}`,
        payload: { orderId: order.id, fulfillmentStatus: nextFulfillment },
      });
    }
  });

  localStorage.setItem(ORDER_SNAPSHOT_KEY, JSON.stringify(nextSnapshot));
  if (generated.length === 0) return [];
  return upsertAlerts(generated);
}

export function getWishlistPriceDropAlerts() {
  return [];
}

export function markWishlistAlertsAsRead() {
  return markSiteAlertsAsRead();
}

export function clearWishlistAlerts() {
  return clearSiteAlerts();
}

export function getWishlistUnreadCount() {
  return getSiteUnreadCount();
}
