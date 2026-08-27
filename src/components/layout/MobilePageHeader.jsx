import { ArrowLeft } from "lucide-react";

export default function MobilePageHeader({
  title,
  variant = "main",
  onBack,
  actions = null,
  className = "",
}) {
  if (variant === "detail") {
    return (
      <header
        className={`mobile-page-header mobile-page-header--detail grid min-h-[64px] grid-cols-[48px_1fr_48px] items-center md:hidden ${className}`}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver"
          className="grid h-11 w-11 place-items-center rounded-full text-[color:var(--text)] transition-colors hover:bg-[color:var(--surface-subtle)]"
        >
          <ArrowLeft className="h-7 w-7" strokeWidth={2.25} />
        </button>
        <h1 className="truncate text-center font-sans text-[20px] font-medium tracking-[-0.015em] text-[color:var(--text)]">
          {title}
        </h1>
        <span aria-hidden="true" />
      </header>
    );
  }

  return (
    <header
      className={`mobile-page-header mobile-page-header--main flex min-h-[88px] items-center justify-between gap-4 pb-4 pt-3 md:hidden ${className}`}
    >
      <h1 className="min-w-0 truncate font-sans text-[32px] font-medium leading-none tracking-[-0.03em] text-[color:var(--text)]">
        {title}
      </h1>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2.5">{actions}</div>
      ) : null}
    </header>
  );
}
