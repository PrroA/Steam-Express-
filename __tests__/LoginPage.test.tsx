// __tests__/LoginPage.test.js
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../pages/login';
import { toast } from 'react-toastify';
import { loginDemoUser, loginUser } from '../services/authService';

jest.mock('../services/authService', () => ({
  loginDemoUser: jest.fn(),
  loginUser: jest.fn(),
}));

const mockPush = jest.fn();
let mockQuery = {};
jest.mock('next/router', () => ({
  useRouter: () => ({ push: mockPush, query: mockQuery }),
}));

jest.mock('react-toastify', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

beforeEach(() => {
  localStorage.clear();
  mockQuery = {};
  mockPush.mockReset();   
  toast.success.mockReset();
  toast.error.mockReset();
  jest.clearAllMocks();
});

test('成功登入：寫入 token、toast.success、導向 "/"', async () => {
  loginUser.mockResolvedValueOnce({ token: 'JWT123' });

  const { container } = render(<LoginPage />);
  const usernameInput = container.querySelector('input[type="text"]');
  const passwordInput = container.querySelector('input[type="password"]');
  expect(usernameInput).toBeTruthy();
  expect(passwordInput).toBeTruthy();

  fireEvent.change(usernameInput!, { target: { value: 'admin' } });
  fireEvent.change(passwordInput!, { target: { value: 'admin' } });
  fireEvent.click(screen.getByRole('button', { name: /^登入$/i }));

  await waitFor(() => expect(localStorage.getItem('token')).toBe('JWT123'));
  expect(toast.success).toHaveBeenCalled();
  expect(mockPush).toHaveBeenCalledWith('/');
});

test('登入失敗：顯示 toast.error', async () => {
  loginUser.mockRejectedValueOnce({ response: { data: { message: 'wrong' } } });

  const { container } = render(<LoginPage />);
  const usernameInput = container.querySelector('input[type="text"]');
  const passwordInput = container.querySelector('input[type="password"]');
  fireEvent.change(usernameInput!, { target: { value: 'admin' } });
  fireEvent.change(passwordInput!, { target: { value: 'bad-password' } });
  fireEvent.click(screen.getByRole('button', { name: /^登入$/i }));

  await waitFor(() => expect(toast.error).toHaveBeenCalled());
});

test('Demo 登入：寫入一般會員 token、使用 demo_user、導向 redirect', async () => {
  mockQuery = { redirect: '/cart' };
  loginDemoUser.mockResolvedValueOnce({
    token: 'DEMO_JWT',
    user: { id: 2, username: 'demo_user', role: 'user' },
  });

  render(<LoginPage />);
  fireEvent.click(screen.getByRole('button', { name: /免註冊 Demo 登入/i }));

  await waitFor(() => expect(localStorage.getItem('token')).toBe('DEMO_JWT'));
  expect(localStorage.getItem('profile_username')).toBe('demo_user');
  expect(toast.success).toHaveBeenCalledWith('已使用 Demo 帳號登入');
  expect(mockPush).toHaveBeenCalledWith('/cart');
});


//TODO
//  測試登入表單的驗證邏輯
//  測試登入成功後的路由導向
//  測試登入失敗後的錯誤提示
