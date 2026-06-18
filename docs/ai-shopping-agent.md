# AI Shopping Agent

這份文件說明目前購物助理 Agent 的展示重點、流程邊界與可觀測性。

## 目標

購物助理 Agent 不是單純聊天，而是把使用者需求拆成可執行步驟：

1. 理解使用者預算、類型與操作意圖。
2. 從商品資料中挑出候選商品。
3. 產生主推薦與原因。
4. 視需求建立比較連結、加入願望清單或加入購物車。
5. 若使用者要求 checkout，只準備購物車並導向 `/cart`，不自動建立訂單。

## Demo Prompt

```text
assistant recommend an RPG under $30 and add to compare
assistant recommend an RPG under $30 and add to cart
assistant recommend an RPG under $30 and checkout
幫我找 30 美元以下的 RPG，並加入比較
幫我挑一款 RPG 加入購物車並準備結帳
```

## API Shape

購物助理沿用 `/chat/rag`，不另外新增前端 API。

回傳重點欄位：

```json
{
  "mode": "shopping-agent",
  "grounded": true,
  "sources": [],
  "agentPlan": {
    "goal": "assistant recommend an RPG under $30 and checkout",
    "summary": "Agent 已完成商品篩選",
    "nextHref": "/cart",
    "steps": [
      {
        "id": "understand-goal",
        "title": "理解需求",
        "status": "done",
        "detail": "已解析預算、商品類型與操作意圖"
      },
      {
        "id": "add-cart",
        "title": "加入購物車",
        "status": "done",
        "href": "/cart"
      },
      {
        "id": "checkout-prep",
        "title": "準備結帳",
        "status": "suggested",
        "href": "/cart"
      }
    ]
  }
}
```

## Safety Boundary

Agent 可以執行低風險購物輔助動作：

- 建立比較頁連結。
- 登入後加入願望清單。
- 登入後加入購物車。
- 導向購物車準備結帳。

Agent 不會自動執行高風險交易動作：

- 不會直接呼叫 `/checkout` 建立訂單。
- 不會自動付款。
- 不會自動退款、取消訂單或修改訂單狀態。

這個邊界是刻意設計的。面試時可以說明：AI 可以輔助決策與準備流程，但交易確認仍交給使用者操作。

## Observability

Admin AI usage 會記錄 Agent 相關指標：

- `agentRuns`：購物助理 Agent 被觸發的次數。
- `agentActionCount`：Agent 回傳的步驟總數。
- 每筆 usage event 會保留 `agentActionCount`，方便看單次任務做了幾個步驟。

這讓 AI 功能不是只停留在 UI demo，而是能被後台觀測與測試。

## Interview Talking Point

> 我把 AI 從單純推薦和客服問答往 Agent 化推進。它會把使用者需求拆成任務步驟，例如挑商品、建立比較、加入願望清單、加入購物車與準備結帳。對交易風險比較高的部分，我沒有讓 AI 直接下單或付款，而是導到購物車讓使用者確認。後台也會記錄 Agent 執行次數與步驟數，讓這個 AI 功能可以被觀測，而不是只有畫面效果。
