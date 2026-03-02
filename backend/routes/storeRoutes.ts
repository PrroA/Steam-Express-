import type { Request, Response } from 'express';
import type { RouteDeps } from './types';
import { persistState } from '../persistence';
import type {
  AddGameBody,
  AddWishlistBody,
  CreateReviewBody,
  GameIdParam,
  GamesQuery,
  IdParam,
  TypedAuthenticatedRequest,
} from '../../types/backend';

type TypedRequest<
  TBody = unknown,
  TParams extends object = Record<string, string>,
  TQuery = unknown
> = Request & { body: TBody; params: TParams; query: TQuery };
type TypedAuthRequest<
  TBody = unknown,
  TParams extends object = Record<string, string>,
  TQuery = unknown
> = TypedAuthenticatedRequest<TBody, TParams, TQuery>;

export function registerStoreRoutes({ app, state, authenticate, isAdmin }: RouteDeps) {
  const { games, reviews, wishlists } = state;

  app.get('/games', (req: TypedRequest<unknown, Record<string, string>, GamesQuery>, res: Response) => {
    const { query } = req.query;
    const visibleGames = games.filter((game) => game.isActive !== false);
    if (query) {
      const filteredGames = visibleGames.filter((game) =>
        game.name.toLowerCase().includes(query.toLowerCase())
      );
      return res.json(filteredGames);
    }
    return res.json(visibleGames);
  });

  app.get('/games/:id', (req: TypedRequest<unknown, IdParam>, res: Response) => {
    const gameId = parseInt(req.params.id, 10);
    const game = games.find((g) => g.id === gameId);
    if (!game || game.isActive === false) {
      return res.status(404).json({ message: '遊戲未找到' });
    }
    return res.json(game);
  });

  app.post('/games', authenticate, isAdmin, (req: TypedAuthRequest<AddGameBody>, res: Response) => {
    const { name, price, description, image } = req.body;

    if (!name || !price || !description) {
      return res.status(400).json({ message: '請提供完整的遊戲信息' });
    }
    const newGame = {
      id: games.length + 1,
      name,
      price,
      description,
      image,
      isActive: true,
    };
    games.push(newGame);
    persistState(state);
    return res.status(201).json({ message: '遊戲已添加', game: newGame });
  });

  app.delete('/games/:id', authenticate, isAdmin, (req: TypedAuthRequest<unknown, IdParam>, res: Response) => {
    const gameId = parseInt(req.params.id, 10);
    const index = games.findIndex((g) => g.id === gameId);
    if (index === -1) {
      return res.status(404).json({ message: '遊戲未找到' });
    }
    games.splice(index, 1);
    persistState(state);
    return res.status(200).json({ message: '遊戲已刪除' });
  });

  app.get('/admin/games', authenticate, isAdmin, (req: TypedAuthRequest, res: Response) => {
    return res.status(200).json(games);
  });

  app.patch('/admin/games/:id/status', authenticate, isAdmin, (req: TypedAuthRequest<{ isActive: boolean }, IdParam>, res: Response) => {
    const gameId = parseInt(req.params.id, 10);
    const game = games.find((g) => g.id === gameId);
    if (!game) {
      return res.status(404).json({ message: '遊戲未找到' });
    }
    game.isActive = Boolean(req.body.isActive);
    persistState(state);
    return res.status(200).json({ message: game.isActive ? '商品已上架' : '商品已下架', game });
  });

  app.patch(
    '/admin/games/:id/variants/:variantId',
    authenticate,
    isAdmin,
    (
      req: TypedAuthRequest<{ name?: string; stock?: number; price?: string }, { id: string; variantId: string }>,
      res: Response
    ) => {
      const gameId = parseInt(req.params.id, 10);
      const game = games.find((g) => g.id === gameId);
      if (!game || !game.variants) {
        return res.status(404).json({ message: '商品或版本不存在' });
      }
      const variant = game.variants.find((v) => v.id === req.params.variantId);
      if (!variant) {
        return res.status(404).json({ message: '版本不存在' });
      }

      if (typeof req.body.name === 'string' && req.body.name.trim()) {
        variant.name = req.body.name.trim();
      }
      if (typeof req.body.price === 'string' && req.body.price.trim()) {
        variant.price = req.body.price.trim().startsWith('$') ? req.body.price.trim() : `$${req.body.price.trim()}`;
      }
      if (typeof req.body.stock === 'number' && req.body.stock >= 0) {
        variant.stock = Math.floor(req.body.stock);
      }

      persistState(state);
      return res.status(200).json({ message: '版本資料已更新', game });
    }
  );

  app.post('/wishlist', authenticate, (req: TypedAuthRequest<AddWishlistBody>, res: Response) => {
    const userId = req.user.id;
    const { id } = req.body;

    if (!wishlists[userId]) {
      wishlists[userId] = [];
    }
    if (!wishlists[userId].includes(id)) {
      wishlists[userId].push(id);
    }
    persistState(state);
    return res.status(200).json({ message: '已添加到收藏清單', wishlist: wishlists[userId] });
  });

  app.get('/wishlist', authenticate, (req: TypedAuthRequest, res: Response) => {
    const userId = req.user.id;
    const gamesInWishlist = (wishlists[userId] || [])
      .map((gameId) => games.find((game) => game.id === gameId))
      .filter(Boolean);
    return res.status(200).json(gamesInWishlist);
  });

  app.delete('/wishlist/:id', authenticate, (req: TypedAuthRequest<unknown, IdParam>, res: Response) => {
    const userId = req.user.id;
    const gameId = parseInt(req.params.id, 10);
    if (wishlists[userId]) {
      wishlists[userId] = wishlists[userId].filter((id) => id !== gameId);
    }
    persistState(state);
    return res.status(200).json({ message: '已移除收藏', wishlist: wishlists[userId] });
  });

  app.get('/reviews/:gameId', (req: TypedRequest<unknown, GameIdParam>, res: Response) => {
    const { gameId } = req.params;
    return res.json(reviews[gameId] || []);
  });

  app.post('/reviews', authenticate, (req: TypedAuthRequest<CreateReviewBody>, res: Response) => {
    const { gameId, content } = req.body;
    if (!gameId || !content) {
      return res.status(400).json({ message: '缺少必要資訊' });
    }

    if (!reviews[gameId]) {
      reviews[gameId] = [];
    }

    const newReview = {
      content,
      createdAt: new Date().toISOString(),
      username: req.user.username,
    };
    reviews[gameId].push(newReview);
    persistState(state);
    return res.status(201).json(newReview);
  });
}
