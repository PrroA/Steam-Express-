# Demo Script

這份是面試現場可直接照著走的 3 到 5 分鐘展示流程。

## 開場

> 這是一個遊戲商城 demo，包含商品瀏覽、購物車、訂單付款、admin 管理，以及 AI 商品助理。我的重點是把一個完整購物流程做順，並把 AI 放在合理的位置：協助使用者做購買決策與客服問答，而不是直接操作高風險交易。

## 展示流程

1. 進首頁，說明商品列表、分類、願望清單與 AI 助理入口。
2. 打開一個商品頁，展示 AI 購買前快速判斷。
3. 將 2 到 3 個商品加入比較，打開比較頁，展示 AI 商品比較。
4. 把商品加入購物車，前往 checkout。
5. 建立訂單後進入訂單中心。
6. 使用 Stripe 測試卡或 Demo 快速付款完成付款。
7. 回到訂單中心，確認訂單狀態變成付款完成。
8. 進入 admin dashboard，查看訂單與 AI 使用狀態。
9. 打開 AI 商城客服，問以下問題：
   - `怎麼付款？`
   - `可以退款嗎？`
   - `推薦便宜的 RPG`
   - `我最近看過什麼商品？`
   - `我的訂單狀態是什麼？`

## AI 商品推薦怎麼講

> 商品推薦不是只寫死關鍵字，而是把使用者的瀏覽、收藏、加購、checkout 與付款紀錄整理成 preference profile，再用這個 profile 影響推薦結果。這樣 AI 回答會更像根據使用者行為給建議，而不是單純列出商品。

資料流：

```text
使用者行為
  -> journey events
  -> preference profile
  -> 商品推薦 / 商品比較 / ChatPage 回答
```

目前使用的事件：

- `view_game`：看過哪些商品
- `add_wishlist`：收藏偏好
- `add_cart`：購物意圖
- `checkout_created`：已進入交易流程
- `payment_success`：完成購買

## RAG 怎麼講

> ChatPage 是 AI 客服入口。它會先從商城資料中找相關內容，例如商品、付款說明、退款規則、配送與帳號資訊，再把找到的資料交給 AI 產生回答。畫面會顯示回答是否根據商城資料，避免使用者以為所有回答都一定來自官方資料。

目前 retrieval 是 local hybrid retrieval，不是 vector database。這是刻意的 demo 取捨：

- 優點：本機容易跑、測試穩定、架構好解釋。
- 缺點：語意搜尋能力有限。
- 下一步：PostgreSQL + pgvector + retrieval evaluation。

## 付款流程怎麼講

> 付款有兩條路：有 Stripe key 時可以走 Stripe test mode；沒有 key 時可以用 Demo 快速付款，讓展示不會因環境變數卡住。正式環境應改成 Stripe webhook 更新訂單狀態，不能只依賴前端成功頁。

## Admin 怎麼講

> Admin dashboard 不是只拿來管理商品，也能看訂單與 AI 使用狀態。這讓我可以說明 AI 功能不是孤立的 UI，而是有紀錄、有觀測、有測試的功能。

## 收尾

> 這個專案目前是 demo 級別，所以我保留 SQLite、local upload 與 Demo 快速付款。若要正式化，我會優先做 PostgreSQL / Prisma、Stripe webhook、object storage，以及 pgvector RAG。這些改動可以在不重寫前端流程的情況下逐步替換底層實作。
