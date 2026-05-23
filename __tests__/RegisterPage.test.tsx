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
  fireEvent.change(screen.getByTestId('register-username'), { target: { value: username } });
  fireEvent.change(screen.getByTestId('register-email'), { target: { value: email } });
  fireEvent.change(screen.getByTestId('register-password'), { target: { value: password } });
  fireEvent.change(screen.getByTestId('register-confirm-password'), {
    target: { value: confirmPassword },
  });
};

test('Email 格式錯誤時顯示提示', async () => {
  render(<RegisterPage />);

  fillForm({
    username: 'gooduser',
    email: 'wrong-email',
    password: 'Password1',
    confirmPassword: 'Password1',
  });
  fireEvent.click(screen.getByTestId('register-submit'));
  expect(await screen.findByText('Email 格式看起來不正確。')).toBeInTheDocument();
});

test('密碼太弱時顯示提示', async () => {
  render(<RegisterPage />);

  fillForm({
    username: 'gooduser',
    email: 'good@test.com',
    password: 'short',
    confirmPassword: 'short',
  });
  fireEvent.click(screen.getByTestId('register-submit'));
  expect(await screen.findByText('密碼至少 8 個字元，並包含英文與數字。')).toBeInTheDocument();
});

test('兩次密碼不一致時顯示提示', async () => {
  render(<RegisterPage />);

  fillForm({
    username: 'gooduser',
    email: 'good@test.com',
    password: 'Password1',
    confirmPassword: 'Password2',
  });
  fireEvent.click(screen.getByTestId('register-submit'));
  expect(await screen.findByText('兩次輸入的密碼不一致。')).toBeInTheDocument();
});

test('註冊成功後導向登入頁', async () => {
  registerUser.mockResolvedValueOnce({ ok: true });

  render(<RegisterPage />);

  fillForm({ username: 'gooduser', email: 'good@test.com', password: 'Password1', confirmPassword: 'Password1' });
  fireEvent.click(screen.getByTestId('register-submit'));

  await waitFor(() => {
    expect(registerUser).toHaveBeenCalledWith('gooduser', 'Password1', 'good@test.com');
  });

  expect(toast.success).toHaveBeenCalledWith('帳號建立完成，請登入。');
  expect(mockPush).toHaveBeenCalledWith('/login');
});

test('註冊失敗時顯示提示', async () => {
  registerUser.mockRejectedValueOnce(new Error('duplicate'));

  render(<RegisterPage />);

  fillForm({ username: 'dupuser', email: 'dup@test.com', password: 'Password1', confirmPassword: 'Password1' });
  fireEvent.click(screen.getByTestId('register-submit'));

  await waitFor(() => {
    expect(toast.error).toHaveBeenCalledWith('註冊沒有完成，請確認資料後再試一次。');
  });
});
