import { useState } from 'react';
import { Link } from 'react-router-dom';
import OrderLookupForm from '../components/order/OrderLookupForm';
import OrderDetailCard from '../components/order/OrderDetailCard';
import CancelConfirmDialog from '../components/order/CancelConfirmDialog';
import { lookupGuestOrder, cancelGuestOrder } from '../services/orderService';

/**
 * OrderLookupPage Component
 * Provides self-service guest order status lookup and cancellation.
 * Operates without authentication or persistent credentials.
 */
export default function OrderLookupPage() {
  const [orderCode, setOrderCode] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Lookup state
  const [loading, setLoading] = useState(false);
  const [lookupError, setLookupError] = useState(null);
  const [order, setOrder] = useState(null);

  // Cancel state
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelSuccessMessage, setCancelSuccessMessage] = useState(null);
  const [cancelErrorMessage, setCancelErrorMessage] = useState(null);

  /**
   * Client-side UX validation before sending request
   */
  const validateForm = () => {
    const errors = {};
    const code = orderCode.trim();
    const phone = receiverPhone.trim();

    if (!code) {
      errors.orderCode = 'Vui lòng nhập mã đơn hàng.';
    } else if (code.length > 50) {
      errors.orderCode = 'Mã đơn hàng không hợp lệ (vượt quá 50 ký tự).';
    }

    if (!phone) {
      errors.receiverPhone = 'Vui lòng nhập số điện thoại đã dùng khi đặt hàng.';
    } else {
      const hasValidChars = /^[0-9+\s\-().]+$/.test(phone);
      const digitCount = (phone.match(/\d/g) || []).length;
      if (!hasValidChars || digitCount < 8 || digitCount > 15) {
        errors.receiverPhone = 'Số điện thoại không hợp lệ (cần từ 8 đến 15 chữ số).';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handles lookup form submission
   */
  const handleLookupSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;
    if (!validateForm()) return;

    setLoading(true);
    setLookupError(null);
    setCancelSuccessMessage(null);
    setCancelErrorMessage(null);

    try {
      const result = await lookupGuestOrder({
        orderCode: orderCode.trim(),
        receiverPhone: receiverPhone.trim(),
      });
      setOrder(result);
    } catch (err) {
      setOrder(null);
      if (err.status === 404 || err.code === 'ORDER_NOT_FOUND') {
        setLookupError({
          message: 'Không tìm thấy đơn hàng với thông tin đã cung cấp.',
          secondary: 'Vui lòng kiểm tra lại mã đơn hàng và số điện thoại.',
        });
      } else {
        setLookupError({
          message: 'Không thể tra cứu đơn hàng lúc này. Vui lòng thử lại.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Executes authoritative order cancellation
   */
  const handleCancelConfirm = async () => {
    if (!order || cancelling) return;

    setCancelling(true);
    setCancelErrorMessage(null);

    try {
      await cancelGuestOrder({
        orderCode: order.orderCode,
        receiverPhone: receiverPhone.trim(),
      });

      // Refetch authoritative full order snapshot
      try {
        const freshOrder = await lookupGuestOrder({
          orderCode: order.orderCode,
          receiverPhone: receiverPhone.trim(),
        });
        setOrder(freshOrder);
      } catch {
        // Fallback update if immediate re-lookup fails
        setOrder((prev) => (prev ? { ...prev, status: 'CANCELLED', cancellable: false } : null));
      }

      setCancelSuccessMessage('Đơn hàng đã được hủy thành công.');
      setIsCancelDialogOpen(false);
    } catch (err) {
      setIsCancelDialogOpen(false);

      if (err.status === 409 || err.code === 'ORDER_NOT_CANCELLABLE') {
        setCancelErrorMessage('Đơn hàng không thể hủy ở trạng thái hiện tại.');
        // Refresh order to reflect current status (e.g. if transitioned to SHIPPING)
        try {
          const refreshed = await lookupGuestOrder({
            orderCode: order.orderCode,
            receiverPhone: receiverPhone.trim(),
          });
          setOrder(refreshed);
        } catch {
          // ignore
        }
      } else if (err.status === 404 || err.code === 'ORDER_NOT_FOUND') {
        setCancelErrorMessage('Không tìm thấy đơn hàng với thông tin đã cung cấp.');
      } else {
        setCancelErrorMessage('Không thể hủy đơn hàng lúc này. Vui lòng thử lại.');
      }
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center space-x-2 text-xs text-[#737373]">
          <li>
            <Link to="/" className="hover:text-[#121212] transition-colors">
              Trang chủ
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="font-bold text-[#121212]" aria-current="page">
            Tra cứu đơn hàng
          </li>
        </ol>
      </nav>

      {/* Page Header */}
      <div className="border-b border-[#e5e5e0] pb-4 mb-8">
        <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#121212]">
          Tra cứu đơn hàng
        </h1>
        <p className="text-xs text-[#737373] mt-1">
          Nhập mã đơn hàng và số điện thoại đã dùng khi đặt hàng.
        </p>
      </div>

      {/* Main Content Area */}
      <div className="space-y-8">
        {/* Search Form */}
        <div className="max-w-xl">
          <OrderLookupForm
            orderCode={orderCode}
            receiverPhone={receiverPhone}
            onOrderCodeChange={(val) => {
              setOrderCode(val);
              if (fieldErrors.orderCode) setFieldErrors((prev) => ({ ...prev, orderCode: '' }));
            }}
            onPhoneChange={(val) => {
              setReceiverPhone(val);
              if (fieldErrors.receiverPhone) setFieldErrors((prev) => ({ ...prev, receiverPhone: '' }));
            }}
            onSubmit={handleLookupSubmit}
            loading={loading}
            fieldErrors={fieldErrors}
            lookupError={lookupError}
          />
        </div>

        {/* Order Details Presentation */}
        {order && (
          <div className="pt-2">
            <OrderDetailCard
              order={order}
              onOpenCancel={() => setIsCancelDialogOpen(true)}
              cancelSuccessMessage={cancelSuccessMessage}
              cancelErrorMessage={cancelErrorMessage}
            />
          </div>
        )}
      </div>

      {/* Accessible Cancel Confirmation Modal */}
      <CancelConfirmDialog
        isOpen={isCancelDialogOpen}
        onClose={() => !cancelling && setIsCancelDialogOpen(false)}
        onConfirm={handleCancelConfirm}
        cancelling={cancelling}
      />
    </div>
  );
}
