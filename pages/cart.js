import { useEffect, useState } from 'react';
import { fetchCart, removeFromCart } from './api/cartApi'; // API 方法
import { Header } from '../components/Header';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaShoppingCart } from 'react-icons/fa';
import { FaPlus, FaMinus } from 'react-icons/fa'; // 新增圖示
import { useRouter } from 'next/router';
import Link from 'next/link';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState([]);
  const [total, setTotal] = useState(0); // 總價

  // 加載購物車內容
  useEffect(() => {
    const loadCart = async () => {
      const token = localStorage.getItem('token');
      try {
        const data = await fetchCart(token);
        setCart(Array.isArray(data) ? data : []); // 確保 data 是數組
        calculateTotal(Array.isArray(data) ? data : []);
      } catch (error) {
        setCart([]);
      }
    };
    loadCart();
  }, []);

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
      // 先更新本地狀態，提供即時反饋
      const updatedCart = cart.filter((item) => item.id !== id);
      setCart(updatedCart);
      calculateTotal(updatedCart);

      // 發送請求到伺服器
      await removeFromCart(id, token);
      toast.success('商品已移除');
    } catch (error) {
      // 如果請求失敗，還原購物車狀態
      const originalCart = await fetchCart(token);
      setCart(Array.isArray(originalCart) ? originalCart : []);
      calculateTotal(Array.isArray(originalCart) ? originalCart : []);
      console.error('移除商品失敗:', error);
      toast.error('移除商品失敗，請稍後再試');
    }
  };

  // 清空購物車
  const handleClearCart = async () => {
    const token = localStorage.getItem('token');
    try {
      // 使用 Promise.all 批次處理請求
      const results = await Promise.all(
        cart.map((item) => removeFromCart(item.id, token).catch((error) => ({ error, item })))
      );

      // 檢查是否有失敗的請求
      const failedItems = results.filter((result) => result.error);
      if (failedItems.length > 0) {
        console.error('部分商品清空失敗:', failedItems);
        toast.error(`部分商品清空失敗 (${failedItems.length} 項)`);
      } else {
        toast.success('購物車已清空');
      }

      // 更新購物車狀態
      setCart([]);
      setTotal(0);
    } catch (error) {
      console.error('清空購物車失敗:', error);
      toast.error('清空購物車失敗，請稍後再試');
    }
  };
  const handleQuantityChange = async (id, change) => {
    const token = localStorage.getItem('token');
    const item = cart.find((item) => item.id === id);
    const newQuantity = Math.max(1, item.quantity + change); // 確保數量不小於 1

    try {
      const response = await axios.patch(
        `${API_BASE_URL}/cart/${id}`,
        { quantity: newQuantity },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.cart) {
        setCart(response.data.cart);
        calculateTotal(response.data.cart);
      }
    } catch (error) {
      console.error('更新數量失敗:', error);
      toast.error('更新數量失敗，請稍後再試');
    }
  };
  // 結帳
  const handleCheckout = async () => {
    const token = localStorage.getItem('token');
    try {
      await axios.post(
        `${API_BASE_URL}/checkout`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success('請至（查看訂單）進行付款');
      setCart([]);
      setTotal(0);
      router.push('/orders');
    } catch (error) {
      console.error('結帳失敗:', error.response?.data || error.message);
      toast.error('結帳失敗，請稍後再試');
    }
  };

  if (cart.length === 0) {
    return (
      <>
        <Header />
        <div className="p-6 bg-gray-900 min-h-screen flex flex-col items-center justify-center text-white">
          <FaShoppingCart size={80} className="text-gray-600 mb-4" />
          <h1 className="text-2xl font-bold">你的購物車是空的</h1>
          <p className="text-gray-400">快去逛逛遊戲吧！</p>
          <Link
            href="/"
            className="mt-4 bg-blue-500 py-2 px-4 rounded hover:bg-blue-700 transition"
          >
            返回商店
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="p-6 bg-gray-900 min-h-screen text-white">
        <h1 className="text-3xl font-bold mb-6 text-center">🛒 購物車</h1>

        <div className="max-w-4xl mx-auto bg-gray-800 p-6 rounded-lg shadow-lg">
          <ul className="space-y-4">
            {cart.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between p-4 bg-gray-700 rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <img src={item.image} alt={item.name} className="w-16 h-16 rounded" />
                  <div>
                    <h2 className="text-lg font-bold">{item.name}</h2>
                    <div className="flex items-center space-x-2 my-2">
                      <button
                        onClick={() => handleQuantityChange(item.id, -1)}
                        className="bg-gray-600 hover:bg-gray-500 p-1 rounded"
                      >
                        <FaMinus size={12} />
                      </button>
                      <span className="text-gray-300">{item.quantity}</span>
                      <button
                        onClick={() => handleQuantityChange(item.id, 1)}
                        className="bg-gray-600 hover:bg-gray-500 p-1 rounded"
                      >
                        <FaPlus size={12} />
                      </button>
                    </div>
                    <p className="text-green-400 font-bold">
                      單價: ${parseFloat(item.price.replace('$', '')).toFixed(2)}
                    </p>
                    <p className="text-yellow-400 font-bold">
                      小計: ${(parseFloat(item.price.replace('$', '')) * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(item.id)}
                  className="bg-red-500 text-white py-1 px-3 rounded hover:bg-red-700 transition"
                >
                  移除
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-6 text-right">
            <h2 className="text-xl font-bold">
              總價: <span className="text-yellow-400">${total.toFixed(2)}</span>
            </h2>
            <div className="flex justify-end space-x-4 mt-4">
              <button
                onClick={handleClearCart}
                className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-800 transition"
              >
                清空購物車
              </button>
              <button
                onClick={handleCheckout}
                className="bg-green-500 text-white py-2 px-6 rounded hover:bg-green-700 transition"
              >
                結帳
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
