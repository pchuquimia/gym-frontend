import PropTypes from "prop-types";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

export default function RoutineSelector({
  routine,
  routines,
  onSelect,
  disabled = false,
  showLocation = true,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-expanded={open && !disabled}
        aria-haspopup="listbox"
        className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-left shadow-sm transition-colors hover:border-[#ff5722] disabled:cursor-not-allowed disabled:opacity-60 dark:rounded-[4px] dark:hover:border-[#e2ff00]"
      >
        <div className="flex items-center justify-between">
          <div>
            {showLocation ? (
              <p className="text-xs font-semibold capitalize text-[#ff5722] dark:text-[#e2ff00]">
                {routine.location}
              </p>
            ) : null}
            <p className="text-base font-semibold text-[color:var(--text)]">
              {routine.name}
            </p>
            <p className="text-xs text-[color:var(--text-muted)]">
              {routine.exerciseCount} principales
              {routine.optionalExerciseCount
                ? ` + ${routine.optionalExerciseCount} opcional`
                : ""}{" "}
              | Último: {routine.lastDate}
            </p>
          </div>
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-[color:var(--text-muted)] transition-transform ${open && !disabled ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      <AnimatePresence>
        {open && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute z-20 mt-2 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-2 shadow-lg dark:rounded-[4px]"
          >
            <p className="text-[11px] uppercase text-[color:var(--text-muted)] px-2 pb-1">
              Cambiar rutina
            </p>
            <div
              className="space-y-1 max-h-60 overflow-y-auto"
              role="listbox"
              aria-label="Rutinas disponibles"
            >
              {routines.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  role="option"
                  aria-selected={r.id === routine.id}
                  onClick={() => {
                    onSelect(r.id);
                    setOpen(false);
                  }}
                  className={`w-full rounded-xl px-3 py-2 text-left hover:bg-[color:var(--bg)] ${
                    r.id === routine.id
                      ? "border border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--accent-contrast)]"
                      : "border border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      {showLocation ? (
                        <p
                          className={`text-xs font-semibold capitalize ${
                            r.id === routine.id
                              ? "text-current"
                              : "text-[#ff5722] dark:text-[#e2ff00]"
                          }`}
                        >
                          {r.location}
                        </p>
                      ) : null}
                      <p
                        className={`text-sm font-semibold ${
                          r.id === routine.id
                            ? "text-current"
                            : "text-[color:var(--text)]"
                        }`}
                      >
                        {r.name}
                      </p>
                      <p
                        className={`text-[12px] ${
                          r.id === routine.id
                            ? "text-current/80"
                            : "text-[color:var(--text-muted)]"
                        }`}
                      >
                        {r.exerciseCount} principales
                        {r.optionalExerciseCount
                          ? ` + ${r.optionalExerciseCount} opcional`
                          : ""}{" "}
                        | Último: {r.lastDate}
                      </p>
                    </div>
                    {r.id === routine.id && (
                      <span className="text-sm font-semibold text-current">
                        Elegido
                      </span>
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
    optionalExerciseCount: PropTypes.number,
    lastDate: PropTypes.string.isRequired,
  }).isRequired,
  routines: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      location: PropTypes.string.isRequired,
      exerciseCount: PropTypes.number.isRequired,
      optionalExerciseCount: PropTypes.number,
      lastDate: PropTypes.string.isRequired,
    }),
  ).isRequired,
  onSelect: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  showLocation: PropTypes.bool,
};
