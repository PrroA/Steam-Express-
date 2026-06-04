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
      <div className="group relative">
        <Link
          href="/profile"
          title="會員資料"
          className="block max-w-[150px] truncate rounded-md border border-[#66c0f433] bg-[#102131] px-3 py-2 text-sm font-semibold text-[#d8e6f3] transition hover:border-[#66c0f488] hover:bg-[#163145]"
        >
          {authUser?.username || '會員'}
          {isAdmin ? <span className="ml-1 text-xs font-medium text-[#8fb8d5]">管理員</span> : null}
        </Link>
        <div className="invisible absolute right-0 top-[110%] z-50 w-44 rounded-lg border border-[#66c0f433] bg-[#142636] p-2 opacity-0 shadow-2xl transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
          <Link href="/profile" className="block rounded-md px-3 py-2 text-sm text-[#d8e6f3] hover:bg-[#1a3044]">
            會員資料
          </Link>
          <Link href="/wishlist" className="block rounded-md px-3 py-2 text-sm text-[#d8e6f3] hover:bg-[#1a3044]">
            願望清單
          </Link>
        </div>
      </div>
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
