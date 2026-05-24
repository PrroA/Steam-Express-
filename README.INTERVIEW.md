# 面試口述整理

## 30 秒介紹

這是一個 Steam 風格的全端商城 demo，使用 Next.js、React、TypeScript 做前端，Express 做後端 API，支援商品、購物車、結帳、訂單、付款 demo、管理後台與 AI 商城客服。AI 部分不是單純聊天，而是先用 local hybrid RAG 找商品、客服政策或訂單資料，再交給 OpenAI / Ollama 生成回答；沒有 AI provider 時也能用 fallback 完成展示。商品決策、商品比較與購物車檢查另外做了 Browser-side AI POC，正式環境不放 OpenAI key 時，也能展示零 API 成本的 AI 購物助理。

## Demo Flow

1. 使用 Demo 快速登入。
2. 用首頁的「AI 助理」入口帶出商品決策、商品比較與 AI 客服三條展示路線。
3. 從首頁選商品，進商品詳情。
4. 點「幫我判斷」，展示本機決策助理如何根據商品、版本與近期偏好給建議。
5. 加入 2 到 3 款商品比較，點「幫我選一款」展示本機比較決策。
6. 加入購物車後點「檢查」，展示結帳前 AI 購物車檢查。
7. Checkout 建立訂單。
8. 到訂單中心付款。
9. 用 Stripe 測試卡或 Demo 快速付款完成流程。
10. 確認訂單狀態變成付款完成。
11. 進管理後台查看訂單與營收。
12. 到 AI 商城客服問商品推薦、付款、退款或個人訂單狀態。
13. 本機打開「顯示 RAG 依據」，展示命中文件與 scoring。

## AI 展示順序

建議照這個順序展示，會比較像完整商城助理，而不是零散聊天功能：

1. `預算 30 美金，想玩 RPG，哪一款適合？`
   - 展示 AI 會解析預算與偏好，並回商品卡。
2. `Elden Ring 跟 The Witcher 3 哪個適合？`
   - 展示命名商品比較與結構化比較表。
3. `幫我檢查購物車適不適合結帳`
   - 展示登入後讀自己的購物車，整理總價與取捨。
4. `這筆訂單接下來怎麼辦？`
   - 展示登入後依訂單狀態給售後下一步。
5. `可以退款嗎？`
   - 展示一般客服/RAG 政策問答，不需要登入也能回答。

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

AI 功能不是全部都交給模型自由回答。商品推薦、商品比較、購物車健檢、訂單售後會先在後端整理候選資料、權限與狀態，再產生自然語言或結構化卡片。這樣展示時可以說清楚資料來源，也能避免 AI 直接操作訂單或看到不該看的資料。

我沒有一開始導入 vector database，因為目前 demo 資料量小，local hybrid retrieval 已經足夠。架構上有保留 `Retriever` 介面，未來可以替換成 embeddings + pgvector / Pinecone，不影響 `/chat/rag` API 與前端 sources 顯示。

零成本 AI 口述版：

> 我有考慮正式展示成本。如果正式環境不想放 OpenAI key，商品頁、比較頁與購物車的決策助理會先檢查瀏覽器是否支援本機 AI，支援時就在使用者裝置上產生建議；不支援時就回到商品資料分析，畫面會清楚顯示目前使用哪一種分析方式。這不是要取代 hosted model，而是讓 demo 在沒有 API 成本時也能保有 AI 互動入口。

畫面上的 AI 來源標籤有統一整理：

- `AI 整理`：使用 hosted model。
- `本機 AI 整理`：使用瀏覽器端 AI。
- `商品資料整理`：使用商品資料與規則 fallback。

## 個人化推薦

AI 推薦會參考登入使用者的：

- 願望清單
- 購物車
- 曾經買過的商品
- 商品價格與庫存

這些資料只在後端用來排序與產生推薦理由。個人訂單摘要不送給 OpenAI / Ollama，避免把個人資料交給外部模型。

## AI 功能邊界

- 商品推薦 / 比較：AI 協助整理選擇，不保證真實市場評分或折扣。
- 購物車健檢：只讀自己的購物車，給結帳前建議，不會替使用者刪商品。
- 訂單售後：只讀自己的最近訂單，說明下一步，不會直接退款或取消訂單。
- 一般客服：付款、退款、配送、帳號問題會走 RAG 文件或 fallback。

## Ollama / OpenAI 差異

OpenAI 是正式部署建議使用的 hosted model。Ollama 是本機學習與 demo fallback，不會自動出現在 Vercel 或 Render。

Provider 順序是：

1. 有 OpenAI key 時使用 OpenAI。
2. OpenAI 不可用時嘗試 Ollama。
3. 都不可用時回固定客服 fallback，確保 demo 不會壞。

Browser-side AI 則是另一條零成本展示路線：模型能力取決於瀏覽器支援度，不需要後端 key，也不會產生 OpenAI 費用。商品頁會顯示「本機 AI 可用」、「可啟用本機 AI」或「目前使用商品資料分析」，各 AI 區塊也會顯示 `AI 整理`、`本機 AI 整理` 或 `商品資料整理`，避免展示時讓人誤以為每台瀏覽器都一定有本機模型。

## 權限與安全邊界

AI 客服只提供導引與摘要，不會直接執行付款、退款、取消訂單或修改資料。

查詢個人訂單狀態時必須登入；未登入只會提示使用者先登入或到訂單中心查看。

## 目前限制

- SQLite / local persistence 只適合 demo。
- local upload 不適合正式多節點部署。
- Demo 快速付款不是正式金流。
- RAG 目前是 local hybrid retrieval，還沒有 embeddings / vector database。
- Browser-side AI 是 POC，正式產品仍要依目標瀏覽器支援度評估。
- AI 還沒有 tool calling，不會直接操作訂單。

## 正式化方向

- 資料庫改 PostgreSQL / MySQL，補 migration。
- 圖片改 Vercel Blob / S3 / Cloudinary。
- Stripe webhook 補齊付款與退款狀態同步。
- RAG retrieval 改 embeddings + vector database。
- 加入 observability：AI request log、retrieval hit rate、fallback rate。
- 補更多 Playwright e2e，固定 demo flow。
