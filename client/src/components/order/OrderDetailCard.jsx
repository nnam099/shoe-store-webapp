import { formatPrice, getAssetUrl } from '../../config/site';
import {
  formatOrderDateTime,
  getOrderTotalLabel,
  getOrderStatusPresentation,
  isCancelledOrder,
} from '../../utils/orderPresentation';
import OrderTimeline from './OrderTimeline';

/**
 * OrderDetailCard Component
 * Displays historical snapshot of guest order details and optional cancellation action.
 */
export default function OrderDetailCard({
  order,
  onOpenCancel,
  onOpenConfirm,
  cancelButtonRef,
  confirmButtonRef,
  lifecycleMessage,
  lifecycleTone = 'success',
  refreshErrorMessage,
  onRetryRefresh,
  refreshing,
  actionsAvailable = true,
}) {
  if (!order) return null;

  const statusInfo = getOrderStatusPresentation(order.status);
  const cancelled = isCancelledOrder(order.status);

  return (
    <div className="bg-white border border-[#e5e5e0] rounded-xs shadow-xs p-6 sm:p-7 space-y-6">
      {/* Lifecycle status alerts */}
      {lifecycleMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`flex items-center gap-2 rounded-xs border p-4 text-xs font-bold ${
            lifecycleTone === 'warning'
              ? 'border-[#fde68a] bg-[#fffbeb] text-[#92400e]'
              : 'border-[#a7f3d0] bg-[#ecfdf5] text-[#065f46]'
          }`}
        >
          <span>{lifecycleMessage}</span>
        </div>
      )}

      {refreshErrorMessage && (
        <div
          role="alert"
          className="rounded-xs border border-[#fecaca] bg-[#fef2f2] p-4 text-xs font-bold text-[#b91c1c]"
        >
          <p>{refreshErrorMessage}</p>
          <button
            type="button"
            onClick={onRetryRefresh}
            disabled={refreshing}
            className="mt-3 min-h-[38px] border border-current px-4 text-[11px] uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-50"
          >
            {refreshing ? 'Đang tải...' : 'Thử lại'}
          </button>
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
            {formatOrderDateTime(order.createdAt)}
          </span>
        </div>

        {order.cancelledAt && (
          <div>
            <span className="text-[#737373] block mb-0.5">Ngày hủy:</span>
            <span className="font-bold text-[#991b1b]">
              {formatOrderDateTime(order.cancelledAt)}
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

      {/* Authoritative order status history */}
      <div className="border-t border-[#e5e5e0] pt-5">
        <OrderTimeline timeline={order.timeline} />
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
            {getOrderTotalLabel(order.status)}:
          </span>
          <span className="text-lg font-black text-[#121212] tracking-tight">
            {formatPrice(order.total)}
          </span>
        </div>
        {cancelled && (
          <p className="border-t border-[#e5e5e0] pt-3 text-[11px] font-bold text-[#991b1b]">
            Đơn hàng đã hủy • Không cần thanh toán
          </p>
        )}
      </div>

      {/* Lifecycle actions require a currently verified, authoritative result. */}
      {actionsAvailable && (order.cancellable || order.confirmable) && (
        <div className="flex flex-col justify-end gap-2.5 border-t border-[#e5e5e0] pt-5 sm:flex-row">
          {order.cancellable && (
            <button
              ref={cancelButtonRef}
              type="button"
              onClick={onOpenCancel}
              className="flex min-h-[44px] w-full items-center justify-center rounded-xs border border-[#dc2626] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-[#dc2626] transition-colors hover:bg-[#dc2626] hover:text-white sm:w-auto"
            >
              Hủy đơn hàng
            </button>
          )}
          {order.confirmable && (
            <button
              ref={confirmButtonRef}
              type="button"
              onClick={onOpenConfirm}
              className="flex min-h-[44px] w-full items-center justify-center rounded-xs bg-[#121212] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#991b1b] sm:w-auto"
            >
              Đã nhận hàng
            </button>
          )}
        </div>
      )}
    </div>
  );
}
