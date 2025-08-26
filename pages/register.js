import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useRouter } from 'next/router';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export default function RegisterPage() {
    const router = useRouter(); 

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 密碼強度檢查
  const checkPasswordStrength = (password) => {
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

  // 表單驗證
  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = '請輸入用戶名';
    } else if (formData.username.length < 3) {
      newErrors.username = '用戶名至少需要 3 個字符';
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/register`, {
        username: formData.username,
        password: formData.password,
      });
      toast.success('註冊成功！');
            router.push('/login');
    } catch (error) {
      toast.error(error.response?.data?.message || '註冊失敗');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <form
          onSubmit={handleRegister}
          className="bg-gray-800 p-8 rounded-lg shadow-lg w-96 border border-gray-700"
        >
          <h1 className="text-3xl font-bold mb-6 text-blue-400 text-center">創建您的帳戶</h1>

          <div className="mb-4">
            <input
              type="text"
              name="username"
              placeholder="用戶名"
              className={`w-full p-3 bg-gray-700 text-white border ${
                errors.username ? 'border-red-500' : 'border-gray-600'
              } rounded focus:outline-none focus:ring-2 focus:ring-blue-500`}
              value={formData.username}
              onChange={handleChange}
            />
            {errors.username && <p className="mt-1 text-sm text-red-500">{errors.username}</p>}
          </div>

          <div className="mb-4">
            <input
              type="password"
              name="password"
              placeholder="密碼"
              className={`w-full p-3 bg-gray-700 text-white border ${
                errors.password ? 'border-red-500' : 'border-gray-600'
              } rounded focus:outline-none focus:ring-2 focus:ring-blue-500`}
              value={formData.password}
              onChange={handleChange}
            />
            {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
          </div>

          <div className="mb-6">
            <input
              type="password"
              name="confirmPassword"
              placeholder="確認密碼"
              className={`w-full p-3 bg-gray-700 text-white border ${
                errors.confirmPassword ? 'border-red-500' : 'border-gray-600'
              } rounded focus:outline-none focus:ring-2 focus:ring-blue-500`}
              value={formData.confirmPassword}
              onChange={handleChange}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3 bg-blue-500 text-white font-semibold rounded 
              ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}
              transition duration-200 shadow-lg`}
          >
            {isSubmitting ? '註冊中...' : '註冊'}
          </button>
        </form>
      </div>
    </>
  );
}
