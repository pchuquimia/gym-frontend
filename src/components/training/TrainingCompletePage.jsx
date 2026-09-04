import PropTypes from "prop-types";
import { motion, useReducedMotion } from "framer-motion";
import {
  Camera,
  Check,
  Flame,
  Flag,
  ImagePlus,
  LoaderCircle,
  RotateCcw,
  X,
} from "lucide-react";

const getSummaryItems = ({
  completedExercises,
  totalExercises,
  totalSets,
  durationLabel,
}) => [
  {
    label: "Ejercicios",
    value: `${completedExercises}/${totalExercises}`,
  },
  { label: "Series", value: totalSets },
  { label: "Tiempo", value: durationLabel },
];

export default function TrainingCompletePage({
  routineName,
  heroImage,
  completedExercises,
  totalExercises,
  completedSets,
  totalSets,
  durationLabel,
  calorieEstimate,
  photoPreview,
  photoError,
  onPhotoChange,
  onClearPhoto,
  progressPercent,
  isComplete,
  isFinalizing,
  onFinish,
  onDismiss,
}) {
  const reduceMotion = useReducedMotion();
  const metrics = getSummaryItems({
    completedExercises,
    totalExercises,
    totalSets: isComplete ? totalSets : `${completedSets}/${totalSets}`,
    durationLabel,
  });

  return (
    <motion.main
      data-training-complete-page
      className="flex min-h-[calc(100dvh-7rem)] w-full items-start justify-center bg-[color:var(--bg)] pb-4 pt-[calc(2.25rem+env(safe-area-inset-top))] sm:py-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.24 }}
    >
      <motion.section
        aria-labelledby="completed-routine-page-title"
        initial={
          reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 28 }
        }
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={
          reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 14 }
        }
        transition={{
          duration: reduceMotion ? 0 : 0.46,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="w-full max-w-md overflow-hidden bg-[color:var(--bg)] p-0 text-[color:var(--text)]"
      >
        <h2 id="completed-routine-page-title" className="sr-only">
          {isComplete ? "Rutina completada" : "Resumen del entrenamiento"}
        </h2>

        <div className="relative aspect-square w-full overflow-hidden rounded-[1.75rem] bg-[#20150f] text-white">
          <motion.img
            src={heroImage || "/images/workout-hero-model.webp"}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            initial={reduceMotion ? false : { scale: 1.08 }}
            animate={{ scale: 1 }}
            transition={{
              duration: reduceMotion ? 0 : 0.9,
              ease: [0.16, 1, 0.3, 1],
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/10 to-black/80" />

          <p className="absolute left-5 top-5 text-xl font-semibold tracking-[-0.03em]">
            APEX
          </p>

          <div className="absolute inset-x-5 top-1/2 flex -translate-y-1/2 flex-col items-center text-center">
            <motion.span
              aria-hidden="true"
              className="grid h-14 w-14 place-items-center rounded-full bg-white text-[#765f50] shadow-[0_10px_30px_rgba(0,0,0,0.28)]"
              initial={
                reduceMotion ? false : { opacity: 0, scale: 0.35, rotate: -28 }
              }
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{
                delay: reduceMotion ? 0 : 0.14,
                duration: reduceMotion ? 0 : 0.58,
                type: "spring",
                stiffness: 230,
                damping: 14,
              }}
            >
              {isComplete ? (
                <Check className="h-8 w-8 stroke-[3]" />
              ) : (
                <Flag className="h-7 w-7 stroke-[2.5]" />
              )}
            </motion.span>
            <motion.p
              className="mt-3 text-base font-medium"
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduceMotion ? 0 : 0.25, duration: 0.35 }}
            >
              {isComplete ? "Completado" : "Sesión parcial"}
            </motion.p>
            <motion.p
              className="mt-2 max-w-[90%] text-[1.75rem] font-medium leading-[1.05] tracking-[-0.035em]"
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduceMotion ? 0 : 0.32, duration: 0.38 }}
            >
              {routineName || "Entrenamiento"}
            </motion.p>
          </div>

          <div className="absolute inset-x-5 bottom-5 grid grid-cols-3 gap-3">
            {metrics.map((metric, index) => (
              <motion.div
                key={metric.label}
                className={
                  index === 1 ? "text-center" : index === 2 ? "text-right" : ""
                }
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: reduceMotion ? 0 : 0.38 + index * 0.08,
                  duration: 0.34,
                }}
              >
                <p className="text-xs font-normal text-white/80">
                  {metric.label}
                </p>
                <p className="mt-1 truncate text-base font-medium">
                  {metric.value}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
          <div className="overflow-hidden rounded-[1.5rem] bg-[color:var(--surface-subtle)] px-4">
            <div className="flex min-h-16 items-center justify-between gap-4 border-b border-[color:var(--detail-row-divider)]">
              <span className="text-base font-medium">Calorías activas</span>
              <span className="text-base font-normal text-[color:var(--text-muted)]">
                {calorieEstimate?.available
                  ? `~${calorieEstimate.calories} kcal`
                  : "--"}
              </span>
            </div>
            <div className="flex min-h-16 items-center justify-between gap-4 border-b border-[color:var(--detail-row-divider)]">
              <span className="text-base font-medium">Rango estimado</span>
              <span className="text-base font-normal text-[color:var(--text-muted)]">
                {calorieEstimate?.available
                  ? `${calorieEstimate.minCalories}–${calorieEstimate.maxCalories} kcal`
                  : "--"}
              </span>
            </div>
            <div className="flex min-h-16 items-center justify-between gap-4 border-b border-[color:var(--detail-row-divider)]">
              <span className="text-base font-medium">Progreso</span>
              <span className="text-base font-normal text-[color:var(--text-muted)]">
                {progressPercent}%
              </span>
            </div>
            <div className="flex min-h-16 items-center justify-between gap-4">
              <span className="inline-flex items-center gap-2 text-base font-medium">
                <Flame className="h-4 w-4 text-[#e49a32]" /> Estado
              </span>
              <span className="text-base font-normal text-[color:var(--text-muted)]">
                {isComplete ? "Completado" : "Finalización anticipada"}
              </span>
            </div>
          </div>

          <section className="mt-4" aria-labelledby="completion-photo-title">
            <div className="mb-2 flex items-center justify-between gap-3 px-1">
              <h3
                id="completion-photo-title"
                className="text-sm font-semibold text-[color:var(--text)]"
              >
                Foto del entrenamiento
              </h3>
              <span className="text-xs text-[color:var(--text-muted)]">
                Opcional
              </span>
            </div>

            {photoPreview ? (
              <div className="relative overflow-hidden rounded-[1.25rem] bg-[color:var(--surface-subtle)]">
                <img
                  src={photoPreview}
                  alt="Vista previa de la foto final"
                  className="h-40 w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-2 bg-black/65 p-2 text-white backdrop-blur-sm">
                  <label className="grid h-10 w-10 cursor-pointer place-items-center rounded-full border border-white/35 bg-black/30">
                    <Camera className="h-4 w-4" />
                    <span className="sr-only">Cambiar foto final</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      capture="environment"
                      className="hidden"
                      onChange={onPhotoChange}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={onClearPhoto}
                    className="grid h-10 w-10 place-items-center rounded-full border border-white/35 bg-black/30"
                    aria-label="Quitar foto final"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex min-h-20 cursor-pointer items-center gap-3 rounded-[1.25rem] bg-[color:var(--surface-subtle)] px-4 py-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[color:var(--card)] text-[#352018] dark:text-[#e2ff00]">
                  <ImagePlus className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">
                    Tomar o elegir una foto
                  </span>
                  <span className="mt-0.5 block text-xs text-[color:var(--text-muted)]">
                    Se guardará junto al entrenamiento
                  </span>
                </span>
                <Camera className="h-5 w-5 shrink-0 text-[color:var(--text-muted)]" />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  className="hidden"
                  onChange={onPhotoChange}
                />
              </label>
            )}

            {photoError ? (
              <p className="mt-2 px-1 text-xs font-semibold text-red-600 dark:text-red-300">
                {photoError}
              </p>
            ) : null}
          </section>

          <motion.button
            type="button"
            onClick={onFinish}
            disabled={isFinalizing}
            aria-label={
              isFinalizing ? "Finalizando" : "Finalizar entrenamiento"
            }
            className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-[1rem] bg-[#352018] px-4 text-base font-semibold uppercase text-white shadow-[0_10px_28px_rgba(53,32,24,0.2)] disabled:cursor-wait disabled:opacity-80 dark:bg-[#e2ff00] dark:text-black"
            initial={false}
            animate={reduceMotion ? { scale: 1 } : { scale: [1, 1.018, 1] }}
            transition={{ duration: reduceMotion ? 0 : 0.72, delay: 0.48 }}
          >
            {isFinalizing ? (
              <LoaderCircle className="h-5 w-5 animate-spin" />
            ) : null}
            {isFinalizing ? "Guardando" : "Finalizar entrenamiento"}
          </motion.button>

          <button
            type="button"
            onClick={onDismiss}
            disabled={isFinalizing}
            aria-label="Volver al entrenamiento"
            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-[1rem] text-sm font-medium text-[color:var(--text-muted)] disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            Volver al entrenamiento
          </button>
        </div>
      </motion.section>
    </motion.main>
  );
}

TrainingCompletePage.propTypes = {
  routineName: PropTypes.string,
  heroImage: PropTypes.string,
  completedExercises: PropTypes.number.isRequired,
  totalExercises: PropTypes.number.isRequired,
  completedSets: PropTypes.number.isRequired,
  totalSets: PropTypes.number.isRequired,
  durationLabel: PropTypes.string.isRequired,
  calorieEstimate: PropTypes.shape({
    available: PropTypes.bool,
    calories: PropTypes.number,
    minCalories: PropTypes.number,
    maxCalories: PropTypes.number,
  }),
  photoPreview: PropTypes.string,
  photoError: PropTypes.string,
  onPhotoChange: PropTypes.func.isRequired,
  onClearPhoto: PropTypes.func.isRequired,
  progressPercent: PropTypes.number.isRequired,
  isComplete: PropTypes.bool.isRequired,
  isFinalizing: PropTypes.bool,
  onFinish: PropTypes.func.isRequired,
  onDismiss: PropTypes.func.isRequired,
};
