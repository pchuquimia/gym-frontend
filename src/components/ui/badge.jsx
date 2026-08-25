import {
  Archive,
  CalendarClock,
  Check,
  CircleOff,
  Clock3,
  FilePenLine,
  Pause,
} from "lucide-react";

export function Badge({
  className = "",
  children,
  variant = "default",
  ...props
}) {
  const base =
    "relative inline-flex min-h-6 max-w-full shrink-0 items-center gap-1.5 overflow-hidden rounded-control border px-2 py-1 font-sans text-[11px] font-bold uppercase leading-none tracking-[0.04em] transition-colors";
  const variants = {
    default:
      "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text)]",
    secondary:
      "border-[color:var(--border)] bg-[color:var(--surface-subtle)] text-[color:var(--text-muted)]",
    active:
      "border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]",
    enabled:
      "border-[color:var(--success)] bg-[color:var(--success-soft)] text-[color:var(--success)]",
    completed:
      "border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--accent-contrast)]",
    pending:
      "border-[color:var(--warning)] bg-[color:var(--warning-soft)] text-[color:var(--warning)]",
    scheduled:
      "border-sky-300/70 bg-sky-50 text-sky-800 dark:border-sky-300/25 dark:bg-sky-300/[0.08] dark:text-sky-200",
    paused:
      "border-[color:var(--border)] bg-[color:var(--surface-subtle)] text-[color:var(--text-muted)]",
    draft:
      "border-[color:var(--border)] bg-[color:var(--surface-subtle)] text-[color:var(--text-muted)]",
    inactive:
      "border-[color:var(--border)] bg-transparent text-[color:var(--text-muted)]",
    cancelled:
      "border-[color:var(--danger)] bg-[color:var(--danger-soft)] text-[color:var(--danger)]",
  };
  const icons = {
    enabled: Check,
    completed: Check,
    pending: Clock3,
    scheduled: CalendarClock,
    paused: Pause,
    draft: FilePenLine,
    inactive: CircleOff,
    cancelled: Archive,
  };
  const styles = variants[variant] || variants.default;
  const Icon = icons[variant];
  return (
    <span
      className={`${base} ${styles} ${className}`}
      data-status={variant}
      {...props}
    >
      {variant === "active" ? (
        <span
          className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center"
          aria-hidden="true"
          data-status-indicator
        >
          <span className="absolute h-full w-full rounded-full bg-[color:var(--accent)] opacity-25 motion-safe:animate-ping" />
          <span className="relative h-1.5 w-1.5 rounded-full bg-[color:var(--accent)]" />
        </span>
      ) : Icon ? (
        <span
          className={`grid h-4 w-4 shrink-0 place-items-center rounded-[3px] ${
            variant === "completed"
              ? "bg-current/15"
              : "bg-[color:var(--surface-subtle)]"
          }`}
          aria-hidden="true"
          data-status-indicator
        >
          <Icon className="h-3 w-3 stroke-[2.6]" />
        </span>
      ) : null}
      {children}
    </span>
  );
}

export default Badge;
