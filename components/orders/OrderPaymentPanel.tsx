import { useMemo, useState } from 'react';
import { Elements, CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
import type { Stripe } from '@stripe/stripe-js';
import { toast } from 'react-toastify';
import { payOrder } from '../../services/orderService';
import type { Order } from '../../types/domain';

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

  return (
    <div className="steam-panel rounded-2xl border border-[#66c0f433] p-5">
      <h2 className="text-xl font-black text-[#d8e6f3]">付款資訊</h2>
      {selectedOrder?.status !== '未付款' ? (
        <p className="mt-4 rounded-lg border border-[#66c0f433] bg-[#132434] p-4 text-sm text-[#9eb4c8]">
          只有「未付款」訂單可進行付款，請切換訂單或使用訂單操作按鈕。
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
        disabled={loading || !stripe || !elements}
      >
        {loading ? '付款中...' : '確認付款'}
      </button>
      <button
        type="button"
        onClick={handleQuickPay}
        disabled={quickPayLoading}
        className="w-full rounded-md border border-[#66c0f455] bg-[#1b2f44] py-2.5 text-sm font-semibold text-[#d8e6f3] transition hover:bg-[#24384d] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {quickPayLoading ? '處理中...' : '練習模式快速付款（不走 Stripe）'}
      </button>
      {message && <p className="text-sm text-[#ffd079]">{message}</p>}
    </form>
  );
}
