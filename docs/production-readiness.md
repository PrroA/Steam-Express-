# Production Readiness

這份文件整理 Steam Practice 從展示版走向正式環境前，需要補齊的工程項目。它不是要一次重寫專案，而是把風險、優先順序與導入路線講清楚。

## 目前狀態

目前專案適合面試展示與本機 demo：

- 商品、購物車、checkout、訂單、付款與 admin 流程可操作。
- Stripe test mode 與 Demo 快速付款都能支撐展示流程。
- AI 商品助理、商品比較、RAG 客服與 AI 使用觀測已可展示。
- `test:showcase` 可驗證主要 demo flow。
- GitHub Actions 有 `Showcase Check` 可手動跑展示驗收。

目前還不是正式 production 架構，主要限制是：

- SQLite JSON state 只適合 demo persistence。
- 圖片上傳仍是 local disk。
- Demo 快速付款不是正式付款依據。
- AI provider / Browser-side AI 仍有環境差異。
- 沒有完整 logging、monitoring、rate limiting 與 audit trail。

## 正式上線前必做

### 1. 資料庫正式化

建議導入 PostgreSQL + Prisma。

優先搬：

- `users`
- `games`
- `game_variants`
- `carts`
- `cart_items`
- `orders`
- `order_items`
- `order_status_events`
- `ai_usage_events`
- `rag_documents`

理由：

- 支援 migration。
- 能建立索引與關聯查詢。
- admin analytics、訂單報表與 AI usage 指標才有穩定資料來源。
- 後續可接 pgvector。

細節請看 [database-roadmap.md](./database-roadmap.md)。

### 2. Stripe webhook

正式付款狀態應以 Stripe webhook 為準，不應只依賴前端成功頁或 Demo 快速付款。

需要補：

- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- refund events
- webhook signature verification
- idempotency handling
- payment audit log

正式流程：

```text
建立訂單
  -> 建立 Stripe PaymentIntent
  -> Stripe webhook 回報付款結果
  -> 後端更新 orders / payment_records
  -> 前端只讀取後端訂單狀態
```

### 3. 圖片與檔案儲存

目前 local upload 不適合正式部署。建議改成：

- Vercel Blob
- S3
- Cloudinary

需要考慮：

- 檔案大小限制
- MIME type 驗證
- 上傳權限
- 圖片壓縮與 resize
- 舊圖片清理策略

### 4. Secret 與環境變數管理

正式環境不能使用 demo secret。

必填：

- `SECRET_KEY`
- `ADMIN_PASSWORD`
- `NEXT_PUBLIC_API_BASE_URL`
- `FRONTEND_BASE_URL`

依功能啟用：

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `OPENAI_API_KEY`
- `OPENAI_CHAT_MODEL`

原則：

- 不 commit 真實 `.env.local`。
- Vercel / Render / GitHub Actions 分別設定環境變數。
- admin 密碼不可使用 `admin/admin`。

### 5. Auth 與 admin 安全性

目前 auth 足夠 demo，但正式環境需要補：

- password policy
- refresh token 或 session rotation
- rate limit login / register / reset password
- admin route audit log
- reset token hash storage
- CSRF / CORS policy 檢查
- production cookie strategy，如果未來改成 cookie auth

### 6. Observability

正式環境至少要有：

- request log
- error log
- payment failure log
- AI fallback rate
- RAG hit rate
- slow request tracking
- admin action audit

目前已有 AI usage summary，可作為後續 observability 的起點。

### 7. RAG 正式化

目前 RAG 是 local hybrid retrieval，適合 demo。正式化方向：

- 將 FAQ / policy / catalog 寫入 `rag_documents`
- 切 chunk
- 產生 embeddings
- 存入 pgvector
- 保留 `test:rag-eval`
- 增加 hit rate、MRR、fallback rate 指標

重點是保留現有 `/chat/rag` API shape，讓前端不用重寫。

## 建議導入順序

### Phase 1：穩定資料層

- 建 Prisma schema。
- 搬 `users`、`games`、`game_variants`。
- 保留現有 API response shape。
- 補 seed script。

### Phase 2：交易流程正式化

- 搬 `orders`、`order_items`、`order_status_events`。
- 建 `payment_records`。
- 接 Stripe webhook。
- 移除正式環境的 Demo 快速付款入口。

### Phase 3：AI 與 RAG 資料化

- 搬 `ai_usage_events`。
- 建 `rag_documents`。
- 將目前 static knowledge 變成資料。
- 讓 admin 可以看 RAG hit rate / fallback rate。

### Phase 4：pgvector

- 建 `rag_document_embeddings`。
- 導入 embedding model。
- 保留 local hybrid retriever 作為 fallback。
- 用 `test:rag-eval` 比較前後命中率。

### Phase 5：部署與監控

- 圖片上傳改外部儲存。
- 建 production env checklist。
- 加 rate limit。
- 加 log / monitoring。
- 讓 `Showcase Check` 與一般 CI 分工清楚。

## 面試說法

> 目前這個專案是展示版，所以我優先把完整購物流程、AI/RAG、測試與展示驗收做穩。正式化時我不會一次重寫，而是先把資料層搬到 PostgreSQL / Prisma，再補 Stripe webhook、外部圖片儲存、AI usage persistence，最後才把 RAG 升級到 pgvector。這樣可以保留現有前端與 API，同時逐步降低 production 風險。

## 不急著做的事

- 不急著把所有 route 重寫成新架構。
- 不急著把所有 AI 功能改成 agent。
- 不急著導入多個雲端服務。
- 不急著把 demo fallback 全部拿掉。

先讓交易、資料與觀測穩定，再擴 AI 能力。
