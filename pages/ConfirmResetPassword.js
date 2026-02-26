import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { confirmPasswordReset } from '../services/authService';

export default function ConfirmResetPasswordPage() {
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const router = useRouter();

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    if (!resetToken || !newPassword) {
      setIsError(true);
      setMessage('請輸入所有欄位');
      return;
    }

    try {
      await confirmPasswordReset(resetToken, newPassword);
      setIsError(false);
      setMessage('密碼重設成功，正在跳轉至登入頁面...');
      setTimeout(() => {
        router.push('/login');
      }, 1200);
    } catch (error) {
      setIsError(true);
      setMessage(error.response?.data?.message || '密碼重設失敗，請確認 Token 是否正確');
    }
  };

  return (
    <main className="steam-shell flex min-h-screen items-center justify-center px-4 py-10">
      <section className="steam-panel w-full max-w-md rounded-2xl p-7 md:p-8">
        <p className="text-xs font-bold tracking-[0.16em] text-[#8fb8d5]">VERIFY TOKEN</p>
        <h1 className="mt-2 text-3xl font-black text-[#d8e6f3]">重設密碼</h1>
        <p className="mt-1 text-sm text-[#9eb4c8]">輸入臨時 Token 與新密碼完成設定。</p>

        <form onSubmit={handleConfirmReset} className="mt-6 space-y-4">
          <input
            type="text"
            placeholder="輸入臨時 Token"
            value={resetToken}
            onChange={(e) => setResetToken(e.target.value)}
            className="w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
            required
          />
          <input
            type="password"
            placeholder="輸入新密碼"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
            required
          />
          <button type="submit" className="steam-btn w-full rounded-md py-2.5 text-sm">
            提交新密碼
          </button>
        </form>

        {message && (
          <p className={`mt-4 text-sm ${isError ? 'text-[#ff9e9e]' : 'text-[#8bc53f]'}`}>{message}</p>
        )}

        <p className="mt-4 text-sm text-[#9eb4c8]">
          想直接登入？
          <Link href="/login" className="ml-1 text-[#8fb8d5] transition hover:text-[#66c0f4]">
            返回登入
          </Link>
        </p>
      </section>
    </main>
  );
}
