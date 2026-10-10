function formatShortcutDate(createdAt) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export default function RecentOrders({ orders, onSelect }) {
  const recentOrders = Array.isArray(orders) ? orders : [];

  return (
    <section
      aria-labelledby="recent-orders-title"
      className="bg-white border border-[#e5e5e0] rounded-xs shadow-2xs p-5 sm:p-6"
    >
      <div className="mb-4">
        <h2
          id="recent-orders-title"
          className="text-xs font-extrabold uppercase tracking-widest text-[#121212]"
        >
          Đơn hàng gần đây
        </h2>
        <p className="text-[11px] text-[#737373] mt-1 leading-relaxed">
          Các đơn hàng được đặt gần đây trên thiết bị này.
        </p>
      </div>

      {recentOrders.length === 0 ? (
        <p className="text-xs text-[#737373] py-1">
          Chưa có đơn hàng gần đây trên thiết bị này.
        </p>
      ) : (
        <ul className="divide-y divide-[#eeeeea]">
          {recentOrders.map((order) => (
            <li
              key={order.orderCode}
              className="py-3 first:pt-0 last:pb-0 flex flex-col xl:flex-row xl:items-center gap-2.5 xl:justify-between"
            >
              <div className="min-w-0">
                <code className="block text-xs font-bold text-[#121212] break-all">
                  {order.orderCode}
                </code>
                <time
                  dateTime={order.createdAt}
                  className="block text-[10px] text-[#737373] mt-0.5"
                >
                  Đã lưu: {formatShortcutDate(order.createdAt)}
                </time>
              </div>
              <button
                type="button"
                onClick={() => onSelect(order.orderCode)}
                className="min-h-[44px] w-full xl:w-auto px-4 py-2 border border-[#d4d4ce] hover:bg-[#f5f5f3] text-[#121212] text-[11px] font-bold uppercase tracking-wider rounded-xs transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#991b1b] focus-visible:outline-offset-2 shrink-0"
                aria-label={`Tra cứu đơn hàng ${order.orderCode}`}
              >
                Tra cứu
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
