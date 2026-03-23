import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback } from 'react';
import { AlertBell } from './header/AlertBell';
import { AuthControls } from './header/AuthControls';
import { MobileMenuDrawer } from './header/MobileMenuDrawer';
import { NavItem } from './header/NavItem';
import { useHeaderState } from '../hooks/useHeaderState';

export function Header() {
  const router = useRouter();
  const {
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
  } = useHeaderState(router.asPath);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('profile_username');
    window.dispatchEvent(new Event('auth-user-updated'));
    setAuthUser(null);
    setIsMenuOpen(false);
    setIsAlertOpen(false);
    router.push('/login');
  }, [router, setAuthUser, setIsMenuOpen, setIsAlertOpen]);

  const handleCloseAlerts = useCallback(() => setIsAlertOpen(false), [setIsAlertOpen]);
  const handleToggleMenu = useCallback(() => setIsMenuOpen((prev) => !prev), [setIsMenuOpen]);
  const handleCloseMenu = useCallback(() => setIsMenuOpen(false), [setIsMenuOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-[#66c0f433] bg-[#0d1824e8] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
        <Link href="/" className="text-xl font-extrabold tracking-[0.2em] text-[#c8dff3] md:text-2xl">
          STEAM PRACTICE
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {visibleNavItems.map((item) => (
            <NavItem key={item.href} href={item.href} label={item.label} />
          ))}
          {isAdmin && <NavItem href="/admin" label="後台管理" />}

          <AlertBell
            unreadCount={unreadCount}
            isAlertOpen={isAlertOpen}
            onToggle={handleOpenAlerts}
            alerts={alerts}
            onClose={handleCloseAlerts}
          />

          <AuthControls
            isLoggedIn={isLoggedIn}
            authUser={authUser}
            isAdmin={isAdmin}
            onLogout={handleLogout}
          />
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <AlertBell
            unreadCount={unreadCount}
            isAlertOpen={isAlertOpen}
            onToggle={handleOpenAlerts}
            alerts={alerts}
            onClose={handleCloseAlerts}
            mobile
          />

          <button
            className="rounded-md border border-[#66c0f455] bg-[#1b2b3a] p-2 text-[#d8e6f3]"
            onClick={handleToggleMenu}
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

      <MobileMenuDrawer
        isOpen={isMenuOpen}
        isLoggedIn={isLoggedIn}
        isAdmin={isAdmin}
        authUser={authUser}
        visibleNavItems={visibleNavItems}
        onClose={handleCloseMenu}
        onLogout={handleLogout}
      />
    </header>
  );
}
