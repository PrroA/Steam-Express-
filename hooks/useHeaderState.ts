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

function parseTokenPayload(token) {
  try {
    if (!token || token === 'null' || token === 'undefined') return null;
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(normalized)
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    );
    return JSON.parse(json);
  } catch (error) {
    return null;
  }
}

const PROFILE_USERNAME_KEY = 'profile_username';

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
      { href: '/orders', label: '訂單' },
      { href: '/transactions', label: '交易記錄' },
      { href: '/profile', label: '個人資料' },
    ],
    []
  );
  const visibleNavItems = useMemo(
    () => (isLoggedIn ? navItems : []),
    [isLoggedIn, navItems]
  );

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

      const isExpired = typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
      if (isExpired) {
        localStorage.removeItem('token');
        localStorage.removeItem(PROFILE_USERNAME_KEY);
        setAuthUser(null);
        return;
      }

      const profileUsername = localStorage.getItem(PROFILE_USERNAME_KEY);
      setAuthUser({
        username: profileUsername || payload.username || '使用者',
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

  const handleMarkAlertsRead = useCallback(
    (type) => {
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
    },
    []
  );

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
