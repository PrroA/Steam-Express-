import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { NavItem } from './NavItem';

export function MobileMenuDrawer({
  isOpen,
  isLoggedIn,
  isAdmin,
  authUser,
  visibleNavItems,
  onClose,
  onLogout,
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <motion.button
            type="button"
            aria-label="關閉選單遮罩"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#050a0fcc] backdrop-blur-[1px]"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 180, damping: 24 }}
            className="absolute inset-y-0 right-0 z-10 flex w-[86vw] max-w-[360px] flex-col border-l border-[#66c0f455] bg-[#102031] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#66c0f433] px-4 py-4">
              <p className="text-sm font-extrabold tracking-[0.16em] text-[#c8dff3]">選單</p>
              <button
                className="rounded-md border border-[#66c0f455] bg-[#1b2b3a] px-3 py-1.5 text-lg text-[#d8e6f3]"
                onClick={onClose}
                aria-label="關閉選單"
              >
                ✖
              </button>
            </div>

            <div className="space-y-2 px-4 py-3">
              {isLoggedIn ? (
                <div className="rounded-lg border border-[#66c0f433] bg-[#102131] p-2.5">
                  <Link href="/profile" onClick={onClose} className="block rounded-md p-1 transition hover:bg-[#163145]">
                    <p className="text-[11px] text-[#8faac0]">目前登入</p>
                    <p className="text-sm font-bold text-[#d8e6f3]">
                      {authUser?.username}
                      {isAdmin ? ' (Admin)' : ''}
                    </p>
                  </Link>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="mt-1.5 w-full rounded-md border border-[#ff9f9f55] bg-[#4a202a] px-3 py-2 text-xs font-semibold text-[#ffd6d6] transition hover:bg-[#66303c]"
                  >
                    登出
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={onClose}
                  className="steam-btn block rounded-md px-4 py-2 text-center"
                >
                  登入 / 註冊
                </Link>
              )}

              {visibleNavItems.map((item) => (
                <NavItem key={item.href} href={item.href} label={item.label} onClick={onClose} />
              ))}
              {isAdmin && <NavItem href="/admin" label="後台管理" onClick={onClose} />}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
