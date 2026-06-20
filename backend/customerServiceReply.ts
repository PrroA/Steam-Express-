export const customerServiceScopePattern =
  /(商城|商品|推薦|便宜|低價|預算|遊戲|價格|庫存|版本|購物車|結帳|付款|訂單|退款|配送|出貨|帳號|登入|願望清單|客服|game|price|cart|checkout|payment|order|refund|shipping|wishlist|account|login)/i;

export function isCustomerServiceQuestion(message: string) {
  return customerServiceScopePattern.test(message);
}

export function buildCustomerServiceFallbackReply(message: string, grounded: boolean) {
  if (!isCustomerServiceQuestion(message)) {
    return '我主要能協助商城裡的商品、購物車、付款、訂單、退款、配送和帳號問題。你可以問我「推薦便宜的遊戲」或「我的訂單狀態」。';
  }

  if (grounded) {
    if (/(退款|refund)/i.test(message)) {
      return '可以在訂單詳情申請退款。退款完成後訂單會顯示已退款，demo 版本也會把商品庫存補回。';
    }
    if (/(配送|出貨|shipping|delivery)/i.test(message)) {
      return '付款完成後訂單會進入待出貨。你可以在訂單中心查看目前出貨狀態。';
    }
    if (/(付款|結帳|信用卡|payment|checkout|card)/i.test(message)) {
      return '先把商品加入購物車並完成結帳，訂單建立後可以使用信用卡付款；如果信用卡付款暫時無法載入，也可以用快速付款完成流程。';
    }
    if (/(帳號|登入|密碼|account|login|password)/i.test(message)) {
      return '你可以註冊帳號或使用試用帳號快速登入。登入後可以管理購物車、願望清單和訂單中心。';
    }
    if (/(願望清單|收藏|wishlist)/i.test(message)) {
      return '願望清單可以收藏感興趣的商品，之後能快速回來查看價格與商品狀態。';
    }
    if (/(訂單|order)/i.test(message)) {
      return '登入後可以到訂單中心查看訂單明細、付款狀態與出貨狀態。';
    }
    return '我可以依照商店資料協助你整理商品、付款、訂單、退款、配送和帳號相關問題。';
  }

  return '目前 AI 暫時無法使用，但你仍然可以完成商店流程。建議先到商店選商品、加入購物車，再到訂單中心付款或查看狀態。';
}
