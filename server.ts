require('dotenv').config();
import type { NextFunction, Request, Response } from 'express';
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const Stripe = require('stripe');
const OpenAI = require('openai');
const state = require('../backend/state');
const { createAuthMiddleware } = require('../backend/middleware/auth');
const { registerRoutes } = require('../backend/registerRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: 'http://localhost:3000', credentials: true },
});

const stripeClient = Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy');
const secretKey = process.env.SECRET_KEY || 'your_secret_key';
const openaiClient = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const { authenticate, isAdmin } = createAuthMiddleware(secretKey);

const allowedOrigins = [
  'http://localhost:3000',
  'https://gogo-ten-red.vercel.app',
  'https://gogo-amber.vercel.app',
  'https://steam-express.onrender.com',
];

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
  console.error('Global Error:', err);
  res
    .status(typedError.status || 500)
    .json({ message: typedError.message || '伺服器內部錯誤' });
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
