import { formatPrice, getAssetUrl } from '../../config/site';

export default function OrderItems({ items = [], compact = false }) {
  const snapshots = Array.isArray(items) ? items : [];

  return (
    <ul className={compact ? 'divide-y divide-[#eeeeea]' : 'divide-y divide-[#f0f0ec]'}>
      {snapshots.map((item, index) => (
        <li
          key={`${item.productName}-${item.colorwayName}-${item.size}-${index}`}
          className={`flex items-center gap-3.5 ${compact ? 'py-3' : 'py-4 first:pt-0 last:pb-0'}`}
        >
          <div
            className={`${compact ? 'h-12 w-12' : 'h-16 w-16 sm:h-20 sm:w-20'} shrink-0 overflow-hidden border border-[#ebebe8] bg-[#f8f8f6]`}
          >
            {item.thumbnail ? (
              <img
                src={getAssetUrl(item.thumbnail)}
                alt={`${item.productName} - ${item.colorwayName}`}
                className="h-full w-full object-contain p-1"
                loading="lazy"
              />
            ) : (
              <span className="flex h-full items-center justify-center text-[9px] text-[#a3a3a3]">
                STEP/LAB
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-[#121212]">{item.productName}</p>
            <p className="mt-0.5 truncate text-[11px] text-[#525252]">
              {item.colorwayName} · EU {item.size}
            </p>
            <div className="mt-1 flex items-center justify-between gap-3 text-[11px]">
              <span className="text-[#737373]">
                {formatPrice(item.unitPrice)} × {item.quantity}
              </span>
              <span className="shrink-0 font-extrabold text-[#121212]">
                {formatPrice(item.lineTotal)}
              </span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
