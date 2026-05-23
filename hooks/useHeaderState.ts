import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  clearSiteAlerts,
  clearSiteAlertsByType,
  getSiteAlerts,
  getSiteUnreadCount,
  markSiteAlertsAsRead,
  markSiteAlertsAsReadByType,
  markSiteAlertAsRead,
  removeSiteAlert,
} from '../utils/wishlistAlerts';
import { clearStoredAuth, isTokenExpired, parseTokenPayload, PROFILE_USERNAME_KEY } from '../utils/authToken';

export function useHeaderState(pathname) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [authUser, setAuthUser] = useState(null);

  const syncAlerts = useCallback(() => {
    setAlerts(getSiteAlerts().slice(0, 20));
    setUnreadCount(getSiteUnreadCount());
  }, []);

  const isAdmin = authUser?.role === 'admin';
  const isLoggedIn = Boolean(authUser);

  const navItems = useMemo(
    () => [
      { href: '/cart', label: '購物車' },
      { href: '/wishlist', label: '願望清單' },
      { href: '/orders', label: '我的訂單' },
    ],
    []
  );
  const visibleNavItems = useMemo(() => (isLoggedIn ? navItems : []), [isLoggedIn, navItems]);

  useEffect(() => {
    syncAlerts();
    window.addEventListener('storage', syncAlerts);
    window.addEventListener('site-alerts-updated', syncAlerts);
    window.addEventListener('wishlist-alerts-updated', syncAlerts);

    return () => {
      window.removeEventListener('storage', syncAlerts);
      window.removeEventListener('site-alerts-updated', syncAlerts);
      window.removeEventListener('wishlist-alerts-updated', syncAlerts);
    };
  }, [syncAlerts]);

  useEffect(() => {
    const syncAuthRole = () => {
      const token = localStorage.getItem('token');
      const payload = parseTokenPayload(token);
      if (!payload) {
        setAuthUser(null);
        return;
      }

      if (isTokenExpired(payload)) {
        clearStoredAuth();
        setAuthUser(null);
        return;
      }

      const profileUsername = localStorage.getItem(PROFILE_USERNAME_KEY);
      setAuthUser({
        username: profileUsername || payload.username || '會員',
        role: payload.role || 'user',
      });
    };

    syncAuthRole();
    window.addEventListener('storage', syncAuthRole);
    window.addEventListener('focus', syncAuthRole);
    window.addEventListener('auth-user-updated', syncAuthRole);

    return () => {
      window.removeEventListener('storage', syncAuthRole);
      window.removeEventListener('focus', syncAuthRole);
      window.removeEventListener('auth-user-updated', syncAuthRole);
    };
  }, [pathname]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isMenuOpen]);

  const handleOpenAlerts = useCallback(() => {
    setIsAlertOpen((prev) => !prev);
  }, []);

  const handleMarkAlertsRead = useCallback((type) => {
    let next = [];
    if (!type) {
      next = markSiteAlertsAsRead();
    } else if (type === 'order-group') {
      markSiteAlertsAsReadByType('order-status');
      next = markSiteAlertsAsReadByType('order-fulfillment');
    } else {
      next = markSiteAlertsAsReadByType(type);
    }
    setAlerts(next.slice(0, 20));
    setUnreadCount(next.filter((item) => item.unread).length);
  }, []);

  const handleClearAlerts = useCallback((type) => {
    if (!type) {
      clearSiteAlerts();
      setAlerts([]);
      setUnreadCount(0);
      return;
    }
    let next = [];
    if (type === 'order-group') {
      clearSiteAlertsByType('order-status');
      next = clearSiteAlertsByType('order-fulfillment');
    } else {
      next = clearSiteAlertsByType(type);
    }
    setAlerts(next.slice(0, 20));
    setUnreadCount(next.filter((item) => item.unread).length);
  }, []);

  const handleRemoveAlert = useCallback((id, createdAt) => {
    const next = removeSiteAlert(id, createdAt);
    setAlerts(next.slice(0, 20));
    setUnreadCount(next.filter((item) => item.unread).length);
  }, []);

  const handleMarkSingleAlertRead = useCallback((id, createdAt) => {
    const next = markSiteAlertAsRead(id, createdAt);
    setAlerts(next.slice(0, 20));
    setUnreadCount(next.filter((item) => item.unread).length);
  }, []);

  return {
    isMenuOpen,
    isAlertOpen,
    alerts,
    unreadCount,
    authUser,
    isAdmin,
    isLoggedIn,
    visibleNavItems,
    setIsMenuOpen,
    setIsAlertOpen,
    setAuthUser,
    handleOpenAlerts,
    handleMarkAlertsRead,
    handleClearAlerts,
    handleRemoveAlert,
    handleMarkSingleAlertRead,
  };
}
