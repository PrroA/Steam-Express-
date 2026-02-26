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

export interface Review {
  content: string;
  createdAt: string;
  username?: string;
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

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  registeredAt: string;
}

