import { useEffect, useState } from 'react';
import axios from 'axios';
import { Header } from '../components/Header';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { FaClipboardList } from 'react-icons/fa';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

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
        setOrders(response.data);
      } catch (error) {
        console.error('無法獲取訂單:', error.response?.data || error.message);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, []);

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
      toast.success(response.data.message);

      // 更新訂單狀態
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId ? { ...order, status: '已付款' } : order
        )
      );
    } catch (error) {
      console.error('支付失敗:', error.response?.data || error.message);
      toast.error('支付失敗，請稍後再試');
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="p-6 bg-gray-900 min-h-screen flex flex-col items-center justify-center text-white">
          <div className="w-12 h-12 border-4 border-blue-500 border-dotted rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-400">加載中...</p>
        </div>
      </>
    );
  }

  if (orders.length === 0) {
    return (
      <>
        <Header />
        <div className="p-6 bg-gray-900 min-h-screen flex flex-col items-center justify-center text-white">
          <FaClipboardList size={80} className="text-gray-600 mb-4" />
          <h1 className="text-2xl font-bold">你還沒有訂單</h1>
          <p className="text-gray-400">趕快去選購你的遊戲吧！</p>
          <a href="/" className="mt-4 bg-blue-500 py-2 px-4 rounded hover:bg-blue-700 transition">
            返回商店
          </a>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="p-6 bg-gray-900 min-h-screen text-white">
        <h1 className="text-3xl font-bold mb-6 text-center">📜 訂單紀錄</h1>

        <div className="max-w-4xl mx-auto bg-gray-800 p-6 rounded-lg shadow-lg">
          {orders.map((order) => (
            <div key={order.id} className="border-b py-6">
              <div className="flex items-center space-x-4">
                <img src={order.items[0].image} alt="訂單封面" className="w-20 h-20 rounded shadow" />
                <div>
                  <h2 className="text-lg font-bold">訂單 ID: {order.id}</h2>
                  <p className="text-gray-400">訂單日期: {new Date(order.date).toLocaleString()}</p>
                  <p className={`font-bold ${order.status === '已付款' ? 'text-green-400' : 'text-red-400'}`}>
                    狀態: {order.status}
                  </p>
                </div>
              </div>

              <ul className="mt-4 bg-gray-700 p-4 rounded-lg">
                {order.items.map((item) => (
                  <li key={item.id} className="flex justify-between text-gray-300">
                    <span>{item.name} x {item.quantity}</span>
                    <span>${(parseFloat(item.price.replace('$', '')) * item.quantity).toFixed(2)}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex justify-between items-center">
                <p className="text-xl font-bold text-yellow-400">總金額: ${order.total.toFixed(2)}</p>
                {order.status === '未付款' && (
                  <button
                    onClick={() => handlePay(order.id)}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-700 transition"
                  >
                    💰 立即支付
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
