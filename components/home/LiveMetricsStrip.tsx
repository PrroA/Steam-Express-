import Link from 'next/link';
import type { JourneyEvent } from '../../utils/journeyTracker';

interface LiveMetricsStripProps {
  journeyEvents: JourneyEvent[];
  recentlyViewedCount: number;
  recommendedCount: number;
  filteredCount: number;
  totalCount: number;
}

function getLastActionText(events: JourneyEvent[]) {
  const latest = events[0];
  if (!latest) return '尚無互動紀錄';
  return `${latest.title}${latest.subtitle ? ` · ${latest.subtitle}` : ''}`;
}

export function LiveMetricsStrip({
  journeyEvents,
  recentlyViewedCount,
  recommendedCount,
  filteredCount,
  totalCount,
}: LiveMetricsStripProps) {
  const paymentSuccessCount = journeyEvents.filter((event) => event.type === 'payment_success').length;
  const cartActionCount = journeyEvents.filter(
    (event) => event.type === 'add_cart' || event.type === 'checkout_created'
  ).length;
  const lastAction = getLastActionText(journeyEvents);

  return (
    <section className="steam-fade-up mx-auto mt-4 w-[95%] max-w-6xl rounded-2xl border border-[#66c0f433] bg-gradient-to-r from-[#13273a] via-[#112437] to-[#182f45] p-4 md:p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-bold tracking-[0.16em] text-[#8fb8d5]">LIVE SNAPSHOT</p>
          <h2 className="mt-1 text-xl font-black text-[#d8e6f3]">當前體驗指標</h2>
        </div>
        <p className="text-xs text-[#9eb4c8]">最新動作：{lastAction}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-[#66c0f433] bg-[#112235] p-3">
          <p className="text-xs text-[#8fb8d5]">結帳/付款事件</p>
          <p className="mt-1 text-2xl font-black text-[#d8e6f3]">{paymentSuccessCount}</p>
          <p className="mt-1 text-xs text-[#9eb4c8]">展示完整購物閉環</p>
        </div>
        <div className="rounded-xl border border-[#66c0f433] bg-[#112235] p-3">
          <p className="text-xs text-[#8fb8d5]">購物車互動次數</p>
          <p className="mt-1 text-2xl font-black text-[#d8e6f3]">{cartActionCount}</p>
          <p className="mt-1 text-xs text-[#9eb4c8]">加入購物車 + 建單</p>
        </div>
        <div className="rounded-xl border border-[#66c0f433] bg-[#112235] p-3">
          <p className="text-xs text-[#8fb8d5]">最近瀏覽/推薦</p>
          <p className="mt-1 text-2xl font-black text-[#d8e6f3]">
            {recentlyViewedCount}/{recommendedCount}
          </p>
          <p className="mt-1 text-xs text-[#9eb4c8]">偏好驅動推薦內容</p>
        </div>
        <div className="rounded-xl border border-[#66c0f433] bg-[#112235] p-3">
          <p className="text-xs text-[#8fb8d5]">目前可見商品</p>
          <p className="mt-1 text-2xl font-black text-[#d8e6f3]">
            {filteredCount}/{totalCount}
          </p>
          <p className="mt-1 text-xs text-[#9eb4c8]">篩選器即時生效</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/wishlist"
          className="rounded-md border border-[#66c0f455] bg-[#1b2f44] px-3 py-1.5 text-xs font-semibold text-[#d8e6f3] transition hover:bg-[#24384d]"
        >
          查看願望清單
        </Link>
        <Link
          href="/cart"
          className="rounded-md border border-[#66c0f455] bg-[#1b2f44] px-3 py-1.5 text-xs font-semibold text-[#d8e6f3] transition hover:bg-[#24384d]"
        >
          查看購物車
        </Link>
        <Link
          href="/orders"
          className="rounded-md border border-[#66c0f455] bg-[#1b2f44] px-3 py-1.5 text-xs font-semibold text-[#d8e6f3] transition hover:bg-[#24384d]"
        >
          查看訂單
        </Link>
      </div>
    </section>
  );
}
