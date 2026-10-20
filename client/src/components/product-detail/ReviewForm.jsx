import { useId, useState } from 'react';

function validateReview(values) {
  const errors = {};
  if (!Number.isInteger(values.rating) || values.rating < 1 || values.rating > 5) {
    errors.rating = 'Vui lòng chọn mức đánh giá từ 1 đến 5 sao.';
  }
  if (!values.comment.trim()) {
    errors.comment = 'Vui lòng nhập nội dung đánh giá.';
  }
  return errors;
}

export default function ReviewForm({ initialReview, isSubmitting, onCancel, onSubmit }) {
  const formId = useId();
  const [values, setValues] = useState({
    rating: initialReview?.rating ?? 0,
    comment: initialReview?.comment ?? '',
  });
  const [errors, setErrors] = useState({});
  const [previewRating, setPreviewRating] = useState(null);
  const displayedRating = previewRating ?? values.rating;

  const isEditMode = Boolean(initialReview);
  const initialRating = initialReview?.rating ?? 0;
  const initialComment = (initialReview?.comment ?? '').trim();
  const currentRating = values.rating;
  const currentComment = values.comment.trim();

  const isChanged =
    !isEditMode ||
    currentRating !== initialRating ||
    currentComment !== initialComment;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    if (isEditMode && !isChanged) return;

    const nextErrors = validateReview(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({ rating: values.rating, comment: values.comment.trim() });
  };

  return (
    <form className="pt-4" onSubmit={handleSubmit} noValidate>
      <fieldset aria-describedby={errors.rating ? `${formId}-rating-error` : undefined}>
        <legend className="text-xs font-bold uppercase tracking-wider text-[#121212]">
          Mức đánh giá
        </legend>
        <div
          className="mt-2.5 flex items-center gap-1.5"
          onPointerLeave={() => setPreviewRating(null)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setPreviewRating(null);
          }}
        >
          {[1, 2, 3, 4, 5].map((rating) => (
            <label
              key={rating}
              className="relative cursor-pointer p-0.5"
              onPointerEnter={() => setPreviewRating(rating)}
            >
              <input
                type="radio"
                name={`${formId}-rating`}
                value={rating}
                checked={values.rating === rating}
                disabled={isSubmitting}
                onChange={() => {
                  setValues((current) => ({ ...current, rating }));
                  setErrors((current) => ({ ...current, rating: '' }));
                }}
                onFocus={() => setPreviewRating(rating)}
                className="peer sr-only"
                aria-label={`${rating} trên 5 sao`}
              />
              <svg
                aria-hidden="true"
                className={`w-7 h-7 sm:w-8 sm:h-8 transition-transform duration-150 ${
                  rating <= displayedRating
                    ? 'text-[#991b1b] scale-105'
                    : 'text-[#e5e5e0] hover:text-[#d9a3a3]'
                } peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#991b1b] peer-disabled:cursor-not-allowed peer-disabled:opacity-50`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </label>
          ))}
          {displayedRating > 0 && (
            <span className="ml-2 text-xs font-semibold text-[#73736e]">
              {displayedRating}/5 sao
            </span>
          )}
        </div>
        {errors.rating && (
          <p id={`${formId}-rating-error`} role="alert" className="mt-2 text-xs font-semibold text-[#991b1b]">
            {errors.rating}
          </p>
        )}
      </fieldset>

      <div className="mt-4">
        <label
          htmlFor={`${formId}-comment`}
          className="text-xs font-bold uppercase tracking-wider text-[#121212]"
        >
          Nội dung nhận xét
        </label>
        <textarea
          id={`${formId}-comment`}
          rows={4}
          value={values.comment}
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.comment)}
          aria-describedby={errors.comment ? `${formId}-comment-error` : undefined}
          onChange={(event) => {
            setValues((current) => ({ ...current, comment: event.target.value }));
            setErrors((current) => ({ ...current, comment: '' }));
          }}
          className="mt-2 w-full resize-y rounded-lg border border-[#e5e5e0] bg-white px-3.5 py-2.5 text-sm leading-6 text-[#121212] outline-none transition-colors placeholder:text-[#9e9e98] focus:border-[#991b1b] focus:ring-1 focus:ring-[#991b1b] disabled:cursor-not-allowed disabled:bg-[#f5f5f3]"
          placeholder="Chia sẻ cảm nhận của bạn về sản phẩm..."
        />
        {errors.comment && (
          <p id={`${formId}-comment-error`} role="alert" className="mt-1.5 text-xs font-semibold text-[#991b1b]">
            {errors.comment}
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-end gap-2.5">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onCancel}
          className="min-h-10 rounded-lg border border-[#d4d4ce] bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#52524e] hover:bg-[#f5f5f3] hover:text-[#121212] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#991b1b] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Quay lại
        </button>
        <button
          type="submit"
          disabled={isSubmitting || (isEditMode && !isChanged)}
          className="min-h-10 rounded-lg bg-[#991b1b] px-5 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#7f1d1d] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#991b1b] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Đang lưu...' : initialReview ? 'Lưu chỉnh sửa' : 'Gửi đánh giá'}
        </button>
      </div>
    </form>
  );
}
