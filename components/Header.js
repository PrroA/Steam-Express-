import Link from 'next/link';
import { useState } from 'react';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-gray-800 text-white p-4 flex justify-between items-center">
      {/* Logo */}
      <Link href="/" className="text-xl font-bold">
        Steam Clone
      </Link>

      {/* Hamburger Menu for Mobile */}
      <button
        className="md:hidden bg-gray-700 p-2 rounded"
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
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 6h16M4 12h16m-7 6h7"
          />
        </svg>
      </button>

      {/* Navigation */}
      <nav
        className={`flex-col md:flex-row flex gap-4 items-center absolute md:static top-full left-0 w-full md:w-auto bg-gray-800 md:bg-transparent p-4 md:p-0 z-10 transition-all ${
          isMenuOpen ? 'block' : 'hidden md:flex'
        }`}
      >
        <Link href="/login">
          <button className="bg-blue-500 py-1 px-3 rounded hover:bg-blue-700">
            登入/註冊
          </button>
        </Link>
        <Link href="/cart">
          <button className="bg-green-500 py-1 px-3 rounded hover:bg-green-700">
            購物車
          </button>
        </Link>
        <Link href="/orders" className="bg-blue-500 py-1 px-3 rounded hover:bg-green-700">
          查看訂單
        </Link>
        <Link href="/wishlist" className="bg-green-500 py-1 px-3 rounded hover:bg-green-700">
          願望清單
        </Link>
        <Link href="/transactions" className="bg-blue-500 py-1 px-3 rounded hover:bg-green-700">
          交易記錄
        </Link>
        <Link href="/admin" className="bg-green-500 py-1 px-3 rounded hover:bg-green-700">
          新增遊戲
        </Link>
      </nav>
    </header>
  );
}
