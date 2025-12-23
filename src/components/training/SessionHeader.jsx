import PropTypes from "prop-types";
import { motion } from "framer-motion";
import { useRef } from "react";

const formatDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatTime = (sec) => {
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, "0")).join(":");
};

export default function SessionHeader({
  title,
  dateISO,
  durationSeconds,
  isRunning,
  onStart,
  onPause,
  onReset,
  onChangeDate,
}) {
  const dateRef = useRef(null);

  return (
    <div className="rounded-2xl bg-[color:var(--card)] shadow-sm border border-[color:var(--border)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{title}</h1>
        <div className="text-xs text-[color:var(--text-muted)] font-semibold tracking-wide">LIVE</div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => {
            if (dateRef.current?.showPicker) {
              dateRef.current.showPicker();
            } else if (dateRef.current) {
              dateRef.current.focus();
              dateRef.current.click();
            }
          }}
          className="relative rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3 text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <p className="text-[11px] text-[color:var(--text-muted)] font-semibold">HOY</p>
          <p className="text-base font-semibold mt-1 text-[color:var(--text)]">{formatDate(dateISO)}</p>
          <input
            ref={dateRef}
            type="date"
            value={dateISO}
            onChange={(e) => onChangeDate?.(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer"
            aria-label="Seleccionar fecha"
          />
        </button>
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
          <p className="text-[11px] text-[color:var(--text-muted)] font-semibold">DURACION</p>
          <p className="text-base font-semibold mt-1 font-mono text-blue-600">
            {formatTime(durationSeconds)}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <motion.button
          whileTap={{ scale: 0.97 }}
          className="flex-1 rounded-lg bg-blue-600 text-white py-2 text-sm font-semibold shadow-sm"
          onClick={isRunning ? onPause : onStart}
        >
          {isRunning ? "Pausar" : "Empezar"}
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          className="rounded-lg border border-slate-200 bg-white text-slate-700 px-3 py-2 text-sm font-semibold"
          onClick={onReset}
        >
          Reset
        </motion.button>
      </div>
    </div>
  );
}

SessionHeader.propTypes = {
  title: PropTypes.string.isRequired,
  dateISO: PropTypes.string.isRequired,
  durationSeconds: PropTypes.number.isRequired,
  isRunning: PropTypes.bool.isRequired,
  onStart: PropTypes.func.isRequired,
  onPause: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  onChangeDate: PropTypes.func,
};
