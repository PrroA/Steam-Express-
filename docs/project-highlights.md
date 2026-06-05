# Project Highlights

這份是作品集、履歷或面試簡報用的精簡版。目標是讓面試官快速看懂這個專案的技術重點，而不是重新讀完整 README。

## 一句話

Steam Practice 是一個可操作的遊戲商城 demo，整合 Next.js、React、Express、SQLite、Stripe test flow，以及 AI 商品決策 / RAG 客服 / AI 使用觀測。

## 亮點摘要

1. 完整商城流程
   從商品瀏覽、願望清單、購物車、checkout、訂單付款到 admin dashboard 都能實際操作，不只是靜態切版。

2. AI 放在合理業務場景
   AI 主要協助商品推薦、商品比較、購買前判斷與客服問答，不直接執行付款、退款或取消訂單，避免把高風險交易交給模型。

3. RAG 客服有來源概念
   ChatPage 會根據商品 catalog、付款、退款、配送、帳號與願望清單等商城資料回答，並顯示回答是否根據商城資料。

4. 有基本 RAG evaluation
   專案不是只做聊天畫面，而是用固定問題集檢查付款、退款、配送、帳號、願望清單與商品查詢是否命中合理資料來源。

5. AI 使用狀態可觀測
   Admin dashboard 會顯示 AI 回覆次數、資料命中率、備用回覆率與平均回覆時間，方便判斷 AI 功能是否真的被使用、是否常 fallback。

6. 付款流程可展示且可正式化
   本機可以用 Stripe test mode 或 Demo 快速付款完成流程；正式環境的改進方向是用 Stripe webhook 作為付款狀態來源。

7. 展示流程有自動化驗收
   `test:showcase` 會跑 TypeScript、亂碼檢查、RAG evaluation，以及 Playwright E2E，涵蓋 checkout、AI demo、admin AI usage 與使用者文案檢查。

## 面試可口述版本

> 這個專案我不是只做商城 UI，而是把完整購物流程、訂單狀態、付款 fallback、AI 商品助理、RAG 客服和 admin 觀測串起來。AI 的部分我刻意放在購物決策與客服導引，不讓它直接操作交易。除此之外，我也補了 RAG evaluation 和 AI 使用指標，讓 AI 功能不是只停留在 demo 畫面，而是有基本驗收與觀測。

## 技術取捨

- SQLite 適合本機 demo，正式環境會換 PostgreSQL / Prisma。
- Local hybrid RAG 容易展示與測試，正式化可升級 pgvector。
- Demo 快速付款確保展示穩定，正式付款應以 Stripe webhook 更新狀態。
- Browser-side AI 是零成本 POC，正式品質仍建議接 hosted model。

## 下一階段可以做

1. PostgreSQL + Prisma schema，讓資料模型正式化。
2. pgvector RAG，把商品、FAQ、政策文件轉成 embeddings。
3. AI evaluation dashboard，追蹤 hit rate、fallback rate、常見問題。
4. Stripe webhook，讓付款狀態由可信事件更新。
5. 上傳圖片改成 Vercel Blob / S3 / Cloudinary。

更完整的資料庫正式化規劃請看 [database-roadmap.md](./database-roadmap.md)。

正式部署前的工程檢查請看 [production-readiness.md](./production-readiness.md)。
