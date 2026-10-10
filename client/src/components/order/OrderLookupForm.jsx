/**
 * OrderLookupForm Component
 * Renders Guest order search form with orderCode and receiverPhone inputs.
 * Implements accessible labels, inline field validation, and neutral error handling.
 */
export default function OrderLookupForm({
  orderCode,
  receiverPhone,
  onOrderCodeChange,
  onPhoneChange,
  onSubmit,
  loading,
  fieldErrors = {},
  lookupError,
}) {
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {/* Search Input Card */}
      <div className="bg-white border border-[#e5e5e0] p-6 sm:p-7 rounded-xs shadow-2xs space-y-5">
        {/* Order Code Field */}
        <div>
          <label
            htmlFor="orderCode"
            className="block text-xs font-bold uppercase tracking-wider text-[#121212] mb-1.5"
          >
            Mã đơn hàng <span className="text-[#b91c1c]" aria-hidden="true">*</span>
          </label>
          <input
            id="orderCode"
            name="orderCode"
            type="text"
            autoComplete="off"
            maxLength={50}
            value={orderCode}
            onChange={(e) => onOrderCodeChange(e.target.value)}
            disabled={loading}
            aria-required="true"
            aria-invalid={!!fieldErrors.orderCode}
            aria-describedby={fieldErrors.orderCode ? 'orderCode-error' : undefined}
            className={`w-full min-h-[44px] px-3.5 py-2.5 text-xs text-[#121212] font-mono uppercase bg-[#fcfcfb] border rounded-xs transition-colors focus:bg-white focus:outline-hidden ${
              fieldErrors.orderCode
                ? 'border-[#b91c1c] focus:border-[#b91c1c] focus:ring-1 focus:ring-[#b91c1c]'
                : 'border-[#d4d4ce] focus:border-[#121212]'
            }`}
            placeholder="Ví dụ: SL-261009-123456"
          />
          {fieldErrors.orderCode && (
            <p
              id="orderCode-error"
              role="alert"
              className="mt-1.5 text-xs text-[#b91c1c] font-medium"
            >
              {fieldErrors.orderCode}
            </p>
          )}
        </div>

        {/* Receiver Phone Field */}
        <div>
          <label
            htmlFor="receiverPhone"
            className="block text-xs font-bold uppercase tracking-wider text-[#121212] mb-1.5"
          >
            Số điện thoại <span className="text-[#b91c1c]" aria-hidden="true">*</span>
          </label>
          <input
            id="receiverPhone"
            name="receiverPhone"
            type="tel"
            autoComplete="tel"
            maxLength={20}
            value={receiverPhone}
            onChange={(e) => onPhoneChange(e.target.value)}
            disabled={loading}
            aria-required="true"
            aria-invalid={!!fieldErrors.receiverPhone}
            aria-describedby={fieldErrors.receiverPhone ? 'receiverPhone-error' : undefined}
            className={`w-full min-h-[44px] px-3.5 py-2.5 text-xs text-[#121212] bg-[#fcfcfb] border rounded-xs transition-colors focus:bg-white focus:outline-hidden ${
              fieldErrors.receiverPhone
                ? 'border-[#b91c1c] focus:border-[#b91c1c] focus:ring-1 focus:ring-[#b91c1c]'
                : 'border-[#d4d4ce] focus:border-[#121212]'
            }`}
            placeholder="Ví dụ: 0912345678"
          />
          {fieldErrors.receiverPhone && (
            <p
              id="receiverPhone-error"
              role="alert"
              className="mt-1.5 text-xs text-[#b91c1c] font-medium"
            >
              {fieldErrors.receiverPhone}
            </p>
          )}
        </div>

        {/* Global Lookup Error Banner */}
        {lookupError && (
          <div
            role="alert"
            aria-live="polite"
            className="p-4 bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-xs font-medium rounded-xs leading-relaxed space-y-0.5"
          >
            <p className="font-bold">{lookupError.message}</p>
            {lookupError.secondary && (
              <p className="text-[11px] text-[#7f1d1d]">{lookupError.secondary}</p>
            )}
          </div>
        )}

        {/* Submit CTA */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full min-h-[48px] px-6 py-3 text-xs font-bold uppercase tracking-widest text-white rounded-xs transition-all flex items-center justify-center gap-2 select-none shadow-xs ${
            loading
              ? 'bg-[#a3a3a3] cursor-not-allowed opacity-80'
              : 'bg-[#121212] hover:bg-[#262626] active:scale-[0.99] cursor-pointer'
          }`}
        >
          {loading ? (
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
              <span>Đang tra cứu...</span>
            </>
          ) : (
            <span>Tra cứu đơn hàng</span>
          )}
        </button>
      </div>
    </form>
  );
}
