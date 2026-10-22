/**
 * ReadinessBanner — Displays product/colorway readiness issues in clear Vietnamese.
 * Shows what still needs to be done before a product can be published.
 */

const ISSUE_MESSAGES = {
  // Product-level
  BRAND_INACTIVE: 'Thương hiệu của sản phẩm đang ngừng hoạt động.',
  CATEGORY_REQUIRED: 'Sản phẩm chưa có danh mục nào được gán.',
  DEFAULT_COLORWAY_REQUIRED: 'Chưa chọn phối màu mặc định.',
  ACTIVE_COLORWAY_REQUIRED: 'Sản phẩm chưa có phối màu nào đang hoạt động.',
  // Colorway-level
  COLORWAY_INACTIVE: 'Phối màu chưa được kích hoạt.',
  COLOR_FAMILIES_REQUIRED: 'Phối màu chưa chọn họ màu.',
  IMAGE_COUNT_INVALID: 'Phối màu cần có từ 3 đến 4 ảnh để xuất bản.',
  THUMBNAIL_REQUIRED: 'Phối màu chưa có ảnh đại diện (thumbnail).',
  VARIANT_REQUIRED: 'Phối màu chưa có kích cỡ nào.',
};

function getIssueMessage(issue, colorways) {
  const base = ISSUE_MESSAGES[issue.reason] || `Lỗi: ${issue.reason}`;
  if (issue.colorwayId && colorways) {
    const cw = colorways.find((c) => c.id === issue.colorwayId);
    return cw ? `[${cw.name}] ${base}` : base;
  }
  return base;
}

export default function ReadinessBanner({ issues = [], colorways = [], className = '' }) {
  if (!Array.isArray(issues) || issues.length === 0) {
    return (
      <div className={`flex items-center gap-2 rounded-xs border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 ${className}`}>
        <svg className="h-4 w-4 shrink-0 text-[#16a34a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-xs font-semibold text-[#166534]">Sản phẩm đủ điều kiện xuất bản.</span>
      </div>
    );
  }

  return (
    <div className={`rounded-xs border border-[#fecaca] bg-[#fef2f2] px-4 py-3 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <svg className="h-4 w-4 shrink-0 text-[#dc2626]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span className="text-xs font-bold uppercase tracking-wide text-[#991b1b]">
          Chưa đủ điều kiện xuất bản ({issues.length} vấn đề)
        </span>
      </div>
      <ul className="space-y-1 pl-6 list-disc">
        {issues.map((issue, idx) => (
          <li key={idx} className="text-xs text-[#7f1d1d]">
            {getIssueMessage(issue, colorways)}
          </li>
        ))}
      </ul>
    </div>
  );
}
