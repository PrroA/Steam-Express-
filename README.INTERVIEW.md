# Interview Notes

這份文件是面試口述用，重點是講清楚專案價值、技術取捨與後續可延伸方向。

如果只需要作品集或履歷亮點，請看 [docs/project-highlights.md](./docs/project-highlights.md)。

## 30 秒介紹

Steam Practice 是一個以遊戲商城為主題的全端 demo。我用 Next.js、React、TypeScript、Express 和 SQLite 做出商品瀏覽、購物車、訂單付款、admin 管理，再加入 AI 商品推薦、商品比較與 RAG 客服問答。

這個專案的重點不是做一個很大的商城，而是展示我能把前端流程、後端 API、付款狀態、資料紀錄與 AI 輔助決策串成一個可以操作、可以測試、可以部署的作品。

## 展示順序

1. 首頁看商品與 AI 助理入口。
2. 商品頁展示 AI 購買前快速判斷。
3. 將商品加入比較，展示 AI 商品比較 / 決策助理。
4. 加入購物車，建立訂單。
5. 訂單中心付款，使用 Stripe test mode 或 Demo 快速付款。
6. 回到訂單中心確認付款狀態。
7. 進入 admin dashboard 查看訂單與 AI 使用狀態。
8. 打開 AI 客服，詢問付款、退款、配送、商品推薦或個人訂單問題。

## 前後端分工

- Frontend 負責商品瀏覽、購物車、checkout、訂單中心、AI 顯示與 admin UI。
- Backend 負責 auth、cart、checkout、orders、admin、AI/RAG API。
- SQLite 用來保留 demo 資料，讓重新整理或重開服務後仍能看到訂單與 AI 使用紀錄。

可以這樣說：

> 我刻意保留完整的使用者流程，而不是只做靜態頁。從商品、購物車、訂單、付款到 admin 都有資料狀態，這樣比較能看出前後端整合能力。

## AI 設計

專案裡的 AI 有三個層次：

- 商品推薦：根據商品資料、使用者偏好與瀏覽 / 收藏 / 加購紀錄產生建議。
- 商品比較：把候選商品整理成差異、適合族群與購買建議。
- RAG 客服：從商城知識庫與商品 catalog 找資料，再回答付款、退款、配送、帳號與訂單問題。

可以這樣說：

> 我沒有讓 AI 直接操作訂單或付款，因為這類行為需要更完整的權限與風險控管。現在 AI 的定位是購物決策與客服導引，能提升使用者體驗，但不破壞核心交易流程。

## RAG 設計

目前 RAG 使用 local hybrid retrieval。資料來源包含：

- 商品 catalog
- 付款說明
- 退款規則
- 配送與帳號說明
- 個人化偏好與互動紀錄

檢索方式包含 exact match、title match、content match、tag match 與 intent scoring。這版沒有導入 vector database，原因是 demo 階段先讓流程清楚、可測試、可本機啟動。

後續正式化方向：

- PostgreSQL 儲存商品、訂單、AI logs。
- pgvector 儲存 FAQ / 商品文件 embeddings。
- 加入 retrieval evaluation，追蹤 hit rate、fallback rate、回答品質。

目前已經有一組基本 retrieval evaluation，會用固定問題檢查付款、退款、配送、願望清單與商品問題是否命中合理來源。之後換成 pgvector 時，可以用同一組案例比較命中率。

## 付款流程

付款支援 Stripe test mode，也保留 Demo 快速付款 fallback。

可以這樣說：

> Stripe key 沒設定時，demo 流程仍能完成；正式環境則應該依賴 Stripe webhook 更新付款狀態，避免只相信前端回傳。

## Admin 與觀測

Admin dashboard 可以查看商品、訂單、銷售與 AI 使用狀態。AI 使用狀態不是為了做炫技，而是讓面試時可以說明：

- 使用者問了什麼。
- 回答是否根據商城資料。
- fallback 發生比例。
- 哪些功能真的被使用。

## 目前限制

- SQLite 只適合 demo，不適合正式多使用者環境。
- local upload 需要替換成 Blob / S3 / Cloudinary。
- Demo 快速付款不是正式付款流程。
- Browser-side AI 受瀏覽器支援限制。
- RAG 還沒接 embeddings / vector database。

## 下一步方向

1. PostgreSQL + Prisma：讓資料模型正式化。
2. pgvector RAG：把 FAQ、商品資料與政策文件做 embedding retrieval。
3. AI evaluation：追蹤 retrieval 命中率、fallback rate、回答品質。
4. Stripe webhook：讓付款狀態由可信事件更新。
5. Admin analytics：把 AI 使用紀錄轉成更清楚的營運指標。
