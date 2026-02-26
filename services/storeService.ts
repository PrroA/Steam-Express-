import { apiClient, authHeader } from './apiClient';
import type { Game, Review } from '../types/domain';

export async function fetchGames(query = ''): Promise<Game[]> {
  const response = await apiClient.get('/games', {
    params: { query },
  });
  return response.data;
}

export async function fetchGameDetails(id: string | number): Promise<Game> {
  const response = await apiClient.get(`/games/${id}`);
  return response.data;
}

export async function addGame(
  payload: { name: string; price: string; description: string; image: string },
  token?: string | null
): Promise<{ message: string; game: Game }> {
  const response = await apiClient.post('/games', payload, {
    headers: authHeader(token),
  });
  return response.data;
}

export async function fetchReviews(gameId: string | number): Promise<Review[]> {
  const response = await apiClient.get(`/reviews/${gameId}`);
  return response.data;
}

export async function createReview(
  gameId: number,
  content: string,
  token?: string | null
): Promise<Review> {
  const response = await apiClient.post(
    '/reviews',
    { gameId, content },
    {
      headers: authHeader(token),
    }
  );
  return response.data;
}

export async function addWishlist(
  gameId: number,
  token?: string | null
): Promise<{ message: string; wishlist: number[] }> {
  const response = await apiClient.post(
    '/wishlist',
    { id: gameId },
    {
      headers: authHeader(token),
    }
  );
  return response.data;
}
