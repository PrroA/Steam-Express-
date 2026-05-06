import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { loginDemoUser, loginUser } from '../services/authService';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [demoLoading, setDemoLoading] = useState(false);
  const demoAutoStartedRef = useRef(false);
  const router = useRouter();

  const getRedirectPath = useCallback(
    () => (typeof router.query?.redirect === 'string' ? router.query.redirect : '/'),
    [router.query?.redirect]
  );

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await loginUser(username, password);
      localStorage.setItem('token', response.token);
      localStorage.setItem('profile_username', username || '');
      window.dispatchEvent(new Event('auth-user-updated'));
      toast.success('登入成功');
      router.push(getRedirectPath());
    } catch (error) {
      toast.error('❌' + (error.response?.data?.message || '登入失敗，請檢查帳號或密碼'));
    }
  };

  const handleDemoLogin = useCallback(async () => {
    try {
      setDemoLoading(true);
      const response = await loginDemoUser();
      localStorage.setItem('token', response.token);
      localStorage.setItem('profile_username', response.user?.username || 'demo_user');
      window.dispatchEvent(new Event('auth-user-updated'));
      toast.success('已使用 Demo 帳號登入');
      router.push(getRedirectPath());
    } catch (error) {
      const status = error?.response?.status;
      if (status === 404) {
        toast.error('Demo 登入 API 尚未更新，請確認後端已部署最新版本');
        return;
      }
      toast.error('Demo 登入暫時不可用，請稍後再試');
    } finally {
      setDemoLoading(false);
    }
  }, [getRedirectPath, router]);

  useEffect(() => {
    if (!router.isReady || router.query.demo !== '1' || demoAutoStartedRef.current) return;
    demoAutoStartedRef.current = true;
    handleDemoLogin();
  }, [handleDemoLogin, router.isReady, router.query.demo]);

  return (
    <main className="steam-shell flex min-h-screen items-center justify-center px-4 py-10">
      <section className="steam-panel w-full max-w-md rounded-2xl p-7 md:p-8">
        <p className="text-xs font-bold tracking-[0.16em] text-[#8fb8d5]">ACCOUNT ACCESS</p>
        <h1 className="mt-2 text-3xl font-black text-[#d8e6f3]">登入</h1>
        <p className="mt-1 text-sm text-[#9eb4c8]">使用帳號登入，繼續你的商店流程。</p>

        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={demoLoading}
          className="mt-6 w-full rounded-md border border-[#8bc53f88] bg-[#263f2b] py-3 text-sm font-bold text-[#e7f8d8] transition hover:bg-[#315337] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {demoLoading ? 'Demo 登入中...' : '免註冊 Demo 登入'}
        </button>
        <p className="mt-2 text-xs leading-5 text-[#9eb4c8]">
          使用一般會員權限快速進入商店流程，不能進入後台管理。
        </p>

        <div className="my-5 flex items-center gap-3 text-xs text-[#708ba1]">
          <span className="h-px flex-1 bg-[#66c0f433]" />
          或使用帳號密碼
          <span className="h-px flex-1 bg-[#66c0f433]" />
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <label className="block text-sm font-semibold text-[#c5dced]">
            帳號
            <input
              type="text"
              placeholder="輸入帳號"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-2 w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
            />
          </label>

          <label className="block text-sm font-semibold text-[#c5dced]">
            密碼
            <input
              type="password"
              placeholder="輸入密碼"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
            />
          </label>

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
        <p className="mt-4 rounded-md border border-[#66c0f433] bg-[#132434] px-3 py-2 text-xs leading-5 text-[#9eb4c8]">
          管理員請使用管理員帳號登入，登入後會在導覽列看到後台管理入口。
        </p>
      </section>
    </main>
  );
}
