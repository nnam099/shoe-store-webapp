import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export default function OrderActionDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  pendingLabel,
  tone = 'primary',
  busy,
  onClose,
  onConfirm,
  returnFocusRef,
}) {
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const previousFocusRef = useRef(null);
  const busyRef = useRef(busy);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    previousFocusRef.current = document.activeElement;
    const returnTarget = returnFocusRef?.current || previousFocusRef.current;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => cancelRef.current?.focus());

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !busyRef.current) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = [...(dialogRef.current?.querySelectorAll(FOCUSABLE_SELECTOR) || [])];
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      requestAnimationFrame(() => returnTarget?.focus?.());
    };
  }, [isOpen, returnFocusRef]);

  if (!isOpen) return null;

  const isDanger = tone === 'danger';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-action-dialog-title"
        aria-describedby="order-action-dialog-description"
        tabIndex={-1}
        className="w-full max-w-md border border-[#d4d4ce] bg-white p-6 shadow-xl"
      >
        <div
          aria-hidden="true"
          className={`flex h-11 w-11 items-center justify-center border ${
            isDanger
              ? 'border-[#fecaca] bg-[#fef2f2] text-[#991b1b]'
              : 'border-[#d4d4ce] bg-[#121212] text-white'
          }`}
        >
          <span className="text-lg font-black">{isDanger ? '!' : '✓'}</span>
        </div>
        <h2
          id="order-action-dialog-title"
          className="mt-5 text-base font-extrabold uppercase tracking-wide text-[#121212]"
        >
          {title}
        </h2>
        <p
          id="order-action-dialog-description"
          className="mt-2 text-xs leading-5 text-[#525252]"
        >
          {description}
        </p>

        <div className="mt-7 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            disabled={busy}
            className="min-h-[44px] border border-[#d4d4ce] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#121212] transition-colors hover:bg-[#f5f5f3] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Quay lại
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`min-h-[44px] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors disabled:cursor-not-allowed disabled:bg-[#a3a3a3] ${
              isDanger ? 'bg-[#991b1b] hover:bg-[#7f1d1d]' : 'bg-[#121212] hover:bg-[#991b1b]'
            }`}
          >
            {busy ? pendingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
