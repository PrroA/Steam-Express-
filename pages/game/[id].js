import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Header } from '../../components/Header';
import { fetchGameDetails } from '../api/gameApi';
import { addToCart } from '../api/cartApi';
import axios from 'axios';
import { toast } from 'react-toastify';

export default function GameDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadGameDetails = async () => {
      try {
        const data = await fetchGameDetails(id);
        setGame(data);
      } catch (error) {
        console.error('無法獲取遊戲詳情:', error.message);
        toast.error('無法獲取遊戲詳情');
      } finally {
        setLoading(false);
      }
    };

    if (id) loadGameDetails();
  }, [id]);

  // 加入願望清單
  const handleAddToWishlist = async () => {
    const token = localStorage.getItem('token');
    try {
      await axios.post('http://localhost:4000/wishlist', { id: Number(id) }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('已加入願望清單');
    } catch (error) {
      console.error('添加到收藏清單失敗:', error.response?.data || error.message);
      toast.error('添加到收藏清單失敗');
    }
  };

  // 加入購物車
  const handleAddToCart = async () => {
    const token = localStorage.getItem('token');
    try {
      await addToCart(Number(id), token);
      toast.success('已加入購物車');
    } catch (error) {
      console.error('加入購物車失敗:', error.message);
      toast.error('加入購物車失敗');
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-900 min-h-screen flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-blue-500 border-dotted rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-400">加載中...</p>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="p-6 bg-gray-900 min-h-screen flex flex-col items-center justify-center text-white">
        <p className="text-xl font-bold text-red-500">遊戲未找到</p>
        <p className="text-gray-400">請檢查遊戲 ID 或稍後再試。</p>
        <a href="/" className="mt-4 bg-blue-500 py-2 px-4 rounded hover:bg-blue-700 transition">
          返回商店
        </a>
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className="p-6 bg-gray-900 min-h-screen text-white">
        <div className="max-w-4xl mx-auto bg-gray-800 p-6 rounded-lg shadow-lg">
          {/* 遊戲標題 & 圖片 */}
          <h1 className="text-3xl font-bold mb-4">{game.name}</h1>
          <img src={game.image} alt={game.name} className="w-full h-64 object-cover rounded-lg shadow" />

          {/* 遊戲資訊 */}
          <p className="text-xl font-bold text-yellow-400 mt-4">價格: {game.price}</p>
          <p className="text-gray-300 mt-2">{game.description}</p>

          {/* 操作按鈕 */}
          <div className="mt-6 flex space-x-4">
            <button
              onClick={handleAddToCart}
              className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-700 transition"
            >
              🛒 加入購物車
            </button>
            <button
              onClick={handleAddToWishlist}
              className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-400 transition"
            >
              ❤️ 加入願望清單
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
