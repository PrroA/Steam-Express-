# Steam Practice 商城 Demo

這是一個用 Next.js + Express 實作的遊戲商城 demo，重點展示會員登入、商品瀏覽、購物車、訂單付款、管理後台、願望清單與 AI 商城客服。專案以本機展示與面試說明為主要目標，保留 SQLite demo persistence，不追求正式上線架構。

## 技術棧

- Frontend：Next.js、React、TypeScript、Tailwind CSS
- Backend：Express、TypeScript、JWT、better-sqlite3
- Payment：Stripe test mode、Demo 快速付款
- AI 客服：OpenAI、Ollama fallback、關鍵字/CJK bigram retrieval
- Test：Jest、Playwright
- Persistence：SQLite、本機 uploads

## 本機啟動

```bash
npm install
npm run dev
```

啟動後：

- 前端：http://localhost:3000
- Express API：http://localhost:4000

`npm run dev` 會同時啟動 Express 與 Next.js。

## 本機 Demo 環境變數

請建立 `.env.local`，不要把正式 key commit 進 Git。

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
OPENAI_CHAT_MODEL=gpt-4o-mini

OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:7b-instruct
```

## Demo 帳號

- 一般會員：首頁可使用「重新開始 Demo」建立 demo user
- 管理員：`admin / admin`

`admin / admin` 只適合本機 demo。正式環境請改用 `ADMIN_USERNAME`、`ADMIN_PASSWORD`，並避免使用弱密碼。

## Stripe 測試付款

- 測試卡號：`4242 4242 4242 4242`
- 到期日：任意未來日期
- CVC：任意三碼

若 Stripe key 沒設定，畫面會引導使用 Demo 快速付款，讓展示流程仍可完成。

## AI 商城客服

AI 客服入口位於浮動客服按鈕與 `/chat` 頁面。它會優先回答商品、付款、訂單、退款、配送、帳號與願望清單相關問題，並在畫面上顯示回答是否根據商城資料。

AI provider 順序：

1. 有 `OPENAI_API_KEY` 時，正式環境優先使用 OpenAI。
2. OpenAI 不可用時，本機可 fallback 到 Ollama。
3. 兩者都不可用時，仍會回傳固定客服回覆，確保 demo 可展示。

Ollama 是本機學習與 demo fallback，不會自動出現在 Vercel 或 Render 正式環境。若正式部署也想使用 Ollama，需要另外部署可被正式環境連到的模型服務；一般展示建議直接設定 OpenAI key。

本機 Ollama 範例：

```bash
ollama pull qwen2.5:7b-instruct
ollama serve
```

## 固定 Demo Flow

1. 首頁選商品，加入購物車。
2. 前往購物車，確認品項與數量。
3. Checkout 建立訂單。
4. 到訂單中心選擇付款。
5. 使用 Stripe 測試卡或 Demo 快速付款。
6. 訂單狀態變成付款完成。
7. 管理員登入後台查看訂單與商品狀態。
8. 從 AI 客服詢問「怎麼付款」、「可以退款嗎」、「推薦便宜的遊戲」。

## 測試與建置

```bash
npm run build:backend
npm run build:server
npm test -- --runInBand
npm run build
```

視情況可再跑 e2e：

```bash
npm run test:e2e
```

## 面試展示說明

可直接口述的展示講稿放在 [docs/demo-script.md](./docs/demo-script.md)，內容包含專案介紹、demo flow、付款流程、AI/RAG 設計與正式化方向。

## 部署注意事項

- SQLite 只適合 demo persistence，正式環境建議改成 PostgreSQL、MySQL 或 managed database。
- 圖片上傳目前使用 local disk，正式環境建議改成 Vercel Blob、S3 或 Cloudinary。
- Demo 快速付款只適合展示，不代表真實金流完成。
- AI 客服不會直接操作訂單、付款或退款，只提供導引與商品問答。
- `README.INTERVIEW.md` 保留面試講稿與專案說明，後續可再擴充部署架構與正式化 roadmap。
