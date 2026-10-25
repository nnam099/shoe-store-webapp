import { useState, useEffect } from 'react';
import { adminGetDashboardRevenue } from '../../../services/adminService';
import { formatVND } from '../../../utils/adminHelpers';

export default function RevenueChart({ token }) {
  const [groupBy, setGroupBy] = useState('day');
  const [points, setPoints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!token) return;
    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    adminGetDashboardRevenue(token, { groupBy })
      .then((res) => {
        if (!isCancelled) {
          setPoints(res?.points || []);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setError(err.message || 'Không thể tải biểu đồ doanh thu.');
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [token, groupBy, retryKey]);

  // Format label for display
  const formatKeyLabel = (key, type) => {
    if (!key) return '';
    if (type === 'day') {
      const parts = key.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    }
    if (type === 'week') {
      const parts = key.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    }
    if (type === 'month') {
      const parts = key.split('-');
      if (parts.length === 2) return `T${parts[1]}/${parts[0].slice(2)}`;
    }
    return key;
  };

  const maxRevenue = Math.max(...points.map((p) => p.revenue || 0), 1000000);
  const totalRevenue = points.reduce((sum, p) => sum + (p.revenue || 0), 0);
  const totalCompletedOrders = points.reduce((sum, p) => sum + (p.completedOrderCount || 0), 0);

  // SVG Chart dimensions
  const svgWidth = 800;
  const svgHeight = 260;
  const padding = { top: 20, right: 20, bottom: 40, left: 70 };
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  const barWidth = points.length > 0 ? Math.max(chartWidth / points.length - 4, 4) : 10;

  return (
    <div className="border border-[#e5e7eb] bg-white p-5 shadow-xs">
      {/* Header with GroupBy Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#f3f4f6] pb-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#121212]">
            Biểu đồ Doanh thu (Đơn hoàn thành)
          </h3>
          <p className="mt-0.5 text-xs text-[#6b7280]">
            Tổng doanh thu: <span className="font-semibold text-[#991b1b]">{formatVND(totalRevenue)}</span> ({totalCompletedOrders} đơn)
          </p>
        </div>

        <div className="inline-flex rounded-xs border border-[#e5e7eb] p-0.5 bg-[#f9fafb]">
          <button
            type="button"
            onClick={() => setGroupBy('day')}
            className={`px-3 py-1 text-xs font-semibold transition-colors ${
              groupBy === 'day'
                ? 'bg-[#121212] text-white shadow-xs'
                : 'text-[#4b5563] hover:text-[#121212]'
            }`}
          >
            30 ngày
          </button>
          <button
            type="button"
            onClick={() => setGroupBy('week')}
            className={`px-3 py-1 text-xs font-semibold transition-colors ${
              groupBy === 'week'
                ? 'bg-[#121212] text-white shadow-xs'
                : 'text-[#4b5563] hover:text-[#121212]'
            }`}
          >
            12 tuần
          </button>
          <button
            type="button"
            onClick={() => setGroupBy('month')}
            className={`px-3 py-1 text-xs font-semibold transition-colors ${
              groupBy === 'month'
                ? 'bg-[#121212] text-white shadow-xs'
                : 'text-[#4b5563] hover:text-[#121212]'
            }`}
          >
            12 tháng
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="relative mt-4">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-xs text-[#6b7280]">
            <svg className="mr-2 h-4 w-4 animate-spin text-[#991b1b]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Đang tải dữ liệu doanh thu...
          </div>
        ) : error ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-xs text-[#dc2626]">
            <span>{error}</span>
            <button type="button" onClick={() => setRetryKey((value) => value + 1)} className="border border-[#dc2626] px-3 py-1.5 font-semibold hover:bg-[#dc2626] hover:text-white">
              Thử lại
            </button>
          </div>
        ) : points.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-xs text-[#6b7280]">
            Không có dữ liệu trong khoảng thời gian này.
          </div>
        ) : (
          <div>
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto overflow-visible select-none"
            >
              {/* Grid lines and Y labels */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                const y = padding.top + chartHeight * (1 - pct);
                const value = Math.round(maxRevenue * pct);
                return (
                  <g key={pct}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={svgWidth - padding.right}
                      y2={y}
                      stroke="#f3f4f6"
                      strokeWidth={1}
                    />
                    <text
                      x={padding.left - 8}
                      y={y + 4}
                      textAnchor="end"
                      fontSize={10}
                      fill="#9ca3af"
                      fontFamily="monospace"
                    >
                      {value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
                    </text>
                  </g>
                );
              })}

              {/* Bars */}
              {points.map((p, index) => {
                const x = padding.left + (index + 0.5) * (chartWidth / points.length) - barWidth / 2;
                const barH = Math.max((p.revenue / maxRevenue) * chartHeight, p.revenue > 0 ? 3 : 0);
                const y = padding.top + chartHeight - barH;
                const isHovered = hoveredPoint?.key === p.key;

                // Step for showing X labels so they don't overlap
                const labelStep = points.length > 20 ? 3 : points.length > 10 ? 2 : 1;
                const showLabel = index % labelStep === 0 || index === points.length - 1;

                return (
                  <g
                    key={p.key}
                    onMouseEnter={() => setHoveredPoint(p)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    className="cursor-pointer"
                  >
                    {/* Hover hit area */}
                    <rect
                      x={padding.left + index * (chartWidth / points.length)}
                      y={padding.top}
                      width={chartWidth / points.length}
                      height={chartHeight}
                      fill="transparent"
                    />

                    {/* Background track */}
                    <rect
                      x={x}
                      y={padding.top}
                      width={barWidth}
                      height={chartHeight}
                      fill={isHovered ? '#fef2f2' : '#f9fafb'}
                    />

                    {/* Bar */}
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barH}
                      fill={isHovered ? '#991b1b' : '#1f2937'}
                      rx={1}
                      className="transition-colors duration-150"
                    />

                    {/* X Axis label */}
                    {showLabel && (
                      <text
                        x={x + barWidth / 2}
                        y={padding.top + chartHeight + 18}
                        textAnchor="middle"
                        fontSize={10}
                        fill={isHovered ? '#121212' : '#6b7280'}
                        fontWeight={isHovered ? 600 : 400}
                      >
                        {formatKeyLabel(p.key, groupBy)}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Card */}
            {hoveredPoint && (
              <div className="mt-3 flex items-center justify-between rounded-xs border border-[#fee2e2] bg-[#fff5f5] px-3.5 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-[#121212]">
                    {hoveredPoint.key}
                  </span>
                  <span className="text-[#6b7280]">
                    ({hoveredPoint.completedOrderCount || 0} đơn hoàn thành)
                  </span>
                </div>
                <div className="font-bold text-[#991b1b]">
                  {formatVND(hoveredPoint.revenue)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
