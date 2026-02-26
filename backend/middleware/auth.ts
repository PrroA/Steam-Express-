import jwt from 'jsonwebtoken';

export function createAuthMiddleware(secretKey: string) {
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: '未提供 Token' });
    }

    try {
      const decoded = jwt.verify(token, secretKey);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(403).json({ message: 'Token 無效或已過期' });
    }
  };

  const isAdmin = (req: any, res: any, next: any) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '您無權限執行此操作' });
    }
    return next();
  };

  return { authenticate, isAdmin };
}

