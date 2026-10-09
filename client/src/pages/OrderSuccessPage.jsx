import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getOrderConfirmation } from '../utils/checkoutSession';
import { formatPrice } from '../config/site';

export default function OrderSuccessPage() {
  const { orderCode } = useParams();
  const confirmation = getOrderConfirmation();
  const [copied, setCopied] = useState(false);

  // Validate session confirmation against the current URL route param
  const isValidSession = confirmation && confirmation.orderCode === orderCode;

  const handleCopyCode = async () => {
    if (!orderCode) return;
    try {
      await navigator.clipboard.writeText(orderCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  if (!isValidSession) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-14 h-14 rounded-full bg-[#f5f5f3] text-[#737373] flex items-center justify-center mx-auto">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="text-lg font-bold text-[#121212]">
            Không có thông tin xác nhận đơn hàng cho phiên này.
          </h1>
          <p className="text-xs text-[#737373] leading-relaxed">
            Nếu bạn vừa hoàn tất đặt hàng, vui lòng kiểm tra lại thiết bị hoặc truy cập lại từ giỏ hàng.
          </p>
        </div>

        <div className="pt-2">
          <Link
            to="/products"
            className="inline-flex items-center justify-center min-h-[44px] px-6 py-2.5 bg-[#121212] hover:bg-[#262626] text-white text-xs font-bold uppercase tracking-wider rounded-xs transition-colors"
          >
            Về trang sản phẩm
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      {/* Success Badge & Title */}
      <div className="text-center space-y-3 mb-10">
        <div className="w-16 h-16 rounded-full bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0] flex items-center justify-center mx-auto shadow-2xs">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#121212]">
          Đặt hàng thành công
        </h1>
        <p className="text-xs text-[#525252] max-w-md mx-auto leading-relaxed">
          Cảm ơn bạn đã mua sắm tại STEP/LAB. Đơn hàng của bạn đã được ghi nhận vào hệ thống và đang chờ xử lý giao hàng.
        </p>
      </div>

      {/* Order Details Card */}
      <div className="bg-white border border-[#e5e5e0] rounded-xs p-6 sm:p-7 shadow-xs space-y-6 mb-8">
        {/* Order Code Callout */}
        <div className="p-4 bg-[#f8f8f6] border border-[#e6e6e2] rounded-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <span className="block text-[11px] uppercase tracking-wider text-[#737373] font-bold">
              Mã đơn hàng
            </span>
            <span className="text-base sm:text-lg font-black text-[#121212] tracking-wider select-all font-mono">
              {orderCode}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyCode}
            className="min-h-[36px] px-3 py-1.5 border border-[#d4d4ce] hover:bg-white text-[11px] font-bold uppercase tracking-wider text-[#121212] rounded-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5 text-[#059669]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Đã sao chép</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Sao chép mã</span>
              </>
            )}
          </button>
        </div>

        {/* Status & Method */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-[#e5e5e0] pb-5 text-xs">
          <div>
            <span className="text-[#737373] block mb-1">Trạng thái đơn:</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-xs font-bold bg-[#fef3c7] text-[#92400e] text-[11px]">
              Chờ xử lý (PENDING)
            </span>
          </div>

          <div>
            <span className="text-[#737373] block mb-1">Phương thức thanh toán:</span>
            <span className="font-bold text-[#121212]">
              Thanh toán khi nhận hàng (COD)
            </span>
          </div>
        </div>

        {/* Pricing Summary */}
        <div className="space-y-2.5 text-xs">
          <div className="flex justify-between text-[#525252]">
            <span>Tạm tính:</span>
            <span className="font-bold text-[#121212]">
              {formatPrice(confirmation.subtotal)}
            </span>
          </div>

          <div className="flex justify-between text-[#525252]">
            <span>Phí vận chuyển:</span>
            <span className="font-bold text-[#121212]">
              {formatPrice(confirmation.shippingFee)}
            </span>
          </div>

          <div className="border-t border-[#e5e5e0] pt-3 flex justify-between items-baseline">
            <span className="font-extrabold text-[#121212] uppercase tracking-wider">
              Tổng thanh toán:
            </span>
            <span className="text-lg font-black text-[#121212] tracking-tight">
              {formatPrice(confirmation.total)}
            </span>
          </div>
        </div>

        {/* Guest Order Search Notice */}
        <div className="p-3.5 bg-[#fefce8] border border-[#fef08a] rounded-xs text-[11px] text-[#854d0e] leading-relaxed flex items-start gap-2.5">
          <svg className="w-4 h-4 shrink-0 text-[#ca8a04] mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>
            <strong>Lưu ý:</strong> Vui lòng lưu lại <strong>Mã đơn hàng</strong> và <strong>Số điện thoại</strong> đã dùng khi đặt hàng để tra cứu thông tin đơn hàng sau này.
          </p>
        </div>
      </div>

      {/* Navigation Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to="/products"
          className="min-h-[44px] px-6 py-2.5 bg-[#121212] hover:bg-[#262626] text-white text-xs font-bold uppercase tracking-wider rounded-xs transition-colors flex items-center justify-center"
        >
          Tiếp tục mua sắm
        </Link>
        <Link
          to="/"
          className="min-h-[44px] px-6 py-2.5 border border-[#e5e5e0] hover:bg-[#f5f5f3] text-[#121212] text-xs font-bold uppercase tracking-wider rounded-xs transition-colors flex items-center justify-center"
        >
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
