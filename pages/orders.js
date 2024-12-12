import { useEffect, useState } from 'react';
import axios from 'axios';
import { Header } from '../components/Header';
export default function OrdersPage() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const fetchOrders = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await axios.get('http://localhost:4000/orders', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrders(response.data);
      } catch (error) {
        console.error('無法獲取訂單:', error.response?.data || error.message);
      }
    };

    fetchOrders();
  }, []);

  return (
    <>
      <Header />
   
    <div className="min-h-screen bg-blue-100 p-6">
      <h1 className="text-3xl font-bold mb-6 text-center text-blue-600">歷史訂單</h1>
      {orders.length === 0 ? (
        <p className="text-center text-gray-500">目前沒有訂單記錄</p>
      ) : (
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
          {orders.map((order) => (
            <div key={order.id} className="border-b border-red-300 py-4">
              <h2 className="text-xl font-bold text-gray-600">訂單 ID: {order.id}</h2>
              <p className="text-gray-600">訂單日期: {new Date(order.date).toLocaleString()}</p>
              <ul className="mt-2">
                {order.items.map((item) => (
                  <li key={item.id} className="flex justify-between text-gray-600">
                    <span>{item.name} x {item.quantity}</span>
                    <span>${(parseFloat(item.price.replace('$', '')) * item.quantity).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <p className="text-right font-bold mt-2 text-gray-600">總金額: ${order.total.toFixed(2)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  );
}
