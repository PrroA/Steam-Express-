interface OrderStatsProps {
  stats: {
    totalOrders: number;
    paidCount: number;
    unpaidCount: number;
    failedCount: number;
    paidRevenue: number;
  };
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#66c0f433] bg-[#102131] p-3">
      <p className="text-xs text-[#8faac0]">{label}</p>
      <p className="mt-1 text-lg font-black text-[#d8e6f3]">{value}</p>
    </div>
  );
}

export function OrderStats({ stats }: OrderStatsProps) {
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <StatCard label="總訂單數" value={`${stats.totalOrders} 筆`} />
      <StatCard label="已付款" value={`${stats.paidCount} 筆`} />
      <StatCard label="待付款" value={`${stats.unpaidCount} 筆`} />
      <StatCard label="付款失敗" value={`${stats.failedCount} 筆`} />
      <StatCard label="已收款總額" value={`$${stats.paidRevenue.toFixed(2)}`} />
    </div>
  );
}
