/**
 * AdminBadge — Status badges for Admin tables and detail views.
 */
export function StatusBadge({ isActive }) {
  return isActive ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#dcfce7] px-2.5 py-0.5 text-[11px] font-semibold text-[#15803d]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#16a34a]" />
      Hoạt động
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f3f4f6] px-2.5 py-0.5 text-[11px] font-semibold text-[#4b5563]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#9ca3af]" />
      Ngừng
    </span>
  );
}

export function FeaturedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#fef3c7] px-2.5 py-0.5 text-[11px] font-semibold text-[#b45309]">
      ★ Nổi bật
    </span>
  );
}

export function DefaultBadge() {
  return (
    <span className="inline-flex items-center gap-1 bg-[#121212] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
      Mặc định
    </span>
  );
}

export function DraftBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fef9c3] px-2.5 py-0.5 text-[11px] font-semibold text-[#854d0e]">
      Bản nháp
    </span>
  );
}

const ORDER_STATUS_CONFIG = {
  PENDING: {
    label: 'Chờ xử lý',
    bg: 'bg-[#fef3c7]',
    text: 'text-[#b45309]',
    dot: 'bg-[#d97706]',
  },
  PREPARING: {
    label: 'Đang chuẩn bị',
    bg: 'bg-[#dbeafe]',
    text: 'text-[#1d4ed8]',
    dot: 'bg-[#2563eb]',
  },
  SHIPPING: {
    label: 'Đang giao hàng',
    bg: 'bg-[#e0e7ff]',
    text: 'text-[#4338ca]',
    dot: 'bg-[#4f46e5]',
  },
  DELIVERED: {
    label: 'Đã giao hàng',
    bg: 'bg-[#cffafe]',
    text: 'text-[#0e7490]',
    dot: 'bg-[#0891b2]',
  },
  COMPLETED: {
    label: 'Hoàn thành',
    bg: 'bg-[#dcfce7]',
    text: 'text-[#15803d]',
    dot: 'bg-[#16a34a]',
  },
  CANCELLED: {
    label: 'Đã hủy',
    bg: 'bg-[#ffe4e6]',
    text: 'text-[#be123c]',
    dot: 'bg-[#e11d48]',
  },
};

export function OrderStatusBadge({ status }) {
  const config = ORDER_STATUS_CONFIG[status] || {
    label: status || 'Không rõ',
    bg: 'bg-[#f3f4f6]',
    text: 'text-[#4b5563]',
    dot: 'bg-[#9ca3af]',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${config.bg} ${config.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

export function CustomerTypeBadge({ type }) {
  const isMember = type === 'MEMBER';
  return isMember ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#18181b] px-2.5 py-0.5 text-[11px] font-semibold text-white">
      <svg className="h-3 w-3 text-[#f87171]" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
      </svg>
      Thành viên
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#f3f4f6] px-2.5 py-0.5 text-[11px] font-semibold text-[#4b5563]">
      Khách vãng lai
    </span>
  );
}
