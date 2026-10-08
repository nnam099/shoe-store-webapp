import { useEffect } from 'react';
import { SIZES } from '../../data/catalog';

/**
 * SizeGuideModal Component
 * Displays factual neutral size information based strictly on locked EU 36-44 sizes.
 * Does not invent unverified cm / US / UK conversion charts.
 */
function SizeGuideModal({ isOpen, onClose }) {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="size-guide-title"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-white border border-[#e5e5e0] p-6 sm:p-8 rounded-xs shadow-2xl z-10 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#e5e5e0]">
          <h2
            id="size-guide-title"
            className="text-base sm:text-lg font-extrabold uppercase tracking-tight text-[#121212]"
          >
            Hướng dẫn chọn size
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hướng dẫn"
            className="p-1.5 text-[#737373] hover:text-[#121212] transition-colors rounded-xs cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 text-xs text-[#525252] leading-relaxed">
          <p className="font-medium text-[#121212]">
            STEP/LAB hiện áp dụng chuẩn kích cỡ <strong>EU 36 – EU 44</strong> cho toàn bộ các dòng sản phẩm giày thể thao và streetwear.
          </p>

          <p>
            Hãy chọn kích cỡ EU bạn thường sử dụng với mẫu giày tương tự từ thương hiệu bạn dự định mua.
          </p>

          {/* Dải size có sẵn */}
          <div className="pt-2">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-[#121212] mb-2">
              Các kích cỡ hiện có tại cửa hàng:
            </span>
            <div className="grid grid-cols-5 gap-2 select-none">
              {SIZES.map((sz) => (
                <div
                  key={sz}
                  className="py-2 px-1 bg-[#f5f5f3] border border-[#e5e5e0] text-center text-xs font-bold text-[#121212] rounded-xs"
                >
                  EU {sz}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-[#f0f0ed] text-[11px] text-[#737373]">
            <p>
              * Bảng quy đổi theo chiều dài bàn chân / US / UK sẽ được bổ sung khi có dữ liệu được xác nhận chính thức từ từng hãng.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-[#e5e5e0] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-6 bg-[#121212] hover:bg-[#262626] text-white text-xs font-bold uppercase tracking-wider rounded-xs transition-colors cursor-pointer"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
}

export default SizeGuideModal;
