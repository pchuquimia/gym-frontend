import PropTypes from "prop-types";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  Play,
  Repeat2,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import Card from "../ui/card";
import Button from "../ui/button";
import Badge from "../ui/badge";
import SetRow from "./SetRow";
import SlideToConfirm from "../shared/SlideToConfirm";
import { api } from "../../services/api";
import { getExerciseImageUrl } from "../../utils/cloudinary";

const formatShortDate = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  });
};

const getReferenceDateLabel = (exercise = {}) => {
  const dates = (exercise.sets || [])
    .flatMap((set) => set.entries || [])
    .map((entry) => entry.previousDate)
    .filter(Boolean)
    .map((date) => ({ raw: date, time: new Date(date).getTime() }))
    .filter((date) => !Number.isNaN(date.time))
    .sort((a, b) => b.time - a.time);

  if (dates[0]) return formatShortDate(dates[0].raw);

  return (
    (exercise.sets || [])
      .flatMap((set) => set.entries || [])
      .map((entry) => entry.previousText)
      .find((text) => typeof text === "string" && text.includes("|"))
      ?.split("|")
      .pop()
      ?.trim() || ""
  );
};

function DeleteExerciseSheet({ exerciseName, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-end bg-black/55 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
      <div className="w-full rounded-t-3xl border border-red-500/20 bg-[color:var(--card)] p-4 text-[color:var(--text)] shadow-2xl sm:max-w-md sm:rounded-3xl">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[color:var(--border)] sm:hidden" />
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-red-500/10 text-red-600">
            <Trash2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-600">
              Eliminar ejercicio
            </p>
            <h3 className="mt-1 truncate text-lg font-black">{exerciseName}</h3>
            <p className="mt-1 text-sm font-semibold text-[color:var(--text-muted)]">
              Esta accion no se puede deshacer en la sesion actual.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <SlideToConfirm
            label="Desliza para eliminar"
            ariaLabel="Deslizar para confirmar eliminacion"
            onConfirm={onConfirm}
          />
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-3 h-11 w-full rounded-2xl border border-[color:var(--border)] text-sm font-black text-[color:var(--text)]"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

DeleteExerciseSheet.propTypes = {
  exerciseName: PropTypes.string.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default function ExerciseCard({
  exercise,
  open = false,
  onToggleOpen,
  onAddSet,
  onUpdateEntry,
  onToggleEntry,
  onRemoveSet,
  onRemoveExercise,
  onSeriesTypeChange = () => {},
  onMovementModeChange = () => {},
  onViewTracking = null,
  onViewHistory: _onViewHistory = null,
  onSwapVariant = null,
  onStartNow = null,
}) {
  const [showOptions, setShowOptions] = useState(false);
  const [deleteSheetOpen, setDeleteSheetOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState(() => {
    const key = `exercise_thumb_${exercise.id}`;
    if (typeof localStorage !== "undefined") {
      const cached = localStorage.getItem(key);
      if (cached) return cached;
    }
    return getExerciseImageUrl(exercise, { width: 240, height: 240 });
  });
  const imgLoaded = useRef(false);
  const seriesValue =
    exercise.seriesType === "triserie"
      ? "triserie"
      : exercise.seriesType === "biserie"
        ? "biserie"
        : "serie";
  const supportsUnilateral = Boolean(exercise.supportsUnilateral);
  const movementMode =
    exercise.movementMode === "unilateral" ? "unilateral" : "bilateral";
  const hasVariants =
    Array.isArray(exercise.variants) && exercise.variants.length > 1;
  const variantTotal = hasVariants ? exercise.variants.length : 0;
  const variantPosition = hasVariants
    ? ((typeof exercise.variantIndex === "number" ? exercise.variantIndex : 0) %
        variantTotal) +
      1
    : 0;
  const referenceDateLabel = getReferenceDateLabel(exercise);
  const isMoved =
    exercise.orderContext === "early" || exercise.orderContext === "fatigued";
  const isComplete =
    Array.isArray(exercise.sets) &&
    exercise.sets.length > 0 &&
    exercise.sets.every((set) =>
      Array.isArray(set.entries) && set.entries.length
        ? set.entries.every((entry) => entry.done)
        : Boolean(set.done),
    );
  const actionLabel = exercise.isActive ? "En curso" : "Empezar";
  const actionClass = exercise.isActive
    ? "border-emerald-500 bg-emerald-600 text-white hover:bg-emerald-700"
    : "";

  const handleDragEnd = (_, info) => {
    if (!onSwapVariant || !hasVariants) return;
    const offsetX = info.offset?.x ?? 0;
    const velocityX = info.velocity?.x ?? 0;
    if (offsetX > 70 || velocityX > 700) onSwapVariant(1);
    if (offsetX < -70 || velocityX < -700) onSwapVariant(-1);
  };

  const handleToggleOpen = () => {
    if (open) setShowOptions(false);
    onToggleOpen?.();
  };

  useEffect(() => {
    if (imageSrc || imgLoaded.current) return;
    imgLoaded.current = true;
    (async () => {
      try {
        const full = await api.getExercise(exercise.id);
        const nextImg = getExerciseImageUrl(full, { width: 240, height: 240 });
        if (nextImg) {
          setImageSrc(nextImg);
          if (typeof localStorage !== "undefined") {
            const key = `exercise_thumb_${exercise.id}`;
            localStorage.setItem(key, nextImg);
          }
        }
      } catch (_e) {
        // ignore image errors
      }
    })();
  }, [exercise.id, imageSrc]);

  return (
    <motion.div
      data-exercise-id={exercise.id}
      className="w-full max-w-full overflow-hidden"
      layout
      whileHover={{ y: -2 }}
      drag={onSwapVariant && hasVariants ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      dragMomentum={false}
      dragDirectionLock
      onDragEnd={handleDragEnd}
      style={
        onSwapVariant && hasVariants ? { touchAction: "pan-y" } : undefined
      }
    >
      <Card className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)]/90 shadow-lg backdrop-blur overflow-hidden">
        <div className="flex items-center gap-2 p-3 sm:p-4 hover:bg-[color:var(--bg)]/40 transition-colors">
          <button
            type="button"
            onClick={handleToggleOpen}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            {imageSrc ? (
              <div className="h-14 w-14 shrink-0 rounded-xl overflow-hidden bg-[color:var(--bg)] border border-[color:var(--border)]">
                <img
                  src={imageSrc}
                  alt={exercise.name}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="h-14 w-14 shrink-0 rounded-xl bg-[color:var(--bg)] border border-[color:var(--border)]" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-sm font-semibold text-[color:var(--text)]">
                  {exercise.name}
                </p>
                {exercise.isActive && !isComplete && (
                  <Badge className="shrink-0 bg-emerald-600 text-white text-[10px]">
                    En curso
                  </Badge>
                )}
                {isComplete && (
                  <Badge className="shrink-0 bg-blue-600 text-white text-[10px]">
                    Completado
                  </Badge>
                )}
                {hasVariants && (
                  <span
                    className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full border border-blue-400/25 bg-blue-500/10 px-2 text-[10px] font-black text-blue-700 dark:text-blue-300"
                    title="Desliza lateralmente para cambiar de ejercicio. Al llegar al final vuelve al inicio."
                  >
                    <Repeat2 className="h-3.5 w-3.5" />
                    {variantPosition}/{variantTotal}
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-xs font-medium text-[color:var(--text-muted)]">
                {referenceDateLabel
                  ? `Última vez: ${referenceDateLabel}`
                  : "Sin fecha previa"}
              </p>
            </div>
            <ChevronDown
              className={`h-5 w-5 shrink-0 text-[color:var(--text-muted)] transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
          {onStartNow && !isComplete && (
            <Button
              size="sm"
              variant={isMoved ? "default" : "outline"}
              className={`hidden shrink-0 rounded-full px-3 sm:inline-flex ${actionClass}`}
              onClick={onStartNow}
              aria-label={`Empezar ${exercise.name}`}
            >
              <Play className="h-4 w-4" />
              <span>{actionLabel}</span>
            </Button>
          )}
          {onStartNow && !isComplete && (
            <Button
              size="icon"
              variant={isMoved ? "default" : "outline"}
              className={`h-9 w-9 shrink-0 rounded-full p-0 sm:hidden ${actionClass}`}
              onClick={onStartNow}
              aria-label={`Empezar ${exercise.name}`}
            >
              <Play className="h-4 w-4" />
            </Button>
          )}
          {onStartNow && isComplete && (
            <Button
              size="sm"
              className="hidden shrink-0 rounded-full bg-blue-600 px-3 text-white hover:bg-blue-700 sm:inline-flex"
              disabled
            >
              Completado
            </Button>
          )}
          {onStartNow && isComplete && (
            <Button
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full bg-blue-600 p-0 text-white hover:bg-blue-700 sm:hidden"
              disabled
              aria-label="Ejercicio completado"
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-[color:var(--border)] bg-[color:var(--bg)]/70"
            >
              <div className="flex items-center justify-between px-4 py-3 gap-2">
                <div className="flex gap-2 flex-wrap">
                  <motion.div whileTap={{ scale: 0.97 }}>
                    <Button
                      size="sm"
                      className="rounded-full px-4"
                      onClick={onViewTracking}
                    >
                      Seguimiento
                    </Button>
                  </motion.div>
                  <motion.div whileTap={{ scale: 0.97 }}>
                    <Button
                      size="sm"
                      variant="outline"
                      className={`rounded-full px-3 ${
                        showOptions ? "border-blue-500 text-blue-600" : ""
                      }`}
                      onClick={() => setShowOptions((value) => !value)}
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                      Opciones
                    </Button>
                  </motion.div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-red-600"
                    onClick={() => setDeleteSheetOpen(true)}
                    aria-label="Eliminar ejercicio de la sesion"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {showOptions && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mx-4 mb-3 space-y-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="shrink-0 text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                          Serie
                        </span>
                        <div className="grid min-w-0 flex-1 grid-cols-3 rounded-full border border-[color:var(--border)] bg-[color:var(--bg)] p-1">
                          {[
                            ["serie", "Normal"],
                            ["biserie", "Bi"],
                            ["triserie", "Tri"],
                          ].map(([value, label]) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => onSeriesTypeChange(value)}
                              className={`h-8 rounded-full text-xs font-black transition ${
                                seriesValue === value
                                  ? "bg-blue-600 text-white shadow-sm"
                                  : "text-[color:var(--text-muted)]"
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {supportsUnilateral && (
                        <div className="flex items-center justify-between gap-3">
                          <span className="shrink-0 text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                            Modo
                          </span>
                          <div className="grid min-w-0 flex-1 grid-cols-2 rounded-full border border-[color:var(--border)] bg-[color:var(--bg)] p-1">
                            {[
                              ["bilateral", "Bilateral"],
                              ["unilateral", "Unilateral"],
                            ].map(([value, label]) => (
                              <button
                                key={value}
                                type="button"
                                onClick={() => onMovementModeChange(value)}
                                className={`h-8 rounded-full text-xs font-black transition ${
                                  movementMode === value
                                    ? "bg-emerald-500 text-slate-950 shadow-sm"
                                    : "text-[color:var(--text-muted)]"
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2 px-2 pb-3 sm:px-3">
                <div className="space-y-2">
                  <AnimatePresence>
                    {exercise.sets.map((set, idx) => (
                      <SetRow
                        key={set.id}
                        index={idx + 1}
                        exerciseName={exercise.name}
                        seriesType={seriesValue}
                        entries={set.entries}
                        prSummary={set.prSummary}
                        prBranchLabel={set.prBranchLabel}
                        onChangeEntry={(entryId, field, value) =>
                          onUpdateEntry(set.id, entryId, field, value)
                        }
                        onToggleEntry={(entryId) =>
                          onToggleEntry(set.id, entryId)
                        }
                        onRemove={() => onRemoveSet(set.id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
                <motion.div whileTap={{ scale: 0.97 }}>
                  <Button
                    variant="outline"
                    className="w-full rounded-xl border-dashed border-[color:var(--border)] text-[color:var(--text)]"
                    onClick={onAddSet}
                  >
                    + Agregar serie
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
      {deleteSheetOpen && (
        <DeleteExerciseSheet
          exerciseName={exercise.name}
          onClose={() => setDeleteSheetOpen(false)}
          onConfirm={() => {
            setDeleteSheetOpen(false);
            onRemoveExercise?.();
          }}
        />
      )}
    </motion.div>
  );
}

ExerciseCard.propTypes = {
  exercise: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    prText: PropTypes.string,
    prSummary: PropTypes.string,
    prWeight: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    image: PropTypes.string,
    imagePublicId: PropTypes.string,
    supportsUnilateral: PropTypes.bool,
    movementMode: PropTypes.oneOf(["bilateral", "unilateral"]),
    seriesType: PropTypes.oneOf(["serie", "biserie", "triserie"]),
    plannedOrder: PropTypes.number,
    actualOrder: PropTypes.number,
    order: PropTypes.number,
    orderContext: PropTypes.string,
    orderContextLabel: PropTypes.string,
    globalPrText: PropTypes.string,
    durationSeconds: PropTypes.number,
    isActive: PropTypes.bool,
    variantIndex: PropTypes.number,
    variants: PropTypes.arrayOf(
      PropTypes.shape({
        exerciseId: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        muscle: PropTypes.string,
        image: PropTypes.string,
        imagePublicId: PropTypes.string,
      }),
    ),
    sets: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        prSummary: PropTypes.string,
        prBranchLabel: PropTypes.string,
        entries: PropTypes.arrayOf(
          PropTypes.shape({
            id: PropTypes.string.isRequired,
            previousText: PropTypes.string.isRequired,
            kg: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
            reps: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
            done: PropTypes.bool.isRequired,
          }),
        ),
      }),
    ).isRequired,
  }).isRequired,
  open: PropTypes.bool,
  onToggleOpen: PropTypes.func,
  onAddSet: PropTypes.func.isRequired,
  onUpdateEntry: PropTypes.func.isRequired,
  onToggleEntry: PropTypes.func.isRequired,
  onRemoveSet: PropTypes.func.isRequired,
  onRemoveExercise: PropTypes.func.isRequired,
  onSeriesTypeChange: PropTypes.func,
  onMovementModeChange: PropTypes.func,
  onViewTracking: PropTypes.func,
  onViewHistory: PropTypes.func,
  onSwapVariant: PropTypes.func,
  onStartNow: PropTypes.func,
};
