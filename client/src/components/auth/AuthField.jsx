export default function AuthField({
  id,
  label,
  error,
  required = false,
  multiline = false,
  className = '',
  ...fieldProps
}) {
  const Field = multiline ? 'textarea' : 'input';

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="block text-[11px] font-extrabold uppercase tracking-wider text-[#121212] mb-1.5"
      >
        {label}
        {required && <span className="text-[#991b1b]" aria-hidden="true"> *</span>}
      </label>
      <Field
        id={id}
        name={id}
        aria-required={required || undefined}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full min-h-[44px] px-3.5 py-2.5 bg-[#fcfcfb] border text-sm text-[#121212] rounded-xs transition-colors focus:bg-white focus:outline-hidden disabled:opacity-60 read-only:text-[#737373] read-only:bg-[#f5f5f3] ${
          error
            ? 'border-[#b91c1c] focus:border-[#b91c1c] focus:ring-1 focus:ring-[#b91c1c]'
            : 'border-[#d4d4ce] focus:border-[#121212]'
        } ${multiline ? 'resize-y' : ''}`}
        {...fieldProps}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-[#b91c1c]">
          {error}
        </p>
      )}
    </div>
  );
}
