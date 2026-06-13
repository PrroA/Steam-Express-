import { useEffect, useState } from 'react';
import type { AdminOrder } from '../../services/adminService';
import {
  FULFILLMENT_STATUS,
  FULFILLMENT_STATUS_OPTIONS,
  ORDER_STATUS_OPTIONS,
  getFulfillmentStatusLabel,
  getOrderStatusLabel,
} from '../../utils/adminUtils';

export function OrderManagementPanel({
  orders,
  onUpdateStatus,
  onUpdateFulfillmentStatus,
  onUpdateShippingDetails,
}: {
  orders: AdminOrder[];
  onUpdateStatus: (orderId: string, status: AdminOrder['status']) => void;
  onUpdateFulfillmentStatus: (
    orderId: string,
    fulfillmentStatus: AdminOrder['fulfillmentStatus']
  ) => void;
  onUpdateShippingDetails: (
    orderId: string,
    payload: { carrier?: string; trackingNumber?: string }
  ) => void;
}) {
  return (
    <div className="steam-panel mt-5 rounded-2xl p-6">
      <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <h2 className="text-xl font-black text-[#d8e6f3]">訂單管理</h2>
        <p className="text-xs text-[#8faac0]">共 {orders.length} 筆訂單</p>
      </div>
      <div className="mt-4 space-y-3">
        {orders.length === 0 ? (
          <div className="rounded-lg border border-[#66c0f433] bg-[#132434] p-5 text-sm text-[#9eb4c8]">
            目前還沒有訂單。完成一次結帳後，這裡會顯示訂單資料。
          </div>
        ) : (
          orders.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              onUpdateStatus={onUpdateStatus}
              onUpdateFulfillmentStatus={onUpdateFulfillmentStatus}
              onUpdateShippingDetails={onUpdateShippingDetails}
            />
          ))
        )}
      </div>
    </div>
  );
}

function OrderRow({
  order,
  onUpdateStatus,
  onUpdateFulfillmentStatus,
  onUpdateShippingDetails,
}: {
  order: AdminOrder;
  onUpdateStatus: (orderId: string, status: AdminOrder['status']) => void;
  onUpdateFulfillmentStatus: (
    orderId: string,
    fulfillmentStatus: AdminOrder['fulfillmentStatus']
  ) => void;
  onUpdateShippingDetails: (
    orderId: string,
    payload: { carrier?: string; trackingNumber?: string }
  ) => void;
}) {
  const [carrier, setCarrier] = useState(order.shippingDetails?.carrier || '');
  const [trackingNumber, setTrackingNumber] = useState(order.shippingDetails?.trackingNumber || '');

  useEffect(() => {
    setCarrier(order.shippingDetails?.carrier || '');
    setTrackingNumber(order.shippingDetails?.trackingNumber || '');
  }, [order.id, order.shippingDetails?.carrier, order.shippingDetails?.trackingNumber]);

  return (
    <div className="rounded-lg border border-[#66c0f433] bg-[#132434] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-bold text-[#d8e6f3]">訂單 {order.id.slice(0, 8)}...</p>
          <p className="text-xs text-[#8fb8d5]">
            使用者 #{order.userId} · ${order.total.toFixed(2)} · {getOrderStatusLabel(order.status)}
          </p>
          <p className="text-xs text-[#9eb4c8]">
            出貨狀態：{getFulfillmentStatusLabel(order.fulfillmentStatus)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={order.status}
            onChange={(event) => onUpdateStatus(order.id, event.target.value as AdminOrder['status'])}
            className="rounded-md border border-[#66c0f444] bg-[#162737] px-3 py-2 text-xs text-[#d8e6f3] focus:border-[#66c0f4aa] focus:outline-none"
          >
            {ORDER_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {getOrderStatusLabel(status)}
              </option>
            ))}
          </select>
          <select
            value={order.fulfillmentStatus || FULFILLMENT_STATUS.PENDING_SHIPMENT}
            onChange={(event) =>
              onUpdateFulfillmentStatus(order.id, event.target.value as AdminOrder['fulfillmentStatus'])
            }
            className="rounded-md border border-[#66c0f444] bg-[#162737] px-3 py-2 text-xs text-[#d8e6f3] focus:border-[#66c0f4aa] focus:outline-none"
          >
            {FULFILLMENT_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {getFulfillmentStatusLabel(status)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[120px_1fr_auto]">
        <input
          type="text"
          value={carrier}
          onChange={(event) => setCarrier(event.target.value)}
          placeholder="物流商"
          className="rounded-md border border-[#66c0f444] bg-[#162737] px-3 py-2 text-xs text-[#d8e6f3] focus:border-[#66c0f4aa] focus:outline-none"
        />
        <input
          type="text"
          value={trackingNumber}
          onChange={(event) => setTrackingNumber(event.target.value)}
          placeholder="追蹤編號"
          className="rounded-md border border-[#66c0f444] bg-[#162737] px-3 py-2 text-xs text-[#d8e6f3] focus:border-[#66c0f4aa] focus:outline-none"
        />
        <button
          onClick={() => onUpdateShippingDetails(order.id, { carrier, trackingNumber })}
          className="rounded-md border border-[#66c0f455] bg-[#1b2f44] px-3 py-2 text-xs font-semibold text-[#d8e6f3] transition hover:bg-[#24384d]"
        >
          更新配送
        </button>
      </div>

      {(order.shippingDetails?.shippedAt || order.shippingDetails?.deliveredAt) && (
        <div className="mt-2 text-xs text-[#8faac0]">
          {order.shippingDetails?.shippedAt && (
            <p>出貨時間：{new Date(order.shippingDetails.shippedAt).toLocaleString()}</p>
          )}
          {order.shippingDetails?.deliveredAt && (
            <p>送達時間：{new Date(order.shippingDetails.deliveredAt).toLocaleString()}</p>
          )}
        </div>
      )}
    </div>
  );
}
