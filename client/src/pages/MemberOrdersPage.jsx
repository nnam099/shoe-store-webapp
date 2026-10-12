import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import OrderItems from '../components/order/OrderItems';
import { formatPrice } from '../config/site';
import { useAuth } from '../context/authContextValue';
import { getMemberOrders } from '../services/memberOrderService';
import {
  formatOrderDateTime,
  getOrderTotalLabel,
  getOrderStatusPresentation,
} from '../utils/orderPresentation';

const PAGE_LIMIT = 10;

function parsePage(value) {
  if (!value || !/^[1-9]\d*$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) ? page : 1;
}

export default function MemberOrdersPage() {
  const { token, clearSession } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawPage = searchParams.get('page');
  const page = useMemo(() => parsePage(rawPage), [rawPage]);
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_LIMIT,
    totalItems: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (rawPage !== null && String(page) !== rawPage) {
      setSearchParams({ page: '1' }, { replace: true });
    }
  }, [page, rawPage, setSearchParams]);

  useEffect(() => {
    let active = true;
    // oxlint-disable-next-line react/set-state-in-effect -- Begin the request state when route-backed pagination changes.
    setLoading(true);
    setErrorMessage('');

    getMemberOrders(token, { page, limit: PAGE_LIMIT })
      .then((data) => {
        if (!active) return;
        const nextPagination = data?.pagination || {};
        if (nextPagination.totalPages > 0 && page > nextPagination.totalPages) {
          setSearchParams(
            { page: String(nextPagination.totalPages) },
            { replace: true }
          );
          return;
        }

        setOrders(Array.isArray(data?.orders) ? data.orders : []);
        setPagination({
          page: nextPagination.page || page,
          limit: nextPagination.limit || PAGE_LIMIT,
          totalItems: nextPagination.totalItems || 0,
          totalPages: nextPagination.totalPages || 0,
        });
      })
      .catch((error) => {
        if (!active) return;
        if (error.status === 401 && error.code === 'UNAUTHORIZED') {
          const intendedRoute = `${location.pathname}${location.search}`;
          clearSession();
          navigate('/login', {
            replace: true,
            state: {
              from: intendedRoute,
              message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
            },
          });
          return;
        }
        setErrorMessage('Không thể tải đơn hàng lúc này. Vui lòng thử lại.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [clearSession, location.pathname, location.search, navigate, page, retryKey, setSearchParams, token]);

  const changePage = (nextPage) => {
    if (nextPage < 1 || (pagination.totalPages > 0 && nextPage > pagination.totalPages)) return;
    setSearchParams({ page: String(nextPage) });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center gap-2 text-xs text-[#737373]">
          <li><Link to="/account" className="hover:text-[#121212]">Tài khoản</Link></li>
          <li aria-hidden="true">/</li>
          <li className="font-bold text-[#121212]" aria-current="page">Đơn hàng của tôi</li>
        </ol>
      </nav>

      <header className="border-b border-[#d4d4ce] pb-5">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[#991b1b]">
          Member orders
        </p>
        <h1 className="mt-2 text-3xl font-black uppercase tracking-tight sm:text-4xl">
          Đơn hàng của tôi
        </h1>
        <p className="mt-2 max-w-2xl text-xs leading-5 text-[#737373]">
          Theo dõi lịch sử mua sắm và trạng thái xử lý của các đơn hàng Member.
        </p>
      </header>

      <div className="mt-8">
        {loading ? (
          <div role="status" className="space-y-3" aria-label="Đang tải đơn hàng">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-36 animate-pulse border border-[#e5e5e0] bg-white" />
            ))}
          </div>
        ) : errorMessage ? (
          <div className="border border-[#fecaca] bg-white p-6">
            <p role="alert" className="text-sm font-bold text-[#991b1b]">{errorMessage}</p>
            <button
              type="button"
              onClick={() => setRetryKey((value) => value + 1)}
              className="mt-5 min-h-[44px] bg-[#121212] px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-[#991b1b]"
            >
              Thử lại
            </button>
          </div>
        ) : orders.length === 0 ? (
          <section className="border border-[#d4d4ce] bg-white px-6 py-10 text-center sm:px-10">
            <h2 className="text-lg font-black uppercase tracking-tight text-[#121212]">
              Bạn chưa có đơn hàng nào.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-[#737373]">
              Khám phá bộ sưu tập giày đa thương hiệu của STEP/LAB.
            </p>
            <Link
              to="/products"
              className="mt-6 inline-flex min-h-[44px] items-center justify-center bg-[#121212] px-6 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-[#991b1b]"
            >
              Khám phá sản phẩm
            </Link>
          </section>
        ) : (
          <>
            <p className="mb-4 text-xs text-[#737373]">
              {pagination.totalItems} đơn hàng
            </p>
            <ol className="space-y-4">
              {orders.map((order) => {
                const status = getOrderStatusPresentation(order.status);
                const previewQuantity = (order.itemPreview || []).reduce(
                  (total, item) => total + item.quantity,
                  0
                );
                const remainingQuantity = Math.max(order.itemCount - previewQuantity, 0);

                return (
                  <li key={order.orderCode} className="border border-[#d4d4ce] bg-white">
                    <article className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(190px,0.7fr)_minmax(0,1.4fr)_minmax(180px,0.55fr)] lg:items-center">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#737373]">
                          Mã đơn hàng
                        </p>
                        <p className="mt-1 break-all font-mono text-sm font-black tracking-wide text-[#121212]">
                          {order.orderCode}
                        </p>
                        <time dateTime={order.createdAt} className="mt-2 block text-[11px] text-[#737373]">
                          {formatOrderDateTime(order.createdAt)}
                        </time>
                        <span className={`mt-3 inline-flex border px-2.5 py-1 text-[11px] font-bold ${status.badgeClass}`}>
                          {status.label}
                        </span>
                      </div>

                      <div className="border-y border-[#eeeeea] py-1 lg:border-x lg:border-y-0 lg:px-6 lg:py-0">
                        <OrderItems items={order.itemPreview} compact />
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#eeeeea] py-3 text-[11px] text-[#737373]">
                          <span>Tổng số lượng: <strong className="text-[#121212]">{order.itemCount}</strong></span>
                          {remainingQuantity > 0 && <span>+{remainingQuantity} sản phẩm khác</span>}
                        </div>
                      </div>

                      <div className="lg:text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#737373]">
                          {getOrderTotalLabel(order.status)}
                        </p>
                        <p className="mt-1 text-lg font-black text-[#121212]">{formatPrice(order.total)}</p>
                        <Link
                          to={`/account/orders/${encodeURIComponent(order.orderCode)}`}
                          className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center border border-[#121212] px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-[#121212] hover:bg-[#121212] hover:text-white lg:w-auto"
                        >
                          Xem chi tiết
                        </Link>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ol>

            {pagination.totalPages > 1 && (
              <nav aria-label="Phân trang đơn hàng" className="mt-8 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => changePage(page - 1)}
                  disabled={page <= 1}
                  className="min-h-[44px] border border-[#d4d4ce] px-4 text-xs font-bold uppercase tracking-wider hover:border-[#121212] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Trước
                </button>
                <span className="min-w-20 text-center text-xs font-bold" aria-current="page">
                  {page} / {pagination.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => changePage(page + 1)}
                  disabled={page >= pagination.totalPages}
                  className="min-h-[44px] border border-[#d4d4ce] px-4 text-xs font-bold uppercase tracking-wider hover:border-[#121212] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Tiếp
                </button>
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
}
