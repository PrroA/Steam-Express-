const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

require('dotenv').config();

const PORT = process.env.PORT || 4000;
const SECRET_KEY = process.env.SECRET_KEY || 'your_secret_key';

// 錯誤統一處理
app.use((err, req, res, next) => {
  console.error('Global Error:', err);
  res.status(err.status || 500).json({ message: err.message || '伺服器內部錯誤' });
});
// 跨域處理
app.use(cors({
  origin: ['http://localhost:3000'], // 設定跨域允許的來源
  credentials: true,
}));

// 中間件：用於檢查是否為管理員
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: '您無權限執行此操作' });
  }
  next();
};

app.use(express.json());

// 模擬數據結構
const users = [
  {
    id: 1,
    username: 'admin',
    password: bcrypt.hashSync('admin', 10),
    role: 'admin',//管理員
  },
  {
    id: 2,
    username: 'user1',
    password: bcrypt.hashSync('user1', 10),
    role: 'user',// for user
  },
];

const carts = {}; // 用戶購物車 { userId: [cartItems] }
const orders = {}; // 用戶訂單 { userId: [orderItems] }
const resetTokens = {}; // 密碼重置 token { token: { username, expires } }
const games = [
  { id: 1, name: 'Cyberpunk 2077', price: '$59.99', description: 'A futuristic RPG.', image: '/vercel.svg' },
  { id: 2, name: 'Elden Ring', price: '$49.99', description: 'An open-world adventure.', image: '/vercel.svg' },
  { id: 3, name: 'Hogwarts Legacy', price: '$39.99', description: 'A magical experience.', image: '/vercel.svg' },
  { id: 4, name: 'The Witcher 3', price: '$29.99', description: 'A legendary RPG.', image: '/vercel.svg' },
  { id: 5, name: 'The Elder Scrolls V: Skyrim', price: '$19.99', description: 'A fantasy RPG.', image: '/vercel.svg' },
  { id: 6, name: 'Dark Souls III', price: '$14.99', description: 'A dark fantasy RPG.', image: '/vercel.svg' },
  { id: 7, name: 'The Last of Us Remastered', price: '$19.99', description: 'A survival horror game.', image: '/vercel.svg' },
  { id: 8, name: 'one piece', price: '$19.99', description: 'A Japanese game.', image: '/vercel.svg' },
  { id: 9, name: 'Dragon Ball Super', price: '$19.99', description: 'A Japanese anime.', image: '/vercel.svg' },
];

// 用戶註冊
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: '請輸入帳號和密碼' });
  }
  const existingUser = users.find((u) => u.username === username);
  if (existingUser) {
    return res.status(400).json({ message: '帳號已存在' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = { id: users.length + 1, username, password: hashedPassword };
  users.push(newUser);
  res.status(201).json({ message: '註冊成功！', user: { id: newUser.id, username: newUser.username } });
});

// 用戶登入
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.find((u) => u.username === username); 
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: '無效的帳號或密碼' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role }, // 添加user到 
    SECRET_KEY,
    { expiresIn: '1d' },
  );
  console.log('生成的 Token:', token); // 打印 Token
  res.json({ token });
});

// 忘記密碼生成 token
app.post('/forgot-password', (req, res) => {
  const { username } = req.body;
  const user = users.find((u) => u.username === username);
  if (!user) {
    return res.status(404).json({ message: '用戶不存在' });
  }
  const resetToken = crypto.randomBytes(10).toString('hex');
  resetTokens[resetToken] = {
    username,
    expires: Date.now() + 15 * 60 * 1000, // 15 分鐘有效
  };
  res.json({ message: '重設密碼的連結已發送', resetToken });
});

// 重設密碼
app.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  const resetTokenData = resetTokens[token];

  if (!resetTokenData || Date.now() > resetTokenData.expires) {
    return res.status(400).json({ message: 'Token 無效或已過期' });
  }

  const user = users.find((u) => u.username === resetTokenData.username);
  if (!user) {
    return res.status(404).json({ message: '用戶不存在' });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  delete resetTokens[token];
  res.json({ message: '密碼更新成功！' });
});

// 中間件：用於驗證 JWT Token
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: '未提供 Token' });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ message: 'Token 無效或已過期' });
  }
};
// 獲取遊戲列表
app.get('/games', (req, res) => {
  const { query } = req.query;
  if (query) {
    const filteredGames = games.filter((game) => game.name.toLowerCase().includes(query.toLowerCase()));
    return res.json(filteredGames);
  }
  res.json(games);
});

app.get('/games/:id', (req, res) => {
  const gameId = parseInt(req.params.id);
  const game = games.find((g) => g.id === gameId);
  if (!game) {
    return res.status(404).json({ message: '遊戲未找到' });
  }
  res.json(game);
  console.log(id); 
});

// 獲取購物車內容
app.get('/cart', authenticate, (req, res) => {
  res.json(carts[req.user.id] || []);
});

