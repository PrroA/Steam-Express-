# Steam Practice Store

Steam 風格的全端電商練習專案，使用 `Next.js + Express + TypeScript(部分) + SQLite`。  
核心目標是把「可操作的電商流程」做完整，而不是只做靜態 UI。

## 功能概覽
- 會員：註冊、登入、JWT 驗證、忘記密碼/重設密碼、個人資料維護
- 商店：商品列表、商品詳情、版本/庫存、搜尋、評論、願望清單
- 購物流程：購物車、結帳、付款、訂單查詢、交易紀錄、退款/取消/重試付款/再次購買
- 管理後台：商品上下架、商品資料編輯、版本價格與庫存調整、訂單狀態與物流管理、儀表板
- 客服：Socket 即時訊息、GPT 回覆、RAG 問答（可無 OpenAI key fallback）
- 可靠性：Request ID、統一錯誤格式、Rate Limit、操作日誌、CSP/安全標頭

---

## 技術棧
- Frontend: `Next.js (Pages Router)`, `React`, `Tailwind CSS`, `Framer Motion`, `Redux Toolkit`
- Backend: `Express`, `Socket.IO`, `JWT`, `bcrypt`, `better-sqlite3`
- Payment: `Stripe`（Payment Intent + Webhook，另保留模擬付款 `/pay`）
- Testing: `Jest + Testing Library`、`Playwright`
- Deploy: `Vercel` (前端) + `Render` (後端常見部署方式)

---

## 系統架構

```text
Browser (Next.js pages/components/hooks)
  -> services/* (axios apiClient)
  -> Express API (server.ts + backend/routes/*)
  -> SQLite (data/gogo.sqlite, app_state table)

Browser (Chat UI)
  -> Socket.IO <-> Express

Express (chat/rag)
  -> OpenAI API (optional)
  -> local RAG context (backend/rag.ts) fallback
```

### 前後端邏輯分工
- 前端負責：頁面互動、狀態管理、權限導頁、UI 呈現
- `services/*` 負責：API 呼叫抽象、token header 統一
- 後端負責：驗證授權、商業規則（庫存、訂單狀態機）、資料持久化、錯誤正規化

---

## 專案資料夾與職責

```text
.
├─ pages/                    # Next.js 路由頁面
│  ├─ api/                   # Next API routes（少量輔助）
│  ├─ admin.tsx              # 後台頁
│  ├─ cart.tsx               # 購物車/結帳
│  ├─ game/[id].tsx          # 商品詳情
│  ├─ orders.tsx             # 訂單中心
│  ├─ profile.tsx            # 個人資料
│  └─ ...
├─ components/               # UI 元件
│  ├─ admin/                 # 後台元件（商品、訂單、指標）
│  ├─ game-detail/           # 詳情頁元件（圖庫、購買區、評論）
│  ├─ header/                # 導覽列元件（權限/通知/手機抽屜）
│  └─ orders/                # 訂單視覺元件（圖表、時間軸、操作）
├─ hooks/                    # 畫面邏輯拆分（useAdminPage/useOrdersPage/useGameDetail...）
├─ services/                 # API 呼叫層（auth/cart/order/admin/profile/store）
├─ backend/                  # Express 路由與持久化核心（TS）
│  ├─ middleware/auth.ts     # JWT 驗證 + admin 權限
│  ├─ routes/                # auth/store/order/chat 路由
│  ├─ persistence.ts         # SQLite hydrate/persist
│  ├─ state.ts               # 初始記憶體狀態
│  └─ rag.ts                 # RAG 檢索邏輯
├─ types/                    # 前後端共用型別
├─ utils/                    # 前端工具（通知、admin 圖片處理等）
├─ __tests__/                # Jest 單元/整合測試
├─ e2e/                      # Playwright 端對端測試
├─ server.ts                 # Express app 主程式（TS）
├─ server.js                 # Node 啟動入口（載入 server-build/server.js）
├─ backend-build/            # backend TS 編譯輸出（自動生成）
└─ server-build/             # server.ts 編譯輸出（自動生成）
```

### 為什麼要這樣拆
- `pages` 只做頁面組裝，避免頁面檔案過胖
- 複雜流程移到 `hooks`，降低 UI 與商業邏輯耦合
- API 呼叫集中在 `services`，避免重複 URL/header/錯誤處理
- 後端以 domain routes 拆分，方便擴充與測試

---

## 資料層設計

### 儲存方式
- 使用 `better-sqlite3`
- DB 預設路徑：`data/gogo.sqlite`
- 以 `app_state(key, value)` 儲存 JSON 狀態快照

### hydrate / persist 流程
1. Server 啟動：`hydrateState(state)` 從 SQLite 載入
2. 每次資料變更後：`persistState(state)` 寫回 SQLite
3. `NODE_ENV=test` 時可使用 in-memory DB（`:memory:`）

