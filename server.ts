require('dotenv').config();
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const Stripe = require('stripe');
const OpenAI = require('openai');
const state = require('../backend/state');
const { hydrateState } = require('../backend/persistence');
const { createAuthMiddleware } = require('../backend/middleware/auth');
const { registerRoutes } = require('../backend/registerRoutes');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  'http://localhost:3000',
  'https://gogo-ten-red.vercel.app',
  'https://gogo-amber.vercel.app',
  'https://steam-express.onrender.com',
];

const io = new Server(server, {
  cors: {
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  },
});

const stripeClient = Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy');
const secretKey = process.env.SECRET_KEY || 'your_secret_key';
const openaiClient = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const { authenticate, isAdmin } = createAuthMiddleware(secretKey);

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX ? Number(process.env.RATE_LIMIT_MAX) : 120;
const ipRateMap = new Map<string, { count: number; resetAt: number }>();

function normalizeError(status: number, payload: any, requestId: string) {
  if (payload?.success === false && payload?.error) {
    return { ...payload, requestId };
  }

  const message =
    payload?.error?.message ||
    payload?.message ||
    payload?.error ||
    (status >= 500 ? '伺服器內部錯誤' : '請求失敗');

  const code =
    payload?.error?.code ||
    payload?.code ||
    (status === 401
      ? 'UNAUTHORIZED'
      : status === 403
        ? 'FORBIDDEN'
        : status === 404
          ? 'NOT_FOUND'
          : status === 429
            ? 'RATE_LIMITED'
            : status >= 500
              ? 'INTERNAL_ERROR'
              : 'BAD_REQUEST');

  const passthrough: Record<string, unknown> = {};
  if (payload && typeof payload === 'object') {
    Object.keys(payload).forEach((key) => {
      if (!['success', 'error', 'message', 'code', 'details', 'requestId'].includes(key)) {
        passthrough[key] = payload[key];
      }
    });
  }

  return {
    success: false,
    error: {
      code,
      message,
      details: payload?.details || null,
    },
    requestId,
    ...passthrough,
  };
}

app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = req.header('x-request-id') || randomUUID();
  (req as any).requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
});

app.use((req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'test') {
    next();
    return;
  }

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
  const now = Date.now();
  const current = ipRateMap.get(ip);

  if (!current || now > current.resetAt) {
    ipRateMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    next();
    return;
  }

  current.count += 1;
  if (current.count > RATE_LIMIT_MAX) {
    const remainingMs = Math.max(0, current.resetAt - now);
    res.setHeader('retry-after', Math.ceil(remainingMs / 1000));
    res.status(429).json({ message: '請求過於頻繁，請稍後再試' });
    return;
  }

  next();
});

app.use((req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json.bind(res);
  res.json = ((payload: unknown) => {
    if (res.statusCode >= 400) {
      const requestId = ((req as any).requestId as string) || 'unknown';
      return originalJson(normalizeError(res.statusCode, payload, requestId));
    }
    return originalJson(payload);
  }) as typeof res.json;
  next();
});

app.use(
  cors({
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);
app.use(express.json());

app.use((req: Request, res: Response, next: NextFunction) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    const userId = (req as any).user?.id || 'guest';
    const requestId = (req as any).requestId || 'unknown';
    const line = JSON.stringify({
      t: new Date().toISOString(),
      requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs,
      userId,
      ip: req.ip,
    });
    console.log(line);
  });
  next();
});

hydrateState(state);

registerRoutes({
  app,
  io,
  state,
  authenticate,
  isAdmin,
  stripeClient,
  secretKey,
  openaiClient,
});

const KEEP_ALIVE_INTERVAL = 1000 * 60 * 10;
let keepAliveTimer: NodeJS.Timeout | null = null;

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  void next;
  const typedError = err as { status?: number; message?: string };
  const status = typedError.status || 500;
  console.error('Global Error:', err);
  res.status(status).json({
    message: typedError.message || '伺服器內部錯誤',
    code: status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR',
  });
});

function startServer(port = process.env.PORT || 4000) {
  if (!keepAliveTimer) {
    keepAliveTimer = setInterval(() => {
      fetch('https://steam-express.onrender.com/games').catch((err) =>
        console.error('Keep-Alive 失敗:', err)
      );
    }, KEEP_ALIVE_INTERVAL);
  }

  return server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

export { app, startServer };
export default app;
