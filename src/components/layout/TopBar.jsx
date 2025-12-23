import { Plus } from "lucide-react";
import { motion } from "framer-motion";

function TopBar({ title, subtitle, meta, ctaLabel, onCta, rightSlot }) {
  return (
    <header className="space-y-3">
      {/* Row superior (si quieres meter Menú / Modo oscuro aquí) */}
      <div className="flex items-center justify-between">
        {/* left slot opcional (ej: botón menú) */}
        <div className="min-w-0">{/* leftSlot si lo necesitas */}</div>

        {/* rightSlot opcional (ej: toggle dark mode) */}
        {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
      </div>

      {/* Card principal */}
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
                {/* Si meta es string, lo mostramos como chip. Si prefieres, pásalo ya separado en chips */}
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {meta}
                </span>
              </div>
            ) : null}
          </div>

          {/* CTA compacto en desktop */}
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

        {/* CTA full-width en mobile (mejor UX) */}
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
