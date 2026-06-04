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
  stripePromise: Promise<Stripe | null> | null;
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
      <p className="text-xs font-bold tracking-[0.14em] text-[#8fb8d5]">付款</p>
      <h2 className="mt-1 text-xl font-black text-[#d8e6f3]">完成這筆訂單</h2>
      <p className="mt-1 text-sm text-[#9eb4c8]">
        待付款訂單會在這裡完成付款；付款完成後，狀態會自動更新。
      </p>

      <div className="mt-4 rounded-lg border border-[#66c0f433] bg-[#132434] p-4">
        <p className="text-xs font-bold tracking-[0.12em] text-[#8fb8d5]">目前訂單</p>
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
          <p className="mt-2 text-sm text-[#9eb4c8]">請先選擇一筆待付款訂單。</p>
        )}
      </div>

      {selectedOrder?.status !== ORDER_STATUS.PENDING ? (
        <p className="mt-4 rounded-lg border border-[#66c0f433] bg-[#132434] p-4 text-sm text-[#9eb4c8]">
          這筆訂單目前不需要付款。若付款未成功，可以先選擇重新付款。
        </p>
      ) : clientSecret && stripePromise ? (
        <Elements stripe={stripePromise} options={elementOptions}>
          <CheckoutForm clientSecret={clientSecret} orderId={selectedOrder?.id} onPaid={onPaid} />
        </Elements>
      ) : (
        <DemoPaymentFallback orderId={selectedOrder?.id} errorMessage={paymentIntentError} onPaid={onPaid} />
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
      setMessage('請先選擇一筆訂單。');
      return;
    }

    try {
      setQuickPayLoading(true);
      setMessage('');
      await payOrder(orderId, localStorage.getItem('token'));
      toast.success('付款完成');
      setMessage('付款完成，訂單正在更新...');
      await onPaid(orderId);
    } catch {
      setMessage('付款還沒完成，請再試一次。');
    } finally {
      setQuickPayLoading(false);
    }
  };

  return (
    <div className="mt-4 rounded-lg border border-[#66c0f433] bg-[#132434] p-4 text-sm text-[#9eb4c8]">
      <p className="font-bold text-[#d8e6f3]">信用卡付款暫時無法使用</p>
      <p className="mt-2 text-[#ffd079]">
        {errorMessage || '你可以先用快速付款完成這筆訂單，或稍後再回來嘗試信用卡付款。'}
      </p>
      <button
        type="button"
        data-testid="demo-quick-pay"
        onClick={handleQuickPay}
        disabled={quickPayLoading}
        className="mt-3 w-full rounded-md border border-[#66c0f455] bg-[#1b2f44] py-2.5 text-sm font-semibold text-[#d8e6f3] transition hover:bg-[#24384d] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {quickPayLoading ? '付款處理中...' : '快速完成付款'}
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
      setMessage('信用卡付款還在載入，請稍後再試。');
      setLoading(false);
      return;
    }
    if (!orderId) {
      setMessage('請先選擇一筆訂單。');
      setLoading(false);
      return;
    }

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: elements.getElement(CardElement) },
    });

    if (error) {
      setMessage(error.message || '付款還沒完成，請確認卡片資料後再試一次。');
      setLoading(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      await confirmPaymentIntent(orderId, paymentIntent.id, localStorage.getItem('token'));
      toast.success('付款完成，訂單已更新');
      setMessage('付款完成，訂單正在更新...');
      await onPaid(orderId);
    } else {
      setMessage('付款還沒完成，請再試一次。');
    }

    setLoading(false);
  };

  const handleQuickPay = async () => {
    if (!orderId) {
      setMessage('請先選擇一筆訂單。');
      return;
    }

    try {
      setQuickPayLoading(true);
      setMessage('');
      await payOrder(orderId, localStorage.getItem('token'));
      toast.success('付款完成');
      setMessage('付款完成，訂單正在更新...');
      await onPaid(orderId);
    } catch {
      setMessage('付款還沒完成，請再試一次。');
    } finally {
      setQuickPayLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} data-testid="stripe-payment-form" className="mt-4 space-y-3">
      <div data-testid="stripe-card-box" className="rounded-lg border border-[#66c0f444] bg-[#132434] p-4">
        <p className="mb-3 text-sm font-bold text-[#d8e6f3]">信用卡資料</p>
        <CardElement options={cardOptions} />
        <details className="mt-3 text-xs text-[#8faac0]">
          <summary className="cursor-pointer font-semibold text-[#9eb4c8]">需要範例卡號？</summary>
          <p className="mt-2">範例卡號：4242 4242 4242 4242，日期填未來月份，CVC 任意三碼。</p>
        </details>
      </div>
      <button
        type="submit"
        data-testid="stripe-pay-button"
        className="steam-btn w-full rounded-md py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        disabled={loading || quickPayLoading || !stripe || !elements}
      >
        {loading ? '付款處理中...' : '使用信用卡付款'}
      </button>
      <button
        type="button"
        data-testid="demo-quick-pay"
        onClick={handleQuickPay}
        disabled={quickPayLoading || loading}
        className="w-full rounded-md border border-[#66c0f455] bg-[#1b2f44] py-2.5 text-sm font-semibold text-[#d8e6f3] transition hover:bg-[#24384d] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {quickPayLoading ? '付款處理中...' : '快速完成付款'}
      </button>
      {message && <p className="text-sm text-[#ffd079]">{message}</p>}
    </form>
  );
}
