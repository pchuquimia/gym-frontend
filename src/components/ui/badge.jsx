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
    "relative inline-flex h-6 max-w-full shrink-0 items-center gap-1.5 overflow-hidden rounded-[5px] border px-2 font-condensed text-[10px] font-black uppercase leading-none tracking-[0.08em] shadow-sm transition-colors dark:rounded-[3px]";
  const variants = {
    default:
      "border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--text)]",
    secondary:
      "border-[#ff5722]/20 bg-[#fff7f4] text-[#9f310f] dark:border-[#e2ff00]/20 dark:bg-[#e2ff00]/[0.07] dark:text-[#dce9a5]",
    active:
      "border-[#ff5722]/45 bg-[#fff8f5] text-[#b72f08] shadow-[0_4px_14px_rgba(255,87,34,0.13)] dark:border-[#e2ff00]/40 dark:bg-[#181b0b] dark:text-[#e2ff00] dark:shadow-[0_4px_16px_rgba(226,255,0,0.09)]",
    enabled:
      "border-[#ff5722]/30 bg-[#fff4ef] text-[#a72c09] dark:border-[#e2ff00]/25 dark:bg-[#e2ff00]/[0.08] dark:text-[#e2ff00]",
    completed:
      "border-[#ff5722] bg-[#ff5722] text-white shadow-[0_4px_14px_rgba(255,87,34,0.24)] dark:border-[#e2ff00] dark:bg-[#e2ff00] dark:text-black dark:shadow-[0_4px_16px_rgba(226,255,0,0.16)]",
    pending:
      "border-amber-300/70 bg-amber-50 text-amber-800 dark:border-amber-300/25 dark:bg-amber-300/[0.08] dark:text-amber-200",
    scheduled:
      "border-sky-300/70 bg-sky-50 text-sky-800 dark:border-sky-300/25 dark:bg-sky-300/[0.08] dark:text-sky-200",
    paused:
      "border-[#8e8e93]/35 bg-[#f3f3f4] text-[#5f6064] dark:border-white/15 dark:bg-white/[0.06] dark:text-[#c9c9c3]",
    draft:
      "border-[#8e8e93]/30 bg-[#f6f6f7] text-[#68696d] dark:border-white/15 dark:bg-white/[0.05] dark:text-[#bcbdb8]",
    inactive:
      "border-[#8e8e93]/30 bg-transparent text-[#77787c] dark:border-white/15 dark:text-[#9b9c97]",
    cancelled:
      "border-[#8e8e93]/30 bg-[#f2f2f3] text-[#66676b] dark:border-white/15 dark:bg-[#1a1a1a] dark:text-[#a7a8a3]",
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
          <span className="absolute h-full w-full rounded-full bg-[#ff5722]/25 motion-safe:animate-ping dark:bg-[#e2ff00]/25" />
          <span className="relative h-1.5 w-1.5 rounded-full bg-[#ff5722] shadow-[0_0_7px_rgba(255,87,34,0.8)] dark:bg-[#e2ff00] dark:shadow-[0_0_8px_rgba(226,255,0,0.7)]" />
        </span>
      ) : Icon ? (
        <span
          className={`grid h-4 w-4 shrink-0 place-items-center rounded-[3px] ${
            variant === "completed"
              ? "bg-white/20 dark:bg-black/10"
              : "bg-black/[0.04] dark:bg-white/[0.06]"
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
