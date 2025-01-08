import { useEffect, useState } from 'react';
import axios from 'axios';
import { Header } from '../components/Header';
import Link from 'next/link';
import { toast } from 'react-toastify';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const loadOrders = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Token 不存在，無法獲取訂單');
        return;
      }
      try {
        const response = await axios.get('http://localhost:4000/orders', {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('獲取的訂單:', response.data); // 調試輸出
        setOrders(response.data);
      } catch (error) {
        console.error('無法獲取訂單:', error.response?.data || error.message);
      }
    };

    loadOrders();
  }, []);

  if (orders.length === 0) {
    return (
      <>
        <Header />
        <div className="p-6 bg-gray-100 min-h-screen text-center">
          <h1 className="text-2xl font-bold text-gray-700">你還沒有訂單</h1>
        </div>
      </>
    );
  }
  const handlePay = async (orderId) => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.post(
        'http://localhost:4000/pay',
        { orderId },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success(response.data.message); // 通知提示

      // 更新訂單狀態
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId ? { ...order, status: '已付款' } : order
        )
      );
    } catch (error) {
      console.error('支付失敗:', error.response?.data || error.message);
      alert('支付失敗，請稍後再試');
    }
  };

  return (
    <>
      <Header />
      <div className="p-6 bg-gray-100 min-h-screen">
        <h1 className="text-2xl font-bold text-gray-700 mb-4">歷史訂單</h1>
        <div className="max-w-4xl mx-auto bg-white p-4 rounded-lg shadow">
          {orders.map((order) => (
            <div key={order.id} className="border-b py-4">
              <h2 className="text-lg font-bold text-gray-700">訂單 ID: {order.id}</h2>
              <p className="text-gray-700">訂單日期: {new Date(order.date).toLocaleString()}</p>
              <ul className="mt-2">
                {order.items.map((item) => (
                  <li key={item.id} className="flex justify-between text-gray-700">
                    <span>{item.name} x {item.quantity}</span>
                    <span>${(parseFloat(item.price.replace('$', '')) * item.quantity).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-gray-700 font-bold">總金額: ${order.total.toFixed(2)}</p>
              <p className="text-gray-700">狀態: {order.status}</p>
              {order.status === '未付款' && (
                <button
                  onClick={() => handlePay(order.id)}
                  className="bg-green-500 text-white px-4 py-2 rounded mt-2 hover:bg-green-700"
                >
                  支付
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
