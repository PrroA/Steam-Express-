import type { Express, RequestHandler } from 'express';
import type { Server as IOServer } from 'socket.io';
import type Stripe from 'stripe';
import type OpenAI from 'openai';

export interface User {
  id: number;
  username: string;
  password: string;
  role?: 'admin' | 'user';
  email?: string;
  registeredAt?: string;
}

export interface Game {
  id: number;
  name: string;
  price: string;
  description: string;
  image: string;
}

export interface CartItem extends Game {
  quantity: number;
}

export interface PaymentDetails {
  transactionId: string;
  paidAt: string;
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  date: string;
  status: '未付款' | '已付款';
  paymentDetails?: PaymentDetails;
}

export interface Review {
  content: string;
  createdAt: string;
  username?: string;
}

export interface ResetTokenEntry {
  username: string;
  expires: number;
}

export interface AppState {
  users: User[];
  messages: Array<{ user: string; text: string; timestamp: string }>;
  reviews: Record<string, Review[]>;
  carts: Record<number, CartItem[]>;
  orders: Record<number, Order[]>;
  wishlists: Record<number, number[]>;
  resetTokens: Record<string, ResetTokenEntry>;
  games: Game[];
}

export interface RegisterRoutesDeps {
  app: Express;
  io: IOServer;
  state: AppState;
  authenticate: RequestHandler;
  isAdmin: RequestHandler;
  stripeClient: Stripe;
  secretKey: string;
  openaiClient: OpenAI | null;
}

export interface JwtUser {
  id: number;
  username: string;
  role?: 'admin' | 'user';
}

export interface AuthenticatedRequest {
  user: JwtUser;
  body: unknown;
  params: Record<string, string>;
  query: unknown;
  headers: Record<string, string | undefined>;
}

export interface TypedAuthenticatedRequest<
  TBody = unknown,
  TParams extends object = Record<string, string>,
  TQuery = unknown
> extends AuthenticatedRequest {
  body: TBody;
  params: TParams;
  query: TQuery;
}

export interface IdParam {
  id: string;
}

export interface OrderIdParam {
  orderId: string;
}

export interface GameIdParam {
  gameId: string;
}

export interface GamesQuery {
  query?: string;
}

export interface RegisterBody {
  username: string;
  password: string;
}

export interface LoginBody {
  username: string;
  password: string;
}

export interface ForgotPasswordBody {
  username: string;
}

export interface ResetPasswordBody {
  token?: string;
  resetToken?: string;
  newPassword: string;
}

export interface UpdateProfileBody {
  username?: string;
  email?: string;
}

export interface AddGameBody {
  name: string;
  price: string;
  description: string;
  image: string;
}

export interface AddWishlistBody {
  id: number;
}

export interface CreateReviewBody {
  gameId: number;
  content: string;
}

export interface AddCartBody {
  id: number;
}

export interface UpdateCartBody {
  quantity: number;
}

export interface PayBody {
  orderId: string;
}

export interface CreatePaymentIntentBody {
  amount: number;
}

export interface GptReplyBody {
  message: string;
}
