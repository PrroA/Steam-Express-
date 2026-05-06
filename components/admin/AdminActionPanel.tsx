import type { AdminDashboard, AdminOrder } from '../../services/adminService';
import type { Game } from '../../types/domain';

interface AdminActionPanelProps {
  dashboard: AdminDashboard | null;
  orders: AdminOrder[];
  games: Game[];
}

function formatOrderTime(value?: string) {
  if (!value) return '時間未知';
  return new Date(value).toLocaleString();
}

export function AdminActionPanel({ dashboard, orders, games }: AdminActionPanelProps) {
  const pendingPaymentOrders = orders.filter((order) => order.status === '未付款');
  const failedPaymentOrders = orders.filter((order) => order.status === '付款失敗');
  const paidWaitingShipmentOrders = orders.filter(
    (order) => order.status === '已付款' && (order.fulfillmentStatus || '待出貨') === '待出貨'
  );
  const inactiveGames = games.filter((game) => game.isActive === false);
  const lowStockItems = dashboard?.lowStockGames?.flatMap((game) =>
    game.variants.map((variant) => ({
      gameId: game.id,
      gameName: game.name,
      variantName: variant.name,
      stock: variant.stock,
    }))
  ) || [];

  const recentOrders = orders.slice(0, 3);

  return (
    <section className="steam-panel mt-5 rounded-2xl p-5 md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-[#8fb8d5]">營運待辦</p>
          <h2 className="mt-1 text-xl font-black text-[#d8e6f3]">今日需要注意的項目</h2>
        </div>
        <p className="text-xs text-[#8faac0]">依照目前訂單與商品庫存即時整理</p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <StatusTile label="待付款訂單" value={pendingPaymentOrders.length + failedPaymentOrders.length} tone="warn" />
        <StatusTile label="待出貨訂單" value={paidWaitingShipmentOrders.length} tone="info" />
        <StatusTile label="低庫存版本" value={lowStockItems.length} tone="danger" />
        <StatusTile label="下架商品" value={inactiveGames.length} tone="muted" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-xl border border-[#66c0f433] bg-[#122333] p-4">
          <h3 className="text-sm font-black text-[#d8e6f3]">訂單處理</h3>
          <div className="mt-3 space-y-3">
            {paidWaitingShipmentOrders.length > 0 ? (
              paidWaitingShipmentOrders.slice(0, 3).map((order) => (
                <div key={order.id} className="rounded-md border border-[#66c0f433] bg-[#102131] p-3">
                  <p className="text-sm font-bold text-[#d8e6f3]">訂單 {order.id.slice(0, 8)}...</p>
                  <p className="mt-1 text-xs text-[#9eb4c8]">
                    User #{order.userId} · ${order.total.toFixed(2)} · {formatOrderTime(order.date)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[#8fd1ff]">建議：補上物流資訊並更新出貨狀態</p>
                </div>
              ))
            ) : (
              <p className="rounded-md border border-[#66c0f433] bg-[#102131] p-3 text-sm text-[#9eb4c8]">
                目前沒有待出貨訂單。
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[#66c0f433] bg-[#122333] p-4">
          <h3 className="text-sm font-black text-[#d8e6f3]">商品庫存</h3>
          <div className="mt-3 space-y-3">
            {lowStockItems.length > 0 ? (
              lowStockItems.slice(0, 4).map((item) => (
                <div key={`${item.gameId}-${item.variantName}`} className="rounded-md border border-[#ffcf5a55] bg-[#2c2617] p-3">
                  <p className="text-sm font-bold text-[#ffe0a6]">{item.gameName}</p>
                  <p className="mt-1 text-xs text-[#f0c674]">
                    {item.variantName} 剩餘 {item.stock} 份
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-md border border-[#66c0f433] bg-[#102131] p-3 text-sm text-[#9eb4c8]">
                目前沒有低庫存版本。
              </p>
            )}
          </div>
        </div>
      </div>

      {recentOrders.length > 0 && (
        <div className="mt-4 rounded-xl border border-[#66c0f433] bg-[#122333] p-4">
          <h3 className="text-sm font-black text-[#d8e6f3]">最近訂單</h3>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {recentOrders.map((order) => (
              <div key={order.id} className="rounded-md border border-[#66c0f433] bg-[#102131] p-3">
                <p className="text-sm font-bold text-[#d8e6f3]">{order.id.slice(0, 8)}...</p>
                <p className="mt-1 text-xs text-[#9eb4c8]">
                  {order.status} · ${order.total.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function StatusTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'warn' | 'info' | 'danger' | 'muted';
}) {
  const toneClass = {
    warn: 'border-[#ffcf5a55] bg-[#2c2617] text-[#ffe0a6]',
    info: 'border-[#66c0f455] bg-[#123047] text-[#8fd1ff]',
    danger: 'border-[#ff9f9f55] bg-[#3a1f28] text-[#ffd6d6]',
    muted: 'border-[#66c0f433] bg-[#102131] text-[#d8e6f3]',
  }[tone];

  return (
    <article className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="text-xs opacity-80">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
    </article>
  );
}
