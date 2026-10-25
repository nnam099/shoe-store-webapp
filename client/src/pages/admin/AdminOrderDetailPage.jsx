import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAdminAuth } from '../../context/adminContextValue';
import { adminGetOrder, adminUpdateOrderStatus } from '../../services/adminService';
import { formatVND, formatDateTime, adminErrorMessage } from '../../utils/adminHelpers';
import AdminLayout from '../../components/admin/layout/AdminLayout';
import { OrderStatusBadge, CustomerTypeBadge } from '../../components/admin/common/AdminBadge';
import OrderStatusTransitionModal from '../../components/admin/orders/OrderStatusTransitionModal';
import { AdminToastContainer, useToasts } from '../../components/admin/common/AdminToast';
import OrderItemThumbnail from '../../components/order/OrderItemThumbnail';

const TRANSITION_ACTIONS = {
  PREPARING: { label: 'Chuẩn bị hàng', icon: '📦', color: 'bg-[#1e40af] hover:bg-[#1d4ed8] text-white' },
  SHIPPING: { label: 'Giao hàng', icon: '🚚', color: 'bg-[#4338ca] hover:bg-[#3730a3] text-white' },
  DELIVERED: { label: 'Xác nhận đã giao', icon: '📬', color: 'bg-[#0e7490] hover:bg-[#155e75] text-white' },
  COMPLETED: { label: 'Hoàn thành đơn', icon: '✓', color: 'bg-[#15803d] hover:bg-[#166534] text-white' },
  CANCELLED: { label: 'Hủy đơn hàng', icon: '✕', color: 'border border-[#dc2626] text-[#dc2626] hover:bg-[#fee2e2]' },
};

