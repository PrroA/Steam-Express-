# Steam Practice Store

Steam Practice Store 是一個 Steam 風格的遊戲商城全端練習專案，重點展示商品瀏覽、會員登入、購物車、訂單付款、管理後台、Wishlist、Socket.IO 即時聊天，以及 AI/RAG 客服回覆流程。

這個專案比較適合作為作品集或面試展示用。核心流程已可在本機跑起來，資料以 SQLite 保存，金流與 AI 服務可用測試或 fallback 模式。

## 技術棧

- Frontend: Next.js Pages Router, React, TypeScript, Tailwind CSS
- Backend: Express, JWT, Socket.IO
- Data: SQLite via `better-sqlite3`
- Payment: Stripe Payment Intent / webhook, plus demo quick pay
- AI: OpenAI API with Ollama fallback
- Testing: Jest, Playwright

## 專案結構

```text
pages/              Next.js pages 與 serverless API
components/         UI components
hooks/              頁面邏輯 hooks
services/           前端 API service layer
backend/routes/     Express auth/store/order/chat routes
backend/state.ts    demo 初始資料
backend/persistence.ts SQLite app-state persistence
types/              前後端共用型別
utils/              狀態、提醒、journey 等共用工具
__tests__/          Jest unit/integration tests
e2e/                Playwright e2e tests
server.ts           Express app
server.js           compiled server bootstrap
```

## 本機啟動

```bash
npm install
npm run dev
```

預設服務：

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:4000`

`npm run dev` 會先編譯 backend/server TypeScript，再同時啟動 Express 與 Next dev server。

## Demo 帳號與流程

管理者帳號：

```text
username: admin
password: admin
```

一般使用者可以在登入頁點 Demo 登入，或手動註冊新帳號。

建議展示流程：

1. 進首頁瀏覽商品、搜尋、排序。
2. 登入 Demo 使用者。
3. 加入購物車並送出 checkout，建立待付款訂單。
4. 到訂單中心執行 quick pay 或模擬付款失敗。
5. 進管理後台查看 dashboard、商品管理、訂單出貨狀態。
6. 打開客服聊天或 RAG 問答，展示 AI fallback 行為。

## 環境變數

`.env`

```env
PORT=4000
SECRET_KEY=your_secret_key
FRONTEND_BASE_URL=http://localhost:3000

# SQLite, optional
SQLITE_DB_PATH=./data/gogo.sqlite

# Stripe, optional for real payment intent/webhook
STRIPE_SECRET_KEY=pk_test_51Qr9qRRoY6RFAeUcNUZyfm5avjM4YPtAQdKcYnwIKrv02R615cdGXbFdnx45lyY2jjmdS68rHoRbn6hWQmSgCVn100B820Z6iB
STRIPE_WEBHOOK_SECRET=whsec_xxx

# OpenAI, optional
OPENAI_API_KEY=sk-xxx

# Ollama, optional local AI fallback
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:7b-instruct

# SMTP, optional forgot-password email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM="Steam Practice <your_email@gmail.com>"
```

`.env.local`

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

沒有 Stripe、OpenAI、SMTP 時，核心商城流程仍可展示；付款可走 demo quick pay，AI 會走 fallback。

## 常用指令

```bash
npm run build:backend
npm run build:server
npm run build
npm test
npm run test:e2e
```

如果本機 shell 找不到 `npm`，先確認 Node.js / npm 是否在 PATH。

## 部署注意事項

- Frontend 可部署到 Vercel。
- Express backend 可部署到 Render 或其他 Node server。
- `NEXT_PUBLIC_API_BASE_URL` 必須指向實際 backend URL。
- SQLite 適合 demo，不適合正式多實例部署；正式環境建議改成 Postgres 或其他託管資料庫。
- `SECRET_KEY`、Stripe key、SMTP password 不要提交到 Git。

## 後續整理建議

- `README.INTERVIEW.md` 目前保留，後續可整理成面試口述版本。
- 若要正式化部署，建議先拆清楚 Vercel serverless API 與 Express backend 的責任邊界。
- 若要提升安全性，建議補 refresh token、全域 401 handler、rate-limit storage、CSRF/secure cookie 策略。
