import Link from 'next/link';

export function AuthControls({ isLoggedIn, authUser, isAdmin, onLogout }) {
  const isDemoUser = authUser?.username === 'demo_user' || authUser?.username?.startsWith('demo_');

  if (!isLoggedIn) {
    return (
      <Link
        href="/login"
        className="steam-btn rounded-md px-4 py-2 text-sm transition-all duration-200"
      >
        登入 / 註冊
      </Link>
    );
  }

  return (
    <>
      <div className="rounded-md border border-[#66c0f433] bg-[#102131] px-3 py-2 text-sm">
        <Link href="/profile" className="block transition hover:text-[#66c0f4]">
          <p className="text-[11px] text-[#8faac0]">目前登入</p>
          <p className="font-bold text-[#d8e6f3]">
            {authUser?.username}
            {isAdmin ? ' (Admin)' : ''}
          </p>
        </Link>
        <Link href="/transactions" className="mt-1 block text-[11px] font-semibold text-[#8fb8d5] transition hover:text-[#66c0f4]">
          交易記錄
        </Link>
        {isDemoUser && (
          <Link href="/login?demo=1" className="mt-1 block text-[11px] font-semibold text-[#b9e0bd] transition hover:text-[#8bc53f]">
            重置 Demo
          </Link>
        )}
      </div>
      <button
        type="button"
        onClick={onLogout}
        className="rounded-md border border-[#ff9f9f55] bg-[#4a202a] px-4 py-2 text-sm font-semibold text-[#ffd6d6] transition hover:bg-[#66303c]"
      >
        登出
      </button>
    </>
  );
}
