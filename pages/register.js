import { useState } from 'react';
import axios from 'axios';
import { Header } from '../components/Header';
import { toast } from 'react-toastify';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/register`, { username, password });
      toast.success(response.data.message);
    } catch (error) {
      toast.error(error.response?.data?.message || '註冊失敗');
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-96 border border-gray-700">
          <h1 className="text-3xl font-bold mb-6 text-blue-400 text-center">創建您的帳戶</h1>
          <input
            type="text"
            placeholder="用戶名"
            className="w-full p-3 mb-4 bg-gray-700 text-white border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="密碼"
            className="w-full p-3 mb-4 bg-gray-700 text-white border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            onClick={handleRegister}
            className="w-full py-3 bg-blue-500 text-white font-semibold rounded hover:bg-blue-600 transition duration-200 shadow-lg"
          >
            註冊
          </button>
        </div>
      </div>
    </>
  );
}
