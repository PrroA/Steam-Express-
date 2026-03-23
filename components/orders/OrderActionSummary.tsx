import type { Order } from '../../types/domain';

interface OrderActionSummaryProps {
  orders: Order[];
}

export function OrderActionSummary({ orders }: OrderActionSummaryProps) {
  const unpaidCount = orders.filter((order) => order.status === '未付款').length;
  const failedCount = orders.filter((order) => order.status === '付款失敗').length;
  const paidCount = orders.filter((order) => order.status === '已付款').length;
  const latestOrder = [...orders].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0];

  return (
    <section className="mt-5 rounded-2xl border border-[#66c0f433] bg-[#132434] p-4">
      <p className="text-xs font-bold tracking-[0.14em] text-[#8fb8d5]">MY ACTION ITEMS</p>
      <h2 className="mt-2 text-xl font-black text-[#d8e6f3]">我的訂單待辦</h2>
      <p className="mt-1 text-sm text-[#9eb4c8]">先處理未付款與付款失敗訂單，避免流程中斷。</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="待付款" value={`${unpaidCount} 筆`} highlight={unpaidCount > 0} />
        <SummaryCard label="付款失敗" value={`${failedCount} 筆`} danger={failedCount > 0} />
        <SummaryCard label="已完成付款" value={`${paidCount} 筆`} />
        <SummaryCard
          label="最近一筆狀態"
          value={latestOrder ? latestOrder.status : '尚無訂單'}
        />
      </div>
    </section>
  );
}

function SummaryCard({
  label,
  value,
  highlight = false,
  danger = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  danger?: boolean;
}) {
  const textClass = danger
    ? 'text-[#ff9e9e]'
    : highlight
      ? 'text-[#ffcf5a]'
      : 'text-[#d8e6f3]';

  return (
    <div className="rounded-lg border border-[#66c0f433] bg-[#102131] p-3">
      <p className="text-xs text-[#8faac0]">{label}</p>
      <p className={`mt-1 text-lg font-black ${textClass}`}>{value}</p>
    </div>
  );
}

