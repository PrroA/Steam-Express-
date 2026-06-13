import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { confirmPasswordReset } from '../services/authService';
import type { FormEvent } from 'react';

export default function ConfirmResetPasswordPage() {
  const router = useRouter();
  const initialCode = typeof router.query?.token === 'string' ? router.query.token : '';
  const [resetCode, setResetCode] = useState(initialCode);
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (!resetCode && initialCode) setResetCode(initialCode);
  }, [initialCode, resetCode]);

  const handleConfirmReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!resetCode || !newPassword) {
      setIsError(true);
      setMessage('請輸入驗證碼與新密碼。');
      return;
    }

    try {
      await confirmPasswordReset(resetCode, newPassword);
      setIsError(false);
      setMessage('密碼已更新，正在帶你回登入頁。');
      setTimeout(() => router.push('/login'), 1200);
    } catch {
      setIsError(true);
      setMessage('密碼還沒更新成功，請確認驗證碼後再試一次。');
    }
  };

  return (
    <main className="steam-shell flex min-h-screen items-center justify-center px-4 py-10">
      <section className="steam-panel w-full max-w-md rounded-2xl p-7 md:p-8">
        <p className="text-xs font-bold tracking-[0.16em] text-[#8fb8d5]">重設密碼</p>
        <h1 className="mt-2 text-3xl font-black text-[#d8e6f3]">設定新密碼</h1>
        <p className="mt-1 text-sm text-[#9eb4c8]">輸入收到的驗證碼與新密碼，即可完成設定。</p>

        <form onSubmit={handleConfirmReset} className="mt-6 space-y-4">
          <input
            type="text"
            placeholder="輸入驗證碼"
            value={resetCode}
            onChange={(event) => setResetCode(event.target.value)}
            className="w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
            required
          />
          <input
            type="password"
            placeholder="輸入新密碼"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
            required
          />
          <button type="submit" className="steam-btn w-full rounded-md py-2.5 text-sm">
            更新密碼
          </button>
        </form>

        {message && <p className={`mt-4 text-sm ${isError ? 'text-[#ff9e9e]' : 'text-[#8bc53f]'}`}>{message}</p>}

        <p className="mt-4 text-sm text-[#9eb4c8]">
          想起密碼了？
          <Link href="/login" className="ml-1 text-[#8fb8d5] transition hover:text-[#66c0f4]">
            回到登入
          </Link>
        </p>
      </section>
    </main>
  );
}