// 添加商品到購物車
app.post('/cart', authenticate, (req, res) => {
  const userId = req.user.id; // 確保 `authenticate` 中正確設置 `req.user`
  const { id } = req.body; // 確保請求體包含 `id`

  const game = games.find((g) => g.id === id);
  if (!game) {
    return res.status(404).json({ message: 'Game not found' });
  }

  if (!carts[userId]) {
    carts[userId] = [];
  }
  
  const cartItem = carts[userId].find((item) => item.id === id);
  if (cartItem) {
    cartItem.quantity += 1; // 如果商品已存在，增加數量
  } else {
    carts[userId].push({ ...game, quantity: 1 }); // 新商品，設置數量為 1
  }

  res.status(201).json({ message: 'Added to cart', cart: carts[userId] });
});
// 歷史訂單
app.get('/orders', authenticate, (req, res) => {
  const userId = req.user.id;
  console.log('獲取訂單的用戶 ID:', userId); // 調試輸出
  console.log('返回的訂單:', orders[userId]); // 調試輸出
  res.json(orders[userId] || []);
});
//更改購物車商品數量
app.patch('/cart/:id', authenticate, (req, res) => {
  const userId = req.user.id; // 從驗證中間件獲取用戶 ID
  const { id } = req.params; // 提取商品 ID
  const { quantity } = req.body; // 從請求主體中提取商品數量

  const cart = carts[userId]; // 獲取該用戶的購物車
  
  if (!cart) {
    return res.status(404).json({ message: '購物車不存在' });
  }
  const item = cart.find((i) => i.id == id); // 查找購物車中對應 ID 的商品
  if (!item) {
    return res.status(404).json({ message: '商品未找到' });
  }

  if (quantity <= 0) {
    carts[userId] = cart.filter((i) => i.id !== id); // 如果數量小於等於 0，從購物車中移除商品
  } else {
    item.quantity = quantity; // 更新商品數量
  }
    res.status(200).json({ message: '購物車已更新', cart: carts[userId] });
});


// 刪除購物車商品
app.delete('/cart/:id', authenticate, (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  const cart = carts[userId];
  if (!cart) {
    return res.status(404).json({ message: '購物車不存在' });
  }
  
  carts[userId] = cart.filter((item) => item.id != id);
  res.status(200).json({ message: '商品已移除', cart: carts[userId] });
});

// 結帳
app.post('/checkout', authenticate, (req, res) => {
  const userId = req.user.id;
  if (!carts[userId] || carts[userId].length === 0) {
    return res.status(400).json({ message: '購物車為空，無法結帳' });
  }
  if (!orders[userId]) {
    orders[userId] = [];
  }

  // 保存訂單數據
  const newOrder = {
    id: new Date().getTime(), // 訂單唯一 ID
    items: carts[userId],
    total: carts[userId].reduce((sum, item) => sum + parseFloat(item.price.replace('$', '')) * item.quantity, 0),
    date: new Date().toISOString(),
    status: '未付款',
  };

  orders[userId].push(newOrder);
  console.log('新訂單:', newOrder); // 調試輸出
  console.log('所有訂單:', orders); // 調試輸出
  carts[userId] = []; // 清空購物車
  res.status(200).json({ message: '結帳成功！', order: newOrder });
});

// 支付模擬
app.post('/pay', authenticate, (req, res) => {
  const userId = req.user.id;
  const { orderId } = req.body;

  // 查找訂單
  const order = orders[userId]?.find((o) => o.id === orderId);
  if (!order) {
    return res.status(404).json({ message: '訂單未找到' });
  }
  
  // 模擬支付
  const transactionId = `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  order.status = '已付款';
  order.paymentDetails = {
    transactionId,
    paidAt: new Date().toISOString(),
  };

  console.log('更新的訂單:', order); // 調試輸出
  res.status(200).json({ message: '支付成功', order });
});

// 願望清單
const wishlists = {}; // 用戶收藏清單

app.post('/wishlist', authenticate, (req, res) => {
  const userId = req.user.id;
  const { id } = req.body;

  if (!wishlists[userId]) {
    wishlists[userId] = [];
  }
  if (!wishlists[userId].includes(id)) {
    wishlists[userId].push(id);
  }
  res.status(200).json({ message: '已添加到收藏清單', wishlist: wishlists[userId] });
});
//獲取願望清單數據
app.get('/wishlist', authenticate, (req, res) => {
  const userId = req.user.id;
  const gamesInWishlist = (wishlists[userId] || []).map((gameId) =>
    games.find((game) => game.id === gameId)
  );
  res.status(200).json(gamesInWishlist);
});
// 刪除願望清單商品
app.delete('/wishlist/:id', authenticate, (req, res) => {
  const userId = req.user.id;
  const gameId = parseInt(req.params.id);
    if (wishlists[userId]) {
    wishlists[userId] = wishlists[userId].filter((id) => id !== gameId);
  }
  res.status(200).json({ message: '已移除收藏', wishlist: wishlists[userId] });
});

//交易紀錄
app.get('/transactions', authenticate, (req, res) => {
  const userId = req.user.id;
  const transactions = (orders[userId] || [])
    .filter((order) => order.paymentDetails)
    .map((order) => ({
      orderId: order.id,
      transactionId: order.paymentDetails.transactionId,
      paidAt: order.paymentDetails.paidAt,
      total: order.total,
    }));
  res.status(200).json(transactions);
});

// 添加新遊戲
app.post('/games', authenticate, isAdmin, (req, res) => {
  console.log('接收到的請求內容:', req.body); // 打印請求內容
  console.log('請求用戶:', req.user); // 打印用戶信息
  const { name, price, description } = req.body;

  if (!name || !price || !description) {
    return res.status(400).json({ message: '請提供完整的遊戲信息' });
  }
  const newGame = {
    id: games.length + 1,
    name,
    price,
    description,
    image: '/window.svg',
  };
  games.push(newGame);
  console.log('新增的遊戲:', newGame); // 打印新增的遊戲
  res.status(201).json({ message: '遊戲已添加', game: newGame });
});

// 刪除遊戲
app.delete('/games/:id', authenticate, isAdmin, (req, res) => {
  const gameId = parseInt(req.params.id);
  const index = games.findIndex((g) => g.id === gameId);
  if (index === -1) {
    return res.status(404).json({ message: '遊戲未找到' });
  }
  games.splice(index, 1);
  res.status(200).json({ message: '遊戲已刪除' });
});

// 啟動服務
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
