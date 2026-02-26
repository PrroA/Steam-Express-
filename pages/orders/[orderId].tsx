import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { fetchOrderById } from '../../services/orderService';
import type { Order } from '../../types/domain';

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
        </div>

        <div className="steam-panel rounded-2xl p-5 md:p-6">
          <h1 className="text-3xl font-black text-[#d8e6f3]">訂單詳情</h1>
          <p className="mt-1 text-sm text-[#9eb4c8]">訂單編號：{order.id}</p>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-[#66c0f433] bg-[#132434] p-4">
              <p className="text-xs text-[#9eb4c8]">訂單狀態</p>
              <p
                className={`mt-1 text-2xl font-black ${
                  order.status === '已付款' ? 'text-[#8bc53f]' : 'text-[#ffd079]'
                }`}
              >
                {order.status}
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
            {order.paymentDetails && (
              <div className="mt-2 space-y-1 border-t border-[#66c0f433] pt-2">
                <p>交易編號：{order.paymentDetails.transactionId}</p>
                <p>付款時間：{new Date(order.paymentDetails.paidAt).toLocaleString()}</p>
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
      </section>
    </main>
  );
}
