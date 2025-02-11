import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Header } from '../components/Header';
import { toast } from 'react-toastify';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:4000/login', { username, password });
      localStorage.setItem('token', response.data.token); // 保存 JWT Token
      toast.success('✅ 登入成功');
      router.push('/'); // 登入成功後跳轉
    } catch (error) {
      toast.error('❌ ' + (error.response?.data?.message || '登入失敗，請檢查帳號或密碼'));
    }
  };

  return (
    <>
      <Header />
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <form onSubmit={handleLogin} className="bg-gray-800 p-6 rounded-lg shadow-lg w-96">
          <h1 className="text-2xl font-bold mb-6 text-white text-center">🔑 登入</h1>

          <input
            type="text"
            placeholder="👤 帳號"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border border-gray-600 bg-gray-700 text-white px-4 py-2 rounded mb-4 focus:border-blue-500"
          />

          <input
            type="password"
            placeholder="🔒 密碼"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-600 bg-gray-700 text-white px-4 py-2 rounded mb-4 focus:border-blue-500"
          />

          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-700 transition"
          >
            ✅ 登入
          </button>

          <div className="flex justify-between items-center mt-4 text-sm">
            <Link href="/register" className="text-blue-400 hover:underline">
              註冊帳號
            </Link>
            <Link href="/ResetPassword" className="text-blue-400 hover:underline">
              忘記密碼？
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
