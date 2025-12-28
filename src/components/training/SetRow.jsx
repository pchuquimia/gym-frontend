import PropTypes from "prop-types";
import { motion, useMotionValue } from "framer-motion";
import { Check, X } from "lucide-react";

export default function SetRow({
  index,
  previousText,
  kg,
  reps,
  done,
  onChangeKg,
  onChangeReps,
  onToggleDone,
  onRemove,
}) {
  const baseClasses =
    "grid grid-cols-[48px,1fr,1fr,60px,40px] items-center gap-2 px-2 py-2 rounded-xl border border-[color:var(--border)]";
  const stateClasses = done
    ? "bg-slate-100 dark:bg-slate-800 text-[color:var(--text-muted)]"
    : "bg-[color:var(--card)]";
  const x = useMotionValue(0);
  const isMobile = typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false;
  const normalizeDecimal = (val) => {
    if (val === "" || val === null || val === undefined) return "";
    return String(val).replace(",", ".");
  };

  const handleDragEnd = (_, info) => {
    if (!isMobile) return;
    if (info.offset.x < -60) {
      const ok = window.confirm("¿Eliminar esta serie?");
      if (ok) onRemove();
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
      <div className="text-xs font-semibold text-[color:var(--text-muted)]">{isMobile ? index : `Set ${index}`}</div>
      <div className="text-[12px] text-[color:var(--text-muted)]">{previousText}</div>
      <input
        className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-2 py-1 text-sm text-center focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
        type="text"
        inputMode="decimal"
        pattern="[0-9]*[.,]?[0-9]*"
        value={kg ?? ""}
        onChange={(e) => onChangeKg(normalizeDecimal(e.target.value))}
        placeholder="Kg"
      />
      <input
        className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-2 py-1 text-sm text-center focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
        type="text"
        inputMode="decimal"
        pattern="[0-9]*[.,]?[0-9]*"
        value={reps ?? ""}
        onChange={(e) => onChangeReps(normalizeDecimal(e.target.value))}
        placeholder="Reps"
      />
      <div className="flex items-center justify-end gap-2">
        <motion.button
          whileTap={{ scale: 0.9 }}
          type="button"
          onClick={onToggleDone}
          className={`h-7 w-7 rounded-full border flex items-center justify-center ${
            done ? "bg-blue-600 border-blue-600 text-white" : "border-[color:var(--border)] text-[color:var(--text-muted)]"
          }`}
          aria-label={done ? "Marcar como pendiente" : "Marcar como completado"}
        >
          {done ? <Check className="h-4 w-4" /> : null}
        </motion.button>
        {!isMobile && (
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
    </motion.div>
  );
}

SetRow.propTypes = {
  index: PropTypes.number.isRequired,
  previousText: PropTypes.string.isRequired,
  kg: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  reps: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  done: PropTypes.bool.isRequired,
  onChangeKg: PropTypes.func.isRequired,
  onChangeReps: PropTypes.func.isRequired,
  onToggleDone: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};
