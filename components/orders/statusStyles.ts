export const statusClasses: Record<string, string> = {
  已付款: 'bg-[#1f3b2a] text-[#8bc53f] border-[#8bc53f55]',
  未付款: 'bg-[#3f3318] text-[#ffd079] border-[#ffd07955]',
  付款失敗: 'bg-[#4a202a] text-[#ff9e9e] border-[#ff9e9e55]',
  已取消: 'bg-[#2d3642] text-[#9fb4c6] border-[#9fb4c655]',
  已退款: 'bg-[#22384a] text-[#9ed8ff] border-[#9ed8ff55]',
};

export function statusBadgeClass(status?: string) {
  if (!status) return 'bg-[#2d3642] text-[#9fb4c6] border-[#9fb4c655]';
  return statusClasses[status] || 'bg-[#2d3642] text-[#9fb4c6] border-[#9fb4c655]';
}
