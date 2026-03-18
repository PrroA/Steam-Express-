import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FaCheckCircle, FaClock, FaTimesCircle, FaUndoAlt } from 'react-icons/fa';
import { fetchOrderById, reorderOrder } from '../../services/orderService';
import type { Order } from '../../types/domain';
import { toast } from 'react-toastify';

const statusClasses = {
  已付款: 'bg-[#1f3b2a] text-[#8bc53f] border-[#8bc53f55]',
  未付款: 'bg-[#3f3318] text-[#ffd079] border-[#ffd07955]',
  付款失敗: 'bg-[#4a202a] text-[#ff9e9e] border-[#ff9e9e55]',
  已取消: 'bg-[#2d3642] text-[#9fb4c6] border-[#9fb4c655]',
  已退款: 'bg-[#22384a] text-[#9ed8ff] border-[#9ed8ff55]',
};

const fulfillmentClasses = {
  待出貨: 'bg-[#2f3b4a] text-[#9eb4c8] border-[#9eb4c855]',
  已出貨: 'bg-[#1f3550] text-[#8fd1ff] border-[#8fd1ff55]',
  已送達: 'bg-[#1f3b2a] text-[#8bc53f] border-[#8bc53f55]',
};

function statusBadgeClass(status: Order['status']) {
  return statusClasses[status] || 'bg-[#2d3642] text-[#9fb4c6] border-[#9fb4c655]';
}

function fulfillmentBadgeClass(status?: Order['fulfillmentStatus']) {
  if (!status) return fulfillmentClasses.待出貨;
  return fulfillmentClasses[status] || fulfillmentClasses.待出貨;
}

function statusNodeStyle(status: Order['status']) {
  if (status === '已付款') return { dot: 'bg-[#8bc53f]', line: 'bg-[#8bc53f66]', icon: FaCheckCircle };
  if (status === '未付款') return { dot: 'bg-[#ffd079]', line: 'bg-[#ffd07966]', icon: FaClock };
  if (status === '付款失敗') return { dot: 'bg-[#ff8d8d]', line: 'bg-[#ff8d8d66]', icon: FaTimesCircle };
  return { dot: 'bg-[#8fb8d5]', line: 'bg-[#8fb8d566]', icon: FaUndoAlt };
}

