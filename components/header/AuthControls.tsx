import Link from 'next/link';

export function AuthControls({ isLoggedIn, authUser, isAdmin, onLogout }) {
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
      <Link
        href="/profile"
        className="rounded-md border border-[#66c0f433] bg-[#102131] px-3 py-2 text-sm transition hover:border-[#66c0f499] hover:bg-[#163145]"
      >
        <p className="text-[11px] text-[#8faac0]">目前登入</p>
        <p className="font-bold text-[#d8e6f3]">
          {authUser?.username}
          {isAdmin ? ' (Admin)' : ''}
        </p>
      </Link>
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
