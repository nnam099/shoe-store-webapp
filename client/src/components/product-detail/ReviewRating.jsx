export default function ReviewRating({ rating, compact = false, size = null }) {
  const numericRating = Math.max(0, Math.min(5, Number(rating) || 0));
  const filledStars = Math.round(numericRating);
  const ratingLabel = Number.isInteger(numericRating)
    ? String(numericRating)
    : numericRating.toFixed(1);

  const iconSizeClass = size === 'lg'
    ? 'w-5 h-5'
    : size === 'xs'
      ? 'w-3 h-3'
      : compact || size === 'sm'
        ? 'w-3.5 h-3.5'
        : 'w-4 h-4';

  return (
    <span className="inline-flex items-center gap-0.5" title={`${ratingLabel} trên 5 sao`}>
      <span className="sr-only">{ratingLabel} trên 5 sao</span>
      <span aria-hidden="true" className="inline-flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`${iconSizeClass} ${
              star <= filledStars ? 'text-[#991b1b]' : 'text-[#e5e5e0]'
            }`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </span>
    </span>
  );
}
