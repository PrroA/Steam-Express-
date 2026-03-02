import Link from 'next/link';
import { useRouter } from 'next/router';
import { useMemo, useState } from 'react';

export function FloatingSupportWidget() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const isChatPage = useMemo(
    () => router.pathname === '/ChatPage' || router.pathname === '/ChatUIWithMCP',
    [router.pathname]
  );

  if (isChatPage) {
    return null;
  }

  return (
    <aside className="fixed bottom-4 right-4 z-[70] flex flex-col items-end gap-2 md:bottom-6 md:right-6">
      {open && (
        <div className="steam-panel w-52 rounded-xl p-3 text-sm text-[#d8e6f3]">
          <p className="mb-2 text-xs font-bold tracking-[0.14em] text-[#8fb8d5]">客服中心</p>
          <div className="grid gap-2">
            <Link
              href="/ChatPage"
              className="rounded-md border border-[#66c0f455] bg-[#1b2f44] px-3 py-2 text-center text-xs font-semibold transition hover:bg-[#24384d]"
            >
              AI 客服
            </Link>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? '收合客服面板' : '展開客服面板'}
        className="steam-btn flex h-12 w-12 items-center justify-center rounded-full border border-[#ffffff44] text-lg shadow-[0_12px_24px_rgba(0,0,0,0.35)] transition hover:scale-[1.03]"
      >
        {open ? '▾' : '▴'}
      </button>
    </aside>
  );
}
