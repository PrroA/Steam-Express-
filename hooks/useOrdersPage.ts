import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  createPaymentIntent,
  fetchOrders as fetchOrdersApi,
} from '../services/orderService';
import type { Order } from '../types/domain';
import { upsertOrderStatusAlertsFromOrders } from '../utils/wishlistAlerts';
import { ORDER_STATUS, getOrderStatusLabel } from '../utils/orderStatus';

export function useOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [operationLoading, setOperationLoading] = useState(false);
  const [operationType, setOperationType] = useState<'cancel' | 'refund' | 'retry' | null>(null);
  const [paymentIntentError, setPaymentIntentError] = useState<string | null>(null);

  const loadOrders = useCallback(async (preferredOrderId?: string) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const data = await fetchOrdersApi(token);
      setOrders(data);
      upsertOrderStatusAlertsFromOrders(data);

      const preferredOrder =
        (preferredOrderId && data.find((order) => order.id === preferredOrderId)) || null;
      const unpaidOrder = data.find((order) => order.status === ORDER_STATUS.PENDING);
      setSelectedOrder(preferredOrder || unpaidOrder || data[0] || null);

      return data;
    } catch (fetchError: any) {
      setError(fetchError?.message || '載入訂單失敗');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchClientSecret = async () => {
      if (!selectedOrder || selectedOrder.status !== ORDER_STATUS.PENDING) {
        setClientSecret(null);
        setPaymentIntentError(null);
        return;
      }

      setLoading(true);
      setPaymentIntentError(null);
      try {
        const token = localStorage.getItem('token');
        const data = await createPaymentIntent(selectedOrder.id, token);
        setClientSecret(data.clientSecret || null);
      } catch (fetchError: any) {
        setPaymentIntentError(fetchError?.message || '信用卡付款暫時無法使用，你可以先用快速付款完成這筆訂單。');
        setClientSecret(null);
      } finally {
        setLoading(false);
      }
    };

    fetchClientSecret();
  }, [selectedOrder]);

  const setSelectedOrderById = useCallback(
    (orderId: string) => {
      const nextOrder = orders.find((order) => order.id === orderId) || null;
      setSelectedOrder(nextOrder);
    },
    [orders]
  );

  const mutateOrder = useCallback(
    async (
      runner: (orderId: string, token?: string | null) => Promise<any>,
      successText: string,
      nextOperationType: 'cancel' | 'refund' | 'retry'
    ) => {
      if (!selectedOrder?.id) return;
      setOperationLoading(true);
      setOperationType(nextOperationType);
      try {
        const token = localStorage.getItem('token');
        await runner(selectedOrder.id, token);
        toast.success(successText);
        await loadOrders(selectedOrder.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : '操作失敗';
        toast.error(message);
      } finally {
        setOperationLoading(false);
        setOperationType(null);
      }
    },
    [loadOrders, selectedOrder?.id]
  );

  const confirmPaidOrder = useCallback(
    async (orderId: string) => {
      let confirmed = false;
      for (let i = 0; i < 6; i += 1) {
        const latestOrders = await loadOrders(orderId);
        const target = latestOrders.find((order) => order.id === orderId);
        if (target?.status === ORDER_STATUS.PAID) {
          confirmed = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }

      if (!confirmed) {
        toast.info('付款已送出，訂單狀態同步中，請稍後重新整理確認。');
      }
    },
    [loadOrders]
  );

  const chartData = useMemo(() => {
    const paidOrders = orders.filter((order) => order.status === ORDER_STATUS.PAID).length;
    const unpaidOrders = orders.filter((order) => order.status === ORDER_STATUS.PENDING).length;
    const failedOrders = orders.filter((order) => order.status === ORDER_STATUS.PAYMENT_FAILED).length;
    const closedOrders = orders.filter((order) =>
      ([ORDER_STATUS.CANCELLED, ORDER_STATUS.REFUNDED] as Array<Order['status']>).includes(
        order.status
      )
    ).length;

    return {
      labels: [
        getOrderStatusLabel(ORDER_STATUS.PAID),
        getOrderStatusLabel(ORDER_STATUS.PENDING),
        getOrderStatusLabel(ORDER_STATUS.PAYMENT_FAILED),
        '已關閉(取消/退款)',
      ],
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

  const stats = useMemo(() => {
    const paid = orders.filter((order) => order.status === ORDER_STATUS.PAID);
    const unpaid = orders.filter((order) => order.status === ORDER_STATUS.PENDING);
    const failed = orders.filter((order) => order.status === ORDER_STATUS.PAYMENT_FAILED);

    return {
      totalOrders: orders.length,
      paidCount: paid.length,
      unpaidCount: unpaid.length,
      failedCount: failed.length,
      paidRevenue: paid.reduce((sum, order) => sum + (order.total || 0), 0),
    };
  }, [orders]);

  return {
    orders,
    selectedOrder,
    clientSecret,
    loading,
    error,
    operationLoading,
    operationType,
    paymentIntentError,
    chartData,
    stats,
    loadOrders,
    setSelectedOrder,
    setSelectedOrderById,
    mutateOrder,
    confirmPaidOrder,
  };
}
