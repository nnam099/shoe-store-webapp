import {
  formatOrderDateTime,
  getOrderStatusPresentation,
} from '../../utils/orderPresentation';

export default function OrderTimeline({ timeline = [] }) {
  const entries = Array.isArray(timeline) ? timeline : [];

  return (
    <section aria-labelledby="order-timeline-title">
      <h2
        id="order-timeline-title"
        className="text-xs font-extrabold uppercase tracking-widest text-[#121212]"
      >
        Lịch sử trạng thái
      </h2>

      {entries.length === 0 ? (
        <p className="mt-4 text-xs text-[#737373]">Chưa có lịch sử trạng thái.</p>
      ) : (
        <ol className="mt-5">
          {entries.map((entry, index) => {
            const status = getOrderStatusPresentation(entry.status);
            const isLatest = index === entries.length - 1;

            return (
              <li
                key={`${entry.status}-${entry.changedAt}-${index}`}
                className="relative grid grid-cols-[18px_minmax(0,1fr)] gap-3 pb-5 last:pb-0"
              >
                {index < entries.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 left-[8px] top-4 w-px bg-[#d4d4ce]"
                  />
                )}
                <span
                  aria-hidden="true"
                  className={`relative z-10 mt-0.5 h-[17px] w-[17px] border-2 ${
                    isLatest
                      ? 'border-[#991b1b] bg-[#991b1b]'
                      : 'border-[#a3a3a3] bg-[#f8f8f6]'
                  }`}
                />
                <div className={isLatest ? 'text-[#121212]' : 'text-[#525252]'}>
                  <p className={`text-xs ${isLatest ? 'font-extrabold' : 'font-bold'}`}>
                    {status.label}
                  </p>
                  <time
                    dateTime={entry.changedAt}
                    className="mt-0.5 block text-[11px] text-[#737373]"
                  >
                    {formatOrderDateTime(entry.changedAt)}
                  </time>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
