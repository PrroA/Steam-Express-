
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RegisterPage from '../pages/register';         
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
  jest.clearAllMocks();
  mockPush.mockReset();
});
const fillForm = ({
  username = '',
  password = '',
  confirmPassword = '',
} = {}) => {
  if (username !== undefined) {
    fireEvent.change(screen.getByPlaceholderText(/用戶名/i), {
      target: { value: username },
    });
  }
  if (password !== undefined) {
    fireEvent.change(screen.getByPlaceholderText(/^密碼$/i), {
      target: { value: password },
    });
  }
  if (confirmPassword !== undefined) {
    fireEvent.change(screen.getByPlaceholderText(/確認密碼/i), {
      target: { value: confirmPassword },
    });
  }
};

test('欄位驗證：空白/太短/弱密碼/二次密碼不一致', async () => {
  render(<RegisterPage />);

  // 直接點「註冊」→ 會跑驗證
  fireEvent.click(screen.getByRole('button', { name: /註冊/i }));

  // 1) 空白用戶名
  expect(await screen.findByText('請輸入用戶名')).toBeInTheDocument();

  // 2) 用戶名太短 (<3)
  fillForm({ username: 'ab' });
  fireEvent.click(screen.getByRole('button', { name: /註冊/i }));
  expect(await screen.findByText('用戶名至少需要 3 個字符')).toBeInTheDocument();

  // 3) 密碼過弱（<8 或缺數字/字母）
  fillForm({ username: 'abcd', password: 'short', confirmPassword: 'short' });
  fireEvent.click(screen.getByRole('button', { name: /註冊/i }));
  expect(
    await screen.findByText('密碼必須包含至少 8 個字符、數字、字母和特殊符號')
  ).toBeInTheDocument();

  // 4) 兩次密碼不一致
  fillForm({ username: 'gooduser', password: 'Password1', confirmPassword: 'Password2' });
  fireEvent.click(screen.getByRole('button', { name: /註冊/i }));
  expect(await screen.findByText('兩次輸入的密碼不一致')).toBeInTheDocument();
});

test('成功註冊：呼叫 API、toast.success、導向 /login', async () => {
  axios.post.mockResolvedValueOnce({ data: { ok: true } });

  render(<RegisterPage />);

  fillForm({ username: 'gooduser', password: 'Password1', confirmPassword: 'Password1' });
  fireEvent.click(screen.getByRole('button', { name: /註冊/i }));

  // 等待 API 被打（可選擇性驗證）
  await waitFor(() => {
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringMatching(/\/register$/),
      { username: 'gooduser', password: 'Password1' }
    );
  });

  expect(toast.success).toHaveBeenCalled();      
  expect(mockPush).toHaveBeenCalledWith('/login');
});

test('註冊失敗：顯示 toast.error', async () => {
  axios.post.mockRejectedValueOnce({
    response: { data: { message: '帳號已存在' } },
  });

  render(<RegisterPage />);

  fillForm({ username: 'dupuser', password: 'Password1', confirmPassword: 'Password1' });
  fireEvent.click(screen.getByRole('button', { name: /註冊/i }));

  await waitFor(() => {
    expect(toast.error).toHaveBeenCalled();
  });
});