---

## API 設計（Express 主後端）

Base URL（本地）: `http://localhost:4000`

### Auth / Profile
| Method | Path | Auth | 說明 |
|---|---|---|---|
| POST | `/register` | No | 註冊 |
| POST | `/login` | No | 登入，回傳 JWT |
| POST | `/forgot-password` | No | 產生重設 token |
| POST | `/reset-password` | No | 重設密碼 |
| POST | `/confirm-reset-password` | No | 重設密碼（前端使用） |
| GET | `/profile` | Yes | 取得個人資料 |
| PUT | `/profile` | Yes | 更新個人資料 |

### Store / Wishlist / Reviews
| Method | Path | Auth | 說明 |
|---|---|---|---|
| GET | `/games` | No | 商品列表（可 query） |
| GET | `/games/:id` | No | 商品詳情 |
| POST | `/games` | Admin | 新增商品 |
| DELETE | `/games/:id` | Admin | 刪除商品 |
| GET | `/reviews/:gameId` | No | 查評論 |
| POST | `/reviews` | Yes | 新增評論 |
| POST | `/wishlist` | Yes | 加入願望清單 |
| GET | `/wishlist` | Yes | 取得願望清單 |
| DELETE | `/wishlist/:id` | Yes | 移除願望清單 |

### Cart / Order / Payment
| Method | Path | Auth | 說明 |
|---|---|---|---|
| GET | `/cart` | Yes | 取得購物車 |
| POST | `/cart` | Yes | 加入購物車（含 variant） |
| PATCH | `/cart/:id` | Yes | 更新數量 |
| DELETE | `/cart/:id` | Yes | 移除商品 |
| POST | `/checkout` | Yes | 建立訂單、扣庫存 |
| GET | `/orders` | Yes | 訂單列表 |
| GET | `/orders/:orderId` | Yes | 單筆訂單 |
| POST | `/orders/:orderId/cancel` | Yes | 取消訂單 |
| POST | `/orders/:orderId/refund` | Yes | 退款 |
| POST | `/orders/:orderId/retry-payment` | Yes | 失敗訂單重試付款 |
| POST | `/orders/:orderId/reorder` | Yes | 再次購買（回填購物車） |
| POST | `/pay` | Yes | 模擬付款（含失敗分支） |
| POST | `/create-payment-intent` | Yes | 建立 Stripe Payment Intent |
| POST | `/stripe/webhook` | Stripe | Stripe webhook 回寫訂單狀態 |
| GET | `/transactions` | Yes | 交易紀錄 |

### Admin
| Method | Path | Auth | 說明 |
|---|---|---|---|
| GET | `/admin/games` | Admin | 商品管理列表 |
| PATCH | `/admin/games/:id/status` | Admin | 上/下架 |
| PATCH | `/admin/games/:id` | Admin | 更新商品基本資訊 |
| POST | `/admin/games/:id/ensure-variant` | Admin | 補預設版本 |
| PATCH | `/admin/games/:id/variants/:variantId` | Admin | 更新版本價格/庫存 |
| POST | `/admin/upload-image` | Admin | 上傳圖片（binary） |
| GET | `/admin/orders` | Admin | 全部訂單 |
| PATCH | `/admin/orders/:orderId/status` | Admin | 訂單狀態更新 |
| PATCH | `/admin/orders/:orderId/fulfillment-status` | Admin | 出貨狀態更新 |
| PATCH | `/admin/orders/:orderId/shipping-details` | Admin | 物流資訊 |
| GET | `/admin/dashboard` | Admin | 儀表板統計 |

### Chat / RAG
| Method | Path | Auth | 說明 |
|---|---|---|---|
| POST | `/gpt-reply` | No | GPT 回覆 |
| POST | `/chat/rag` | No | RAG 客服問答（有 fallback） |
| Socket | `sendMessage/receiveMessage` | No | 即時客服訊息 |

### Next API routes（`pages/api/*`）
這些是 Next.js 側的輔助 API 入口，主要提供前端層封裝或替代呼叫，核心商業邏輯仍在 Express：

| Method | Path | 說明 |
|---|---|---|
| GET/POST | `/api/cartApi` | re-export `services/cartService`（前端側使用） |
| GET | `/api/gameApi` | re-export `services/storeService`（前端側使用） |
| POST | `/api/chat` | 直接呼叫 OpenAI（Next API route） |

---

## 前端頁面與資料流重點

### Header 與權限
- `hooks/useHeaderState.js` 解析 JWT payload，決定登入狀態與 admin 權限
- 導覽顯示依 `isLoggedIn` / `isAdmin` 動態切換

### 商品詳情頁
- `hooks/useGameDetail.ts` 負責：商品載入、評論載入、加入願望清單、加入購物車、版本選擇
- UI 由 `components/game-detail/*` 負責展示

