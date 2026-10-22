import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * AdminToastContainer — Renders toast notifications for Admin area.
 * Place once at top of AdminLayout.
 */
export function AdminToastContainer({ toasts, onDismiss }) {
  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((toast) => (
        <AdminToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function AdminToastItem({ toast, onDismiss }) {
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(timerRef.current);
  }, [toast.id, onDismiss]);

  const colorClass =
    toast.type === 'success'
      ? 'bg-[#166534] border-[#15803d]'
      : toast.type === 'error'
        ? 'bg-[#991b1b] border-[#7f1d1d]'
        : 'bg-[#1c1c1c] border-[#374151]';

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 border px-4 py-3 text-white shadow-xl min-w-[280px] max-w-sm ${colorClass}`}
      role="alert"
    >
      <span className="mt-0.5 shrink-0 text-sm font-bold leading-none">
        {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}
      </span>
      <p className="flex-1 text-xs leading-relaxed">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 opacity-70 hover:opacity-100 transition-opacity ml-2"
        aria-label="Đóng thông báo"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

let _nextId = 1;

/**
 * useToasts — Hook providing toast state management.
 * Returns: { toasts, addToast(type, message), dismissToast(id) }
 */
export function useToasts() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((first, second) => {
    let type = 'info';
    let message = '';
    if (['success', 'error', 'info'].includes(first)) {
      type = first;
      message = second || '';
    } else if (['success', 'error', 'info'].includes(second)) {
      type = second;
      message = first || '';
    } else {
      message = String(first || '');
    }
    const id = _nextId;
    _nextId += 1;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, dismissToast };
}
