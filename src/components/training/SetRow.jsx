import PropTypes from "prop-types";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowRightLeft,
  ArrowUpRight,
  Check,
  Trash2,
  X,
} from "lucide-react";
import {
  getTrainingSetTrend,
  getTrainingSetTrendLabel,
} from "../../utils/trainingSetTrend";

const LONG_PRESS_MS = 650;
const MOVE_TOLERANCE_PX = 10;

export default function SetRow({
  setId,
  index,
  exerciseName,
  readOnly = false,
  seriesType = "serie",
  entries = [],
  prSummary = "",
  prBranchLabel = "",
  weightUnitLabel = "kg",
  onChangeEntry,
  onToggleEntry,
  onRemove,
}) {
  const reduceMotion = useReducedMotion();
  const safeEntries = Array.isArray(entries) ? entries : [];
  const setDone =
    safeEntries.length > 0 ? safeEntries.every((entry) => entry.done) : false;
  const baseClasses =
    "max-w-full overflow-hidden rounded-lg dark:rounded-[4px] border border-[color:var(--border)] px-2 py-2 space-y-2";
  const stateClasses = setDone
    ? "bg-[#f0f0f0] dark:bg-[#1b1b1b] text-[color:var(--text-muted)]"
    : "bg-[color:var(--card)]";
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const holdTimerRef = useRef(null);
  const holdStartRef = useRef({ x: 0, y: 0 });
  const isMobile =
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 767px)").matches
      : false;
  const normalizeDecimal = (val) => {
    if (val === "" || val === null || val === undefined) return "";
    return String(val).replace(",", ".");
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

  const clearLongPress = () => {
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setIsHolding(false);
  };

  const isInteractiveTarget = (target) =>
    target instanceof Element &&
    Boolean(target.closest("input, button, label, select, textarea, a"));

  const handlePointerDown = (event) => {
    if (readOnly || !isMobile || !onRemove || isInteractiveTarget(event.target))
      return;
    clearLongPress();
    holdStartRef.current = { x: event.clientX, y: event.clientY };
    setIsHolding(true);
    holdTimerRef.current = window.setTimeout(() => {
      holdTimerRef.current = null;
      setIsHolding(false);
      if (typeof navigator.vibrate === "function") navigator.vibrate(35);
      setDeleteConfirmOpen(true);
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (event) => {
    if (!holdTimerRef.current) return;
    const deltaX = Math.abs(event.clientX - holdStartRef.current.x);
    const deltaY = Math.abs(event.clientY - holdStartRef.current.y);
    if (deltaX > MOVE_TOLERANCE_PX || deltaY > MOVE_TOLERANCE_PX) {
      clearLongPress();
    }
  };

  useEffect(
    () => () => {
      if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
    },
    [],
  );

  return (
    <motion.div
      data-set-row
      data-set-id={setId}
      layout={!reduceMotion}
      initial={reduceMotion ? false : { opacity: 0, height: 0, scale: 0.98 }}
      animate={{ opacity: 1, height: "auto", scale: 1 }}
      exit={
        reduceMotion
          ? { opacity: 0 }
          : { opacity: 0, height: 0, scale: 0.98, marginTop: 0 }
      }
      transition={{
        duration: reduceMotion ? 0 : 0.2,
        ease: [0.2, 0.8, 0.2, 1],
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={clearLongPress}
      onPointerCancel={clearLongPress}
      onPointerLeave={clearLongPress}
      onContextMenu={(event) => {
        if (isMobile && !isInteractiveTarget(event.target)) {
          event.preventDefault();
        }
      }}
      className={`relative max-w-full rounded-lg transition-shadow dark:rounded-[4px] ${
        isHolding ? "ring-2 ring-[#ff5722]/45 dark:ring-[#e2ff00]/45" : ""
      }`}
    >
      <AnimatePresence>
        {isHolding ? (
          <motion.span
            className="pointer-events-none absolute inset-x-1 top-0 z-10 h-0.5 origin-left bg-[#ff5722] dark:bg-[#e2ff00]"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: LONG_PRESS_MS / 1000, ease: "linear" }}
          />
        ) : null}
      </AnimatePresence>
      <div data-set-content className={`${baseClasses} ${stateClasses}`}>
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
                  Mejor marca: {prSummary}
                </span>
                {prBranchLabel ? (
                  <span
                    className="shrink-0 rounded border border-[#ff5722]/25 bg-[#fff0eb] px-2 py-0.5 text-xs font-medium text-[#c52d00] dark:border-[#e2ff00]/25 dark:bg-[#1d2100] dark:text-[#e2ff00]"
                    title={`Mejor marca registrada en ${prBranchLabel}`}
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
              onClick={() => setDeleteConfirmOpen(true)}
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
            const trend = getTrainingSetTrend({
              latestWeight: entry.previousWeight,
              earlierWeight: entry.previousCompareWeight,
              latestReps: entry.previousReps,
              earlierReps: entry.previousCompareReps,
            });
            const trendLabel = getTrainingSetTrendLabel(trend);
            const trendClass =
              trend === "up"
                ? "text-[#ff5722] dark:text-[#e2ff00]"
                : "text-[color:var(--text-muted)]";
            const TrendIcon =
              trend === "up"
                ? ArrowUpRight
                : trend === "down"
                  ? ArrowDownRight
                  : trend === "mixed"
                    ? ArrowRightLeft
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
                  title={
                    entry.previousText
                      ? `Última sesión: ${entry.previousText}${
                          trendLabel ? ` · ${trendLabel}` : ""
                        }`
                      : "Sin sesión anterior"
                  }
                >
                  <span className="flex min-w-0 flex-col leading-tight">
                    {entry.previousText ? (
                      <span className="text-[10px] font-medium uppercase tracking-wide text-[color:var(--text-muted)]">
                        Última sesión
                      </span>
                    ) : null}
                    <span className="min-w-0 truncate">
                      {entry.previousText || "Sin sesión anterior"}
                    </span>
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
                    readOnly={readOnly}
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
                  <span className="ml-1 min-w-4 shrink-0 text-left text-[10px] font-black text-[color:var(--text-muted)]">
                    {weightUnitLabel}
                  </span>
                </label>
                <label className="flex h-10 min-w-0 items-center overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-1.5 focus-within:border-[#ff5722] focus-within:ring-2 focus-within:ring-[#ff5722]/15 dark:rounded-[3px] dark:focus-within:border-[#e2ff00] dark:focus-within:ring-[#e2ff00]/15">
                  <input
                    className="min-w-0 flex-1 bg-transparent text-right text-sm font-semibold tabular-nums outline-none"
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.,]?[0-9]*"
                    value={entry.reps ?? ""}
                    readOnly={readOnly}
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
                    disabled={readOnly}
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
                      <AnimatePresence mode="wait" initial={false}>
                        {entryDone ? (
                          <motion.span
                            key="completed"
                            initial={
                              reduceMotion
                                ? { opacity: 0 }
                                : { opacity: 0, scale: 0.45, rotate: -12 }
                            }
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            exit={{ opacity: 0, scale: 0.6 }}
                            transition={{
                              duration: reduceMotion ? 0 : 0.18,
                              ease: [0.16, 1, 0.3, 1],
                            }}
                          >
                            <Check className="h-4 w-4" />
                          </motion.span>
                        ) : null}
                      </AnimatePresence>
                    </span>
                  </motion.button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {deleteConfirmOpen && typeof document !== "undefined"
        ? createPortal(
            <motion.div
              className="fixed inset-0 z-[95] flex items-end bg-black/55 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <button
                type="button"
                className="absolute inset-0"
                onClick={() => setDeleteConfirmOpen(false)}
                aria-label="Cancelar eliminacion de serie"
              />
              <motion.section
                role="dialog"
                aria-modal="true"
                aria-labelledby={`delete-set-${index}`}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.22,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="relative w-full rounded-t-3xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-[color:var(--text)] shadow-2xl sm:max-w-sm sm:rounded-2xl sm:pb-4"
              >
                <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-[color:var(--border)] sm:hidden" />
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-red-500/10 text-red-600">
                    <Trash2 className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase text-red-600">
                      Eliminar serie
                    </p>
                    <h3
                      id={`delete-set-${index}`}
                      className="mt-1 text-xl font-black"
                    >
                      Serie {index}
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-[color:var(--text-muted)]">
                      Se eliminarán los pesos y repeticiones ingresados en esta
                      serie.
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className="h-12 rounded-xl border border-[color:var(--border)] font-black text-[color:var(--text)]"
                    onClick={() => setDeleteConfirmOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="h-12 rounded-xl bg-red-600 font-black text-white hover:bg-red-700"
                    onClick={() => {
                      setDeleteConfirmOpen(false);
                      onRemove?.();
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </motion.section>
            </motion.div>,
            document.body,
          )
        : null}
    </motion.div>
  );
}

SetRow.propTypes = {
  setId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  index: PropTypes.number.isRequired,
  exerciseName: PropTypes.string.isRequired,
  readOnly: PropTypes.bool,
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
  weightUnitLabel: PropTypes.string,
  onChangeEntry: PropTypes.func.isRequired,
  onToggleEntry: PropTypes.func.isRequired,
  onRemove: PropTypes.func,
};