### 後台頁
- `hooks/useAdminPage.ts` 負責：儀表板、商品/版本/上架、訂單管理、圖片上傳
- UI 由 `components/admin/*` 模組化

### 訂單頁
- `hooks/useOrdersPage.ts` 負責：訂單載入、選擇、Payment Intent、狀態同步與統計資料
- UI 由 `components/orders/*` 模組化

---

## 測試策略

### 1) Unit / Integration（Jest）
位置：`__tests__/`
- UI / Hook 測試：`Header.test.js`, `useGameDetail.test.tsx`, `CartPage.test.js` ...
- API 整合測試：`api.integration.test.js`（直接起 Express app 測路由）

常用指令：
```bash
npm test
npm test -- __tests__/Header.test.js --runInBand
```

### 2) E2E（Playwright）
位置：`e2e/`
- 登入、後台管理、結帳支付、願望清單降價提醒、Header 權限顯示

常用指令：
```bash
npm run test:e2e
npm run test:e2e:ui
```

---

## 啟動方式

### 需求
- Node.js 18+

### 安裝
```bash
npm install
```

### 開發模式
```bash
npm run dev
```

`predev` 會先編譯：
- `backend/**/*.ts` -> `backend-build/`
- `server.ts` -> `server-build/`

### 正式建置與啟動
```bash
npm run build
npm start
```

---

## 環境變數

### 後端（`.env`）
```bash
PORT=4000
SECRET_KEY=your_long_random_secret
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
OPENAI_API_KEY=sk-xxx
FRONTEND_BASE_URL=http://localhost:3000
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_smtp_app_password
SMTP_FROM="Steam Practice <your_email@gmail.com>"
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:7b-instruct
RATE_LIMIT_MAX=120
SQLITE_DB_PATH=./data/gogo.sqlite
```

### 前端（`.env.local`）
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

部署時請改成你實際後端網址，例如 Render URL。

---

## OpenAI 使用說明（重要）
- `ChatGPT Plus / Pro 訂閱` 與 `OpenAI API` 為不同計費系統。
- 本專案後端呼叫的是 `OpenAI API`，因此會走 API 用量費用。
- 若你想先控制成本，可先拔掉 `OPENAI_API_KEY`，系統會改走 Ollama（本地免費）。

推薦做法：
1. 展示或正式 demo：保留 `OPENAI_API_KEY`（品質較穩）
2. 日常開發：移除 `OPENAI_API_KEY`，走 Ollama

金鑰安全：
- 不要把真實 `OPENAI_API_KEY` 提交到 Git。
- 若 key 曾曝光，請到 OpenAI 後台立即撤銷並重發新 key。

---

## 忘記密碼寄信（SMTP）
`POST /forgot-password` 目前支援雙模式：
- 有設定 SMTP 且帳號有 email：寄送重設連結到信箱
- 無 SMTP 或帳號無 email：回傳 `resetToken/resetUrl` 作為開發備援

最少需要設定：
- `FRONTEND_BASE_URL`：重設連結的前端網址（例如 `http://localhost:3000`）
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

若你用 Gmail，`SMTP_PASS` 請使用 App Password（不是 Gmail 一般登入密碼）。

---

## 安全與可靠性設計
- JWT 驗證與 admin 授權中介層
- API Rate Limit（每 IP/分鐘）
- 每請求 `x-request-id` 與統一錯誤格式
- 請求完成操作日誌（method/path/status/duration/user）
- `next.config.js` 與 `vercel.json` 設定 CSP / 安全標頭

---

## 補充
- `backend-build/`、`server-build/` 為編譯產物，不建議手動修改
- 若遇到前後端 401/403，先確認：
  1. 前端 `NEXT_PUBLIC_API_BASE_URL`
  2. 後端 `SECRET_KEY` 是否固定且與簽發 token 一致
  3. 瀏覽器 localStorage 中 token 是否過期

---

## 免費本地 AI（Ollama）設定
若不想使用 OpenAI 付費 API，可改用本地模型（免費）：

1. 安裝 Ollama：`https://ollama.com/download`
2. 拉模型（建議）：`ollama pull qwen2.5:7b-instruct`
3. 啟動 Ollama（通常安裝後會自動常駐）
4. 設定 `.env`：
   - `OLLAMA_BASE_URL=http://127.0.0.1:11434`
   - `OLLAMA_MODEL=qwen2.5:7b-instruct`

後端聊天路由策略：
- 有 `OPENAI_API_KEY`：優先 OpenAI
- 無 OpenAI 或 OpenAI 失敗：自動 fallback 到 Ollama

快速檢查：
```bash
curl -X POST http://localhost:4000/chat/rag \
  -H "Content-Type: application/json" \
  -d '{"message":"你好，今天推薦什麼 RPG？"}'
```
回應中若有 `provider: "openai"` 或 `provider: "ollama"` 代表智能聊天已生效。
