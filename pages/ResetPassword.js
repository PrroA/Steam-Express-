import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { requestPasswordReset } from '../services/authService';

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const router = useRouter();

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    try {
      const response = await requestPasswordReset(username);
      setResetToken(response?.resetToken || '');
      setIsError(false);
      setMessage('已產生重設憑證，請複製 Token 到下一步重設密碼。');
    } catch (error) {
      setIsError(true);
      setMessage(error.response?.data?.message || '請求失敗，請稍後再試');
    }
  };

  return (
    <main className="steam-shell flex min-h-screen items-center justify-center px-4 py-10">
      <section className="steam-panel w-full max-w-md rounded-2xl p-7 md:p-8">
        <p className="text-xs font-bold tracking-[0.16em] text-[#8fb8d5]">PASSWORD RESET</p>
        <h1 className="mt-2 text-3xl font-black text-[#d8e6f3]">忘記密碼？</h1>
        <p className="mt-1 text-sm text-[#9eb4c8]">輸入帳號後會產生重設 Token（目前為開發模式）。</p>

        <form onSubmit={handleForgotPassword} className="mt-6 space-y-4">
          <input
            type="text"
            placeholder="輸入帳號"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
            required
          />
          <button type="submit" className="steam-btn w-full rounded-md py-2.5 text-sm">
            發送重設密碼連結
          </button>
        </form>

        {message && (
          <p className={`mt-4 text-sm ${isError ? 'text-[#ff9e9e]' : 'text-[#8bc53f]'}`}>{message}</p>
        )}

        {resetToken && (
          <div className="mt-4 rounded-lg border border-[#66c0f455] bg-[#102131] p-3">
            <p className="text-xs text-[#8faac0]">重設 Token（15 分鐘有效）</p>
            <p className="mt-1 break-all text-sm font-bold text-[#d8e6f3]">{resetToken}</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(resetToken)}
                className="rounded-md border border-[#66c0f455] bg-[#1b2f44] px-3 py-2 text-xs font-semibold text-[#d8e6f3] transition hover:bg-[#24384d]"
              >
                複製 Token
              </button>
              <button
                type="button"
                onClick={() =>
                  router.push(`/ConfirmResetPassword?token=${encodeURIComponent(resetToken)}`)
                }
                className="steam-btn rounded-md px-3 py-2 text-xs"
              >
                前往下一步
              </button>
            </div>
          </div>
        )}

        <p className="mt-4 text-sm text-[#9eb4c8]">
          記得密碼了？
          <Link href="/login" className="ml-1 text-[#8fb8d5] transition hover:text-[#66c0f4]">
            返回登入
          </Link>
        </p>
      </section>
    </main>
  );
}
