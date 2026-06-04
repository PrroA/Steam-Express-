# Interview Notes

這份文件是面試快速講解版；完整展示流程請看 [docs/demo-script.md](./docs/demo-script.md)，展示前檢查請看 [docs/pre-demo-checklist.md](./docs/pre-demo-checklist.md)。

## 30 秒介紹

Steam Practice 是一個遊戲商城 demo，使用 Next.js、React、TypeScript、Express 和 SQLite demo persistence。專案包含商品瀏覽、購物車、結帳、訂單、付款、admin 管理，以及 AI 商城客服。

我目前把 AI 主線收斂成「可解釋的行為推薦系統」：使用者看過、加入願望清單、加入購物車、建立訂單的行為會整理成 profile，首頁與 ChatPage 都會用這份 profile 做商品推薦。

## 展示重點

1. 首頁商品列表與篩選。
2. 商品詳情頁的 AI 商品摘要。
3. 願望清單、購物車與 checkout。
4. 訂單中心付款與狀態更新。
5. AI 客服回答商品推薦、付款、退款、訂單問題。
6. 首頁與 ChatPage 都能根據使用者行為做個人化推薦。

## AI 技術說法

這個專案的 AI 不是單純接一個聊天 API，而是分成三層：

- 行為資料：記錄使用者瀏覽、願望清單、購物車、結帳與付款事件。
- Preference profile：把行為整理成最近關注商品、價格區間、關鍵字、購物意圖。
- AI 回覆與推薦：首頁推薦和 ChatPage 都使用同一份 profile，並回傳可解釋理由。

可以口述：

> 我希望 AI 推薦不是黑盒，所以先整理使用者行為，再讓推薦結果附上理由，例如「你曾放進購物車」、「你最近看過這款」、「價格接近你最近關注的區間」。這比單純讓模型自由生成更穩定，也比較適合商城。

## RAG 說法

目前 RAG 使用 local hybrid retrieval，來源包含商品 catalog、付款退款配送等政策資料，以及使用者訂單資料。資料量還不大，所以先不用 vector database，而是把 grounded answer 和 sources 做清楚。

正式化方向：

- Postgres 儲存商品、訂單與行為事件。
- pgvector 儲存商品與 FAQ embeddings。
- 記錄 retrieval hit rate、fallback rate、AI request log。
- 對推薦結果做 evaluation，避免模型亂編。

## 付款說法

付款支援 Stripe test mode，也保留快速付款作為本機 demo fallback。這樣展示時不會因第三方服務或環境變數失效而中斷流程。

正式環境會以 Stripe webhook 作為付款狀態來源，快速付款只保留在本機展示。

## 目前限制

- SQLite / local persistence 適合 demo，不適合正式多人環境。
- 行為事件目前在 localStorage，正式化應改成後端資料表。
- RAG 尚未導入 embeddings。
- AI 不直接執行付款、退款或取消訂單，只提供導引。
- 圖片上傳目前是 local disk，正式環境應改用 Blob/S3/Cloudinary。

## 下一步方向

1. 把 journey events 搬到後端資料庫。
2. 用 Prisma 建立正式 schema。
3. 導入 Postgres + pgvector。
4. 加 AI recommendation log，記錄推薦理由、來源與結果。
5. 補 retrieval / recommendation evaluation。
