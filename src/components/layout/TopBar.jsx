import { Plus } from "lucide-react";
import { motion } from "framer-motion";

function TopBar({
  title,
  subtitle,
  meta,
  ctaLabel,
  onCta,
  rightSlot,
  variant = "default",
}) {
  return (
    <header className={`topbar-shell topbar-shell--${variant}`}>
      <div className="topbar-surface rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-4 shadow-sm">
        <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
          <div className="min-w-0">
            {subtitle ? (
              <p className="topbar-eyebrow text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                {subtitle}
              </p>
            ) : null}
            <h1 className="topbar-title mt-1 text-3xl font-bold tracking-tight text-[color:var(--text)]">
              {title}
            </h1>
            {meta ? (
              <span className="topbar-meta mt-2 inline-flex rounded-full border border-[color:var(--border)] bg-[color:var(--surface-subtle)] px-2.5 py-1 text-xs font-medium text-[color:var(--text-muted)]">
                {meta}
              </span>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {rightSlot}
            {ctaLabel ? (
              <motion.button
                type="button"
                onClick={onCta}
                whileTap={{ scale: 0.98 }}
                className="topbar-action hidden items-center justify-center gap-2 rounded-xl bg-[color:var(--accent)] px-4 py-3 text-sm font-semibold text-[color:var(--accent-contrast)] shadow-sm transition-colors hover:bg-[color:var(--accent-hover)] sm:inline-flex"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {ctaLabel}
              </motion.button>
            ) : null}
          </div>
        </div>

        {ctaLabel ? (
          <motion.button
            type="button"
            onClick={onCta}
            whileTap={{ scale: 0.99 }}
            className="topbar-action mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--accent)] px-4 py-3 text-sm font-semibold text-[color:var(--accent-contrast)] shadow-sm transition-colors hover:bg-[color:var(--accent-hover)] sm:hidden"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {ctaLabel}
          </motion.button>
        ) : null}
      </div>
    </header>
  );
}

export default TopBar;
