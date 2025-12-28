import PropTypes from "prop-types";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function RoutineSelector({ routine, routines, onSelect }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-sm p-4 text-left hover:border-blue-200 dark:hover:border-blue-500/40 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">{routine.location}</p>
            <p className="text-base font-semibold text-[color:var(--text)]">{routine.name}</p>
            <p className="text-xs text-[color:var(--text-muted)]">
              {routine.exerciseCount} ejercicios | Ultimo: {routine.lastDate}
            </p>
          </div>
          <span className="text-[color:var(--text-muted)] text-lg">v</span>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute z-20 mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-lg p-2"
          >
            <p className="text-[11px] uppercase text-[color:var(--text-muted)] px-2 pb-1">Cambiar rutina</p>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {routines.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    onSelect(r.id);
                    setOpen(false);
                  }}
                  className={`w-full rounded-xl px-3 py-2 text-left hover:bg-[color:var(--bg)] ${
                    r.id === routine.id
                      ? "border border-blue-200 bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/10"
                      : "border border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">{r.location}</p>
                      <p className="text-sm font-semibold text-[color:var(--text)]">{r.name}</p>
                      <p className="text-[12px] text-[color:var(--text-muted)]">
                        {r.exerciseCount} ejercicios | Ultimo: {r.lastDate}
                      </p>
                    </div>
                    {r.id === routine.id && (
                      <span className="text-blue-600 dark:text-blue-300 text-sm font-semibold">Elegido</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

RoutineSelector.propTypes = {
  routine: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    location: PropTypes.string.isRequired,
    exerciseCount: PropTypes.number.isRequired,
    lastDate: PropTypes.string.isRequired,
  }).isRequired,
  routines: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      location: PropTypes.string.isRequired,
      exerciseCount: PropTypes.number.isRequired,
      lastDate: PropTypes.string.isRequired,
    })
  ).isRequired,
  onSelect: PropTypes.func.isRequired,
};
