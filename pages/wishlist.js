import { useEffect, useState } from 'react';
import axios from 'axios';
import { Header } from '../components/Header';
import { addToCart } from './api/cartApi';
import { toast } from 'react-toastify';
import { FaHeartBroken } from 'react-icons/fa';

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWishlist = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await axios.get('http://localhost:4000/wishlist', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setWishlist(response.data);
      } catch (error) {
        console.error('Unable to get wishlist:', error.response?.data || error.message);
      } finally {
        setLoading(false);
      }
    };
    loadWishlist();
  }, []);

  const handleRemoveFromWishlist = async (gameId) => {
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`http://localhost:4000/wishlist/${gameId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWishlist((prev) => prev.filter((game) => game.id !== gameId));
      toast.success('已從收藏清單移除');
    } catch (error) {
      console.error('移除收藏失敗:', error.response?.data || error.message);
      toast.error('移除收藏失敗');
    }
  };

  const handleAddToCart = async (gameId) => {
    const token = localStorage.getItem('token');
    try {
      await addToCart(gameId, token);
      setWishlist((prev) => prev.filter((game) => game.id !== gameId));
      toast.success('已加入購物車');
    } catch (error) {
      console.error('加入購物車失敗:', error.message);
      toast.error('加入購物車失敗');
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

  if (wishlist.length === 0) {
    return (
      <>
        <Header />
        <div className="p-6 bg-gray-900 min-h-screen flex flex-col items-center justify-center text-white">
          <FaHeartBroken size={80} className="text-gray-600 mb-4" />
          <h1 className="text-2xl font-bold">你的收藏清單是空的</h1>
          <p className="text-gray-400">快去發掘喜愛的遊戲吧！</p>
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
        <h1 className="text-3xl font-bold mb-6 text-center">❤️ 我的收藏</h1>

        <div className="max-w-4xl mx-auto bg-gray-800 p-6 rounded-lg shadow-lg">
          {wishlist.map((game) => (
            <div key={game.id} className="border-b py-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <img src={game.image} alt={game.name} className="w-16 h-16 rounded shadow" />
                <div>
                  <h2 className="text-lg font-bold">{game.name}</h2>
                  <p className="text-gray-300">{game.description}</p>
                  <p className="text-yellow-400 font-bold">價格: {game.price}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleAddToCart(game.id)}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-700 transition"
                >
                  🛒 加入購物車
                </button>
                <button
                  onClick={() => handleRemoveFromWishlist(game.id)}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-700 transition"
                >
                  ❌ 移除
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
