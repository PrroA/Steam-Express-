import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { toast } from 'react-toastify';
import { FaCheckCircle } from 'react-icons/fa';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import {
  cancelOrder,
  createPaymentIntent,
  fetchOrders as fetchOrdersApi,
  payOrder,
  refundOrder,
  retryOrderPayment,
} from '../services/orderService';

ChartJS.register(ArcElement, Tooltip, Legend);

const stripePromise = loadStripe(
  'pk_test_51Qr9qRRoY6RFAeUcNUZyfm5avjM4YPtAQdKcYnwIKrv02R615cdGXbFdnx45lyY2jjmdS68rHoRbn6hWQmSgCVn100B820Z6iB'
);

const statusClasses = {
  已付款: 'bg-[#1f3b2a] text-[#8bc53f] border-[#8bc53f55]',
  未付款: 'bg-[#3f3318] text-[#ffd079] border-[#ffd07955]',
  付款失敗: 'bg-[#4a202a] text-[#ff9e9e] border-[#ff9e9e55]',
  已取消: 'bg-[#2d3642] text-[#9fb4c6] border-[#9fb4c655]',
  已退款: 'bg-[#22384a] text-[#9ed8ff] border-[#9ed8ff55]',
};

function statusBadgeClass(status) {
  return statusClasses[status] || 'bg-[#2d3642] text-[#9fb4c6] border-[#9fb4c655]';
}

