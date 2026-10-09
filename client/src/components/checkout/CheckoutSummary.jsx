import { Link } from 'react-router-dom';
import { formatPrice, getAssetUrl } from '../../config/site';

/**
 * CheckoutSummary Component
 * Displays read-only order summary derived strictly from authoritative server quote.
 * Provides a link back to /cart if customer needs to edit items.
 */
function CheckoutSummary({ quote, loading }) {
  if (loading || !quote) {
    return (
      <div className="bg-white border border-[#e5e5e0] p-6 rounded-xs shadow-2xs space-y-4 animate-pulse">
        <div className="h-4 bg-[#f0f0ee] rounded-xs w-1/3 mb-4" />
        <div className="space-y-3">
          <div className="h-16 bg-[#f7f7f5] rounded-xs" />
          <div className="h-16 bg-[#f7f7f5] rounded-xs" />
        </div>
        <div className="border-t border-[#e5e5e0] pt-4 space-y-2">
          <div className="h-3 bg-[#f0f0ee] rounded-xs w-1/2" />
          <div className="h-3 bg-[#f0f0ee] rounded-xs w-1/3" />
          <div className="h-5 bg-[#f0f0ee] rounded-xs w-2/3 mt-2" />
        </div>
      </div>
    );
  }

  const { items = [], subtotal = 0, shippingFee = 0, total = 0 } = quote;

  return (
    <div className="bg-white border border-[#e5e5e0] p-6 rounded-xs shadow-2xs space-y-6">
      {/* Header with Edit Cart Link */}
      <div className="flex items-center justify-between border-b border-[#e5e5e0] pb-3">
        <h2 className="text-xs font-extrabold uppercase tracking-widest text-[#121212]">
          Đơn hàng của bạn
        </h2>
        <Link
          to="/cart"
          className="text-[11px] font-bold uppercase tracking-wider text-[#991b1b] hover:text-[#7f1d1d] hover:underline"
        >
          Chỉnh sửa giỏ hàng
        </Link>
      </div>

      {/* Read-Only Items List */}
      <div className="divide-y divide-[#f5f5f3] max-h-[380px] overflow-y-auto pr-1">
        {items.map((item, idx) => (
          <div key={`${item.productSlug}-${item.colorwaySlug}-${item.size}-${idx}`} className="py-3 flex gap-3.5 items-center">
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
              <h3 className="text-xs font-bold text-[#121212] truncate">
                {item.productName}
              </h3>
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

      {/* Pricing Breakdown */}
      <div className="border-t border-[#e5e5e0] pt-4 space-y-3 text-xs">
        <div className="flex justify-between items-center text-[#525252]">
          <span>Tạm tính:</span>
          <span className="font-bold text-[#121212]">{formatPrice(subtotal)}</span>
        </div>

        <div className="flex justify-between items-center text-[#525252]">
          <span>Phí vận chuyển:</span>
          <span className="font-bold text-[#121212]">{formatPrice(shippingFee)}</span>
        </div>

        <div className="border-t border-[#e5e5e0] pt-3 flex justify-between items-baseline">
          <div>
            <span className="block text-xs font-extrabold uppercase tracking-wider text-[#121212]">
              Tổng thanh toán:
            </span>
            <span className="text-[10px] text-[#737373]">(Đã bao gồm VAT và phí COD)</span>
          </div>
          <span className="text-lg font-black text-[#121212] tracking-tight">
            {formatPrice(total)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default CheckoutSummary;
