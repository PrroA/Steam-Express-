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
  defaultFullName?: string;
  defaultPhone?: string;
  defaultAddress?: string;
  defaultPaymentMethod?: 'credit-card' | 'line-pay' | 'wallet';
}

export interface Game {
  id: number;
  name: string;
  price: string;
  description: string;
  image: string;
  isActive?: boolean;
  variants?: GameVariant[];
}

export interface GameVariant {
  id: string;
  name: string;
  price: string;
  stock: number;
}

export interface CartItem extends Game {
  quantity: number;
  variantId?: string;
  variantName?: string;
}

export interface PaymentDetails {
  transactionId: string;
  paidAt: string;
}

export type FulfillmentStatus = '待出貨' | '已出貨' | '已送達';

export interface ShippingDetails {
  carrier?: string;
  trackingNumber?: string;
  shippedAt?: string;
  deliveredAt?: string;
}

export interface CustomerInfo {
  fullName?: string;
  phone?: string;
  contactEmail?: string;
  shippingAddress?: string;
  orderNote?: string;
  paymentMethod?: 'credit-card' | 'line-pay' | 'wallet';
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  date: string;
  status: '未付款' | '付款失敗' | '已付款' | '已取消' | '已退款';
  fulfillmentStatus?: FulfillmentStatus;
  shippingDetails?: ShippingDetails;
  paymentDetails?: PaymentDetails;
  customerInfo?: CustomerInfo;
  statusHistory: OrderStatusEvent[];
  stockRestored?: boolean;
}

export interface OrderStatusEvent {
  status: Order['status'];
  at: string;
  note?: string;
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
  email?: string;
}

export interface LoginBody {
  username: string;
  password: string;
}

export interface ForgotPasswordBody {
  username?: string;
  email?: string;
  account?: string;
}

export interface ResetPasswordBody {
  token?: string;
  resetToken?: string;
  newPassword: string;
}

export interface UpdateProfileBody {
  username?: string;
  email?: string;
  defaultFullName?: string;
  defaultPhone?: string;
  defaultAddress?: string;
  defaultPaymentMethod?: 'credit-card' | 'line-pay' | 'wallet';
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
  variantId?: string;
}

export interface UpdateCartBody {
  quantity: number;
}

export interface CheckoutBody {
  fullName?: string;
  phone?: string;
  contactEmail?: string;
  shippingAddress?: string;
  orderNote?: string;
  paymentMethod?: 'credit-card' | 'line-pay' | 'wallet';
}

export interface PayBody {
  orderId: string;
  simulateFailure?: boolean;
}

export interface CreatePaymentIntentBody {
  orderId: string;
}

export interface GptReplyBody {
  message: string;
}
