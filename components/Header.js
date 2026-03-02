import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBell } from 'react-icons/fa';
import { useRouter } from 'next/router';
import {
  getWishlistPriceDropAlerts,
  getWishlistUnreadCount,
  markWishlistAlertsAsRead,
} from '../utils/wishlistAlerts';

function formatAlertTime(isoString) {
  if (!isoString) return '剛剛';
  const diffMs = Date.now() - new Date(isoString).getTime();
  if (Number.isNaN(diffMs) || diffMs < 60 * 1000) return '剛剛';
  const diffMin = Math.floor(diffMs / (60 * 1000));
  if (diffMin < 60) return `${diffMin} 分鐘前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} 小時前`;
  return `${Math.floor(diffHour / 24)} 天前`;
}

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

export function Header() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [authUser, setAuthUser] = useState(null);
  const isAdmin = authUser?.role === 'admin';
  const isLoggedIn = Boolean(authUser);

  const navItems = useMemo(
    () => [
      { href: '/cart', label: '購物車' },
      { href: '/wishlist', label: '願望清單' },
      { href: '/orders', label: '訂單' },
      { href: '/transactions', label: '交易記錄' },
    ],
    []
  );

  useEffect(() => {
    const syncAlerts = () => {
      setAlerts(getWishlistPriceDropAlerts().slice(0, 5));
      setUnreadCount(getWishlistUnreadCount());
    };

    syncAlerts();
    window.addEventListener('storage', syncAlerts);
    window.addEventListener('wishlist-alerts-updated', syncAlerts);

    return () => {
      window.removeEventListener('storage', syncAlerts);
      window.removeEventListener('wishlist-alerts-updated', syncAlerts);
    };
  }, []);

  useEffect(() => {
    const syncAuthRole = () => {
      const token = localStorage.getItem('token');
      const payload = parseTokenPayload(token);
      if (!payload) {
        setAuthUser(null);
        return;
      }

      const isExpired =
        typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
      if (isExpired) {
        localStorage.removeItem('token');
        setAuthUser(null);
        return;
      }

      setAuthUser({
        username: payload.username || '使用者',
        role: payload.role || 'user',
      });
    };

    syncAuthRole();
    window.addEventListener('storage', syncAuthRole);
    window.addEventListener('focus', syncAuthRole);
    return () => {
      window.removeEventListener('storage', syncAuthRole);
      window.removeEventListener('focus', syncAuthRole);
    };
  }, [router.asPath]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setAuthUser(null);
    setIsMenuOpen(false);
    setIsAlertOpen(false);
    router.push('/login');
  };

  const handleOpenAlerts = () => {
    const nextOpen = !isAlertOpen;
    setIsAlertOpen(nextOpen);
    if (nextOpen && unreadCount > 0) {
      const next = markWishlistAlertsAsRead();
      setAlerts(next.slice(0, 5));
      setUnreadCount(0);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#66c0f433] bg-[#0d1824e8] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
        <Link href="/" className="text-xl font-extrabold tracking-[0.2em] text-[#c8dff3] md:text-2xl">
          STEAM PRACTICE
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => (
            <NavItem key={item.href} href={item.href} label={item.label} />
          ))}
          {isAdmin && <NavItem href="/admin" label="後台管理" />}

          <div className="relative">
            <button
              type="button"
              onClick={handleOpenAlerts}
              className="relative rounded-md border border-[#66c0f433] bg-[#1b2b3a] px-3 py-2 text-[#d8e6f3] transition hover:border-[#66c0f488] hover:bg-[#24384d]"
              aria-label="降價通知"
            >
              <FaBell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-[#8bc53f] px-1.5 text-center text-[11px] font-bold text-[#0f1924]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {isAlertOpen && (
              <AlertDropdown alerts={alerts} onClose={() => setIsAlertOpen(false)} />
            )}
          </div>

          {isLoggedIn ? (
            <>
              <div className="rounded-md border border-[#66c0f433] bg-[#102131] px-3 py-2 text-sm">
                <p className="text-[11px] text-[#8faac0]">目前登入</p>
                <p className="font-bold text-[#d8e6f3]">
                  {authUser.username}
                  {isAdmin ? ' (Admin)' : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-md border border-[#ff9f9f55] bg-[#4a202a] px-4 py-2 text-sm font-semibold text-[#ffd6d6] transition hover:bg-[#66303c]"
              >
                登出
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="steam-btn rounded-md px-4 py-2 text-sm transition-all duration-200"
            >
              登入 / 註冊
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <div className="relative">
            <button
              type="button"
              onClick={handleOpenAlerts}
              className="relative rounded-md border border-[#66c0f455] bg-[#1b2b3a] p-2 text-[#d8e6f3]"
              aria-label="降價通知"
            >
              <FaBell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-[#8bc53f] px-1.5 text-center text-[11px] font-bold text-[#0f1924]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {isAlertOpen && (
              <AlertDropdown alerts={alerts} onClose={() => setIsAlertOpen(false)} mobile />
            )}
          </div>

          <button
            className="rounded-md border border-[#66c0f455] bg-[#1b2b3a] p-2 text-[#d8e6f3]"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label="開啟選單"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-6 w-6"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            className="fixed right-0 top-0 z-50 flex h-full w-72 flex-col gap-3 border-l border-[#66c0f433] bg-[#102031] p-5 shadow-2xl md:hidden"
          >
            <button
              className="mb-3 self-end text-2xl text-[#d8e6f3]"
              onClick={() => setIsMenuOpen(false)}
              aria-label="關閉選單"
            >
              ✖
            </button>

            {isLoggedIn ? (
              <div className="rounded-lg border border-[#66c0f433] bg-[#102131] p-3">
                <p className="text-[11px] text-[#8faac0]">目前登入</p>
                <p className="text-sm font-bold text-[#d8e6f3]">
                  {authUser.username}
                  {isAdmin ? ' (Admin)' : ''}
                </p>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-2 w-full rounded-md border border-[#ff9f9f55] bg-[#4a202a] px-3 py-2 text-xs font-semibold text-[#ffd6d6] transition hover:bg-[#66303c]"
                >
                  登出
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setIsMenuOpen(false)}
                className="steam-btn rounded-md px-4 py-2 text-center"
              >
                登入 / 註冊
              </Link>
            )}
            {navItems.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                label={item.label}
                onClick={() => setIsMenuOpen(false)}
              />
            ))}
            {isAdmin && <NavItem href="/admin" label="後台管理" onClick={() => setIsMenuOpen(false)} />}
          </motion.aside>
        )}
      </AnimatePresence>
    </header>
  );
}

