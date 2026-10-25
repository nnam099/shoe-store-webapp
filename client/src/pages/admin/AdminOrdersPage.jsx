import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAdminAuth } from '../../context/adminContextValue';
import { adminListOrders } from '../../services/adminService';
import { formatVND, formatDateTime } from '../../utils/adminHelpers';
import AdminLayout from '../../components/admin/layout/AdminLayout';
import { OrderStatusBadge, CustomerTypeBadge } from '../../components/admin/common/AdminBadge';
import AdminPagination from '../../components/admin/common/AdminPagination';

const ORDER_SORTS = ['newest', 'oldest', 'total-asc', 'total-desc'];
const getOrderSort = (value) => (ORDER_SORTS.includes(value) ? value : 'newest');

export default function AdminOrdersPage() {
  const { token } = useAdminAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Search/filter state initialized from URL
  const queryParam = searchParams.get('q') || '';
  const statusParam = searchParams.get('status') || '';
  const customerTypeParam = searchParams.get('customerType') || '';
  const fromParam = searchParams.get('from') || '';
  const toParam = searchParams.get('to') || '';
  const sortParam = getOrderSort(searchParams.get('sort'));
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  const [q, setQ] = useState(queryParam);
  const [status, setStatus] = useState(statusParam);
  const [customerType, setCustomerType] = useState(customerTypeParam);
  const [fromDate, setFromDate] = useState(fromParam);
  const [toDate, setToDate] = useState(toParam);
  const [sort, setSort] = useState(sortParam);
  const [page, setPage] = useState(pageParam);

  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sync state if URL searchParams change (e.g. navigation from dashboard)
  useEffect(() => {
    setQ(searchParams.get('q') || '');
    setStatus(searchParams.get('status') || '');
    setCustomerType(searchParams.get('customerType') || '');
    setFromDate(searchParams.get('from') || '');
    setToDate(searchParams.get('to') || '');
    setSort(getOrderSort(searchParams.get('sort')));
    setPage(parseInt(searchParams.get('page') || '1', 10));
  }, [searchParams]);

  // Update URL params
  const updateParams = useCallback((newParams) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== null) {
        next.set(k, String(v));
      } else {
        next.delete(k);
      }
    });
    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  const fetchOrders = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminListOrders(token, {
        page,
        limit: 10,
        q: q.trim(),
        status,
        customerType,
        from: fromDate,
        to: toDate,
        sort,
      });
      setOrders(data?.items || []);
      setPagination(data?.pagination || null);
    } catch (err) {
      setOrders([]);
      setPagination(null);
      setError(err.message || 'Không thể tải danh sách đơn hàng.');
    } finally {
      setIsLoading(false);
    }
  }, [token, page, q, status, customerType, fromDate, toDate, sort]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateParams({ q, page: 1 });
  };

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    updateParams({ status: newStatus, page: 1 });
  };

  const handleCustomerTypeChange = (newType) => {
    setCustomerType(newType);
    updateParams({ customerType: newType, page: 1 });
  };

  const handleDateFilterSubmit = (e) => {
    e.preventDefault();
    updateParams({ from: fromDate, to: toDate, page: 1 });
  };

  const handleSortChange = (newSort) => {
    setSort(newSort);
    updateParams({ sort: newSort, page: 1 });
  };

  const handleResetFilters = () => {
    setQ('');
    setStatus('');
    setCustomerType('');
    setFromDate('');
    setToDate('');
    setSort('newest');
    setSearchParams({});
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    updateParams({ page: newPage });
  };

  const hasActiveFilters = q || status || customerType || fromDate || toDate || sort !== 'newest';

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#e5e7eb] pb-5">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#121212]">
              Quản lý Đơn hàng
            </h1>
            <p className="mt-0.5 text-xs text-[#6b7280]">
              Theo dõi tình trạng xử lý đơn, giao nhận và chuyển bước quy trình COD.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchOrders}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 border border-[#d1d5db] bg-white px-3 py-1.5 text-xs font-semibold text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50 transition-colors shadow-2xs"
            >
              <svg
                className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-[#991b1b]' : 'text-[#6b7280]'}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Làm mới
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="border border-[#e5e7eb] bg-white p-4 shadow-xs space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Search */}
            <form onSubmit={handleSearchSubmit} className="flex">
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tìm mã đơn, tên, số ĐT..."
                className="w-full border border-r-0 border-[#d1d5db] px-3 py-2 text-xs placeholder-[#9ca3af] focus:border-[#121212] focus:outline-none"
              />
              <button
                type="submit"
                className="bg-[#121212] px-3 py-2 text-xs font-semibold text-white hover:bg-[#262626] transition-colors"
              >
                Tìm
              </button>
            </form>

            {/* Status Filter */}
            <div>
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full border border-[#d1d5db] bg-white px-3 py-2 text-xs text-[#374151] focus:border-[#121212] focus:outline-none"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="PENDING">Chờ xử lý (PENDING)</option>
                <option value="PREPARING">Đang chuẩn bị (PREPARING)</option>
                <option value="SHIPPING">Đang giao hàng (SHIPPING)</option>
                <option value="DELIVERED">Đã giao hàng (DELIVERED)</option>
                <option value="COMPLETED">Hoàn thành (COMPLETED)</option>
                <option value="CANCELLED">Đã hủy (CANCELLED)</option>
              </select>
            </div>

            {/* Customer Type Filter */}
            <div>
              <select
                value={customerType}
                onChange={(e) => handleCustomerTypeChange(e.target.value)}
                className="w-full border border-[#d1d5db] bg-white px-3 py-2 text-xs text-[#374151] focus:border-[#121212] focus:outline-none"
              >
                <option value="">Tất cả loại khách</option>
                <option value="MEMBER">Thành viên (Member)</option>
                <option value="GUEST">Khách vãng lai (Guest)</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <select
                value={sort}
                onChange={(e) => handleSortChange(e.target.value)}
                className="w-full border border-[#d1d5db] bg-white px-3 py-2 text-xs text-[#374151] focus:border-[#121212] focus:outline-none"
              >
                <option value="newest">Mới nhất trước</option>
                <option value="oldest">Cũ nhất trước</option>
                <option value="total-desc">Giá trị cao nhất</option>
                <option value="total-asc">Giá trị thấp nhất</option>
              </select>
            </div>
          </div>

          {/* Date range filter and clear button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#f3f4f6] pt-3">
            <form onSubmit={handleDateFilterSubmit} className="flex flex-wrap items-center gap-2 text-xs text-[#6b7280]">
              <span>Từ ngày:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="border border-[#d1d5db] px-2 py-1 text-xs text-[#374151] focus:border-[#121212] focus:outline-none"
              />
              <span>đến:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="border border-[#d1d5db] px-2 py-1 text-xs text-[#374151] focus:border-[#121212] focus:outline-none"
              />
              <button
                type="submit"
                className="border border-[#d1d5db] bg-[#f9fafb] px-3 py-1 text-xs font-semibold text-[#374151] hover:bg-[#f3f4f6] transition-colors"
              >
                Lọc ngày
              </button>
            </form>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-medium text-[#dc2626] hover:underline"
              >
                ✕ Xóa bộ lọc
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center justify-between gap-4 border border-[#fecaca] bg-[#fef2f2] p-4 text-xs text-[#991b1b]">
            <p><span className="font-semibold">Lỗi: </span>{error}</p>
            <button type="button" onClick={fetchOrders} className="shrink-0 border border-[#991b1b] px-3 py-1.5 font-semibold hover:bg-[#991b1b] hover:text-white">
              Thử lại
            </button>
          </div>
        )}

        {/* Orders Table */}
        {!error && <div className="border border-[#e5e7eb] bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#374151]">
              <thead className="border-b border-[#e5e7eb] bg-[#f9fafb] text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">
                <tr>
                  <th scope="col" className="px-4 py-3">Mã đơn hàng</th>
                  <th scope="col" className="px-4 py-3">Thời gian tạo</th>
                  <th scope="col" className="px-4 py-3">Người nhận & Khách</th>
                  <th scope="col" className="px-4 py-3 text-center">Số lượng</th>
                  <th scope="col" className="px-4 py-3 text-right">Tổng tiền (VND)</th>
                  <th scope="col" className="px-4 py-3">Trạng thái</th>
                  <th scope="col" className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f3f4f6]">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#6b7280]">
                      <svg className="mx-auto h-5 w-5 animate-spin text-[#991b1b]" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <p className="mt-2 text-xs">Đang tải danh sách đơn hàng...</p>
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#9ca3af]">
                      <svg className="mx-auto h-8 w-8 text-[#d1d5db]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      <p className="mt-2 text-sm font-medium text-[#6b7280]">Không tìm thấy đơn hàng nào</p>
                      <p className="mt-0.5 text-xs text-[#9ca3af]">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.orderCode} className="hover:bg-[#f9fafb] transition-colors">
                      {/* Code */}
                      <td className="px-4 py-3.5">
                        <Link
                          to={`/admin/orders/${order.orderCode}`}
                          className="font-mono text-xs font-bold text-[#121212] hover:text-[#991b1b] transition-colors"
                        >
                          {order.orderCode}
                        </Link>
                        <div className="mt-0.5 text-[10px] text-[#6b7280]">
                          COD
                        </div>
                      </td>

                      {/* Created At */}
                      <td className="px-4 py-3.5 text-[#6b7280]">
                        {formatDateTime(order.createdAt)}
                      </td>

                      {/* Customer Info */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-[#121212]">{order.receiverName}</span>
                          <CustomerTypeBadge type={order.customerType} />
                        </div>
                        <div className="mt-0.5 font-mono text-[11px] text-[#6b7280]">
                          {order.receiverPhone}
                        </div>
                        {order.member?.email && (
                          <div className="text-[10px] text-[#9ca3af] truncate max-w-[180px]">
                            {order.member.email}
                          </div>
                        )}
                      </td>

                      {/* Item Count */}
                      <td className="px-4 py-3.5 text-center font-mono">
                        {order.itemCount}
                      </td>

                      {/* Total */}
                      <td className="px-4 py-3.5 text-right">
                        <span className="font-mono font-bold text-[#121212]">
                          {formatVND(order.total)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <OrderStatusBadge status={order.status} />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          to={`/admin/orders/${order.orderCode}`}
                          className="inline-flex items-center gap-1 border border-[#d1d5db] bg-white px-2.5 py-1 text-xs font-semibold text-[#121212] hover:border-[#121212] hover:bg-[#121212] hover:text-white transition-colors"
                        >
                          Chi tiết
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <AdminPagination pagination={pagination} onPageChange={handlePageChange} />
        </div>}
      </div>
    </AdminLayout>
  );
}
