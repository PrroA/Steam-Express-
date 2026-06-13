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

  test('demo-login issues a non-admin token that can access member profile', async () => {
    const demoLoginRes = await requestJson('/demo-login', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    expect(demoLoginRes.status).toBe(200);
    expect(demoLoginRes.body.token).toBeTruthy();
    expect(demoLoginRes.body.user).toMatchObject({
      username: 'demo_user',
      role: 'user',
    });

    const profileRes = await requestJson('/profile', {
      method: 'GET',
      headers: { Authorization: `Bearer ${demoLoginRes.body.token}` },
    });
    expect(profileRes.status).toBe(200);
    expect(profileRes.body.username).toBe('demo_user');

    const adminRes = await requestJson('/admin/dashboard', {
      method: 'GET',
      headers: { Authorization: `Bearer ${demoLoginRes.body.token}` },
    });
    expect(adminRes.status).toBe(403);
  });

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

  test('cart update and delete target the selected variant only', async () => {
    const username = `variant_cart_${Date.now()}`;
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
    const game = gamesRes.body.find((item) => Array.isArray(item.variants) && item.variants.length >= 2);
    expect(game).toBeTruthy();
    const [firstVariant, secondVariant] = game.variants;

    await requestJson('/cart', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: game.id, variantId: firstVariant.id }),
    });
    await requestJson('/cart', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: game.id, variantId: secondVariant.id }),
    });

    const updateSecond = await requestJson(`/cart/${game.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ quantity: 3, variantId: secondVariant.id }),
    });
    expect(updateSecond.status).toBe(200);
    const firstLine = updateSecond.body.cart.find((item) => item.variantId === firstVariant.id);
    const secondLine = updateSecond.body.cart.find((item) => item.variantId === secondVariant.id);
    expect(firstLine.quantity).toBe(1);
    expect(secondLine.quantity).toBe(3);

    const deleteFirst = await requestJson(`/cart/${game.id}?variantId=${encodeURIComponent(firstVariant.id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(deleteFirst.status).toBe(200);
    expect(deleteFirst.body.cart.some((item) => item.variantId === firstVariant.id)).toBe(false);
    expect(deleteFirst.body.cart.some((item) => item.variantId === secondVariant.id)).toBe(true);
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
    expect(checkoutRes.body.order.status).toBe('pending');
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
    expect(failPayRes.body.order.status).toBe('payment_failed');

    const retryRes = await requestJson(`/orders/${orderId}/retry-payment`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    });
    expect(retryRes.status).toBe(200);
    expect(retryRes.body.order.status).toBe('pending');

    const payRes = await requestJson('/pay', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ orderId }),
    });
    expect(payRes.status).toBe(200);
    expect(payRes.body.order.status).toBe('paid');

    const refundRes = await requestJson(`/orders/${orderId}/refund`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    });
    expect(refundRes.status).toBe(200);
    expect(refundRes.body.order.status).toBe('refunded');

    const detailRes = await requestJson(`/orders/${orderId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(detailRes.status).toBe(200);
    const statusSequence = detailRes.body.statusHistory.map((event) => event.status);
    expect(statusSequence).toEqual(['pending', 'payment_failed', 'pending', 'paid', 'refunded']);

    const gameAfterRefund = (await requestJson('/games', { method: 'GET' })).body.find(
      (item) => item.id === game.id
    );
    const stockAfterRefund = gameAfterRefund.variants.find((v) => v.id === variant.id).stock;
    expect(stockAfterRefund).toBe(initialStock);
  });

  test('admin can inspect payment audit events after demo quick pay', async () => {
    const username = `payment_audit_${Date.now()}`;
    const password = 'Password1!';

    await requestJson('/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    const userLoginRes = await requestJson('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    expect(userLoginRes.status).toBe(200);
    const userToken = userLoginRes.body.token;

    const gamesRes = await requestJson('/games', { method: 'GET' });
    const game = gamesRes.body.find((item) => item.isActive !== false && item.variants?.some((variant) => variant.stock > 0));
    const variant = game.variants.find((item) => item.stock > 0);

    const addRes = await requestJson('/cart', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ id: game.id, variantId: variant.id }),
    });
    expect(addRes.status).toBe(201);

    const checkoutRes = await requestJson('/checkout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({}),
    });
    expect(checkoutRes.status).toBe(200);
    const orderId = checkoutRes.body.order.id;

    const payRes = await requestJson('/pay', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ orderId }),
    });
    expect(payRes.status).toBe(200);

    const forbiddenRes = await requestJson('/admin/payment-audits', {
      method: 'GET',
      headers: { Authorization: `Bearer ${userToken}` },
    });
    expect(forbiddenRes.status).toBe(403);

    const adminLoginRes = await requestJson('/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'admin' }),
    });
    expect(adminLoginRes.status).toBe(200);

    const auditRes = await requestJson('/admin/payment-audits?limit=10', {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminLoginRes.body.token}` },
    });
    expect(auditRes.status).toBe(200);
    expect(Array.isArray(auditRes.body.events)).toBe(true);
    expect(auditRes.body.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provider: 'demo',
          source: 'demo-quick-pay',
          orderId,
          status: 'succeeded',
          reason: 'demo-paid',
        }),
      ])
    );
  });

  test('rag endpoint rejects empty message', async () => {
    const ragRes = await requestJson('/chat/rag', {
      method: 'POST',
      body: JSON.stringify({ message: '' }),
    });

    expect(ragRes.status).toBe(400);
    expect(ragRes.body.error).toBeTruthy();
  });

  test('rag endpoint grounds product questions with catalog sources', async () => {
    const ragRes = await requestJson('/chat/rag', {
      method: 'POST',
      body: JSON.stringify({ message: '推薦便宜的遊戲' }),
    });

    expect(ragRes.status).toBe(200);
    expect(ragRes.body.grounded).toBe(true);
    expect(ragRes.body.mode).toBe('product-recommendation');
    expect(typeof ragRes.body.reply).toBe('string');
    expect(ragRes.body.reply.length).toBeGreaterThan(0);
    expect(ragRes.body.reply).toContain('最低');
    expect(Array.isArray(ragRes.body.sources)).toBe(true);
    expect(ragRes.body.sources.some((source) => source.type === 'catalog')).toBe(true);
  });

  test('rag endpoint compares products for decision questions', async () => {
    const ragRes = await requestJson('/chat/rag', {
      method: 'POST',
      body: JSON.stringify({ message: 'My budget is $30 and I want an RPG. Which game should I choose?' }),
    });

    expect(ragRes.status).toBe(200);
    expect(ragRes.body.grounded).toBe(true);
    expect(ragRes.body.mode).toBe('product-decision');
    expect(ragRes.body.reply).toContain('首選');
    expect(ragRes.body.reply).toContain('$30.00');
    expect(ragRes.body.sources.some((source) => source.type === 'catalog')).toBe(true);
    expect(ragRes.body.sources[0]).toEqual(
      expect.objectContaining({
        gameId: expect.any(Number),
        price: expect.stringMatching(/^\$\d+\.\d{2}$/),
        href: expect.stringMatching(/^\/game\/\d+$/),
        reason: expect.any(String),
      })
    );
    expect(ragRes.body.sources[0].price).not.toBe('$0.00');
  });

  test('rag endpoint supports natural language product search', async () => {
    const ragRes = await requestJson('/chat/rag', {
      method: 'POST',
      body: JSON.stringify({ message: '我想找 1000 元以下、可以放鬆玩的遊戲，不要恐怖' }),
    });

    expect(ragRes.status).toBe(200);
    expect(ragRes.body.grounded).toBe(true);
    expect(ragRes.body.mode).toBe('product-search');
    expect(ragRes.body.sources.some((source) => source.type === 'catalog')).toBe(true);
    expect(ragRes.body.sources[0]).toEqual(
      expect.objectContaining({
        gameId: expect.any(Number),
        price: expect.stringMatching(/^\$\d+\.\d{2}$/),
        href: expect.stringMatching(/^\/game\/\d+$/),
        reason: expect.any(String),
      })
    );
    expect(ragRes.body.sources[0].price).not.toBe('$0.00');
  });

  test('rag endpoint returns a shopping agent plan for assistant tasks', async () => {
    const ragRes = await requestJson('/chat/rag', {
      method: 'POST',
      body: JSON.stringify({ message: '幫我找 30 美元以下的 RPG，並加入比較' }),
    });

    expect(ragRes.status).toBe(200);
    expect(ragRes.body.grounded).toBe(true);
    expect(ragRes.body.mode).toBe('shopping-agent');
    expect(Array.isArray(ragRes.body.agentPlan?.steps)).toBe(true);
    expect(ragRes.body.agentPlan.steps.some((step) => step.id === 'open-compare')).toBe(true);
    expect(ragRes.body.agentPlan.nextHref).toMatch(/^\/compare\?ids=/);
    expect(ragRes.body.sources.some((source) => source.type === 'catalog')).toBe(true);
  });

  test('rag endpoint uses client preference memory for anonymous recommendations', async () => {
    const gamesRes = await requestJson('/games');
    const targetGame = gamesRes.body.find((game) => game?.id && game?.name) || gamesRes.body[0];

    const ragRes = await requestJson('/chat/rag', {
      method: 'POST',
      body: JSON.stringify({
        message: 'recommend a game',
        clientProfile: {
          recentlyViewedIds: [targetGame.id],
          recentlyViewedNames: [targetGame.name],
          wishlistIds: [targetGame.id],
          cartIds: [targetGame.id],
          interactedGameIds: [targetGame.id],
          topKeywords: String(targetGame.description || targetGame.name).split(/\s+/).slice(0, 2),
          averagePrice: Number(String(targetGame.price || '$0').replace('$', '')) || 0,
          checkoutCreatedCount: 1,
        },
      }),
    });

    expect(ragRes.status).toBe(200);
    expect(ragRes.body.grounded).toBe(true);
    expect(ragRes.body.mode).toBe('personalized-recommendation');
    expect(ragRes.body.reply).toContain('願望清單');
    expect(ragRes.body.reply).toContain('購物車');
    expect(ragRes.body.sources.some((source) => source.type === 'catalog')).toBe(true);
  });

  test('rag endpoint returns structured product comparison for named games', async () => {
    const ragRes = await requestJson('/chat/rag', {
      method: 'POST',
      body: JSON.stringify({ message: 'Elden Ring vs The Witcher 3 哪個適合我？' }),
    });

    expect(ragRes.status).toBe(200);
    expect(ragRes.body.grounded).toBe(true);
    expect(ragRes.body.mode).toBe('product-comparison');
    expect(ragRes.body.reply).toContain('我會先選');
    expect(Array.isArray(ragRes.body.comparison)).toBe(true);
    expect(ragRes.body.comparison).toHaveLength(2);
    expect(ragRes.body.comparison.map((row) => row.name)).toEqual(
      expect.arrayContaining(['Elden Ring', 'The Witcher 3'])
    );
    expect(ragRes.body.comparison[0]).toEqual(
      expect.objectContaining({
        gameId: expect.any(Number),
        price: expect.stringMatching(/^\$\d+\.\d{2}$/),
        stock: expect.any(Number),
        fit: expect.any(String),
        tradeoff: expect.any(String),
        href: expect.stringMatching(/^\/game\/\d+$/),
      })
    );
    expect(ragRes.body.comparison.map((row) => row.price)).not.toContain('$0.00');
  });

  test('rag endpoint asks users to log in before reviewing cart', async () => {
    const ragRes = await requestJson('/chat/rag', {
      method: 'POST',
      body: JSON.stringify({ message: '幫我檢查購物車適不適合結帳' }),
    });

    expect(ragRes.status).toBe(200);
    expect(ragRes.body.grounded).toBe(false);
    expect(ragRes.body.mode).toBe('cart-auth-required');
    expect(ragRes.body.reply).toContain('登入');
    expect(ragRes.body.sources).toEqual([]);
  });

  test('rag endpoint reviews signed-in user cart before checkout', async () => {
    const loginRes = await requestJson('/demo-login', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    expect(loginRes.status).toBe(200);
    const token = loginRes.body.token;

    const gamesRes = await requestJson('/games', { method: 'GET' });
    const game = gamesRes.body.find((item) => item.isActive !== false && item.variants?.some((variant) => variant.stock > 0));
    const variant = game.variants.find((item) => item.stock > 0);

    const addRes = await requestJson('/cart', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: game.id, variantId: variant.id }),
    });
    expect(addRes.status).toBe(201);

    const ragRes = await requestJson('/chat/rag', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message: '幫我檢查購物車適不適合結帳' }),
    });

    expect(ragRes.status).toBe(200);
    expect(ragRes.body.grounded).toBe(true);
    expect(ragRes.body.mode).toBe('cart-review');
    expect(ragRes.body.reply).toContain('購物車');
    expect(ragRes.body.cartReview).toEqual(
      expect.objectContaining({
        total: expect.stringMatching(/^\$\d+\.\d{2}$/),
        itemCount: expect.any(Number),
        verdict: expect.any(String),
        nextStep: expect.any(String),
      })
    );
    expect(ragRes.body.cartReview.items[0]).toEqual(
      expect.objectContaining({
        gameId: game.id,
        name: game.name,
        quantity: expect.any(Number),
        lineTotal: expect.stringMatching(/^\$\d+\.\d{2}$/),
        advice: expect.any(String),
        href: `/game/${game.id}`,
      })
    );
    expect(ragRes.body.sources.some((source) => source.type === 'catalog')).toBe(true);
  });

  test('rag endpoint personalizes recommendations for signed-in users', async () => {
    const loginRes = await requestJson('/demo-login', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    expect(loginRes.status).toBe(200);
    const token = loginRes.body.token;

    const gamesRes = await requestJson('/games', { method: 'GET' });
    const game = gamesRes.body.find((item) => item.isActive !== false);

    const wishlistRes = await requestJson('/wishlist', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: game.id }),
    });
    expect(wishlistRes.status).toBe(200);

    const ragRes = await requestJson('/chat/rag', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message: '適合我的推薦' }),
    });

    expect(ragRes.status).toBe(200);
    expect(ragRes.body.grounded).toBe(true);
    expect(ragRes.body.mode).toBe('personalized-recommendation');
    expect(ragRes.body.reply).toContain('願望清單');
    expect(ragRes.body.reply).toContain(game.name);
    expect(ragRes.body.sources.some((source) => source.type === 'catalog')).toBe(true);
  });

  test('rag endpoint grounds refund and payment questions with service sources', async () => {
    const ragRes = await requestJson('/chat/rag', {
      method: 'POST',
      body: JSON.stringify({ message: '可以退款嗎？付款失敗怎麼辦？' }),
    });

    expect(ragRes.status).toBe(200);
    expect(ragRes.body.grounded).toBe(true);
    expect(typeof ragRes.body.reply).toBe('string');
    expect(ragRes.body.reply.length).toBeGreaterThan(0);
    expect(Array.isArray(ragRes.body.sources)).toBe(true);
    expect(ragRes.body.sources.some((source) => ['faq', 'policy'].includes(source.type))).toBe(true);
  });

  test('rag endpoint returns retriever debug details when requested locally', async () => {
    const ragRes = await requestJson('/chat/rag?debug=1', {
      method: 'POST',
      body: JSON.stringify({ message: '可以退款嗎？' }),
    });

    expect(ragRes.status).toBe(200);
    expect(ragRes.body.debug).toBeTruthy();
    expect(ragRes.body.debug.retriever).toBe('local-hybrid');
    expect(ragRes.body.debug.query).toBe('可以退款嗎？');
    expect(Array.isArray(ragRes.body.debug.matches)).toBe(true);
    expect(ragRes.body.debug.matches.length).toBeGreaterThan(0);
    expect(ragRes.body.debug.matches[0].scoreBreakdown).toEqual(
      expect.objectContaining({
        exact: expect.any(Number),
        title: expect.any(Number),
        content: expect.any(Number),
        tags: expect.any(Number),
        intent: expect.any(Number),
      })
    );
  });

  test('admin can inspect AI usage without changing chat response shape', async () => {
    const userRes = await requestJson('/demo-login', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    expect(userRes.status).toBe(200);
    const userToken = userRes.body.token;

    const ragRes = await requestJson('/chat/rag', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ message: 'recommend a game' }),
    });
    expect(ragRes.status).toBe(200);
    expect(ragRes.body).not.toHaveProperty('usageLog');
    expect(ragRes.body.mode).toBeTruthy();

    const forbiddenRes = await requestJson('/admin/ai-usage', {
      method: 'GET',
      headers: { Authorization: `Bearer ${userToken}` },
    });
    expect(forbiddenRes.status).toBe(403);

    const adminLoginRes = await requestJson('/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'admin' }),
    });
    expect(adminLoginRes.status).toBe(200);

    const usageRes = await requestJson('/admin/ai-usage?limit=5', {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminLoginRes.body.token}` },
    });
    expect(usageRes.status).toBe(200);
    expect(usageRes.body.summary).toEqual(
      expect.objectContaining({
        total: expect.any(Number),
        grounded: expect.any(Number),
        fallback: expect.any(Number),
        groundedRate: expect.any(Number),
        fallbackRate: expect.any(Number),
        averageDurationMs: expect.any(Number),
        byMode: expect.any(Object),
        byProvider: expect.any(Object),
      })
    );
    expect(usageRes.body.summary.total).toBeGreaterThan(0);
    expect(usageRes.body.summary.groundedRate).toBeGreaterThanOrEqual(0);
    expect(usageRes.body.summary.groundedRate).toBeLessThanOrEqual(1);
    expect(usageRes.body.summary.fallbackRate).toBeGreaterThanOrEqual(0);
    expect(usageRes.body.summary.fallbackRate).toBeLessThanOrEqual(1);
    expect(Array.isArray(usageRes.body.events)).toBe(true);
    expect(usageRes.body.events[0]).toEqual(
      expect.objectContaining({
        mode: ragRes.body.mode,
        grounded: ragRes.body.grounded,
        sourceCount: ragRes.body.sources.length,
        messagePreview: 'recommend a game',
      })
    );
  });

  test('rag endpoint keeps unrelated questions inside support scope', async () => {
    const ragRes = await requestJson('/chat/rag', {
      method: 'POST',
      body: JSON.stringify({ message: '請解釋量子力學' }),
    });

    expect(ragRes.status).toBe(200);
    expect(ragRes.body.grounded).toBe(false);
    expect(ragRes.body.mode).toBe('out-of-scope');
    expect(ragRes.body.reply).toContain('商城');
    expect(ragRes.body.sources).toEqual([]);
  });

  test('rag endpoint asks users to log in before checking personal orders', async () => {
    const ragRes = await requestJson('/chat/rag', {
      method: 'POST',
      body: JSON.stringify({ message: '我的訂單狀態' }),
    });

    expect(ragRes.status).toBe(200);
    expect(ragRes.body.grounded).toBe(false);
    expect(ragRes.body.mode).toBe('order-auth-required');
    expect(ragRes.body.reply).toContain('登入');
    expect(ragRes.body.sources).toEqual([]);
  });

  test('rag endpoint summarizes personal order status for signed-in users', async () => {
    const loginRes = await requestJson('/demo-login', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    expect(loginRes.status).toBe(200);
    const token = loginRes.body.token;

    const gamesRes = await requestJson('/games', { method: 'GET' });
    const game = gamesRes.body.find((item) => item.isActive !== false && item.variants?.some((variant) => variant.stock > 0));
    const variant = game.variants.find((item) => item.stock > 0);

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

    const ragRes = await requestJson('/chat/rag', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message: '我的訂單狀態' }),
    });

    expect(ragRes.status).toBe(200);
    expect(ragRes.body.grounded).toBe(true);
    expect(ragRes.body.mode).toBe('order-status');
    expect(ragRes.body.reply).toContain('待付款');
    expect(ragRes.body.reply).toContain(checkoutRes.body.order.id.slice(-6));
    expect(ragRes.body.sources.some((source) => source.type === 'order')).toBe(true);
  });

  test('rag endpoint asks users to log in before order aftercare', async () => {
    const ragRes = await requestJson('/chat/rag', {
      method: 'POST',
      body: JSON.stringify({ message: '這筆訂單接下來怎麼辦？' }),
    });

    expect(ragRes.status).toBe(200);
    expect(ragRes.body.grounded).toBe(false);
    expect(ragRes.body.mode).toBe('order-auth-required');
    expect(ragRes.body.reply).toContain('登入');
    expect(ragRes.body.sources).toEqual([]);
  });

  test('rag endpoint gives aftercare next step for signed-in order', async () => {
    const loginRes = await requestJson('/demo-login', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    expect(loginRes.status).toBe(200);
    const token = loginRes.body.token;

    const gamesRes = await requestJson('/games', { method: 'GET' });
    const game = gamesRes.body.find((item) => item.isActive !== false && item.variants?.some((variant) => variant.stock > 0));
    const variant = game.variants.find((item) => item.stock > 0);

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

    const ragRes = await requestJson('/chat/rag', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message: '這筆訂單接下來怎麼辦？' }),
    });

    expect(ragRes.status).toBe(200);
    expect(ragRes.body.grounded).toBe(true);
    expect(ragRes.body.mode).toBe('order-care');
    expect(ragRes.body.reply).toContain(checkoutRes.body.order.id.slice(-6));
    expect(ragRes.body.orderCare).toEqual(
      expect.objectContaining({
        orderId: checkoutRes.body.order.id,
        shortId: checkoutRes.body.order.id.slice(-6),
        status: '待付款',
        fulfillmentStatus: '待出貨',
        total: expect.stringMatching(/^\$\d+\.\d{2}$/),
        items: expect.any(String),
        primaryAction: '前往付款',
        nextStep: expect.any(String),
        canRequestRefund: false,
        href: `/orders/${checkoutRes.body.order.id}`,
      })
    );
    expect(ragRes.body.sources.some((source) => source.type === 'order')).toBe(true);
  });

  test('admin routes enforce permission and allow basic game update for admin', async () => {
    const username = `normal_user_${Date.now()}`;
    const password = 'Password1!';

    const registerRes = await requestJson('/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    expect(registerRes.status).toBe(201);

    const userLoginRes = await requestJson('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    expect(userLoginRes.status).toBe(200);
    const userToken = userLoginRes.body.token;

    const forbiddenRes = await requestJson('/admin/games', {
      method: 'GET',
      headers: { Authorization: `Bearer ${userToken}` },
    });
    expect(forbiddenRes.status).toBe(403);

    const adminLoginRes = await requestJson('/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'admin' }),
    });
    expect(adminLoginRes.status).toBe(200);
    const adminToken = adminLoginRes.body.token;

    const addGameRes = await requestJson('/games', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: `admin_game_${Date.now()}`,
        price: '29.99',
        description: 'for admin update test',
        image: '/vercel.svg',
      }),
    });
    expect(addGameRes.status).toBe(201);
    const gameId = addGameRes.body.game.id;

    const patchRes = await requestJson(`/admin/games/${gameId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'admin_game_updated',
        description: 'updated description',
        image: '/new-image.jpg',
        price: '39.99',
      }),
    });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.game.name).toBe('admin_game_updated');
    expect(String(patchRes.body.game.price)).toContain('39.99');

    const ensureVariantRes = await requestJson(`/admin/games/${gameId}/ensure-variant`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({}),
    });
    expect(ensureVariantRes.status).toBe(200);
    expect(Array.isArray(ensureVariantRes.body.game.variants)).toBe(true);
    expect(ensureVariantRes.body.game.variants.length).toBeGreaterThan(0);
  });
});
