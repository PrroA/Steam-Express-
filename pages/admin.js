import { useState } from 'react';
import axios from 'axios';
import { Header } from '../components/Header';
import { toast } from 'react-toastify';
import { useRouter } from 'next/router';

export default function AdminPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [preview, setPreview] = useState('');

  const handleAddGame = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.post(
        'http://localhost:4000/games',
        { name, price, description, image },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('遊戲已添加');
      router.push('/');
    } catch (error) {
      toast.error('❌ 添加遊戲失敗：' + (error.response?.data?.message || error.message));
    }
  };

  // 圖片輸入框處理
  const handleImageChange = (e) => {
    const url = e.target.value;
    setImage(url);
    setPreview(url);
  };

  return (
    <>
      <Header />
      <div className="p-6 bg-gray-900 min-h-screen text-white flex flex-col items-center">
        <h1 className="text-3xl font-bold mb-6">🛠️ 管理界面</h1>

        <div className="max-w-md mx-auto bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold mb-4">📦 添加新遊戲</h2>
          <p className="mb-4 text-gray-400">請填寫遊戲的名稱、價格、描述，並上傳封面圖片。</p>

          {/* 圖片預覽 */}
          {preview && (
            <div className="mb-4">
              <img src={preview} alt="封面預覽" className="w-full h-40 object-cover rounded shadow" />
            </div>
          )}

          <input
            type="text"
            placeholder="🎮 遊戲名稱"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border border-gray-600 bg-gray-700 text-white px-4 py-2 rounded mb-2 w-full focus:border-blue-500"
          />

          <input
            type="number"
            placeholder="💰 價格"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="border border-gray-600 bg-gray-700 text-white px-4 py-2 rounded mb-2 w-full focus:border-blue-500"
          />

          <textarea
            placeholder="📄 描述"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="border border-gray-600 bg-gray-700 text-white px-4 py-2 rounded mb-2 w-full focus:border-blue-500"
          />

          <input
            type="text"
            placeholder="🖼️ 封面圖片 URL"
            value={image}
            onChange={handleImageChange}
            className="border border-gray-600 bg-gray-700 text-white px-4 py-2 rounded mb-2 w-full focus:border-blue-500"
          />

          <button
            onClick={handleAddGame}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-700 w-full transition"
          >
            ✅ 添加遊戲
          </button>
        </div>
      </div>
    </>
  );
}
