import Link from 'next/link';

export function GameDetailLoadingState() {
  return (
    <main className="steam-shell flex min-h-screen items-center justify-center px-4 py-10">
      <div className="steam-panel flex w-full max-w-xl flex-col items-center rounded-2xl p-10">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#66c0f4] border-t-transparent" />
        <p className="mt-4 text-sm text-[#9eb4c8]">載入遊戲詳情中...</p>
      </div>
    </main>
  );
}

export function GameDetailNotFoundState() {
  return (
    <main className="steam-shell flex min-h-screen items-center justify-center px-4 py-10">
      <div className="steam-panel w-full max-w-xl rounded-2xl p-8 text-center">
        <p className="text-2xl font-black text-[#ff7777]">遊戲未找到</p>
        <p className="mt-2 text-[#9eb4c8]">請檢查遊戲 ID 或稍後再試。</p>
        <Link href="/" className="steam-btn mt-5 inline-flex rounded-md px-5 py-2 text-sm">
          返回商店
        </Link>
      </div>
    </main>
  );
}
