"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerOrderRoutes = registerOrderRoutes;
const uuid_1 = require("uuid");
const persistence_1 = require("../persistence");
function pushOrderStatus(order, status, note) {
    order.status = status;
    order.statusHistory.push({ status, at: new Date().toISOString(), note });
}
function findVariant(game, variantId) {
    if (!game.variants || game.variants.length === 0)
        return null;
    if (!variantId)
        return game.variants[0] || null;
    return game.variants.find((variant) => variant.id === variantId) || null;
}
function restockOrderItems(order, games) {
    if (order.stockRestored)
        return;
    order.items.forEach((item) => {
        const game = games.find((g) => g.id === item.id);
        if (!game?.variants || game.variants.length === 0)
            return;
        const variant = game.variants.find((v) => v.id === item.variantId);
        if (!variant)
            return;
        variant.stock += item.quantity;
    });
    order.stockRestored = true;
}
function findOrderAcrossUsers(orders, orderId) {
    for (const [userId, userOrders] of Object.entries(orders)) {
        const order = (userOrders || []).find((item) => item.id === orderId);
        if (order) {
            return { userId: Number(userId), order };
        }
    }
    return null;
}
function registerOrderRoutes({ app, state, authenticate, isAdmin, stripeClient }) {
    const { carts, orders, games } = state;
    app.get('/cart', authenticate, (req, res) => {
        return res.json(carts[req.user.id] || []);
    });
    app.post('/cart', authenticate, (req, res) => {
        const userId = req.user.id;
        const { id, variantId } = req.body;
        const game = games.find((g) => g.id === id);
        if (!game || game.isActive === false) {
            return res.status(404).json({ message: 'Game not found' });
        }
        const selectedVariant = findVariant(game, variantId);
        if (game.variants?.length && !selectedVariant) {
            return res.status(400).json({ message: '無效的版本選擇' });
        }
        if (!carts[userId]) {
            carts[userId] = [];
        }
        const cartItem = carts[userId].find((item) => item.id === id && item.variantId === selectedVariant?.id);
        const nextQuantity = (cartItem?.quantity || 0) + 1;
        if (selectedVariant && nextQuantity > selectedVariant.stock) {
            return res.status(400).json({ message: '庫存不足，無法加入更多商品' });
        }
        if (cartItem) {
            cartItem.quantity += 1;
        }
        else {
            carts[userId].push({
                ...game,
                price: selectedVariant?.price || game.price,
                quantity: 1,
                variantId: selectedVariant?.id,
                variantName: selectedVariant?.name,
            });
        }
        (0, persistence_1.persistState)(state);
        return res.status(201).json({ message: 'Added to cart', cart: carts[userId] });
    });
    app.patch('/cart/:id', authenticate, (req, res) => {
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
            carts[userId] = cart.filter((i) => !(i.id === itemId && i.variantId === item.variantId));
            (0, persistence_1.persistState)(state);
            return res.status(200).json({ message: '購物車已更新', cart: carts[userId] });
        }
        const game = games.find((g) => g.id === item.id);
        const selectedVariant = game?.variants?.find((variant) => variant.id === item.variantId);
        if (selectedVariant && quantity > selectedVariant.stock) {
            return res.status(400).json({ message: '庫存不足，無法更新為此數量' });
        }
        item.quantity = quantity;
        (0, persistence_1.persistState)(state);
        return res.status(200).json({ message: '購物車已更新', cart: carts[userId] });
    });
    app.delete('/cart/:id', authenticate, (req, res) => {
        const userId = req.user.id;
        const itemId = parseInt(req.params.id, 10);
        const cart = carts[userId];
        if (!cart) {
            return res.status(404).json({ message: '購物車不存在' });
        }
        carts[userId] = cart.filter((item) => item.id !== itemId);
        (0, persistence_1.persistState)(state);
        return res.status(200).json({ message: '商品已移除', cart: carts[userId] });
    });
    app.get('/orders', authenticate, (req, res) => {
        const userId = req.user.id;
        if (!orders[userId]) {
            orders[userId] = [];
        }
        return res.status(200).json(orders[userId]);
    });
    app.get('/orders/:orderId', authenticate, (req, res) => {
        const userId = req.user.id;
        const order = (orders[userId] || []).find((item) => item.id === req.params.orderId);
        if (!order) {
            return res.status(404).json({ message: '訂單未找到' });
        }
        return res.status(200).json(order);
    });
    app.get('/admin/orders', authenticate, isAdmin, (req, res) => {
        const allOrders = Object.entries(orders).flatMap(([userId, userOrders]) => (userOrders || []).map((order) => ({ ...order, userId: Number(userId) })));
        return res.status(200).json(allOrders);
    });
    app.get('/admin/dashboard', authenticate, isAdmin, (req, res) => {
        const allOrders = Object.values(orders).flat();
        const totalOrders = allOrders.length;
        const paidOrders = allOrders.filter((order) => order.status === '已付款').length;
        const refundedOrders = allOrders.filter((order) => order.status === '已退款').length;
        const cancelledOrders = allOrders.filter((order) => order.status === '已取消').length;
        const pendingOrders = allOrders.filter((order) => order.status === '未付款').length;
        const totalRevenue = allOrders
            .filter((order) => order.status === '已付款')
            .reduce((sum, order) => sum + order.total, 0);
        const totalItemsSold = allOrders
            .filter((order) => order.status === '已付款')
            .reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0), 0);
        const lowStockGames = games
            .filter((game) => game.isActive !== false)
            .map((game) => ({
            id: game.id,
            name: game.name,
            variants: (game.variants || []).filter((variant) => variant.stock <= 5),
        }))
            .filter((game) => game.variants.length > 0);
        return res.status(200).json({
            totalOrders,
            paidOrders,
            refundedOrders,
            cancelledOrders,
            pendingOrders,
            totalRevenue,
            totalItemsSold,
            lowStockGames,
        });
    });
    app.patch('/admin/orders/:orderId/status', authenticate, isAdmin, (req, res) => {
        const found = findOrderAcrossUsers(orders, req.params.orderId);
        if (!found) {
            return res.status(404).json({ message: '訂單未找到' });
        }
        const { order } = found;
        const { status, note } = req.body;
        const allowedStatus = ['未付款', '付款失敗', '已付款', '已取消', '已退款'];
        if (!allowedStatus.includes(status)) {
            return res.status(400).json({ message: '無效的訂單狀態' });
        }
        if ((status === '已取消' || status === '已退款') && !order.stockRestored) {
            restockOrderItems(order, games);
        }
        if (status === '已付款' && !order.paymentDetails) {
            order.paymentDetails = {
                transactionId: `ADMIN-${Date.now()}`,
                paidAt: new Date().toISOString(),
            };
        }
        pushOrderStatus(order, status, note || '管理員手動更新');
        (0, persistence_1.persistState)(state);
        return res.status(200).json({ message: '訂單狀態已更新', order, userId: found.userId });
    });
    app.post('/orders/:orderId/cancel', authenticate, (req, res) => {
        const userId = req.user.id;
        const order = (orders[userId] || []).find((item) => item.id === req.params.orderId);
        if (!order) {
            return res.status(404).json({ message: '訂單未找到' });
        }
        if (!['未付款', '付款失敗'].includes(order.status)) {
            return res.status(400).json({ message: '目前狀態不可取消訂單' });
        }
        restockOrderItems(order, games);
        pushOrderStatus(order, '已取消', '使用者取消訂單');
        (0, persistence_1.persistState)(state);
        return res.status(200).json({ message: '訂單已取消', order });
    });
    app.post('/orders/:orderId/retry-payment', authenticate, (req, res) => {
        const userId = req.user.id;
        const order = (orders[userId] || []).find((item) => item.id === req.params.orderId);
        if (!order) {
            return res.status(404).json({ message: '訂單未找到' });
        }
        if (order.status !== '付款失敗') {
            return res.status(400).json({ message: '只有付款失敗訂單可重試付款' });
        }
        pushOrderStatus(order, '未付款', '重新嘗試付款');
        (0, persistence_1.persistState)(state);
        return res.status(200).json({ message: '訂單已切換為待付款，可重新付款', order });
    });
    app.post('/orders/:orderId/refund', authenticate, (req, res) => {
        const userId = req.user.id;
        const order = (orders[userId] || []).find((item) => item.id === req.params.orderId);
        if (!order) {
            return res.status(404).json({ message: '訂單未找到' });
        }
        if (order.status !== '已付款') {
            return res.status(400).json({ message: '僅已付款訂單可退款' });
        }
        restockOrderItems(order, games);
        pushOrderStatus(order, '已退款', '使用者申請退款');
        (0, persistence_1.persistState)(state);
        return res.status(200).json({ message: '退款完成', order });
    });
    app.post('/checkout', authenticate, async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ message: '未授權的請求' });
            }
            const userCart = carts[userId];
            if (!userCart || userCart.length === 0) {
                return res.status(400).json({ message: '購物車為空，無法結帳' });
            }
            if (!orders[userId]) {
                orders[userId] = [];
            }
            for (const item of userCart) {
                const game = games.find((g) => g.id === item.id);
                const variant = game?.variants?.find((v) => v.id === item.variantId);
                if (variant && variant.stock < item.quantity) {
                    return res.status(400).json({ message: `${game?.name || '商品'} 庫存不足` });
                }
            }
            for (const item of userCart) {
                const game = games.find((g) => g.id === item.id);
                const variant = game?.variants?.find((v) => v.id === item.variantId);
                if (variant) {
                    variant.stock -= item.quantity;
                }
            }
            const newOrder = {
                id: (0, uuid_1.v4)(),
                items: [...userCart],
                total: userCart.reduce((sum, item) => {
                    const price = parseFloat((item.price || '0').replace('$', ''));
                    return sum + (isNaN(price) ? 0 : price * item.quantity);
                }, 0),
                date: new Date().toISOString(),
                status: '未付款',
                statusHistory: [
                    {
                        status: '未付款',
                        at: new Date().toISOString(),
                        note: '訂單建立',
                    },
                ],
                stockRestored: false,
            };
            orders[userId].push(newOrder);
            carts[userId] = [];
            (0, persistence_1.persistState)(state);
            return res.status(200).json({ message: '結帳成功！', order: newOrder });
        }
        catch (error) {
            console.error('結帳錯誤:', error);
            return res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
        }
    });
    app.post('/pay', authenticate, (req, res) => {
        const userId = req.user.id;
        const { orderId, simulateFailure } = req.body;
        const order = orders[userId]?.find((o) => o.id === orderId);
        if (!order) {
            return res.status(404).json({ message: '訂單未找到' });
        }
        if (order.status === '已付款') {
            return res.status(400).json({ message: '訂單已付款，無法重複支付' });
        }
        if (order.status === '已取消' || order.status === '已退款') {
            return res.status(400).json({ message: '目前訂單狀態不可付款' });
        }
        if (simulateFailure) {
            pushOrderStatus(order, '付款失敗', '支付通道回傳失敗');
            (0, persistence_1.persistState)(state);
            return res.status(400).json({ message: '支付失敗，請重試', order });
        }
        const transactionId = `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        order.paymentDetails = {
            transactionId,
            paidAt: new Date().toISOString(),
        };
        pushOrderStatus(order, '已付款', '支付成功');
        (0, persistence_1.persistState)(state);
        return res.status(200).json({ message: '支付成功', order });
    });
    app.get('/transactions', authenticate, (req, res) => {
        const userId = req.user.id;
        const transactions = (orders[userId] || [])
            .filter((order) => order.paymentDetails)
            .map((order) => ({
            orderId: order.id,
            transactionId: order.paymentDetails?.transactionId,
            paidAt: order.paymentDetails?.paidAt,
            total: order.total,
        }));
        return res.status(200).json(transactions);
    });
    app.post('/create-payment-intent', async (req, res) => {
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
        }
        catch (error) {
            console.error('付款失敗:', error);
            return res.status(500).json({ error: error.message });
        }
    });
}
