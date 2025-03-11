import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import { Header } from '../components/Header';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}/forgot-password`, { username });
      setMessage('🔗 重設密碼的連結已發送到您的郵箱 📩');
      setTimeout(() => {
        router.push('/ConfirmResetPassword');
      }, 3000);
    } catch (error) {
      setMessage(error.response?.data?.message || '❌ 請求失敗，請稍後再試');
    }
  };

  return (
    <>
      <Header />
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <form onSubmit={handleForgotPassword} className="bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-700 w-96">
          <h1 className="text-3xl font-bold mb-6 text-blue-400 text-center">忘記密碼？</h1>
          <p className="text-gray-400 text-center mb-4">請輸入您的帳號，我們將發送密碼重設連結</p>
          <input
            type="text"
            placeholder="輸入帳號"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-3 bg-gray-700 text-white border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            required
          />
          <button
            type="submit"
            className="w-full py-3 bg-blue-500 text-white font-semibold rounded hover:bg-blue-600 transition duration-200 shadow-lg"
          >
            發送重設密碼連結
          </button>
          {message && <p className="mt-4 text-green-400 text-center">{message}</p>}
        </form>
      </div>
    </>
  );
}