const STATUS_LABELS = {
  PENDING: 'Chờ xử lý',
  PREPARING: 'Đang chuẩn bị',
  SHIPPING: 'Đang giao hàng',
  DELIVERED: 'Đã giao hàng',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

export default function AdminOrderDetailPage() {
  const { orderCode } = useParams();
  const { token } = useAdminAuth();
  const { toasts, addToast, dismissToast } = useToasts();

  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Transition Modal State
  const [modalTargetStatus, setModalTargetStatus] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchOrderDetail = useCallback(async () => {
    if (!token || !orderCode) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminGetOrder(token, orderCode);
      setOrder(data?.order || null);
    } catch (err) {
      setOrder(null);
      setError(err.message || 'Không thể tải chi tiết đơn hàng.');
    } finally {
      setIsLoading(false);
    }
  }, [token, orderCode]);

  useEffect(() => {
    fetchOrderDetail();
  }, [fetchOrderDetail]);

  const handleOpenTransitionModal = (status) => {
    setModalTargetStatus(status);
  };

  const handleCloseTransitionModal = () => {
    if (!isUpdatingStatus) {
      setModalTargetStatus(null);
    }
  };

  const handleConfirmTransition = async () => {
    if (!modalTargetStatus || !token || !orderCode) return;
    setIsUpdatingStatus(true);
    try {
      const data = await adminUpdateOrderStatus(token, orderCode, { status: modalTargetStatus });
      setOrder(data?.order || null);
      addToast('success', `Đã chuyển đơn hàng sang trạng thái: ${STATUS_LABELS[modalTargetStatus] || modalTargetStatus}`);
      setModalTargetStatus(null);
    } catch (err) {
      if (err.status === 409 || err.code === 'ORDER_STATUS_NOT_ALLOWED') {
        addToast('error', 'Trạng thái đơn hàng vừa thay đổi trên hệ thống. Dữ liệu đang được làm mới...');
        await fetchOrderDetail();
      } else {
        addToast('error', adminErrorMessage(err));
      }
      setModalTargetStatus(null);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="py-24 text-center">
          <svg className="mx-auto h-6 w-6 animate-spin text-[#991b1b]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="mt-3 text-xs text-[#6b7280]">Đang tải chi tiết đơn hàng...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="border border-[#fecaca] bg-[#fef2f2] p-6 text-center">
          <h2 className="text-sm font-bold text-[#991b1b]">Không thể tải chi tiết đơn hàng</h2>
          <p className="mt-1 text-xs text-[#dc2626]">{error}</p>
          <div className="mt-4 flex justify-center gap-3">
            <button type="button" onClick={fetchOrderDetail} className="border border-[#991b1b] px-4 py-2 text-xs font-semibold text-[#991b1b] hover:bg-[#991b1b] hover:text-white">
              Thử lại
            </button>
            <Link to="/admin/orders" className="bg-[#121212] px-4 py-2 text-xs font-semibold text-white hover:bg-[#262626]">
              ← Quay về danh sách
            </Link>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!order) {
    return (
      <AdminLayout>
        <div className="border border-[#fecaca] bg-[#fef2f2] p-6 text-center">
          <h2 className="text-sm font-bold text-[#991b1b]">Không tìm thấy đơn hàng</h2>
          <p className="mt-1 text-xs text-[#dc2626]">Đơn hàng không tồn tại hoặc đã bị xóa.</p>
          <Link
            to="/admin/orders"
            className="mt-4 inline-block bg-[#121212] px-4 py-2 text-xs font-semibold text-white hover:bg-[#262626]"
          >
            ← Quay về danh sách đơn hàng
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const allowedTransitions = order.allowedNextStatuses || [];
  const items = order.items || [];
  const timeline = order.timeline || [];

  return (
    <AdminLayout>
      <AdminToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className="space-y-6">
        {/* Navigation Breadcrumb & Back */}
        <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-4">
          <div className="flex items-center gap-2 text-xs text-[#6b7280]">
            <Link to="/admin/orders" className="hover:text-[#121212]">
              Đơn hàng
            </Link>
            <span>/</span>
            <span className="font-mono font-semibold text-[#121212]">{order.orderCode}</span>
          </div>

          <Link
            to="/admin/orders"
            className="text-xs font-semibold text-[#6b7280] hover:text-[#121212]"
          >
            ← Quay lại danh sách
          </Link>
        </div>

        {/* Order Header Card with Status Transitions */}
        <div className="border border-[#e5e7eb] bg-white p-5 shadow-xs">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-mono text-xl font-bold tracking-tight text-[#121212]">
                  #{order.orderCode}
                </h1>
                <OrderStatusBadge status={order.status} />
                <CustomerTypeBadge type={order.customerType} />
              </div>
              <p className="mt-1 text-xs text-[#6b7280]">
                Đặt lúc: <span className="font-medium text-[#121212]">{formatDateTime(order.createdAt)}</span>
                {order.updatedAt && (
                  <span> &bull; Cập nhật: <span className="font-medium text-[#121212]">{formatDateTime(order.updatedAt)}</span></span>
                )}
              </p>
            </div>

            {/* Allowed Action Buttons */}
            {allowedTransitions.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-[#6b7280] mr-1">Chuyển tiếp:</span>
                {allowedTransitions.map((nextStatus) => {
                  const action = TRANSITION_ACTIONS[nextStatus] || {
                    label: nextStatus,
                    icon: '•',
                    color: 'bg-[#121212] text-white',
                  };
                  return (
                    <button
                      key={nextStatus}
                      type="button"
                      onClick={() => handleOpenTransitionModal(nextStatus)}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-all shadow-2xs ${action.color}`}
                    >
                      <span>{action.icon}</span>
                      <span>{action.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 2 Column Details: Left (Items & Totals), Right (Customer & Timeline) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Content (2 cols): Items Snapshot */}
          <div className="lg:col-span-2 space-y-6">
            {/* Items Table */}
            <div className="border border-[#e5e7eb] bg-white shadow-xs overflow-hidden">
              <div className="border-b border-[#e5e7eb] bg-[#f9fafb] px-4 py-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#121212]">
                  Sản phẩm trong đơn ({items.length})
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#374151]">
                  <thead className="border-b border-[#e5e7eb] bg-white text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">
                    <tr>
                      <th scope="col" className="px-4 py-2.5">Sản phẩm</th>
                      <th scope="col" className="px-4 py-2.5 text-center">Size</th>
                      <th scope="col" className="px-4 py-2.5 text-right">Đơn giá</th>
                      <th scope="col" className="px-4 py-2.5 text-center">SL</th>
                      <th scope="col" className="px-4 py-2.5 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f3f4f6]">
                    {items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[#f9fafb]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <OrderItemThumbnail
                              src={item.thumbnail}
                              alt={`${item.productName} - ${item.colorwayName}`}
                              imageClassName="h-12 w-12 object-cover border border-[#e5e7eb] bg-[#f3f4f6] shrink-0"
                              placeholderClassName="h-12 w-12 border border-[#e5e7eb] bg-[#f3f4f6] flex items-center justify-center text-[#9ca3af] text-[8px] shrink-0"
                            />
                            <div>
                              <p className="font-semibold text-xs text-[#121212]">{item.productName}</p>
                              <p className="text-[11px] text-[#6b7280]">Phối màu: {item.colorwayName || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold">
                          {item.size}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {formatVND(item.unitPrice)}
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-[#121212]">
                          {formatVND(item.lineTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Snapshot Summary */}
              <div className="border-t border-[#e5e7eb] bg-[#f9fafb] p-4 text-xs">
                <div className="max-w-xs ml-auto space-y-2">
                  <div className="flex justify-between text-[#6b7280]">
                    <span>Tạm tính hàng:</span>
                    <span className="font-mono font-medium text-[#121212]">{formatVND(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[#6b7280]">
                    <span>Phí vận chuyển:</span>
                    <span className="font-mono font-medium text-[#121212]">{formatVND(order.shippingFee)}</span>
                  </div>
                  <div className="flex justify-between border-t border-[#e5e7eb] pt-2 text-sm font-bold text-[#121212]">
                    <span>Tổng thanh toán:</span>
                    <span className="font-mono text-[#991b1b]">{formatVND(order.total)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-[#6b7280] pt-1">
                    <span>Phương thức:</span>
                    <span className="font-medium text-[#121212]">Thanh toán khi nhận hàng (COD)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Note from Buyer */}
            {order.note && (
              <div className="border border-[#e5e7eb] bg-white p-4 shadow-xs">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#6b7280] mb-1">
                  Ghi chú đơn hàng
                </h4>
                <p className="text-xs text-[#374151] italic bg-[#f9fafb] p-3 border border-[#e5e7eb] rounded-xs">
                  &ldquo;{order.note}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* Right Column (1 col): Customer & Timeline */}
          <div className="space-y-6">
            {/* Receiver & Customer Information */}
            <div className="border border-[#e5e7eb] bg-white p-5 shadow-xs space-y-4">
              <div className="border-b border-[#f3f4f6] pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#121212]">
                  Thông tin Giao nhận
                </h3>
              </div>

              {/* Receiver Info */}
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">Người nhận</span>
                  <p className="font-semibold text-sm text-[#121212]">{order.receiver?.name}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">Số điện thoại</span>
                  <p className="font-mono font-medium text-[#121212]">{order.receiver?.phone}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">Địa chỉ giao hàng</span>
                  <p className="text-[#374151] leading-relaxed mt-0.5">{order.receiver?.address}</p>
                </div>
              </div>

              {/* Member or Guest Account details */}
              <div className="border-t border-[#f3f4f6] pt-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">Tài khoản đặt hàng</span>
                {order.customerType === 'MEMBER' && order.member ? (
                  <div className="mt-2 rounded-xs border border-[#e5e7eb] bg-[#f9fafb] p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#121212]">{order.member.fullName}</span>
                      <CustomerTypeBadge type="MEMBER" />
                    </div>
                    <p className="text-[#6b7280]">{order.member.email}</p>
                    {order.member.phone && (
                      <p className="font-mono text-[#6b7280]">{order.member.phone}</p>
                    )}
                    <div className="pt-2 border-t border-[#e5e7eb] mt-2">
                      <Link
                        to={`/admin/customers/${order.member.id}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#991b1b] hover:underline"
                      >
                        Xem hồ sơ khách hàng →
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-2">
                    <CustomerTypeBadge type="GUEST" />
                    <span className="text-xs text-[#6b7280]">Khách vãng lai (không đăng nhập)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Status Timeline */}
            <div className="border border-[#e5e7eb] bg-white p-5 shadow-xs">
              <div className="border-b border-[#f3f4f6] pb-3 mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#121212]">
                  Lịch sử Trạng thái
                </h3>
              </div>

              {timeline.length === 0 ? (
                <p className="text-xs text-[#9ca3af]">Chưa có lịch sử trạng thái.</p>
              ) : (
                <div className="relative pl-4 border-l-2 border-[#e5e7eb] space-y-5">
                  {timeline.map((entry, idx) => (
                    <div key={idx} className="relative">
                      {/* Timeline dot */}
                      <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[#121212] border-2 border-white ring-2 ring-[#e5e7eb]" />
                      <div>
                        <OrderStatusBadge status={entry.status} />
                        <p className="mt-1 font-mono text-[11px] text-[#6b7280]">
                          {formatDateTime(entry.changedAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Special timestamps */}
              <div className="mt-6 border-t border-[#f3f4f6] pt-3 text-[11px] text-[#6b7280] space-y-1">
                {order.deliveredAt && (
                  <div>Đã giao hàng: <span className="font-medium text-[#121212]">{formatDateTime(order.deliveredAt)}</span></div>
                )}
                {order.completedAt && (
                  <div>Hoàn thành: <span className="font-medium text-[#121212]">{formatDateTime(order.completedAt)}</span></div>
                )}
                {order.cancelledAt && (
                  <div className="text-[#dc2626]">Đã hủy: <span className="font-medium">{formatDateTime(order.cancelledAt)}</span></div>
                )}
                {order.stockRestoredAt && (
                  <div className="text-[#059669]">Hoàn tồn kho: <span className="font-medium">{formatDateTime(order.stockRestoredAt)}</span></div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Transition Confirmation Modal */}
      <OrderStatusTransitionModal
        isOpen={Boolean(modalTargetStatus)}
        onClose={handleCloseTransitionModal}
        onConfirm={handleConfirmTransition}
        currentStatus={order.status}
        targetStatus={modalTargetStatus}
        isSubmitting={isUpdatingStatus}
        orderCode={order.orderCode}
      />
    </AdminLayout>
  );
}
