import { useState } from 'react';
import { toast } from 'react-toastify';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { registerUser } from '../services/authService';
import type { ChangeEvent, FormEvent } from 'react';

interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

type RegisterFormErrors = Partial<Record<keyof RegisterFormData, string>>;

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<RegisterFormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<RegisterFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const checkPasswordStrength = (password: string) => {
    const minLength = password.length >= 8;
    const hasNumber = /\d/.test(password);
    const hasLetter = /[a-zA-Z]/.test(password);
    return minLength && hasNumber && hasLetter;
  };

  const validateForm = () => {
    const newErrors: RegisterFormErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = '請輸入帳號。';
    } else if (formData.username.length < 3) {
      newErrors.username = '帳號至少需要 3 個字元。';
    }

    if (!formData.email.trim()) {
      newErrors.email = '請輸入 Email。';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email 格式看起來不正確。';
    }

    if (!formData.password) {
      newErrors.password = '請輸入密碼。';
    } else if (!checkPasswordStrength(formData.password)) {
      newErrors.password = '密碼至少 8 個字元，並包含英文與數字。';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '兩次輸入的密碼不一致。';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await registerUser(formData.username, formData.password, formData.email);
      toast.success('帳號建立完成，請登入。');
      router.push('/login');
    } catch {
      toast.error('註冊沒有完成，請確認資料後再試一次。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="steam-shell flex min-h-screen items-center justify-center px-4 py-10">
      <section className="steam-panel w-full max-w-md rounded-2xl p-7 md:p-8">
        <p className="text-xs font-bold tracking-[0.16em] text-[#8fb8d5]">建立帳號</p>
        <h1 className="mt-2 text-3xl font-black text-[#d8e6f3]">開始收藏你的遊戲</h1>
        <p className="mt-1 text-sm text-[#9eb4c8]">
          建立帳號後可以追蹤願望清單、完成結帳，並在訂單中心查看付款進度。
        </p>

        <form onSubmit={handleRegister} noValidate className="mt-6 space-y-4">
          <div>
            <input
              type="text"
              name="username"
              data-testid="register-username"
              placeholder="帳號"
              className={`w-full rounded-md border bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:outline-none ${
                errors.username
                  ? 'border-[#ff8f8f] focus:border-[#ff8f8f]'
                  : 'border-[#66c0f444] focus:border-[#66c0f4aa]'
              }`}
              value={formData.username}
              onChange={handleChange}
            />
            {errors.username && <p className="mt-1 text-xs text-[#ff9e9e]">{errors.username}</p>}
          </div>

          <div>
            <input
              type="email"
              name="email"
              data-testid="register-email"
              placeholder="Email"
              className={`w-full rounded-md border bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:outline-none ${
                errors.email
                  ? 'border-[#ff8f8f] focus:border-[#ff8f8f]'
                  : 'border-[#66c0f444] focus:border-[#66c0f4aa]'
              }`}
              value={formData.email}
              onChange={handleChange}
            />
            {errors.email && <p className="mt-1 text-xs text-[#ff9e9e]">{errors.email}</p>}
          </div>

          <div>
            <input
              type="password"
              name="password"
              data-testid="register-password"
              placeholder="密碼"
              className={`w-full rounded-md border bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:outline-none ${
                errors.password
                  ? 'border-[#ff8f8f] focus:border-[#ff8f8f]'
                  : 'border-[#66c0f444] focus:border-[#66c0f4aa]'
              }`}
              value={formData.password}
              onChange={handleChange}
            />
            {errors.password && <p className="mt-1 text-xs text-[#ff9e9e]">{errors.password}</p>}
          </div>

          <div>
            <input
              type="password"
              name="confirmPassword"
              data-testid="register-confirm-password"
              placeholder="再次輸入密碼"
              className={`w-full rounded-md border bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:outline-none ${
                errors.confirmPassword
                  ? 'border-[#ff8f8f] focus:border-[#ff8f8f]'
                  : 'border-[#66c0f444] focus:border-[#66c0f4aa]'
              }`}
              value={formData.confirmPassword}
              onChange={handleChange}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-[#ff9e9e]">{errors.confirmPassword}</p>
            )}
          </div>

          <button
            type="submit"
            data-testid="register-submit"
            disabled={isSubmitting}
            className="steam-btn w-full rounded-md py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? '正在建立帳號...' : '建立帳號'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-[#9eb4c8]">
          已經有帳號？
          <Link href="/login" className="ml-1 text-[#8fb8d5] transition hover:text-[#66c0f4]">
            前往登入
          </Link>
        </p>
      </section>
    </main>
  );
}
