import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '../../context/adminContextValue';
import { adminGetDashboardSummary } from '../../services/adminService';
import { formatVND, formatDateTime } from '../../utils/adminHelpers';
import AdminLayout from '../../components/admin/layout/AdminLayout';
import { OrderStatusBadge } from '../../components/admin/common/AdminBadge';
import RevenueChart from '../../components/admin/dashboard/RevenueChart';

export default function AdminDashboardPage() {
  const { token } = useAdminAuth();

  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummary = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminGetDashboardSummary(token);
      setSummary(data);
    } catch (err) {
      setSummary(null);
      setError(err.message || 'Không thể tải dữ liệu tổng quan.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  if (!isLoading && error) {
    return (
      <AdminLayout>
        <div className="border border-[#fecaca] bg-[#fef2f2] p-6 text-center">
          <h1 className="text-sm font-bold text-[#991b1b]">Không thể tải bảng điều khiển</h1>
          <p className="mt-1 text-xs text-[#dc2626]">{error}</p>
          <button type="button" onClick={fetchSummary} className="mt-4 border border-[#991b1b] px-4 py-2 text-xs font-semibold text-[#991b1b] hover:bg-[#991b1b] hover:text-white">
            Thử lại
          </button>
        </div>
      </AdminLayout>
    );
  }

  const kpis = summary?.kpis || {
    revenueToday: 0,
    ordersToday: 0,
    totalProducts: 0,
    totalMembers: 0,
  };

  const statusCounts = summary?.orderStatusCounts || {
    PENDING: 0,
    PREPARING: 0,
    SHIPPING: 0,
    DELIVERED: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  };

  const bestSelling = summary?.bestSellingProducts || [];
  const lowStock = summary?.lowStockVariants || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#e5e7eb] pb-5">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#121212]">
              Bảng điều khiển Quản trị
            </h1>
            <p className="mt-0.5 text-xs text-[#6b7280]">
              Tổng hợp hoạt động bán hàng, đơn hàng, danh mục và tài nguyên hệ thống.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {summary?.generatedAt && (
              <span className="text-[11px] text-[#6b7280]">
                Cập nhật lúc: {formatDateTime(summary.generatedAt)}
              </span>
            )}
            <button
              type="button"
              onClick={fetchSummary}
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

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Revenue Today */}
          <div className="border border-[#e5e7eb] bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">
                Doanh thu hôm nay
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xs bg-[#fef2f2] text-[#991b1b]">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <span className="text-xl font-bold tracking-tight text-[#121212]">
                {isLoading ? '...' : formatVND(kpis.revenueToday)}
              </span>
              <p className="mt-1 text-[11px] text-[#6b7280]">Chỉ tính đơn hoàn thành trong ngày</p>
            </div>
          </div>

          {/* Orders Today */}
          <div className="border border-[#e5e7eb] bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">
                Đơn hàng hôm nay
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xs bg-[#eff6ff] text-[#2563eb]">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold tracking-tight text-[#121212]">
                {isLoading ? '...' : kpis.ordersToday}
              </span>
              <p className="mt-1 text-[11px] text-[#6b7280]">Đơn mới tạo trong ngày</p>
            </div>
          </div>

          {/* Total Products */}
          <div className="border border-[#e5e7eb] bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">
                Tổng sản phẩm
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xs bg-[#f3f4f6] text-[#374151]">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold tracking-tight text-[#121212]">
                {isLoading ? '...' : kpis.totalProducts}
              </span>
              <p className="mt-1 text-[11px] text-[#6b7280]">Toàn bộ danh mục catalog</p>
            </div>
          </div>

          {/* Total Members */}
          <div className="border border-[#e5e7eb] bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">
                Tổng thành viên
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xs bg-[#ecfdf5] text-[#059669]">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold tracking-tight text-[#121212]">
                {isLoading ? '...' : kpis.totalMembers}
              </span>
              <p className="mt-1 text-[11px] text-[#6b7280]">Tài khoản khách hàng đã đăng ký</p>
            </div>
          </div>
        </div>

        {/* Revenue Chart Section */}
        <RevenueChart token={token} />

        {/* Order Status Distribution */}
        <div className="border border-[#e5e7eb] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#f3f4f6] pb-3 mb-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#121212]">
                Phân bố Trạng thái Đơn hàng
              </h3>
              <p className="mt-0.5 text-xs text-[#6b7280]">
                Nhấp vào trạng thái để lọc nhanh danh sách đơn hàng
              </p>
            </div>
            <Link
              to="/admin/orders"
              className="text-xs font-semibold text-[#991b1b] hover:underline"
            >
              Xem tất cả đơn hàng →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { status: 'PENDING', label: 'Chờ xử lý', count: statusCounts.PENDING },
              { status: 'PREPARING', label: 'Đang chuẩn bị', count: statusCounts.PREPARING },
              { status: 'SHIPPING', label: 'Đang giao hàng', count: statusCounts.SHIPPING },
              { status: 'DELIVERED', label: 'Đã giao hàng', count: statusCounts.DELIVERED },
              { status: 'COMPLETED', label: 'Hoàn thành', count: statusCounts.COMPLETED },
              { status: 'CANCELLED', label: 'Đã hủy', count: statusCounts.CANCELLED },
            ].map((item) => (
              <Link
                key={item.status}
                to={`/admin/orders?status=${item.status}`}
                className="group flex flex-col justify-between border border-[#e5e7eb] bg-[#f9fafb] p-3.5 hover:border-[#121212] hover:bg-white transition-all shadow-2xs"
              >
                <div>
                  <OrderStatusBadge status={item.status} />
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-[#121212] group-hover:text-[#991b1b]">
                    {item.count}
                  </span>
                  <span className="text-[10px] text-[#9ca3af] group-hover:text-[#121212]">
                    Đơn →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 2 Bottom Panels: Best Selling Products & Low Stock Alerts */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Best Selling Products */}
          <div className="border border-[#e5e7eb] bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#f3f4f6] pb-3 mb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#121212]">
                Sản phẩm Bán chạy nhất
              </h3>
              <span className="text-[11px] text-[#6b7280]">Toàn thời gian</span>
            </div>

            {bestSelling.length === 0 ? (
              <p className="py-8 text-center text-xs text-[#9ca3af]">Chưa có dữ liệu bán hàng.</p>
            ) : (
              <div className="divide-y divide-[#f3f4f6]">
                {bestSelling.map((p, idx) => (
                  <div key={p.productId} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                        idx === 0
                          ? 'bg-[#fef3c7] text-[#b45309]'
                          : idx === 1
                          ? 'bg-[#e5e7eb] text-[#374151]'
                          : idx === 2
                          ? 'bg-[#fed7aa] text-[#9a3412]'
                          : 'bg-[#f3f4f6] text-[#6b7280]'
                      }`}>
                        {idx + 1}
                      </span>
                      <div>
                        <Link
                          to={`/admin/products/${p.productId}`}
                          className="text-xs font-semibold text-[#121212] hover:text-[#991b1b] transition-colors"
                        >
                          {p.name}
                        </Link>
                        {p.brandName && (
                          <p className="text-[10px] text-[#6b7280]">{p.brandName}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-xs font-bold text-[#121212]">{p.quantitySold}</span>
                      <span className="text-[10px] text-[#6b7280] ml-1">đôi đã bán</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Low Stock Variants */}
          <div className="border border-[#e5e7eb] bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#f3f4f6] pb-3 mb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#121212]">
                Cảnh báo Tồn kho thấp (&le; 3)
              </h3>
              <span className="text-[11px] font-semibold text-[#dc2626]">
                {lowStock.length} kích cỡ cần nhập
              </span>
            </div>

            {lowStock.length === 0 ? (
              <p className="py-8 text-center text-xs text-[#16a34a]">
                Tất cả các mặt hàng hiện đều có tồn kho an toàn (&gt; 3).
              </p>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-[#f3f4f6] no-scrollbar">
                {lowStock.map((v) => (
                  <div key={v.variantId} className="flex items-center justify-between py-2.5">
                    <div className="pr-2">
                      <Link
                        to={`/admin/products/${v.product?.id}`}
                        className="text-xs font-semibold text-[#121212] hover:text-[#991b1b] transition-colors line-clamp-1"
                      >
                        {v.product?.name || 'Sản phẩm'}
                      </Link>
                      <p className="text-[10px] text-[#6b7280]">
                        Phối màu: <span className="text-[#374151] font-medium">{v.colorway?.name || '—'}</span> &bull; Size: <span className="font-mono font-semibold">{v.size}</span>
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span
                        className={`inline-block rounded-xs px-2 py-0.5 font-mono text-[11px] font-bold ${
                          v.stock === 0
                            ? 'bg-[#fee2e2] text-[#dc2626]'
                            : 'bg-[#fef3c7] text-[#b45309]'
                        }`}
                      >
                        {v.stock === 0 ? 'Hết hàng (0)' : `Còn ${v.stock}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
