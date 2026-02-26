"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthMiddleware = createAuthMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function createAuthMiddleware(secretKey) {
    const authenticate = (req, res, next) => {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: '未提供 Token' });
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, secretKey);
            req.user = decoded;
            next();
        }
        catch (error) {
            return res.status(403).json({ message: 'Token 無效或已過期' });
        }
    };
    const isAdmin = (req, res, next) => {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: '您無權限執行此操作' });
        }
        return next();
    };
    return { authenticate, isAdmin };
}
