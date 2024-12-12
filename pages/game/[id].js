import { useRouter } from 'next/router';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { Header } from '../../components/Header';
export default function GameDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [game, setGame] = useState(null); // 存儲遊戲資訊
  const [loading, setLoading] = useState(true); // 控制加載狀態

  useEffect(() => {
    const fetchGameDetails = async () => {
      try {
        const response = await axios.get(`http://localhost:4000/games/${id}`);
        setGame(response.data); // 儲存遊戲資訊
      } catch (error) {
        console.error('無法獲取遊戲詳情:', error.response?.data || error.message);
        alert('無法獲取遊戲詳情');
      } finally {
        setLoading(false); // 加載完成
      } 
    };
    fetchGameDetails();
  }, [id]);
  const handleAddToCart = async (gameId) => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.post(
        'http://localhost:4000/cart',
        { id: gameId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      alert('商品已加入購物車 response.data.quantity 件');
    } catch (error) {
      console.error('加入購物車失敗:', error.response?.data || error.message);
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
        onClick={() => handleAddToCart(Number(id))}
        className="bg-blue-500 text-white py-2 px-4 rounded mt-4 hover:bg-blue-700"
      >
        加入購物車
      </button>
    </div>
    </>
  );
}
