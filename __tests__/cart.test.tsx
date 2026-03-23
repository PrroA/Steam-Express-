import { render, screen, waitFor } from '@testing-library/react';
import CartPage from '../pages/cart';
import { useRouter } from 'next/router';
import { fetchCart } from '../services/cartService';

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('../services/cartService', () => ({
  fetchCart: jest.fn(),
  checkout: jest.fn(),
  removeFromCart: jest.fn(),
  updateCartQuantity: jest.fn(),
}));

describe('CartPage Component', () => {
  beforeEach(() => {
    useRouter.mockReturnValue({
      push: jest.fn(),
      pathname: '/',
    });
    fetchCart.mockResolvedValue([]);
  });

  test('應該要出現「你的購物車是空的」提示', async () => {
    render(<CartPage />);
    await waitFor(() => {
      expect(screen.getByText('你的購物車是空的')).toBeInTheDocument();
    });
  });
});
