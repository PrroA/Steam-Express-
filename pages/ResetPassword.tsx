import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { requestPasswordReset } from '../services/authService';

export default function ForgotPasswordPage() {
  const [accountInput, setAccountInput] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [resetUrl, setResetUrl] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const router = useRouter();

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    try {
      const response = await requestPasswordReset(accountInput);
      setResetCode(response?.resetToken || '');
      setResetUrl(response?.resetUrl || '');
      setEmailSent(Boolean(response?.emailSent));
      setIsError(false);
      setMessage(response?.message || '如果帳號存在，我們會提供重設密碼的方式。');
    } catch {
      setIsError(true);
      setMessage('暫時無法送出重設密碼要求，請稍後再試。');
    }
  };

  return (
    <main className="steam-shell flex min-h-screen items-center justify-center px-4 py-10">
      <section className="steam-panel w-full max-w-md rounded-2xl p-7 md:p-8">
        <p className="text-xs font-bold tracking-[0.16em] text-[#8fb8d5]">忘記密碼</p>
        <h1 className="mt-2 text-3xl font-black text-[#d8e6f3]">找回你的帳號</h1>
        <p className="mt-1 text-sm text-[#9eb4c8]">輸入帳號或 Email，我們會提供重設密碼的方式。</p>

        <form onSubmit={handleForgotPassword} className="mt-6 space-y-4">
          <input
            type="text"
            placeholder="輸入帳號或 Email"
            value={accountInput}
            onChange={(event) => setAccountInput(event.target.value)}
            className="w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
            required
          />
          <button type="submit" className="steam-btn w-full rounded-md py-2.5 text-sm">
            送出重設要求
          </button>
        </form>

        {message && <p className={`mt-4 text-sm ${isError ? 'text-[#ff9e9e]' : 'text-[#8bc53f]'}`}>{message}</p>}

        {resetCode && !emailSent && (
          <div className="mt-4 rounded-lg border border-[#66c0f455] bg-[#102131] p-3">
            <p className="text-xs text-[#8faac0]">本機展示驗證碼，15 分鐘內有效。</p>
            <p className="mt-1 break-all text-sm font-bold text-[#d8e6f3]">{resetCode}</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(resetCode)}
                className="rounded-md border border-[#66c0f455] bg-[#1b2f44] px-3 py-2 text-xs font-semibold text-[#d8e6f3] transition hover:bg-[#24384d]"
              >
                複製驗證碼
              </button>
              <button
                type="button"
                onClick={() => router.push(`/ConfirmResetPassword?token=${encodeURIComponent(resetCode)}`)}
                className="steam-btn rounded-md px-3 py-2 text-xs"
              >
                前往設定新密碼
              </button>
            </div>
          </div>
        )}

        {resetUrl && !emailSent && (
          <div className="mt-3 rounded-lg border border-[#66c0f455] bg-[#102131] p-3">
            <p className="text-xs text-[#8faac0]">本機展示連結：</p>
            <p className="mt-1 break-all text-sm font-bold text-[#d8e6f3]">{resetUrl}</p>
          </div>
        )}

        <p className="mt-4 text-sm text-[#9eb4c8]">
          記得密碼了？
          <Link href="/login" className="ml-1 text-[#8fb8d5] transition hover:text-[#66c0f4]">
            回到登入
          </Link>
        </p>
      </section>
    </main>
  );
}
