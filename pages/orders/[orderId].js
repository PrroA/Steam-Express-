import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Header } from '../../components/Header';

export default function OrderDetail() {
  const router = useRouter();
  const { orderId } = router.query; // 動態路由參數
  const [order, setOrder] = useState(null); // 儲存訂單資訊
  const [loading, setLoading] = useState(true); // 控制加載狀態

  useEffect(() => {
    const loadOrder = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await axios.get(`http://localhost:4000/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrder(response.data); // 儲存訂單資訊
      } catch (error) {
        console.error('無法獲取訂單詳情:', error.response?.data || error.message);
      } finally {
        setLoading(false); // 加載完成
      }
    };

    if (orderId) loadOrder();
  }, [orderId]);

  if (loading) {
    return <div className="p-6 bg-gray-100 min-h-screen">加載中...</div>;
  }

  if (!order) {
    return <div className="p-6 bg-gray-100 min-h-screen">未找到訂單</div>;
  }

  return (
    <>
      <Header />
      <div className="p-6 bg-gray-100 min-h-screen">
        <h1 className="text-2xl font-bold text-gray-700">訂單詳情</h1>
        <div className="max-w-4xl mx-auto bg-white p-4 rounded-lg shadow mt-4">
          <h2 className="text-lg font-bold">訂單 ID: {order.id}</h2>
          <p>訂單日期: {new Date(order.date).toLocaleString()}</p>
          <p>狀態: {order.status}</p>
          {order.paymentDetails && (
            <div className="mt-4">
              <h3 className="text-lg font-bold">支付詳情:</h3>
              <p>交易 ID: {order.paymentDetails.transactionId}</p>
              <p>支付時間: {new Date(order.paymentDetails.paidAt).toLocaleString()}</p>
            </div>
          )}
          <ul className="mt-4">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between py-2">
                <span>{item.name} x {item.quantity}</span>
                <span>${(parseFloat(item.price.replace('$', '')) * item.quantity).toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <p className="text-lg font-bold mt-4">總金額: ${order.total.toFixed(2)}</p>
        </div>
      </div>
    </>
  );
}
