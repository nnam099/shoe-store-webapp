import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CheckoutEmailVerification from '../components/checkout/CheckoutEmailVerification';
import CheckoutForm from '../components/checkout/CheckoutForm';
import CheckoutSummary from '../components/checkout/CheckoutSummary';
import { useAuth } from '../context/authContextValue';
import {
  confirmCodOrder,
  createCheckoutIntent,
  getCheckoutIntent,
  getCheckoutQuote,
  sendCheckoutOtp,
  updateCheckoutIntent,
  verifyCheckoutOtp,
} from '../services/checkoutService';
import { clearCart, getCart } from '../utils/cartStorage';
import {
  clearCheckoutIntentSession,
  getCheckoutIntentSession,
  saveCheckoutIntentSession,
  saveOrderConfirmation,
} from '../utils/checkoutSession';
import { addRecentOrder } from '../utils/recentOrders';

function cartItems() {
  return (getCart() || []).map((row) => ({
    productSlug: row.productSlug,
    colorwaySlug: row.colorwaySlug,
    size: row.size,
    quantity: row.quantity,
  }));
}

function itemsSignature(items) {
  return JSON.stringify((items || []).map((item) => ({
    productSlug: item.productSlug,
    colorwaySlug: item.colorwaySlug,
    size: item.size,
    quantity: item.quantity,
  })));
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { member, token, clearSession, isInitializing } = useAuth();
  const [quote, setQuote] = useState(null);
  const [loadingQuote, setLoadingQuote] = useState(true);
  const [quoteError, setQuoteError] = useState(null);
  const [formData, setFormData] = useState({ email: '', receiverName: '', receiverPhone: '', receiverAddress: '', note: '' });
  const [formErrors, setFormErrors] = useState({});
  const [intent, setIntent] = useState(null);
  const [guestToken, setGuestToken] = useState(null);
  const [challengeId, setChallengeId] = useState('');
  const [acceptedQuoteVersion, setAcceptedQuoteVersion] = useState(null);
  const [otpMessage, setOtpMessage] = useState('');
  const [otpError, setOtpError] = useState('');
  const [busyOtp, setBusyOtp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const nameRef = useRef(null);
  const phoneRef = useRef(null);
  const addressRef = useRef(null);

  const actorKey = token && member ? `member:${member.id}` : 'guest';
  const credentials = useCallback((overrideGuestToken = guestToken) => ({
    token: token || undefined,
    guestToken: token ? undefined : overrideGuestToken || undefined,
  }), [guestToken, token]);

  useEffect(() => {
    if (!member) return;
    // oxlint-disable-next-line react/set-state-in-effect -- hydrate checkout fields when async Member context becomes available.
    setFormData((current) => ({
      ...current,
      email: member.email,
      receiverName: current.receiverName.trim() ? current.receiverName : (member.fullName || ''),
      receiverPhone: current.receiverPhone.trim() ? current.receiverPhone : (member.phone || ''),
      receiverAddress: current.receiverAddress.trim() ? current.receiverAddress : (member.address || ''),
    }));
  }, [member]);

  const loadQuote = useCallback(async () => {
    const items = cartItems();
    if (!items.length) {
      navigate('/cart', { replace: true });
      return;
    }
    setLoadingQuote(true);
    setQuoteError(null);
    try {
      setQuote(await getCheckoutQuote(items));
    } catch (error) {
      setQuoteError({
        type: error.code === 'CHECKOUT_UNAVAILABLE' ? 'UNAVAILABLE' : 'NETWORK',
        message: error.code === 'CHECKOUT_UNAVAILABLE'
          ? 'Giỏ hàng đã thay đổi và chưa thể thanh toán.'
          : 'Không thể cập nhật thông tin thanh toán lúc này.',
        issues: error.issues || [],
      });
    } finally {
      setLoadingQuote(false);
    }
  }, [navigate]);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- initial quote loading is an external API synchronization.
    void loadQuote();
  }, [loadQuote]);

  useEffect(() => {
    if (isInitializing) return;
    const saved = getCheckoutIntentSession();
    if (!saved || saved.actor !== actorKey) {
      if (saved) clearCheckoutIntentSession();
      return;
    }
    let active = true;
    getCheckoutIntent(saved.intentId, {
      token: token || undefined,
      guestToken: token ? undefined : saved.guestToken,
    }).then((data) => {
      if (!active) return;
      setIntent(data.intent);
      setGuestToken(saved.guestToken || null);
      setQuote(data.intent.quote);
      setFormData((current) => ({
        ...current,
        email: data.intent.email,
        receiverName: data.intent.receiverName,
        receiverPhone: data.intent.receiverPhone,
        receiverAddress: data.intent.receiverAddress,
        note: data.intent.note || '',
      }));
    }).catch(() => {
      if (active) clearCheckoutIntentSession();
    });
    return () => { active = false; };
  }, [actorKey, isInitializing, token]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setFormErrors((current) => ({ ...current, [name]: '' }));
    setSubmitError(null);
    if (name === 'email' && value.trim().toLowerCase() !== intent?.email) {
      setIntent((current) => current ? { ...current, verified: false, verifiedAt: null } : current);
      setChallengeId('');
      setAcceptedQuoteVersion(null);
    }
  };

  const validateForm = () => {
    const errors = {};
    const name = formData.receiverName.trim();
    const phone = formData.receiverPhone.trim();
    const address = formData.receiverAddress.trim();
    if (!member && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) errors.email = 'Email không hợp lệ.';
    if (!name || name.length > 100) errors.receiverName = 'Vui lòng nhập họ tên hợp lệ.';
    const digits = (phone.match(/\d/g) || []).length;
    if (!/^[0-9+\s\-().]+$/.test(phone) || digits < 8 || digits > 15) errors.receiverPhone = 'Số điện thoại không hợp lệ.';
    if (!address) errors.receiverAddress = 'Vui lòng nhập địa chỉ nhận hàng.';
    setFormErrors(errors);
    if (errors.receiverName) nameRef.current?.focus();
    else if (errors.receiverPhone) phoneRef.current?.focus();
    else if (errors.receiverAddress) addressRef.current?.focus();
    return Object.keys(errors).length === 0;
  };

  const createOrSyncIntent = async () => {
    const items = cartItems();
    if (!items.length) throw new Error('Giỏ hàng trống.');
    const receiver = {
      receiverName: formData.receiverName.trim(),
      receiverPhone: formData.receiverPhone.trim(),
      receiverAddress: formData.receiverAddress.trim(),
      note: formData.note.trim() || null,
    };
    if (!intent) {
      const data = await createCheckoutIntent({
        ...receiver,
        ...(!member ? { email: formData.email.trim() } : {}),
        items,
      }, { token: token || undefined });
      setIntent(data.intent);
      setGuestToken(data.guestToken || null);
      setQuote(data.intent.quote);
      saveCheckoutIntentSession({ intentId: data.intent.id, guestToken: data.guestToken, actor: actorKey });
      return { intent: data.intent, guestToken: data.guestToken || null, quoteChanged: false };
    }

    const changedItems = itemsSignature(items) !== itemsSignature(intent.quote?.items);
    const payload = {
      ...receiver,
      ...(!member ? { email: formData.email.trim() } : {}),
      ...(changedItems ? { items } : {}),
    };
    const data = await updateCheckoutIntent(intent.id, payload, credentials());
    setIntent(data.intent);
    setQuote(data.intent.quote);
    if (changedItems) setAcceptedQuoteVersion(null);
    return { intent: data.intent, guestToken, quoteChanged: changedItems };
  };

  const handleSendOtp = async () => {
    if (!validateForm()) return;
    setBusyOtp(true);
    setOtpError('');
    setOtpMessage('');
    try {
      const synced = await createOrSyncIntent();
      const result = await sendCheckoutOtp(synced.intent.id, credentials(synced.guestToken));
      setChallengeId(result.challengeId);
      setOtpMessage('Mã OTP đã được gửi. Bạn có thể gửi lại sau 60 giây.');
    } catch (error) {
      setOtpError(error.message || 'Không thể gửi mã OTP.');
    } finally {
      setBusyOtp(false);
    }
  };

  const handleVerifyOtp = async (otp) => {
    if (!intent || !challengeId) return;
    setBusyOtp(true);
    setOtpError('');
    try {
      const result = await verifyCheckoutOtp(intent.id, { challengeId, otp }, credentials());
      setIntent((current) => ({ ...current, verified: true, verifiedAt: result.verifiedAt, status: 'EMAIL_VERIFIED' }));
      setOtpMessage('');
    } catch (error) {
      setOtpError(error.message || 'Không thể xác thực OTP.');
    } finally {
      setBusyOtp(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting || !validateForm()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const synced = await createOrSyncIntent();
      if (!synced.intent.verified) {
        setSubmitError('Vui lòng xác thực email trước khi đặt hàng.');
        return;
      }
      if (synced.quoteChanged || acceptedQuoteVersion !== synced.intent.quoteVersion) {
        setSubmitError('Báo giá đã được cập nhật. Vui lòng kiểm tra và xác nhận lại tổng tiền.');
        return;
      }
      const order = await confirmCodOrder(synced.intent.id, acceptedQuoteVersion, credentials(synced.guestToken));
      if (!token) addRecentOrder(order.orderCode, new Date().toISOString());
      saveOrderConfirmation({ ...order, memberOrder: Boolean(token) });
      clearCheckoutIntentSession();
      clearCart();
      navigate(`/order-success/${order.orderCode}`, { replace: true });
    } catch (error) {
      if (token && error.status === 401 && error.code === 'UNAUTHORIZED') {
        clearSession();
        setSubmitError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      } else if (error.code === 'CHECKOUT_CHANGED') {
        const latestQuote = error.details?.quote;
        const latestVersion = error.details?.quoteVersion;
        if (latestQuote) setQuote(latestQuote);
        if (intent && latestVersion) setIntent((current) => ({ ...current, quote: latestQuote, quoteVersion: latestVersion }));
        setAcceptedQuoteVersion(null);
        setSubmitError('Giá hoặc giỏ hàng đã thay đổi. Vui lòng kiểm tra và xác nhận báo giá mới.');
      } else if (error.code === 'CHECKOUT_UNAVAILABLE' || error.code === 'INSUFFICIENT_STOCK') {
        if (error.details?.quote) setQuote(error.details.quote);
        if (intent && error.details?.quoteVersion) setIntent((current) => ({ ...current, quote: error.details.quote, quoteVersion: error.details.quoteVersion }));
        setAcceptedQuoteVersion(null);
        setSubmitError('Một hoặc nhiều sản phẩm hiện không còn đủ tồn kho.');
      } else {
        setSubmitError(error.message || 'Không thể hoàn tất đơn hàng lúc này.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-[#737373]"><Link to="/cart" className="hover:text-[#121212]">Giỏ hàng</Link> / <span className="font-bold text-[#121212]">Thanh toán</span></nav>
      <div className="border-b border-[#e5e5e0] pb-4 mb-8">
        <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight">Thanh toán</h1>
        <p className="mt-1 text-xs text-[#737373]">Xác thực email và hoàn tất đơn COD.</p>
      </div>
      {quoteError ? (
        <div className="mx-auto max-w-lg border border-[#fecaca] bg-white p-8 text-center">
          <p className="text-sm font-bold text-[#991b1b]">{quoteError.message}</p>
          <button type="button" onClick={loadQuote} className="mt-4 min-h-[44px] bg-[#121212] px-6 text-xs font-bold uppercase text-white">Thử lại</button>
        </div>
      ) : loadingQuote ? (
        <div className="py-20 text-center text-xs text-[#737373]">Đang cập nhật đơn hàng...</div>
      ) : (
        <CheckoutForm
          ref={{ nameRef, phoneRef, addressRef }}
          formData={formData}
          formErrors={formErrors}
          onChange={handleInputChange}
          onSubmit={handleSubmit}
          submitting={submitting}
          disabled={!intent?.verified || acceptedQuoteVersion !== intent?.quoteVersion}
          submitError={submitError}
          memberEmail={member?.email || ''}
          emailVerified={Boolean(intent?.verified)}
          quoteAccepted={acceptedQuoteVersion === intent?.quoteVersion}
          onQuoteAccepted={(accepted) => setAcceptedQuoteVersion(accepted ? intent?.quoteVersion : null)}
          emailVerification={(
            <CheckoutEmailVerification
              email={formData.email}
              memberEmail={member?.email || ''}
              onEmailChange={(value) => handleInputChange({ target: { name: 'email', value } })}
              onSend={handleSendOtp}
              onVerify={handleVerifyOtp}
              challengeId={challengeId}
              verified={Boolean(intent?.verified)}
              busy={busyOtp}
              message={otpMessage}
              error={otpError || formErrors.email}
            />
          )}
          summary={<CheckoutSummary quote={quote} loading={loadingQuote} />}
        />
      )}
    </div>
  );
}
