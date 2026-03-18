import { FaCheckCircle } from 'react-icons/fa';

export function PaymentSuccessBanner({ successOrderId }: { successOrderId: string }) {
  return (
    <div className="mt-4 rounded-xl border border-[#8bc53f55] bg-[#183126] p-4">
      <div className="flex items-start gap-3">
        <FaCheckCircle className="mt-0.5 text-[#8bc53f]" />
        <div>
          <p className="text-sm font-bold text-[#cde8a5]">付款成功</p>
          <p className="mt-1 text-xs text-[#b5d7be]">
            訂單 {successOrderId ? successOrderId.slice(0, 8) : ''} 已完成付款，你可以在下方查看完整狀態流程。
          </p>
        </div>
      </div>
    </div>
  );
}
