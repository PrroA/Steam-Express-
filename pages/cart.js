import { useEffect, useState } from 'react';
import axios from 'axios';
import { Header } from '../components/Header';
export default function CartPage() {
  const [cart, setCart] = useState([]);

  useEffect(() => {
    const fetchCart = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await axios.get('http://localhost:4000/cart', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setCart(response.data);
      } catch (error) {
        console.error('無法獲取購物車:', error.response?.data || error.message);
      }
    };

    fetchCart();
  }, []);

  const handleRemoveItem = async (id) => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.delete(`http://localhost:4000/cart/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setCart(response.data.cart);
      alert('商品已移除');
    } catch (error) {
      alert('移除商品失敗');
    }
  };

  const handleCheckout = async () => {
    const token = localStorage.getItem('token');
    console.log('Token:', token); // 調試
    try {
      const response = await axios.post(
        'http://localhost:4000/checkout',
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      alert(response.data.message);
      setCart([]); // 清空購物車
    } catch (error) {
      console.error('結帳失敗:', error.response?.data || error.message);
      alert('結帳失敗，請稍後再試');
    }
  };
  

  const totalPrice = cart.reduce((total, item) => {
    return total + parseFloat(item.price.replace('$', '')) * item.quantity;
  }, 0);

  return (
    <>
      <Header />
   
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">購物車</h1>
      {cart.length === 0 ? (
        <p className="text-center text-gray-500">你的購物車是空的</p>
      ) : (
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
          <ul className="divide-y divide-gray-300">
            {cart.map((item) => (
              <li key={item.id} className="flex justify-between items-center py-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-500">{item.name}</h2>
                  <p className="text-gray-500">數量: {item.quantity}</p>
                  <p className="text-gray-700">價格: {item.price}</p>
                </div>
                <button
                  className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-700"
                  onClick={() => handleRemoveItem(item.id)}
                >
                  移除
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-6 text-right">
            <h2 className="text-xl font-bold text-gray-500">總價: ${totalPrice.toFixed(2)}</h2>
            <button
              onClick={handleCheckout}
              className="bg-blue-500 text-white py-2 px-6 rounded hover:bg-blue-700 mt-4"
            >
              結帳
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
