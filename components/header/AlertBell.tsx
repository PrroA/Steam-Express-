import { FaBell } from 'react-icons/fa';
import { AlertDropdown } from './AlertDropdown';

export function AlertBell({
  unreadCount,
  isAlertOpen,
  onToggle,
  alerts,
  onClose,
  mobile = false,
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={`relative rounded-md border bg-[#1b2b3a] text-[#d8e6f3] ${
          mobile
            ? 'border-[#66c0f455] p-2'
            : 'border-[#66c0f433] px-3 py-2 transition hover:border-[#66c0f488] hover:bg-[#24384d]'
        }`}
        aria-label="降價通知"
      >
        <FaBell className={mobile ? 'h-5 w-5' : 'h-4 w-4'} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-[#8bc53f] px-1.5 text-center text-[11px] font-bold text-[#0f1924]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isAlertOpen && <AlertDropdown alerts={alerts} onClose={onClose} mobile={mobile} />}
    </div>
  );
}
