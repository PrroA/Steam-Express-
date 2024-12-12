import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import { Header } from '../components/Header';

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:4000/forgot-password', { username });
      setMessage('重設密碼的連結已發送到您的郵箱');
      setTimeout(() => {
        router.push('/ConfirmResetPassword'); // 導向到重設密碼頁面
      }, 3000);
    } catch (error) {
      setMessage(error.response?.data.message || '請求失敗，請稍後再試');
    }
  };

  return (
    <>
      <Header />
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <form onSubmit={handleForgotPassword} className="bg-white p-6 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-4 text-blue-500">忘記密碼</h1>
          <input
            type="text"
            placeholder="輸入帳號"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border p-2 rounded mb-4"
            required
          />
          <button type="submit" className="bg-blue-500 text-white py-2 px-4 rounded">
            發送重設密碼連結
          </button>
          {message && <p className="mt-4 text-green-500">{message}</p>}
        </form>
      </div>
    </>
  );
}
