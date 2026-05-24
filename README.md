# Steam Practice 商城 Demo

Steam Practice 是一個以 Steam 商城體驗為參考的全端練習專案。專案包含商品瀏覽、購物車、結帳、訂單、付款 demo、管理後台、願望清單，以及 AI 商城客服。

這個版本的重點是面試展示與本機 demo：流程可以完整跑完，AI 功能可解釋，並保留正式化時可以延伸的架構位置。

## 技術棧

- Frontend：Next.js Pages Router、React、TypeScript、Tailwind CSS
- Backend：Express、TypeScript、JWT、Socket.IO
- Persistence：SQLite / 本機狀態檔案
- Payment：Stripe test mode、Demo 快速付款 fallback
- AI：OpenAI、Ollama fallback、Browser-side AI POC、local hybrid RAG
- Test：Jest、Playwright
- Deploy：Vercel / Render 類型環境可拆前後端部署

## 本機啟動

```bash
npm install
npm run dev
```

啟動後：

- Frontend：http://localhost:3000
- Express API：http://localhost:4000

`npm run dev` 會先編譯 backend / server，再同時啟動 Express 與 Next.js。

如果看到 `EADDRINUSE: address already in use :::4000`，代表舊的 backend process 還佔著 port：

```powershell
netstat -ano | Select-String ':4000'
Stop-Process -Id <PID> -Force
```

## 環境變數

本機可建立 `.env.local`。不要把真實 key commit 進 Git。

```env
PORT=4000
FRONTEND_BASE_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000

SECRET_KEY=local_demo_secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

OPENAI_API_KEY=sk-xxx
OPENAI_CHAT_MODEL=gpt-4o-mini

OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:7b-instruct

ENABLE_RAG_DEBUG=true
```

### 本機 demo 設定

- `ADMIN_USERNAME=admin` / `ADMIN_PASSWORD=admin` 只適合本機展示。
- 沒有 Stripe key 時，仍可使用 Demo 快速付款完成流程。
- 沒有 OpenAI / Ollama 時，AI 客服仍會用固定客服回覆與商品資料 fallback。
- 商品頁的「本機決策助理」會先顯示目前分析方式：本機 AI 可用時使用瀏覽器內建 AI；不支援時使用商品資料與偏好產生穩定建議。
- `ENABLE_RAG_DEBUG=true` 可讓正式環境暫時打開 RAG debug；本機 `localhost` 前端會自動顯示「顯示 RAG 依據」開關。

### 正式部署注意

- 正式環境請設定自己的 `ADMIN_PASSWORD`，不要使用 `admin/admin`。
- SQLite / local upload 不適合正式上線，建議改 PostgreSQL / MySQL 與 Vercel Blob、S3 或 Cloudinary。
- Ollama 是本機 fallback，不會自動出現在 Vercel / Render。若正式環境不想負擔 OpenAI 成本，可以保留 fallback 與 Browser-side AI POC；需要更穩定的生成品質時，再接 OpenAI 或其他 hosted model。
- Stripe 正式化需要補 webhook 驗證、付款狀態同步、退款審核與錯誤追蹤。

## Demo 帳號

- 一般使用者：頁面上的「Demo 快速登入」
- 管理員：`admin / admin`，或使用 `.env.local` 的 `ADMIN_USERNAME` / `ADMIN_PASSWORD`

## Stripe 測試付款

Stripe test mode 可使用：

- 卡號：`4242 4242 4242 4242`
- 到期日：任意未來日期
- CVC：任意 3 碼

如果 Stripe key 尚未設定，訂單頁會提供 Demo 快速付款，不影響展示主流程。

## 主要功能

- 商品列表、商品詳情、版本與庫存
- 購物車、checkout、訂單中心、訂單詳情
- Stripe 測試付款與 Demo 快速付款
- 訂單狀態：`pending`、`payment_failed`、`paid`、`cancelled`、`refunded`
- 出貨狀態：`pending_shipment`、`shipped`、`delivered`
- 願望清單與展示用通知
- 管理後台：商品、訂單、營收摘要
- AI 商城客服：商品推薦、付款/退款/配送/帳號問答、個人訂單摘要

## AI / RAG 設計

目前 AI 客服是 **local hybrid RAG**，不是向量資料庫版本。商品頁另外有一個 **Browser-side AI POC**，用來展示零 API 成本的購買決策助理。

流程：

```text
使用者問題
  -> local hybrid retriever 搜尋 FAQ / policy / catalog
  -> 依 exact / title / content / tags / intent scoring 排序
  -> 組成 context
  -> OpenAI / Ollama 生成自然回覆
  -> 沒有 provider 時使用穩定 fallback
```

