import { useCallback, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { loginDemoUser, loginUser } from '../services/authService';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [demoLoading, setDemoLoading] = useState(false);
  const router = useRouter();

  const getRedirectPath = useCallback(
    () => (typeof router.query?.redirect === 'string' ? router.query.redirect : '/'),
    [router.query?.redirect]
  );

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const response = await loginUser(username, password);
      localStorage.setItem('token', response.token);
      localStorage.setItem('profile_username', username || '');
      window.dispatchEvent(new Event('auth-user-updated'));
      toast.success('登入成功。');
      router.push(getRedirectPath());
    } catch {
      toast.error('登入失敗，請確認帳號或密碼是否正確。');
    }
  };

  const handleDemoLogin = useCallback(async () => {
    try {
      setDemoLoading(true);
      const response = await loginDemoUser();
      localStorage.setItem('token', response.token);
      localStorage.setItem('profile_username', response.user?.username || 'demo_user');
      window.dispatchEvent(new Event('auth-user-updated'));
      toast.success('已開啟試用帳號。');
      router.push(getRedirectPath());
    } catch {
      toast.error('暫時無法開啟試用帳號，請稍後再試。');
    } finally {
      setDemoLoading(false);
    }
  }, [getRedirectPath, router]);

  return (
    <main className="steam-shell flex min-h-screen items-center justify-center px-4 py-10">
      <section className="steam-panel w-full max-w-md rounded-2xl p-7 md:p-8">
        <p className="text-xs font-bold tracking-[0.16em] text-[#8fb8d5]">會員登入</p>
        <h1 className="mt-2 text-3xl font-black text-[#d8e6f3]">登入你的商城帳號</h1>
        <p className="mt-1 text-sm text-[#9eb4c8]">
          登入後可以加入購物車、追蹤願望清單，並查看訂單付款狀態。
        </p>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <label className="block text-sm font-semibold text-[#c5dced]">
            帳號
            <input
              type="text"
              data-testid="login-username"
              placeholder="請輸入帳號"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-2 w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
            />
          </label>

          <label className="block text-sm font-semibold text-[#c5dced]">
            密碼
            <input
              type="password"
              data-testid="login-password"
              placeholder="請輸入密碼"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
            />
          </label>

          <button type="submit" data-testid="login-submit" className="steam-btn w-full rounded-md py-2.5 text-sm">
            登入
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <Link href="/register" className="text-[#8fb8d5] transition hover:text-[#66c0f4]">
            建立新帳號
          </Link>
          <Link href="/ResetPassword" className="text-[#8fb8d5] transition hover:text-[#66c0f4]">
            忘記密碼？
          </Link>
        </div>

        <div className="my-5 flex items-center gap-3 text-xs text-[#708ba1]">
          <span className="h-px flex-1 bg-[#66c0f433]" />
          或使用試用帳號
          <span className="h-px flex-1 bg-[#66c0f433]" />
        </div>

        <button
          type="button"
          data-testid="demo-login"
          onClick={handleDemoLogin}
          disabled={demoLoading}
          className="w-full rounded-md border border-[#66c0f455] bg-[#1b2f44] py-3 text-sm font-bold text-[#d8e6f3] transition hover:bg-[#24384d] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {demoLoading ? '正在開啟試用帳號...' : '使用試用帳號進入'}
        </button>
        <p className="mt-2 text-xs leading-5 text-[#9eb4c8]">
          試用帳號會帶入範例購物車與訂單資料，方便快速體驗完整流程。
        </p>

        <p className="mt-4 rounded-md border border-[#66c0f433] bg-[#132434] px-3 py-2 text-xs leading-5 text-[#9eb4c8]">
          管理者展示可使用 admin / admin。本機展示可以這樣操作，正式環境請改用安全密碼。
        </p>
      </section>
    </main>
  );
}
