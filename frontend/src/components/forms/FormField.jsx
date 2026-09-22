export function FormField({ label, name, error, ...inputProps }) {
  const errorId = `${name}-error`;

  return (
    <label className="grid gap-2 text-sm font-medium text-slate-800">
      <span>{label}</span>
      <input
        className="min-h-11 rounded-lg border border-slate-300 bg-white/80 px-3 outline-none transition focus:border-cobalt focus:ring-2 focus:ring-cobalt/20 disabled:cursor-not-allowed disabled:bg-slate-100"
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        {...inputProps}
      />
      {error ? (
        <span id={errorId} className="text-sm text-coral" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}
