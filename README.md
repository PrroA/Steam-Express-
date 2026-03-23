# Steam Practice Store

Steam 風格全端電商練習專案（Next.js + Express）。

## Features
- 帳號：註冊 / 登入 / 忘記密碼 / 個人資料
- 商店：商品列表、商品詳情、評論、願望清單
- 購物：購物車、結帳、付款、訂單、交易紀錄
- 後台：商品管理、訂單管理、儀表板
- 客服：RAG + AI 對話（OpenAI / Ollama fallback）

## Tech Stack
- Frontend: Next.js, React, Tailwind CSS
- Backend: Express, JWT, Socket.IO
- Data: SQLite (`better-sqlite3`)
- Payment: Stripe
- Testing: Jest, Playwright

## Project Structure
```text
pages/            # Next.js pages
components/       # UI components
hooks/            # page logic hooks
services/         # API service layer
backend/routes/   # auth/store/order/chat routes
backend/persistence.ts  # SQLite persistence
__tests__/        # unit/integration tests
e2e/              # playwright e2e tests
server.ts         # express app
```

## Quick Start
```bash
npm install
npm run dev
```

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:4000`

## Environment Variables
`.env`
```env
PORT=4000
SECRET_KEY=your_secret_key
FRONTEND_BASE_URL=http://localhost:3000

# OpenAI (optional)
OPENAI_API_KEY=sk-xxx

# Ollama (optional, local free model)
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:7b-instruct

# SMTP (forgot-password mail)
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

## Testing
```bash
npm test          # unit + integration
npm run test:e2e  # playwright e2e
```

## AI Chat Mode
- 有 `OPENAI_API_KEY`：優先使用 OpenAI
- 無 OpenAI 或失敗：自動 fallback 到 Ollama

## Forgot Password
- 支援輸入「帳號或 Email」
- 有 SMTP + 帳號有綁 email：會真的寄信
- 否則回傳 reset token / reset URL（開發備援）

## Deploy
- Frontend: Vercel
- Backend: Render
- `NEXT_PUBLIC_API_BASE_URL` 請指向你的後端 API 網址

---
更多面試版說明請看：`README.INTERVIEW.md`
