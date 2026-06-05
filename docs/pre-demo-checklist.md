# 展示前檢查清單

這份 checklist 用在 push 前或面試前，確認 demo flow 不會臨場出問題。

## 1. 啟動本機

```bash
npm run dev
```

確認：

- Frontend：http://localhost:3000
- Backend：http://localhost:4000

如果看到 `EADDRINUSE`，代表 4000 port 已被佔用，先關掉舊的 Node process。

## 2. 快速驗收

```bash
npm run test:showcase
```

GitHub Actions 也可以手動執行 `Showcase Check` workflow，適合 push 後或面試前確認遠端環境也能跑完整展示驗收。

這個指令會檢查：

- backend / server TypeScript build
- 中文亂碼檢查
- RAG 基本命中率檢查
- checkout / payment demo flow
- AI demo flow
- AI 展示入口
- admin AI 使用狀態
- 使用者畫面文案不出現工程字眼

## 3. 個別測試

商城付款流程：

```bash
npm run test:e2e:demo
```

AI 展示流程：

```bash
npm run test:e2e:ai
```

後台 AI 使用狀態：

```bash
npm run test:e2e:admin-ai
```

使用者文案檢查：

```bash
npm run test:e2e:copy
```

亂碼檢查：

```bash
npm run test:encoding
```

RAG 命中率檢查：

```bash
npm run test:rag-eval
```

## 4. 手動 Demo Flow

1. 從首頁進入，不應該預設顯示已登入 Demo 帳號。
2. 到登入頁選擇 Demo 帳號，或自行註冊。
3. 商品頁查看 AI 購買前快速判斷。
4. 將商品加入比較，查看 AI 商品比較。
5. 加入購物車，建立訂單。
6. 使用 Stripe 測試卡或 Demo 快速付款。
7. 訂單中心確認付款完成。
8. Admin dashboard 查看訂單與 AI 使用狀態。
9. AI 客服詢問付款、退款、配送、商品推薦與個人訂單問題。

## 5. 畫面檢查

使用者畫面不應出現：

- 亂碼
- `API`
- `server`
- `500`
- `token`
- `PaymentIntent`
- `backend`
- `provider error`

應該用自然文案，例如：

- `付款還沒完成，請再試一次。`
- `目前無法載入信用卡付款，請使用 Demo 快速付款完成流程。`
- `暫時無法取得 AI 回覆，先提供一般客服建議。`

## 6. 面試前口述重點

- 這是一個完整商城 demo，不是只有靜態頁。
- AI 放在購物決策與客服導引，不直接操作付款或退款。
- RAG 目前是 local hybrid retrieval，下一步可升級 pgvector。
- RAG 有固定問題集驗收，避免知識庫或 scoring 改動後退化。
- Stripe 有 test mode 與 demo fallback，正式環境應補 webhook。
- Admin 有 AI 使用狀態，代表 AI 功能有被觀測與測試。
