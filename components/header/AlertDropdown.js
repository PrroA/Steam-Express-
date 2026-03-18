import Link from 'next/link';

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

export function AlertDropdown({ alerts, onClose, mobile = false }) {
  return (
    <div
      className={`absolute right-0 top-[110%] w-[320px] rounded-xl border border-[#66c0f444] bg-[#142636] p-3 shadow-2xl ${
        mobile ? 'max-w-[84vw]' : ''
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-bold text-[#d8e6f3]">降價通知</p>
        <Link href="/wishlist" onClick={onClose} className="text-xs text-[#66c0f4] hover:underline">
          查看願望清單
        </Link>
      </div>

      {alerts.length === 0 ? (
        <p className="rounded-lg border border-[#66c0f422] bg-[#101d2a] px-3 py-4 text-sm text-[#9eb4c8]">
          目前沒有新的通知。
        </p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((alert) => (
            <li key={`${alert.id}-${alert.createdAt}`} className="rounded-lg border border-[#66c0f433] bg-[#101d2a] p-3">
              <p className="line-clamp-1 text-sm font-semibold text-[#d8e6f3]">
                {alert.title || alert.name || '通知'}
              </p>
              <p className="mt-1 text-xs text-[#9ec5df]">
                {alert.type === 'wishlist-price-drop' ? (
                  <>
                    ${Number(alert.previousPrice ?? alert.payload?.previousPrice ?? 0).toFixed(2)} →{' '}
                    <span className="font-bold text-[#8bc53f]">
                      ${Number(alert.currentPrice ?? alert.payload?.currentPrice ?? 0).toFixed(2)}
                    </span>
                  </>
                ) : (
                  alert.message || '有新的狀態更新'
                )}
              </p>
              <p className="mt-1 text-[11px] text-[#7f9ab0]">{formatAlertTime(alert.createdAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
