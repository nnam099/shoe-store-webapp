import { useState } from 'react';

export default function CheckoutEmailVerification({
  email,
  memberEmail,
  onEmailChange,
  onSend,
  onVerify,
  challengeId,
  verified,
  busy,
  message,
  error,
}) {
  const [otp, setOtp] = useState('');

  const verify = async () => {
    await onVerify(otp);
    setOtp('');
  };

  return (
    <section className="bg-white border border-[#e5e5e0] p-6 sm:p-7 rounded-xs shadow-2xs">
      <div className="border-b border-[#e5e5e0] pb-3 mb-5">
        <h2 className="text-xs font-extrabold uppercase tracking-widest">Xác thực email</h2>
        <p className="mt-1 text-[11px] text-[#737373]">Mỗi checkout mới cần mã OTP 6 chữ số có hiệu lực 5 phút.</p>
      </div>
      <label htmlFor="checkoutEmail" className="block text-xs font-bold uppercase tracking-wider mb-1.5">Email <span className="text-[#b91c1c]">*</span></label>
      <input
        id="checkoutEmail"
        type="email"
        autoComplete="email"
        value={memberEmail || email}
        readOnly={Boolean(memberEmail)}
        disabled={busy || verified}
        onChange={(event) => onEmailChange(event.target.value)}
        className="w-full min-h-[44px] border border-[#d4d4ce] bg-[#fcfcfb] px-3.5 py-2.5 text-xs read-only:bg-[#f5f5f3]"
      />
      <div className="mt-3 flex flex-col sm:flex-row gap-3">
        <button type="button" onClick={onSend} disabled={busy || verified} className="min-h-[44px] border border-[#121212] px-5 text-xs font-bold uppercase tracking-wider disabled:opacity-50">
          {challengeId ? 'Gửi lại mã' : 'Gửi mã OTP'}
        </button>
        {challengeId && !verified && (
          <div className="flex flex-1 gap-2">
            <input
              aria-label="Mã OTP"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="min-h-[44px] min-w-0 flex-1 border border-[#d4d4ce] px-3.5 text-center tracking-[0.35em]"
            />
            <button type="button" onClick={verify} disabled={busy || otp.length !== 6} className="min-h-[44px] bg-[#121212] px-5 text-xs font-bold uppercase text-white disabled:opacity-50">Xác minh</button>
          </div>
        )}
      </div>
      {verified && <p role="status" className="mt-3 text-xs font-semibold text-[#166534]">Email đã được xác thực cho Checkout Intent này.</p>}
      {message && !verified && <p role="status" className="mt-3 text-xs text-[#166534]">{message}</p>}
      {error && <p role="alert" className="mt-3 text-xs text-[#991b1b]">{error}</p>}
    </section>
  );
}
