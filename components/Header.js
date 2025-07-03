import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // 動畫

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-gray-900 text-white p-4 flex justify-between items-center">
      {/* Logo */}
      <Link href="/" className="text-2xl font-bold tracking-widest">
        Steam Clone
      </Link>
      <button
        className="bg-gray-700 p-2 rounded focus:outline-none"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
        </svg>
      </button>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.nav
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 100 }}
            className="fixed top-0 left-0 h-full w-64 bg-gray-900 shadow-lg p-6 flex flex-col gap-4 z-50"
          >
            <button
              className="text-white self-end text-2xl mb-4 focus:outline-none"
              onClick={() => setIsMenuOpen(false)}
            >
              ✖
            </button>

            <NavItem href="/login" label="🔑 登入/註冊" />
            <NavItem href="/cart" label="🛒 購物車" />
            <NavItem href="/orders" label="📦 訂單" />
            <NavItem href="/wishlist" label="❤️ 願望清單" />
            <NavItem href="/transactions" label="💰 交易記錄" />
            {/* <NavItem href="/admin" label="🛠️ 新增遊戲" /> */}
            {/* <NavItem href="/profile" label="👤 個人資料" /> */}
            <NavItem href="/ChatPage" label="💬 科普中心" />
            {/* <NavItem href="/elevator" label=" 電梯模擬" /> */}
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
const NavItem = ({ href, label }) => (
  <Link
    href={href}
    className="bg-gray-700 hover:bg-blue-500 text-white py-2 px-4 rounded-lg transition-all"
  >
    {label}
  </Link>
);
