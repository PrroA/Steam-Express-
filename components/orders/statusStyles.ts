import {
  ORDER_STATUS,
  getOrderStatusLabel,
  normalizeOrderStatus,
  type OrderStatus,
} from '../../utils/orderStatus';

export const statusClasses: Record<OrderStatus, string> = {
  [ORDER_STATUS.PAID]: 'bg-[#1f3b2a] text-[#8bc53f] border-[#8bc53f55]',
  [ORDER_STATUS.PENDING]: 'bg-[#3f3318] text-[#ffd079] border-[#ffd07955]',
  [ORDER_STATUS.PAYMENT_FAILED]: 'bg-[#4a202a] text-[#ff9e9e] border-[#ff9e9e55]',
  [ORDER_STATUS.CANCELLED]: 'bg-[#2d3642] text-[#9fb4c6] border-[#9fb4c655]',
  [ORDER_STATUS.REFUNDED]: 'bg-[#22384a] text-[#9ed8ff] border-[#9ed8ff55]',
};

export function statusBadgeClass(status?: string) {
  return statusClasses[normalizeOrderStatus(status)];
}

export { getOrderStatusLabel };
