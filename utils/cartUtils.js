/**
 * 計算購物車總價
 * @param {Array} cartItems
 * @returns {number}
 */
function calculateTotalPrice(cartItems) {
  if (!Array.isArray(cartItems)) return 0;

  return cartItems.reduce((sum, item) => {
    return sum + parseFloat(item.price.replace('$', '')) * item.quantity;
  }, 0);
}

module.exports = { calculateTotalPrice };
