import { act, renderHook, waitFor } from '@testing-library/react';
import { toast } from 'react-toastify';
import { useGameDetail } from '../hooks/useGameDetail';
import { addToCart } from '../services/cartService';
import {
  addWishlist,
  createReview,
  fetchGameDetails,
  fetchReviews,
} from '../services/storeService';

jest.mock('react-toastify', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('../services/storeService', () => ({
  fetchGameDetails: jest.fn(),
  fetchReviews: jest.fn(),
  createReview: jest.fn(),
  addWishlist: jest.fn(),
}));

jest.mock('../services/cartService', () => ({
  addToCart: jest.fn(),
}));

const mockedFetchGameDetails = fetchGameDetails as jest.Mock;
const mockedFetchReviews = fetchReviews as jest.Mock;
const mockedCreateReview = createReview as jest.Mock;
const mockedAddWishlist = addWishlist as jest.Mock;
const mockedAddToCart = addToCart as jest.Mock;

describe('useGameDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('loads game details and reviews when router is ready', async () => {
    mockedFetchGameDetails.mockResolvedValue({
      id: 1,
      name: 'Portal',
      price: '$20.00',
      description: 'Puzzle game',
      image: '/portal.jpg',
    });
    mockedFetchReviews.mockResolvedValue([
      {
        content: 'Great game',
        createdAt: '2026-01-01T00:00:00.000Z',
        username: 'player1',
      },
    ]);

    const { result } = renderHook(() => useGameDetail({ id: '1', isReady: true }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockedFetchGameDetails).toHaveBeenCalledWith('1');
    expect(mockedFetchReviews).toHaveBeenCalledWith('1');
    expect(result.current.game?.name).toBe('Portal');
    expect(result.current.reviews).toHaveLength(1);
    expect(result.current.galleryShots[0].src).toBe('/portal.jpg');
  });

  test('does not request data when router is not ready', () => {
    renderHook(() => useGameDetail({ id: '1', isReady: false }));

    expect(mockedFetchGameDetails).not.toHaveBeenCalled();
    expect(mockedFetchReviews).not.toHaveBeenCalled();
  });

  test('submits review successfully and appends review', async () => {
    mockedFetchGameDetails.mockResolvedValue({
      id: 1,
      name: 'Portal',
      price: '$20.00',
      description: 'Puzzle game',
      image: '/portal.jpg',
    });
    mockedFetchReviews.mockResolvedValue([]);
    mockedCreateReview.mockResolvedValue({
      content: 'Amazing',
      createdAt: '2026-01-02T00:00:00.000Z',
      username: 'tester',
    });
    localStorage.setItem('token', 'token123');

    const { result } = renderHook(() => useGameDetail({ id: '1', isReady: true }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setNewReview('Amazing');
    });

    await act(async () => {
      await result.current.handleSubmitReview();
    });

    expect(mockedCreateReview).toHaveBeenCalledWith(1, 'Amazing', 'token123');
    expect(result.current.reviews).toHaveLength(1);
    expect(result.current.newReview).toBe('');
    expect(toast.success).toHaveBeenCalledWith('感謝你的評論！');
  });

  test('shows validation error on empty review submission', async () => {
    mockedFetchGameDetails.mockResolvedValue({
      id: 1,
      name: 'Portal',
      price: '$20.00',
      description: 'Puzzle game',
      image: '/portal.jpg',
    });
    mockedFetchReviews.mockResolvedValue([]);

    const { result } = renderHook(() => useGameDetail({ id: '1', isReady: true }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.handleSubmitReview();
    });

    expect(mockedCreateReview).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('評論內容不可為空');
  });

  test('shows error for invalid game id actions', async () => {
    const { result } = renderHook(() => useGameDetail({ id: 'abc', isReady: false }));

    await act(async () => {
      await result.current.handleAddToCart();
    });
    await act(async () => {
      await result.current.handleAddToWishlist();
    });

    expect(mockedAddToCart).not.toHaveBeenCalled();
    expect(mockedAddWishlist).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('遊戲資訊異常');
  });
});
