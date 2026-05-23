import Link from 'next/link';
import { FaExclamationTriangle } from 'react-icons/fa';

export function LoadingState({
  title = '載入中',
  description = '正在整理內容，請稍候...',
}) {
  return (
    <main className="steam-shell flex min-h-screen items-center justify-center px-4 py-10">
      <div className="steam-panel w-full max-w-xl rounded-2xl p-10 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#66c0f4] border-t-transparent" />
        <h1 className="mt-4 text-2xl font-black text-[#d8e6f3]">{title}</h1>
        <p className="mt-2 text-sm text-[#9eb4c8]">{description}</p>
      </div>
    </main>
  );
}

export function ErrorState({
  title = '暫時無法載入',
  description = '內容還沒準備好，請稍後再試。',
  actionLabel = '再試一次',
  onAction,
}) {
  return (
    <main className="steam-shell flex min-h-screen items-center justify-center px-4 py-10">
      <div className="steam-panel w-full max-w-xl rounded-2xl p-10 text-center">
        <FaExclamationTriangle size={48} className="mx-auto text-[#ffb36e]" />
        <h1 className="mt-4 text-2xl font-black text-[#d8e6f3]">{title}</h1>
        <p className="mt-2 text-sm text-[#9eb4c8]">{description}</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {typeof onAction === 'function' && (
            <button type="button" onClick={onAction} className="steam-btn rounded-md px-4 py-2 text-sm">
              {actionLabel}
            </button>
          )}
          <Link
            href="/"
            className="rounded-md border border-[#66c0f455] bg-[#1b2f44] px-4 py-2 text-sm font-semibold text-[#d8e6f3] transition hover:bg-[#24384d]"
          >
            回到商店
          </Link>
        </div>
      </div>
    </main>
  );
}
