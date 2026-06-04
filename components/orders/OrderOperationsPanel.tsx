import Link from 'next/link';
import type { Order } from '../../types/domain';
import {
  FULFILLMENT_STATUS,
  ORDER_STATUS,
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

interface OrderOperationsPanelProps {
  orders: Order[];
  selectedOrder: Order | null;
  onSelectOrderById: (orderId: string) => void;
  onReorder: (orderId: string) => void;
  onCancelOrder: () => void;
  onRefundOrder: () => void;
  onRetryOrder: () => void;
  isOperating: boolean;
  operatingType: 'cancel' | 'refund' | 'retry' | null;
  reorderingOrderId?: string | null;
}

export function OrderOperationsPanel({
  orders,
  selectedOrder,
  onSelectOrderById,
  onReorder,
  onCancelOrder,
  onRefundOrder,
  onRetryOrder,
  isOperating,
  operatingType,
  reorderingOrderId,
}: OrderOperationsPanelProps) {
  return (
    <div className="steam-panel rounded-2xl border border-[#66c0f433] p-5">
      <h2 className="text-xl font-black text-[#d8e6f3]">目前選取的訂單</h2>

      {orders.length === 0 ? (
        <div className="mt-4 rounded-lg border border-[#66c0f433] bg-[#132434] p-4">
          <p className="text-base font-bold text-[#d8e6f3]">目前還沒有訂單</p>
          <p className="mt-2 text-sm leading-6 text-[#9eb4c8]">
            先到商店挑一款遊戲加入購物車，完成結帳後就能在這裡付款與追蹤狀態。
          </p>
          <Link href="/" className="steam-btn mt-4 inline-flex rounded-md px-4 py-2 text-sm">
            回到商店
          </Link>
        </div>
      ) : (
        <>
          <label className="mt-4 block text-sm text-[#9eb4c8]">選擇訂單</label>
          <select
            value={selectedOrder?.id || ''}
            onChange={(event) => onSelectOrderById(event.target.value)}
            disabled={isOperating}
            className="mt-2 w-full rounded-md border border-[#66c0f444] bg-[#162737] px-3 py-2 text-sm text-[#d8e6f3] focus:border-[#66c0f4aa] focus:outline-none"
          >
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                訂單 {order.id.slice(0, 8)}... | ${order.total.toFixed(2)} | {getOrderStatusLabel(order.status)}
              </option>
            ))}
          </select>

          <div className="mt-4 rounded-lg border border-[#66c0f433] bg-[#132434] p-4">
            <p className="text-xs text-[#9eb4c8]">應付金額</p>
            <p className="mt-1 text-3xl font-black text-[#8bc53f]">
              ${selectedOrder?.total?.toFixed(2) || '0.00'}
            </p>
            <p className="mt-2 text-xs text-[#9eb4c8]">
              訂單狀態
              <span
                className={`ml-2 inline-flex rounded-md border px-2 py-0.5 text-[11px] font-bold ${statusBadgeClass(
                  selectedOrder?.status
                )}`}
              >
                {getOrderStatusLabel(selectedOrder?.status)}
              </span>
            </p>
            <p className="mt-2 text-xs text-[#9eb4c8]">
              出貨狀態
              <span
                className={`ml-2 inline-flex rounded-md border px-2 py-0.5 text-[11px] font-bold ${fulfillmentBadgeClass(
                  selectedOrder?.fulfillmentStatus
                )}`}
              >
                {getFulfillmentStatusLabel(selectedOrder?.fulfillmentStatus)}
              </span>
            </p>
            <p className="mt-2 text-xs text-[#8faac0]">
              建立時間：{selectedOrder?.date ? new Date(selectedOrder.date).toLocaleString() : '尚無時間'}
            </p>
            {(selectedOrder?.customerInfo?.fullName ||
              selectedOrder?.customerInfo?.phone ||
              selectedOrder?.customerInfo?.contactEmail ||
              selectedOrder?.customerInfo?.shippingAddress) && (
              <div className="mt-3 space-y-1 border-t border-[#66c0f433] pt-2 text-xs text-[#9eb4c8]">
                {selectedOrder?.customerInfo?.fullName && <p>收件人：{selectedOrder.customerInfo.fullName}</p>}
                {selectedOrder?.customerInfo?.phone && <p>電話：{selectedOrder.customerInfo.phone}</p>}
                {selectedOrder?.customerInfo?.contactEmail && (
                  <p>Email：{selectedOrder.customerInfo.contactEmail}</p>
                )}
                {selectedOrder?.customerInfo?.shippingAddress && (
                  <p>地址：{selectedOrder.customerInfo.shippingAddress}</p>
                )}
                {selectedOrder?.shippingDetails?.trackingNumber && (
                  <p>物流單號：{selectedOrder.shippingDetails.trackingNumber}</p>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => selectedOrder?.id && onReorder(selectedOrder.id)}
              disabled={isOperating || !selectedOrder || Boolean(reorderingOrderId)}
              className="rounded-md border border-[#8bc53f66] bg-[#233a2a] px-3 py-2 text-sm font-semibold text-[#d6ecb2] transition hover:bg-[#2d4a35] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {reorderingOrderId && selectedOrder?.id === reorderingOrderId ? '加入中...' : '再買一次'}
            </button>
            <button
              type="button"
              onClick={onCancelOrder}
              disabled={
                isOperating ||
                !selectedOrder ||
                !([ORDER_STATUS.PENDING, ORDER_STATUS.PAYMENT_FAILED] as Array<Order['status']>).includes(
                  selectedOrder.status
                )
              }
              className="rounded-md border border-[#ff9f9f55] bg-[#4a202a] px-3 py-2 text-sm font-semibold text-[#ffd6d6] transition hover:bg-[#66303c] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {operatingType === 'cancel' ? '取消中...' : '取消訂單'}
            </button>
            <button
              type="button"
              onClick={onRefundOrder}
              disabled={isOperating || !selectedOrder || selectedOrder.status !== ORDER_STATUS.PAID}
              className="rounded-md border border-[#66c0f455] bg-[#1b2f44] px-3 py-2 text-sm font-semibold text-[#d8e6f3] transition hover:bg-[#24384d] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {operatingType === 'refund' ? '退款中...' : '申請退款'}
            </button>
            <button
              type="button"
              onClick={onRetryOrder}
              disabled={isOperating || !selectedOrder || selectedOrder.status !== ORDER_STATUS.PAYMENT_FAILED}
              className="rounded-md border border-[#66c0f455] bg-[#193142] px-3 py-2 text-sm font-semibold text-[#d8e6f3] transition hover:bg-[#24445a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {operatingType === 'retry' ? '準備中...' : '重新付款'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
