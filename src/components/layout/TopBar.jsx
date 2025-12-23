import { Plus } from "lucide-react";
import { motion } from "framer-motion";

function TopBar({
  title,
  subtitle,
  meta,
  ctaLabel,
  onCta,
  rightSlot,
  leftSlot,
  variant = "default",
}) {
  if (variant === "dashboard") {
    return (
      <header className="space-y-4">
        {/* Row superior */}
        <div className="flex items-center justify-between">
          <div className="shrink-0">
            {leftSlot ? (
              leftSlot
            ) : (
              <button
                type="button"
                className="
                  h-10 w-10 rounded-2xl
                  border border-[color:var(--border)]
                  bg-[color:var(--card)]
                  grid place-items-center
                  text-[color:var(--text)]
                  hover:bg-[color:var(--bg)]
                  focus:outline-none focus:ring-2 focus:ring-blue-500/25
                "
                aria-label="Menú"
                title="Menú"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                  <path
                    d="M4 7h16M4 12h16M4 17h16"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </div>

          <div className="shrink-0">{rightSlot ? rightSlot : null}</div>
        </div>

        {/* Hero card */}
        <div
          className="
            rounded-3xl
            border border-[color:var(--border)]
            bg-[color:var(--card)]
            shadow-sm
            px-5 py-5
          "
        >
          {subtitle ? (
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
              {subtitle}
            </p>
          ) : null}

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[color:var(--text)]">
            {title}
          </h1>

          {meta ? (
            <div className="mt-2">
              <span
                className="
                  inline-flex items-center rounded-full
                  border border-[color:var(--border)]
                  bg-[color:var(--bg)]
                  px-3 py-1 text-xs font-medium
                  text-[color:var(--text-muted)]
                "
              >
                {meta}
              </span>
            </div>
          ) : null}

          {ctaLabel ? (
            <motion.button
              type="button"
              onClick={onCta}
              whileTap={{ scale: 0.99 }}
              className="
                mt-4 inline-flex w-full items-center justify-center gap-2
                rounded-2xl
                bg-blue-600 px-4 py-3
                text-sm font-semibold text-white
                shadow-sm
                hover:bg-blue-700
                focus:outline-none focus:ring-2 focus:ring-blue-500/25
              "
            >
              <Plus className="h-4 w-4" />
              {ctaLabel}
            </motion.button>
          ) : null}
        </div>
      </header>
    );
  }

  // ---- tu versión actual default (sin cambios) ----
  return (
    <header className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="min-w-0">{/* leftSlot si lo necesitas */}</div>
        {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
      </div>

      <div
        className="
          rounded-2xl border border-slate-200/70
          bg-white/80 backdrop-blur
          shadow-sm
          px-4 py-4
          dark:bg-slate-900/50 dark:border-slate-700/60
        "
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {subtitle ? (
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {subtitle}
              </p>
            ) : null}

            <h1 className="mt-1 text-[30px] font-bold tracking-tight text-slate-900 dark:text-slate-50">
              {title}
            </h1>

            {meta ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {meta}
                </span>
              </div>
            ) : null}
          </div>

          {ctaLabel ? (
            <motion.button
              type="button"
              onClick={onCta}
              whileTap={{ scale: 0.98 }}
              className="
                hidden sm:inline-flex
                items-center gap-2
                rounded-xl
                bg-blue-700 px-8 py-3
                text-sm font-semibold text-white
                shadow-sm
                hover:bg-blue-800
                dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100
              "
            >
              <Plus className="h-4 w-4" />
              {ctaLabel}
            </motion.button>
          ) : null}
        </div>

        {ctaLabel ? (
          <motion.button
            type="button"
            onClick={onCta}
            whileTap={{ scale: 0.99 }}
            className="
              mt-4 inline-flex w-full items-center justify-center gap-2
              rounded-xl
              bg-blue-700
              px-4 py-3
              text-sm font-semibold text-slate-900
              shadow-sm
              hover:bg-blue-800
              dark:border-slate-700 dark:bg-slate-700 dark:text-slate-50 dark:hover:bg-slate-500
              sm:hidden
              active:bg-emerald-800
              transition
              focus:outline-none focus:ring-2 focus:ring-emerald-500/40
            "
          >
            <Plus className="h-4 w-4" />
            {ctaLabel}
          </motion.button>
        ) : null}
      </div>
    </header>
  );
}

export default TopBar;
