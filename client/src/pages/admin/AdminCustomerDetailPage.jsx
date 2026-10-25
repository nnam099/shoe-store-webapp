import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAdminAuth } from '../../context/adminContextValue';
import { adminGetCustomer, adminListCustomerOrders } from '../../services/adminService';
import { formatVND, formatDateTime } from '../../utils/adminHelpers';
import AdminLayout from '../../components/admin/layout/AdminLayout';
import { OrderStatusBadge } from '../../components/admin/common/AdminBadge';
import AdminPagination from '../../components/admin/common/AdminPagination';

export default function AdminCustomerDetailPage() {
  const { customerId } = useParams();
  const { token } = useAdminAuth();

  const [customer, setCustomer] = useState(null);
  const [summary, setSummary] = useState(null);
  const [isCustomerLoading, setIsCustomerLoading] = useState(true);
  const [customerError, setCustomerError] = useState(null);

  // Orders State
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [ordersPage, setOrdersPage] = useState(1);
  const [isOrdersLoading, setIsOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState(null);

  // Fetch customer profile & summary
  const fetchCustomer = useCallback(async () => {
    if (!token || !customerId) return;
    setIsCustomerLoading(true);
    setCustomerError(null);
    try {
      const data = await adminGetCustomer(token, customerId);
      setCustomer(data?.customer || null);
      setSummary(data?.summary || null);
    } catch (err) {
      setCustomerError(err.message || 'Không thể tải hồ sơ khách hàng.');
    } finally {
      setIsCustomerLoading(false);
    }
  }, [token, customerId]);

  // Fetch paginated customer orders
  const fetchCustomerOrders = useCallback(async () => {
    if (!token || !customerId) return;
    setIsOrdersLoading(true);
    setOrdersError(null);
    try {
      const data = await adminListCustomerOrders(token, customerId, {
        page: ordersPage,
        limit: 10,
        sort: 'newest',
      });
      setOrders(data?.items || []);
      setPagination(data?.pagination || null);
    } catch (err) {
      setOrders([]);
      setPagination(null);
      setOrdersError(err.message || 'Không thể tải lịch sử đơn hàng của khách.');
    } finally {
      setIsOrdersLoading(false);
    }
  }, [token, customerId, ordersPage]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  useEffect(() => {
    fetchCustomerOrders();
  }, [fetchCustomerOrders]);

  if (isCustomerLoading) {
    return (
      <AdminLayout>
        <div className="py-24 text-center">
          <svg className="mx-auto h-6 w-6 animate-spin text-[#991b1b]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="mt-3 text-xs text-[#6b7280]">Đang tải hồ sơ khách hàng...</p>
        </div>
      </AdminLayout>
    );
  }

  if (customerError) {
    return (
      <AdminLayout>
        <div className="border border-[#fecaca] bg-[#fef2f2] p-6 text-center">
          <h2 className="text-sm font-bold text-[#991b1b]">Không thể tải hồ sơ khách hàng</h2>
          <p className="mt-1 text-xs text-[#dc2626]">{customerError}</p>
          <div className="mt-4 flex justify-center gap-3">
            <button type="button" onClick={fetchCustomer} className="border border-[#991b1b] px-4 py-2 text-xs font-semibold text-[#991b1b] hover:bg-[#991b1b] hover:text-white">
              Thử lại
            </button>
            <Link to="/admin/customers" className="bg-[#121212] px-4 py-2 text-xs font-semibold text-white hover:bg-[#262626]">
              ← Quay về danh sách
            </Link>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!customer) {
    return (
      <AdminLayout>
        <div className="border border-[#fecaca] bg-[#fef2f2] p-6 text-center">
          <h2 className="text-sm font-bold text-[#991b1b]">Không tìm thấy khách hàng</h2>
          <p className="mt-1 text-xs text-[#dc2626]">Tài khoản thành viên không tồn tại.</p>
          <Link
            to="/admin/customers"
            className="mt-4 inline-block bg-[#121212] px-4 py-2 text-xs font-semibold text-white hover:bg-[#262626]"
          >
            ← Quay về danh sách khách hàng
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const kpiSummary = summary || {
    totalOrders: 0,
    completedOrders: 0,
    completedSpend: 0,
    lastOrderAt: null,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-4">
          <div className="flex items-center gap-2 text-xs text-[#6b7280]">
            <Link to="/admin/customers" className="hover:text-[#121212]">
              Khách hàng
            </Link>
            <span>/</span>
            <span className="font-semibold text-[#121212]">{customer.fullName || customer.email}</span>
          </div>

          <Link
            to="/admin/customers"
            className="text-xs font-semibold text-[#6b7280] hover:text-[#121212]"
          >
            ← Quay lại danh sách
          </Link>
        </div>

        {/* Profile Card & Summary */}
        <div className="border border-[#e5e7eb] bg-white p-5 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#f3f4f6] pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#18181b] font-bold text-white text-base">
                {(customer.fullName || customer.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-lg font-bold text-[#121212]">
                  {customer.fullName || 'Chưa cập nhật họ tên'}
                </h1>
                <p className="font-mono text-xs text-[#6b7280]">{customer.email}</p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#f3f4f6] px-2.5 py-0.5 text-[11px] font-semibold text-[#374151]">
                Mã TV: #{customer.id}
              </span>
              <p className="mt-1 text-[11px] text-[#6b7280]">
                Đăng ký: {formatDateTime(customer.createdAt)}
              </p>
            </div>
          </div>

          {/* Profile Fields (Read-Only) */}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">Số điện thoại</span>
              <p className="mt-0.5 font-mono font-medium text-[#121212]">{customer.phone || '— (Chưa cung cấp)'}</p>
            </div>
            <div className="sm:col-span-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">Địa chỉ mặc định</span>
              <p className="mt-0.5 text-[#121212] leading-relaxed">{customer.address || '— (Chưa cung cấp)'}</p>
            </div>
          </div>
        </div>

        {/* 4 Spending Metric Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border border-[#e5e7eb] bg-white p-4 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">
              Tổng đơn đã đặt
            </span>
            <div className="mt-2 text-xl font-bold font-mono text-[#121212]">
              {kpiSummary.totalOrders}
            </div>
            <p className="mt-0.5 text-[10px] text-[#9ca3af]">Bao gồm mọi trạng thái</p>
          </div>

          <div className="border border-[#e5e7eb] bg-white p-4 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">
              Đơn hoàn thành
            </span>
            <div className="mt-2 text-xl font-bold font-mono text-[#15803d]">
              {kpiSummary.completedOrders}
            </div>
            <p className="mt-0.5 text-[10px] text-[#9ca3af]">Giao dịch thành công</p>
          </div>

          <div className="border border-[#e5e7eb] bg-white p-4 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">
              Tổng chi tiêu hoàn thành
            </span>
            <div className="mt-2 text-xl font-bold font-mono text-[#991b1b]">
              {formatVND(kpiSummary.completedSpend)}
            </div>
            <p className="mt-0.5 text-[10px] text-[#9ca3af]">Chỉ tính đơn hoàn thành</p>
          </div>

          <div className="border border-[#e5e7eb] bg-white p-4 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">
              Đơn hàng gần nhất
            </span>
            <div className="mt-2 text-sm font-semibold text-[#121212]">
              {kpiSummary.lastOrderAt ? formatDateTime(kpiSummary.lastOrderAt) : 'Chưa có'}
            </div>
            <p className="mt-0.5 text-[10px] text-[#9ca3af]">Thời điểm phát sinh đơn mới nhất</p>
          </div>
        </div>

        {/* Paginated Customer Orders Table */}
        <div className="border border-[#e5e7eb] bg-white shadow-xs overflow-hidden">
          <div className="border-b border-[#e5e7eb] bg-[#f9fafb] px-4 py-3 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#121212]">
              Lịch sử Đơn hàng của Khách ({pagination?.totalItems || 0})
            </h3>
            {isOrdersLoading && (
              <span className="text-[11px] text-[#6b7280]">Đang tải...</span>
            )}
          </div>

          {ordersError && (
            <div className="flex items-center justify-between gap-4 p-3 text-xs text-[#dc2626] bg-[#fef2f2] border-b border-[#fecaca]">
              <span>{ordersError}</span>
              <button type="button" onClick={fetchCustomerOrders} className="shrink-0 border border-[#dc2626] px-3 py-1 font-semibold hover:bg-[#dc2626] hover:text-white">
                Thử lại
              </button>
            </div>
          )}

          {!ordersError && <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#374151]">
              <thead className="border-b border-[#e5e7eb] bg-white text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">
                <tr>
                  <th scope="col" className="px-4 py-2.5">Mã đơn hàng</th>
                  <th scope="col" className="px-4 py-2.5">Thời gian đặt</th>
                  <th scope="col" className="px-4 py-2.5">Người nhận</th>
                  <th scope="col" className="px-4 py-2.5 text-center">Số lượng</th>
                  <th scope="col" className="px-4 py-2.5 text-right">Tổng tiền</th>
                  <th scope="col" className="px-4 py-2.5">Trạng thái</th>
                  <th scope="col" className="px-4 py-2.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f3f4f6]">
                {isOrdersLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#6b7280]">
                      <svg className="mx-auto h-4 w-4 animate-spin text-[#991b1b]" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <p className="mt-1 text-xs">Đang tải danh sách đơn...</p>
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#9ca3af]">
                      Khách hàng này chưa có đơn hàng nào.
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.orderCode} className="hover:bg-[#f9fafb] transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-[#121212]">
                        <Link
                          to={`/admin/orders/${o.orderCode}`}
                          className="hover:text-[#991b1b] transition-colors"
                        >
                          {o.orderCode}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[#6b7280]">
                        {formatDateTime(o.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-[#121212]">{o.receiverName}</span>
                        <div className="font-mono text-[11px] text-[#6b7280]">{o.receiverPhone}</div>
                      </td>
                      <td className="px-4 py-3 text-center font-mono">
                        {o.itemCount}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-[#121212]">
                        {formatVND(o.total)}
                      </td>
                      <td className="px-4 py-3">
                        <OrderStatusBadge status={o.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/admin/orders/${o.orderCode}`}
                          className="inline-flex items-center gap-1 border border-[#d1d5db] bg-white px-2.5 py-1 text-xs font-semibold text-[#121212] hover:border-[#121212] hover:bg-[#121212] hover:text-white transition-colors"
                        >
                          Xem đơn
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
          </div>}

          {!ordersError && <AdminPagination
            pagination={pagination}
            onPageChange={(p) => setOrdersPage(p)}
          />}
        </div>
      </div>
    </AdminLayout>
  );
}
