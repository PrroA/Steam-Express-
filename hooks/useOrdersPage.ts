import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  createPaymentIntent,
  fetchOrders as fetchOrdersApi,
} from '../services/orderService';
import type { Order } from '../types/domain';
import { upsertOrderStatusAlertsFromOrders } from '../utils/wishlistAlerts';

export function useOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const unpaidOrder = data.find((order) => order.status === '未付款');
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
      if (!selectedOrder || selectedOrder.status !== '未付款') {
        setClientSecret(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const data = await createPaymentIntent(selectedOrder.id, token);
        setClientSecret(data.clientSecret || null);
      } catch (fetchError: any) {
        setError(fetchError?.message || '載入付款資訊失敗');
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
      successText: string
    ) => {
      if (!selectedOrder?.id) return;
      try {
        const token = localStorage.getItem('token');
        await runner(selectedOrder.id, token);
        toast.success(successText);
        await loadOrders(selectedOrder.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : '操作失敗';
        toast.error(message);
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
        if (target?.status === '已付款') {
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
    const paidOrders = orders.filter((order) => order.status === '已付款').length;
    const unpaidOrders = orders.filter((order) => order.status === '未付款').length;
    const failedOrders = orders.filter((order) => order.status === '付款失敗').length;
    const closedOrders = orders.filter((order) => ['已取消', '已退款'].includes(order.status)).length;

    return {
      labels: ['已付款', '未付款', '付款失敗', '已關閉(取消/退款)'],
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
    const paid = orders.filter((order) => order.status === '已付款');
    const unpaid = orders.filter((order) => order.status === '未付款');
    const failed = orders.filter((order) => order.status === '付款失敗');

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
    chartData,
    stats,
    loadOrders,
    setSelectedOrder,
    setSelectedOrderById,
    mutateOrder,
    confirmPaidOrder,
  };
}
