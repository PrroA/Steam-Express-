# Steam Practice Demo Script

這份文件是面試展示時可以直接口述的版本。重點不是把每個技術細節講完，而是讓對方看懂：這是一個有完整購物流程、可解釋 AI 推薦、可繼續正式化的商城專案。

## 一句話介紹

這是一個以 Next.js、React、TypeScript、Express 和 SQLite demo persistence 做成的遊戲商城。使用者可以瀏覽商品、加入購物車、建立訂單、完成付款，也可以透過 AI 客服詢問商品、付款、退款、訂單與個人化推薦。

## Demo Flow

1. 進首頁，看商品列表與搜尋、排序、價格篩選。
2. 進商品詳情，看 AI 商品摘要、版本、價格與庫存。
3. 將商品加入願望清單或購物車。
4. 回首頁，展示「AI 推薦」會根據剛剛的瀏覽與購物行為更新。
5. 進購物車，填寫結帳資料並建立訂單。
6. 到訂單中心完成付款，信用卡付款不可用時可用快速付款完成流程。
7. 付款後確認訂單狀態更新。
8. 到 AI 客服詢問：
   - `推薦我一款遊戲`
   - `我想找 30 美金以下的 RPG`
   - `我的訂單狀態`
   - `可以退款嗎？`
9. 到 admin dashboard 查看商品與訂單管理。

## AI 行為推薦資料流

這個專案的 AI 推薦不是只丟一句 prompt 給模型，而是先把使用者在商城裡的行為整理成 profile，再用同一份 profile 影響首頁推薦和 ChatPage 回覆。

資料流：

```text
使用者行為
  -> journey event
  -> client preference profile
  -> 首頁 AI 推薦
  -> ChatPage 個人化商品推薦
```

目前會記錄的行為：

- `view_game`：看過哪些商品
- `add_wishlist`：加入過哪些願望清單
- `add_cart`：加入過哪些購物車
- `checkout_created`：是否建立過訂單
- `payment_success`：是否完成付款

Profile 會整理出：

- 最近看過的商品 ID 與名稱
- 願望清單商品
- 購物車商品
- 最近關注價格區間
- 商品關鍵字偏好
- 結帳行為次數

面試可口述：

> 我把使用者行為先整理成 client profile，再讓首頁推薦與 AI 客服共用這份 profile。這樣 AI 不是憑空推薦，而是可以說明「你最近看過這款、你放進購物車、價格接近你常看的區間」，推薦理由比較可驗證。

## ChatPage AI 客服

ChatPage 主要定位是商城客服助理，不是通用聊天機器人。它會處理：

- 商品推薦
- 商品比較
- 個人化購買建議
- 購物車健檢
- 訂單狀態查詢
- 付款、退款、配送、帳號說明

回答會盡量附上來源，例如商品、訂單或商店政策。沒有足夠資料時，不會假裝確定。

面試可口述：

> 我把 ChatPage 的範圍限制在商城客服，避免模型回答不相關內容。商品與政策問題會先走 retrieval，再把結果整理成一般使用者看得懂的回答。個人化推薦則會額外參考前端整理出的行為 profile。

## RAG 設計

目前使用 local hybrid retrieval，先不接向量資料庫。原因是 demo 階段資料量不大，關鍵是把 retrieval 流程與 grounded answer 做清楚。

現在的 retrieval 來源：

- 商品 catalog
- 付款、退款、配送、帳號等靜態知識
- 使用者訂單資料

目前排序依據：

- exact match
- title match
- content match
- tags
- intent boost

正式化方向：

- 把商品、FAQ、政策切成 documents
- 導入 embeddings
- 使用 Postgres + pgvector 或其他 vector database
- 加 retrieval evaluation，追蹤命中率與錯誤回答

## 付款流程

目前付款流程分成兩種：

- 信用卡付款：使用 Stripe test mode。
- 快速付款：用於本機 demo 或信用卡付款暫時不可用時，讓流程能完整走到付款完成。

面試可口述：

> 我保留快速付款是為了 demo 穩定性，不讓展示完全依賴第三方金流。正式上線會以 Stripe webhook 作為付款狀態來源，快速付款只會保留在本機 demo。

## 資料庫與正式化

目前資料儲存是 SQLite / local demo persistence，目標是讓本機展示流程穩定。正式化時我會拆成：

- users
- games
- game_variants
- carts
- orders
- order_items
- journey_events
- ai_recommendation_logs

下一步如果要升級資料庫，我會先用 Prisma 整理 schema，再從 SQLite demo 過渡到 Postgres。

## 可以主動說的亮點

- 有完整商城流程，不只是靜態 UI。
- AI 功能和商城資料、使用者行為有結合。
- AI 推薦是可解釋的，不只是「推薦你某款遊戲」。
- ChatPage 有範圍限制，不讓 AI 亂回答非商城問題。
- 沒有 AI key 或信用卡付款不可用時，流程仍可展示。
- 測試包含 TypeScript、Jest、Next build 與 Playwright e2e。

## 目前限制

- 行為事件目前存在前端 localStorage，正式環境應改成後端 event table。
- RAG 還沒有使用 embeddings 或 vector database。
- AI 不會直接操作訂單、付款或退款，只做客服導引。
- 圖片上傳目前是 local disk，正式環境應改用 Vercel Blob、S3 或 Cloudinary。
- SQLite 適合 demo，不適合正式多人流量。

## 口述結尾

> 這個專案我不是只做商城 UI，而是把購物流程、訂單狀態、AI 客服和行為推薦串起來。AI 的部分目前先做可解釋推薦和 RAG 客服，未來如果要正式化，我會把使用者行為事件搬到資料庫，再用 Postgres、pgvector 和 retrieval evaluation 讓推薦更穩定。
