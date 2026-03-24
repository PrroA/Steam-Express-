import { useEffect, useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { loadStripe } from '@stripe/stripe-js';
import {
  cancelOrder,
  payOrder,
  reorderOrder,
  refundOrder,
  retryOrderPayment,
} from '../services/orderService';
import { toast } from 'react-toastify';
import { useOrdersPage } from '../hooks/useOrdersPage';
import { OrderStats } from '../components/orders/OrderStats';
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

type OrderStatusFilter = 'ALL' | Order['status'];

const statusFilters: Array<{ id: OrderStatusFilter; label: string }> = [
  { id: 'ALL', label: '全部' },
  { id: '未付款', label: '待付款' },
  { id: '付款失敗', label: '付款失敗' },
  { id: '已付款', label: '已付款' },
];

const stripePromise = loadStripe(
  'pk_test_51Qr9qRRoY6RFAeUcNUZyfm5avjM4YPtAQdKcYnwIKrv02R615cdGXbFdnx45lyY2jjmdS68rHoRbn6hWQmSgCVn100B820Z6iB'
);

export default function CheckoutPage() {
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
    loading,
    error,
    operationLoading,
    operationType,
    stats,
    loadOrders,
    setSelectedOrder,
    setSelectedOrderById,
    mutateOrder,
    confirmPaidOrder,
  } = useOrdersPage();

  useEffect(() => {
    if (!router.isReady) return;
    const preferredOrderId =
      typeof router.query.orderId === 'string' ? router.query.orderId : undefined;
    loadOrders(preferredOrderId);
  }, [loadOrders, router.isReady, router.query.orderId]);

  const handlePaymentSuccess = useCallback(
    async (paidOrderId: string) => {
      await confirmPaidOrder(paidOrderId);
      trackJourneyEvent({
        type: 'payment_success',
        title: '付款成功',
        subtitle: `訂單 ${paidOrderId.slice(0, 8)}...`,
      });
      toast.success('付款完成，正在返回首頁');
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
    return mutateOrder(refundOrder, '退款完成', 'refund');
  }, [mutateOrder, selectedOrder?.id]);

  const handleRetryOrder = useCallback(() => {
    if (selectedOrder?.id) setSpotlightOrderId(selectedOrder.id);
    return mutateOrder(retryOrderPayment, '訂單已轉為待付款', 'retry');
  }, [mutateOrder, selectedOrder?.id]);

  const handleSimulateFailure = useCallback(() => {
    if (selectedOrder?.id) setSpotlightOrderId(selectedOrder.id);
    return mutateOrder((orderId, token) => payOrder(orderId, token, true), '已模擬付款失敗', 'simulate');
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
          toast.info(`已加入 ${result.addedCount} 項，${result.skipped.length} 項因庫存/下架略過`);
        } else {
          toast.success('已將訂單商品加入購物車');
        }
        router.push('/cart');
      } catch (error) {
        const message = error instanceof Error ? error.message : '再買一次失敗';
        toast.error(message);
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
    return <ErrorState title="訂單資料載入失敗" description={error} onAction={() => loadOrders()} />;
  }

  return (
    <main className="steam-shell px-4 py-6 md:px-6">
      <section className="mx-auto w-full max-w-6xl">
        <p className="text-xs font-bold tracking-[0.14em] text-[#8fb8d5]">ORDER CENTER</p>
        <h1 className="mt-2 text-3xl font-black text-[#d8e6f3]">結帳與付款</h1>
        <p className="mt-1 text-sm text-[#9eb4c8]">選擇訂單後完成付款，狀態會即時更新。</p>

        {isPaymentSuccess && <PaymentSuccessBanner successOrderId={successOrderId} />}

        {loading && <p className="mt-3 text-sm text-[#9eb4c8]">正在同步最新訂單狀態...</p>}
        {error && (
          <div className="mt-3 rounded-md border border-[#ff9e9e66] bg-[#4a202a] px-3 py-2 text-sm text-[#ffd6d6]">
            {error}
          </div>
        )}

        <OrderStats stats={stats} />
        <OrderActionSummary orders={orders} />

        <section className="mt-5 rounded-2xl border border-[#66c0f433] bg-[#132434] p-4">
          <p className="text-xs font-bold tracking-[0.14em] text-[#8fb8d5]">FIND ORDERS FAST</p>
          <h2 className="mt-2 text-xl font-black text-[#d8e6f3]">快速篩選與查找</h2>
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
            placeholder="輸入訂單編號關鍵字（例如 8a4f）"
            className="mt-3 w-full rounded-md border border-[#66c0f444] bg-[#162737] px-3 py-2 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
          />
          <p className="mt-2 text-xs text-[#8faac0]">目前顯示 {filteredOrders.length} / {orders.length} 筆</p>
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
            onSimulateFailure={handleSimulateFailure}
            isOperating={operationLoading}
            operatingType={operationType}
            reorderingOrderId={reorderingOrderId}
          />

          <OrderPaymentPanel
            selectedOrder={selectedOrder}
            clientSecret={clientSecret}
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
            <p className="text-lg font-black text-[#d8e6f3]">沒有符合條件的訂單</p>
            <p className="mt-2 text-sm text-[#9eb4c8]">可以改變狀態篩選或清空關鍵字重新查找。</p>
          </div>
        )}

        <OrderTimeline selectedOrder={selectedOrder} />

      </section>
    </main>
  );
}
