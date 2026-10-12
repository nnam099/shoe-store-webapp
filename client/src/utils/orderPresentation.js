export const ORDER_STATUS_PRESENTATION = Object.freeze({
  PENDING: {
    label: 'Chờ xử lý',
    badgeClass: 'border-[#fde68a] bg-[#fef3c7] text-[#92400e]',
  },
  PREPARING: {
    label: 'Đang chuẩn bị hàng',
    badgeClass: 'border-[#bae6fd] bg-[#e0f2fe] text-[#075985]',
  },
  SHIPPING: {
    label: 'Đang giao hàng',
    badgeClass: 'border-[#e9d5ff] bg-[#f3e8ff] text-[#6b21a8]',
  },
  DELIVERED: {
    label: 'Đã giao hàng',
    badgeClass: 'border-[#a7f3d0] bg-[#ecfdf5] text-[#065f46]',
  },
  COMPLETED: {
    label: 'Hoàn tất',
    badgeClass: 'border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]',
  },
  CANCELLED: {
    label: 'Đã hủy',
    badgeClass: 'border-[#fecaca] bg-[#fef2f2] text-[#991b1b]',
  },
});

const UNKNOWN_STATUS = Object.freeze({
  label: 'Trạng thái chưa xác định',
  badgeClass: 'border-[#e5e5e0] bg-[#f5f5f3] text-[#525252]',
});

export function getOrderStatusPresentation(status) {
  return ORDER_STATUS_PRESENTATION[status] || UNKNOWN_STATUS;
}

export function isCancelledOrder(status) {
  return status === 'CANCELLED';
}

export function getOrderTotalLabel(status) {
  return isCancelledOrder(status) ? 'Giá trị đơn hàng' : 'Tổng thanh toán';
}

export function formatOrderDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}
