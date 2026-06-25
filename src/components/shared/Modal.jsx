function Modal({
  title,
  subtitle,
  children,
  onClose,
  footer,
  size = "default",
}) {
  const sizeClass = size === "wide" ? "max-w-6xl" : "max-w-3xl";
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-black/60 p-0 backdrop-blur-sm sm:place-items-center sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`flex max-h-[96vh] min-h-0 w-full ${sizeClass} flex-col overflow-hidden rounded-t-2xl border border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--text)] shadow-2xl sm:max-h-[90vh] sm:rounded-2xl`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[color:var(--border)] px-4 py-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold sm:text-xl">
              {title}
            </h3>
            {subtitle && (
              <p className="mt-0.5 line-clamp-2 text-sm text-[color:var(--text-muted)]">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            className="h-9 rounded-xl border border-[color:var(--border)] px-3 text-sm font-semibold text-[color:var(--text)]"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {children}
        </div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-[color:var(--border)] px-4 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
