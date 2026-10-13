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

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const nextErrors = validateReview(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({ rating: values.rating, comment: values.comment.trim() });
  };

  return (
    <form className="border-t border-[#d4d4ce] pt-5" onSubmit={handleSubmit} noValidate>
      <fieldset aria-describedby={errors.rating ? `${formId}-rating-error` : undefined}>
        <legend className="text-[11px] font-extrabold uppercase tracking-wider text-[#121212]">
          Mức đánh giá
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((rating) => (
            <label key={rating} className="relative cursor-pointer">
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
                className="peer sr-only"
                aria-label={`${rating} trên 5 sao`}
              />
              <span className="flex size-11 items-center justify-center border border-[#d4d4ce] bg-white text-lg text-[#a3a3a3] transition-colors peer-checked:border-[#991b1b] peer-checked:bg-[#991b1b] peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#991b1b] peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
                <span aria-hidden="true">★</span>
              </span>
            </label>
          ))}
        </div>
        {errors.rating && (
          <p id={`${formId}-rating-error`} role="alert" className="mt-2 text-xs font-semibold text-[#991b1b]">
            {errors.rating}
          </p>
        )}
      </fieldset>

      <div className="mt-5">
        <label
          htmlFor={`${formId}-comment`}
          className="text-[11px] font-extrabold uppercase tracking-wider text-[#121212]"
        >
          Nội dung đánh giá
        </label>
        <textarea
          id={`${formId}-comment`}
          rows={5}
          value={values.comment}
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.comment)}
          aria-describedby={errors.comment ? `${formId}-comment-error` : undefined}
          onChange={(event) => {
            setValues((current) => ({ ...current, comment: event.target.value }));
            setErrors((current) => ({ ...current, comment: '' }));
          }}
          className="mt-3 w-full resize-y border border-[#d4d4ce] bg-white px-4 py-3 text-sm leading-6 text-[#121212] outline-none transition-colors placeholder:text-[#a3a3a3] focus:border-[#121212] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#991b1b] disabled:cursor-not-allowed disabled:bg-[#f5f5f3]"
          placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..."
        />
        {errors.comment && (
          <p id={`${formId}-comment-error`} role="alert" className="mt-2 text-xs font-semibold text-[#991b1b]">
            {errors.comment}
          </p>
        )}
      </div>

      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onCancel}
          className="min-h-11 border border-[#d4d4ce] px-5 text-xs font-extrabold uppercase tracking-wider text-[#525252] hover:border-[#121212] hover:text-[#121212] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#991b1b] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Quay lại
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-11 bg-[#121212] px-6 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-[#991b1b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#991b1b] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Đang lưu...' : initialReview ? 'Lưu chỉnh sửa' : 'Gửi đánh giá'}
        </button>
      </div>
    </form>
  );
}
