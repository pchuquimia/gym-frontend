import { X } from "lucide-react";

export function DetailSheet({ ariaLabel, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[86dvh] w-full overflow-hidden rounded-t-2xl border border-[color:var(--detail-module-border)] bg-[color:var(--detail-canvas)] shadow-overlay sm:max-w-lg sm:rounded-2xl">
        {children}
      </div>
    </div>
  );
}

export function DetailSheetHeader({ eyebrow, title, description, onClose }) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-[color:var(--detail-module-border)] bg-[color:var(--detail-module)] p-5">
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-black leading-tight text-[color:var(--text)]">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-xs font-semibold leading-relaxed text-[color:var(--text-muted)]">
            {description}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[color:var(--detail-module-border)] bg-transparent text-[color:var(--text)] transition hover:border-[color:var(--border-strong)]"
        aria-label="Cerrar"
      >
        <X className="h-4 w-4" />
      </button>
    </header>
  );
}

export function DetailSheetBody({ children }) {
  return (
    <div className="max-h-[calc(86dvh-128px)] overflow-y-auto p-4">
      {children}
    </div>
  );
}

export function DetailModule({ children, className = "" }) {
  return (
    <section
      className={`rounded-lg border border-[color:var(--detail-module-border)] bg-[color:var(--detail-module)] p-4 shadow-[0_1px_2px_rgba(23,23,23,0.025)] ${className}`}
    >
      {children}
    </section>
  );
}

export function DetailSection({ title, action, children, className = "" }) {
  return (
    <DetailModule className={`mt-4 ${className}`}>
      <div className="mb-4">
        <span className="block h-0.5 w-6 bg-[color:var(--accent)]" />
        <div className="mt-2 flex items-center justify-between gap-3">
          <h3 className="text-[10px] font-black uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
            {title}
          </h3>
          {action}
        </div>
      </div>
      {children}
    </DetailModule>
  );
}

export function DetailStatGrid({ children, className = "" }) {
  return (
    <div className={`grid gap-x-5 gap-y-4 ${className}`}>{children}</div>
  );
}

export function DetailStat({ label, value, detail, className = "" }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-[10px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-xl font-black leading-none text-[color:var(--text)]">
        {value}
      </p>
      {detail ? (
        <p className="mt-1 text-[11px] font-semibold text-[color:var(--text-muted)]">
          {detail}
        </p>
      ) : null}
    </div>
  );
}

export function DetailRows({ children }) {
  return (
    <div className="divide-y divide-[color:var(--detail-row-divider)]">
      {children}
    </div>
  );
}

export function DetailRow({ children, className = "" }) {
  return <div className={`py-3.5 first:pt-0 last:pb-0 ${className}`}>{children}</div>;
}
