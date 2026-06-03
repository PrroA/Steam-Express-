# 展示前檢查清單

這份清單用在 push 前或面試展示前。目標是快速確認主要 demo flow、AI 展示入口、使用者文案品質沒有退掉。

## 1. 啟動本機服務

```bash
npm run dev
```

確認服務啟動：

- Frontend: http://localhost:3000
- Backend: http://localhost:4000

如果看到 `EADDRINUSE`，代表舊的 Node process 還佔著 port，先關掉舊服務再重啟。

## 2. 快速展示檢查

開另一個 terminal 執行：

```bash
npm run test:showcase
```

這會依序跑：

- `build:backend`
- `build:server`
- `test:encoding`
- `test:e2e:demo`
- `test:e2e:ai`
- `test:e2e:copy`

## 3. 單項檢查

只檢查核心購物流程：

```bash
npm run test:e2e:demo
```

只檢查 AI 展示入口：

```bash
npm run test:e2e:ai
```

只檢查一般使用者頁面沒有工程字眼：

```bash
npm run test:e2e:copy
```

只檢查常見亂碼字元：

```bash
npm run test:encoding
```

## 4. 手動展示順序

1. 首頁看商品列表與 AI 助理入口。
2. 使用 Demo 帳號登入。
3. 進商品詳情，看 AI 商品摘要與購買建議。
4. 加入購物車，跑 checkout 建立訂單。
5. 到訂單中心使用 Demo 快速付款。
6. 確認訂單變成付款完成。
7. 到商品比較頁看 AI 比較建議。
8. 到 AI 客服問付款、退款、商品推薦或訂單狀態。

## 5. 展示時不要出現

- 中文亂碼。
- `API`、`server`、`token`、`PaymentIntent`、`500` 等工程字眼。
- Stripe key 未設定造成的空白付款區塊。
- header 出現不必要的交易紀錄或後台入口。
