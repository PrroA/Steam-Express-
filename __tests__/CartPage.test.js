const { calculateTotalPrice } = require('../utils/cartUtils');

describe('calculateTotalPrice function', () => {
  test('正確計算總價', () => {
    const cartItems = [
      { price: '$10', quantity: 2 }, //20
      { price: '$20', quantity: 1 }, //20
      { price: '$40', quantity: 3 }, //120
    ];
    const total = calculateTotalPrice(cartItems);
    expect(total).toBe(160);
  });

  test('傳入空陣列，總價應該是 0', () => {
    expect(calculateTotalPrice([])).toBe(0);
  });

  test('傳入非陣列，總價應該是 0', () => {
    expect(calculateTotalPrice(null)).toBe(0);
  });
});
