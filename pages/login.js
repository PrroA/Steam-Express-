import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {Header} from '../components/Header';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:4000/login', { username, password });
      localStorage.setItem('token', response.data.token); // 保存 JWT Token
      alert('登入成功！');
      router.push('/'); // 登入成功後跳轉
    } catch (error) {
      alert('登入失敗，請檢查帳號或密碼');
    }
  };

  return (
    <>
    <Header />
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form onSubmit={handleLogin} className="bg-white p-6 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-4 text-blue-500">登入</h1>
        <input
          type="text"
          placeholder="帳號"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full border p-2 rounded mb-4"
        />
        <input
          type="password"
          placeholder="密碼"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border p-2 rounded mb-4"
        />
        <div className="flex items-center justify-between">
        <button type="submit" className="bg-blue-500 text-white py-2 px-4 rounded">
          登入
        </button>
        <Link href="/register" className="bg-blue-500 text-white py-2 px-4 rounded">
          註冊
        </Link>
        <Link href="/ResetPassword" className="bg-blue-500 text-white py-2 px-4 rounded">
          忘記密碼
        </Link>
        
        </div>
      </form>
    </div>
    </>
  );
}
