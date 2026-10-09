import { forwardRef } from 'react';
import { Link } from 'react-router-dom';

/**
 * CheckoutForm Component
 * Renders Guest recipient information fields, COD payment section, Order Summary slot,
 * and Place Order button.
 * Responsive layout:
 * - Mobile (<1024px): Recipient -> COD -> Order Summary -> Submit CTA -> Back to Cart
 * - Desktop (>=1024px): 2-column layout (Left: Recipient, COD, Submit CTA, Back to Cart; Right: sticky Summary)
 */
const CheckoutForm = forwardRef(function CheckoutForm(
  {
    formData,
    formErrors,
    onChange,
    onSubmit,
    submitting,
    disabled,
    submitError,
    summary,
  },
  ref
) {
  const { nameRef, phoneRef, addressRef } = ref || {};

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start"
    >
      {/* 1. Recipient Information & COD Payment (Left Column on Desktop, Top on Mobile) */}
      <div className="lg:col-span-7 space-y-6 sm:space-y-8">
        {/* Recipient Information Section */}
      <div className="bg-white border border-[#e5e5e0] p-6 sm:p-7 rounded-xs shadow-2xs">
        <div className="border-b border-[#e5e5e0] pb-3 mb-6">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-[#121212]">
            Thông tin nhận hàng
          </h2>
          <p className="text-[11px] text-[#737373] mt-1">
            Vui lòng điền thông tin chính xác để nhân viên giao hàng liên hệ thuận tiện.
          </p>
        </div>

        <div className="space-y-5">
          {/* Receiver Name */}
          <div>
            <label
              htmlFor="receiverName"
              className="block text-xs font-bold uppercase tracking-wider text-[#121212] mb-1.5"
            >
              Họ và tên <span className="text-[#b91c1c]" aria-hidden="true">*</span>
            </label>
            <input
              ref={nameRef}
              id="receiverName"
              name="receiverName"
              type="text"
              autoComplete="name"
              maxLength={100}
              value={formData.receiverName}
              onChange={onChange}
              disabled={submitting}
              aria-required="true"
              aria-invalid={!!formErrors.receiverName}
              aria-describedby={formErrors.receiverName ? 'receiverName-error' : undefined}
              className={`w-full min-h-[44px] px-3.5 py-2.5 text-xs text-[#121212] bg-[#fcfcfb] border rounded-xs transition-colors focus:bg-white focus:outline-hidden ${
                formErrors.receiverName
                  ? 'border-[#b91c1c] focus:border-[#b91c1c] focus:ring-1 focus:ring-[#b91c1c]'
                  : 'border-[#d4d4ce] focus:border-[#121212]'
              }`}
              placeholder="Ví dụ: Nguyễn Văn An"
            />
            {formErrors.receiverName && (
              <p
                id="receiverName-error"
                role="alert"
                className="mt-1.5 text-xs text-[#b91c1c] font-medium"
              >
                {formErrors.receiverName}
              </p>
            )}
          </div>

          {/* Receiver Phone */}
          <div>
            <label
              htmlFor="receiverPhone"
              className="block text-xs font-bold uppercase tracking-wider text-[#121212] mb-1.5"
            >
              Số điện thoại <span className="text-[#b91c1c]" aria-hidden="true">*</span>
            </label>
            <input
              ref={phoneRef}
              id="receiverPhone"
              name="receiverPhone"
              type="tel"
              autoComplete="tel"
              maxLength={20}
              value={formData.receiverPhone}
              onChange={onChange}
              disabled={submitting}
              aria-required="true"
              aria-invalid={!!formErrors.receiverPhone}
              aria-describedby={formErrors.receiverPhone ? 'receiverPhone-error' : undefined}
              className={`w-full min-h-[44px] px-3.5 py-2.5 text-xs text-[#121212] bg-[#fcfcfb] border rounded-xs transition-colors focus:bg-white focus:outline-hidden ${
                formErrors.receiverPhone
                  ? 'border-[#b91c1c] focus:border-[#b91c1c] focus:ring-1 focus:ring-[#b91c1c]'
                  : 'border-[#d4d4ce] focus:border-[#121212]'
              }`}
              placeholder="Ví dụ: 0912345678 hoặc +84 912 345 678"
            />
            {formErrors.receiverPhone && (
              <p
                id="receiverPhone-error"
                role="alert"
                className="mt-1.5 text-xs text-[#b91c1c] font-medium"
              >
                {formErrors.receiverPhone}
              </p>
            )}
          </div>

          {/* Receiver Address */}
          <div>
            <label
              htmlFor="receiverAddress"
              className="block text-xs font-bold uppercase tracking-wider text-[#121212] mb-1.5"
            >
              Địa chỉ nhận hàng <span className="text-[#b91c1c]" aria-hidden="true">*</span>
            </label>
            <input
              ref={addressRef}
              id="receiverAddress"
              name="receiverAddress"
              type="text"
              autoComplete="street-address"
              value={formData.receiverAddress}
              onChange={onChange}
              disabled={submitting}
              aria-required="true"
              aria-invalid={!!formErrors.receiverAddress}
              aria-describedby={formErrors.receiverAddress ? 'receiverAddress-error' : undefined}
              className={`w-full min-h-[44px] px-3.5 py-2.5 text-xs text-[#121212] bg-[#fcfcfb] border rounded-xs transition-colors focus:bg-white focus:outline-hidden ${
                formErrors.receiverAddress
                  ? 'border-[#b91c1c] focus:border-[#b91c1c] focus:ring-1 focus:ring-[#b91c1c]'
                  : 'border-[#d4d4ce] focus:border-[#121212]'
              }`}
              placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
            />
            {formErrors.receiverAddress && (
              <p
                id="receiverAddress-error"
                role="alert"
                className="mt-1.5 text-xs text-[#b91c1c] font-medium"
              >
                {formErrors.receiverAddress}
              </p>
            )}
          </div>

          {/* Order Note (Optional) */}
          <div>
            <label
              htmlFor="note"
              className="block text-xs font-bold uppercase tracking-wider text-[#121212] mb-1.5"
            >
              Ghi chú đơn hàng <span className="text-[#737373] text-[11px] font-normal tracking-normal">(Tùy chọn)</span>
            </label>
            <textarea
              id="note"
              name="note"
              rows={3}
              value={formData.note}
              onChange={onChange}
              disabled={submitting}
              className="w-full px-3.5 py-2.5 text-xs text-[#121212] bg-[#fcfcfb] border border-[#d4d4ce] rounded-xs transition-colors focus:bg-white focus:border-[#121212] focus:outline-hidden resize-y"
              placeholder="Chỉ dẫn giao hàng hoặc thời gian nhận hàng thuận tiện (nếu có)"
            />
          </div>
        </div>
      </div>

      {/* Payment Method Section (COD Only) */}
      <div className="bg-white border border-[#e5e5e0] p-6 sm:p-7 rounded-xs shadow-2xs">
        <div className="border-b border-[#e5e5e0] pb-3 mb-5">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-[#121212]">
            Phương thức thanh toán
          </h2>
        </div>

        <div className="p-4 border border-[#121212] bg-[#fcfcfb] rounded-xs flex items-start gap-3">
          <div className="mt-0.5 text-[#121212] shrink-0" aria-hidden="true">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-[#121212]">
              Thanh toán khi nhận hàng (COD)
            </p>
            <p className="text-[11px] text-[#525252] mt-1 leading-relaxed">
              Thanh toán khi đơn hàng được giao đến người nhận.
            </p>
          </div>
        </div>
      </div>
    </div>

    {/* 2. Order Summary (Right Column sticky on desktop; between COD and Place Order CTA on mobile) */}
      <div className="lg:col-span-5 lg:col-start-8 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-28">
        {summary}
      </div>

      {/* 3. Actions: Submit Error, Place Order CTA & Back to Cart (Left Column bottom on desktop; after Summary on mobile) */}
      <div className="lg:col-span-7 lg:col-start-1 lg:row-start-2 space-y-4">
        {/* Form-level Error Alert (if any) */}
        {submitError && (
          <div
            role="alert"
            className="p-4 bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-xs font-medium rounded-xs leading-relaxed"
          >
            {submitError}
          </div>
        )}

        {/* Place Order CTA Button */}
        <button
          type="submit"
          disabled={submitting || disabled}
          className={`w-full min-h-[48px] px-6 py-3 text-xs font-bold uppercase tracking-widest text-white rounded-xs transition-all flex items-center justify-center gap-2 select-none shadow-xs ${
            submitting || disabled
              ? 'bg-[#a3a3a3] cursor-not-allowed opacity-80'
              : 'bg-[#121212] hover:bg-[#262626] active:scale-[0.99] cursor-pointer'
          }`}
        >
          {submitting ? (
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
              <span>Đang xử lý...</span>
            </>
          ) : (
            <span>Đặt hàng (COD)</span>
          )}
        </button>

        {/* Secondary Link to Cart */}
        <div className="pt-1">
          <Link
            to="/cart"
            className="inline-flex items-center gap-1.5 text-xs text-[#737373] hover:text-[#121212] transition-colors py-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Quay lại giỏ hàng</span>
          </Link>
        </div>
      </div>
    </form>
  );
});

export default CheckoutForm;
