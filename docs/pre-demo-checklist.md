# Pre-demo Checklist

這份 checklist 用在展示、push 或錄製 demo 前，先確認核心流程與 AI 功能沒有退化。

## 1. 啟動服務

```bash
npm run dev
```

確認：

- Frontend: http://localhost:3000
- Backend: http://localhost:4000

如果遇到 `EADDRINUSE`，通常是 4000 port 已被舊的 Node process 佔用，先停止舊 process 再重啟。

## 2. 一鍵展示檢查

```bash
npm run test:showcase
```

GitHub Actions 也會跑 `Showcase Check` workflow，push 前建議先在本機跑一次。

這組檢查會涵蓋：

- backend / server TypeScript build
- 使用者可見文字亂碼檢查
- RAG evaluation
- checkout / payment demo flow
- AI demo flow
- AI showcase navigation
- admin AI usage
- 使用者介面 copy E2E

## 3. 分段驗證指令

checkout / payment demo flow：

```bash
npm run test:e2e:demo
```

AI demo flow：

```bash
npm run test:e2e:ai
```

Admin AI usage：

```bash
npm run test:e2e:admin-ai
```

使用者可見文字檢查：

```bash
npm run test:e2e:copy
```

亂碼檢查：

```bash
npm run test:encoding
```

RAG evaluation：

```bash
npm run test:rag-eval
```

## 4. 建議 Demo Flow

1. 首頁介紹：展示遊戲列表、搜尋、推薦與 demo fallback。
2. 選一款遊戲進入 detail page，說明價格、願望清單與購買入口。
3. 打開 ChatPage，展示 AI 推薦與 RAG 問答。
4. 用 AI prompt 取得推薦，接到比較頁或購物車。
5. 加入購物車，進入 checkout demo flow。
6. 展示 Stripe test mode 或 demo fallback 的付款邊界。
7. 回到訂單頁，確認訂單狀態與付款資訊。
8. 進入 Admin dashboard，展示 AI usage、商品管理、訂單管理。
9. 補充 AI 架構亮點：RAG、AI 使用紀錄、evaluation、交易安全邊界。

## 5. Demo 前高風險檢查

Admin / console / terminal 不應出現明顯錯誤，例如：

- 亂碼
- `API`
- `server`
- `500`
- `token`
- `PaymentIntent`
- `backend`
- `provider error`

可以準備的口述 fallback：

- `目前 demo 使用本機資料與測試金流，重點是完整購物流程與 AI 功能串接。`
- `如果外部 AI provider 暫時不可用，系統會走 demo fallback，避免展示流程中斷。`
- `付款流程保留使用者確認，AI 不會自動建立訂單或付款。`

## 6. 面試與展示亮點

- 這不是單一頁面 demo，而是完整購物流程：瀏覽、搜尋、推薦、購物車、checkout、訂單、admin。
- AI 不是只接聊天 UI，而是接進商品資料、購物流程、RAG、使用紀錄與 demo fallback。
- RAG 目前是 local hybrid retrieval，後續可以升級到 PostgreSQL + pgvector。
- RAG 有固定問題集驗收，避免知識庫或 scoring 改動後退化。
- Stripe 有 test mode 與 demo fallback，正式環境應補 webhook。
- Admin 有 AI 使用狀態，代表 AI 功能有被觀測與測試。

## 7. AI Shopping Agent 手動檢查

展示前可以在 ChatPage 手動輸入：

```text
assistant recommend an RPG under $30 and add to compare
assistant recommend an RPG under $30 and add to cart
assistant recommend an RPG under $30 and checkout
```

需要確認：

- ChatPage 會顯示 Agent 任務卡。
- 任務卡至少包含理解需求、篩選商品、主推薦等步驟。
- `add to compare` 會提供 `/compare?ids=` 連結。
- 登入後 `add to cart` 會加入購物車並導向 `/cart`。
- `checkout` 只會準備購物車與導向 `/cart`，不會自動建立訂單或付款。
- Admin dashboard 的 AI 使用狀態會顯示 Agent 執行次數與 Agent 步驟數。

口述重點：

> 這個 Agent 可以協助購物流程，但我刻意保留交易安全邊界。AI 可以準備比較、願望清單與購物車，真正的下單與付款仍由使用者確認。
