# RAG Evaluation

這份文件說明目前 RAG 評估方式。目標不是宣稱模型回答一定正確，而是用固定問題檢查 retrieval 是否有命中合理資料來源。

## 為什麼要做

RAG 的品質不能只靠畫面看起來有回答。至少要能回答三件事：

- 使用者問付款、退款、配送時，有沒有命中對應客服文件。
- 使用者問商品推薦或指定商品時，有沒有命中 catalog。
- 修改知識庫或 retrieval scoring 後，有沒有讓基本問題退化。

## 評估方式

目前使用 `backend/ragEvaluation.ts` 裡的固定案例：

- `payment-help`：付款與信用卡問題。
- `refund-policy`：退款規則。
- `shipping-status`：付款後出貨。
- `account-login`：試用帳號與登入。
- `wishlist-alert`：願望清單與降價提醒。
- `cheap-game`：便宜遊戲推薦，預期命中 catalog。
- `named-game`：指定商品版本與庫存，預期命中指定商品文件。

每個案例會跑 local hybrid retriever，檢查 top 3 結果是否包含預期文件或預期類型。

## 測試指令

```bash
npm run test:rag-eval
```

或直接跑：

```bash
node --no-deprecation ./node_modules/jest/bin/jest.js __tests__/ragEvaluation.test.ts --runInBand
```

## 面試說法

> 我沒有只把 RAG 做成一個聊天入口，也補了基本 retrieval evaluation。這能檢查付款、退款、配送、願望清單與商品問題是否命中正確資料。之後如果改成 pgvector，也可以沿用同一組問題來比較命中率。

## 後續可升級

- 增加更多真實客服問題。
- 把 expected document 改成多答案集合。
- 記錄 topK hit rate、MRR、fallback rate。
- 將 evaluation 接到 CI，避免知識庫或 scoring 改壞。
