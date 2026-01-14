import PropTypes from "prop-types";
import { motion, useMotionValue } from "framer-motion";
import { Check, X } from "lucide-react";

export default function SetRow({
  index,
  seriesType = "serie",
  entries = [],
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
    "rounded-2xl border border-[color:var(--border)] px-2 py-2 space-y-2";
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
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <span
            className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold ${
              setDone ? "bg-emerald-500 text-white" : "bg-blue-600 text-white"
            }`}
          >
            {index}
          </span>
          <span className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-muted)] font-semibold">
            Set de {seriesLabel}
          </span>
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
          return (
            <div
              key={entry.id || `${index}-${entryIdx}`}
              className={`grid grid-cols-[48px,1fr,1fr,60px,40px] items-center gap-2 px-2 py-2 rounded-xl border border-[color:var(--border)] ${
                entryDone
                  ? "bg-slate-100 dark:bg-slate-800 text-[color:var(--text-muted)]"
                  : "bg-[color:var(--card)]"
              }`}
            >
              <div className="text-xs font-semibold text-[color:var(--text-muted)]">
                {entryLabel}
              </div>
              <div className="text-[12px] text-[color:var(--text-muted)]">
                {entry.previousText || "Sin referencia"}
              </div>
              <input
                className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-2 py-1 text-sm text-center focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
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
                className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-2 py-1 text-sm text-center focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
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
              <div className="flex items-center justify-end gap-2">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={() => onToggleEntry?.(entry.id)}
                  className={`h-7 w-7 rounded-full border flex items-center justify-center ${
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
      kg: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      reps: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      done: PropTypes.bool.isRequired,
    })
  ),
  onChangeEntry: PropTypes.func.isRequired,
  onToggleEntry: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};
