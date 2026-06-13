import type { AdminPaymentAudits, AdminPaymentAuditEvent } from '../../services/adminService';

interface PaymentAuditPanelProps {
  audits: AdminPaymentAudits | null;
}

const statusLabels: Record<AdminPaymentAuditEvent['status'], { label: string; className: string }> = {
  succeeded: {
    label: '成功',
    className: 'border-[#8bc53f55] bg-[#172b20] text-[#b7f0a2]',
  },
  failed: {
    label: '未成功',
    className: 'border-[#ff7a7a55] bg-[#2d1c1f] text-[#ffb3b3]',
  },
  ignored: {
    label: '已略過',
    className: 'border-[#ffcf5a55] bg-[#2c2617] text-[#ffe0a6]',
  },
};

function formatPaymentSource(event: AdminPaymentAuditEvent) {
  if (event.source === 'demo-quick-pay') return '快速付款';
  if (event.source === 'stripe-confirm-api') return '信用卡付款確認';
  return '信用卡付款';
}

function formatReason(reason: string) {
  const labels: Record<string, string> = {
    'demo-paid': '付款完成',
    'demo-payment-failed': '付款未成功',
    'already-paid': '訂單已付款',
    'order-not-payable': '訂單目前不需付款',
    'marked-paid': '付款完成',
    'marked-payment-failed': '付款未成功',
    'order-not-found': '找不到對應訂單',
    'missing-order-id': '缺少訂單資訊',
    'order-not-pending': '訂單狀態已變更',
  };
  return labels[reason] || '未分類紀錄';
}

function formatShortOrderId(orderId: string | null) {
  if (!orderId) return '無訂單';
  return `#${orderId.slice(-6)}`;
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '時間不明';
  return date.toLocaleString();
}

export function PaymentAuditPanel({ audits }: PaymentAuditPanelProps) {
  const events = audits?.events || [];

  return (
    <section data-testid="admin-payment-audit-panel" className="steam-panel mt-5 rounded-2xl p-5 md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-[#8fb8d5]">付款紀錄</p>
          <h2 className="mt-1 text-xl font-black text-[#d8e6f3]">最近付款處理</h2>
        </div>
        <p className="text-xs text-[#8faac0]">快速確認最近付款是否順利，方便追訂單問題。</p>
      </div>

      <div className="mt-4 space-y-2">
        {events.length > 0 ? (
          events.slice(0, 5).map((event) => {
            const status = statusLabels[event.status];
            const key = [
              event.createdAt,
              event.orderId || 'unknown-order',
              event.providerPaymentId || 'unknown-payment',
              event.reason,
            ].join('-');
            return (
              <article
                key={key}
                className="grid gap-3 rounded-xl border border-[#66c0f433] bg-[#102131] p-3 md:grid-cols-[1fr_auto]"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${status.className}`}>
                      {status.label}
                    </span>
                    <p className="text-sm font-black text-[#d8e6f3]">
                      {formatPaymentSource(event)} · {formatShortOrderId(event.orderId)}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-[#9eb4c8]">{formatReason(event.reason)}</p>
                </div>
                <div className="text-left text-xs text-[#8faac0] md:text-right">
                  <p>{formatTime(event.createdAt)}</p>
                  {event.userId && <p className="mt-1">使用者 {event.userId}</p>}
                </div>
              </article>
            );
          })
        ) : (
          <p className="rounded-xl border border-[#66c0f433] bg-[#102131] p-4 text-sm text-[#9eb4c8]">
            目前還沒有付款紀錄。完成快速付款或信用卡付款後，這裡會顯示最近狀態。
          </p>
        )}
      </div>
    </section>
  );
}