export default function CheckoutPage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isPaymentSuccess = router.query.payment === 'success';
  const successOrderId = typeof router.query.orderId === 'string' ? router.query.orderId : '';

  const loadOrders = useCallback(async (preferredOrderId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const data = await fetchOrdersApi(token);
      setOrders(data);
      const preferredOrder =
        (preferredOrderId && data.find((order) => order.id === preferredOrderId)) || null;
      const unpaidOrder = data.find((order) => order.status === '未付款');
      setSelectedOrder(preferredOrder || unpaidOrder || data[0] || null);
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClientSecret = useCallback(async () => {
    if (!selectedOrder || selectedOrder.status !== '未付款') {
      setClientSecret(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await createPaymentIntent(selectedOrder.total);
      setClientSecret(data.clientSecret || null);
    } catch (fetchError) {
      setError(fetchError.message);
      setClientSecret(null);
    } finally {
      setLoading(false);
    }
  }, [selectedOrder]);

  useEffect(() => {
    if (!router.isReady) return;
    const preferredOrderId =
      typeof router.query.orderId === 'string' ? router.query.orderId : undefined;
    loadOrders(preferredOrderId);
  }, [loadOrders, router.isReady, router.query.orderId]);

  useEffect(() => {
    fetchClientSecret();
  }, [fetchClientSecret]);

  const chartData = useMemo(() => {
    const paidOrders = orders.filter((order) => order.status === '已付款').length;
    const unpaidOrders = orders.filter((order) => order.status === '未付款').length;
    const failedOrders = orders.filter((order) => order.status === '付款失敗').length;
    const closedOrders = orders.filter((order) => ['已取消', '已退款'].includes(order.status)).length;
    return {
      labels: ['已付款', '未付款', '付款失敗', '已關閉(取消/退款)'],
      datasets: [
        {
          data: [paidOrders, unpaidOrders, failedOrders, closedOrders],
          backgroundColor: ['#8bc53f', '#ffcf5a', '#ff7a7a', '#7f8ea3'],
          hoverBackgroundColor: ['#77af31', '#e7b443', '#eb6666', '#6e7d91'],
          borderWidth: 0,
        },
      ],
    };
  }, [orders]);

  const orderStats = useMemo(() => {
    const paid = orders.filter((order) => order.status === '已付款');
    const unpaid = orders.filter((order) => order.status === '未付款');
    const failed = orders.filter((order) => order.status === '付款失敗');
    return {
      totalOrders: orders.length,
      paidCount: paid.length,
      unpaidCount: unpaid.length,
      failedCount: failed.length,
      paidRevenue: paid.reduce((sum, order) => sum + (order.total || 0), 0),
    };
  }, [orders]);

  const mutateOrder = useCallback(
    async (runner, successText) => {
      if (!selectedOrder?.id) return;
      try {
        const token = localStorage.getItem('token');
        await runner(selectedOrder.id, token);
        toast.success(successText);
        await loadOrders(selectedOrder.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : '操作失敗';
        toast.error(message);
      }
    },
    [loadOrders, selectedOrder?.id]
  );

  const handlePaymentSuccess = useCallback(
    async (paidOrderId) => {
      await loadOrders(paidOrderId);
      router.replace(
        {
          pathname: '/orders',
          query: {
            orderId: paidOrderId,
            payment: 'success',
          },
        },
        undefined,
        { shallow: true }
      );
    },
    [loadOrders, router]
  );

  return (
    <main className="steam-shell px-4 py-6 md:px-6">
      <section className="mx-auto w-full max-w-6xl">
        <p className="text-xs font-bold tracking-[0.14em] text-[#8fb8d5]">ORDER CENTER</p>
        <h1 className="mt-2 text-3xl font-black text-[#d8e6f3]">結帳與付款</h1>
        <p className="mt-1 text-sm text-[#9eb4c8]">選擇訂單後完成付款，狀態會即時更新。</p>

        {isPaymentSuccess && (
          <div className="mt-4 rounded-xl border border-[#8bc53f55] bg-[#183126] p-4">
            <div className="flex items-start gap-3">
              <FaCheckCircle className="mt-0.5 text-[#8bc53f]" />
              <div>
                <p className="text-sm font-bold text-[#cde8a5]">付款成功</p>
                <p className="mt-1 text-xs text-[#b5d7be]">
                  訂單 {successOrderId ? successOrderId.slice(0, 8) : ''} 已完成付款，你可以在下方查看完整狀態流程。
                </p>
              </div>
            </div>
          </div>
        )}

        {loading && <p className="mt-3 text-sm text-[#9eb4c8]">正在載入資料...</p>}
        {error && <p className="mt-3 text-sm text-[#ff9e9e]">{error}</p>}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="總訂單數" value={`${orderStats.totalOrders} 筆`} />
          <StatCard label="已付款" value={`${orderStats.paidCount} 筆`} />
          <StatCard label="待付款" value={`${orderStats.unpaidCount} 筆`} />
          <StatCard label="付款失敗" value={`${orderStats.failedCount} 筆`} />
          <StatCard label="已收款總額" value={`$${orderStats.paidRevenue.toFixed(2)}`} />
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
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
                  onChange={(e) => {
                    const nextOrder = orders.find((order) => order.id === e.target.value);
                    setSelectedOrder(nextOrder || null);
                  }}
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
                  <p className="mt-2 text-xs text-[#8faac0]">
                    建立時間：{selectedOrder?.date ? new Date(selectedOrder.date).toLocaleString() : 'N/A'}
                  </p>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button
                    onClick={() => mutateOrder(cancelOrder, '訂單已取消')}
                    disabled={!selectedOrder || !['未付款', '付款失敗'].includes(selectedOrder.status)}
                    className="rounded-md border border-[#ff9f9f55] bg-[#4a202a] px-3 py-2 text-sm font-semibold text-[#ffd6d6] transition hover:bg-[#66303c] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    取消訂單
                  </button>
                  <button
                    onClick={() => mutateOrder(refundOrder, '退款完成')}
                    disabled={!selectedOrder || selectedOrder.status !== '已付款'}
                    className="rounded-md border border-[#66c0f455] bg-[#1b2f44] px-3 py-2 text-sm font-semibold text-[#d8e6f3] transition hover:bg-[#24384d] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    退款
                  </button>
                  <button
                    onClick={() => mutateOrder(retryOrderPayment, '訂單已轉為待付款')}
                    disabled={!selectedOrder || selectedOrder.status !== '付款失敗'}
                    className="rounded-md border border-[#66c0f455] bg-[#193142] px-3 py-2 text-sm font-semibold text-[#d8e6f3] transition hover:bg-[#24445a] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    重新付款
                  </button>
                  <button
                    onClick={() =>
                      mutateOrder(
                        (orderId, token) => payOrder(orderId, token, true),
                        '已模擬付款失敗'
                      )
                    }
                    disabled={!selectedOrder || selectedOrder.status !== '未付款'}
                    className="rounded-md border border-[#ffcf5a55] bg-[#3f3318] px-3 py-2 text-sm font-semibold text-[#ffe0a6] transition hover:bg-[#524423] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    模擬付款失敗
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="steam-panel rounded-2xl border border-[#66c0f433] p-5">
            <h2 className="text-xl font-black text-[#d8e6f3]">付款資訊</h2>
            {selectedOrder?.status !== '未付款' ? (
              <p className="mt-4 rounded-lg border border-[#66c0f433] bg-[#132434] p-4 text-sm text-[#9eb4c8]">
                只有「未付款」訂單可進行付款，請切換訂單或使用訂單操作按鈕。
              </p>
            ) : clientSecret ? (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm
                  clientSecret={clientSecret}
                  orderId={selectedOrder?.id}
                  onPaid={handlePaymentSuccess}
                />
              </Elements>
            ) : (
              <p className="mt-4 rounded-lg border border-[#66c0f433] bg-[#132434] p-4 text-sm text-[#9eb4c8]">
                請先選擇未付款訂單以載入付款表單。
              </p>
            )}
          </div>
        </div>

        {orders.length > 0 && (
          <div className="steam-panel mt-5 rounded-2xl border border-[#66c0f433] p-5">
            <h2 className="text-xl font-black text-[#d8e6f3]">所有訂單</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {orders.map((order) => {
                const latestStatus = order.statusHistory?.[order.statusHistory.length - 1];
                return (
                  <article
                    key={order.id}
                    className={`rounded-xl border p-4 transition ${
                      selectedOrder?.id === order.id
                        ? 'border-[#66c0f4] bg-[#173247]'
                        : 'border-[#66c0f433] bg-[#132434]'
                    }`}
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
                        {order.status}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-[#9eb4c8]">金額</span>
                      <span className="font-black text-[#8bc53f]">${order.total.toFixed(2)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-[#9eb4c8]">
                      <span>商品數</span>
                      <span>{order.items.reduce((sum, item) => sum + (item.quantity || 0), 0)} 件</span>
                    </div>

                    <div className="mt-3 rounded-md border border-[#66c0f433] bg-[#102131] p-2 text-xs">
                      <p className="text-[#8fb8d5]">最新節點</p>
                      <p className="mt-1 text-[#d8e6f3]">{latestStatus?.status || '無'}</p>
                      <p className="mt-0.5 text-[#8faac0]">
                        {latestStatus?.at ? new Date(latestStatus.at).toLocaleString() : 'N/A'}
                      </p>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="rounded-md border border-[#66c0f455] bg-[#1b2f44] px-3 py-2 text-xs font-semibold text-[#d8e6f3] transition hover:bg-[#24384d]"
                      >
                        選取
                      </button>
                      <button
                        onClick={() => router.push(`/orders/${order.id}`)}
                        className="rounded-md border border-[#66c0f455] bg-[#162839] px-3 py-2 text-xs font-semibold text-[#d8e6f3] transition hover:bg-[#24384d]"
                      >
                        查看詳情
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {selectedOrder?.statusHistory?.length > 0 && (
          <div className="steam-panel mt-5 rounded-2xl border border-[#66c0f433] p-5">
            <h2 className="text-xl font-black text-[#d8e6f3]">目前訂單狀態流程</h2>
            <div className="mt-4 space-y-3">
              {selectedOrder.statusHistory.map((node, index) => (
                <div
                  key={`${node.status}-${node.at}-${index}`}
                  className="rounded-lg border border-[#66c0f433] bg-[#132434] p-3"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-bold ${statusBadgeClass(
                        node.status
                      )}`}
                    >
                      {node.status}
                    </span>
                    <span className="text-xs text-[#8faac0]">{new Date(node.at).toLocaleString()}</span>
                  </div>
                  {node.note && <p className="mt-1 text-xs text-[#9eb4c8]">{node.note}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {orders.length > 0 && (
          <div className="steam-panel mt-5 rounded-2xl border border-[#66c0f433] p-5">
            <h2 className="text-xl font-black text-[#d8e6f3]">訂單狀態分佈</h2>
            <div className="mt-4 flex justify-center">
              <div className="h-60 w-60">
                <Pie data={chartData} />
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function CheckoutForm({ clientSecret, orderId, onPaid }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (!stripe || !elements) {
      setMessage('付款系統未載入，請稍後再試');
      setLoading(false);
      return;
    }
    if (!orderId) {
      setMessage('無效的訂單 ID，請重新選擇訂單');
      setLoading(false);
      return;
    }

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: elements.getElement(CardElement) },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      await payOrder(orderId, localStorage.getItem('token'));
      toast.success('付款成功，感謝你的購買');
      setMessage('付款成功，正在更新訂單狀態...');
      await onPaid(orderId);
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
      <div className="rounded-lg border border-[#66c0f444] bg-[#132434] p-4">
        <CardElement
          options={{
            style: {
              base: {
                color: '#d8e6f3',
                fontSize: '16px',
                '::placeholder': { color: '#88a7be' },
              },
            },
          }}
        />
      </div>
      <button
        type="submit"
        className="steam-btn w-full rounded-md py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        disabled={loading || !stripe || !elements}
      >
        {loading ? '付款中...' : '確認付款'}
      </button>
      {message && <p className="text-sm text-[#ffd079]">{message}</p>}
    </form>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-lg border border-[#66c0f433] bg-[#102131] p-3">
      <p className="text-xs text-[#8faac0]">{label}</p>
      <p className="mt-1 text-lg font-black text-[#d8e6f3]">{value}</p>
    </div>
  );
}
