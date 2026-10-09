import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCart, clearCart } from '../utils/cartStorage';
import { getCheckoutQuote, createGuestOrder } from '../services/checkoutService';
import { saveOrderConfirmation } from '../utils/checkoutSession';
import CheckoutForm from '../components/checkout/CheckoutForm';
import CheckoutSummary from '../components/checkout/CheckoutSummary';

export default function CheckoutPage() {
  const navigate = useNavigate();

  // Quote state
  const [quote, setQuote] = useState(null);
  const [loadingQuote, setLoadingQuote] = useState(true);
  const [quoteError, setQuoteError] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    receiverName: '',
    receiverPhone: '',
    receiverAddress: '',
    note: '',
  });
  const [formErrors, setFormErrors] = useState({});

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Refs for focusing invalid inputs
  const nameRef = useRef(null);
  const phoneRef = useRef(null);
  const addressRef = useRef(null);

  /**
   * Fetches the server-authoritative checkout quote for the current cart (e.g. for retry/recovery).
   */
  const loadQuote = useCallback(async () => {
    const cart = getCart();

    if (!cart || cart.length === 0) {
      navigate('/cart', { replace: true });
      return;
    }

    setLoadingQuote(true);
    setQuoteError(null);
    setSubmitError(null);

    const itemsPayload = cart.map((row) => ({
      productSlug: row.productSlug,
      colorwaySlug: row.colorwaySlug,
      size: row.size,
      quantity: row.quantity,
    }));

    try {
      const quoteData = await getCheckoutQuote(itemsPayload);
      setQuote(quoteData);
    } catch (err) {
      if (err.status === 409 || err.code === 'CHECKOUT_UNAVAILABLE') {
        setQuoteError({
          type: 'UNAVAILABLE',
          message: 'Giỏ hàng đã có thay đổi và chưa thể thanh toán.',
          issues: err.issues || [],
        });
      } else {
        setQuoteError({
          type: 'NETWORK',
          message: 'Không thể cập nhật thông tin thanh toán lúc này.',
        });
      }
    } finally {
      setLoadingQuote(false);
    }
  }, [navigate]);

  useEffect(() => {
    let ignore = false;
    const cart = getCart();

    if (!cart || cart.length === 0) {
      navigate('/cart', { replace: true });
      return;
    }

    const itemsPayload = cart.map((row) => ({
      productSlug: row.productSlug,
      colorwaySlug: row.colorwaySlug,
      size: row.size,
      quantity: row.quantity,
    }));

    getCheckoutQuote(itemsPayload)
      .then((quoteData) => {
        if (!ignore) {
          setQuote(quoteData);
          setLoadingQuote(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          if (err.status === 409 || err.code === 'CHECKOUT_UNAVAILABLE') {
            setQuoteError({
              type: 'UNAVAILABLE',
              message: 'Giỏ hàng đã có thay đổi và chưa thể thanh toán.',
              issues: err.issues || [],
            });
          } else {
            setQuoteError({
              type: 'NETWORK',
              message: 'Không thể cập nhật thông tin thanh toán lúc này.',
            });
          }
          setLoadingQuote(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [navigate]);

  /**
   * Handles form input changes and clears matching field error.
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  /**
   * Validates client-side recipient information before submission.
   */
  const validateForm = () => {
    const errors = {};
    const name = formData.receiverName.trim();
    const phone = formData.receiverPhone.trim();
    const address = formData.receiverAddress.trim();

    if (!name) {
      errors.receiverName = 'Vui lòng nhập họ và tên người nhận.';
    } else if (name.length > 100) {
      errors.receiverName = 'Họ và tên không được vượt quá 100 ký tự.';
    }

    if (!phone) {
      errors.receiverPhone = 'Vui lòng nhập số điện thoại nhận hàng.';
    } else {
      // Practical phone check: allows digits, +, spaces, -, (, ), ., and requires 8-15 actual digits
      const hasValidChars = /^[0-9+\s\-().]+$/.test(phone);
      const digitCount = (phone.match(/\d/g) || []).length;
      if (!hasValidChars || digitCount < 8 || digitCount > 15) {
        errors.receiverPhone = 'Số điện thoại không hợp lệ (cần từ 8 đến 15 chữ số).';
      }
    }

    if (!address) {
      errors.receiverAddress = 'Vui lòng nhập địa chỉ nhận hàng chi tiết.';
    }

    setFormErrors(errors);

    // Focus first invalid field
    if (errors.receiverName) {
      nameRef.current?.focus();
    } else if (errors.receiverPhone) {
      phoneRef.current?.focus();
    } else if (errors.receiverAddress) {
      addressRef.current?.focus();
    }

    return Object.keys(errors).length === 0;
  };

  /**
   * Handles checkout submission.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitting || !quote) return;

    if (!validateForm()) return;

    setSubmitting(true);
    setSubmitError(null);

    const orderPayload = {
      receiverName: formData.receiverName.trim(),
      receiverPhone: formData.receiverPhone.trim(),
      receiverAddress: formData.receiverAddress.trim(),
      note: formData.note ? formData.note.trim() : null,
      items: quote.items.map((it) => ({
        productSlug: it.productSlug,
        colorwaySlug: it.colorwaySlug,
        size: it.size,
        quantity: it.quantity,
        expectedUnitPrice: it.unitPrice,
      })),
      expectedShippingFee: quote.shippingFee,
    };

    try {
      const orderResult = await createGuestOrder(orderPayload);

      // Save confirmation snapshot, clear cart, and navigate to success route
      saveOrderConfirmation(orderResult);
      clearCart();
      navigate(`/order-success/${orderResult.orderCode}`, { replace: true });
    } catch (err) {
      setSubmitting(false);

      if (err.status === 409 && err.code === 'CHECKOUT_CHANGED') {
        // Price or shipping fee changed; update with fresh quote if provided
        if (err.details?.quote) {
          setQuote(err.details.quote);
        } else {
          loadQuote();
        }
        setSubmitError(
          'Thông tin đơn hàng đã thay đổi. Vui lòng kiểm tra lại trước khi đặt hàng.'
        );
      } else if (
        err.status === 409 &&
        (err.code === 'INSUFFICIENT_STOCK' || err.code === 'CHECKOUT_UNAVAILABLE')
      ) {
        setSubmitError(
          'Một hoặc nhiều sản phẩm không còn đủ số lượng để đặt hàng.'
        );
      } else if (err.status === 400) {
        setSubmitError(
          err.message || 'Thông tin đặt hàng không hợp lệ. Vui lòng kiểm tra lại.'
        );
      } else {
        setSubmitError(
          'Không thể hoàn tất đơn hàng lúc này. Vui lòng thử lại.'
        );
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center space-x-2 text-xs text-[#737373]">
          <li>
            <Link to="/" className="hover:text-[#121212] transition-colors">
              Trang chủ
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link to="/cart" className="hover:text-[#121212] transition-colors">
              Giỏ hàng
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="font-bold text-[#121212]" aria-current="page">
            Thanh toán
          </li>
        </ol>
      </nav>

      {/* Page Title */}
      <div className="border-b border-[#e5e5e0] pb-4 mb-8">
        <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#121212]">
          Thanh toán
        </h1>
        <p className="text-xs text-[#737373] mt-1">
          Hoàn tất đơn hàng với phương thức thanh toán khi nhận hàng (COD).
        </p>
      </div>

      {/* Quote Error State */}
      {quoteError ? (
        <div className="bg-white border border-[#e5e5e0] p-8 rounded-xs text-center max-w-lg mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#fef2f2] text-[#b91c1c] flex items-center justify-center mx-auto">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-sm font-bold text-[#121212]">
            {quoteError.message}
          </h2>

          {quoteError.issues && quoteError.issues.length > 0 && (
            <div className="text-xs text-[#737373] text-left bg-[#f8f8f6] p-3 rounded-xs space-y-1">
              {quoteError.issues.map((iss, i) => (
                <p key={i}>
                  • {iss.productSlug} ({iss.colorwaySlug}, size {iss.size}):{' '}
                  {iss.reason === 'INSUFFICIENT_STOCK' ? `Chỉ còn ${iss.availableStock} sản phẩm` : 'Sản phẩm tạm không khả dụng'}
                </p>
              ))}
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            {quoteError.type === 'NETWORK' && (
              <button
                type="button"
                onClick={loadQuote}
                className="min-h-[44px] px-6 py-2.5 bg-[#121212] hover:bg-[#262626] text-white text-xs font-bold uppercase tracking-wider rounded-xs transition-colors"
              >
                Thử lại
              </button>
            )}
            <Link
              to="/cart"
              className="min-h-[44px] px-6 py-2.5 border border-[#e5e5e0] hover:bg-[#f5f5f3] text-[#121212] text-xs font-bold uppercase tracking-wider rounded-xs transition-colors flex items-center justify-center"
            >
              Quay lại giỏ hàng
            </Link>
          </div>
        </div>
      ) : loadingQuote ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#121212] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[#737373] font-medium">
            Đang cập nhật đơn hàng...
          </p>
        </div>
      ) : (
        <CheckoutForm
          ref={{ nameRef, phoneRef, addressRef }}
          formData={formData}
          formErrors={formErrors}
          onChange={handleInputChange}
          onSubmit={handleSubmit}
          submitting={submitting}
          disabled={loadingQuote || !!quoteError}
          submitError={submitError}
          summary={<CheckoutSummary quote={quote} loading={loadingQuote} />}
        />
      )}
    </div>
  );
}
