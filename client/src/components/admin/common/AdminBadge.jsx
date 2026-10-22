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
