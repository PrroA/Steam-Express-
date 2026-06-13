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
  useRouter: () => ({ push: mockPush, query: mockQuery, isReady: true }),
}));

jest.mock('react-toastify', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const mockedLoginUser = loginUser as jest.MockedFunction<typeof loginUser>;
const mockedLoginDemoUser = loginDemoUser as jest.MockedFunction<typeof loginDemoUser>;

beforeEach(() => {
  localStorage.clear();
  mockQuery = {};
  mockPush.mockReset();
  (toast.success as jest.Mock).mockReset();
  (toast.error as jest.Mock).mockReset();
  jest.clearAllMocks();
});

test('一般登入成功後寫入 token 並導向首頁', async () => {
  mockedLoginUser.mockResolvedValueOnce({ token: 'JWT123' });

  render(<LoginPage />);
  fireEvent.change(screen.getByTestId('login-username'), { target: { value: 'admin' } });
  fireEvent.change(screen.getByTestId('login-password'), { target: { value: 'admin' } });
  fireEvent.click(screen.getByTestId('login-submit'));

  await waitFor(() => expect(localStorage.getItem('token')).toBe('JWT123'));
  expect(toast.success).toHaveBeenCalledWith('登入成功。');
  expect(mockPush).toHaveBeenCalledWith('/');
});

test('登入失敗時顯示提示', async () => {
  mockedLoginUser.mockRejectedValueOnce(new Error('wrong'));

  render(<LoginPage />);
  fireEvent.change(screen.getByTestId('login-username'), { target: { value: 'admin' } });
  fireEvent.change(screen.getByTestId('login-password'), { target: { value: 'bad-password' } });
  fireEvent.click(screen.getByTestId('login-submit'));

  await waitFor(() => expect(toast.error).toHaveBeenCalledWith('登入失敗，請確認帳號或密碼是否正確。'));
});

test('試用帳號登入會寫入會員 token 並導向 redirect', async () => {
  mockQuery = { redirect: '/cart' };
  mockedLoginDemoUser.mockResolvedValueOnce({
    token: 'DEMO_JWT',
    user: { id: 2, username: 'demo_user', role: 'user' },
  });

  render(<LoginPage />);
  fireEvent.click(screen.getByTestId('demo-login'));

  await waitFor(() => expect(localStorage.getItem('token')).toBe('DEMO_JWT'));
  expect(localStorage.getItem('profile_username')).toBe('demo_user');
  expect(toast.success).toHaveBeenCalledWith('已開啟試用帳號。');
  expect(mockPush).toHaveBeenCalledWith('/cart');
});

test('demo query does not automatically sign in before the user chooses it', async () => {
  mockQuery = { demo: '1' };

  render(<LoginPage />);

  expect(loginDemoUser).not.toHaveBeenCalled();
  expect(localStorage.getItem('token')).toBeNull();
  expect(screen.getByTestId('demo-login')).toBeVisible();
});
