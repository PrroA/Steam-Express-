import { useState } from 'react';
import axios from 'axios';
import { Header } from '../components/Header';
import { toast } from 'react-toastify';
import { useRouter } from 'next/router';


export default function AdminPage() {
    const router = useRouter(); // 正確使用 useRouter

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const handleAddGame = async () => {
    const token = localStorage.getItem('token');
    console.log('發送請求的數據:', { name, price, description }); // 打印發送的數據
    console.log('Token:', token); // 打印 Token
    try {
      const response = await axios.post('http://localhost:4000/games',{ name, price, description },
        {headers: { Authorization: `Bearer ${token}` },});
      console.log('後端返回:', response.data); // 打印後端返回的數據
      toast.success('遊戲已添加');
      router.push('/'); // 登入成功後跳轉
    } catch (error) {
        toast.error('添加遊戲失敗：' + (error.response?.data?.message || error.message));
    }
  };
  

  return (
    <>
      <Header />
      <div className="p-6 bg-gray-100 min-h-screen">
        <h1 className="text-3xl font-bold mb-6">管理界面</h1>
        <div className="max-w-md mx-auto bg-white p-4 rounded shadow">
          <h2 className="text-xl font-bold mb-4">添加新遊戲</h2>
          <input
            type="text"
            placeholder="遊戲名稱"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border px-4 py-2 rounded mb-2 w-full"
          />
          <input
            type="number"
            placeholder="價格"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="border px-4 py-2 rounded mb-2 w-full"
          />
          <textarea
            placeholder="描述"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="border px-4 py-2 rounded mb-2 w-full"
          />
          <button
            onClick={handleAddGame}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
          >
            添加遊戲
          </button>
        </div>
      </div>
    </>
  );
}
