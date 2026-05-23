# Game Commerce Demo

這是一個以 Next.js + Express 建立的遊戲商城 demo。專案包含商品瀏覽、購物車、結帳、訂單中心、Stripe 測試付款、管理後台、願望清單與 AI/chat 入口，目標是可本機展示完整購物流程，而不是正式上線商城。

## 技術棧

- Frontend：Next.js、React、TypeScript、Tailwind CSS
- Backend：Express、TypeScript、JWT、better-sqlite3
- Payment：Stripe test mode + Demo 快速付款
- Test：Jest、Playwright
- Persistence：SQLite、本機 uploads 目錄

## 本機啟動

```bash
npm install
npm run dev
```

預設服務：

- Frontend：http://localhost:3000
- Express API：http://localhost:4000

`npm run dev` 會先編譯 backend/server，再同時啟動 Next.js 與 Express。

## 本機 demo 環境變數

請建立 `.env.local`，不要提交到 Git。

```env
PORT=4000
FRONTEND_BASE_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000

SECRET_KEY=local_demo_secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

OPENAI_API_KEY=sk-xxx
```

Stripe key 用途：

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`：前端載入信用卡輸入元件，使用 `pk_test_...`
- `STRIPE_SECRET_KEY`：後端建立付款資料，使用 `sk_test_...`
- `STRIPE_WEBHOOK_SECRET`：正式接 webhook 時使用，本機 demo 可先不填

如果沒有設定 Stripe，訂單中心會顯示自然提示，並可用 Demo 快速付款完成流程。

## Demo 帳號

- 一般展示：登入頁點「使用 Demo 帳號快速進入」
- 管理後台：`admin / admin`

`admin / admin` 只適合本機展示。正式環境請一定設定自己的 `ADMIN_PASSWORD`。

## 建議 Demo Flow

1. 首頁選一款遊戲。
2. 加入購物車。
3. 前往購物車完成結帳。
4. 到訂單中心選擇待付款訂單。
5. 使用 Stripe 測試卡付款，或使用 Demo 快速付款。
6. 確認訂單狀態變成「付款完成」。
7. 切到管理後台查看訂單。

Stripe 測試卡：

- 卡號：`4242 4242 4242 4242`
- 有效期限：任一未來月份
- CVC：任意三碼

## 測試與建置

```bash
npm run build:backend
npm run build:server
npm test -- --runInBand
npm run build
```

也可以依需求執行：

```bash
npm run test:e2e
```

## 目前限制

- SQLite 是 demo persistence，正式環境建議改 PostgreSQL、MySQL 或 managed database。
- 圖片上傳目前存在 local disk，正式環境建議改 Vercel Blob、S3 或 Cloudinary。
- Demo 快速付款是展示流程用途，不代表真實金流。
- AI/chat 入口依賴外部模型 key，沒有 key 時應以基本 fallback 展示。
- 本專案保留部分 demo seed data，正式上線需要補 migration、監控、rate limit 與更完整的權限控管。

## 面試說明

可參考 [README.INTERVIEW.md](./README.INTERVIEW.md)，裡面整理了可直接口述的專案介紹、系統流程、付款流程與正式化改進方向。
