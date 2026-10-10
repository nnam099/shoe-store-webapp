import { formatPrice, getAssetUrl } from '../../config/site';

/**
 * Maps authoritative backend status enum to customer-facing Vietnamese label.
 * Strictly avoids exposing raw backend enums to the customer.
 */
const STATUS_PRESENTATION = {
  PENDING: {
    label: 'Chờ xử lý',
    badgeClass: 'bg-[#fef3c7] text-[#92400e] border-[#fde68a]',
  },
  PREPARING: {
    label: 'Đang chuẩn bị hàng',
    badgeClass: 'bg-[#e0f2fe] text-[#075985] border-[#bae6fd]',
  },
  SHIPPING: {
    label: 'Đang giao hàng',
    badgeClass: 'bg-[#f3e8ff] text-[#6b21a8] border-[#e9d5ff]',
  },
  DELIVERED: {
    label: 'Đã giao hàng',
    badgeClass: 'bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]',
  },
  COMPLETED: {
    label: 'Hoàn tất',
    badgeClass: 'bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]',
  },
  CANCELLED: {
    label: 'Đã hủy',
    badgeClass: 'bg-[#fef2f2] text-[#991b1b] border-[#fecaca]',
  },
};

/**
 * Deterministic date formatter: DD/MM/YYYY • HH:mm
 */
function formatOrderDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} • ${hours}:${minutes}`;
}

/**
 * OrderDetailCard Component
 * Displays historical snapshot of guest order details and optional cancellation action.
 */
export default function OrderDetailCard({
  order,
  onOpenCancel,
  cancelSuccessMessage,
  cancelErrorMessage,
}) {
  if (!order) return null;

  const statusInfo = STATUS_PRESENTATION[order.status] || {
    label: order.status,
    badgeClass: 'bg-[#f5f5f3] text-[#525252] border-[#e5e5e0]',
  };

  return (
    <div className="bg-white border border-[#e5e5e0] rounded-xs shadow-xs p-6 sm:p-7 space-y-6">
      {/* Cancellation Alerts */}
      {cancelSuccessMessage && (
        <div
          role="status"
          aria-live="polite"
          className="p-4 bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46] text-xs font-bold rounded-xs flex items-center gap-2"
        >
          <svg className="w-4 h-4 shrink-0 text-[#059669]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{cancelSuccessMessage}</span>
        </div>
      )}

      {cancelErrorMessage && (
        <div
          role="alert"
          aria-live="assertive"
          className="p-4 bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-xs font-bold rounded-xs flex items-center gap-2"
        >
          <svg className="w-4 h-4 shrink-0 text-[#dc2626]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{cancelErrorMessage}</span>
        </div>
      )}

      {/* Header: Order Code & Status Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e5e5e0] pb-5">
        <div>
          <span className="block text-[11px] uppercase tracking-wider text-[#737373] font-bold">
            Mã đơn hàng
          </span>
          <span className="text-base sm:text-lg font-black text-[#121212] tracking-wider select-all font-mono">
            {order.orderCode}
          </span>
        </div>

        <div>
          <span className="block text-[11px] uppercase tracking-wider text-[#737373] font-bold mb-1 sm:text-right">
            Trạng thái
          </span>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-xs font-bold text-xs border ${statusInfo.badgeClass}`}
          >
            {statusInfo.label}
          </span>
        </div>
      </div>

      {/* Order Meta Attributes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[#525252] border-b border-[#e5e5e0] pb-5">
        <div>
          <span className="text-[#737373] block mb-0.5">Ngày đặt hàng:</span>
          <span className="font-bold text-[#121212]">
            {formatOrderDate(order.createdAt)}
          </span>
        </div>

        {order.cancelledAt && (
          <div>
            <span className="text-[#737373] block mb-0.5">Ngày hủy:</span>
            <span className="font-bold text-[#991b1b]">
              {formatOrderDate(order.cancelledAt)}
            </span>
          </div>
        )}

        <div>
          <span className="text-[#737373] block mb-0.5">Phương thức thanh toán:</span>
          <span className="font-bold text-[#121212]">
            Thanh toán khi nhận hàng (COD)
          </span>
        </div>
      </div>

      {/* Historical Items List (Read-only) */}
      <div className="space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#121212]">
          Sản phẩm đã đặt ({order.items?.length || 0})
        </h3>

        <div className="divide-y divide-[#f5f5f3]">
          {(order.items || []).map((item, idx) => (
            <div
              key={`${item.productName}-${item.colorwayName}-${item.size}-${idx}`}
              className="py-3.5 flex gap-3.5 items-center"
            >
              {/* Thumbnail */}
              <div className="w-14 h-14 bg-[#f8f8f6] border border-[#ebebe8] rounded-xs shrink-0 flex items-center justify-center overflow-hidden">
                {item.thumbnail ? (
                  <img
                    src={getAssetUrl(item.thumbnail)}
                    alt={`${item.productName} - ${item.colorwayName}`}
                    className="w-full h-full object-contain p-1"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-[9px] text-[#a3a3a3]">STEP/LAB</span>
                )}
              </div>

              {/* Item Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[#121212] truncate">
                  {item.productName}
                </p>
                <p className="text-[11px] text-[#525252] truncate">
                  {item.colorwayName} • EU {item.size}
                </p>
                <div className="flex items-center justify-between mt-1 text-[11px]">
                  <span className="text-[#737373]">
                    {formatPrice(item.unitPrice)} × {item.quantity}
                  </span>
                  <span className="font-extrabold text-[#121212]">
                    {formatPrice(item.lineTotal)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing Breakdown */}
      <div className="border-t border-[#e5e5e0] pt-4 space-y-2.5 text-xs">
        <div className="flex justify-between text-[#525252]">
          <span>Tạm tính:</span>
          <span className="font-bold text-[#121212]">{formatPrice(order.subtotal)}</span>
        </div>

        <div className="flex justify-between text-[#525252]">
          <span>Phí vận chuyển:</span>
          <span className="font-bold text-[#121212]">{formatPrice(order.shippingFee)}</span>
        </div>

        <div className="border-t border-[#e5e5e0] pt-3 flex justify-between items-baseline">
          <span className="font-extrabold text-[#121212] uppercase tracking-wider">
            Tổng thanh toán:
          </span>
          <span className="text-lg font-black text-[#121212] tracking-tight">
            {formatPrice(order.total)}
          </span>
        </div>
      </div>

      {/* Cancellation Action (Rendered ONLY if order.cancellable === true) */}
      {order.cancellable && (
        <div className="border-t border-[#e5e5e0] pt-5 flex justify-end">
          <button
            type="button"
            onClick={onOpenCancel}
            className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 border border-[#dc2626] text-[#dc2626] hover:bg-[#dc2626] hover:text-white text-xs font-bold uppercase tracking-wider rounded-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>Hủy đơn hàng</span>
          </button>
        </div>
      )}
    </div>
  );
}
