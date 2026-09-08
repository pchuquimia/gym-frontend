import { ArrowLeft } from "lucide-react";

export default function MobilePageHeader({
  title,
  variant = "main",
  onBack,
  actions = null,
  mobileOnly = true,
  className = "",
}) {
  const visibilityClass = mobileOnly ? "md:hidden" : "";

  if (variant === "detail") {
    return (
      <header
        className={`mobile-page-header mobile-page-header--detail grid items-center ${visibilityClass} ${actions ? "has-actions" : ""} ${className}`}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver"
          className="grid h-11 w-11 place-items-center rounded-full text-[color:var(--text)] transition-colors hover:bg-[color:var(--surface-subtle)]"
        >
          <ArrowLeft className="h-6 w-6" strokeWidth={2.1} />
        </button>
        <h1 className="truncate text-center text-[color:var(--text)]">
          {title}
        </h1>
        {actions ? (
          <div className="mobile-page-header__actions flex shrink-0 items-center justify-end">
            {actions}
          </div>
        ) : (
          <span aria-hidden="true" />
        )}
      </header>
    );
  }

  return (
    <header
      className={`mobile-page-header mobile-page-header--main flex items-center justify-between ${visibilityClass} ${className}`}
    >
      <h1 className="min-w-0 truncate text-[color:var(--text)]">
        {title}
      </h1>
      {actions ? (
        <div className="mobile-page-header__actions flex shrink-0 items-center">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
