/** @jest-environment node */

const app = require('../server');

describe('API integration', () => {
  let server;
  let baseUrl;

  beforeAll((done) => {
    server = app.listen(0, () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  const requestJson = async (path, options = {}) => {
    const { headers, ...restOptions } = options;
    const res = await fetch(`${baseUrl}${path}`, {
      ...restOptions,
      headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    });
    const payload = await res.json().catch(() => ({}));
    return { status: res.status, body: payload };
  };

  test('forgot-password + confirm-reset-password can reset and login with new password', async () => {
    const username = `reset_user_${Date.now()}`;
    const oldPassword = 'Password1!';
    const newPassword = 'NewPass123!';

    const registerRes = await requestJson('/register', {
      method: 'POST',
      body: JSON.stringify({ username, password: oldPassword }),
    });
    expect(registerRes.status).toBe(201);

    const forgotRes = await requestJson('/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body.resetToken).toBeTruthy();

    const confirmRes = await requestJson('/confirm-reset-password', {
      method: 'POST',
      body: JSON.stringify({ resetToken: forgotRes.body.resetToken, newPassword }),
    });
    expect(confirmRes.status).toBe(200);

    const loginOldPasswordRes = await requestJson('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password: oldPassword }),
    });
    expect(loginOldPasswordRes.status).toBe(401);

    const loginNewPasswordRes = await requestJson('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password: newPassword }),
    });
    expect(loginNewPasswordRes.status).toBe(200);
    expect(loginNewPasswordRes.body.token).toBeTruthy();
  });

  test('orders detail endpoint returns current user order and blocks other users', async () => {
    const userA = `order_a_${Date.now()}`;
    const userB = `order_b_${Date.now()}`;
    const password = 'Password1!';

    await requestJson('/register', {
      method: 'POST',
      body: JSON.stringify({ username: userA, password }),
    });
    await requestJson('/register', {
      method: 'POST',
      body: JSON.stringify({ username: userB, password }),
    });

    const loginA = await requestJson('/login', {
      method: 'POST',
      body: JSON.stringify({ username: userA, password }),
    });
    const loginB = await requestJson('/login', {
      method: 'POST',
      body: JSON.stringify({ username: userB, password }),
    });
    const tokenA = loginA.body.token;
    const tokenB = loginB.body.token;

    const gamesRes = await requestJson('/games', { method: 'GET' });
    expect(gamesRes.status).toBe(200);
    expect(Array.isArray(gamesRes.body)).toBe(true);
    expect(gamesRes.body.length).toBeGreaterThan(0);

    const firstGameId = gamesRes.body[0].id;

    const addToCartRes = await requestJson('/cart', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ id: firstGameId }),
    });
    expect(addToCartRes.status).toBe(201);

    const checkoutRes = await requestJson('/checkout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({}),
    });
    expect(checkoutRes.status).toBe(200);
    expect(checkoutRes.body.order?.id).toBeTruthy();
    const orderId = checkoutRes.body.order.id;

    const ownOrderRes = await requestJson(`/orders/${orderId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(ownOrderRes.status).toBe(200);
    expect(ownOrderRes.body.id).toBe(orderId);

    const otherUserOrderRes = await requestJson(`/orders/${orderId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    expect(otherUserOrderRes.status).toBe(404);
  });

  test('variant inventory blocks over-purchase in cart', async () => {
    const username = `stock_user_${Date.now()}`;
    const password = 'Password1!';

    await requestJson('/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    const loginRes = await requestJson('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    const token = loginRes.body.token;

    const gamesRes = await requestJson('/games', { method: 'GET' });
    const gameWithVariants = gamesRes.body.find(
      (game) => Array.isArray(game.variants) && game.variants.length > 0
    );
    expect(gameWithVariants).toBeTruthy();

    const variant = gameWithVariants.variants[0];
    const stock = variant.stock;
    expect(stock).toBeGreaterThan(0);

    for (let i = 0; i < stock; i += 1) {
      const addRes = await requestJson('/cart', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: gameWithVariants.id, variantId: variant.id }),
      });
      expect(addRes.status).toBe(201);
    }

    const overflowRes = await requestJson('/cart', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: gameWithVariants.id, variantId: variant.id }),
    });
    expect(overflowRes.status).toBe(400);
  });

  test('order lifecycle supports failure, retry, payment and refund with timeline', async () => {
    const username = `life_user_${Date.now()}`;
    const password = 'Password1!';

    await requestJson('/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    const loginRes = await requestJson('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    const token = loginRes.body.token;

    const gamesRes = await requestJson('/games', { method: 'GET' });
    const game = gamesRes.body.find((item) => item.variants?.length > 0);
    expect(game).toBeTruthy();
    const variant = game.variants[0];
    const initialStock = variant.stock;

    const addRes = await requestJson('/cart', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: game.id, variantId: variant.id }),
    });
    expect(addRes.status).toBe(201);

    const checkoutRes = await requestJson('/checkout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    });
    expect(checkoutRes.status).toBe(200);
    const orderId = checkoutRes.body.order.id;
    expect(checkoutRes.body.order.status).toBe('未付款');
    expect(Array.isArray(checkoutRes.body.order.statusHistory)).toBe(true);
    expect(checkoutRes.body.order.items[0].variantId).toBe(variant.id);

    const gameAfterCheckout = (await requestJson('/games', { method: 'GET' })).body.find(
      (item) => item.id === game.id
    );
    const stockAfterCheckout = gameAfterCheckout.variants.find((v) => v.id === variant.id).stock;
    expect(stockAfterCheckout).toBe(initialStock - 1);

    const failPayRes = await requestJson('/pay', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ orderId, simulateFailure: true }),
    });
    expect(failPayRes.status).toBe(400);
    expect(failPayRes.body.order.status).toBe('付款失敗');

    const retryRes = await requestJson(`/orders/${orderId}/retry-payment`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    });
    expect(retryRes.status).toBe(200);
    expect(retryRes.body.order.status).toBe('未付款');

    const payRes = await requestJson('/pay', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ orderId }),
    });
    expect(payRes.status).toBe(200);
    expect(payRes.body.order.status).toBe('已付款');

    const refundRes = await requestJson(`/orders/${orderId}/refund`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    });
    expect(refundRes.status).toBe(200);
    expect(refundRes.body.order.status).toBe('已退款');

    const detailRes = await requestJson(`/orders/${orderId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(detailRes.status).toBe(200);
    const statusSequence = detailRes.body.statusHistory.map((event) => event.status);
    expect(statusSequence).toEqual(['未付款', '付款失敗', '未付款', '已付款', '已退款']);

    const gameAfterRefund = (await requestJson('/games', { method: 'GET' })).body.find(
      (item) => item.id === game.id
    );
    const stockAfterRefund = gameAfterRefund.variants.find((v) => v.id === variant.id).stock;
    expect(stockAfterRefund).toBe(initialStock);
  });

  test('rag endpoint returns grounded answer with sources for platform question', async () => {
    const ragRes = await requestJson('/chat/rag', {
      method: 'POST',
      body: JSON.stringify({ message: '退款規則是什麼？' }),
    });

    expect(ragRes.status).toBe(200);
    expect(typeof ragRes.body.reply).toBe('string');
    expect(ragRes.body.reply.length).toBeGreaterThan(0);
    expect(Array.isArray(ragRes.body.sources)).toBe(true);
    expect(ragRes.body.sources.length).toBeGreaterThan(0);
  });
});
