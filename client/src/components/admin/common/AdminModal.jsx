import { useEffect, useRef } from 'react';

/**
 * AdminModal — Reusable accessible modal/dialog for Admin area.
 * Traps focus, closes on Escape or backdrop click.
 */
export default function AdminModal({ isOpen, onClose, title, children, size = 'md', danger = false }) {
  const overlayRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const prevFocus = document.activeElement;
    const el = contentRef.current;
    if (el) {
      const focusable = el.querySelector('button, input, textarea, select, [tabindex]:not([tabindex="-1"])');
      if (focusable) focusable.focus();
    }
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
      if (prevFocus?.focus) prevFocus.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClass = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }[size] || 'max-w-lg';

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        ref={contentRef}
        className={`relative w-full ${sizeClass} bg-white shadow-2xl flex flex-col max-h-[90vh]`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between border-b px-6 py-4 ${danger ? 'border-[#fca5a5]' : 'border-[#e5e5e0]'}`}>
          <h2 className={`text-sm font-bold uppercase tracking-wider ${danger ? 'text-[#991b1b]' : 'text-[#121212]'}`}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#9ca3af] hover:text-[#121212] transition-colors"
            aria-label="Đóng"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}
