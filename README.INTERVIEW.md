# 面試口述整理

## 30 秒介紹

這是一個 Steam 風格的全端商城 demo，使用 Next.js、React、TypeScript 做前端，Express 做後端 API，支援商品、購物車、結帳、訂單、付款 demo、管理後台與 AI 商城客服。AI 部分不是單純聊天，而是先用 local hybrid RAG 找商品、客服政策或訂單資料，再交給 OpenAI / Ollama 生成回答；沒有 AI provider 時也能用 fallback 完成展示。

## Demo Flow

1. 使用 Demo 快速登入。
2. 從首頁選商品，進商品詳情。
3. 加入購物車並 checkout。
4. 到訂單中心付款。
5. 用 Stripe 測試卡或 Demo 快速付款完成流程。
6. 確認訂單狀態變成付款完成。
7. 進管理後台查看訂單與營收。
8. 到 AI 商城客服問商品推薦、付款、退款或個人訂單狀態。
9. 本機打開「顯示 RAG 依據」，展示命中文件與 scoring。

## 前後端分工

前端負責商城使用流程、狀態提示、購物車與訂單畫面。一般使用者畫面盡量不出現 API、server、500 這類工程字眼。

後端負責 auth、商品、購物車、訂單、付款、管理後台與 AI chat route。JWT 驗證用在購物車、訂單、願望清單與 admin 權限。

## 付款流程

Checkout 只負責建立 `pending` 訂單。付款可以走 Stripe test mode，也可以走 Demo 快速付款。

如果 Stripe key 沒設定，使用者仍然可以用 Demo 快速付款完成展示。正式化時會補 Stripe webhook，讓付款狀態以金流事件為準，而不是只靠前端操作。

## AI / RAG 設計

目前是 local hybrid RAG：

- FAQ / policy 是靜態知識文件。
- 商品 catalog 會從現有商品資料建立 document。
- retrieval 使用 exact、title、content、tags、intent scoring。
- 回答會帶 sources，前端會顯示來源。
- 本機 debug 模式可以看到每個 source 的分數來源。

我沒有一開始導入 vector database，因為目前 demo 資料量小，local hybrid retrieval 已經足夠。架構上有保留 `Retriever` 介面，未來可以替換成 embeddings + pgvector / Pinecone，不影響 `/chat/rag` API 與前端 sources 顯示。

## 個人化推薦

AI 推薦會參考登入使用者的：

- 願望清單
- 購物車
- 曾經買過的商品
- 商品價格與庫存

這些資料只在後端用來排序與產生推薦理由。個人訂單摘要不送給 OpenAI / Ollama，避免把個人資料交給外部模型。

## Ollama / OpenAI 差異

OpenAI 是正式部署建議使用的 hosted model。Ollama 是本機學習與 demo fallback，不會自動出現在 Vercel 或 Render。

Provider 順序是：

1. 有 OpenAI key 時使用 OpenAI。
2. OpenAI 不可用時嘗試 Ollama。
3. 都不可用時回固定客服 fallback，確保 demo 不會壞。

## 權限與安全邊界

AI 客服只提供導引與摘要，不會直接執行付款、退款、取消訂單或修改資料。

查詢個人訂單狀態時必須登入；未登入只會提示使用者先登入或到訂單中心查看。

## 目前限制

- SQLite / local persistence 只適合 demo。
- local upload 不適合正式多節點部署。
- Demo 快速付款不是正式金流。
- RAG 目前是 local hybrid retrieval，還沒有 embeddings / vector database。
- AI 還沒有 tool calling，不會直接操作訂單。

## 正式化方向

- 資料庫改 PostgreSQL / MySQL，補 migration。
- 圖片改 Vercel Blob / S3 / Cloudinary。
- Stripe webhook 補齊付款與退款狀態同步。
- RAG retrieval 改 embeddings + vector database。
- 加入 observability：AI request log、retrieval hit rate、fallback rate。
- 補更多 Playwright e2e，固定 demo flow。
