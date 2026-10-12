import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import OrderActionDialog from '../components/order/OrderActionDialog';
import OrderDetailCard from '../components/order/OrderDetailCard';
import OrderLookupForm from '../components/order/OrderLookupForm';
import RecentOrders from '../components/order/RecentOrders';
import {
  cancelGuestOrder,
  confirmGuestOrderReceived,
  lookupGuestOrder,
} from '../services/orderService';
import { getRecentOrders } from '../utils/recentOrders';

const STALE_STATUS_MESSAGE =
  'Trạng thái đơn hàng vừa thay đổi. Thông tin mới nhất đang được cập nhật.';
const REFRESH_FAILED_MESSAGE =
  'Đơn hàng đã được cập nhật. Không thể tải lại thông tin mới nhất.';

/**
 * Public ownership-verified order lookup and lifecycle actions.
 * The verified phone snapshot exists only in this component's React memory.
 */
export default function OrderLookupPage() {
  const [orderCode, setOrderCode] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [recentOrders] = useState(() => getRecentOrders());
  const receiverPhoneRef = useRef(null);
  const cancelButtonRef = useRef(null);
  const confirmButtonRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [lookupError, setLookupError] = useState(null);
  const [order, setOrder] = useState(null);
  const [verifiedLookup, setVerifiedLookup] = useState(null);

  const [dialogAction, setDialogAction] = useState(null);
  const [mutating, setMutating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stateUncertain, setStateUncertain] = useState(false);
  const [lifecycleMessage, setLifecycleMessage] = useState('');
  const [lifecycleTone, setLifecycleTone] = useState('success');
  const [refreshErrorMessage, setRefreshErrorMessage] = useState('');
  const [refreshSuccessMessage, setRefreshSuccessMessage] = useState('');

  const clearLifecycleState = () => {
    setDialogAction(null);
    setStateUncertain(false);
    setLifecycleMessage('');
    setLifecycleTone('success');
    setRefreshErrorMessage('');
    setRefreshSuccessMessage('');
  };

  const showNeutralNotFound = () => {
    setOrder(null);
    setVerifiedLookup(null);
    clearLifecycleState();
    setLookupError({
      message: 'Không tìm thấy đơn hàng với thông tin đã cung cấp.',
      secondary: 'Vui lòng kiểm tra lại mã đơn hàng và số điện thoại.',
    });
  };

  /**
   * A recent-order shortcut carries only an order code. It never restores or
   * infers ownership credentials, and it never performs an automatic lookup.
   */
  const handleRecentOrderSelect = (recentOrderCode) => {
    setOrderCode(recentOrderCode);
    setFieldErrors({});
    setLookupError(null);
    setOrder(null);
    setVerifiedLookup(null);
    clearLifecycleState();

    requestAnimationFrame(() => receiverPhoneRef.current?.focus());
  };

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

  const handleLookupSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    // A new manual attempt immediately invalidates credentials for any old result.
    setOrder(null);
    setVerifiedLookup(null);
    setLookupError(null);
    clearLifecycleState();

    if (!validateForm()) return;

    const credentials = {
      orderCode: orderCode.trim(),
      receiverPhone: receiverPhone.trim(),
    };
    setLoading(true);

    try {
      const result = await lookupGuestOrder(credentials);
      setOrder(result);
      setVerifiedLookup({
        orderCode: result.orderCode,
        receiverPhone: credentials.receiverPhone,
      });
    } catch (error) {
      if (error.status === 404 || error.code === 'ORDER_NOT_FOUND') {
        showNeutralNotFound();
      } else {
        setLookupError({
          message: 'Không thể tra cứu đơn hàng lúc này. Vui lòng thử lại.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshVerifiedOrder = async (credentials, successMessage = '') => {
    if (!credentials) return false;

    setRefreshing(true);
    setStateUncertain(true);
    setRefreshErrorMessage('');
    setRefreshSuccessMessage(successMessage);

    try {
      const freshOrder = await lookupGuestOrder(credentials);
      setOrder(freshOrder);
      setStateUncertain(false);
      setRefreshSuccessMessage('');
      if (successMessage) {
        setLifecycleMessage(successMessage);
        setLifecycleTone('success');
      }
      return true;
    } catch (error) {
      if (error.status === 404 || error.code === 'ORDER_NOT_FOUND') {
        showNeutralNotFound();
      } else {
        setStateUncertain(true);
        setRefreshErrorMessage(REFRESH_FAILED_MESSAGE);
      }
      return false;
    } finally {
      setRefreshing(false);
    }
  };

  const handleRetryRefresh = () => {
    refreshVerifiedOrder(verifiedLookup, refreshSuccessMessage);
  };

  const handleLifecycleConfirm = async () => {
    if (!dialogAction || !order || !verifiedLookup || mutating) return;

    const currentAction = dialogAction;
    const credentials = verifiedLookup;
    setMutating(true);
    setLifecycleMessage('');
    setLifecycleTone('success');
    setRefreshErrorMessage('');

    try {
      if (currentAction === 'cancel') {
        await cancelGuestOrder(credentials);
      } else {
        await confirmGuestOrderReceived(credentials);
      }

      setDialogAction(null);
      await refreshVerifiedOrder(
        credentials,
        currentAction === 'cancel'
          ? 'Đơn hàng đã được hủy thành công.'
          : 'Đã xác nhận nhận hàng thành công.'
      );
    } catch (error) {
      setDialogAction(null);

      if (error.status === 404 || error.code === 'ORDER_NOT_FOUND') {
        showNeutralNotFound();
      } else if (
        error.code === 'ORDER_NOT_CANCELLABLE'
        || error.code === 'ORDER_NOT_CONFIRMABLE'
      ) {
        setLifecycleMessage(STALE_STATUS_MESSAGE);
        setLifecycleTone('warning');
        setStateUncertain(true);
        await refreshVerifiedOrder(credentials);
      } else {
        setLifecycleMessage(
          'Không thể xác định kết quả yêu cầu vừa gửi. Thông tin mới nhất đang được cập nhật.'
        );
        setLifecycleTone('warning');
        setStateUncertain(true);
        await refreshVerifiedOrder(credentials);
      }
    } finally {
      setMutating(false);
    }
  };

  const closeDialog = () => {
    if (!mutating) setDialogAction(null);
  };

  const isCancelDialog = dialogAction === 'cancel';
  const actionsAvailable = Boolean(
    verifiedLookup
    && order
    && verifiedLookup.orderCode === order.orderCode
    && !stateUncertain
    && !refreshing
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
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

      <div className="border-b border-[#e5e5e0] pb-4 mb-8">
        <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#121212]">
          Tra cứu đơn hàng
        </h1>
        <p className="text-xs text-[#737373] mt-1">
          Nhập mã đơn hàng và số điện thoại đã dùng khi đặt hàng.
        </p>
      </div>

      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.25fr)_minmax(240px,0.75fr)] gap-6 items-start">
          <div className="md:order-2 min-w-0">
            <RecentOrders orders={recentOrders} onSelect={handleRecentOrderSelect} />
          </div>

          <div className="md:order-1 min-w-0">
            <OrderLookupForm
              orderCode={orderCode}
              receiverPhone={receiverPhone}
              onOrderCodeChange={(value) => {
                setOrderCode(value);
                if (fieldErrors.orderCode) {
                  setFieldErrors((previous) => ({ ...previous, orderCode: '' }));
                }
              }}
              onPhoneChange={(value) => {
                setReceiverPhone(value);
                if (fieldErrors.receiverPhone) {
                  setFieldErrors((previous) => ({ ...previous, receiverPhone: '' }));
                }
              }}
              onSubmit={handleLookupSubmit}
              loading={loading}
              fieldErrors={fieldErrors}
              lookupError={lookupError}
              receiverPhoneRef={receiverPhoneRef}
            />
          </div>
        </div>

        {order && (
          <div className="pt-2">
            <OrderDetailCard
              order={order}
              onOpenCancel={() => setDialogAction('cancel')}
              onOpenConfirm={() => setDialogAction('confirm')}
              cancelButtonRef={cancelButtonRef}
              confirmButtonRef={confirmButtonRef}
              lifecycleMessage={lifecycleMessage}
              lifecycleTone={lifecycleTone}
              refreshErrorMessage={refreshErrorMessage}
              onRetryRefresh={handleRetryRefresh}
              refreshing={refreshing}
              actionsAvailable={actionsAvailable}
            />
          </div>
        )}
      </div>

      <OrderActionDialog
        isOpen={Boolean(dialogAction)}
        title={isCancelDialog ? 'Hủy đơn hàng này?' : 'Xác nhận đã nhận hàng?'}
        description={
          isCancelDialog
            ? 'Bạn có chắc muốn hủy đơn hàng này? Sau khi xác nhận, đơn hàng không thể tiếp tục xử lý.'
            : 'Xác nhận bạn đã nhận được đơn hàng này? Đơn hàng sẽ được đánh dấu là hoàn tất.'
        }
        confirmLabel={isCancelDialog ? 'Xác nhận hủy' : 'Xác nhận đã nhận'}
        pendingLabel={isCancelDialog ? 'Đang hủy...' : 'Đang xác nhận...'}
        tone={isCancelDialog ? 'danger' : 'primary'}
        busy={mutating}
        onClose={closeDialog}
        onConfirm={handleLifecycleConfirm}
        returnFocusRef={isCancelDialog ? cancelButtonRef : confirmButtonRef}
      />
    </div>
  );
}
