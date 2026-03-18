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

    return {
      isStrong: minLength && hasNumber && hasLetter,
      requirements: {
        minLength,
        hasNumber,
        hasLetter,
      },
    };
  };

  const validateForm = () => {
    const newErrors: RegisterFormErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = '請輸入用戶名';
    } else if (formData.username.length < 3) {
      newErrors.username = '用戶名至少需要 3 個字符';
    }

    if (!formData.email.trim()) {
      newErrors.email = '請輸入 Email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email 格式不正確';
    }

    const passwordStrength = checkPasswordStrength(formData.password);
    if (!formData.password) {
      newErrors.password = '請輸入密碼';
    } else if (!passwordStrength.isStrong) {
      newErrors.password = '密碼必須包含至少 8 個字符、數字、字母和特殊符號';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '兩次輸入的密碼不一致';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await registerUser(formData.username, formData.password, formData.email);
      toast.success('註冊成功！');
      router.push('/login');
    } catch (error) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof error.response === 'object' &&
        error.response !== null &&
        'data' in error.response &&
        typeof error.response.data === 'object' &&
        error.response.data !== null &&
        'message' in error.response.data &&
        typeof error.response.data.message === 'string'
          ? error.response.data.message
          : '註冊失敗';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="steam-shell flex min-h-screen items-center justify-center px-4 py-10">
      <section className="steam-panel w-full max-w-md rounded-2xl p-7 md:p-8">
        <p className="text-xs font-bold tracking-[0.16em] text-[#8fb8d5]">CREATE ACCOUNT</p>
        <h1 className="mt-2 text-3xl font-black text-[#d8e6f3]">建立新帳戶</h1>
        <p className="mt-1 text-sm text-[#9eb4c8]">註冊後可使用購物車、願望清單與訂單功能，並綁定 Email 供忘記密碼使用。</p>

        <form onSubmit={handleRegister} noValidate className="mt-6 space-y-4">
          <div>
            <input
              type="text"
              name="username"
              placeholder="用戶名"
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
              placeholder="確認密碼"
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
            disabled={isSubmitting}
            className="steam-btn w-full rounded-md py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? '註冊中...' : '註冊'}
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
