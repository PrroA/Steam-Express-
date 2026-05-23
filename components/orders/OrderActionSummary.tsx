import type { Order } from '../../types/domain';
import { ORDER_STATUS, getOrderStatusLabel } from '../../utils/orderStatus';

interface OrderActionSummaryProps {
  orders: Order[];
}

export function OrderActionSummary({ orders }: OrderActionSummaryProps) {
  const unpaidCount = orders.filter((order) => order.status === ORDER_STATUS.PENDING).length;
  const failedCount = orders.filter((order) => order.status === ORDER_STATUS.PAYMENT_FAILED).length;
  const paidCount = orders.filter((order) => order.status === ORDER_STATUS.PAID).length;
  const latestOrder = [...orders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  return (
    <section className="mt-5 rounded-2xl border border-[#66c0f433] bg-[#132434] p-4">
      <p className="text-xs font-bold tracking-[0.14em] text-[#8fb8d5]">待處理事項</p>
      <h2 className="mt-2 text-xl font-black text-[#d8e6f3]">你的訂單概況</h2>
      <p className="mt-1 text-sm text-[#9eb4c8]">
        先處理待付款或付款未成功的訂單，完成後即可在訂單列表追蹤狀態。
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="待付款" value={`${unpaidCount} 筆`} highlight={unpaidCount > 0} />
        <SummaryCard label="付款未成功" value={`${failedCount} 筆`} danger={failedCount > 0} />
        <SummaryCard label="付款完成" value={`${paidCount} 筆`} />
        <SummaryCard label="最新訂單" value={latestOrder ? getOrderStatusLabel(latestOrder.status) : '尚無訂單'} />
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
  const textClass = danger ? 'text-[#ff9e9e]' : highlight ? 'text-[#ffcf5a]' : 'text-[#d8e6f3]';

  return (
    <div className="rounded-lg border border-[#66c0f433] bg-[#102131] p-3">
      <p className="text-xs text-[#8faac0]">{label}</p>
      <p className={`mt-1 text-lg font-black ${textClass}`}>{value}</p>
    </div>
  );
}
