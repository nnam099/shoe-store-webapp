import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAdminAuth } from '../../context/adminContextValue';
import { adminListCustomers } from '../../services/adminService';
import { formatDateTime } from '../../utils/adminHelpers';
import AdminLayout from '../../components/admin/layout/AdminLayout';
import AdminPagination from '../../components/admin/common/AdminPagination';

const CUSTOMER_SORTS = [
  'newest',
  'oldest',
  'name-asc',
  'name-desc',
  'email-asc',
  'email-desc',
  'order-count-desc',
];
const getCustomerSort = (value) => (CUSTOMER_SORTS.includes(value) ? value : 'newest');

export default function AdminCustomersPage() {
  const { token } = useAdminAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const queryParam = searchParams.get('q') || '';
  const hasOrdersParam = searchParams.get('hasOrders') || '';
  const sortParam = getCustomerSort(searchParams.get('sort'));
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  const [q, setQ] = useState(queryParam);
  const [hasOrders, setHasOrders] = useState(hasOrdersParam);
  const [sort, setSort] = useState(sortParam);
  const [page, setPage] = useState(pageParam);

  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setQ(searchParams.get('q') || '');
    setHasOrders(searchParams.get('hasOrders') || '');
    setSort(getCustomerSort(searchParams.get('sort')));
    setPage(parseInt(searchParams.get('page') || '1', 10));
  }, [searchParams]);

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

  const fetchCustomers = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminListCustomers(token, {
        page,
        limit: 10,
        q: q.trim(),
        hasOrders,
        sort,
      });
      setCustomers(data?.items || []);
      setPagination(data?.pagination || null);
    } catch (err) {
      setCustomers([]);
      setPagination(null);
      setError(err.message || 'Không thể tải danh sách khách hàng.');
    } finally {
      setIsLoading(false);
    }
  }, [token, page, q, hasOrders, sort]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateParams({ q, page: 1 });
  };

  const handleHasOrdersChange = (val) => {
    setHasOrders(val);
    updateParams({ hasOrders: val, page: 1 });
  };

  const handleSortChange = (val) => {
    setSort(val);
    updateParams({ sort: val, page: 1 });
  };

  const handleResetFilters = () => {
    setQ('');
    setHasOrders('');
    setSort('newest');
    setSearchParams({});
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    updateParams({ page: newPage });
  };

  const hasActiveFilters = q || hasOrders || sort !== 'newest';

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#e5e7eb] pb-5">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#121212]">
              Quản lý Khách hàng
            </h1>
            <p className="mt-0.5 text-xs text-[#6b7280]">
              Tra cứu danh sách thành viên đăng ký tài khoản, lịch sử mua hàng và mức chi tiêu.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchCustomers}
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Search */}
            <form onSubmit={handleSearchSubmit} className="flex">
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tìm họ tên, email, SĐT..."
                className="w-full border border-r-0 border-[#d1d5db] px-3 py-2 text-xs placeholder-[#9ca3af] focus:border-[#121212] focus:outline-none"
              />
              <button
                type="submit"
                className="bg-[#121212] px-3 py-2 text-xs font-semibold text-white hover:bg-[#262626] transition-colors"
              >
                Tìm
              </button>
            </form>

            {/* Has Orders Filter */}
            <div>
              <select
                value={hasOrders}
                onChange={(e) => handleHasOrdersChange(e.target.value)}
                className="w-full border border-[#d1d5db] bg-white px-3 py-2 text-xs text-[#374151] focus:border-[#121212] focus:outline-none"
              >
                <option value="">Tất cả thành viên</option>
                <option value="true">Đã từng mua hàng (Có đơn)</option>
                <option value="false">Chưa từng mua hàng (0 đơn)</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <select
                value={sort}
                onChange={(e) => handleSortChange(e.target.value)}
                className="w-full border border-[#d1d5db] bg-white px-3 py-2 text-xs text-[#374151] focus:border-[#121212] focus:outline-none"
              >
                <option value="newest">Mới đăng ký trước</option>
                <option value="oldest">Đăng ký cũ nhất trước</option>
                <option value="name-asc">Tên A → Z</option>
                <option value="name-desc">Tên Z → A</option>
                <option value="email-asc">Email A → Z</option>
                <option value="email-desc">Email Z → A</option>
                <option value="order-count-desc">Nhiều đơn hàng nhất</option>
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex justify-end border-t border-[#f3f4f6] pt-2">
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-medium text-[#dc2626] hover:underline"
              >
                ✕ Xóa bộ lọc
              </button>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center justify-between gap-4 border border-[#fecaca] bg-[#fef2f2] p-4 text-xs text-[#991b1b]">
            <p><span className="font-semibold">Lỗi: </span>{error}</p>
            <button type="button" onClick={fetchCustomers} className="shrink-0 border border-[#991b1b] px-3 py-1.5 font-semibold hover:bg-[#991b1b] hover:text-white">
              Thử lại
            </button>
          </div>
        )}

        {/* Customers Table */}
        {!error && <div className="border border-[#e5e7eb] bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#374151]">
              <thead className="border-b border-[#e5e7eb] bg-[#f9fafb] text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">
                <tr>
                  <th scope="col" className="px-4 py-3">Họ và tên</th>
                  <th scope="col" className="px-4 py-3">Email</th>
                  <th scope="col" className="px-4 py-3">Số điện thoại</th>
                  <th scope="col" className="px-4 py-3">Địa chỉ</th>
                  <th scope="col" className="px-4 py-3 text-center">Số đơn</th>
                  <th scope="col" className="px-4 py-3">Ngày đăng ký</th>
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
                      <p className="mt-2 text-xs">Đang tải danh sách khách hàng...</p>
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#9ca3af]">
                      <svg className="mx-auto h-8 w-8 text-[#d1d5db]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="mt-2 text-sm font-medium text-[#6b7280]">Không tìm thấy khách hàng nào</p>
                      <p className="mt-0.5 text-xs text-[#9ca3af]">Thử thay đổi từ khóa hoặc bộ lọc</p>
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id} className="hover:bg-[#f9fafb] transition-colors">
                      <td className="px-4 py-3.5">
                        <Link
                          to={`/admin/customers/${c.id}`}
                          className="font-semibold text-xs text-[#121212] hover:text-[#991b1b] transition-colors"
                        >
                          {c.fullName || '—'}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[#6b7280]">
                        {c.email}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[#6b7280]">
                        {c.phone || '—'}
                      </td>
                      <td className="px-4 py-3.5 text-[#6b7280] max-w-[200px] truncate">
                        {c.address || '—'}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-block font-mono text-xs font-bold px-2 py-0.5 rounded-full ${
                          c.orderCount > 0 ? 'bg-[#dbeafe] text-[#1e40af]' : 'bg-[#f3f4f6] text-[#6b7280]'
                        }`}>
                          {c.orderCount}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-[#6b7280]">
                        {formatDateTime(c.createdAt)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          to={`/admin/customers/${c.id}`}
                          className="inline-flex items-center gap-1 border border-[#d1d5db] bg-white px-2.5 py-1 text-xs font-semibold text-[#121212] hover:border-[#121212] hover:bg-[#121212] hover:text-white transition-colors"
                        >
                          Hồ sơ
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

          <AdminPagination pagination={pagination} onPageChange={handlePageChange} />
        </div>}
      </div>
    </AdminLayout>
  );
}
