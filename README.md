🎮 遊戲商城 (Game Store)

這是一個使用 Next.js + Express + Stripe 構建的遊戲商城，支援 用戶註冊、登入、購物車、結帳、支付、願望清單、訂單管理 等功能。

🚀 功能特點

✅ 用戶管理 (註冊 / 登入 / JWT 驗證)✅ 遊戲瀏覽與篩選 (價格排序 / 搜索)✅ 購物車 (添加 / 移除 / 結帳)✅ Stripe 付款 (模擬支付)✅ 訂單管理 (歷史訂單 / 付款)✅ 願望清單 (收藏 / 移除)✅ 管理員後台 (遊戲管理)

📌 環境設置

1️⃣ 安裝專案依賴

確保已安裝 Node.js 18+，然後執行：

npm install

或

yarn install

2️⃣ 建立 .env 環境變數文件

請在 server 目錄下建立 .env 文件，並填入以下內容：

PORT=4000
SECRET_KEY=your_secret_key
STRIPE_SECRET_KEY=sk_test_51Qr9qRRoY6RFAeUcIHJ28TsN0NPdPjYUeisowE8yxfWcR01Rjr3ByWQzmkSxqTksOX1THRgVpH5rIaclSwGq3Jax007oxuhrIc
JWT_SECRET=your_jwt_secret

🔹 STRIPE_SECRET_KEY 需從 Stripe Dashboard 獲取。

3️⃣ 啟動後端 Express 伺服器

cd server
node server.js 

或使用 nodemon 自動監測變更：

nodemon server.js

4️⃣ 啟動前端 Next.js 應用程式

npm run dev

或

yarn dev

🏗️ 目錄結構

📦 game-store
├── 📂 server             # Express 後端 API
│   ├── server.js        # 主要後端邏輯
│   ├── routes           # API 路由 (用戶、購物車、支付等)
│   ├── .env             # 環境變數
│   ├── models           # 數據結構 (用戶、訂單等)
│   ├── middleware       # JWT 驗證
│
├── 📂 frontend          # Next.js 前端
│   ├── pages            # Next.js 頁面 (首頁、購物車、結帳等)
│   ├── components       # UI 元件 (Header、GameCard、Footer 等)
│   ├── context          # 全域狀態管理 (購物車)
│   ├── public           # 靜態資源 (圖片)
│   ├── styles          # TailwindCSS
│   ├── next.config.js   # Next.js 配置 (允許外部圖片)
│   ├── package.json    # 依賴管理
│
├── .gitignore          # 忽略 Git 提交的文件
├── README.md           # 專案說明文件


💳 Stripe 付款測試

🔹 測試信用卡號 (付款成功)：

卡號: 4242 4242 4242 4242
有效期限: 12/34
CVC: 123
ZIP: 12345 

🔹 測試信用卡號 (付款失敗)：

卡號: 4000 0000 0000 0002

🎨 UI 設計與技術選擇

✅ Next.js (React + SSR)
✅ Express.js (RESTful API)
✅ Stripe (支付模擬)
✅ TailwindCSS (前端 UI)
✅ React Context API (購物車管理)
✅ JWT + bcrypt (用戶認證)

Test 新增遊戲URL :
https://upload.wikimedia.org/wikipedia/en/9/9f/Cyberpunk_2077_box_art.jpg

🎯 未來計畫
MongoDB (未來可擴充)
UI 改善 (未來可擴充)
未來功能更佳完善 (未來可擴充)



📌 歡迎貢獻！有任何問題可以提交 Issue 或 Pull Request！ 🚀