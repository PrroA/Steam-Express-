import type { CartItem } from '../types/domain';

/**
 * 計算購物車總價
 */
export function calculateTotalPrice(cartItems: CartItem[] | null | undefined): number {
  if (!Array.isArray(cartItems)) return 0;

  return cartItems.reduce((sum, item) => {
    return sum + parseFloat(item.price.replace('$', '')) * item.quantity;
  }, 0);
}
