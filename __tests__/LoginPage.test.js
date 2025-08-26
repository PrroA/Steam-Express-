// __tests__/LoginPage.test.js
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../pages/login';
import axios from 'axios';
import { toast } from 'react-toastify';
jest.mock('axios');
const mockPush = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('react-toastify', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

beforeEach(() => {
  localStorage.clear();
  mockPush.mockReset();       
  toast.success.mockReset();
  toast.error.mockReset();
  jest.clearAllMocks();
});

test('成功登入：寫入 token、toast.success、導向 "/"', async () => {
  axios.post.mockResolvedValueOnce({ data: { token: 'JWT123' } });

  render(<LoginPage />);
  fireEvent.change(screen.getByPlaceholderText(/帳號/i), { target: { value: 'admin' } });
  fireEvent.change(screen.getByPlaceholderText(/密碼/i), { target: { value: 'admin' } });
  fireEvent.click(screen.getByRole('button', { name: /登入/i }));

  await waitFor(() => expect(localStorage.getItem('token')).toBe('JWT123'));
  expect(toast.success).toHaveBeenCalled();
  expect(mockPush).toHaveBeenCalledWith('/');
});

test('登入失敗：顯示 toast.error', async () => {
  axios.post.mockRejectedValueOnce({ response: { data: { message: 'wrong' } } });

  render(<LoginPage />);
  fireEvent.click(screen.getByRole('button', { name: /登入/i }));

  await waitFor(() => expect(toast.error).toHaveBeenCalled());
});


//TODO
//  測試登入表單的驗證邏輯
//  測試登入成功後的路由導向
//  測試登入失敗後的錯誤提示
