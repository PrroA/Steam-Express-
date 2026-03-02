import { useEffect, useState } from 'react';
import axios from 'axios';
import { addToCart } from './api/cartApi';
import Image from 'next/image';
import { toast } from 'react-toastify';
import { FaHeartBroken } from 'react-icons/fa';
import Link from 'next/link';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://steam-express.onrender.com'
    : 'http://localhost:4000');

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [priceDropAlerts, setPriceDropAlerts] = useState([]);

  useEffect(() => {
    const loadWishlist = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await axios.get(`${API_BASE_URL}/wishlist`, { 
          headers: { Authorization: `Bearer ${token}` }, 
        }); 
        const nextWishlist = response.data;
        setWishlist(nextWishlist);

        const snapshotKey = 'wishlistPriceSnapshot';
        const rawSnapshot = localStorage.getItem(snapshotKey);
        const previousSnapshot = rawSnapshot ? JSON.parse(rawSnapshot) : {};
        const nextSnapshot = { ...(previousSnapshot || {}) };
        const drops = [];

        nextWishlist.forEach((game) => {
          const currentPrice = parseFloat((game.price || '$0').replace('$', '')) || 0;
          const previousPrice = parseFloat(previousSnapshot?.[game.id] || currentPrice);
          if (currentPrice < previousPrice) {
            drops.push({
              id: game.id,
              name: game.name,
              previousPrice,
              currentPrice,
            });
          }
          nextSnapshot[game.id] = String(currentPrice);
        });

        Object.keys(nextSnapshot).forEach((id) => {
          if (!nextWishlist.some((game) => String(game.id) === id)) {
            delete nextSnapshot[id];
          }
        });

        if (drops.length > 0) {
          toast.info(`願望清單有 ${drops.length} 款遊戲降價`);
        }
        setPriceDropAlerts(drops);
        localStorage.setItem(snapshotKey, JSON.stringify(nextSnapshot));
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
      await axios.delete(`${API_BASE_URL}/wishlist/${gameId}`, {
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
        <div className="p-6 bg-gray-900 min-h-screen flex flex-col items-center justify-center text-white">
          <FaHeartBroken size={80} className="text-gray-600 mb-4" />
          <h1 className="text-2xl font-bold">你的收藏清單是空的</h1>
          <p className="text-gray-400">快去發掘喜愛的遊戲吧！</p>
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
      <div className="p-6 bg-gray-900 min-h-screen text-white">
        <h1 className="text-3xl font-bold mb-6 text-center">❤️ 我的收藏</h1>

        {priceDropAlerts.length > 0 && (
          <div className="max-w-4xl mx-auto mb-4 rounded-lg border border-[#66c0f455] bg-[#152b3e] p-4">
            <p className="text-sm font-bold text-[#d8e6f3]">降價通知</p>
            <ul className="mt-2 space-y-1 text-sm text-[#9ec5df]">
              {priceDropAlerts.map((alert) => (
                <li key={alert.id}>
                  {alert.name}：${alert.previousPrice.toFixed(2)} →{' '}
                  <span className="font-bold text-[#8bc53f]">${alert.currentPrice.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="max-w-4xl mx-auto bg-gray-800 p-6 rounded-lg shadow-lg">
          {wishlist.map((game) => (
            <div key={game.id} className="border-b py-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Image
                  src={game.image || '/public/vercel.svg'}
                  alt={game.name}
                  width={64}
                  height={64}
                  className="rounded shadow"
                />
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
