import type { Order } from '../../types/domain';
import { statusBadgeClass } from './statusStyles';

const fulfillmentClasses = {
  待出貨: 'bg-[#2f3b4a] text-[#9eb4c8] border-[#9eb4c855]',
  已出貨: 'bg-[#1f3550] text-[#8fd1ff] border-[#8fd1ff55]',
  已送達: 'bg-[#1f3b2a] text-[#8bc53f] border-[#8bc53f55]',
};

function fulfillmentBadgeClass(status?: Order['fulfillmentStatus']) {
  if (!status) return fulfillmentClasses.待出貨;
  return fulfillmentClasses[status] || fulfillmentClasses.待出貨;
}

interface OrderOperationsPanelProps {
  orders: Order[];
  selectedOrder: Order | null;
  onSelectOrderById: (orderId: string) => void;
  onCancelOrder: () => void;
  onRefundOrder: () => void;
  onRetryOrder: () => void;
  onSimulateFailure: () => void;
}

export function OrderOperationsPanel({
  orders,
  selectedOrder,
  onSelectOrderById,
  onCancelOrder,
  onRefundOrder,
  onRetryOrder,
  onSimulateFailure,
}: OrderOperationsPanelProps) {
  return (
    <div className="steam-panel rounded-2xl border border-[#66c0f433] p-5">
      <h2 className="text-xl font-black text-[#d8e6f3]">訂單操作台</h2>

      {orders.length === 0 ? (
        <p className="mt-4 rounded-lg border border-[#66c0f433] bg-[#132434] p-4 text-sm text-[#9eb4c8]">
          目前沒有訂單，先到購物車建立新訂單。
        </p>
      ) : (
        <>
          <label className="mt-4 block text-sm text-[#9eb4c8]">要付款的訂單</label>
          <select
            value={selectedOrder?.id || ''}
            onChange={(e) => onSelectOrderById(e.target.value)}
            className="mt-2 w-full rounded-md border border-[#66c0f444] bg-[#162737] px-3 py-2 text-sm text-[#d8e6f3] focus:border-[#66c0f4aa] focus:outline-none"
          >
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                訂單 {order.id.slice(0, 8)}... | ${order.total.toFixed(2)} | {order.status}
              </option>
            ))}
          </select>

          <div className="mt-4 rounded-lg border border-[#66c0f433] bg-[#132434] p-4">
            <p className="text-xs text-[#9eb4c8]">付款總額</p>
            <p className="mt-1 text-3xl font-black text-[#8bc53f]">
              ${selectedOrder?.total?.toFixed(2) || '0.00'}
            </p>
            <p className="mt-2 text-xs text-[#9eb4c8]">
              訂單狀態：
              <span
                className={`ml-2 inline-flex rounded-md border px-2 py-0.5 text-[11px] font-bold ${statusBadgeClass(
                  selectedOrder?.status
                )}`}
              >
                {selectedOrder?.status || 'N/A'}
              </span>
            </p>
            <p className="mt-2 text-xs text-[#9eb4c8]">
              出貨狀態：
              <span
                className={`ml-2 inline-flex rounded-md border px-2 py-0.5 text-[11px] font-bold ${fulfillmentBadgeClass(
                  selectedOrder?.fulfillmentStatus
                )}`}
              >
                {selectedOrder?.fulfillmentStatus || '待出貨'}
              </span>
            </p>
            <p className="mt-2 text-xs text-[#8faac0]">
              建立時間：{selectedOrder?.date ? new Date(selectedOrder.date).toLocaleString() : 'N/A'}
            </p>
            {(selectedOrder?.customerInfo?.fullName ||
              selectedOrder?.customerInfo?.phone ||
              selectedOrder?.customerInfo?.contactEmail ||
              selectedOrder?.customerInfo?.shippingAddress) && (
              <div className="mt-3 space-y-1 border-t border-[#66c0f433] pt-2 text-xs text-[#9eb4c8]">
                {selectedOrder?.customerInfo?.fullName && (
                  <p>收件人：{selectedOrder.customerInfo.fullName}</p>
                )}
                {selectedOrder?.customerInfo?.phone && <p>電話：{selectedOrder.customerInfo.phone}</p>}
                {selectedOrder?.customerInfo?.contactEmail && (
                  <p>Email：{selectedOrder.customerInfo.contactEmail}</p>
                )}
                {selectedOrder?.customerInfo?.shippingAddress && (
                  <p>地址：{selectedOrder.customerInfo.shippingAddress}</p>
                )}
                {selectedOrder?.shippingDetails?.trackingNumber && (
                  <p>
                    追蹤碼：
                    {selectedOrder.shippingDetails.trackingNumber}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              onClick={onCancelOrder}
              disabled={!selectedOrder || !['未付款', '付款失敗'].includes(selectedOrder.status)}
              className="rounded-md border border-[#ff9f9f55] bg-[#4a202a] px-3 py-2 text-sm font-semibold text-[#ffd6d6] transition hover:bg-[#66303c] disabled:cursor-not-allowed disabled:opacity-50"
            >
              取消訂單
            </button>
            <button
              onClick={onRefundOrder}
              disabled={!selectedOrder || selectedOrder.status !== '已付款'}
              className="rounded-md border border-[#66c0f455] bg-[#1b2f44] px-3 py-2 text-sm font-semibold text-[#d8e6f3] transition hover:bg-[#24384d] disabled:cursor-not-allowed disabled:opacity-50"
            >
              退款
            </button>
            <button
              onClick={onRetryOrder}
              disabled={!selectedOrder || selectedOrder.status !== '付款失敗'}
              className="rounded-md border border-[#66c0f455] bg-[#193142] px-3 py-2 text-sm font-semibold text-[#d8e6f3] transition hover:bg-[#24445a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              重新付款
            </button>
            <button
              onClick={onSimulateFailure}
              disabled={!selectedOrder || selectedOrder.status !== '未付款'}
              className="rounded-md border border-[#ffcf5a55] bg-[#3f3318] px-3 py-2 text-sm font-semibold text-[#ffe0a6] transition hover:bg-[#524423] disabled:cursor-not-allowed disabled:opacity-50"
            >
              模擬付款失敗
            </button>
          </div>
        </>
      )}
    </div>
  );
}
