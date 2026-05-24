# Demo 展示腳本

這份文件是展示時可照順序操作的腳本，口吻偏現場說明，不是完整技術文件。

## 開場

這是一個 Steam 風格的商城 demo。主流程包含商品瀏覽、購物車、checkout、訂單、付款、管理後台，以及 AI 商城客服。

我這次整理的重點不是新增大量功能，而是讓整個流程可以穩定展示，並把 AI 做成可解釋的客服與商品推薦功能。

## 展示前準備

```bash
npm run dev
```

確認：

- Frontend：http://localhost:3000
- API：http://localhost:4000

若 4000 被佔用：

```powershell
netstat -ano | Select-String ':4000'
Stop-Process -Id <PID> -Force
```

## 展示流程

### 1. Demo 快速登入

先使用 Demo 快速登入，避免面試時花時間註冊帳號。

可說：

> 這裡提供 demo user，方便快速進入完整會員流程。正式環境會使用正常註冊與登入。

### 2. 商品與購物車

從首頁選一款商品，進商品詳情，確認版本與庫存後加入購物車。

可說：

> 商品有版本與庫存概念，checkout 時會檢查庫存，避免超賣。

### 3. Checkout 建立訂單

進購物車後 checkout，建立一筆 `pending` 訂單。

可說：

> Checkout 先建立訂單，不直接視為付款完成。付款狀態會另外處理，這比較接近真實電商流程。

### 4. 付款

到訂單中心或訂單詳情付款。

如果有 Stripe key：

- 使用測試卡 `4242 4242 4242 4242`
- 任意未來日期
- 任意 CVC

如果沒有 Stripe key：

- 使用 Demo 快速付款

可說：

> Demo 快速付款是展示 fallback。正式化時會以 Stripe webhook 作為付款狀態來源。

### 5. 訂單與管理後台

回訂單中心確認訂單已付款，再進 admin 後台查看訂單與營收。

可說：

> 使用者端看到自己的訂單，管理端可以看到整體訂單與營收摘要。權限用 JWT role 控制。

### 6. AI 商城客服

進 AI 商城客服，依序問：

```text
預算 30 美金，想玩 RPG，哪一款適合？
Elden Ring 跟 The Witcher 3 哪個適合？
幫我檢查購物車適不適合結帳
這筆訂單接下來怎麼辦？
可以退款嗎？
```

可說：

> AI 客服不是直接把問題丟給模型。它會先從商品、政策或訂單資料找依據，再產生回答。

展示重點：

- 商品決策會顯示商品卡，使用者可以直接點「查看商品」。
- 商品比較會顯示比較表，讓 AI 回答不是只有一段文字。
- 購物車健檢會讀登入者自己的購物車，整理總價與結帳前建議。
- 訂單售後會讀登入者最近一筆訂單，依狀態提示付款、出貨或退款下一步。
- 一般退款問題仍然走客服知識，不需要登入。

### 7. RAG Debug

本機可以打開「顯示 RAG 依據」，再問：

```text
可以退款嗎？
推薦便宜的遊戲
```

畫面會顯示：

- retriever：`local-hybrid`
- 命中的文件
- score
- exact / title / content / tags / intent breakdown

可說：

> 這個 debug 面板是為了展示與調整 RAG。它能看出 AI 回答根據哪些資料，不是黑盒聊天。

## AI 架構講法

目前是 local hybrid RAG：

```text
使用者問題
  -> 建立 query
  -> local hybrid retriever 找 FAQ / policy / catalog
  -> score by exact / title / content / tags / intent
  -> 組成 context
  -> OpenAI / Ollama 生成自然回覆
  -> fallback 確保 demo 可用
```

補充：

> 因為 demo 資料量不大，所以先不用 vector database。架構上有保留 Retriever 介面，之後可以把 local retriever 換成 embeddings + pgvector 或 Pinecone。

## 個人化推薦講法

個人化推薦會參考：

- 願望清單
- 購物車
- 曾經買過的商品
- 商品價格與庫存

可說：

> 個人化排序在後端完成，個人訂單摘要不送給外部模型。AI 只負責把候選商品和原因整理成比較自然的客服回覆。

## AI 功能展示講法

可以用這段串起來：

> 我把 AI 放在使用者真的會遇到的商城流程裡，而不是做一個孤立聊天室。選商品時，它可以做預算推薦與商品比較；結帳前，它可以檢查購物車；付款後，它可以依訂單狀態說明下一步。這些功能都先由後端整理資料和權限，再讓 AI 或 fallback 產生自然回覆，所以不會讓模型直接操作付款、退款或訂單。

## 專案限制與下一步

可以主動說：

> 目前這是展示版，所以 SQLite、local upload、Demo 快速付款都不是正式上線方案。正式化會改 managed database、外部圖片儲存、Stripe webhook，AI 則會接 embeddings 與 vector database。

## 收尾

可用這段收尾：

> 這個專案的重點是把一般商城流程和 AI 客服整合起來。AI 不是獨立聊天功能，而是圍繞商品、訂單、付款與退款流程，並且可以透過 RAG debug 看到回答依據，方便後續擴充與維護。
