import PropTypes from "prop-types";
import { motion, useMotionValue } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Check, X } from "lucide-react";

export default function SetRow({
  index,
  seriesType = "serie",
  entries = [],
  prSummary = "",
  onChangeEntry,
  onToggleEntry,
  onRemove,
}) {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const seriesLabel =
    seriesType === "triserie"
      ? "triserie"
      : seriesType === "biserie"
      ? "biserie"
      : "serie";
  const setDone =
    safeEntries.length > 0 ? safeEntries.every((entry) => entry.done) : false;
  const baseClasses =
    "max-w-full overflow-hidden rounded-2xl border border-[color:var(--border)] px-2 py-2 space-y-2";
  const stateClasses = setDone
    ? "bg-slate-100 dark:bg-slate-800 text-[color:var(--text-muted)]"
    : "bg-[color:var(--card)]";
  const x = useMotionValue(0);
  const isMobile =
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 767px)").matches
      : false;
  const normalizeDecimal = (val) => {
    if (val === "" || val === null || val === undefined) return "";
    return String(val).replace(",", ".");
  };
  const toNumber = (val) => {
    if (val === "" || val === null || val === undefined) return null;
    const parsed = Number(String(val).replace(",", "."));
    return Number.isNaN(parsed) ? null : parsed;
  };

  const handleDragEnd = (_, info) => {
    if (!isMobile) return;
    if (info.offset.x < -60) {
      const ok = window.confirm("Eliminar este set?");
      if (ok && onRemove) onRemove();
    }
    x.set(0);
  };

  return (
    <motion.div
      layout
      drag={isMobile ? "x" : false}
      dragConstraints={isMobile ? { left: -80, right: 0 } : undefined}
      style={isMobile ? { x } : undefined}
      onDragEnd={handleDragEnd}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className={`${baseClasses} ${stateClasses}`}
    >
      <div className="flex min-w-0 items-center justify-between gap-2 px-1 sm:px-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
              setDone ? "bg-emerald-500 text-white" : "bg-blue-600 text-white"
            }`}
          >
            {index}
          </span>
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-muted)] sm:tracking-[0.2em]">
            Set de {seriesLabel}
          </span>
          {prSummary ? (
            <span className="min-w-0 truncate text-[11px] text-[color:var(--text-muted)]">
              PR {prSummary}
            </span>
          ) : null}
        </div>
        {!isMobile && onRemove && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            type="button"
            onClick={onRemove}
            className="text-[color:var(--text-muted)] hover:text-red-600 text-lg leading-none px-1"
            aria-label="Eliminar set"
          >
            <X className="h-4 w-4" />
          </motion.button>
        )}
      </div>
      <div className="space-y-2">
        {safeEntries.map((entry, entryIdx) => {
          const entryDone = Boolean(entry.done);
          const entryLabel =
            seriesType === "serie" ? `S${index}` : `E${entryIdx + 1}`;
          const previousWeightValue = toNumber(entry.previousWeight);
          const compareWeightValue = toNumber(entry.previousCompareWeight);
          const previousRepsValue = toNumber(entry.previousReps);
          const compareRepsValue = toNumber(entry.previousCompareReps);
          const hasTrend =
            (previousWeightValue != null && compareWeightValue != null) ||
            (previousRepsValue != null && compareRepsValue != null);
          let trend = null;
          if (hasTrend) {
            if (previousWeightValue != null && compareWeightValue != null) {
              if (previousWeightValue > compareWeightValue) trend = "up";
              else if (previousWeightValue < compareWeightValue) trend = "down";
              else if (
                previousRepsValue != null &&
                compareRepsValue != null
              ) {
                if (previousRepsValue > compareRepsValue) trend = "up";
                else if (previousRepsValue < compareRepsValue) trend = "down";
                else trend = "same";
              } else {
                trend = "same";
              }
            } else if (previousRepsValue != null && compareRepsValue != null) {
              if (previousRepsValue > compareRepsValue) trend = "up";
              else if (previousRepsValue < compareRepsValue) trend = "down";
              else trend = "same";
            }
          }
          const trendClass =
            trend === "up"
              ? "text-emerald-500"
              : trend === "down"
              ? "text-rose-500"
              : "text-[color:var(--text-muted)]";
          const TrendIcon =
            trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : null;
          return (
            <div
              key={entry.id || `${index}-${entryIdx}`}
              className={`grid max-w-full grid-cols-[28px_minmax(0,1fr)_52px_52px_32px] items-center gap-1.5 rounded-xl border border-[color:var(--border)] px-1.5 py-2 sm:grid-cols-[48px_minmax(0,1fr)_minmax(0,1fr)_60px_40px] sm:gap-2 sm:px-2 ${
                entryDone
                  ? "bg-slate-100 dark:bg-slate-800 text-[color:var(--text-muted)]"
                  : "bg-[color:var(--card)]"
              }`}
            >
              <div className="text-xs font-semibold text-[color:var(--text-muted)]">
                {entryLabel}
              </div>
              <div
                className={`flex min-w-0 items-center gap-1 text-[11px] sm:text-[12px] ${trendClass}`}
              >
                <span className="min-w-0 truncate">
                  {entry.previousText || "Sin referencia"}
                </span>
                {TrendIcon ? <TrendIcon className="h-3 w-3" /> : null}
              </div>
              <input
                className="min-w-0 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-1.5 py-1 text-center text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 sm:px-2"
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                value={entry.kg ?? ""}
                onChange={(e) =>
                  onChangeEntry?.(
                    entry.id,
                    "kg",
                    normalizeDecimal(e.target.value)
                  )
                }
                placeholder="Kg"
              />
              <input
                className="min-w-0 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-1.5 py-1 text-center text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 sm:px-2"
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                value={entry.reps ?? ""}
                onChange={(e) =>
                  onChangeEntry?.(
                    entry.id,
                    "reps",
                    normalizeDecimal(e.target.value)
                  )
                }
                placeholder="Reps"
              />
              <div className="flex min-w-0 items-center justify-end">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={() => onToggleEntry?.(entry.id)}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                    entryDone
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "border-[color:var(--border)] text-[color:var(--text-muted)]"
                  }`}
                  aria-label={
                    entryDone
                      ? "Marcar como pendiente"
                      : "Marcar como completado"
                  }
                >
                  {entryDone ? <Check className="h-4 w-4" /> : null}
                </motion.button>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

SetRow.propTypes = {
  index: PropTypes.number.isRequired,
  seriesType: PropTypes.oneOf(["serie", "biserie", "triserie"]),
  entries: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      previousText: PropTypes.string.isRequired,
      previousWeight: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      previousCompareWeight: PropTypes.oneOfType([
        PropTypes.number,
        PropTypes.string,
      ]),
      previousReps: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      previousCompareReps: PropTypes.oneOfType([
        PropTypes.number,
        PropTypes.string,
      ]),
      kg: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      reps: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      done: PropTypes.bool.isRequired,
    })
  ),
  prSummary: PropTypes.string,
  onChangeEntry: PropTypes.func.isRequired,
  onToggleEntry: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};
