import { useEffect, useState } from 'react';
import axios from 'axios';
import { Header } from '../components/Header';
import { addToCart } from './api/cartApi';
export default function WishlistPage() {
  const [wishlist, setWishlist] = useState([]);

  useEffect(() => {
    const loadWishlist = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await axios.get('http://localhost:4000/wishlist', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setWishlist(response.data);
      } catch (error) {
        console.error('無法獲取收藏清單:', error.response?.data || error.message);
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
      alert('已從收藏清單移除');
    } catch (error) {
      console.error('移除收藏失敗:', error.response?.data || error.message);
    }
  };

  const handleAddToCart = async (gameId) => {
    const token = localStorage.getItem('token');
    try {
      await addToCart(gameId, token);
      setWishlist((prev) => prev.filter((game) => game.id !== gameId));

      alert('商品已加入購物車');
    } catch (error) {
      console.error('加入購物車失敗:', error.message);
      alert('加入購物車失敗');
    }
  };

  if (wishlist.length === 0) {
    return (
      <>
        <Header />
        <div className="p-6 bg-gray-100 min-h-screen text-center">
          <h1 className="text-2xl font-bold text-gray-700">你的收藏清單是空的</h1>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="p-6 bg-gray-100 min-h-screen">
        <h1 className="text-2xl font-bold text-gray-700 mb-4">收藏清單</h1>
        <div className="max-w-4xl mx-auto bg-white p-4 rounded-lg shadow">
          {wishlist.map((game) => (
            <div key={game.id} className="border-b py-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-700">{game.name}</h2>
                <p className="text-sm text-gray-500">{game.description}</p>
              </div>
              <div>
                <button
                  onClick={() => handleAddToCart(game.id)}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  加入購物車
                </button>
                <button
                  onClick={() => handleRemoveFromWishlist(game.id)}
                  className="bg-red-500 text-white px-4 py-2 rounded ml-2 hover:bg-red-700"
                >
                  移除
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
