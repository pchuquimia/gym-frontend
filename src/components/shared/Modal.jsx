import { useEffect, useRef } from "react";
import { X } from "lucide-react";

function Modal({
  title,
  subtitle,
  children,
  onClose,
  footer,
  floatingAction,
  size = "default",
}) {
  const sizeClass = size === "wide" ? "max-w-6xl" : "max-w-3xl";
  const scrollRef = useRef(null);
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onCloseRef.current?.();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-black/60 p-0 backdrop-blur-sm sm:place-items-center sm:p-4"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || subtitle || "Ventana de diálogo"}
        tabIndex={-1}
        className={`relative flex max-h-[96vh] min-h-0 w-full ${sizeClass} flex-col overflow-hidden rounded-t-2xl border border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--text)] shadow-2xl sm:max-h-[90vh] sm:rounded-2xl`}
      >
        <div
          className={`flex items-start justify-between gap-3 border-b border-[color:var(--border)] px-4 ${title || subtitle ? "py-3" : "py-2"}`}
        >
          {title || subtitle ? (
            <div className="min-w-0">
              {title ? (
                <h3 className="truncate text-lg font-semibold sm:text-xl">
                  {title}
                </h3>
              ) : null}
              {subtitle && (
                <p className="mt-0.5 line-clamp-2 text-sm text-[color:var(--text-muted)]">
                  {subtitle}
                </p>
              )}
            </div>
          ) : (
            <span aria-hidden="true" />
          )}
          <button
            type="button"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[color:var(--border)] text-[color:var(--text)]"
            onClick={onClose}
            aria-label="Cerrar"
            title="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overscroll-contain overflow-y-auto px-4 py-3"
        >
          {children}
        </div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-[color:var(--border)] px-4 py-3">
            {footer}
          </div>
        )}
      </div>
      {floatingAction ? (
        <div className="fixed bottom-24 right-5 z-[70] sm:bottom-8 sm:right-8">
          {floatingAction}
        </div>
      ) : null}
    </div>
  );
}

export default Modal;
