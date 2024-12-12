const express = require('express'); 
const cors = require('cors'); // 跨域用
const jwt = require('jsonwebtoken'); 
const bcrypt = require('bcrypt'); // 加密用
const crypto = require('crypto'); // 忘記密碼生成一次性驗證碼 or 臨時的密碼

const app = express();
const PORT = 4000;
//錯誤統一處理
app.use((err, req, res, next) => {
  console.error('Global Error:', err);
  res.status(err.status || 500).json({ message: err.message || '伺服器內部錯誤' });
});

app.use(cors({
  origin: ['http://localhost:3000'], // 只用在本地端
  credentials: true,
}));

app.use(express.json());

const SECRET_KEY = process.env.SECRET_KEY || 'your_secret_key';

// 模擬數據
// 初始化模擬數據
const users = [
  {
    id: 1,
    username: 'admin',
    password: bcrypt.hashSync('admin', 10), // 加密預設密碼
  },
];
const carts = {}; // 用戶購物車 { userId: [cartItems] }
const orders = {}; // 用戶訂單，結構：{ userId: [orderItems] }
const resetTokens = {}; // 存放重設密碼的 token：{ token: { username, expires } }

const games = [
  { id: 1, name: 'Cyberpunk 2077', price: '$59.99', description: 'A futuristic RPG.', image: '/vercel.svg' },
  { id: 2, name: 'Elden Ring', price: '$49.99', description: 'An open-world adventure.', image: '/vercel.svg' },
  { id: 3, name: 'Hogwarts Legacy', price: '$39.99', description: 'A magical experience.', image: '/vercel.svg' },
  { id: 4, name: 'The Witcher 3', price: '$29.99', description: 'A legendary RPG.', image: '/vercel.svg' },
  { id: 5, name: 'The Elder Scrolls V: Skyrim', price: '$19.99', description: 'A fantasy RPG.', image: '/vercel.svg' },
  { id: 6, name: 'Dark Souls III', price: '$14.99', description: 'A dark fantasy RPG.', image: '/vercel.svg' }
];


// 用戶註冊
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: '請輸入帳號和密碼' });
  }

  const existingUser = users.find((u) => u.username === username);
  if (existingUser) {
    // 檢查密碼是否為未加密格式
    const isPasswordEncrypted = await bcrypt.compare(password, existingUser.password);
    if (!isPasswordEncrypted) {
      existingUser.password = await bcrypt.hash(password, 10); // 加密更新
      return res.status(200).json({ message: '用戶密碼已更新為加密格式' });
    }
    return res.status(400).json({ message: '帳號已存在' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10); // 加密密碼
    const newUser = { id: users.length + 1, username, password: hashedPassword };
    users.push(newUser);
    console.log('新用戶註冊成功:', newUser);
    res.status(201).json({ message: '註冊成功！', user: { id: newUser.id, username: newUser.username } });
  } catch (error) {
    console.error('密碼加密失敗:', error.message);
    res.status(500).json({ message: '註冊過程中出現錯誤' });
  }
});


// 用戶登入
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const user = users.find((u) => u.username === username);
  if (!user) {
    return res.status(401).json({ message: '無效的帳號或密碼' });
  }

  try {
    // 比對密碼
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: '無效的帳號或密碼' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    console.error('登入過程中出現錯誤:', error.message);
    res.status(500).json({ message: '登入過程中出現錯誤' });
  }
});

// 忘記密碼：生成 token
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

  console.log('重設密碼 token:', resetToken);
  res.json({ message: '重設密碼的連結已發送到您的郵箱', resetToken }); // 模擬返回 token
});

// 重設密碼：驗證 token 並更新密碼
app.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  const resetTokenData = resetTokens[token];

  if (!resetTokenData) {
    return res.status(400).json({ message: '無效的 Token' });
  }

  if (Date.now() > resetTokenData.expires) {
    delete resetTokens[token];
    return res.status(400).json({ message: 'Token 已過期，請重新請求重設密碼' });
  }

  const user = users.find((u) => u.username === resetTokenData.username);
  if (!user) {
    return res.status(404).json({ message: '用戶不存在' });
  }

  try {
    user.password = await bcrypt.hash(newPassword, 10);
    delete resetTokens[token]; // 使用後刪除 token
    res.json({ message: '密碼更新成功！' });
  } catch (error) {
    console.error('密碼更新失敗:', error.message);
    res.status(500).json({ message: '密碼更新過程中發生錯誤' });
  }
});


// 模擬驗證用戶
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // 獲取 Token
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY); // 驗證 Token 是否有效
    console.log('Token 驗證成功:', decoded); // 調試輸出
    req.user = decoded; // 將解碼後的用戶信息附加到請求中
    next(); // 繼續執行
  } catch (error) {
    console.error('Token 驗證失敗:', error.message); // 調試輸出
    res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// 獲取首頁遊戲列表 API
app.get('/games', (req, res) => {
  console.log('GET /games');
  res.json(games);
});
// GameDetail API(遊戲詳情)
app.get('/games/:id', (req, res) => {
  const gameId = parseInt(req.params.id);
  const game = games.find((g) => g.id === gameId);
  if (!game) {
    return res.status(404).json({ message: 'Game not found' });
  }
  res.json(game);
});
// 獲取歷史訂單
app.get('/orders' , authenticate, (req, res) => {
  const userId = req.user.id;
  res.json(orders[userId] || []);
})

// 購物車
app.post('/cart', authenticate, (req, res) => {
  console.log('POST /cart for user:', req.user.id, req.body); // 調試
  const userId = req.user.id;
  const { id } = req.body;

  const game = games.find((g) => g.id === id);
  if (!game) {
    console.log('遊戲未找到');
    return res.status(404).json({ message: 'Game not found' });
  }

  if (!carts[userId]) {
    carts[userId] = [];
    console.log(carts[userId]);
  }

  const cartItem = carts[userId].find((item) => item.id === id);
  if (cartItem) {
    cartItem.quantity += 1;
    console.log('增加商品數量:', cartItem);
  } else {
    carts[userId].push({ ...game, quantity: 1 });
    console.log('新增商品到購物車:', game);
  }

  res.status(201).json({ message: 'Added to cart', cart: carts[userId] });
});


//移除購物車 API
app.delete('/cart/:id', authenticate, (req, res) => {
  const userId = req.user.id; // 用戶 ID
  const { id } = req.params; // 遊戲 ID
  if (!carts[userId]) {
    return res.status(404).json({ message: 'Cart not found' });
  }
  const cart = carts[userId];
  const index = cart.findIndex((item) => item.id == id);
  if (index > -1) {
    cart.splice(index, 1); // 移除商品
    return res.status(200).json({ message: 'Item removed', cart });
  }
  res.status(404).json({ message: 'Item not found' });
});

// 獲取購物車 API
app.get('/cart', authenticate, (req, res) => {
  console.log('GET /cart for user:', req.user.id); // 調試
  const userId = req.user.id;
  res.json(carts[userId] || []);
});

// 結帳 API
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
  };
  orders[userId].push(newOrder);
  carts[userId] = []; // 清空購物車

  res.status(200).json({ message: '結帳成功！感謝您的購買！', order: newOrder });
});


// 啟動服務
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
