import jwt from 'jsonwebtoken';

export function createAuthMiddleware(secretKey: string) {
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: '請先登入後再繼續。' });
    }

    try {
      const decoded = jwt.verify(token, secretKey);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(403).json({ message: '登入狀態已過期，請重新登入。' });
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

