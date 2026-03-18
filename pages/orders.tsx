import { useEffect, useCallback } from 'react';
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
import { OrderStatusChart } from '../components/orders/OrderStatusChart';
import { PaymentSuccessBanner } from '../components/orders/PaymentSuccessBanner';

const stripePromise = loadStripe(
  'pk_test_51Qr9qRRoY6RFAeUcNUZyfm5avjM4YPtAQdKcYnwIKrv02R615cdGXbFdnx45lyY2jjmdS68rHoRbn6hWQmSgCVn100B820Z6iB'
);

export default function CheckoutPage() {
  const router = useRouter();
  const isPaymentSuccess = router.query.payment === 'success';
  const successOrderId = typeof router.query.orderId === 'string' ? router.query.orderId : '';

  const {
    orders,
    selectedOrder,
    clientSecret,
    loading,
    error,
    chartData,
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
    [confirmPaidOrder, router]
  );

  const handleCancelOrder = useCallback(() => {
    return mutateOrder(cancelOrder, '訂單已取消');
  }, [mutateOrder]);

  const handleRefundOrder = useCallback(() => {
    return mutateOrder(refundOrder, '退款完成');
  }, [mutateOrder]);

  const handleRetryOrder = useCallback(() => {
    return mutateOrder(retryOrderPayment, '訂單已轉為待付款');
  }, [mutateOrder]);

  const handleSimulateFailure = useCallback(() => {
    return mutateOrder((orderId, token) => payOrder(orderId, token, true), '已模擬付款失敗');
  }, [mutateOrder]);

  const handleViewOrderDetail = useCallback(
    (orderId: string) => {
      router.push(`/orders/${orderId}`);
    },
    [router]
  );

  const handleReorder = useCallback(
    async (orderId: string) => {
      const token = localStorage.getItem('token');
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
      }
    },
    [router]
  );

  return (
    <main className="steam-shell px-4 py-6 md:px-6">
      <section className="mx-auto w-full max-w-6xl">
        <p className="text-xs font-bold tracking-[0.14em] text-[#8fb8d5]">ORDER CENTER</p>
        <h1 className="mt-2 text-3xl font-black text-[#d8e6f3]">結帳與付款</h1>
        <p className="mt-1 text-sm text-[#9eb4c8]">選擇訂單後完成付款，狀態會即時更新。</p>

        {isPaymentSuccess && <PaymentSuccessBanner successOrderId={successOrderId} />}

        {loading && <p className="mt-3 text-sm text-[#9eb4c8]">正在載入資料...</p>}
        {error && <p className="mt-3 text-sm text-[#ff9e9e]">{error}</p>}

        <OrderStats stats={stats} />

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
          <OrderOperationsPanel
            orders={orders}
            selectedOrder={selectedOrder}
            onSelectOrderById={setSelectedOrderById}
            onCancelOrder={handleCancelOrder}
            onRefundOrder={handleRefundOrder}
            onRetryOrder={handleRetryOrder}
            onSimulateFailure={handleSimulateFailure}
          />

          <OrderPaymentPanel
            selectedOrder={selectedOrder}
            clientSecret={clientSecret}
            stripePromise={stripePromise}
            onPaid={handlePaymentSuccess}
          />
        </div>

        <OrderList
          orders={orders}
          selectedOrderId={selectedOrder?.id}
          onSelectOrder={setSelectedOrder}
          onViewOrderDetail={handleViewOrderDetail}
          onReorder={handleReorder}
        />

        <OrderTimeline selectedOrder={selectedOrder} />

        {orders.length > 0 && <OrderStatusChart chartData={chartData} />}
      </section>
    </main>
  );
}
