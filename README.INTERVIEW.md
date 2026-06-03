# 面試口述稿

這份文件是面試時可以直接口述的版本。完整操作腳本可看 [docs/demo-script.md](./docs/demo-script.md)，展示前檢查可看 [docs/pre-demo-checklist.md](./docs/pre-demo-checklist.md)。

## 30 秒介紹

這是一個 Steam 風格的全端商城 demo，前端使用 Next.js、React、TypeScript，後端使用 Express 與 SQLite demo persistence。主流程包含商品瀏覽、購物車、checkout、訂單、付款 demo、願望清單、管理後台，以及 AI 商城客服。

我整理這個專案的重點不是單純堆功能，而是讓它能穩定展示：使用者可以從選商品、加入購物車、建立訂單、付款，到後台查看訂單完整跑完；AI 功能也不是孤立聊天，而是放在商品決策、商品比較、購物車檢查與客服問答裡。

## Demo 流程

1. 使用 Demo 帳號快速登入。
2. 從首頁看商品列表與 AI 助理入口。
3. 進商品詳情，展示 AI 商品摘要與「幫我判斷」。
4. 加入 2 到 3 款商品到比較頁，展示「幫我選一款」。
5. 加入購物車，展示 AI 購物車檢查。
6. Checkout 建立 `pending` 訂單。
7. 到訂單中心使用 Stripe 測試付款或 Demo 快速付款。
8. 確認訂單變成付款完成。
9. 到 admin 後台查看訂單與營收。
10. 到 AI 客服詢問付款、退款、商品推薦或個人訂單狀態。

## AI 亮點

這個專案的 AI 分成三層：

第一層是 AI 客服 / RAG。使用者問商品、付款、退款、配送、帳號或訂單問題時，後端會先從 FAQ、policy、商品 catalog 或登入者自己的訂單資料找依據，再產生回答。前端會顯示回答狀態與 sources，所以不是完全黑盒聊天。

第二層是個人化推薦。推薦會參考願望清單、購物車、買過的商品、價格與庫存，用這些資料排序與產生理由。查詢個人訂單時必須登入，而且不讓 AI 直接修改訂單。

第三層是 Browser-side AI / fallback。正式環境如果不想放 OpenAI key，商品頁、比較頁和購物車仍可透過瀏覽器端 AI 或商品資料 fallback 產生購買建議。畫面會標示 `AI 整理`、`本機 AI 整理` 或 `商品資料整理`，避免誤導使用者。

## 付款流程

Checkout 只建立 `pending` 訂單，不直接視為付款完成。付款可以走 Stripe test mode，也可以使用 Demo 快速付款完成展示。

如果 Stripe key 沒設定，畫面會提供自然的 Demo 快速付款，不會讓使用者看到工程錯誤。正式化時會用 Stripe webhook 作為付款狀態來源，避免只靠前端操作更新訂單。

## 權限與邊界

一般使用者只能看自己的購物車、願望清單與訂單。admin 後台需要管理員角色。

AI 客服只做導引與摘要，不會直接付款、退款、取消訂單或修改資料。個人訂單查詢一定要登入，未登入時只會引導使用者先登入或到訂單中心查看。

## 為什麼目前不用向量資料庫

目前 demo 資料量小，local hybrid retrieval 已經足夠。它會用 exact、title、content、tags、intent scoring 找到相關 FAQ、policy 或商品資料。

架構上有保留 retriever 的替換空間。未來資料量變大時，可以把 retrieval 改成 embeddings + pgvector / Pinecone / Weaviate，前端 API shape 和 sources 顯示不用大改。

## 展示品質整理

我有特別整理使用者畫面文案，不讓一般使用者看到 `API`、`server`、`token`、`PaymentIntent`、`500` 這類工程字眼。

也補了展示前檢查：

- `test:e2e:demo`：核心購物與付款流程。
- `test:e2e:ai`：AI 客服、商品建議、比較建議。
- `test:e2e:copy`：使用者頁面不露出工程字眼。
- `test:encoding`：防止中文亂碼回歸。
- `test:showcase`：面試展示前的一鍵檢查。

## 目前限制

- SQLite / local persistence 只適合 demo。
- 圖片上傳目前偏本機展示，不適合多節點正式部署。
- Demo 快速付款不是正式金流。
- RAG 還沒有接 embeddings / vector database。
- Browser-side AI 是 POC，正式產品仍要看目標瀏覽器支援度。
- AI 還沒有 tool calling，不會直接操作訂單。

## 正式化方向

1. 資料庫改 PostgreSQL / MySQL，補 migration。
2. 圖片改 Vercel Blob / S3 / Cloudinary。
3. Stripe webhook 補齊付款與退款狀態同步。
4. RAG retrieval 改 embeddings + vector database。
5. 補 observability，例如 AI request log、retrieval hit rate、fallback rate。
6. 擴充 Playwright e2e，固定更多展示流程。
