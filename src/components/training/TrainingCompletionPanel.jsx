import PropTypes from "prop-types";
import { motion, useReducedMotion } from "framer-motion";
import {
  Camera,
  Check,
  Flag,
  Flame,
  ImagePlus,
  LoaderCircle,
  X,
} from "lucide-react";

export default function TrainingCompletionPanel({
  routineName,
  completedExercises,
  totalExercises,
  totalSets,
  durationLabel,
  calorieEstimate,
  photoPreview,
  photoError,
  onPhotoChange,
  onClearPhoto,
  onFinish,
  isFinalizing,
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      data-training-completion
      aria-labelledby="training-completion-title"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduceMotion ? 0 : 0.42,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="relative overflow-hidden border border-[#352018]/45 bg-[color:var(--card)] text-[color:var(--text)] shadow-[0_18px_45px_rgba(53,32,24,0.12)] dark:border-[#e2ff00]/45 dark:shadow-[0_18px_48px_rgba(226,255,0,0.08)]"
    >
      <motion.span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 origin-left bg-[#352018] dark:bg-[#e2ff00]"
        initial={reduceMotion ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.7, ease: "easeOut" }}
      />

      <div className="px-4 pb-5 pt-6 sm:px-6 sm:pb-6">
        <header className="flex items-start gap-3 sm:items-center">
          <motion.span
            aria-hidden="true"
            className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#352018] text-white shadow-[0_8px_24px_rgba(53,32,24,0.28)] dark:bg-[#e2ff00] dark:text-black dark:shadow-[0_8px_26px_rgba(226,255,0,0.18)]"
            initial={reduceMotion ? false : { scale: 0.55, rotate: -18 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              duration: reduceMotion ? 0 : 0.5,
              delay: reduceMotion ? 0 : 0.08,
              type: "spring",
              stiffness: 240,
              damping: 16,
            }}
          >
            <Check className="h-7 w-7 stroke-[3]" />
          </motion.span>
          <div className="min-w-0 flex-1">
            <p className="font-condensed text-[11px] font-black uppercase tracking-[0.14em] text-[#352018] dark:text-[#e2ff00]">
              Sesión lista para guardar
            </p>
            <h2
              id="training-completion-title"
              className="font-condensed mt-1 text-[30px] font-black uppercase leading-none sm:text-[34px]"
            >
              Rutina completada
            </h2>
            <p className="mt-1 truncate text-sm font-semibold text-[color:var(--text-muted)]">
              {routineName || "Entrenamiento"}
            </p>
          </div>
        </header>

        <div className="mt-5 grid grid-cols-2 border-y border-[color:var(--border)] sm:grid-cols-4">
          <div className="min-w-0 border-b border-[color:var(--border)] py-3 pr-3 sm:border-b-0">
            <p className="font-condensed text-[10px] font-black uppercase text-[color:var(--text-muted)]">
              Completado
            </p>
            <p className="mt-1 text-xl font-black leading-none">
              {completedExercises}/{totalExercises}
            </p>
          </div>
          <div className="min-w-0 border-b border-l border-[color:var(--border)] px-3 py-3 sm:border-b-0">
            <p className="font-condensed text-[10px] font-black uppercase text-[color:var(--text-muted)]">
              Total series
            </p>
            <p className="mt-1 text-xl font-black leading-none">{totalSets}</p>
          </div>
          <div className="min-w-0 py-3 pr-3 sm:border-l sm:border-[color:var(--border)] sm:px-3">
            <p className="font-condensed text-[10px] font-black uppercase text-[color:var(--text-muted)]">
              Tiempo
            </p>
            <p className="mt-1 truncate font-mono text-base font-black leading-none">
              {durationLabel}
            </p>
          </div>
          <div className="min-w-0 border-l border-[color:var(--border)] py-3 pl-3">
            <p className="font-condensed flex items-center gap-1 text-[10px] font-black uppercase text-[color:var(--text-muted)]">
              <Flame className="h-3 w-3 text-[#352018] dark:text-[#e2ff00]" />
              Calorías
            </p>
            <p className="mt-1 truncate text-base font-black leading-none text-[color:var(--text)]">
              {calorieEstimate?.available
                ? `~${calorieEstimate.calories} kcal`
                : "--"}
            </p>
          </div>
        </div>
        {calorieEstimate?.available ? (
          <p className="mt-2 text-center text-[10px] font-semibold text-[color:var(--text-muted)]">
            Estimación según tu peso, tiempo e intensidad · rango{" "}
            {calorieEstimate.minCalories}–{calorieEstimate.maxCalories} kcal
          </p>
        ) : null}

        <section className="mt-5" aria-labelledby="final-photo-title">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p
                id="final-photo-title"
                className="font-condensed text-lg font-black uppercase leading-none"
              >
                Foto final
              </p>
              <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
                Se guardará con esta sesión en tu biblioteca.
              </p>
            </div>
            <span className="border border-[color:var(--border)] px-2 py-1 font-condensed text-[10px] font-black uppercase text-[color:var(--text-muted)]">
              Opcional
            </span>
          </div>

          {photoPreview ? (
            <div className="relative overflow-hidden border border-[color:var(--border)] bg-[color:var(--bg)]">
              <div className="aspect-[16/8] min-h-[180px] w-full sm:aspect-[16/6]">
                <img
                  src={photoPreview}
                  alt="Vista previa de la foto final"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-black/75 px-3 py-2.5 text-white backdrop-blur-sm">
                <div className="min-w-0">
                  <p className="font-condensed text-sm font-black uppercase">
                    Foto preparada
                  </p>
                  <p className="truncate text-[11px] text-white/70">
                    Se subirá al finalizar
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <label className="grid h-10 w-10 cursor-pointer place-items-center border border-white/30 bg-black/35 transition-colors hover:bg-white/10">
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
                    className="grid h-10 w-10 place-items-center border border-red-400/50 bg-red-600/25 text-red-100 transition-colors hover:bg-red-600/40"
                    aria-label="Quitar foto final"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <label className="group flex min-h-32 cursor-pointer items-center gap-4 border border-dashed border-[color:var(--accent)] bg-[color:var(--accent)] px-4 py-5 text-[color:var(--accent-contrast)] transition-colors hover:bg-[color:var(--accent-hover)]">
              <span className="grid h-12 w-12 shrink-0 place-items-center border border-[#352018]/30 bg-white text-[#352018] shadow-sm dark:border-[#e2ff00]/30 dark:bg-[#111] dark:text-[#e2ff00]">
                <ImagePlus className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-condensed text-lg font-black uppercase leading-none">
                  Añadir foto final
                </span>
                <span className="mt-1 block text-xs font-semibold text-current/80">
                  Usa la cámara o selecciona una imagen.
                </span>
              </span>
              <Camera className="h-5 w-5 shrink-0 text-current" />
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
            <p className="mt-2 text-xs font-bold text-red-600 dark:text-red-300">
              {photoError}
            </p>
          ) : null}
        </section>

        <motion.button
          type="button"
          onClick={onFinish}
          disabled={isFinalizing}
          className="mt-5 flex h-14 w-full items-center justify-center gap-2 bg-[#352018] px-5 font-condensed text-xl font-black uppercase text-white shadow-[0_10px_28px_rgba(53,32,24,0.25)] transition-colors hover:bg-[#482b20] disabled:cursor-wait disabled:opacity-80 dark:bg-[#e2ff00] dark:text-black dark:shadow-[0_10px_30px_rgba(226,255,0,0.16)] dark:hover:bg-[#cbe600]"
          initial={reduceMotion ? false : { scale: 0.97 }}
          animate={
            reduceMotion
              ? { scale: 1 }
              : {
                  scale: [0.97, 1.015, 1],
                }
          }
          transition={{ duration: reduceMotion ? 0 : 0.8, delay: 0.35 }}
        >
          {isFinalizing ? (
            <LoaderCircle className="h-5 w-5 animate-spin" />
          ) : (
            <Flag className="h-5 w-5" />
          )}
          {isFinalizing ? "Finalizando" : "Finalizar entrenamiento"}
        </motion.button>
      </div>
    </motion.section>
  );
}

TrainingCompletionPanel.propTypes = {
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
  photoPreview: PropTypes.string,
  photoError: PropTypes.string,
  onPhotoChange: PropTypes.func.isRequired,
  onClearPhoto: PropTypes.func.isRequired,
  onFinish: PropTypes.func.isRequired,
  isFinalizing: PropTypes.bool,
};