目前支援：

- Browser-side AI 商品決策：在商品頁按「幫我判斷」，可由瀏覽器內建 AI 產生購買建議；不支援時自動使用商品資料 fallback
- Browser-side AI 商品比較：在比較頁按「幫我選一款」，可依 2 到 3 款商品與近期偏好收斂選擇
- 商品推薦：依價格、庫存、願望清單、購物車、購買紀錄排序
- 商品決策：可回答「預算 30 美金，想玩 RPG，哪一款適合？」並附商品卡
- 商品比較：可回答「Elden Ring 跟 The Witcher 3 哪個適合？」並顯示比較表
- 購物車健檢：登入後分析自己的購物車總價、取捨與結帳前建議
- 訂單售後助理：登入後依最近訂單狀態提示下一步，例如付款、等待出貨或退款入口
- 個人訂單狀態：登入後摘要自己的最近訂單，不把個人訂單資料送給模型
- RAG 來源顯示：前端顯示商品資料、商店規則、客服說明或你的訂單
- RAG debug：本機可查看 retriever、命中文件與 score breakdown

這個設計刻意保留 `Retriever` 介面。未來若資料量變大，可以把 `LocalHybridRetriever` 換成 OpenAI embeddings + pgvector / Pinecone / Weaviate，不需要改前端 chat API。

### 零成本 AI 展示策略

OpenAI 適合正式品質，但會有 API 成本；Ollama 適合本機學習，但部署到 Vercel / Render 後不會自動存在。因此這個專案把 AI 分成三層：

1. 商品資料 fallback：永遠可用，確保 demo 不會壞。
2. Browser-side AI：瀏覽器支援內建語言模型時，在使用者裝置上產生商品決策建議，不需要後端 key。
3. Hosted model：有 OpenAI key 時，客服與商品摘要可以升級成更自然的回答。

目前 Browser-side AI 是 POC 階段，能力取決於使用者瀏覽器是否支援內建語言模型；不支援時，畫面會自然回到商品資料分析。

商品頁會直接顯示目前狀態：

- `本機 AI 可用`：瀏覽器可以在使用者裝置上整理購買建議。
- `可啟用本機 AI`：瀏覽器支援，但可能需要先準備模型；等待期間會先顯示商品資料分析。
- `目前使用商品資料分析`：瀏覽器不支援本機 AI，仍可完成 demo。

## Demo Flow

1. 使用 Demo 快速登入。
2. 從首頁的「AI 助理」入口選擇商品決策、商品比較或 AI 客服。
3. 從首頁選商品，查看詳情與版本。
   - 商品頁可按「幫我判斷」，展示零 API 成本的本機決策助理。
   - 加入 2 到 3 款商品比較後，可到比較頁按「幫我選一款」。
4. 加入購物車。
5. Checkout 建立訂單。
6. 到訂單中心付款。
7. 使用 Stripe 測試卡或 Demo 快速付款。
8. 回訂單中心確認狀態變成付款完成。
9. 進管理後台查看訂單與營收。
10. 到 AI 商城客服詢問：
   - `預算 30 美金，想玩 RPG，哪一款適合？`
   - `Elden Ring 跟 The Witcher 3 哪個適合？`
   - `幫我檢查購物車適不適合結帳`
   - `這筆訂單接下來怎麼辦？`
   - `可以退款嗎？`
11. 本機可打開「顯示 RAG 依據」，查看命中文件與分數。

## 測試

```bash
npm run build:backend
npm run build:server
npm test -- --runInBand
npm run build
```

需要 e2e 時：

```bash
npm run test:e2e
```

目前重點測試包含 auth、cart、checkout、order、admin、AI/RAG retrieval、ChatPage 建置。

## 專案限制

- 這是 demo persistence，不是正式資料庫設計。
- 圖片上傳目前偏本機展示，不適合多節點正式部署。
- Demo 快速付款只適合展示，正式金流需以 Stripe webhook 為準。
- AI 不會直接付款、退款、取消訂單或修改資料，只做客服導引與資訊摘要。
- 目前 RAG 是 local hybrid retrieval，尚未接 embedding / vector database。
- Browser-side AI 是展示用 POC，正式產品仍要依目標瀏覽器支援度評估。

## 面試說明

可參考：

- [README.INTERVIEW.md](./README.INTERVIEW.md)
- [docs/demo-script.md](./docs/demo-script.md)
