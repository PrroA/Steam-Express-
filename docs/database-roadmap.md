# Database Roadmap

這份文件整理目前 demo persistence 如何正式化。目標是讓專案未來能從 SQLite JSON state 過渡到 PostgreSQL / Prisma，同時保留現有前端流程與 API shape。

## 現況

目前後端使用 `better-sqlite3`，把整個 `AppState` 依 key 存進單一 `app_state` table：

- `users`
- `messages`
- `reviews`
- `carts`
- `orders`
- `wishlists`
- `resetTokens`
- `games`

另外 AI 使用紀錄已先獨立到 `ai_usage_events` table，作為正式化前的小步切分。這讓 admin 的 AI 命中率、備用回覆率與平均回覆時間重開 server 後仍可保留，也讓未來搬到 PostgreSQL 時有明確表結構方向。

這個做法適合 demo：

- 本機容易啟動。
- 不需要額外資料庫服務。
- 重新整理或重開 server 後，訂單與商品狀態仍能保留。

但正式環境會遇到限制：

- 無法有效查詢與關聯，例如某使用者最近訂單、某商品銷售量。
- 難做 migration、索引、報表與權限控管。
- 多 instance 部署時，local SQLite / local upload 不適合共用狀態。

## 正式化目標

第一階段建議使用 PostgreSQL + Prisma。原因：

- schema 清楚，適合面試時說明資料模型。
- migration 可追蹤。
- 後續可加 `pgvector` 做 RAG embeddings。
- Vercel / Render / Neon / Supabase 都容易部署。

## 建議資料表

### users

存使用者與基本資料。

欄位方向：

- `id`
- `username`
- `password_hash`
- `role`
- `email`
- `registered_at`
- `default_full_name`
- `default_phone`
- `default_address`
- `default_payment_method`

對應目前：

- `AppState.users`
- `User`

### games

存商品主資料。

欄位方向：

- `id`
- `name`
- `description`
- `base_price`
- `image_url`
- `is_active`
- `created_at`
- `updated_at`

對應目前：

- `AppState.games`
- `Game`

### game_variants

存商品版本、價格與庫存。

欄位方向：

- `id`
- `game_id`
- `name`
- `price`
- `stock`
- `created_at`
- `updated_at`

對應目前：

- `Game.variants`

### carts

購物車 header。

欄位方向：

- `id`
- `user_id`
- `created_at`
- `updated_at`

### cart_items

購物車明細。

欄位方向：

- `id`
- `cart_id`
- `game_id`
- `variant_id`
- `quantity`

對應目前：

- `AppState.carts[userId]`
- `CartItem`

### orders

訂單主資料。

欄位方向：

- `id`
- `user_id`
- `total`
- `status`
- `fulfillment_status`
- `stock_restored`
- `created_at`
- `updated_at`

狀態維持現有穩定值：

- `pending`
- `payment_failed`
- `paid`
- `cancelled`
- `refunded`

出貨狀態：

- `pending_shipment`
- `shipped`
- `delivered`

對應目前：

- `AppState.orders[userId]`
- `Order`

### order_items

訂單商品明細。

欄位方向：

- `id`
- `order_id`
- `game_id`
- `variant_id`
- `name_snapshot`
- `variant_name_snapshot`
- `unit_price_snapshot`
- `quantity`
- `line_total`

重點是保留 snapshot。即使商品之後改名或改價，舊訂單仍能顯示當時購買內容。

### order_status_events

訂單狀態歷程。

欄位方向：

- `id`
- `order_id`
- `status`
- `note`
- `created_at`

對應目前：

- `Order.statusHistory`

### payment_records

付款紀錄。

欄位方向：

- `id`
- `order_id`
- `provider`
- `provider_payment_id`
- `status`
- `paid_at`
- `raw_event`

正式 Stripe webhook 會寫入這張表，再更新 `orders.status`。

### shipping_records

出貨紀錄。

欄位方向：

- `id`
- `order_id`
- `carrier`
- `tracking_number`
- `shipped_at`
- `delivered_at`

對應目前：

- `Order.shippingDetails`

### wishlists

願望清單。

欄位方向：

- `user_id`
- `game_id`
- `created_at`

對應目前：

- `AppState.wishlists[userId]`

### reviews

商品評論。

欄位方向：

- `id`
- `game_id`
- `user_id`
- `content`
- `created_at`

對應目前：

- `AppState.reviews[gameId]`

### ai_usage_events

AI 使用紀錄。

欄位方向：

- `id`
- `request_id`
- `user_id`
- `mode`
- `grounded`
- `provider`
- `source_count`
- `status_code`
- `duration_ms`
- `message_preview`
- `created_at`

對應目前：

- `backend/aiUsageLog.ts`
- SQLite `ai_usage_events`

這張表可以支援 admin dashboard 的資料命中率、備用回覆率與平均回覆時間。

### rag_documents

RAG 文件主表。

欄位方向：

- `id`
- `type`
- `title`
- `content`
- `metadata`
- `updated_at`

文件來源：

- 商品 catalog
- 付款 FAQ
- 退款政策
- 配送說明
- 帳號與願望清單說明

### rag_document_embeddings

第二階段才需要。用於 pgvector。

欄位方向：

- `id`
- `document_id`
- `embedding`
- `model`
- `created_at`

## 建議導入順序

1. 先建立 Prisma schema，但保留現有 route API shape。
2. 先搬 `users`、`games`、`game_variants`。
3. 再搬 `carts`、`orders`、`order_items`、`order_status_events`。
4. 補 Stripe webhook，讓付款狀態由 `payment_records` 驅動。
5. 將目前 SQLite `ai_usage_events` 搬到 PostgreSQL，讓 admin 指標成為正式資料。
6. 建 `rag_documents`，把目前 static knowledge 正式資料化。
7. 最後再導入 `pgvector` 與 embeddings。

## 面試說法

> 目前 SQLite 是 demo persistence，我刻意先讓完整流程跑順。正式化時我會先用 PostgreSQL / Prisma 拆出 users、games、orders、order_items、ai_usage_events 和 rag_documents。這樣既能保留現有 API，又能開始做 migration、查詢、報表、RAG evaluation 和 pgvector。

## 不建議現在就做的事

- 不建議直接重寫所有 routes。
- 不建議一次導入 Prisma、pgvector、Stripe webhook、object storage。
- 不建議先做大型資料搬遷，因為目前展示版重點是穩定 demo flow。

建議採取小步替換：先 schema，再逐步替換 persistence。

正式部署前的整體工程檢查請看 [production-readiness.md](./production-readiness.md)。
