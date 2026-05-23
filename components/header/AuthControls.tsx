import Link from 'next/link';

export function AuthControls({ isLoggedIn, authUser, isAdmin, onLogout }) {
  if (!isLoggedIn) {
    return (
      <Link href="/login" className="steam-btn rounded-md px-4 py-2 text-sm transition-all duration-200">
        登入 / 註冊
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/profile"
        title="會員資料"
        className="max-w-[150px] truncate rounded-md border border-[#66c0f433] bg-[#102131] px-3 py-2 text-sm font-semibold text-[#d8e6f3] transition hover:border-[#66c0f488] hover:bg-[#163145]"
      >
        {authUser?.username || '會員'}
        {isAdmin ? <span className="ml-1 text-xs font-medium text-[#8fb8d5]">管理員</span> : null}
      </Link>
      <button
        type="button"
        onClick={onLogout}
        className="rounded-md border border-[#ff9f9f55] bg-[#4a202a] px-4 py-2 text-sm font-semibold text-[#ffd6d6] transition hover:bg-[#66303c]"
      >
        登出
      </button>
    </div>
  );
}
