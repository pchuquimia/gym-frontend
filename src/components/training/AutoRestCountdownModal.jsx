import PropTypes from "prop-types";
import { motion } from "framer-motion";
import { X } from "lucide-react";

export default function AutoRestCountdownModal({
  timeLabel,
  progressPct,
  reduceMotion = false,
  onExit,
}) {
  const progress = Math.max(0, Math.min(100, Number(progressPct) || 0));

  return (
    <motion.div
      className="fixed inset-0 z-[70] grid place-items-center bg-black/20 p-5 backdrop-blur-[2px] dark:bg-black/45"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={`Descanso automático: ${timeLabel}`}
    >
      <motion.div
        className="relative aspect-square w-full max-w-[280px] drop-shadow-[0_24px_38px_rgba(18,18,18,0.28)] dark:drop-shadow-[0_28px_44px_rgba(0,0,0,0.72)]"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <div
          className="grid h-full w-full place-items-center rounded-full p-[10px] shadow-[0_0_42px_rgba(53,32,24,0.2)] dark:shadow-[0_0_48px_rgba(226,255,0,0.18)]"
          style={{
            background: `conic-gradient(var(--accent) ${progress}%, color-mix(in srgb, var(--border) 72%, transparent) ${progress}% 100%)`,
          }}
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={progress}
        >
          <div className="grid h-full w-full place-items-center rounded-full border border-white/70 bg-[color:var(--card)]/95 shadow-[inset_0_0_28px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-white/15 dark:shadow-[inset_0_0_32px_rgba(0,0,0,0.4)]">
            <output
              className="font-condensed text-6xl font-black tabular-nums leading-none text-[color:var(--text)]"
              aria-live="polite"
            >
              {timeLabel}
            </output>
          </div>
        </div>
        <button
          type="button"
          onClick={onExit}
          className="absolute right-1 top-1 grid h-11 w-11 place-items-center rounded-full border border-white/70 bg-[color:var(--card)] text-[color:var(--text)] shadow-lg transition hover:border-[#352018] hover:text-[#352018] focus:outline-none focus:ring-2 focus:ring-[#352018]/40 dark:border-white/15 dark:hover:border-[#e2ff00] dark:hover:text-[#e2ff00] dark:focus:ring-[#e2ff00]/40"
          aria-label="Salir del descanso automático"
          title="Salir del descanso"
        >
          <X className="h-5 w-5" />
        </button>
      </motion.div>
    </motion.div>
  );
}

AutoRestCountdownModal.propTypes = {
  timeLabel: PropTypes.string.isRequired,
  progressPct: PropTypes.number.isRequired,
  reduceMotion: PropTypes.bool,
  onExit: PropTypes.func.isRequired,
};
