import { Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

export function NotificationBell() {
  const { isAdmin } = useAuth();
  const { unreadPublicCount, unreadAdminCount, popupOpen, toggleNotificationPopup } =
    useNotifications();

  const totalBadgeCount = isAdmin ? unreadPublicCount + unreadAdminCount : unreadPublicCount;

  return (
    <button
      type="button"
      onClick={toggleNotificationPopup}
      aria-label={`Notifications${totalBadgeCount > 0 ? ` (${totalBadgeCount} unread)` : ''}`}
      aria-expanded={popupOpen}
      aria-haspopup="dialog"
      className="relative inline-flex items-center justify-center min-w-[40px] min-h-[40px] rounded-lg border border-transparent text-[#5C5355] hover:text-[#1F1B1C] hover:bg-[#FCF9F6] hover:border-[#E8E0DF] transition-colors cursor-pointer"
    >
      <Bell className="w-4 h-4" />
      {totalBadgeCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#8E3F4F] text-white text-[10px] font-semibold tabular-nums flex items-center justify-center">
          {totalBadgeCount > 9 ? '9+' : totalBadgeCount}
        </span>
      )}
    </button>
  );
}
