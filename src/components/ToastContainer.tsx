import { AlertCircle, Bell, CheckCircle2, X } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

export function ToastContainer() {
  const { toasts, dismissToast } = useNotifications();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)] pointer-events-none"
    >
      {toasts.map((toast) => {
        const isError = toast.variant === 'error';
        const isSuccess = toast.variant === 'success';

        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto bg-white border rounded-xl shadow-lg p-3.5 flex items-start gap-3 transition-all ${
              isError
                ? 'border-[#E8B4B8]'
                : isSuccess
                  ? 'border-[#C59B43]/70'
                  : 'border-[#E8E0DF]'
            }`}
          >
            <div
              className={`mt-0.5 shrink-0 ${
                isError ? 'text-[#8E3F4F]' : isSuccess ? 'text-[#C59B43]' : 'text-[#8E3F4F]'
              }`}
            >
              {isError ? (
                <AlertCircle className="w-4 h-4" />
              ) : isSuccess ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#1F1B1C] leading-snug">{toast.title}</p>
              {toast.message && (
                <p className="text-xs text-[#5C5355] mt-0.5 leading-relaxed break-words">
                  {toast.message}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="p-1 text-[#5C5355] hover:text-[#1F1B1C] rounded cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
