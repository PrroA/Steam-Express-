import { v4 as uuidv4 } from 'uuid';
import type { Request, Response } from 'express';
import type { RouteDeps } from './types';
import type {
  AddCartBody,
  CreatePaymentIntentBody,
  IdParam,
  OrderIdParam,
  PayBody,
  TypedAuthenticatedRequest,
  UpdateCartBody,
} from '../../types/backend';

type TypedRequest<
  TBody = unknown,
  TParams extends object = Record<string, string>
> = Request & { body: TBody; params: TParams };
type TypedAuthRequest<
  TBody = unknown,
  TParams extends object = Record<string, string>
> = TypedAuthenticatedRequest<TBody, TParams>;

export function registerOrderRoutes({ app, state, authenticate, stripeClient }: RouteDeps) {
  const { carts, orders, games } = state;

  app.get('/cart', authenticate, (req: TypedAuthRequest, res: Response) => {
    return res.json(carts[req.user.id] || []);
  });

  app.post('/cart', authenticate, (req: TypedAuthRequest<AddCartBody>, res: Response) => {
    const userId = req.user.id;
    const { id } = req.body;
    const game = games.find((g) => g.id === id);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    if (!carts[userId]) {
      carts[userId] = [];
    }

    const cartItem = carts[userId].find((item) => item.id === id);
    if (cartItem) {
      cartItem.quantity += 1;
    } else {
      carts[userId].push({ ...game, quantity: 1 });
    }
    return res.status(201).json({ message: 'Added to cart', cart: carts[userId] });
  });

  app.patch('/cart/:id', authenticate, (req: TypedAuthRequest<UpdateCartBody, IdParam>, res: Response) => {
    const userId = req.user.id;
    const itemId = parseInt(req.params.id, 10);
    const { quantity } = req.body;
    const cart = carts[userId];

    if (!cart) {
      return res.status(404).json({ message: '購物車不存在' });
    }
    const item = cart.find((i) => i.id === itemId);
    if (!item) {
      return res.status(404).json({ message: '商品未找到' });
    }

    if (quantity <= 0) {
      carts[userId] = cart.filter((i) => i.id !== itemId);
    } else {
      item.quantity = quantity;
    }
    return res.status(200).json({ message: '購物車已更新', cart: carts[userId] });
  });

  app.delete('/cart/:id', authenticate, (req: TypedAuthRequest<unknown, IdParam>, res: Response) => {
    const userId = req.user.id;
    const itemId = parseInt(req.params.id, 10);
    const cart = carts[userId];
    if (!cart) {
      return res.status(404).json({ message: '購物車不存在' });
    }

    carts[userId] = cart.filter((item) => item.id !== itemId);
    return res.status(200).json({ message: '商品已移除', cart: carts[userId] });
  });

  app.get('/orders', authenticate, (req: TypedAuthRequest, res: Response) => {
    const userId = req.user.id;
    if (!orders[userId]) {
      orders[userId] = [];
    }
    return res.status(200).json(orders[userId]);
  });

  app.get('/orders/:orderId', authenticate, (req: TypedAuthRequest<unknown, OrderIdParam>, res: Response) => {
    const userId = req.user.id;
    const order = (orders[userId] || []).find((item) => item.id === req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: '訂單未找到' });
    }
    return res.status(200).json(order);
  });

  app.post('/checkout', authenticate, async (req: TypedAuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: '未授權的請求' });
      }

      if (!carts[userId] || carts[userId].length === 0) {
        return res.status(400).json({ message: '購物車為空，無法結帳' });
      }
      if (!orders[userId]) {
        orders[userId] = [];
      }

      const newOrder = {
        id: uuidv4(),
        items: carts[userId],
        total: carts[userId].reduce((sum, item) => {
          const price = parseFloat((item.price || '0').replace('$', ''));
          return sum + (isNaN(price) ? 0 : price * item.quantity);
        }, 0),
        date: new Date().toISOString(),
        status: '未付款' as const,
      };
      orders[userId].push(newOrder);
      carts[userId] = [];
      return res.status(200).json({ message: '結帳成功！', order: newOrder });
    } catch (error) {
      console.error('結帳錯誤:', error);
      return res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  });

  app.post('/pay', authenticate, (req: TypedAuthRequest<PayBody>, res: Response) => {
    const userId = req.user.id;
    const { orderId } = req.body;
    const order = orders[userId]?.find((o) => o.id === orderId);
    if (!order) {
      return res.status(404).json({ message: '訂單未找到' });
    }

    if (order.status === '已付款') {
      return res.status(400).json({ message: '訂單已付款，無法重複支付' });
    }

    const transactionId = `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    order.status = '已付款';
    order.paymentDetails = {
      transactionId,
      paidAt: new Date().toISOString(),
    };

    return res.status(200).json({ message: '支付成功', order });
  });

  app.get('/transactions', authenticate, (req: TypedAuthRequest, res: Response) => {
    const userId = req.user.id;
    const transactions = (orders[userId] || [])
      .filter((order) => order.paymentDetails)
      .map((order) => ({
        orderId: order.id,
        transactionId: order.paymentDetails.transactionId,
        paidAt: order.paymentDetails.paidAt,
        total: order.total,
      }));
    return res.status(200).json(transactions);
  });

  app.post('/create-payment-intent', async (req: TypedRequest<CreatePaymentIntentBody>, res: Response) => {
    try {
      let { amount } = req.body;
      if (!amount || amount < 0.5) {
        return res.status(400).json({ error: '金額不可低於 $0.50 USD' });
      }
      amount = Math.round(amount * 100);
      const paymentIntent = await stripeClient.paymentIntents.create({
        amount,
        currency: 'usd',
      });
      return res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error('付款失敗:', error);
      return res.status(500).json({ error: error.message });
    }
  });
}
