export interface Game {
  id: number;
  name: string;
  price: string;
  description: string;
  image: string;
  isActive?: boolean;
  variants?: GameVariant[];
}

export interface CartItem extends Game {
  quantity: number;
  variantId?: string;
  variantName?: string;
}

export interface GameVariant {
  id: string;
  name: string;
  price: string;
  stock: number;
}

export interface Review {
  content: string;
  createdAt: string;
  username?: string;
}

export interface PaymentDetails {
  transactionId: string;
  paidAt: string;
}

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
  status: OrderStatus;
  fulfillmentStatus?: FulfillmentStatus;
  shippingDetails?: ShippingDetails;
  paymentDetails?: PaymentDetails;
  customerInfo?: CustomerInfo;
  statusHistory: OrderStatusEvent[];
}

export interface OrderStatusEvent {
  status: Order['status'];
  at: string;
  note?: string;
}

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  registeredAt: string;
  defaultFullName?: string;
  defaultPhone?: string;
  defaultAddress?: string;
  defaultPaymentMethod?: 'credit-card' | 'line-pay' | 'wallet';
}
import type { FulfillmentStatus, OrderStatus } from '../utils/orderStatus';
