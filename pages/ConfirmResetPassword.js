import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import { Header } from '../components/Header';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export default function ConfirmResetPasswordPage() {
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    if (!resetToken || !newPassword) {
      setMessage('請輸入所有欄位');
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/confirm-reset-password`, {
        resetToken,
        newPassword,
      });
      setMessage('密碼重設成功，正在跳轉至登入頁面...');
      setTimeout(() => {
        router.push('/login'); // 成功後導向到登入頁面
      }, 3000);
    } catch (error) {
      setMessage(error.response?.data.message || '密碼重設失敗，請確認 Token 是否正確');
    }
  };

  return (
    <>
    <Header />
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold text-blue-500 mb-4 text-center">重設密碼</h1>
        <p className="text-sm text-gray-500 mb-6 text-center">
          請輸入臨時 Token 和新密碼來完成密碼重設
        </p>
        <form onSubmit={handleConfirmReset}>
          <input
            type="text"
            placeholder="輸入臨時 Token"
            value={resetToken}
            onChange={(e) => setResetToken(e.target.value)}
            className="w-full border p-2 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="password"
            placeholder="輸入新密碼"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full border p-2 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-700 transition"
          >
            提交新密碼
          </button>
          {message && (
            <p className="mt-4 text-sm text-center text-green-500">{message}</p>
          )}
        </form>
      </div>
    </div>
    </>
  );
}
