## 1) 專案一句話
這是一個 Steam 風格的全端電商練習專案，目標是做出可運作的完整交易流程與可維護架構，而不是只有前端切版。

## 2) 我解的問題
- 一般電商流程是否能完整跑通：瀏覽商品 -> 加入購物車 -> 結帳付款 -> 訂單/交易查詢
- 是否能支援角色與後台：一般使用者 vs Admin
- 是否能部署與維運：前後端分離部署、錯誤治理、安全標頭與基本防護

## 3) 架構總覽
- 前端：Next.js（Pages Router）+ React + Tailwind
- 後端：Express + JWT + Socket.IO
- 資料層：SQLite（`better-sqlite3`）
- 支付：Stripe（Payment Intent + Webhook），另有 `/pay` 模擬支付
- AI 客服：`/chat/rag`（OpenAI 可選，無 key 時 fallback）
  - 可接 OpenAI（高品質）或本地 Ollama（免費）雙 provider

資料流：
1. `pages/components` 負責 UI
2. `hooks` 管頁面流程狀態
3. `services` 統一 API 呼叫
4. `backend/routes` 執行商業規則
5. `persistence` 寫入 SQLite

## 4) 為什麼這樣拆
- `pages` 只做組裝，避免單頁過胖
- `hooks` 抽離行為邏輯，提升可測試性
- `services` 統一 baseURL/token/header/error
- 後端 routes 依 domain 拆分（auth/store/order/chat），便於擴充與除錯

## 5) 主要功能模組
- Auth/Profile：註冊、登入、忘記密碼、個人資料
- Store：商品列表/詳情、評論、願望清單
- Cart/Order：購物車、結帳、付款、取消、退款、重試付款、再次購買
- Admin：商品上/下架、版本價格庫存、訂單狀態/物流、Dashboard
- Chat：即時訊息 + RAG 客服

## 6) 關鍵技術決策
- JWT + role-based 授權：前端做可視入口控制，後端做最終授權
- 訂單狀態機：`未付款/付款失敗/已付款/已取消/已退款` + `statusHistory`
- 庫存一致性：結帳扣庫存，取消/退款補回庫存
- 錯誤治理：統一錯誤格式 + request id + 操作日誌
- 安全：CSP、HSTS、X-Frame-Options、Rate Limit

## 7) 我實際處理過的問題（可當亮點）
- Vercel build 失敗（TypeScript union type 問題）
- 前後端部署造成 401/403（base URL、secret、token 過期）
- RAG 路由 404 / fallback 不一致
- 手機選單與登入狀態體驗問題（導覽與權限顯示）
- Admin 新商品資料缺版本導致管理操作不完整

## 8) 測試策略
- Jest（`__tests__/`）：元件、hook、API integration
- Playwright（`e2e/`）：登入、後台、支付流程、權限可見性
- 重點不是測試數量，而是先覆蓋高風險流程：登入、下單、付款、權限

## 9) 可量化成果（面試可講）
- 系統可完整跑通「瀏覽到付款到訂單追蹤」主流程
- 管理後台可直接操作商品與訂單狀態
- 針對部署常見錯誤（401/403/404/build fail）有可重現與修復經驗
- 架構已從頁面耦合調整成 `UI / Hook / Service / Route` 分層

## 10) 下一步強化方向
- 補齊更完整 E2E（含 webhook 與異常路徑）
- 增加 observability（錯誤告警、儀表板）
- 結帳流程引入更嚴謹狀態管理與 idempotency
- 後端資料模型正規化（由 JSON state 演進到完整 DB schema）

---

## 30 秒版本（最後收斂）
我把這個專案做成一個可運作的全端電商系統，而不是只做前端畫面。除了功能完整，我重點做了架構分層、權限控制、訂單與庫存一致性、部署除錯與基本測試覆蓋，目標是證明我有能力從功能實作走到可維運的工程落地。
