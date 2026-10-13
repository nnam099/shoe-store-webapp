export default function ReviewRating({ rating, compact = false }) {
  const numericRating = Math.max(0, Math.min(5, Number(rating) || 0));
  const filledStars = Math.round(numericRating);
  const ratingLabel = Number.isInteger(numericRating)
    ? String(numericRating)
    : numericRating.toFixed(1);

  return (
    <span className="inline-flex items-center gap-2">
      <span className="sr-only">{ratingLabel} trên 5 sao</span>
      <span
        aria-hidden="true"
        className={`tracking-[0.12em] text-[#991b1b] ${compact ? 'text-xs' : 'text-sm'}`}
      >
        {'★'.repeat(filledStars)}
        <span className="text-[#d4d4ce]">{'★'.repeat(5 - filledStars)}</span>
      </span>
      <span aria-hidden="true" className="text-[11px] font-extrabold text-[#525252]">
        {ratingLabel}/5
      </span>
    </span>
  );
}
