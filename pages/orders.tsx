import { useEffect, useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { loadStripe } from '@stripe/stripe-js';
import {
  cancelOrder,
  reorderOrder,
  refundOrder,
  retryOrderPayment,
} from '../services/orderService';
import { toast } from 'react-toastify';
import { useOrdersPage } from '../hooks/useOrdersPage';
import { OrderOperationsPanel } from '../components/orders/OrderOperationsPanel';
import { OrderPaymentPanel } from '../components/orders/OrderPaymentPanel';
import { OrderList } from '../components/orders/OrderList';
import { OrderTimeline } from '../components/orders/OrderTimeline';
import { PaymentSuccessBanner } from '../components/orders/PaymentSuccessBanner';
import { ErrorState } from '../components/ui/PageStates';
import { OrdersPageSkeleton } from '../components/ui/PageSkeletons';
import { OrderActionSummary } from '../components/orders/OrderActionSummary';
import type { Order } from '../types/domain';
import { trackJourneyEvent } from '../utils/journeyTracker';
import { ORDER_STATUS, getOrderStatusLabel } from '../utils/orderStatus';

type OrderStatusFilter = 'ALL' | Order['status'];

const statusFilters: Array<{ id: OrderStatusFilter; label: string }> = [
  { id: 'ALL', label: '全部' },
  { id: ORDER_STATUS.PENDING, label: getOrderStatusLabel(ORDER_STATUS.PENDING) },
  { id: ORDER_STATUS.PAYMENT_FAILED, label: getOrderStatusLabel(ORDER_STATUS.PAYMENT_FAILED) },
  { id: ORDER_STATUS.PAID, label: getOrderStatusLabel(ORDER_STATUS.PAID) },
];

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || '';
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

export default function OrdersPage() {
  const router = useRouter();
  const isPaymentSuccess = router.query.payment === 'success';
  const successOrderId = typeof router.query.orderId === 'string' ? router.query.orderId : '';
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('ALL');
  const [orderKeyword, setOrderKeyword] = useState('');
  const [reorderingOrderId, setReorderingOrderId] = useState<string | null>(null);
  const [spotlightOrderId, setSpotlightOrderId] = useState<string | null>(null);

  const {
    orders,
    selectedOrder,
    clientSecret,
    paymentIntentError,
    loading,
    error,
    operationLoading,
    operationType,
    loadOrders,
    setSelectedOrder,
    setSelectedOrderById,
    mutateOrder,
    confirmPaidOrder,
  } = useOrdersPage();

  useEffect(() => {
    if (!router.isReady) return;
    const preferredOrderId = typeof router.query.orderId === 'string' ? router.query.orderId : undefined;
    loadOrders(preferredOrderId);
  }, [loadOrders, router.isReady, router.query.orderId]);

  const handlePaymentSuccess = useCallback(
    async (paidOrderId: string) => {
      await confirmPaidOrder(paidOrderId);
      trackJourneyEvent({
        type: 'payment_success',
        title: '付款完成',
        subtitle: `訂單 ${paidOrderId.slice(0, 8)}...`,
        orderId: paidOrderId,
      });
      toast.success('付款完成，訂單已更新');
      setTimeout(() => {
        router.push({
          pathname: '/',
          query: {
            payment: 'success',
            orderId: paidOrderId,
          },
        });
      }, 900);
    },
    [confirmPaidOrder, router]
  );

  const handleCancelOrder = useCallback(() => {
    if (selectedOrder?.id) setSpotlightOrderId(selectedOrder.id);
    return mutateOrder(cancelOrder, '訂單已取消', 'cancel');
  }, [mutateOrder, selectedOrder?.id]);

  const handleRefundOrder = useCallback(() => {
    if (selectedOrder?.id) setSpotlightOrderId(selectedOrder.id);
    return mutateOrder(refundOrder, '退款已完成', 'refund');
  }, [mutateOrder, selectedOrder?.id]);

  const handleRetryOrder = useCallback(() => {
    if (selectedOrder?.id) setSpotlightOrderId(selectedOrder.id);
    return mutateOrder(retryOrderPayment, '可以重新付款了', 'retry');
  }, [mutateOrder, selectedOrder?.id]);

  const handleViewOrderDetail = useCallback(
    (orderId: string) => {
      router.push(`/orders/${orderId}`);
    },
    [router]
  );

  const handleReorder = useCallback(
    async (orderId: string) => {
      const token = localStorage.getItem('token');
      setReorderingOrderId(orderId);
      try {
        const result = await reorderOrder(orderId, token);
        if (result.skipped?.length) {
          toast.info(`已加入 ${result.addedCount} 件商品，另有 ${result.skipped.length} 件暫時無法加入。`);
        } else {
          toast.success('已把這筆訂單的商品加入購物車。');
        }
        router.push('/cart');
      } catch {
        toast.error('暫時無法重新加入購物車，請稍後再試。');
      } finally {
        setReorderingOrderId(null);
      }
    },
    [router]
  );

  const filteredOrders = useMemo(() => {
    const keyword = orderKeyword.trim().toLowerCase();
    return orders.filter((order) => {
      const statusMatched = statusFilter === 'ALL' ? true : order.status === statusFilter;
      const keywordMatched = keyword ? order.id.toLowerCase().includes(keyword) : true;
      return statusMatched && keywordMatched;
    });
  }, [orders, orderKeyword, statusFilter]);

  useEffect(() => {
    if (!spotlightOrderId || selectedOrder?.id !== spotlightOrderId) return;
    const scrollTimer = window.setTimeout(() => {
      const target = document.getElementById(`order-card-${spotlightOrderId}`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
    const clearTimer = window.setTimeout(() => {
      setSpotlightOrderId(null);
    }, 1800);
    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [spotlightOrderId, selectedOrder?.id]);

  if (loading && orders.length === 0) {
    return <OrdersPageSkeleton />;
  }

  if (error && orders.length === 0) {
    return <ErrorState title="訂單載入失敗" description="目前無法取得訂單，請稍後再試。" onAction={() => loadOrders()} />;
  }

  return (
    <main className="steam-shell px-4 py-6 md:px-6">
      <section className="mx-auto w-full max-w-6xl">
        <p className="text-xs font-bold tracking-[0.14em] text-[#8fb8d5]">訂單中心</p>
        <h1 className="mt-2 text-3xl font-black text-[#d8e6f3]">我的訂單</h1>
        <p className="mt-1 text-sm text-[#9eb4c8]">
          查看訂單狀態、完成付款，或再次購買喜歡的遊戲。
        </p>

        {isPaymentSuccess && <PaymentSuccessBanner successOrderId={successOrderId} />}

        {loading && <p className="mt-3 text-sm text-[#9eb4c8]">正在更新訂單...</p>}
        {error && (
          <div className="mt-3 rounded-md border border-[#ff9e9e66] bg-[#4a202a] px-3 py-2 text-sm text-[#ffd6d6]">
            訂單暫時沒有更新成功，請稍後再試。
          </div>
        )}

        <OrderActionSummary orders={orders} />

        <section className="mt-5 rounded-2xl border border-[#66c0f433] bg-[#132434] p-4">
          <p className="text-xs font-bold tracking-[0.14em] text-[#8fb8d5]">快速找到訂單</p>
          <h2 className="mt-2 text-xl font-black text-[#d8e6f3]">篩選與搜尋</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {statusFilters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setStatusFilter(filter.id)}
                className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
                  statusFilter === filter.id
                    ? 'border-[#66c0f4aa] bg-[#1a3b53] text-[#d8e6f3]'
                    : 'border-[#66c0f433] bg-[#11202f] text-[#9eb4c8] hover:bg-[#1a3044]'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <input
            value={orderKeyword}
            onChange={(event) => setOrderKeyword(event.target.value)}
            placeholder="輸入訂單編號，例如 8a4f"
            className="mt-3 w-full rounded-md border border-[#66c0f444] bg-[#162737] px-3 py-2 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
          />
          <p className="mt-2 text-xs text-[#8faac0]">
            目前顯示 {filteredOrders.length} / {orders.length} 筆
          </p>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
          <OrderOperationsPanel
            orders={orders}
            selectedOrder={selectedOrder}
            onSelectOrderById={setSelectedOrderById}
            onReorder={handleReorder}
            onCancelOrder={handleCancelOrder}
            onRefundOrder={handleRefundOrder}
            onRetryOrder={handleRetryOrder}
            isOperating={operationLoading}
            operatingType={operationType}
            reorderingOrderId={reorderingOrderId}
          />

          <OrderPaymentPanel
            selectedOrder={selectedOrder}
            clientSecret={clientSecret}
            paymentIntentError={paymentIntentError}
            stripePromise={stripePromise}
            onPaid={handlePaymentSuccess}
          />
        </div>

        {filteredOrders.length > 0 ? (
          <OrderList
            orders={filteredOrders}
            selectedOrderId={selectedOrder?.id}
            onSelectOrder={setSelectedOrder}
            onViewOrderDetail={handleViewOrderDetail}
            onReorder={handleReorder}
            reorderingOrderId={reorderingOrderId}
            focusOrderId={spotlightOrderId}
          />
        ) : (
          <div className="steam-panel mt-5 rounded-2xl border border-[#66c0f433] p-6 text-center">
            <p className="text-lg font-black text-[#d8e6f3]">找不到符合條件的訂單</p>
            <p className="mt-2 text-sm text-[#9eb4c8]">可以切換篩選條件，或回到商店建立新的訂單。</p>
          </div>
        )}

        <OrderTimeline selectedOrder={selectedOrder} />
      </section>
    </main>
  );
}
