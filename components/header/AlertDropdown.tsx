import Link from 'next/link';
import { useMemo } from 'react';

function formatAlertTime(isoString) {
  if (!isoString) return '剛剛';
  const diffMs = Date.now() - new Date(isoString).getTime();
  if (Number.isNaN(diffMs) || diffMs < 60 * 1000) return '剛剛';
  const diffMin = Math.floor(diffMs / (60 * 1000));
  if (diffMin < 60) return `${diffMin} 分鐘前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} 小時前`;
  return `${Math.floor(diffHour / 24)} 天前`;
}

function getAlertHref(alert) {
  if (!alert) return '/orders';
  const orderId = alert?.payload?.orderId;
  if (orderId) return `/orders/${orderId}?fromAlert=1`;
  return '/orders';
}

export function AlertDropdown({
  alerts,
  onClose,
  onMarkRead,
  onClearAlerts,
  onRemoveAlert,
  onMarkSingleRead,
  mobile = false,
}) {
  const orderAlerts = useMemo(
    () => alerts.filter((alert) => alert.type === 'order-status' || alert.type === 'order-fulfillment'),
    [alerts]
  );
  const unreadCount = useMemo(() => orderAlerts.filter((item) => item.unread).length, [orderAlerts]);

  return (
    <div
      className={`absolute right-0 top-[110%] w-[320px] rounded-xl border border-[#66c0f444] bg-[#142636] p-3 shadow-2xl ${
        mobile ? 'max-w-[84vw]' : ''
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-bold text-[#d8e6f3]">訂單通知</p>
        <Link href="/orders" onClick={onClose} className="text-xs text-[#66c0f4] hover:underline">
          查看訂單
        </Link>
      </div>

      <div className="mb-2 flex items-center justify-between rounded-lg border border-[#66c0f433] bg-[#101d2a] px-2 py-1.5 text-[11px] text-[#9eb4c8]">
        <span>未讀 {unreadCount}</span>
        <div className="flex gap-2">
          <button type="button" onClick={() => onMarkRead?.('order-group')} className="text-[#8fd1ff] hover:underline">
            全部已讀
          </button>
          <button type="button" onClick={() => onClearAlerts?.('order-group')} className="text-[#ffb5b5] hover:underline">
            清空
          </button>
        </div>
      </div>

      {orderAlerts.length === 0 ? (
        <p className="rounded-lg border border-[#66c0f422] bg-[#101d2a] px-3 py-4 text-sm text-[#9eb4c8]">
          目前沒有新的訂單通知。
        </p>
      ) : (
        <ul className="space-y-2">
          {orderAlerts.map((alert) => (
            <li
              key={`${alert.id}-${alert.createdAt}`}
              className={`rounded-lg border p-3 ${
                alert.unread ? 'border-[#66c0f488] bg-[#11283b]' : 'border-[#66c0f433] bg-[#101d2a]'
              }`}
            >
              <div className="mb-1 flex items-start justify-end">
                <button
                  type="button"
                  onClick={() => onRemoveAlert?.(alert.id, alert.createdAt)}
                  className="rounded border border-[#66c0f433] px-1.5 py-0.5 text-[10px] text-[#9eb4c8] transition hover:bg-[#1a3044]"
                >
                  x
                </button>
              </div>
              <Link
                href={getAlertHref(alert)}
                onClick={() => {
                  onMarkSingleRead?.(alert.id, alert.createdAt);
                  onClose?.();
                }}
                className="block rounded-md p-1 transition hover:bg-[#1a3044]"
              >
                <p className="line-clamp-1 text-sm font-semibold text-[#d8e6f3]">{alert.title || '訂單狀態更新'}</p>
                <p className="mt-1 text-xs text-[#9ec5df]">{alert.message || '你的訂單狀態有更新。'}</p>
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-[11px] text-[#7f9ab0]">{formatAlertTime(alert.createdAt)}</p>
                  <div className="flex items-center gap-2">
                    {alert.unread && (
                      <span className="rounded-full bg-[#8bc53f] px-1.5 py-0.5 text-[10px] font-bold text-[#0f1924]">
                        NEW
                      </span>
                    )}
                    <span className="text-[11px] font-semibold text-[#8fd1ff]">查看</span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