export default function OrderDetail() {
  const router = useRouter();
  const { orderId: rawOrderId } = router.query;
  const orderId = Array.isArray(rawOrderId) ? rawOrderId[0] : rawOrderId;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadOrder = async () => {
      const token = localStorage.getItem('token');
      try {
        const data = await fetchOrderById(orderId, token);
        setOrder(data);
        setErrorMessage('');
      } catch (error) {
        const message = error instanceof Error ? error.message : '未知錯誤';
        console.error('無法獲取訂單詳情:', message);
        setErrorMessage('目前無法取得訂單詳情，請稍後再試。');
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  const totalItems = useMemo(
    () => (order?.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0),
    [order]
  );

  const handleReorder = async () => {
    if (!order?.id) return;
    const token = localStorage.getItem('token');
    try {
      const result = await reorderOrder(order.id, token);
      if (result.skipped?.length) {
        toast.info(`已加入 ${result.addedCount} 項，${result.skipped.length} 項略過`);
      } else {
        toast.success('商品已加入購物車');
      }
      router.push('/cart');
    } catch (error) {
      const message = error instanceof Error ? error.message : '再買一次失敗';
      toast.error(message);
    }
  };

  if (loading) {
    return (
      <main className="steam-shell flex min-h-screen items-center justify-center px-4 py-10">
        <div className="steam-panel w-full max-w-xl rounded-2xl p-10 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#66c0f4] border-t-transparent" />
          <p className="mt-4 text-sm text-[#9eb4c8]">載入訂單詳情中...</p>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="steam-shell flex min-h-screen items-center justify-center px-4 py-10">
        <div className="steam-panel w-full max-w-xl rounded-2xl p-8 text-center">
          <p className="text-2xl font-black text-[#ff9e9e]">未找到訂單</p>
          <p className="mt-2 text-sm text-[#9eb4c8]">{errorMessage || '請確認訂單 ID 是否正確。'}</p>
          <Link href="/orders" className="steam-btn mt-5 inline-flex rounded-md px-5 py-2 text-sm">
            返回結帳頁
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="steam-shell px-4 py-6 md:px-6">
      <section className="mx-auto w-full max-w-6xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <Link href="/orders" className="text-sm text-[#8fb8d5] transition hover:text-[#66c0f4]">
            ← 返回結帳與付款
          </Link>
          <button
            onClick={() => router.push('/')}
            className="rounded-md border border-[#66c0f455] bg-[#1b2f44] px-4 py-2 text-sm font-semibold text-[#d8e6f3] transition hover:bg-[#24384d]"
          >
            返回商店
          </button>
          <button
            onClick={handleReorder}
            className="rounded-md border border-[#8bc53f66] bg-[#233a2a] px-4 py-2 text-sm font-semibold text-[#d6ecb2] transition hover:bg-[#2d4a35]"
          >
            再買一次
          </button>
        </div>

        <div className="steam-panel rounded-2xl p-5 md:p-6">
          <h1 className="text-3xl font-black text-[#d8e6f3]">訂單詳情</h1>
          <p className="mt-1 text-sm text-[#9eb4c8]">訂單編號：{order.id}</p>

          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-[#66c0f433] bg-[#132434] p-4">
              <p className="text-xs text-[#9eb4c8]">訂單狀態</p>
              <p className="mt-2">
                <span
                  className={`inline-flex rounded-md border px-3 py-1 text-sm font-bold ${statusBadgeClass(
                    order.status
                  )}`}
                >
                {order.status}
                </span>
              </p>
            </div>
            <div className="rounded-xl border border-[#66c0f433] bg-[#132434] p-4">
              <p className="text-xs text-[#9eb4c8]">出貨狀態</p>
              <p className="mt-2">
                <span
                  className={`inline-flex rounded-md border px-3 py-1 text-sm font-bold ${fulfillmentBadgeClass(
                    order.fulfillmentStatus
                  )}`}
                >
                  {order.fulfillmentStatus || '待出貨'}
                </span>
              </p>
            </div>
            <div className="rounded-xl border border-[#66c0f433] bg-[#132434] p-4">
              <p className="text-xs text-[#9eb4c8]">商品數量</p>
              <p className="mt-1 text-2xl font-black text-[#d8e6f3]">{totalItems} 件</p>
            </div>
            <div className="rounded-xl border border-[#66c0f433] bg-[#132434] p-4">
              <p className="text-xs text-[#9eb4c8]">總金額</p>
              <p className="mt-1 text-2xl font-black text-[#8bc53f]">${order.total.toFixed(2)}</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-[#66c0f433] bg-[#132434] p-4 text-sm text-[#9eb4c8]">
            <p>下單時間：{new Date(order.date).toLocaleString()}</p>
            {(order.customerInfo?.fullName ||
              order.customerInfo?.phone ||
              order.customerInfo?.contactEmail ||
              order.customerInfo?.shippingAddress ||
              order.customerInfo?.paymentMethod ||
              order.customerInfo?.orderNote) && (
              <div className="mt-2 space-y-1 border-t border-[#66c0f433] pt-2">
                {order.customerInfo?.fullName && <p>收件人：{order.customerInfo.fullName}</p>}
                {order.customerInfo?.phone && <p>電話：{order.customerInfo.phone}</p>}
                {order.customerInfo?.contactEmail && <p>Email：{order.customerInfo.contactEmail}</p>}
                {order.customerInfo?.shippingAddress && <p>地址：{order.customerInfo.shippingAddress}</p>}
                {order.customerInfo?.paymentMethod && (
                  <p>
                    付款方式：
                    {order.customerInfo.paymentMethod === 'credit-card'
                      ? '信用卡'
                      : order.customerInfo.paymentMethod === 'line-pay'
                        ? 'LINE Pay'
                        : 'Steam 錢包'}
                  </p>
                )}
                {order.customerInfo?.orderNote && <p>備註：{order.customerInfo.orderNote}</p>}
              </div>
            )}
            {order.paymentDetails && (
              <div className="mt-2 space-y-1 border-t border-[#66c0f433] pt-2">
                <p>交易編號：{order.paymentDetails.transactionId}</p>
                <p>付款時間：{new Date(order.paymentDetails.paidAt).toLocaleString()}</p>
              </div>
            )}
            {(order.shippingDetails?.carrier ||
              order.shippingDetails?.trackingNumber ||
              order.shippingDetails?.shippedAt ||
              order.shippingDetails?.deliveredAt) && (
              <div className="mt-2 space-y-1 border-t border-[#66c0f433] pt-2">
                {order.shippingDetails?.carrier && <p>物流商：{order.shippingDetails.carrier}</p>}
                {order.shippingDetails?.trackingNumber && (
                  <p>追蹤碼：{order.shippingDetails.trackingNumber}</p>
                )}
                {order.shippingDetails?.shippedAt && (
                  <p>出貨時間：{new Date(order.shippingDetails.shippedAt).toLocaleString()}</p>
                )}
                {order.shippingDetails?.deliveredAt && (
                  <p>送達時間：{new Date(order.shippingDetails.deliveredAt).toLocaleString()}</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="steam-panel mt-5 rounded-2xl p-5 md:p-6">
          <h2 className="text-xl font-black text-[#d8e6f3]">商品明細</h2>
          <ul className="mt-4 space-y-3">
            {order.items.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-2 rounded-lg border border-[#66c0f433] bg-[#132434] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-bold text-[#d8e6f3]">{item.name}</p>
                  <p className="text-xs text-[#9eb4c8]">
                    單價 ${parseFloat(item.price.replace('$', '')).toFixed(2)} x {item.quantity}
                  </p>
                </div>
                <p className="text-sm font-black text-[#8bc53f]">
                  ${(parseFloat(item.price.replace('$', '')) * item.quantity).toFixed(2)}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="steam-panel mt-5 rounded-2xl p-5 md:p-6">
          <h2 className="text-xl font-black text-[#d8e6f3]">狀態時間軸</h2>
          <ul className="mt-4 space-y-2">
            {(order.statusHistory || []).length === 0 ? (
              <li className="rounded-lg border border-[#66c0f433] bg-[#132434] p-4 text-sm text-[#9eb4c8]">
                尚無狀態紀錄
              </li>
            ) : (
              order.statusHistory.map((event, index) => {
                const styles = statusNodeStyle(event.status);
                const Icon = styles.icon;
                const isLast = index === order.statusHistory.length - 1;
                return (
                  <li key={`${event.status}-${event.at}-${index}`} className="relative pl-9">
                    {!isLast && (
                      <span className={`absolute left-[13px] top-7 h-[calc(100%-8px)] w-[2px] ${styles.line}`} />
                    )}
                    <span
                      className={`absolute left-0 top-1 inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#ffffff22] ${styles.dot}`}
                    >
                      <Icon className="text-[12px] text-[#0f1822]" />
                    </span>
                    <div className="rounded-lg border border-[#66c0f433] bg-[#132434] p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-[#d8e6f3]">{event.status}</p>
                        <span
                          className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-bold ${statusBadgeClass(
                            event.status
                          )}`}
                        >
                          #{index + 1}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#8faac0]">{new Date(event.at).toLocaleString()}</p>
                      {event.note && <p className="mt-2 text-xs text-[#9eb4c8]">{event.note}</p>}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </section>
    </main>
  );
}
