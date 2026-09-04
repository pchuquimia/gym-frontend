import PropTypes from "prop-types";
import { AnimatePresence, motion } from "framer-motion";
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
      className="fixed inset-0 z-[70] grid place-items-center bg-black/30 p-5 backdrop-blur-sm dark:bg-black/55"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={`Descanso automático: ${timeLabel}`}
    >
      <motion.div
        className="relative isolate flex min-h-52 w-full max-w-[340px] items-center justify-center overflow-hidden rounded-[2rem] border border-white/60 bg-[color:var(--card)] px-8 py-10 shadow-[0_28px_80px_rgba(18,18,18,0.26)] dark:border-white/10 dark:shadow-[0_32px_90px_rgba(0,0,0,0.65)]"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={
          reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }
        }
        transition={{
          type: reduceMotion ? "tween" : "spring",
          stiffness: 300,
          damping: 28,
        }}
      >
        <motion.span
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 -z-10 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#352018]/10 blur-3xl dark:bg-[#e2ff00]/10"
          animate={
            reduceMotion
              ? { opacity: 0.4 }
              : {
                  scale: [0.9, 1.35, 0.9],
                  opacity: [0.3, 0.75, 0.3],
                }
          }
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 2.4, ease: "easeInOut", repeat: Infinity }
          }
        />
        <AnimatePresence initial={false} mode="popLayout">
          <motion.output
            key={timeLabel}
            className="font-mono text-[clamp(4.5rem,22vw,6.5rem)] font-medium tabular-nums leading-none tracking-[-0.08em] text-[color:var(--text)]"
            initial={reduceMotion ? false : { y: "35%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { y: "-35%", opacity: 0 }}
            transition={{
              duration: reduceMotion ? 0 : 0.22,
              ease: [0.16, 1, 0.3, 1],
            }}
            aria-live="polite"
          >
            {timeLabel}
          </motion.output>
        </AnimatePresence>
        <div
          className="absolute inset-x-8 bottom-5 h-1 overflow-hidden rounded-full bg-[color:var(--border)]"
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={progress}
        >
          <motion.span
            className="block h-full rounded-full bg-[#352018] dark:bg-[#e2ff00]"
            animate={{ width: `${progress}%` }}
            transition={{
              duration: reduceMotion ? 0 : 0.35,
              ease: [0.16, 1, 0.3, 1],
            }}
          />
        </div>
        <button
          type="button"
          onClick={onExit}
          className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-[color:var(--surface-subtle)] text-[color:var(--text-muted)] transition hover:text-[color:var(--text)] focus:outline-none focus:ring-2 focus:ring-[#352018]/30 dark:focus:ring-[#e2ff00]/30"
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
