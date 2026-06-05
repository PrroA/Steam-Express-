# Steam Practice 商城 Demo

Steam Practice 是一個以 Steam 商城體驗為主題的全端 demo 專案。它包含商品瀏覽、願望清單、購物車、checkout、訂單付款、admin 管理，以及 AI 商品助理 / RAG 客服問答。

這個專案的定位不是正式上線商城，而是能在面試或作品集展示中，清楚說明「前端互動、後端 API、付款流程、資料持久化、AI 輔助購物」如何串在一起。

## 技術棧

- Frontend：Next.js Pages Router、React、TypeScript、Tailwind CSS
- Backend：Express、TypeScript、JWT、Socket.IO
- Persistence：SQLite demo persistence
- Payment：Stripe test mode、Demo 快速付款 fallback
- AI：OpenAI、Ollama fallback、Browser-side AI POC、local hybrid RAG
- Test：Jest、Playwright
- Deploy：Vercel frontend、Render / Node backend

## 本機啟動

```bash
npm install
npm run dev
```

啟動後：

- Frontend：http://localhost:3000
- Express API：http://localhost:4000

`npm run dev` 會先編譯 backend / server，再同時啟動 Express 與 Next.js。若遇到 `EADDRINUSE: address already in use :::4000`，代表 4000 port 已被舊的 Node process 佔用，可以先找出 PID 後關閉。

```powershell
netstat -ano | Select-String ':4000'
Stop-Process -Id <PID> -Force
```

## 環境變數

本機請複製範例檔，不要把真實 key commit 到 Git。

```powershell
Copy-Item .env.example .env.local
```

常用設定：

```env
PORT=4000
FRONTEND_BASE_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000

SECRET_KEY=local_demo_secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

OPENAI_API_KEY=
OPENAI_CHAT_MODEL=gpt-4o-mini

OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:7b-instruct

ENABLE_RAG_DEBUG=true
```

### 本機 Demo 設定

- `admin / admin` 只適合本機 demo，正式環境請改成安全密碼。
- 沒有 Stripe key 時，畫面仍可用 Demo 快速付款完成流程。
- 沒有 OpenAI / Ollama 時，AI 客服會使用固定客服 fallback，展示流程不會中斷。
- Ollama 是本機 fallback，不會自動出現在 Vercel / Render 正式環境。

### 正式部署注意事項

- Frontend 需要設定 `NEXT_PUBLIC_API_BASE_URL` 指向後端服務。
- Backend 需要設定 `FRONTEND_BASE_URL`、`SECRET_KEY`、`ADMIN_PASSWORD`。
- Stripe 正式化需要補 webhook 驗證，不能只靠前端回傳付款狀態。
- SQLite 與 local upload 只適合 demo，正式環境建議改 PostgreSQL / MySQL 與 Vercel Blob、S3 或 Cloudinary。
- AI 正式環境建議使用 hosted model，例如 OpenAI 或其他雲端模型服務。

## Demo 帳號

- 一般使用者：請從登入頁選擇 Demo 帳號，或自行註冊。
- 管理者：admin / admin，本機 demo 專用。

## 建議展示流程

1. 從首頁進入，展示商品列表與 AI 助理入口。
2. 開啟商品頁，查看 AI 購買前快速判斷。
3. 將 2 到 3 個商品加入比較，展示 AI 商品比較 / 決策建議。
4. 加入購物車並前往 checkout。
5. 建立訂單後進入訂單中心付款。
6. 使用 Stripe 測試卡或 Demo 快速付款完成流程。
7. 回到訂單中心確認狀態變成付款完成。
8. 進入 admin dashboard 查看訂單與 AI 使用狀態。
9. 開啟 AI 商城客服，詢問付款、退款、配送、商品推薦或個人訂單問題。

Stripe 測試卡：

- 卡號：`4242 4242 4242 4242`
- 到期日：任意未來日期
- CVC：任意 3 位數

## AI / RAG 設計

目前 AI 分成三層：

1. 商品決策：根據商品價格、類型、庫存、使用者偏好與互動紀錄產生購買建議。
2. 商品比較：將多個候選商品整理成優缺點、適合族群與建議選項。
3. AI 客服 / RAG：從商品資料、付款說明、退款規則、配送與帳號資訊中檢索，再產生回答。

RAG 目前使用 local hybrid retrieval，先不導入向量資料庫。這讓專案比較容易本機啟動，也方便面試時解釋 retrieval 流程：

```text
使用者問題
  -> catalog / FAQ / policy documents
  -> exact match / title match / content match / tags / intent scoring
  -> 選出 context
  -> OpenAI / Ollama / fallback 產生回答
  -> 回傳 grounded、sources、reply
```

後續正式化可以把 retriever 替換成 embeddings + pgvector，但保留目前 `/chat/rag` 的 API shape。

## 測試

常用驗證：

```bash
npm run build:backend
npm run build:server
npm test -- --runInBand
npm run build
```

展示前快速驗收：

```bash
npm run test:showcase
```

個別 E2E：

```bash
npm run test:e2e:demo
npm run test:e2e:ai
npm run test:e2e:admin-ai
npm run test:e2e:copy
```

RAG retrieval 評估：

```bash
npm run test:rag-eval
```

展示前 checklist 請看 [docs/pre-demo-checklist.md](./docs/pre-demo-checklist.md)。

## 已知限制

- SQLite 是 demo persistence，不是正式資料庫設計。
- 圖片上傳目前走 local disk，正式環境需要外部 object storage。
- Demo 快速付款只為了展示流程，正式付款應以 Stripe webhook 為準。
- Browser-side AI 是 POC，依瀏覽器支援度而定，正式環境仍建議使用 hosted model。
- RAG 目前尚未使用 embeddings / vector database。

## 面試輔助文件

- [README.INTERVIEW.md](./README.INTERVIEW.md)
- [docs/project-highlights.md](./docs/project-highlights.md)
- [docs/demo-script.md](./docs/demo-script.md)
- [docs/pre-demo-checklist.md](./docs/pre-demo-checklist.md)
- [docs/rag-evaluation.md](./docs/rag-evaluation.md)
