import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { toast } from 'react-toastify';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { createPaymentIntent, fetchOrders as fetchOrdersApi, payOrder } from '../services/orderService';

ChartJS.register(ArcElement, Tooltip, Legend);

const stripePromise = loadStripe(
  'pk_test_51Qr9qRRoY6RFAeUcNUZyfm5avjM4YPtAQdKcYnwIKrv02R615cdGXbFdnx45lyY2jjmdS68rHoRbn6hWQmSgCVn100B820Z6iB'
);

export default function CheckoutPage() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const data = await fetchOrdersApi(token);
      setOrders(data);
      const unpaidOrder = data.find((order) => order.status === '未付款');
      setSelectedOrder(unpaidOrder || data[0] || null);
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
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    fetchClientSecret();
  }, [fetchClientSecret]);

  const chartData = useMemo(() => {
    const paidOrders = orders.filter((order) => order.status === '已付款').length;
    const unpaidOrders = orders.filter((order) => order.status === '未付款').length;
    return {
      labels: ['已付款', '未付款'],
      datasets: [
        {
          data: [paidOrders, unpaidOrders],
          backgroundColor: ['#8bc53f', '#ff7a7a'],
          hoverBackgroundColor: ['#77af31', '#eb6666'],
          borderWidth: 0,
        },
      ],
    };
  }, [orders]);

  return (
    <main className="steam-shell px-4 py-6 md:px-6">
      <section className="mx-auto w-full max-w-6xl">
        <h1 className="text-3xl font-black text-[#d8e6f3]">結帳與付款</h1>
        <p className="mt-1 text-sm text-[#9eb4c8]">選擇訂單後完成付款，狀態會即時更新。</p>

        {loading && <p className="mt-3 text-sm text-[#9eb4c8]">正在載入資料...</p>}
        {error && <p className="mt-3 text-sm text-[#ff9e9e]">{error}</p>}

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div className="steam-panel rounded-2xl p-5">
            <h2 className="text-xl font-black text-[#d8e6f3]">訂單選擇</h2>

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
                      className={`ml-1 font-bold ${
                        selectedOrder?.status === '已付款' ? 'text-[#8bc53f]' : 'text-[#ffd079]'
                      }`}
                    >
                      {selectedOrder?.status || 'N/A'}
                    </span>
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="steam-panel rounded-2xl p-5">
            <h2 className="text-xl font-black text-[#d8e6f3]">付款資訊</h2>
            {selectedOrder?.status === '已付款' ? (
              <p className="mt-4 rounded-lg border border-[#66c0f433] bg-[#132434] p-4 text-sm text-[#9eb4c8]">
                此訂單已付款，請改選其他未付款訂單。
              </p>
            ) : clientSecret ? (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm clientSecret={clientSecret} orderId={selectedOrder?.id} />
              </Elements>
            ) : (
              <p className="mt-4 rounded-lg border border-[#66c0f433] bg-[#132434] p-4 text-sm text-[#9eb4c8]">
                請先選擇未付款訂單以載入付款表單。
              </p>
            )}
          </div>
        </div>

        {orders.length > 0 && (
          <div className="steam-panel mt-5 rounded-2xl p-5">
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

function CheckoutForm({ clientSecret, orderId }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
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
      setMessage('付款成功，正在返回首頁...');
      setTimeout(() => router.push('/'), 1000);
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