function AlertDropdown({ alerts, onClose, mobile = false }) {
  return (
    <div
      className={`absolute right-0 top-[110%] w-[320px] rounded-xl border border-[#66c0f444] bg-[#142636] p-3 shadow-2xl ${
        mobile ? 'max-w-[84vw]' : ''
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-bold text-[#d8e6f3]">降價通知</p>
        <Link href="/wishlist" onClick={onClose} className="text-xs text-[#66c0f4] hover:underline">
          查看願望清單
        </Link>
      </div>

      {alerts.length === 0 ? (
        <p className="rounded-lg border border-[#66c0f422] bg-[#101d2a] px-3 py-4 text-sm text-[#9eb4c8]">
          目前沒有新的降價通知。
        </p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((alert) => (
            <li key={`${alert.id}-${alert.createdAt}`} className="rounded-lg border border-[#66c0f433] bg-[#101d2a] p-3">
              <p className="line-clamp-1 text-sm font-semibold text-[#d8e6f3]">{alert.name}</p>
              <p className="mt-1 text-xs text-[#9ec5df]">
                ${Number(alert.previousPrice).toFixed(2)} →{' '}
                <span className="font-bold text-[#8bc53f]">${Number(alert.currentPrice).toFixed(2)}</span>
              </p>
              <p className="mt-1 text-[11px] text-[#7f9ab0]">{formatAlertTime(alert.createdAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const NavItem = ({ href, label, onClick }) => (
  <Link
    href={href}
    onClick={onClick}
    className="rounded-md border border-[#66c0f433] bg-[#1b2b3a] px-3 py-2 text-sm font-semibold text-[#d8e6f3] transition hover:border-[#66c0f488] hover:bg-[#24384d]"
  >
    {label}
  </Link>
);
