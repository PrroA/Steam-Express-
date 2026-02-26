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
});
