import { useEffect } from 'react';

/**
 * CancelConfirmDialog Component
 * Accessible modal dialog for confirming guest order cancellation.
 * Prevents accidental single-click cancellations.
 */
export default function CancelConfirmDialog({ isOpen, onClose, onConfirm, cancelling }) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !cancelling) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, cancelling, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-dialog-title"
      aria-describedby="cancel-dialog-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs transition-opacity"
    >
      <div className="bg-white border border-[#e5e5e0] rounded-xs shadow-xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="space-y-2">
          <div className="w-11 h-11 rounded-full bg-[#fef2f2] text-[#991b1b] flex items-center justify-center mb-3">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2
            id="cancel-dialog-title"
            className="text-base font-extrabold text-[#121212] uppercase tracking-wide"
          >
            Hủy đơn hàng này?
          </h2>
          <p
            id="cancel-dialog-desc"
            className="text-xs text-[#525252] leading-relaxed"
          >
            Đơn hàng sẽ được hủy và không thể tiếp tục xử lý sau khi xác nhận.
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={cancelling}
            className="min-h-[44px] px-5 py-2.5 border border-[#d4d4ce] hover:bg-[#f5f5f3] text-[#121212] text-xs font-bold uppercase tracking-wider rounded-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            Giữ đơn hàng
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={cancelling}
            className="min-h-[44px] px-5 py-2.5 bg-[#991b1b] hover:bg-[#7f1d1d] text-white text-xs font-bold uppercase tracking-wider rounded-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:bg-[#a3a3a3] disabled:cursor-not-allowed"
          >
            {cancelling ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                <span>Đang hủy...</span>
              </>
            ) : (
              <span>Xác nhận hủy</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
