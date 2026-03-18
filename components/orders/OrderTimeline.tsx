import type { Order } from '../../types/domain';
import { statusBadgeClass } from './statusStyles';

export function OrderTimeline({ selectedOrder }: { selectedOrder: Order | null }) {
  if (!selectedOrder?.statusHistory?.length) return null;

  return (
    <div className="steam-panel mt-5 rounded-2xl border border-[#66c0f433] p-5">
      <h2 className="text-xl font-black text-[#d8e6f3]">目前訂單狀態流程</h2>
      <div className="mt-4 space-y-3">
        {selectedOrder.statusHistory.map((node, index) => (
          <div
            key={`${node.status}-${node.at}-${index}`}
            className="rounded-lg border border-[#66c0f433] bg-[#132434] p-3"
          >
            <div className="flex items-center justify-between">
              <span
                className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-bold ${statusBadgeClass(
                  node.status
                )}`}
              >
                {node.status}
              </span>
              <span className="text-xs text-[#8faac0]">{new Date(node.at).toLocaleString()}</span>
            </div>
            {node.note && <p className="mt-1 text-xs text-[#9eb4c8]">{node.note}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
