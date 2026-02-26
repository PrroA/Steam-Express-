import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navItems = [
    { href: '/cart', label: '購物車' },
    { href: '/wishlist', label: '願望清單' },
    { href: '/orders', label: '訂單' },
    { href: '/transactions', label: '交易記錄' },
  ];

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
          <Link
            href="/login"
            className="steam-btn rounded-md px-4 py-2 text-sm transition-all duration-200"
          >
            登入 / 註冊
          </Link>
        </nav>

        <button
          className="rounded-md border border-[#66c0f455] bg-[#1b2b3a] p-2 text-[#d8e6f3] md:hidden"
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

            <Link href="/login" onClick={() => setIsMenuOpen(false)} className="steam-btn rounded-md px-4 py-2 text-center">
              登入 / 註冊
            </Link>
            {navItems.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                label={item.label}
                onClick={() => setIsMenuOpen(false)}
              />
            ))}
            <NavItem href="/admin" label="後台管理" onClick={() => setIsMenuOpen(false)} />
          </motion.aside>
        )}
      </AnimatePresence>
    </header>
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
