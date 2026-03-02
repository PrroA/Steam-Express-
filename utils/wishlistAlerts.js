const STORAGE_KEY = 'wishlistPriceDropAlerts';
const MAX_ALERTS = 30;

function isBrowser() {
  return typeof window !== 'undefined';
}

export function getWishlistPriceDropAlerts() {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

export function upsertWishlistPriceDropAlerts(drops) {
  if (!isBrowser() || !Array.isArray(drops) || drops.length === 0) return [];

  const existing = getWishlistPriceDropAlerts();
  const existingMap = new Map(existing.map((item) => [String(item.id), item]));
  const nowIso = new Date().toISOString();

  drops.forEach((drop) => {
    const key = String(drop.id);
    const prev = existingMap.get(key);
    const hasPriceChanged =
      !prev ||
      Number(prev.currentPrice) !== Number(drop.currentPrice) ||
      Number(prev.previousPrice) !== Number(drop.previousPrice);
    if (!hasPriceChanged) {
      return;
    }
    existingMap.set(key, {
      id: drop.id,
      name: drop.name,
      previousPrice: Number(drop.previousPrice) || 0,
      currentPrice: Number(drop.currentPrice) || 0,
      createdAt: nowIso,
      unread: true,
    });
  });

  const next = [...existingMap.values()]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, MAX_ALERTS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('wishlist-alerts-updated', { detail: { alerts: next } }));
  return next;
}

export function markWishlistAlertsAsRead() {
  if (!isBrowser()) return [];
  const existing = getWishlistPriceDropAlerts();
  const next = existing.map((item) => ({ ...item, unread: false }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('wishlist-alerts-updated', { detail: { alerts: next } }));
  return next;
}

export function clearWishlistAlerts() {
  if (!isBrowser()) return;
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('wishlist-alerts-updated', { detail: { alerts: [] } }));
}

export function getWishlistUnreadCount() {
  return getWishlistPriceDropAlerts().filter((item) => item.unread).length;
}
