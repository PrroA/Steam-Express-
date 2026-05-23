import { useMemo, useState } from 'react';
import { Elements, CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
import type { Stripe } from '@stripe/stripe-js';
import { toast } from 'react-toastify';
import { confirmPaymentIntent, payOrder } from '../../services/orderService';
import type { Order } from '../../types/domain';
import { ORDER_STATUS, getOrderStatusLabel } from '../../utils/orderStatus';
import { statusBadgeClass } from './statusStyles';

interface OrderPaymentPanelProps {
  selectedOrder: Order | null;
  clientSecret: string | null;
  paymentIntentError?: string | null;
  stripePromise: Promise<Stripe | null>;
  onPaid: (orderId: string) => Promise<void>;
}

export function OrderPaymentPanel({
  selectedOrder,
  clientSecret,
  paymentIntentError,
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
      <p className="text-xs font-bold tracking-[0.14em] text-[#8fb8d5]">PAYMENT</p>
      <h2 className="mt-1 text-xl font-black text-[#d8e6f3]">付款流程</h2>
      <p className="mt-1 text-sm text-[#9eb4c8]">
        Stripe 信用卡欄位只會在待付款訂單，且後端已設定 Stripe Secret Key 時顯示。
      </p>

      <div className="mt-4 rounded-lg border border-[#66c0f433] bg-[#132434] p-4">
        <p className="text-xs font-bold tracking-[0.12em] text-[#8fb8d5]">CURRENT ORDER</p>
        {selectedOrder ? (
          <>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-[#d8e6f3]">訂單 {selectedOrder.id.slice(0, 8)}...</p>
              <span
                className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-bold ${
                  statusBadgeClass(selectedOrder.status)
                }`}
              >
                {getOrderStatusLabel(selectedOrder.status)}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md border border-[#66c0f433] bg-[#102131] p-2">
                <p className="text-[#8faac0]">商品數量</p>
                <p className="mt-1 font-bold text-[#d8e6f3]">{selectedOrderItemCount} 件</p>
              </div>
              <div className="rounded-md border border-[#66c0f433] bg-[#102131] p-2">
                <p className="text-[#8faac0]">應付金額</p>
                <p className="mt-1 font-black text-[#8bc53f]">${selectedOrder.total.toFixed(2)}</p>
              </div>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-[#9eb4c8]">請先建立或選擇一筆待付款訂單。</p>
        )}
      </div>

      {selectedOrder?.status !== ORDER_STATUS.PENDING ? (
        <p className="mt-4 rounded-lg border border-[#66c0f433] bg-[#132434] p-4 text-sm text-[#9eb4c8]">
          目前選中的訂單不是待付款狀態，不能進行付款。請切換到待付款訂單。
        </p>
      ) : clientSecret ? (
        <Elements stripe={stripePromise} options={elementOptions}>
          <CheckoutForm clientSecret={clientSecret} orderId={selectedOrder?.id} onPaid={onPaid} />
        </Elements>
      ) : (
        <DemoPaymentFallback
          orderId={selectedOrder?.id}
          errorMessage={paymentIntentError}
          onPaid={onPaid}
        />
      )}
    </div>
  );
}

function DemoPaymentFallback({
  orderId,
  errorMessage,
  onPaid,
}: {
  orderId?: string;
  errorMessage?: string | null;
  onPaid: (orderId: string) => Promise<void>;
}) {
  const [quickPayLoading, setQuickPayLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleQuickPay = async () => {
    if (!orderId) {
      setMessage('找不到訂單 ID，請重新選擇訂單。');
      return;
    }

    try {
      setQuickPayLoading(true);
      setMessage('');
      await payOrder(orderId, localStorage.getItem('token'));
      toast.success('Demo 付款成功');
      setMessage('Demo 付款成功，正在更新訂單狀態...');
      await onPaid(orderId);
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Demo 付款失敗，請稍後再試';
      setMessage(text);
    } finally {
      setQuickPayLoading(false);
    }
  };

  return (
    <div className="mt-4 rounded-lg border border-[#66c0f433] bg-[#132434] p-4 text-sm text-[#9eb4c8]">
      <p className="font-bold text-[#d8e6f3]">Demo 快速付款</p>
      {errorMessage ? (
        <p className="mt-2 text-[#ffd079]">{errorMessage}</p>
      ) : (
        <p className="mt-2">Stripe 付款表單尚未載入，通常是付款流程還在建立中。</p>
      )}
      <p className="mt-2 text-xs text-[#8faac0]">
        如果要看到信用卡卡號輸入框，請在後端環境變數設定 STRIPE_SECRET_KEY，然後重新啟動 dev server。
      </p>
      <button
        type="button"
        onClick={handleQuickPay}
        disabled={quickPayLoading}
        className="mt-3 w-full rounded-md border border-[#66c0f455] bg-[#1b2f44] py-2.5 text-sm font-semibold text-[#d8e6f3] transition hover:bg-[#24384d] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {quickPayLoading ? '處理中...' : 'Demo 快速付款（不走 Stripe）'}
      </button>
      {message && <p className="mt-2 text-sm text-[#ffd079]">{message}</p>}
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    if (!stripe || !elements) {
      setMessage('Stripe 尚未初始化完成，請稍後再試。');
      setLoading(false);
      return;
    }
    if (!orderId) {
      setMessage('缺少訂單 ID，請重新選擇訂單。');
      setLoading(false);
      return;
    }

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: elements.getElement(CardElement) },
    });

    if (error) {
      setMessage(error.message || 'Stripe 付款失敗，請稍後再試。');
      setLoading(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      await confirmPaymentIntent(orderId, paymentIntent.id, localStorage.getItem('token'));
      toast.success('Stripe 付款成功，正在更新訂單狀態');
      setMessage('Stripe 付款已完成，正在同步訂單...');
      await onPaid(orderId);
    }

    setLoading(false);
  };

  const handleQuickPay = async () => {
    if (!orderId) {
      setMessage('缺少訂單 ID，請重新選擇訂單。');
      return;
    }

    try {
      setQuickPayLoading(true);
      setMessage('');
      await payOrder(orderId, localStorage.getItem('token'));
      toast.success('Demo 付款成功');
      setMessage('Demo 付款成功，正在更新訂單狀態...');
      await onPaid(orderId);
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Demo 付款失敗，請稍後再試';
      setMessage(text);
    } finally {
      setQuickPayLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
      <div className="rounded-lg border border-[#66c0f444] bg-[#132434] p-4">
        <p className="mb-3 text-sm font-bold text-[#d8e6f3]">Stripe 測試信用卡</p>
        <CardElement options={cardOptions} />
        <p className="mt-3 text-xs text-[#8faac0]">
          測試卡號可用 4242 4242 4242 4242，日期填未來月份，CVC 任意三碼。
        </p>
      </div>
      <button
        type="submit"
        className="steam-btn w-full rounded-md py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        disabled={loading || quickPayLoading || !stripe || !elements}
      >
        {loading ? 'Stripe 付款中...' : '使用 Stripe 測試付款'}
      </button>
      <button
        type="button"
        onClick={handleQuickPay}
        disabled={quickPayLoading || loading}
        className="w-full rounded-md border border-[#66c0f455] bg-[#1b2f44] py-2.5 text-sm font-semibold text-[#d8e6f3] transition hover:bg-[#24384d] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {quickPayLoading ? '處理中...' : 'Demo 快速付款（不走 Stripe）'}
      </button>
      {message && <p className="text-sm text-[#ffd079]">{message}</p>}
    </form>
  );
}
