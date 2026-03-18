
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RegisterPage from '../pages/register';         
import { toast } from 'react-toastify';
import { registerUser } from '../services/authService';

jest.mock('../services/authService', () => ({
  registerUser: jest.fn(),
}));

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
  email = '',
  password = '',
  confirmPassword = '',
} = {}) => {
  if (username !== undefined) {
    fireEvent.change(screen.getByPlaceholderText(/用戶名/i), {
      target: { value: username },
    });
  }
  if (email !== undefined) {
    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: email },
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

test('欄位驗證：Email 格式錯誤', async () => {
  render(<RegisterPage />);

  fillForm({
    username: 'gooduser',
    email: 'wrong-email',
    password: 'Password1',
    confirmPassword: 'Password1',
  });
  fireEvent.click(screen.getByRole('button', { name: /註冊/i }));
  expect(await screen.findByText('Email 格式不正確')).toBeInTheDocument();
});

test('欄位驗證：密碼過弱', async () => {
  render(<RegisterPage />);

  fillForm({
    username: 'gooduser',
    email: 'good@test.com',
    password: 'short',
    confirmPassword: 'short',
  });
  fireEvent.click(screen.getByRole('button', { name: /註冊/i }));
  expect(
    await screen.findByText('密碼必須包含至少 8 個字符、數字、字母和特殊符號')
  ).toBeInTheDocument();
});

test('欄位驗證：兩次密碼不一致', async () => {
  render(<RegisterPage />);

  fillForm({
    username: 'gooduser',
    email: 'good@test.com',
    password: 'Password1',
    confirmPassword: 'Password2',
  });
  fireEvent.click(screen.getByRole('button', { name: /註冊/i }));
  expect(await screen.findByText('兩次輸入的密碼不一致')).toBeInTheDocument();
});

test('成功註冊：呼叫 API、toast.success、導向 /login', async () => {
  registerUser.mockResolvedValueOnce({ ok: true });

  render(<RegisterPage />);

  fillForm({ username: 'gooduser', email: 'good@test.com', password: 'Password1', confirmPassword: 'Password1' });
  fireEvent.click(screen.getByRole('button', { name: /註冊/i }));

  // 等待 API 被打（可選擇性驗證）
  await waitFor(() => {
    expect(registerUser).toHaveBeenCalledWith('gooduser', 'Password1', 'good@test.com');
  });

  expect(toast.success).toHaveBeenCalled();      
  expect(mockPush).toHaveBeenCalledWith('/login');
});

test('註冊失敗：顯示 toast.error', async () => {
  registerUser.mockRejectedValueOnce({
    response: { data: { message: '帳號已存在' } },
  });

  render(<RegisterPage />);

  fillForm({ username: 'dupuser', email: 'dup@test.com', password: 'Password1', confirmPassword: 'Password1' });
  fireEvent.click(screen.getByRole('button', { name: /註冊/i }));

  await waitFor(() => {
    expect(toast.error).toHaveBeenCalled();
  });
});
