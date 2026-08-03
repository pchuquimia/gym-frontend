import PropTypes from "prop-types";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Check, Trash2, X } from "lucide-react";

const SWIPE_LIMIT = 96;
const DELETE_THRESHOLD = 88;

export default function SetRow({
  index,
  exerciseName,
  seriesType = "serie",
  entries = [],
  prSummary = "",
  prBranchLabel = "",
  onChangeEntry,
  onToggleEntry,
  onRemove,
}) {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const setDone =
    safeEntries.length > 0 ? safeEntries.every((entry) => entry.done) : false;
  const baseClasses =
    "max-w-full overflow-hidden rounded-lg dark:rounded-[4px] border border-[color:var(--border)] px-2 py-2 space-y-2";
  const stateClasses = setDone
    ? "bg-[#f0f0f0] dark:bg-[#1b1b1b] text-[color:var(--text-muted)]"
    : "bg-[color:var(--card)]";
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(
    x,
    [-SWIPE_LIMIT, -DELETE_THRESHOLD / 2, 0],
    [1, 0.65, 0],
  );
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
  const moveCaretToEnd = (event) => {
    const input = event.currentTarget;
    const placeCaret = () => {
      const end = String(input.value ?? "").length;
      input.setSelectionRange(end, end);
    };
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(placeCaret);
    } else {
      placeCaret();
    }
  };

  const resetSwipe = () =>
    animate(x, 0, {
      type: "spring",
      stiffness: 520,
      damping: 38,
      mass: 0.65,
    });

  const handleDragEnd = () => {
    if (!isMobile) return;
    if (x.get() <= -DELETE_THRESHOLD && onRemove) {
      onRemove();
      return;
    }
    resetSwipe();
  };

  return (
    <motion.div
      data-set-row
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="relative max-w-full overflow-hidden rounded-lg dark:rounded-[4px]"
    >
      {isMobile && onRemove ? (
        <motion.div
          aria-hidden="true"
          style={{ opacity: deleteOpacity }}
          className="absolute inset-y-0 right-0 grid w-24 place-items-center bg-red-600 text-white"
        >
          <div className="grid place-items-center gap-1 text-xs font-black uppercase">
            <Trash2 className="h-5 w-5" />
            Eliminar
          </div>
        </motion.div>
      ) : null}
      <motion.div
        drag={isMobile && onRemove ? "x" : false}
        dragConstraints={
          isMobile ? { left: -SWIPE_LIMIT, right: 0 } : undefined
        }
        dragElastic={0.03}
        dragMomentum={false}
        dragDirectionLock
        style={isMobile ? { x, touchAction: "pan-y" } : undefined}
        onDragEnd={handleDragEnd}
        className={`relative z-10 ${baseClasses} ${stateClasses}`}
      >
        <div className="flex min-w-0 items-center justify-between gap-2 px-1 sm:px-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                setDone
                  ? "bg-[#ff5722] text-white dark:bg-[#e2ff00] dark:text-black"
                  : "bg-[#1a1a1a] text-white dark:bg-[#252525]"
              }`}
            >
              {index}
            </span>
            {prSummary ? (
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="min-w-0 truncate text-[13px] text-[color:var(--text-muted)]">
                  PR {prSummary}
                </span>
                {prBranchLabel ? (
                  <span
                    className="shrink-0 rounded border border-[#ff5722]/25 bg-[#fff0eb] px-2 py-0.5 text-xs font-medium text-[#c52d00] dark:border-[#e2ff00]/25 dark:bg-[#1d2100] dark:text-[#e2ff00]"
                    title={`PR registrado en ${prBranchLabel}`}
                  >
                    {prBranchLabel}
                  </span>
                ) : null}
              </div>
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
                else if (previousWeightValue < compareWeightValue)
                  trend = "down";
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
              } else if (
                previousRepsValue != null &&
                compareRepsValue != null
              ) {
                if (previousRepsValue > compareRepsValue) trend = "up";
                else if (previousRepsValue < compareRepsValue) trend = "down";
                else trend = "same";
              }
            }
            const trendClass =
              trend === "up"
                ? "text-[#ff5722] dark:text-[#e2ff00]"
                : trend === "down"
                  ? "text-rose-500"
                  : "text-[color:var(--text-muted)]";
            const TrendIcon =
              trend === "up"
                ? ArrowUpRight
                : trend === "down"
                  ? ArrowDownRight
                  : null;
            return (
              <div
                key={entry.id || `${index}-${entryIdx}`}
                className={`grid max-w-full grid-cols-[28px_minmax(0,1fr)_74px_68px_44px] items-center gap-1.5 rounded-xl border border-[color:var(--border)] px-1.5 py-2 sm:grid-cols-[48px_minmax(0,1fr)_88px_80px_44px] sm:gap-2 sm:px-2 ${
                  entryDone
                    ? "bg-[#f0f0f0] text-[color:var(--text-muted)] dark:bg-[#1b1b1b]"
                    : "bg-[color:var(--card)]"
                }`}
              >
                <div className="text-xs font-semibold text-[color:var(--text-muted)]">
                  {entryLabel}
                </div>
                <div
                  className={`flex min-w-0 items-center gap-1 text-[13px] ${trendClass}`}
                >
                  <span className="min-w-0 truncate">
                    {entry.previousText || "Sin referencia"}
                  </span>
                  {TrendIcon ? <TrendIcon className="h-3 w-3" /> : null}
                </div>
                <label className="flex h-10 min-w-0 items-center overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-1.5 focus-within:border-[#ff5722] focus-within:ring-2 focus-within:ring-[#ff5722]/15 dark:rounded-[3px] dark:focus-within:border-[#e2ff00] dark:focus-within:ring-[#e2ff00]/15">
                  <input
                    className="min-w-0 flex-1 bg-transparent text-right text-sm font-semibold tabular-nums outline-none"
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.,]?[0-9]*"
                    value={entry.kg ?? ""}
                    onFocus={moveCaretToEnd}
                    onClick={moveCaretToEnd}
                    onChange={(e) =>
                      onChangeEntry?.(
                        entry.id,
                        "kg",
                        normalizeDecimal(e.target.value),
                      )
                    }
                    placeholder="0"
                    aria-label={`Peso en kilogramos, ${exerciseName}, serie ${index}`}
                  />
                  <span className="ml-1 w-4 shrink-0 text-left text-xs font-black text-[color:var(--text-muted)]">
                    kg
                  </span>
                </label>
                <label className="flex h-10 min-w-0 items-center overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-1.5 focus-within:border-[#ff5722] focus-within:ring-2 focus-within:ring-[#ff5722]/15 dark:rounded-[3px] dark:focus-within:border-[#e2ff00] dark:focus-within:ring-[#e2ff00]/15">
                  <input
                    className="min-w-0 flex-1 bg-transparent text-right text-sm font-semibold tabular-nums outline-none"
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.,]?[0-9]*"
                    value={entry.reps ?? ""}
                    onFocus={moveCaretToEnd}
                    onClick={moveCaretToEnd}
                    onChange={(e) =>
                      onChangeEntry?.(
                        entry.id,
                        "reps",
                        normalizeDecimal(e.target.value),
                      )
                    }
                    placeholder="0"
                    aria-label={`Repeticiones, ${exerciseName}, serie ${index}`}
                  />
                  <span className="ml-1 w-5 shrink-0 text-left text-xs font-black text-[color:var(--text-muted)]">
                    rep
                  </span>
                </label>
                <div className="flex min-w-0 items-center justify-end">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={() => onToggleEntry?.(entry.id)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                    aria-label={
                      entryDone
                        ? `Marcar ${exerciseName}, serie ${index} como pendiente`
                        : `Completar ${exerciseName}, serie ${index}`
                    }
                  >
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full border ${
                        entryDone
                          ? "border-[#ff5722] bg-[#ff5722] text-white dark:border-[#e2ff00] dark:bg-[#e2ff00] dark:text-black"
                          : "border-[color:var(--border)] text-[color:var(--text-muted)]"
                      }`}
                    >
                      {entryDone ? <Check className="h-4 w-4" /> : null}
                    </span>
                  </motion.button>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

SetRow.propTypes = {
  index: PropTypes.number.isRequired,
  exerciseName: PropTypes.string.isRequired,
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
    }),
  ),
  prSummary: PropTypes.string,
  prBranchLabel: PropTypes.string,
  onChangeEntry: PropTypes.func.isRequired,
  onToggleEntry: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};
