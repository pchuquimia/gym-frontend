import PropTypes from "prop-types";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Flag, Flame, LoaderCircle, RotateCcw } from "lucide-react";

export default function TrainingCompleteModal({
  routineName,
  completedExercises,
  totalExercises,
  totalSets,
  durationLabel,
  calorieEstimate,
  isFinalizing,
  onFinish,
  onDismiss,
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="fixed inset-0 z-[88] grid place-items-center bg-black/25 px-4 py-6 backdrop-blur-[3px] dark:bg-black/50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.22 }}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onDismiss}
        disabled={isFinalizing}
        aria-label="Volver al entrenamiento"
      />

      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="completed-routine-modal-title"
        initial={
          reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 22 }
        }
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={
          reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }
        }
        transition={{
          duration: reduceMotion ? 0 : 0.38,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="relative w-full max-w-sm overflow-hidden border border-[#ff5722]/55 bg-[#f7f7f9]/95 text-[color:var(--text)] shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl dark:border-[#e2ff00]/55 dark:bg-[#121212]/95 dark:shadow-[0_24px_75px_rgba(0,0,0,0.72)]"
      >
        <motion.span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1 origin-left bg-[#ff5722] dark:bg-[#e2ff00]"
          initial={reduceMotion ? false : { scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.65 }}
        />

        <div className="px-5 pb-5 pt-7 text-center">
          <motion.span
            aria-hidden="true"
            className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#ff5722] text-white shadow-[0_12px_32px_rgba(255,87,34,0.3)] dark:bg-[#e2ff00] dark:text-black dark:shadow-[0_12px_34px_rgba(226,255,0,0.2)]"
            initial={reduceMotion ? false : { scale: 0.45, rotate: -22 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              delay: reduceMotion ? 0 : 0.08,
              duration: reduceMotion ? 0 : 0.52,
              type: "spring",
              stiffness: 230,
              damping: 15,
            }}
          >
            <Check className="h-10 w-10 stroke-[3]" />
          </motion.span>

          <p className="font-condensed mt-5 text-[11px] font-black uppercase tracking-[0.14em] text-[#b72f08] dark:text-[#e2ff00]">
            Todas las series completadas
          </p>
          <h2
            id="completed-routine-modal-title"
            className="font-condensed mt-1 text-[36px] font-black uppercase leading-[0.92]"
          >
            Rutina completada
          </h2>
          <p className="mt-2 truncate text-sm font-bold text-[color:var(--text-muted)]">
            {routineName || "Entrenamiento"}
          </p>

          <div className="mt-5 grid grid-cols-2 border-y border-[color:var(--border)] text-left sm:grid-cols-4">
            <div className="border-b border-[color:var(--border)] py-3 pr-3 sm:border-b-0">
              <p className="font-condensed text-[9px] font-black uppercase text-[color:var(--text-muted)]">
                Ejercicios
              </p>
              <p className="mt-1 text-lg font-black leading-none">
                {completedExercises}/{totalExercises}
              </p>
            </div>
            <div className="border-b border-l border-[color:var(--border)] px-3 py-3 sm:border-b-0">
              <p className="font-condensed text-[9px] font-black uppercase text-[color:var(--text-muted)]">
                Series
              </p>
              <p className="mt-1 text-lg font-black leading-none">
                {totalSets}
              </p>
            </div>
            <div className="py-3 pr-3 sm:border-l sm:border-[color:var(--border)] sm:px-3">
              <p className="font-condensed text-[9px] font-black uppercase text-[color:var(--text-muted)]">
                Tiempo
              </p>
              <p className="mt-1 truncate font-mono text-sm font-black leading-none">
                {durationLabel}
              </p>
            </div>
            <div className="border-l border-[color:var(--border)] py-3 pl-3">
              <p className="font-condensed flex items-center gap-1 text-[9px] font-black uppercase text-[color:var(--text-muted)]">
                <Flame className="h-3 w-3 text-[#ff5722] dark:text-[#e2ff00]" />
                Calorías
              </p>
              <p className="mt-1 truncate text-sm font-black leading-none text-[color:var(--text)]">
                {calorieEstimate?.available
                  ? `~${calorieEstimate.calories} kcal`
                  : "--"}
              </p>
            </div>
          </div>
          {calorieEstimate?.available ? (
            <p className="mt-2 text-[10px] font-semibold text-[color:var(--text-muted)]">
              Estimación orientativa · {calorieEstimate.minCalories}–
              {calorieEstimate.maxCalories} kcal
            </p>
          ) : null}

          <motion.button
            type="button"
            onClick={onFinish}
            disabled={isFinalizing}
            className="mt-5 flex h-14 w-full items-center justify-center gap-2 bg-[#ff5722] px-4 font-condensed text-xl font-black uppercase text-white shadow-[0_10px_28px_rgba(255,87,34,0.25)] disabled:cursor-wait disabled:opacity-80 dark:bg-[#e2ff00] dark:text-black dark:shadow-[0_10px_30px_rgba(226,255,0,0.16)]"
            initial={false}
            animate={reduceMotion ? { scale: 1 } : { scale: [1, 1.025, 1] }}
            transition={{ duration: reduceMotion ? 0 : 0.7, delay: 0.3 }}
          >
            {isFinalizing ? (
              <LoaderCircle className="h-5 w-5 animate-spin" />
            ) : (
              <Flag className="h-5 w-5" />
            )}
            {isFinalizing ? "Finalizando" : "Finalizar entrenamiento"}
          </motion.button>

          <button
            type="button"
            onClick={onDismiss}
            disabled={isFinalizing}
            className="mt-2 flex h-11 w-full items-center justify-center gap-2 border border-[color:var(--border)] bg-transparent font-condensed text-base font-black uppercase text-[color:var(--text)] shadow-none disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            Volver al entrenamiento
          </button>
        </div>
      </motion.section>
    </motion.div>
  );
}

TrainingCompleteModal.propTypes = {
  routineName: PropTypes.string,
  completedExercises: PropTypes.number.isRequired,
  totalExercises: PropTypes.number.isRequired,
  totalSets: PropTypes.number.isRequired,
  durationLabel: PropTypes.string.isRequired,
  calorieEstimate: PropTypes.shape({
    available: PropTypes.bool,
    calories: PropTypes.number,
    minCalories: PropTypes.number,
    maxCalories: PropTypes.number,
  }),
  isFinalizing: PropTypes.bool,
  onFinish: PropTypes.func.isRequired,
  onDismiss: PropTypes.func.isRequired,
};
