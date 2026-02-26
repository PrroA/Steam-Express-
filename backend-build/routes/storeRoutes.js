"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerStoreRoutes = registerStoreRoutes;
function registerStoreRoutes({ app, state, authenticate, isAdmin }) {
    const { games, reviews, wishlists } = state;
    app.get('/games', (req, res) => {
        const { query } = req.query;
        if (query) {
            const filteredGames = games.filter((game) => game.name.toLowerCase().includes(query.toLowerCase()));
            return res.json(filteredGames);
        }
        return res.json(games);
    });
    app.get('/games/:id', (req, res) => {
        const gameId = parseInt(req.params.id, 10);
        const game = games.find((g) => g.id === gameId);
        if (!game) {
            return res.status(404).json({ message: '遊戲未找到' });
        }
        return res.json(game);
    });
    app.post('/games', authenticate, isAdmin, (req, res) => {
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
        };
        games.push(newGame);
        return res.status(201).json({ message: '遊戲已添加', game: newGame });
    });
    app.delete('/games/:id', authenticate, isAdmin, (req, res) => {
        const gameId = parseInt(req.params.id, 10);
        const index = games.findIndex((g) => g.id === gameId);
        if (index === -1) {
            return res.status(404).json({ message: '遊戲未找到' });
        }
        games.splice(index, 1);
        return res.status(200).json({ message: '遊戲已刪除' });
    });
    app.post('/wishlist', authenticate, (req, res) => {
        const userId = req.user.id;
        const { id } = req.body;
        if (!wishlists[userId]) {
            wishlists[userId] = [];
        }
        if (!wishlists[userId].includes(id)) {
            wishlists[userId].push(id);
        }
        return res.status(200).json({ message: '已添加到收藏清單', wishlist: wishlists[userId] });
    });
    app.get('/wishlist', authenticate, (req, res) => {
        const userId = req.user.id;
        const gamesInWishlist = (wishlists[userId] || []).map((gameId) => games.find((game) => game.id === gameId));
        return res.status(200).json(gamesInWishlist);
    });
    app.delete('/wishlist/:id', authenticate, (req, res) => {
        const userId = req.user.id;
        const gameId = parseInt(req.params.id, 10);
        if (wishlists[userId]) {
            wishlists[userId] = wishlists[userId].filter((id) => id !== gameId);
        }
        return res.status(200).json({ message: '已移除收藏', wishlist: wishlists[userId] });
    });
    app.get('/reviews/:gameId', (req, res) => {
        const { gameId } = req.params;
        return res.json(reviews[gameId] || []);
    });
    app.post('/reviews', authenticate, (req, res) => {
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
        };
        reviews[gameId].push(newReview);
        return res.status(201).json(newReview);
    });
}
