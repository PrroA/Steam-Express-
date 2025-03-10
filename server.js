require("dotenv").config();
const express = require('express');
const http = require("http"); // HTTP 伺服器
const { Server } = require("socket.io"); 
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { v4: uuidv4 } = require("uuid"); 
console.log("🔑 STRIPE_SECRET_KEY:", process.env.STRIPE_SECRET_KEY);
const cors = require("cors");

app.use(cors({
  origin: ["https://gogo-m2kws419k-proas-projects-960997a7.vercel.app/", "http://localhost:3000"], // 允許本地開發 & Vercel
  credentials: true
}));


app.use(express.json());

console.log("🚀 正在運行 `server.js`...");
app.get('/test', (req, res) => {
  res.send("✅ `server.js` 正在正確運行！");
});

const SECRET_KEY = process.env.SECRET_KEY || 'your_secret_key';
const server = http.createServer(app); // 使用 HTTP 伺服器
const io = new Server(server, {
  cors: { origin: "http://localhost:3000", credentials: true },
});
// 錯誤統一處理
app.use((err, req, res, next) => {
  console.error('Global Error:', err);
  res.status(err.status || 500).json({ message: err.message || '伺服器內部錯誤' });
});
// 跨域處理
app.use(cors({
  origin: ["http://localhost:3000", "https://game-platform-one-rouge.vercel.app"], // 允許本地開發和 Vercel
  credentials: true
}));


// 中間件：用於檢查是否為管理員
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: '您無權限執行此操作' });
  }
  next();
};

// 模擬帳號
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

const messages = []; // 儲存聊天訊息
const reviews = {}; // 儲存評論 
const carts = {}; // 用戶購物車 
const orders = {}; // 用戶訂單 
const wishlists = {}; // 用戶收藏清單
const resetTokens = {}; // 密碼重置
const games = [
  { id: 1, name: 'Cyberpunk 2077', price: '$59.99', description: 'A futuristic RPG.', image: '/vercel.svg' },
  { id: 2, name: 'Elden Ring', price: '$49.99', description: 'An open-world adventure.', image: '/vercel.svg' },
  { id: 3, name: 'Hogwarts Legacy', price: '$39.99', description: 'A magical experience.', image: '/vercel.svg' },
  { id: 4, name: 'The Witcher 3', price: '$29.99', description: 'A legendary RPG.', image: '/vercel.svg' },
  { id: 5, name: 'The Elder Scrolls V: Skyrim', price: '$19.99', description: 'A fantasy RPG.', image: '/vercel.svg' },
  { id: 6, name: 'Dark Souls III', price: '$14.99', description: 'A dark fantasy RPG.', image: '/vercel.svg' },
  { id: 7, name: 'The Last of Us Remastered', price: '$19.99', description: 'A survival horror game.', image: '/vercel.svg' },
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
    { id: user.id, username: user.username, role: user.role },
    SECRET_KEY,
    { expiresIn: '1d' },
  );
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
    cartItem.quantity += 1; // 如果商品已存在，增加數量
  } else {
    carts[userId].push({ ...game, quantity: 1 }); // 新商品，設置數量為 1
  }

  res.status(201).json({ message: 'Added to cart', cart: carts[userId] });
});
// 獲取歷史訂單
app.get('/orders', authenticate, (req, res) => {
  const userId = req.user.id;

  if (!orders[userId]) {
    orders[userId] = []; 
  }
  res.status(200).json(orders[userId]);
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



app.post('/checkout', authenticate, async (req, res) => {
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
      status: '未付款',
    };

    orders[userId].push(newOrder); // 現在 orders[userId] 一定存在
    carts[userId] = []; // 清空購物車

    res.status(200).json({ message: '結帳成功！', order: newOrder });
  } catch (error) {
    console.error('結帳錯誤:', error);
    res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
  }
});


// 支付模擬
app.post('/pay', authenticate, (req, res) => {
  const userId = req.user.id;
  const { orderId } = req.body;

  console.log('訂單 ID:', orderId);
  
  const order = orders[userId]?.find((o) => o.id === orderId);
  if (!order) {
    return res.status(404).json({ message: '訂單未找到' });
  }
  
  if (order.status === '已付款') {
    return res.status(400).json({ message: '訂單已付款，無法重複支付' });
  }

  // 生成交易紀錄
  const transactionId = `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  order.status = '已付款';
  order.paymentDetails = {
    transactionId,
    paidAt: new Date().toISOString(),
  };

  console.log('付款成功:', order);
  res.status(200).json({ message: '支付成功', order });
});




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

  const { name, price, description ,image } = req.body;

  if (!name || !price || !description) {
    return res.status(400).json({ message: '請提供完整的遊戲信息' });
  }
  const newGame = {
    id: games.length + 1,
    name,
    price,
    description,
    image,
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

// 創建付款請求
app.post("/create-payment-intent", async (req, res) => {
  try {
    let { amount } = req.body;
    
    if (!amount || amount < 0.5) {
      return res.status(400).json({ error: "金額不可低於 $0.50 USD" });
    }
    
    amount = Math.round(amount * 100); // Stripe 以「分」為單位

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "usd",
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("付款失敗:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get profile data
app.get('/profile', authenticate, (req, res) => {
  const userId = req.user.id;
  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ message: '用戶未找到' });
  }

  res.json({
    id: user.id,
    username: user.username,
    email: user.email || "未提供",
    registeredAt: user.registeredAt || "未知",
  });
});

// update profile data
app.put('/profile', authenticate, (req, res) => {
  const userId = req.user.id;
  const { username, email } = req.body;

  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ message: '資料更新失敗' });
  }
  user.username = username || user.username;
  user.email = email || user.email;
  res.json({ message: "個人資料更新成功", user });
});

// 取得某遊戲的所有評論
app.get('/reviews/:gameId', (req, res) => {
  const { gameId } = req.params;
  res.json(reviews[gameId] || []);
});

// 提交新評論
app.post('/reviews', authenticate, (req, res) => {
  const { gameId, content } = req.body;
  if (!gameId || !content) {
    return res.status(400).json({ message: '缺少必要資訊' });
  }

  if (!reviews[gameId]) {
    reviews[gameId] = [];
  }

  const newReview = {
    content,
    createdAt: new Date().toISOString(),
  };
  reviews[gameId].push(newReview);
  res.status(201).json(newReview);
});

// 客服聊天室 (dev)
io.on("connection", (socket) => {
  console.log("用戶連線");

  // 發送歷史聊天紀錄
  socket.emit("chatHistory", messages);

  // 監聽新訊息
  socket.on("sendMessage", (message) => {
    const newMessage = {
      user: message.user || "我",
      text: message.text,
      timestamp: new Date().toLocaleTimeString(),
    };

    messages.push(newMessage); // 儲存訊息
    io.emit("receiveMessage", newMessage);
  });
  
  setTimeout(() => {
    const autoReply = {
      user: "客服中心",
      text: "此功能還在開發中 敬請期待",
      timestamp: new Date().toLocaleTimeString(),
    };
    io.emit("receiveMessage", autoReply); // 自動回覆
  }, 1000); 

  // 監聽用戶斷開連線
  socket.on("disconnect", () => {
    console.log("WebSocket斷線");
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`✅ 伺服器運行中: http://localhost:${PORT}`);
});
module.exports = app;