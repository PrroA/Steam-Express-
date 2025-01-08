import { useEffect, useState } from 'react';
import { fetchCart, removeFromCart } from './api/cartApi'; // API 方法
import { Header } from '../components/Header';
import axios from 'axios';
import { toast } from 'react-toastify';
export default function CartPage() {
  const [cart, setCart] = useState([]); 
  const [total, setTotal] = useState(0); // 總價

  // 加載購物車內容
  useEffect(() => {
    const loadCart = async () => {
      const token = localStorage.getItem('token');
      try {
        const data = await fetchCart(token); // 從伺服器獲取購物車內容
        console.log('購物車內容:', data);
        setCart(Array.isArray(data) ? data : []); // 確保 data 是數組
        calculateTotal(Array.isArray(data) ? data : []);
      } catch (error) {
        setCart([]); // 如果出錯，設置為空數組
      }
    };
    loadCart();
  }, []);
  // 結帳按鈕
  const handleCheckout = async () => {
    const token = localStorage.getItem('token');
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
      toast.success('結帳成功');
      setCart([]); // 清空購物車
      setTotal(0); // 重置總價
    } catch (error) {
      console.error('結帳失敗:', error.response?.data || error.message);
      alert('結帳失敗，請稍後再試');
    }
  };

  // 計算總價
  const calculateTotal = (cartItems) => {
    if (!Array.isArray(cartItems)) {
      setTotal(0);
      return;
    }

    const totalPrice = cartItems.reduce((sum, item) => {
      return sum + parseFloat(item.price.replace('$', '')) * item.quantity;
    }, 0);
    setTotal(totalPrice);
  };


  // 移除商品
  const handleRemove = async (id) => {
    const token = localStorage.getItem('token');
    try {
      const updatedCart = await removeFromCart(id, token);
      setCart(Array.isArray(updatedCart) ? updatedCart : []); // 確保是數組
      calculateTotal(Array.isArray(updatedCart) ? updatedCart : []);
    } catch (error) {
      console.error('移除商品失敗:', error);
    }
  };


  // 清空購物車
  const handleClearCart = async () => {
    const token = localStorage.getItem('token');
    try {
      for (let item of cart) {
        await removeFromCart(item.id, token);
      }
      setCart([]); // 清空購物車內容
      setTotal(0); // 重置總價
      alert('購物車已清空');
    } catch (error) {
      console.error('清空購物車失敗:', error);
    }
  };


  if (cart.length === 0) {
    return (
      <>
        <Header />
        <div className="p-6 bg-gray-100 min-h-screen text-center">
          <h1 className="text-2xl font-bold text-gray-700">你的購物車是空的</h1>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="p-6 bg-gray-100 min-h-screen">
        <h1 className="text-2xl font-bold text-gray-700 mb-4">購物車</h1>
        <div className="max-w-4xl mx-auto bg-white p-4 rounded-lg shadow">
          <ul>
            {Array.isArray(cart) && cart.map((item) => (
              <li key={item.id} className="flex items-center justify-between py-4 border-b">
                <div className="flex items-center">
                  <img src={item.image} alt={item.name} className="w-16 h-16 object-cover mr-4" />
                  <div>
                    <h2 className="font-bold text-lg text-gray-700">{item.name}</h2>
                    <p className="text-gray-700">數量: {item.quantity}</p>
                    <p className="text-gray-700">價格: {item.price}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(item.id)}
                  className="text-red-500 hover:underline"
                >
                  移除
                </button>
              </li>
            ))}

          </ul>
          <div className="mt-4 text-right">
            <h2 className="text-xl font-bold text-gray-700">總價: ${total.toFixed(2)}</h2>
            <button
              onClick={handleClearCart}
              className="bg-red-500 text-white px-4 py-2 rounded mt-2 hover:bg-red-700"
            >
              清空購物車
            </button>
            <button
              onClick={handleCheckout}
              className="bg-green-500 text-white px-4 py-2 rounded mt-2 hover:bg-green-700"
            >
              結帳
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
