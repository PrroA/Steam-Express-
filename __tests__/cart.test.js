import { render, screen } from '@testing-library/react';
import CartPage from '../pages/cart';
import { useRouter } from 'next/router';

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

describe('CartPage Component', () => {
  beforeEach(() => {
    useRouter.mockReturnValue({
      push: jest.fn(),
      pathname: '/',
    });
  });

  test('應該要出現「你的購物車是空的」提示', () => {
    render(<CartPage />);
    expect(screen.getByText('你的購物車是空的')).toBeInTheDocument();
  });
});
