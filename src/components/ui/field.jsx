import { forwardRef } from "react";

const controlClass =
  "h-12 w-full rounded-control border border-[color:var(--border)] bg-[color:var(--surface)] px-3 font-sans text-base text-[color:var(--text)] shadow-soft outline-none transition-[border-color,box-shadow,background-color] placeholder:text-[color:var(--text-subtle)] hover:border-[color:var(--border-strong)] focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--focus-ring)] disabled:cursor-not-allowed disabled:bg-[color:var(--surface-subtle)] disabled:text-[color:var(--text-muted)] disabled:opacity-70 md:text-sm";

export const Input = forwardRef(function Input({ className = "", ...props }, ref) {
  return <input ref={ref} className={`${controlClass} ${className}`} {...props} />;
});

export const Select = forwardRef(function Select({ className = "", ...props }, ref) {
  return <select ref={ref} className={`${controlClass} ${className}`} {...props} />;
});

export const Textarea = forwardRef(function Textarea({ className = "", ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={`${controlClass} min-h-28 resize-y py-3 ${className}`}
      {...props}
    />
  );
});

export function Field({ label, hint, error, children, className = "", id }) {
  return (
    <label className={`flex min-w-0 flex-col gap-2 ${className}`} htmlFor={id}>
      {label ? (
        <span className="font-sans text-sm font-semibold text-[color:var(--text)]">{label}</span>
      ) : null}
      {children}
      {error ? (
        <span className="font-sans text-xs font-medium text-[color:var(--danger)]" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="font-sans text-xs text-[color:var(--text-muted)]">{hint}</span>
      ) : null}
    </label>
  );
}

export default Input;
