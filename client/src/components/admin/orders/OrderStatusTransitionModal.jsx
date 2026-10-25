const STATUS_NAMES = {
  PENDING: 'Chờ xử lý',
  PREPARING: 'Đang chuẩn bị',
  SHIPPING: 'Đang giao hàng',
  DELIVERED: 'Đã giao hàng',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

export default function OrderStatusTransitionModal({
  isOpen,
  onClose,
  onConfirm,
  currentStatus,
  targetStatus,
  isSubmitting,
  orderCode,
}) {
  if (!isOpen) return null;

  const isCancel = targetStatus === 'CANCELLED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={!isSubmitting ? onClose : undefined}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md border border-[#2a2a2a] bg-white p-6 shadow-2xl">
        {/* Title */}
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              isCancel ? 'bg-[#fee2e2] text-[#dc2626]' : 'bg-[#e0e7ff] text-[#4f46e5]'
            }`}
          >
            {isCancel ? (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div>
            <h3 className="text-base font-bold text-[#121212]">
              {isCancel ? 'Xác nhận hủy đơn hàng' : 'Xác nhận chuyển trạng thái đơn hàng'}
            </h3>
            <p className="font-mono text-xs text-[#6b7280]">
              Mã đơn: <span className="font-semibold text-[#121212]">{orderCode}</span>
            </p>
          </div>
        </div>

        {/* Transition Details */}
        <div className="mt-4 rounded-xs border border-[#e5e7eb] bg-[#f9fafb] p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#6b7280]">Trạng thái hiện tại:</span>
            <span className="font-semibold text-[#121212]">{STATUS_NAMES[currentStatus] || currentStatus}</span>
          </div>
          <div className="mt-2 flex items-center justify-center text-[#9ca3af]">
            ↓
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-[#e5e7eb] pt-2">
            <span className="text-[#6b7280]">Trạng thái mới:</span>
            <span className={`font-bold ${isCancel ? 'text-[#dc2626]' : 'text-[#1d4ed8]'}`}>
              {STATUS_NAMES[targetStatus] || targetStatus}
            </span>
          </div>
        </div>

        {/* Cancellation Warning Banner */}
        {isCancel && (
          <div className="mt-4 rounded-xs border border-[#fecaca] bg-[#fef2f2] p-3 text-xs text-[#991b1b]">
            <p className="font-bold flex items-center gap-1.5">
              <span>⚠️ CẢNH BÁO QUAN TRỌNG:</span>
            </p>
            <p className="mt-1 leading-relaxed">
              Khi đơn hàng bị hủy, toàn bộ số lượng tồn kho của các sản phẩm trong đơn sẽ được <strong>tự động hoàn lại vào kho</strong>. Hành động này không thể hoàn tác!
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="border border-[#d1d5db] px-4 py-2 text-xs font-semibold text-[#374151] hover:bg-[#f3f4f6] disabled:opacity-50 transition-colors"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50 transition-colors ${
              isCancel
                ? 'bg-[#dc2626] hover:bg-[#b91c1c]'
                : 'bg-[#121212] hover:bg-[#262626]'
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Đang xử lý...
              </span>
            ) : isCancel ? (
              'Xác nhận hủy đơn'
            ) : (
              'Xác nhận chuyển'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
