import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Header } from '../../components/Header';
import { fetchGameDetails } from '../api/gameApi';
import { addToCart } from '../api/cartApi';

export default function GameDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [game, setGame] = useState(null); // 存儲遊戲資訊
  const [loading, setLoading] = useState(true); // 控制加載狀態

  useEffect(() => {
    const loadGameDetails = async () => {
      try {
        const data = await fetchGameDetails(id);
        setGame(data); // 儲存遊戲資訊
      } catch (error) {
        console.error('無法獲取遊戲詳情:', error.message);
        alert('無法獲取遊戲詳情');
      } finally {
        setLoading(false); // 加載完成
      }
    };

    if (id) loadGameDetails();
  }, [id]);

  const handleAddToCart = async () => {
    const token = localStorage.getItem('token');
    try {
      await addToCart(Number(id), token); // 確保 id 是數字類型
      alert('商品已加入購物車');
    } catch (error) {
      console.error('加入購物車失敗:', error.message);
      alert('加入購物車失敗');
    }
  };

  if (loading) {
    return <div className="p-6 bg-gray-100 min-h-screen">加載中...</div>;
  }

  if (!game) {
    return <div className="p-6 bg-gray-100 min-h-screen">未找到遊戲資訊</div>;
  }

  return (
    <>
      <Header />

      <div className="p-6 bg-red-100 min-h-screen">
        <h1 className="text-3xl font-bold text-red-500">{game.name}</h1>
        <p className="text-xl text-gray-700 text-blue-500">價格: {game.price}</p>
        <p className="mt-4 text-gray-600 text-black-500">描述: {game.description}</p>
        <button
          onClick={handleAddToCart}
          className="bg-blue-500 text-white py-2 px-4 rounded mt-4 hover:bg-blue-700"
        >
          加入購物車
        </button>
      </div>
    </>
  );
}
