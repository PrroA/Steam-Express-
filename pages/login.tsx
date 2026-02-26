import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { loginUser } from '../services/authService';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await loginUser(username, password);
      localStorage.setItem('token', response.token);
      toast.success('登入成功');
      const redirectTo =
        typeof router.query?.redirect === 'string' ? router.query.redirect : '/';
      router.push(redirectTo);
    } catch (error) {
      toast.error('❌' + (error.response?.data?.message || '登入失敗，請檢查帳號或密碼'));
    }
  };

  return (
    <main className="steam-shell flex min-h-screen items-center justify-center px-4 py-10">
      <section className="steam-panel w-full max-w-md rounded-2xl p-7 md:p-8">
        <p className="text-xs font-bold tracking-[0.16em] text-[#8fb8d5]">ACCOUNT ACCESS</p>
        <h1 className="mt-2 text-3xl font-black text-[#d8e6f3]">登入</h1>
        <p className="mt-1 text-sm text-[#9eb4c8]">使用帳號登入，繼續你的商店流程。</p>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <input
            type="text"
            placeholder="帳號 admin"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
          />

          <input
            type="password"
            placeholder="密碼 admin"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
          />

          <button type="submit" className="steam-btn w-full rounded-md py-2.5 text-sm">
            登入
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <Link href="/register" className="text-[#8fb8d5] transition hover:text-[#66c0f4]">
            註冊帳號
          </Link>
          <Link href="/ResetPassword" className="text-[#8fb8d5] transition hover:text-[#66c0f4]">
            忘記密碼?
          </Link>
        </div>
      </section>
    </main>
  );
}
