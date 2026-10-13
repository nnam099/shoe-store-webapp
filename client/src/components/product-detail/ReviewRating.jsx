export default function ReviewRating({ rating, compact = false }) {
  const numericRating = Math.max(0, Math.min(5, Number(rating) || 0));
  const filledStars = Math.round(numericRating);
  const ratingLabel = Number.isInteger(numericRating)
    ? String(numericRating)
    : numericRating.toFixed(1);

  return (
    <span className="inline-flex items-center">
      <span className="sr-only">{ratingLabel} trên 5 sao</span>
      <span
        aria-hidden="true"
        className={`tracking-[0.12em] text-[#991b1b] ${compact ? 'text-sm' : 'text-base'}`}
      >
        {'★'.repeat(filledStars)}
        <span className="text-[#deded8]">{'★'.repeat(5 - filledStars)}</span>
      </span>
    </span>
  );
}
