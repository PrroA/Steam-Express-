import type { Order } from '../../types/domain';
import {
  FULFILLMENT_STATUS,
  getFulfillmentStatusLabel,
  getOrderStatusLabel,
  normalizeFulfillmentStatus,
} from '../../utils/orderStatus';
import { statusBadgeClass } from './statusStyles';

const fulfillmentClasses = {
  [FULFILLMENT_STATUS.PENDING_SHIPMENT]: 'bg-[#2f3b4a] text-[#9eb4c8] border-[#9eb4c855]',
  [FULFILLMENT_STATUS.SHIPPED]: 'bg-[#1f3550] text-[#8fd1ff] border-[#8fd1ff55]',
  [FULFILLMENT_STATUS.DELIVERED]: 'bg-[#1f3b2a] text-[#8bc53f] border-[#8bc53f55]',
};

function fulfillmentBadgeClass(status?: Order['fulfillmentStatus']) {
  return fulfillmentClasses[normalizeFulfillmentStatus(status)];
}

interface OrderListProps {
  orders: Order[];
  selectedOrderId?: string;
  onSelectOrder: (order: Order) => void;
  onViewOrderDetail: (orderId: string) => void;
  onReorder: (orderId: string) => void;
  reorderingOrderId?: string | null;
  focusOrderId?: string | null;
}

export function OrderList({
  orders,
  selectedOrderId,
  onSelectOrder,
  onViewOrderDetail,
  onReorder,
  reorderingOrderId,
  focusOrderId,
}: OrderListProps) {
  if (orders.length === 0) return null;

  return (
    <div className="steam-panel mt-5 rounded-2xl border border-[#66c0f433] p-5">
      <h2 className="text-xl font-black text-[#d8e6f3]">訂單列表</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {orders.map((order) => {
          const latestStatus = order.statusHistory?.[order.statusHistory.length - 1];
          return (
            <article
              key={order.id}
              id={`order-card-${order.id}`}
              className={`rounded-xl border p-4 transition ${
                selectedOrderId === order.id ? 'border-[#66c0f4] bg-[#173247]' : 'border-[#66c0f433] bg-[#132434]'
              } ${focusOrderId === order.id ? 'animate-pulse ring-2 ring-[#66c0f477] ring-offset-0' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-[#d8e6f3]">訂單 {order.id.slice(0, 8)}...</p>
                  <p className="mt-1 text-xs text-[#8faac0]">{new Date(order.date).toLocaleString()}</p>
                </div>
                <span
                  className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-bold ${statusBadgeClass(
                    order.status
                  )}`}
                >
                  {getOrderStatusLabel(order.status)}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-[#9eb4c8]">金額</span>
                <span className="font-black text-[#8bc53f]">${order.total.toFixed(2)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-[#9eb4c8]">
                <span>商品</span>
                <span>{order.items.reduce((sum, item) => sum + (item.quantity || 0), 0)} 件</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-[#9eb4c8]">
                <span>出貨</span>
                <span
                  className={`inline-flex rounded-md border px-2 py-0.5 font-bold ${fulfillmentBadgeClass(
                    order.fulfillmentStatus
                  )}`}
                >
                  {getFulfillmentStatusLabel(order.fulfillmentStatus)}
                </span>
              </div>

              <div className="mt-3 rounded-md border border-[#66c0f433] bg-[#102131] p-2 text-xs">
                <p className="text-[#8fb8d5]">最近更新</p>
                <p className="mt-1 text-[#d8e6f3]">{getOrderStatusLabel(latestStatus?.status)}</p>
                <p className="mt-0.5 text-[#8faac0]">
                  {latestStatus?.at ? new Date(latestStatus.at).toLocaleString() : '尚無更新時間'}
                </p>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => onSelectOrder(order)}
                  className="rounded-md border border-[#66c0f455] bg-[#1b2f44] px-3 py-2 text-xs font-semibold text-[#d8e6f3] transition hover:bg-[#24384d]"
                >
                  選擇
                </button>
                <button
                  type="button"
                  onClick={() => onViewOrderDetail(order.id)}
                  className="rounded-md border border-[#66c0f455] bg-[#162839] px-3 py-2 text-xs font-semibold text-[#d8e6f3] transition hover:bg-[#24384d]"
                >
                  詳細
                </button>
                <button
                  type="button"
                  onClick={() => onReorder(order.id)}
                  disabled={Boolean(reorderingOrderId)}
                  className="rounded-md border border-[#8bc53f66] bg-[#233a2a] px-3 py-2 text-xs font-semibold text-[#d6ecb2] transition hover:bg-[#2d4a35] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {reorderingOrderId === order.id ? '加入中...' : '再次購買'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
