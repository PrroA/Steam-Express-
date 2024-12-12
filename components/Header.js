import Link from 'next/link';

export function Header() {
  return (
    <header className="bg-gray-800 text-white p-4 flex justify-between items-center">
      <h1 className="text-xl font-bold">Steam Clone</h1>
      <nav className="flex gap-4">
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
        <Link href="/orders" className="bg-green-500 py-1 px-3 rounded hover:bg-green-700">
        查看訂單
        </Link>
      </nav>
    </header>
  );
}
