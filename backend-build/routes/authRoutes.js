"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAuthRoutes = registerAuthRoutes;
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function registerAuthRoutes({ app, state, secretKey, authenticate }) {
    const { users, resetTokens } = state;
    const resetPasswordHandler = async (req, res) => {
        const token = req.body.token || req.body.resetToken;
        const { newPassword } = req.body;
        const resetTokenData = resetTokens[token];
        if (!resetTokenData || Date.now() > resetTokenData.expires) {
            return res.status(400).json({ message: 'Token 無效或已過期' });
        }
        const user = users.find((u) => u.username === resetTokenData.username);
        if (!user) {
            return res.status(404).json({ message: '用戶不存在' });
        }
        user.password = await bcrypt_1.default.hash(newPassword, 10);
        delete resetTokens[token];
        return res.json({ message: '密碼更新成功！' });
    };
    app.post('/register', async (req, res) => {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: '請輸入帳號和密碼' });
        }
        const existingUser = users.find((u) => u.username === username);
        if (existingUser) {
            return res.status(400).json({ message: '帳號已存在' });
        }
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const newUser = { id: users.length + 1, username, password: hashedPassword };
        users.push(newUser);
        return res
            .status(201)
            .json({ message: '註冊成功！', user: { id: newUser.id, username: newUser.username } })
            .end();
    });
    app.post('/login', async (req, res) => {
        const { username, password } = req.body;
        const user = users.find((u) => u.username === username);
        if (!user || !(await bcrypt_1.default.compare(password, user.password))) {
            return res.status(401).json({ message: '無效的帳號或密碼' });
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, username: user.username, role: user.role }, secretKey, {
            expiresIn: '1d',
        });
        return res.json({ token });
    });
    app.post('/forgot-password', (req, res) => {
        const { username } = req.body;
        const user = users.find((u) => u.username === username);
        if (!user) {
            return res.status(404).json({ message: '用戶不存在' });
        }
        const resetToken = crypto_1.default.randomBytes(10).toString('hex');
        resetTokens[resetToken] = {
            username,
            expires: Date.now() + 15 * 60 * 1000,
        };
        return res.json({ message: '重設密碼的連結已發送', resetToken });
    });
    app.post('/reset-password', resetPasswordHandler);
    app.post('/confirm-reset-password', resetPasswordHandler);
    app.get('/profile', authenticate, (req, res) => {
        const userId = req.user.id;
        const user = users.find((u) => u.id === userId);
        if (!user) {
            return res.status(404).json({ message: '用戶未找到' });
        }
        return res.json({
            id: user.id,
            username: user.username,
            email: user.email || '未提供',
            registeredAt: user.registeredAt || '未知',
        });
    });
    app.put('/profile', authenticate, (req, res) => {
        const userId = req.user.id;
        const { username, email } = req.body;
        const user = users.find((u) => u.id === userId);
        if (!user) {
            return res.status(404).json({ message: '資料更新失敗' });
        }
        user.username = username || user.username;
        user.email = email || user.email;
        return res.json({ message: '個人資料更新成功', user });
    });
}
