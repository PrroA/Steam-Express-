import Link from 'next/link';
import { useRouter } from 'next/router';
import { useMemo, useState } from 'react';
import { FaHeadset } from 'react-icons/fa';

export function FloatingSupportWidget() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const isChatPage = useMemo(
    () => router.pathname === '/ChatPage' || router.pathname === '/ChatUIWithMCP',
    [router.pathname]
  );

  if (isChatPage) return null;

  return (
    <aside className="fixed bottom-4 right-4 z-[70] flex flex-col items-end gap-2 md:hidden">
      {open && (
        <div className="steam-panel w-56 rounded-xl p-3 text-sm text-[#d8e6f3]">
          <p className="mb-2 text-xs font-bold tracking-[0.14em] text-[#8fb8d5]">需要協助嗎？</p>
          <div className="grid gap-2">
            <Link
              href="/ChatPage"
              className="rounded-md border border-[#66c0f455] bg-[#1b2f44] px-3 py-2 text-center text-xs font-semibold transition hover:bg-[#24384d]"
            >
              詢問 AI 客服
            </Link>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? '收合客服入口' : '開啟客服入口'}
        className="steam-btn flex items-center gap-2 rounded-full border border-[#ffffff44] px-4 py-3 text-sm shadow-[0_12px_24px_rgba(0,0,0,0.35)] transition hover:scale-[1.03]"
      >
        <FaHeadset aria-hidden="true" />
        AI 客服
      </button>
    </aside>
  );
}
