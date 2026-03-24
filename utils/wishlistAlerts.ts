const STORAGE_KEY = 'siteAlerts';
const LEGACY_WISHLIST_KEY = 'wishlistPriceDropAlerts';
const ORDER_SNAPSHOT_KEY = 'orderStatusSnapshot';
const MAX_ALERTS = 50;

function isBrowser() {
  return typeof window !== 'undefined';
}

function normalizeAlert(alert) {
  if (!alert || typeof alert !== 'object') return null;
  return {
    id: String(alert.id || ''),
    type: alert.type || 'wishlist-price-drop',
    title: alert.title || '',
    message: alert.message || '',
    createdAt: alert.createdAt || new Date().toISOString(),
    unread: alert.unread !== false,
    payload: alert.payload || {},
    // Backward-compatible fields for old UI consumers
    name: alert.name,
    previousPrice: alert.previousPrice,
    currentPrice: alert.currentPrice,
  };
}

function readAlerts() {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.map(normalizeAlert).filter(Boolean)
      : [];
  } catch (error) {
    return [];
  }
}

function writeAlerts(alerts) {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  window.dispatchEvent(new CustomEvent('site-alerts-updated', { detail: { alerts } }));
  // Legacy event name retained
  window.dispatchEvent(new CustomEvent('wishlist-alerts-updated', { detail: { alerts } }));
}

function migrateLegacyWishlistAlerts() {
  if (!isBrowser()) return;
  const legacyRaw = localStorage.getItem(LEGACY_WISHLIST_KEY);
  if (!legacyRaw) return;

  try {
    const legacyParsed = JSON.parse(legacyRaw);
    if (!Array.isArray(legacyParsed) || legacyParsed.length === 0) {
      localStorage.removeItem(LEGACY_WISHLIST_KEY);
      return;
    }

    const current = readAlerts();
    const existingKeySet = new Set(current.map((item) => `${item.type}:${item.id}:${item.createdAt}`));
    const legacyMapped = legacyParsed
      .map((item) =>
        normalizeAlert({
          ...item,
          type: 'wishlist-price-drop',
          title: item?.name ? `願望清單降價：${item.name}` : '願望清單降價',
          message:
            typeof item?.previousPrice !== 'undefined' && typeof item?.currentPrice !== 'undefined'
              ? `$${Number(item.previousPrice).toFixed(2)} → $${Number(item.currentPrice).toFixed(2)}`
              : '有商品降價了',
          payload: {
            previousPrice: Number(item?.previousPrice) || 0,
            currentPrice: Number(item?.currentPrice) || 0,
            name: item?.name || '',
          },
        })
      )
      .filter(Boolean)
      .filter((item) => !existingKeySet.has(`${item.type}:${item.id}:${item.createdAt}`));

    if (legacyMapped.length > 0) {
      const next = [...legacyMapped, ...current]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, MAX_ALERTS);
      writeAlerts(next);
    }
    localStorage.removeItem(LEGACY_WISHLIST_KEY);
  } catch (error) {
    localStorage.removeItem(LEGACY_WISHLIST_KEY);
  }
}

function upsertAlerts(nextAlerts) {
  if (!isBrowser() || !Array.isArray(nextAlerts) || nextAlerts.length === 0) return [];

  const existing = readAlerts();
  const existingMap = new Map(existing.map((item) => [`${item.type}:${item.id}`, item]));

  nextAlerts.forEach((alert) => {
    const normalized = normalizeAlert(alert);
    if (!normalized) return;

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
  migrateLegacyWishlistAlerts();
  return readAlerts();
}

export function getSiteUnreadCount() {
  return getSiteAlerts().filter((item) => item.unread).length;
}

export function markSiteAlertsAsRead() {
  if (!isBrowser()) return [];
  const existing = getSiteAlerts();
  const next = existing.map((item) => ({ ...item, unread: false }));
  writeAlerts(next);
  return next;
}

export function markSiteAlertsAsReadByType(type) {
  if (!isBrowser()) return [];
  const existing = getSiteAlerts();
  const next = existing.map((item) => (item.type === type ? { ...item, unread: false } : item));
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
  const next = getSiteAlerts().map((item) => {
    if (String(item.id) === String(id) && item.createdAt === createdAt) {
      return { ...item, unread: false };
    }
    return item;
  });
  writeAlerts(next);
  return next;
}

export function upsertWishlistPriceDropAlerts(drops) {
  if (!Array.isArray(drops) || drops.length === 0) return [];
  return upsertAlerts(
    drops.map((drop) => ({
      id: String(drop.id),
      type: 'wishlist-price-drop',
      title: `願望清單降價：${drop.name}`,
      message: `$${Number(drop.previousPrice).toFixed(2)} → $${Number(drop.currentPrice).toFixed(2)}`,
      payload: {
        name: drop.name,
        previousPrice: Number(drop.previousPrice) || 0,
        currentPrice: Number(drop.currentPrice) || 0,
      },
      name: drop.name,
      previousPrice: Number(drop.previousPrice) || 0,
      currentPrice: Number(drop.currentPrice) || 0,
    }))
  );
}

export function upsertOrderStatusAlertsFromOrders(orders) {
  if (!isBrowser() || !Array.isArray(orders)) return [];

  const prevSnapshotRaw = localStorage.getItem(ORDER_SNAPSHOT_KEY);
  const prevSnapshot = prevSnapshotRaw ? JSON.parse(prevSnapshotRaw) : null;
  const nextSnapshot = {};

  orders.forEach((order) => {
    if (!order?.id) return;
    nextSnapshot[order.id] = {
      status: order.status,
      fulfillmentStatus: order.fulfillmentStatus || '待出貨',
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

    if (prev.status !== order.status) {
      generated.push({
        id: `${order.id}:status`,
        type: 'order-status',
        title: `訂單狀態更新：${order.id.slice(0, 8)}...`,
        message: `${prev.status || '未知'} → ${order.status}`,
        payload: { orderId: order.id, status: order.status },
      });
    }

    const nextFulfillment = order.fulfillmentStatus || '待出貨';
    if (prev.fulfillmentStatus !== nextFulfillment) {
      generated.push({
        id: `${order.id}:fulfillment`,
        type: 'order-fulfillment',
        title: `物流進度更新：${order.id.slice(0, 8)}...`,
        message: `${prev.fulfillmentStatus || '待出貨'} → ${nextFulfillment}`,
        payload: { orderId: order.id, fulfillmentStatus: nextFulfillment },
      });
    }
  });

  localStorage.setItem(ORDER_SNAPSHOT_KEY, JSON.stringify(nextSnapshot));
  if (generated.length === 0) return [];
  return upsertAlerts(generated);
}

// Backward-compatible exports used by existing code
export function getWishlistPriceDropAlerts() {
  return getSiteAlerts().filter((item) => item.type === 'wishlist-price-drop');
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
