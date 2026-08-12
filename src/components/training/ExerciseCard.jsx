import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  Check,
  ChevronDown,
  Play,
  Repeat2,
  Settings2,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import Card from "../ui/card";
import Button from "../ui/button";
import Badge from "../ui/badge";
import SetRow from "./SetRow";
import DetailModal from "../library/DetailModal";
import SlideToConfirm from "../shared/SlideToConfirm";
import ExerciseThumbnail from "../analytics/ExerciseThumbnail";
import { api } from "../../services/api";
import { getExerciseImageUrl } from "../../utils/cloudinary";
import {
  getEffectiveWeightKg,
  getWeightBasisLabel,
  getWeightUnitLabel,
  normalizeWeightBasis,
} from "../../utils/weightConfig";

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
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className="fixed inset-0 z-[90] flex items-end bg-black/55 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: reduceMotion ? 0 : 0.22,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="w-full rounded-t-3xl border border-red-500/20 bg-[color:var(--card)] p-4 text-[color:var(--text)] shadow-2xl sm:max-w-md sm:rounded-3xl"
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[color:var(--border)] sm:hidden" />
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-red-500/10 text-red-600">
            <Trash2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
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
      </motion.div>
    </motion.div>
  );
}

DeleteExerciseSheet.propTypes = {
  exerciseName: PropTypes.string.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default function ExerciseCard({
  exercise,
  readOnly = false,
  open = false,
  onToggleOpen,
  onAddSet,
  onUpdateEntry,
  onToggleEntry,
  onRemoveSet,
  onRemoveExercise,
  onSeriesTypeChange = () => {},
  onMovementModeChange = () => {},
  onSetupNoteChange = () => {},
  onWeightConfigChange = () => {},
  onViewTracking = null,
  onSwapVariant = null,
  onStartNow = null,
}) {
  const reduceMotion = useReducedMotion();
  const [showOptions, setShowOptions] = useState(false);
  const [deleteSheetOpen, setDeleteSheetOpen] = useState(false);
  const [detailExercise, setDetailExercise] = useState(null);
  const currentImageSrc = getExerciseImageUrl(exercise, {
    preset: "thumbnail",
  });
  const [fetchedImage, setFetchedImage] = useState({
    exerciseId: "",
    src: "",
  });
  const imageSrc =
    currentImageSrc ||
    (fetchedImage.exerciseId === exercise.id ? fetchedImage.src : "");
  const seriesValue =
    exercise.seriesType === "triserie"
      ? "triserie"
      : exercise.seriesType === "biserie"
        ? "biserie"
        : "serie";
  const supportsUnilateral = Boolean(exercise.supportsUnilateral);
  const movementMode =
    exercise.movementMode === "unilateral" ? "unilateral" : "bilateral";
  const weightBasis = normalizeWeightBasis(exercise.weightBasis, "total");
  const weightConfig = {
    weightBasis,
    barWeightKg: Number(exercise.barWeightKg || 0),
    implementCount: Math.max(1, Number(exercise.implementCount || 1)),
  };
  const firstEnteredWeight = (exercise.sets || [])
    .flatMap((set) => set.entries || [])
    .map((entry) => entry.kg)
    .find((value) => value !== "" && value !== null && value !== undefined);
  const effectiveWeight = getEffectiveWeightKg(
    firstEnteredWeight,
    weightConfig,
  );
  const hasVariants =
    Array.isArray(exercise.variants) && exercise.variants.length > 1;
  const variantTotal = hasVariants ? exercise.variants.length : 0;
  const variantPosition = hasVariants
    ? ((typeof exercise.variantIndex === "number" ? exercise.variantIndex : 0) %
        variantTotal) +
      1
    : 0;
  const referenceDateLabel = getReferenceDateLabel(exercise);
  const isComplete =
    Array.isArray(exercise.sets) &&
    exercise.sets.length > 0 &&
    exercise.sets.every((set) =>
      Array.isArray(set.entries) && set.entries.length
        ? set.entries.every((entry) => entry.done)
        : Boolean(set.done),
    );
  const actionLabel = exercise.isActive ? "En curso" : "Empezar";
  const ActionIcon = exercise.isActive ? Activity : Play;

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

  const handleOpenDetails = async () => {
    setDetailExercise(exercise);
    try {
      const fullExercise = await api.getExercise(exercise.id);
      setDetailExercise({
        ...fullExercise,
        ...exercise,
        weightConfig: {
          basis: exercise.weightBasis,
          barWeightKg: exercise.barWeightKg,
          implementCount: exercise.implementCount,
        },
        id: fullExercise._id || fullExercise.id || exercise.id,
      });
    } catch {
      // The session snapshot remains useful if the catalog request fails.
    }
  };

  useEffect(() => {
    if (currentImageSrc) return;
    let cancelled = false;
    (async () => {
      try {
        const full = await api.getExercise(exercise.id);
        const nextImg = getExerciseImageUrl(full, { preset: "thumbnail" });
        if (nextImg && !cancelled) {
          setFetchedImage({ exerciseId: exercise.id, src: nextImg });
        }
      } catch (_e) {
        // ignore image errors
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentImageSrc, exercise.id]);

  return (
    <motion.div
      data-exercise-id={exercise.id}
      className="relative w-full max-w-full overflow-hidden"
      layout
      initial={false}
      whileHover={reduceMotion ? undefined : { y: -2 }}
      drag={!readOnly && onSwapVariant && hasVariants ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      dragMomentum={false}
      dragDirectionLock
      onDragEnd={handleDragEnd}
      style={
        !readOnly && onSwapVariant && hasVariants
          ? { touchAction: "pan-y" }
          : undefined
      }
    >
      <AnimatePresence initial={false}>
        {isComplete && !reduceMotion ? (
          <motion.span
            className="pointer-events-none absolute inset-0 z-20 border-2 border-[#ff5722] dark:border-[#e2ff00]"
            initial={{ opacity: 0.65 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
          />
        ) : null}
      </AnimatePresence>
      <Card className="overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--card)]/90 shadow-lg backdrop-blur dark:rounded-[4px]">
        <div className="flex items-center gap-2 p-3 sm:p-4 hover:bg-[color:var(--bg)]/40 transition-colors">
          <button
            type="button"
            onClick={handleOpenDetails}
            onPointerDown={(event) => event.stopPropagation()}
            className="group relative h-20 w-[76px] shrink-0 overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] focus:outline-none focus:ring-2 focus:ring-[#ff5722] sm:h-24 sm:w-[92px] dark:rounded-[3px] dark:focus:ring-[#e2ff00]"
            aria-label={`Ver técnica de ${exercise.name}`}
            title="Ver técnica"
          >
            <ExerciseThumbnail
              src={imageSrc}
              alt=""
              fallback={(exercise.name || "?").charAt(0).toUpperCase()}
              className="h-full w-full text-base font-black transition-transform group-hover:scale-105"
            />
          </button>
          <button
            type="button"
            onClick={handleToggleOpen}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-lg font-bold leading-tight text-[color:var(--text)]">
                  {exercise.name}
                </p>
                {exercise.isActive && !isComplete && (
                  <Badge variant="active" className="shrink-0">
                    En curso
                  </Badge>
                )}
                <AnimatePresence initial={false}>
                  {isComplete ? (
                    <motion.span
                      initial={
                        reduceMotion
                          ? { opacity: 0 }
                          : { opacity: 0, scale: 0.8, x: -4 }
                      }
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                    >
                      <Badge variant="completed" className="shrink-0">
                        Completado
                      </Badge>
                    </motion.span>
                  ) : null}
                </AnimatePresence>
                {hasVariants && (
                  <span
                    className="inline-flex h-7 shrink-0 items-center gap-1 rounded border border-[#ff5722]/25 bg-[#fff0eb] px-2 text-xs font-black text-[#c52d00] dark:border-[#e2ff00]/25 dark:bg-[#1d2100] dark:text-[#e2ff00]"
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
          {!readOnly && onStartNow && !isComplete && (
            <Button
              size="sm"
              variant={exercise.isActive ? "accentSolid" : "accentOutline"}
              className="hidden shrink-0 rounded-full px-3 disabled:cursor-default sm:inline-flex"
              onClick={exercise.isActive ? undefined : onStartNow}
              disabled={exercise.isActive}
              aria-label={
                exercise.isActive
                  ? `${exercise.name} en curso`
                  : `Empezar ${exercise.name}`
              }
            >
              <ActionIcon className="h-4 w-4" />
              <span>{actionLabel}</span>
            </Button>
          )}
          {!readOnly && onStartNow && !isComplete && (
            <Button
              size="touchIcon"
              variant={exercise.isActive ? "accentSolid" : "accentOutline"}
              className="shrink-0 rounded-full disabled:cursor-default sm:hidden"
              onClick={exercise.isActive ? undefined : onStartNow}
              disabled={exercise.isActive}
              aria-label={
                exercise.isActive
                  ? `${exercise.name} en curso`
                  : `Empezar ${exercise.name}`
              }
            >
              <ActionIcon className="h-4 w-4" />
            </Button>
          )}
          {!readOnly && onStartNow && isComplete && (
            <Button
              size="sm"
              variant="accentSolid"
              className="hidden shrink-0 rounded-full px-3 disabled:cursor-default sm:inline-flex"
              disabled
            >
              Completado
            </Button>
          )}
          {!readOnly && onStartNow && isComplete && (
            <Button
              size="touchIcon"
              variant="accentSolid"
              className="shrink-0 rounded-full disabled:cursor-default sm:hidden"
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
                      variant="outline"
                      className="rounded-full px-4"
                      onClick={onViewTracking}
                    >
                      Seguimiento
                    </Button>
                  </motion.div>
                  {!readOnly ? (
                    <motion.div whileTap={{ scale: 0.97 }}>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`rounded-full px-3 ${
                          showOptions
                            ? "border-[#ff5722] text-[#ff5722] dark:border-[#e2ff00] dark:text-[#e2ff00]"
                            : ""
                        }`}
                        onClick={() => setShowOptions((value) => !value)}
                        title={
                          exercise.setupNote
                            ? "Este ejercicio tiene una configuración guardada"
                            : "Opciones del ejercicio"
                        }
                      >
                        <SlidersHorizontal className="h-4 w-4" />
                        Opciones
                        {exercise.setupNote && (
                          <span
                            className="h-2 w-2 rounded-full bg-[#ff5722] dark:bg-[#e2ff00]"
                            aria-label="Configuración guardada"
                          />
                        )}
                      </Button>
                    </motion.div>
                  ) : null}
                </div>
                {!readOnly ? (
                  <div className="flex items-center gap-2">
                    <Button
                      size="touchIcon"
                      variant="ghost"
                      className="text-red-600"
                      onClick={() => setDeleteSheetOpen(true)}
                      aria-label="Eliminar ejercicio de la sesion"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                ) : null}
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
                        <span className="shrink-0 text-[13px] font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
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
                                  ? "bg-[#ff5722] text-white shadow-sm dark:bg-[#e2ff00] dark:text-black"
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
                          <span className="shrink-0 text-[13px] font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
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
                                    ? "bg-[#ff5722] text-white shadow-sm dark:bg-[#e2ff00] dark:text-black"
                                    : "text-[color:var(--text-muted)]"
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="border-t border-[color:var(--border)] pt-3">
                        <label className="block">
                          <span className="mb-1.5 block text-[13px] font-semibold text-[color:var(--text-muted)]">
                            Cómo registrar el peso
                          </span>
                          <select
                            value={weightBasis}
                            onChange={(event) =>
                              onWeightConfigChange({
                                weightBasis: event.target.value,
                              })
                            }
                            className="h-11 w-full border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-sm font-bold text-[color:var(--text)] outline-none focus:border-[#ff5722] dark:focus:border-[#e2ff00]"
                          >
                            {weightBasis === "legacy" ? (
                              <option value="legacy">
                                Registro anterior (sin conversión)
                              </option>
                            ) : null}
                            <option value="total">Peso total (incluye barra)</option>
                            <option value="per_side">Peso por lado</option>
                            <option value="per_implement">Peso por mancuerna / implemento</option>
                            <option value="machine">Valor indicado por máquina</option>
                            <option value="additional">Carga adicional</option>
                            <option value="assistance">Asistencia indicada</option>
                          </select>
                        </label>
                        {weightBasis === "per_side" ? (
                          <label className="mt-2 block">
                            <span className="mb-1.5 block text-xs font-semibold text-[color:var(--text-muted)]">
                              Peso de la barra
                            </span>
                            <div className="flex h-11 items-center border border-[color:var(--border)] bg-[color:var(--bg)] px-3">
                              <input
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="0.5"
                                value={weightConfig.barWeightKg}
                                onChange={(event) =>
                                  onWeightConfigChange({
                                    barWeightKg: Math.max(
                                      0,
                                      Number(event.target.value || 0),
                                    ),
                                  })
                                }
                                className="min-w-0 flex-1 bg-transparent text-right text-sm font-bold outline-none"
                                aria-label={`Peso de la barra para ${exercise.name}`}
                              />
                              <span className="ml-2 text-xs font-black text-[color:var(--text-muted)]">kg</span>
                            </div>
                          </label>
                        ) : null}
                        {weightBasis === "per_implement" &&
                        movementMode !== "unilateral" ? (
                          <label className="mt-2 block">
                            <span className="mb-1.5 block text-xs font-semibold text-[color:var(--text-muted)]">
                              Cantidad de implementos
                            </span>
                            <select
                              value={weightConfig.implementCount}
                              onChange={(event) =>
                                onWeightConfigChange({
                                  implementCount: Number(event.target.value),
                                })
                              }
                              className="h-11 w-full border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-sm font-bold"
                            >
                              {[1, 2, 3, 4].map((count) => (
                                <option key={count} value={count}>
                                  {count} {count === 1 ? "implemento" : "implementos"}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : null}
                      </div>
                      <label className="block border-t border-[color:var(--border)] pt-3">
                        <span className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold text-[color:var(--text-muted)]">
                          <Settings2 className="h-3.5 w-3.5" />
                          Ajuste / configuración
                        </span>
                        <input
                          type="text"
                          value={exercise.setupNote || ""}
                          onChange={(event) =>
                            onSetupNoteChange(event.target.value)
                          }
                          maxLength={240}
                          enterKeyHint="done"
                          autoComplete="off"
                          placeholder="Ej. asiento 3 · respaldo 5 · altura 9"
                          className="h-11 w-full min-w-0 rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-sm text-[color:var(--text)] outline-none transition placeholder:text-[color:var(--text-muted)] focus:border-[#ff5722] focus:ring-2 focus:ring-[#ff5722]/15 dark:rounded-[3px] dark:focus:border-[#e2ff00] dark:focus:ring-[#e2ff00]/15"
                          aria-label={`Ajuste de ${exercise.name}`}
                        />
                      </label>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2 px-2 pb-3 sm:px-3">
                <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs font-bold text-[color:var(--text-muted)]">
                  <span>{getWeightBasisLabel(weightConfig)}</span>
                  {firstEnteredWeight !== undefined &&
                  ["per_side", "per_implement"].includes(weightBasis) ? (
                    <span className="text-[#c52d00] dark:text-[#e2ff00]">
                      Carga efectiva: {effectiveWeight} kg
                    </span>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {exercise.sets.map((set, idx) => (
                      <SetRow
                        key={set.id}
                        setId={set.id}
                        readOnly={readOnly}
                        index={idx + 1}
                        exerciseName={exercise.name}
                        seriesType={seriesValue}
                        entries={set.entries}
                        prSummary={set.prSummary}
                        prBranchLabel={set.prBranchLabel}
                        weightUnitLabel={getWeightUnitLabel(weightConfig)}
                        onChangeEntry={(entryId, field, value) =>
                          onUpdateEntry(set.id, entryId, field, value)
                        }
                        onToggleEntry={(entryId) =>
                          onToggleEntry(set.id, entryId)
                        }
                        onRemove={
                          readOnly ? undefined : () => onRemoveSet(set.id)
                        }
                      />
                    ))}
                  </AnimatePresence>
                </div>
                {!readOnly ? (
                  <motion.div whileTap={{ scale: 0.97 }}>
                    <Button
                      variant="outline"
                      className="w-full rounded-xl border-dashed border-[color:var(--border)] text-[color:var(--text)]"
                      onClick={onAddSet}
                    >
                      + Agregar serie
                    </Button>
                  </motion.div>
                ) : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
      {deleteSheetOpen && typeof document !== "undefined"
        ? createPortal(
            <DeleteExerciseSheet
              exerciseName={exercise.name}
              onClose={() => setDeleteSheetOpen(false)}
              onConfirm={() => {
                setDeleteSheetOpen(false);
                onRemoveExercise?.();
              }}
            />,
            document.body,
          )
        : null}
      {detailExercise && typeof document !== "undefined"
        ? createPortal(
            <DetailModal
              exercise={detailExercise}
              canManage={false}
              recordingContext
              onClose={() => setDetailExercise(null)}
            />,
            document.body,
          )
        : null}
    </motion.div>
  );
}

ExerciseCard.propTypes = {
  readOnly: PropTypes.bool,
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
    setupNote: PropTypes.string,
    weightBasis: PropTypes.oneOf([
      "legacy",
      "total",
      "per_side",
      "per_implement",
      "machine",
      "additional",
      "assistance",
    ]),
    barWeightKg: PropTypes.number,
    implementCount: PropTypes.number,
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
  onSetupNoteChange: PropTypes.func,
  onWeightConfigChange: PropTypes.func,
  onViewTracking: PropTypes.func,
  onSwapVariant: PropTypes.func,
  onStartNow: PropTypes.func,
};
