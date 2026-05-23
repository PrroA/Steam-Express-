import { render, screen, waitFor } from '@testing-library/react';
import { Header } from '../components/Header';

const mockPush = jest.fn();

jest.mock('next/router', () => ({
  useRouter: () => ({ asPath: '/', push: mockPush }),
}));

jest.mock('next/link', () => {
  return function MockLink({ href, children, ...props }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }) => <>{children}</>,
  motion: {
    button: ({ children, ...props }) => <button {...props}>{children}</button>,
    aside: ({ children, ...props }) => <aside {...props}>{children}</aside>,
  },
}));

function toBase64(input) {
  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    return window.btoa(unescape(encodeURIComponent(input)));
  }
  return Buffer.from(input, 'utf8').toString('base64');
}

function makeToken(payload) {
  const header = toBase64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = toBase64(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

describe('Header auth visibility', () => {
  beforeEach(() => {
    localStorage.clear();
    mockPush.mockReset();
  });

  test('guest sees login/register and no admin entry', async () => {
    render(<Header />);

    await waitFor(() => {
      expect(screen.getByText('登入 / 註冊')).toBeInTheDocument();
    });
    expect(screen.queryByText('管理後台')).not.toBeInTheDocument();
    expect(screen.queryByText('交易紀錄')).not.toBeInTheDocument();
  });

  test('admin token shows compact account, admin entry, and logout', async () => {
    const token = makeToken({
      username: 'admin',
      role: 'admin',
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    });
    localStorage.setItem('token', token);

    render(<Header />);

    await waitFor(() => {
      expect(screen.getByText('admin')).toBeInTheDocument();
      expect(screen.getByText('管理員')).toBeInTheDocument();
      expect(screen.getByText('管理後台')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '登出' })).toBeInTheDocument();
    });
    expect(screen.queryByText('交易紀錄')).not.toBeInTheDocument();
    expect(screen.queryByText('重新開始 Demo')).not.toBeInTheDocument();
  });
});
