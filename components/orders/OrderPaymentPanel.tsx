import { useMemo, useState } from 'react';
import { Elements, CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
import type { Stripe } from '@stripe/stripe-js';
import { toast } from 'react-toastify';
import { payOrder } from '../../services/orderService';
import type { Order } from '../../types/domain';

const statusClasses: Record<Order['status'], string> = {
  已付款: 'bg-[#1f3b2a] text-[#8bc53f] border-[#8bc53f55]',
  未付款: 'bg-[#3f3318] text-[#ffd079] border-[#ffd07955]',
  付款失敗: 'bg-[#4a202a] text-[#ff9e9e] border-[#ff9e9e55]',
  已取消: 'bg-[#2d3642] text-[#9fb4c6] border-[#9fb4c655]',
  已退款: 'bg-[#22384a] text-[#9ed8ff] border-[#9ed8ff55]',
};

interface OrderPaymentPanelProps {
  selectedOrder: Order | null;
  clientSecret: string | null;
  stripePromise: Promise<Stripe | null>;
  onPaid: (orderId: string) => Promise<void>;
}

export function OrderPaymentPanel({
  selectedOrder,
  clientSecret,
  stripePromise,
  onPaid,
}: OrderPaymentPanelProps) {
  const elementOptions = useMemo(() => ({ clientSecret }), [clientSecret]);
  const selectedOrderItemCount = useMemo(
    () => selectedOrder?.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0,
    [selectedOrder]
  );

  return (
    <div className="steam-panel rounded-2xl border border-[#66c0f433] p-5">
      <h2 className="text-xl font-black text-[#d8e6f3]">付款資訊</h2>
      <div className="mt-4 rounded-lg border border-[#66c0f433] bg-[#132434] p-4">
        <p className="text-xs font-bold tracking-[0.12em] text-[#8fb8d5]">CURRENT ORDER</p>
        {selectedOrder ? (
          <>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-[#d8e6f3]">訂單 {selectedOrder.id.slice(0, 8)}...</p>
              <span
                className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-bold ${
                  statusClasses[selectedOrder.status]
                }`}
              >
                {selectedOrder.status}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md border border-[#66c0f433] bg-[#102131] p-2">
                <p className="text-[#8faac0]">商品數</p>
                <p className="mt-1 font-bold text-[#d8e6f3]">{selectedOrderItemCount} 件</p>
              </div>
              <div className="rounded-md border border-[#66c0f433] bg-[#102131] p-2">
                <p className="text-[#8faac0]">應付金額</p>
                <p className="mt-1 font-black text-[#8bc53f]">${selectedOrder.total.toFixed(2)}</p>
              </div>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-[#9eb4c8]">請先在左側操作台選擇一筆訂單。</p>
        )}
      </div>

      {selectedOrder?.status !== '未付款' ? (
        <p className="mt-4 rounded-lg border border-[#66c0f433] bg-[#132434] p-4 text-sm text-[#9eb4c8]">
          目前選中訂單不可付款。請切換到「未付款」訂單後再進行付款。
        </p>
      ) : clientSecret ? (
        <Elements stripe={stripePromise} options={elementOptions}>
          <CheckoutForm clientSecret={clientSecret} orderId={selectedOrder?.id} onPaid={onPaid} />
        </Elements>
      ) : (
        <p className="mt-4 rounded-lg border border-[#66c0f433] bg-[#132434] p-4 text-sm text-[#9eb4c8]">
          請先選擇未付款訂單以載入付款表單。
        </p>
      )}
    </div>
  );
}

function CheckoutForm({
  clientSecret,
  orderId,
  onPaid,
}: {
  clientSecret: string;
  orderId?: string;
  onPaid: (orderId: string) => Promise<void>;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [quickPayLoading, setQuickPayLoading] = useState(false);
  const [message, setMessage] = useState('');
  const cardOptions = useMemo(
    () => ({
      style: {
        base: {
          color: '#d8e6f3',
          fontSize: '16px',
          '::placeholder': { color: '#88a7be' },
        },
      },
    }),
    []
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
      setMessage(error.message || '付款失敗，請稍後再試');
      setLoading(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      toast.success('付款成功，正在確認訂單狀態');
      setMessage('付款已送出，等待系統同步...');
      await onPaid(orderId);
    }

    setLoading(false);
  };

  const handleQuickPay = async () => {
    if (!orderId) {
      setMessage('無效的訂單 ID，請重新選擇訂單');
      return;
    }
    try {
      setQuickPayLoading(true);
      setMessage('');
      await payOrder(orderId, localStorage.getItem('token'));
      toast.success('付款成功（練習模式）');
      setMessage('付款成功，正在更新訂單狀態...');
      await onPaid(orderId);
    } catch (error) {
      const text = error instanceof Error ? error.message : '付款失敗，請稍後再試';
      setMessage(text);
    } finally {
      setQuickPayLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
      <div className="rounded-lg border border-[#66c0f444] bg-[#132434] p-4">
        <CardElement options={cardOptions} />
      </div>
      <button
        type="submit"
        className="steam-btn w-full rounded-md py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        disabled={loading || quickPayLoading || !stripe || !elements}
      >
        {loading ? '付款中...' : '確認付款（Stripe）'}
      </button>
      <button
        type="button"
        onClick={handleQuickPay}
        disabled={quickPayLoading || loading}
        className="w-full rounded-md border border-[#66c0f455] bg-[#1b2f44] py-2.5 text-sm font-semibold text-[#d8e6f3] transition hover:bg-[#24384d] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {quickPayLoading ? '處理中...' : '練習模式快速付款（不走 Stripe）'}
      </button>
      {message && <p className="text-sm text-[#ffd079]">{message}</p>}
    </form>
  );
}
