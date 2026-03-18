"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerStoreRoutes = registerStoreRoutes;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const express_1 = __importDefault(require("express"));
const persistence_1 = require("../persistence");
function registerStoreRoutes({ app, state, authenticate, isAdmin }) {
    const { games, reviews, wishlists } = state;
    const normalizePrice = (rawPrice) => {
        const trimmed = String(rawPrice || '').trim();
        return trimmed.startsWith('$') ? trimmed : `$${trimmed}`;
    };
    const ensureDefaultVariant = (game) => {
        if (Array.isArray(game.variants) && game.variants.length > 0) {
            return game.variants;
        }
        game.variants = [
            {
                id: 'standard',
                name: 'Standard',
                price: game.price,
                stock: 50,
            },
        ];
        return game.variants;
    };
    const uploadMimeToExt = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/gif': 'gif',
        'image/avif': 'avif',
    };
    app.get('/games', (req, res) => {
        const { query } = req.query;
        const visibleGames = games.filter((game) => game.isActive !== false);
        if (query) {
            const filteredGames = visibleGames.filter((game) => game.name.toLowerCase().includes(query.toLowerCase()));
            return res.json(filteredGames);
        }
        return res.json(visibleGames);
    });
    app.get('/games/:id', (req, res) => {
        const gameId = parseInt(req.params.id, 10);
        const game = games.find((g) => g.id === gameId);
        if (!game || game.isActive === false) {
            return res.status(404).json({ message: '遊戲未找到' });
        }
        return res.json(game);
    });
    app.post('/games', authenticate, isAdmin, (req, res) => {
        const { name, price, description, image } = req.body;
        if (!name || !price || !description) {
            return res.status(400).json({ message: '請提供完整的遊戲信息' });
        }
        const normalizedPrice = normalizePrice(price);
        const variantId = 'standard';
        const newGame = {
            id: games.length + 1,
            name,
            price: normalizedPrice,
            description,
            image,
            isActive: true,
            variants: [
                {
                    id: variantId,
                    name: 'Standard',
                    price: normalizedPrice,
                    stock: 50,
                },
            ],
        };
        games.push(newGame);
        (0, persistence_1.persistState)(state);
        return res.status(201).json({ message: '遊戲已添加', game: newGame });
    });
    app.delete('/games/:id', authenticate, isAdmin, (req, res) => {
        const gameId = parseInt(req.params.id, 10);
        const index = games.findIndex((g) => g.id === gameId);
        if (index === -1) {
            return res.status(404).json({ message: '遊戲未找到' });
        }
        games.splice(index, 1);
        (0, persistence_1.persistState)(state);
        return res.status(200).json({ message: '遊戲已刪除' });
    });
    app.get('/admin/games', authenticate, isAdmin, (req, res) => {
        return res.status(200).json(games);
    });
    app.patch('/admin/games/:id/status', authenticate, isAdmin, (req, res) => {
        const gameId = parseInt(req.params.id, 10);
        const game = games.find((g) => g.id === gameId);
        if (!game) {
            return res.status(404).json({ message: '遊戲未找到' });
        }
        game.isActive = Boolean(req.body.isActive);
        (0, persistence_1.persistState)(state);
        return res.status(200).json({ message: game.isActive ? '商品已上架' : '商品已下架', game });
    });
    app.post('/admin/upload-image', authenticate, isAdmin, express_1.default.raw({ type: 'image/*', limit: '8mb' }), (req, res) => {
        const contentType = String(req.headers['content-type'] || '')
            .split(';')[0]
            .trim()
            .toLowerCase();
        const ext = uploadMimeToExt[contentType];
        if (!ext) {
            return res.status(400).json({ message: '僅支援 jpg/png/webp/gif/avif 圖片格式' });
        }
        if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
            return res.status(400).json({ message: '未收到圖片內容' });
        }
        const uploadDir = path_1.default.join(process.cwd(), 'uploads');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const fileName = `${unique}.${ext}`;
        const filePath = path_1.default.join(uploadDir, fileName);
        fs_1.default.writeFileSync(filePath, req.body);
        const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
        const protocol = forwardedProto || req.protocol || 'http';
        const hostHeader = req.headers.host || 'localhost:4000';
        const host = String(hostHeader);
        const imageUrl = `${protocol}://${host}/uploads/${fileName}`;
        return res.status(201).json({ message: '圖片上傳成功', imageUrl });
    });
    app.patch('/admin/games/:id', authenticate, isAdmin, (req, res) => {
        const gameId = parseInt(req.params.id, 10);
        const game = games.find((g) => g.id === gameId);
        if (!game) {
            return res.status(404).json({ message: '遊戲未找到' });
        }
        if (typeof req.body.name === 'string' && req.body.name.trim()) {
            game.name = req.body.name.trim();
        }
        if (typeof req.body.description === 'string' && req.body.description.trim()) {
            game.description = req.body.description.trim();
        }
        if (typeof req.body.image === 'string' && req.body.image.trim()) {
            game.image = req.body.image.trim();
        }
        if (typeof req.body.price === 'string' && req.body.price.trim()) {
            game.price = normalizePrice(req.body.price.trim());
            const standardVariant = game.variants?.find((variant) => variant.id === 'standard');
            if (standardVariant) {
                standardVariant.price = game.price;
            }
        }
        (0, persistence_1.persistState)(state);
        return res.status(200).json({ message: '商品資料已更新', game });
    });
    app.post('/admin/games/:id/ensure-variant', authenticate, isAdmin, (req, res) => {
        const gameId = parseInt(req.params.id, 10);
        const game = games.find((g) => g.id === gameId);
        if (!game) {
            return res.status(404).json({ message: '遊戲未找到' });
        }
        ensureDefaultVariant(game);
        (0, persistence_1.persistState)(state);
        return res.status(200).json({ message: '已建立預設版本', game });
    });
    app.patch('/admin/games/:id/variants/:variantId', authenticate, isAdmin, (req, res) => {
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
        (0, persistence_1.persistState)(state);
        return res.status(200).json({ message: '版本資料已更新', game });
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
        (0, persistence_1.persistState)(state);
        return res.status(200).json({ message: '已添加到收藏清單', wishlist: wishlists[userId] });
    });
    app.get('/wishlist', authenticate, (req, res) => {
        const userId = req.user.id;
        const gamesInWishlist = (wishlists[userId] || [])
            .map((gameId) => games.find((game) => game.id === gameId))
            .filter(Boolean);
        return res.status(200).json(gamesInWishlist);
    });
    app.delete('/wishlist/:id', authenticate, (req, res) => {
        const userId = req.user.id;
        const gameId = parseInt(req.params.id, 10);
        if (wishlists[userId]) {
            wishlists[userId] = wishlists[userId].filter((id) => id !== gameId);
        }
        (0, persistence_1.persistState)(state);
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
            username: req.user.username,
        };
        reviews[gameId].push(newReview);
        (0, persistence_1.persistState)(state);
        return res.status(201).json(newReview);
    });
}
