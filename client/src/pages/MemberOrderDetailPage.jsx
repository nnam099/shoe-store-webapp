import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import OrderActionDialog from '../components/order/OrderActionDialog';
import OrderItems from '../components/order/OrderItems';
import OrderTimeline from '../components/order/OrderTimeline';
import { formatPrice } from '../config/site';
import { useAuth } from '../context/authContextValue';
import {
  cancelMemberOrder,
  confirmMemberOrder,
  getMemberOrder,
} from '../services/memberOrderService';
import {
  formatOrderDateTime,
  getOrderTotalLabel,
  getOrderStatusPresentation,
  isCancelledOrder,
} from '../utils/orderPresentation';

const STALE_STATUS_MESSAGE =
  'Trạng thái đơn hàng vừa thay đổi. Thông tin mới nhất đang được cập nhật.';

export default function MemberOrderDetailPage() {
  const { orderCode = '' } = useParams();
  const { token, clearSession } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [refreshWarning, setRefreshWarning] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionTone, setActionTone] = useState('success');
  const [dialogAction, setDialogAction] = useState(null);
  const [isMutating, setIsMutating] = useState(false);
  const [stateUncertain, setStateUncertain] = useState(false);
  const cancelButtonRef = useRef(null);
  const confirmButtonRef = useRef(null);

  const redirectUnauthorized = useCallback(() => {
    const intendedRoute = `${location.pathname}${location.search}`;
    clearSession();
    navigate('/login', {
      replace: true,
      state: {
        from: intendedRoute,
        message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
      },
    });
  }, [clearSession, location.pathname, location.search, navigate]);

  const loadOrder = useCallback(async ({ initial = false } = {}) => {
    if (initial) {
      setLoading(true);
      setLoadError('');
      setNotFound(false);
    } else {
      setRefreshWarning('');
    }

    try {
      const data = await getMemberOrder(token, orderCode);
      setOrder(data);
      setStateUncertain(false);
      return true;
    } catch (error) {
      if (error.status === 401 && error.code === 'UNAUTHORIZED') {
        redirectUnauthorized();
        return false;
      }

      if (initial && (error.status === 404 || error.code === 'ORDER_NOT_FOUND')) {
        setNotFound(true);
        setOrder(null);
      } else if (initial) {
        setLoadError('Không thể tải đơn hàng lúc này. Vui lòng thử lại.');
      } else {
        setStateUncertain(true);
        setRefreshWarning('Chưa thể cập nhật trạng thái mới nhất. Vui lòng thử tải lại.');
      }
      return false;
    } finally {
      if (initial) setLoading(false);
    }
  }, [orderCode, redirectUnauthorized, token]);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- Fetch the authoritative detail for the current route.
    loadOrder({ initial: true });
  }, [loadOrder]);

  const closeDialog = useCallback(() => {
    if (!isMutating) setDialogAction(null);
  }, [isMutating]);

  const handleMutation = async () => {
    if (!dialogAction || isMutating || !order) return;

    setIsMutating(true);
    setActionMessage('');
    setActionTone('success');
    setRefreshWarning('');

    try {
      if (dialogAction === 'cancel') {
        await cancelMemberOrder(token, order.orderCode);
      } else {
        await confirmMemberOrder(token, order.orderCode);
      }

      const completedAction = dialogAction;
      setDialogAction(null);
      const refreshed = await loadOrder();
      if (refreshed) {
        setActionMessage(
          completedAction === 'cancel'
            ? 'Đơn hàng đã được hủy thành công.'
            : 'Đã xác nhận nhận hàng thành công.'
        );
        setActionTone('success');
      }
    } catch (error) {
      if (error.status === 401 && error.code === 'UNAUTHORIZED') {
        setDialogAction(null);
        redirectUnauthorized();
      } else if (
        error.code === 'ORDER_NOT_CANCELLABLE'
        || error.code === 'ORDER_NOT_CONFIRMABLE'
      ) {
        setDialogAction(null);
        setActionMessage(STALE_STATUS_MESSAGE);
        setActionTone('warning');
        setStateUncertain(true);
        await loadOrder();
      } else {
        setDialogAction(null);
        setActionMessage('Không thể xác định trạng thái yêu cầu vừa gửi. Thông tin đơn hàng đang được tải lại.');
        setActionTone('warning');
        setStateUncertain(true);
        await loadOrder();
      }
    } finally {
      setIsMutating(false);
    }
  };

  const status = getOrderStatusPresentation(order?.status);
  const cancelled = isCancelledOrder(order?.status);
  const isCancelDialog = dialogAction === 'cancel';

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex flex-wrap items-center gap-2 text-xs text-[#737373]">
          <li><Link to="/account" className="hover:text-[#121212]">Tài khoản</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link to="/account/orders" className="hover:text-[#121212]">Đơn hàng của tôi</Link></li>
          <li aria-hidden="true">/</li>
          <li className="font-bold text-[#121212]" aria-current="page">Chi tiết</li>
        </ol>
      </nav>

      <header className="border-b border-[#d4d4ce] pb-5">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[#991b1b]">
          Member order detail
        </p>
        <h1 className="mt-2 text-3xl font-black uppercase tracking-tight sm:text-4xl">
          Chi tiết đơn hàng
        </h1>
      </header>

      {loading ? (
        <div role="status" className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
          <div className="h-80 animate-pulse border border-[#e5e5e0] bg-white" />
          <div className="h-72 animate-pulse border border-[#e5e5e0] bg-white" />
        </div>
      ) : notFound ? (
        <section className="mt-8 border border-[#d4d4ce] bg-white p-8 text-center">
          <h2 className="text-lg font-black uppercase">Không tìm thấy đơn hàng.</h2>
          <p className="mt-2 text-xs text-[#737373]">Vui lòng kiểm tra lại mã đơn hàng hoặc quay về danh sách đơn hàng.</p>
          <Link
            to="/account/orders"
            className="mt-6 inline-flex min-h-[44px] items-center bg-[#121212] px-6 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-[#991b1b]"
          >
            Về đơn hàng của tôi
          </Link>
        </section>
      ) : loadError || !order ? (
        <section className="mt-8 border border-[#fecaca] bg-white p-6">
          <p role="alert" className="text-sm font-bold text-[#991b1b]">{loadError}</p>
          <button
            type="button"
            onClick={() => loadOrder({ initial: true })}
            className="mt-5 min-h-[44px] bg-[#121212] px-5 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-[#991b1b]"
          >
            Thử lại
          </button>
        </section>
      ) : (
        <div className="mt-8 space-y-6">
          {(actionMessage || refreshWarning) && (
            <div
              role={refreshWarning ? 'alert' : 'status'}
              aria-live="polite"
              className={`border p-4 text-xs font-bold ${
                refreshWarning
                  ? 'border-[#fecaca] bg-[#fef2f2] text-[#991b1b]'
                  : actionTone === 'warning'
                    ? 'border-[#fde68a] bg-[#fffbeb] text-[#92400e]'
                    : 'border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]'
              }`}
            >
              <p>{refreshWarning || actionMessage}</p>
              {refreshWarning && (
                <button
                  type="button"
                  onClick={() => loadOrder()}
                  className="mt-3 min-h-[36px] border border-current px-4 text-[11px] uppercase tracking-wider"
                >
                  Tải lại trạng thái
                </button>
              )}
            </div>
          )}

          <section className="border border-[#d4d4ce] bg-white p-5 sm:p-7">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#737373]">Mã đơn hàng</p>
                <p className="mt-1 break-all font-mono text-lg font-black tracking-wide">{order.orderCode}</p>
              </div>
              <span className={`inline-flex self-start border px-3 py-1.5 text-xs font-bold ${status.badgeClass}`}>
                {status.label}
              </span>
            </div>

            <dl className="mt-6 grid gap-4 border-t border-[#eeeeea] pt-5 text-xs sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-[#737373]">Ngày đặt hàng</dt>
                <dd className="mt-1 font-bold">{formatOrderDateTime(order.createdAt)}</dd>
              </div>
              {order.deliveredAt && (
                <div><dt className="text-[#737373]">Ngày giao hàng</dt><dd className="mt-1 font-bold">{formatOrderDateTime(order.deliveredAt)}</dd></div>
              )}
              {order.completedAt && (
                <div><dt className="text-[#737373]">Ngày hoàn tất</dt><dd className="mt-1 font-bold">{formatOrderDateTime(order.completedAt)}</dd></div>
              )}
              {order.cancelledAt && (
                <div><dt className="text-[#737373]">Ngày hủy</dt><dd className="mt-1 font-bold text-[#991b1b]">{formatOrderDateTime(order.cancelledAt)}</dd></div>
              )}
            </dl>
          </section>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)] lg:items-start">
            <section className="border border-[#d4d4ce] bg-white p-5 sm:p-7">
              <h2 className="text-xs font-extrabold uppercase tracking-widest">Sản phẩm đã đặt</h2>
              <div className="mt-5"><OrderItems items={order.items} /></div>
            </section>

            <aside className="space-y-6">
              <section className="border border-[#d4d4ce] bg-white p-5 sm:p-6">
                <h2 className="text-xs font-extrabold uppercase tracking-widest">Thanh toán</h2>
                <dl className="mt-5 space-y-3 text-xs">
                  <div className="flex justify-between gap-4"><dt className="text-[#525252]">Tạm tính</dt><dd className="font-bold">{formatPrice(order.subtotal)}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-[#525252]">Phí vận chuyển</dt><dd className="font-bold">{formatPrice(order.shippingFee)}</dd></div>
                  <div className="flex justify-between gap-4 border-t border-[#d4d4ce] pt-3"><dt className="font-extrabold uppercase">{getOrderTotalLabel(order.status)}</dt><dd className="text-lg font-black">{formatPrice(order.total)}</dd></div>
                </dl>
                {cancelled && (
                  <p className="mt-4 border-t border-[#eeeeea] pt-4 text-[11px] font-bold text-[#991b1b]">
                    Đơn hàng đã hủy • Không cần thanh toán
                  </p>
                )}
                <div className="mt-5 border-t border-[#eeeeea] pt-4 text-xs">
                  <p className="text-[#737373]">Phương thức thanh toán</p>
                  <p className="mt-1 font-bold">Thanh toán khi nhận hàng (COD)</p>
                </div>
              </section>

              <section className="border border-[#d4d4ce] bg-white p-5 sm:p-6">
                <OrderTimeline timeline={order.timeline} />
              </section>

              {!stateUncertain && (order.cancellable || order.confirmable) && (
                <section className="border border-[#d4d4ce] bg-white p-5 sm:p-6">
                  {order.cancellable && (
                    <button
                      ref={cancelButtonRef}
                      type="button"
                      onClick={() => setDialogAction('cancel')}
                      disabled={isMutating}
                      className="min-h-[46px] w-full border border-[#991b1b] px-5 text-xs font-extrabold uppercase tracking-wider text-[#991b1b] hover:bg-[#991b1b] hover:text-white disabled:opacity-50"
                    >
                      Hủy đơn hàng
                    </button>
                  )}
                  {order.confirmable && (
                    <button
                      ref={confirmButtonRef}
                      type="button"
                      onClick={() => setDialogAction('confirm')}
                      disabled={isMutating}
                      className="min-h-[46px] w-full bg-[#121212] px-5 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-[#991b1b] disabled:opacity-50"
                    >
                      Đã nhận hàng
                    </button>
                  )}
                </section>
              )}
            </aside>
          </div>
        </div>
      )}

      <OrderActionDialog
        isOpen={Boolean(dialogAction)}
        title={isCancelDialog ? 'Hủy đơn hàng?' : 'Xác nhận đã nhận hàng?'}
        description={
          isCancelDialog
            ? 'Bạn có chắc muốn hủy đơn hàng này? Sau khi xác nhận, đơn hàng không thể tiếp tục xử lý.'
            : 'Xác nhận bạn đã nhận được đơn hàng này? Đơn hàng sẽ được đánh dấu là hoàn tất.'
        }
        confirmLabel={isCancelDialog ? 'Xác nhận hủy' : 'Xác nhận đã nhận'}
        pendingLabel={isCancelDialog ? 'Đang hủy...' : 'Đang xác nhận...'}
        tone={isCancelDialog ? 'danger' : 'primary'}
        busy={isMutating}
        onClose={closeDialog}
        onConfirm={handleMutation}
        returnFocusRef={isCancelDialog ? cancelButtonRef : confirmButtonRef}
      />
    </div>
  );
}
