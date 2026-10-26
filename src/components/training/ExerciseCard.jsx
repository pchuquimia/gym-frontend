import PropTypes from "prop-types";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown, Repeat2, Settings2, Trash2 } from "lucide-react";
import Card from "../ui/card";
import Button from "../ui/button";
import SetRow from "./SetRow";
import DetailModal from "../library/DetailModal";
import ExerciseThumbnail from "../analytics/ExerciseThumbnail";
import { api } from "../../services/api";
import { getExerciseImageUrl } from "../../utils/cloudinary";
import { parseLocalCalendarDate } from "../../utils/localCalendarDate";
import { getWeightUnitLabel } from "../../utils/weightConfig";

const LONG_PRESS_MS = 650;
const MOVE_TOLERANCE_PX = 10;

const formatShortDate = (value) => {
  const parsed = parseLocalCalendarDate(value);
  if (!parsed) return "";
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
    .map((date) => ({
      raw: date,
      time: parseLocalCalendarDate(date)?.getTime() ?? Number.NaN,
    }))
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

function ExerciseOptionSwitch({ label, value, options, onChange }) {
  const switchId = useId();
  const reduceMotion = useReducedMotion();
  return (
    <div className="training-exercise-card__switch-setting">
      <div
        className="training-exercise-card__switch"
        role="group"
        aria-label={label}
      >
        {options.map(([key, text, accessibleName]) => (
          <button
            key={key}
            type="button"
            aria-label={accessibleName || text}
            title={accessibleName || text}
            aria-pressed={value === key}
            onClick={() => onChange(key)}
          >
            {value === key && (
              <motion.span
                className="training-exercise-card__switch-selection"
                layoutId={switchId}
                initial={false}
                transition={{ duration: reduceMotion ? 0 : 0.18 }}
                aria-hidden="true"
              />
            )}
            <span>{text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
ExerciseOptionSwitch.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.string)).isRequired,
  onChange: PropTypes.func.isRequired,
};

function DeleteExerciseSheet({ exerciseName, onConfirm, onClose }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className="fixed inset-0 z-[95] flex items-end bg-black/55 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <button
        type="button"
        className="absolute inset-0"
        onClick={onClose}
        aria-label="Cancelar eliminacion de ejercicio"
      />
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-exercise-title"
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: reduceMotion ? 0 : 0.22,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="relative w-full rounded-t-3xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-[color:var(--text)] shadow-2xl sm:max-w-sm sm:rounded-2xl sm:pb-4"
      >
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-[color:var(--border)] sm:hidden" />
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-red-500/10 text-red-600">
            <Trash2 className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase text-red-600">
              Eliminar ejercicio
            </p>
            <h3
              id="delete-exercise-title"
              className="mt-1 truncate text-xl font-black"
            >
              {exerciseName}
            </h3>
            <p className="mt-1 text-sm font-semibold text-[color:var(--text-muted)]">
              Se eliminarán sus series, pesos y repeticiones de esta sesión.
            </p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            className="h-12 rounded-xl border border-[color:var(--border)] font-black text-[color:var(--text)]"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="h-12 rounded-xl bg-red-600 font-black text-white hover:bg-red-700"
            onClick={onConfirm}
          >
            Eliminar
          </button>
        </div>
      </motion.section>
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
  onViewTracking = null,
  onSwapVariant = null,
  onActivate = null,
}) {
  const reduceMotion = useReducedMotion();
  const [showOptions, setShowOptions] = useState(false);
  const optionsPanelId = useId();
  const [deleteSheetOpen, setDeleteSheetOpen] = useState(false);
  const [isHoldingExercise, setIsHoldingExercise] = useState(false);
  const exerciseHoldTimerRef = useRef(null);
  const exerciseHoldStartRef = useRef({ x: 0, y: 0 });
  const exerciseHoldTriggeredRef = useRef(false);
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
  const hasVariants =
    Array.isArray(exercise.variants) && exercise.variants.length > 1;
  const variantTotal = hasVariants ? exercise.variants.length : 0;
  const variantPosition = hasVariants
    ? ((typeof exercise.variantIndex === "number" ? exercise.variantIndex : 0) %
        variantTotal) +
      1
    : 0;
  const referenceDateLabel = getReferenceDateLabel(exercise);
  const storedHistoryDateLabel = formatShortDate(
    exercise.storedHistoryLastDate,
  );
  const historyDateLabel = referenceDateLabel || storedHistoryDateLabel;
  const hasStoredHistory = Boolean(
    referenceDateLabel || exercise.hasStoredHistory,
  );
  const showHistory = Boolean(
    open && hasStoredHistory && (onViewTracking || historyDateLabel),
  );
  const setupNote = String(exercise.setupNote || "").trim();
  const weightUnitLabel = getWeightUnitLabel(exercise);
  const isComplete =
    Array.isArray(exercise.sets) &&
    exercise.sets.length > 0 &&
    exercise.sets.every((set) =>
      Array.isArray(set.entries) && set.entries.length
        ? set.entries.every((entry) => entry.done)
        : Boolean(set.done),
    );
  const handleDragEnd = (_, info) => {
    if (!onSwapVariant || !hasVariants) return;
    const offsetX = info.offset?.x ?? 0;
    const velocityX = info.velocity?.x ?? 0;
    if (offsetX > 70 || velocityX > 700) onSwapVariant(1);
    if (offsetX < -70 || velocityX < -700) onSwapVariant(-1);
  };

  const clearExerciseLongPress = () => {
    if (exerciseHoldTimerRef.current) {
      window.clearTimeout(exerciseHoldTimerRef.current);
      exerciseHoldTimerRef.current = null;
    }
    setIsHoldingExercise(false);
  };

  const handleExercisePointerDown = (event) => {
    if (readOnly || !onRemoveExercise || event.button !== 0) return;
    clearExerciseLongPress();
    exerciseHoldTriggeredRef.current = false;
    exerciseHoldStartRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
    setIsHoldingExercise(true);
    exerciseHoldTimerRef.current = window.setTimeout(() => {
      exerciseHoldTimerRef.current = null;
      exerciseHoldTriggeredRef.current = true;
      setIsHoldingExercise(false);
      if (typeof navigator.vibrate === "function") navigator.vibrate(35);
      setDeleteSheetOpen(true);
    }, LONG_PRESS_MS);
  };

  const handleExercisePointerMove = (event) => {
    if (!exerciseHoldTimerRef.current) return;
    const deltaX = Math.abs(event.clientX - exerciseHoldStartRef.current.x);
    const deltaY = Math.abs(event.clientY - exerciseHoldStartRef.current.y);
    if (deltaX > MOVE_TOLERANCE_PX || deltaY > MOVE_TOLERANCE_PX) {
      clearExerciseLongPress();
    }
  };

  const handleToggleOpen = (event) => {
    if (exerciseHoldTriggeredRef.current) {
      event?.preventDefault();
      exerciseHoldTriggeredRef.current = false;
      return;
    }
    if (open) {
      setShowOptions(false);
    } else if (!readOnly && !isComplete) {
      onActivate?.();
    }
    onToggleOpen?.();
  };

  useEffect(
    () => () => {
      if (exerciseHoldTimerRef.current) {
        window.clearTimeout(exerciseHoldTimerRef.current);
      }
    },
    [],
  );

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

  const optionsButton =
    open && !readOnly ? (
      <button
        type="button"
        onClick={() => setShowOptions((value) => !value)}
        className="training-exercise-card__options"
        aria-label={`Opciones de ${exercise.name}`}
        aria-expanded={showOptions}
        aria-controls={optionsPanelId}
        title="Opciones"
      >
        Opciones
        <ChevronDown
          size={12}
          className={showOptions ? "rotate-180" : ""}
          aria-hidden="true"
        />
      </button>
    ) : null;

  return (
    <motion.div
      data-exercise-id={exercise.id}
      aria-current={exercise.isActive && !isComplete ? "step" : undefined}
      className={`training-exercise-card relative w-full max-w-full overflow-hidden transition-shadow ${
        isHoldingExercise
          ? "ring-2 ring-[#181918]/45 dark:ring-[#e2ff00]/45"
          : ""
      }`}
      layout="position"
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
      <AnimatePresence>
        {isHoldingExercise ? (
          <motion.span
            className="pointer-events-none absolute inset-x-1 top-0 z-30 h-0.5 origin-left bg-[#181918] dark:bg-[#e2ff00]"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: LONG_PRESS_MS / 1000, ease: "linear" }}
          />
        ) : null}
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {isComplete && !reduceMotion ? (
          <motion.span
            className="pointer-events-none absolute inset-0 z-20 border-2 border-[#181918] dark:border-[#e2ff00]"
            initial={{ opacity: 0.65 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
          />
        ) : null}
      </AnimatePresence>
      <Card
        className={`training-exercise-card__surface ${open ? "is-open" : ""} ${exercise.isActive && !isComplete ? "is-active" : ""} ${isComplete ? "is-complete" : ""} overflow-hidden rounded-lg border bg-[color:var(--card)]/90 backdrop-blur transition-[border-color,box-shadow] dark:rounded-[4px] ${
          exercise.isActive && !isComplete
            ? "border-[#181918]/65 shadow-[0_8px_24px_rgba(24,25,24,0.12)] dark:border-[#e2ff00]/55 dark:shadow-[0_8px_26px_rgba(226,255,0,0.08)]"
            : "border-[color:var(--border)] shadow-lg"
        }`}
      >
        <div className="training-exercise-card__summary relative z-30 gap-2 p-3 transition-colors hover:bg-[color:var(--bg)]/40 sm:p-4">
          <button
            type="button"
            onClick={handleOpenDetails}
            onPointerDown={(event) => event.stopPropagation()}
            className="training-exercise-card__thumbnail group relative h-20 w-[76px] shrink-0 overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] focus:outline-none focus:ring-2 focus:ring-[#181918] sm:h-24 sm:w-[92px] dark:rounded-[3px] dark:focus:ring-[#e2ff00]"
            aria-label={`Ver técnica de ${exercise.name}`}
            title="Ver técnica"
          >
            <ExerciseThumbnail
              src={imageSrc}
              alt=""
              fallback={(exercise.name || "?").charAt(0).toUpperCase()}
              className="absolute inset-0 h-full w-full text-base font-black transition-transform group-hover:scale-105"
            />
            {exercise.isExtra && (
              <span className="training-exercise-card__extra-label">Extra</span>
            )}
          </button>
          <div className="training-exercise-card__body">
            <button
              type="button"
              onClick={handleToggleOpen}
              onPointerDown={handleExercisePointerDown}
              onPointerMove={handleExercisePointerMove}
              onPointerUp={clearExerciseLongPress}
              onPointerCancel={clearExerciseLongPress}
              onPointerLeave={clearExerciseLongPress}
              onContextMenu={(event) => {
                if (!readOnly && onRemoveExercise) event.preventDefault();
              }}
              className="training-exercise-card__heading min-w-0 w-full text-left"
              aria-label={`${open ? "Contraer" : "Expandir"} ${exercise.name}`}
              aria-expanded={open}
            >
              <p
                className={`training-exercise-card__title ${open ? "" : "line-clamp-2"} min-w-0 text-lg font-bold leading-tight text-[color:var(--text)]`}
              >
                {exercise.name}
              </p>
            </button>
            {(hasVariants ||
              (open && hasStoredHistory) ||
              setupNote ||
              isComplete ||
              exercise.isActive ||
              optionsButton) && (
              <div className="training-exercise-card__info min-w-0">
                <div className="training-exercise-card__metadata-row">
                  {showHistory &&
                    (onViewTracking ? (
                      <button
                        type="button"
                        onClick={onViewTracking}
                        className="training-exercise-card__meta group flex min-w-0 items-start gap-1.5 text-left text-xs font-medium text-[color:var(--text-muted)] transition-colors hover:text-[color:var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
                        aria-label={`Ver historial de ${exercise.name}`}
                      >
                        <span>{`Última vez${historyDateLabel ? `: ${historyDateLabel}` : ""}${referenceDateLabel && exercise.referenceSourceText ? ` · ${exercise.referenceSourceText}` : !referenceDateLabel ? " · Otra rutina" : ""}`}</span>
                      </button>
                    ) : historyDateLabel ? (
                      <p className="training-exercise-card__meta text-xs font-medium text-[color:var(--text-muted)]">
                        Última vez: {historyDateLabel}
                      </p>
                    ) : null)}
                  {(hasVariants ||
                    isComplete ||
                    (exercise.isActive && !isComplete)) && (
                    <div className="flex flex-wrap items-center gap-2">
                      {exercise.isActive && !isComplete && (
                        <span className="training-exercise-card__status">
                          <span aria-hidden="true" />
                          En curso
                        </span>
                      )}
                      {isComplete && (
                        <span
                          className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--text-muted)]"
                          aria-label="Completado"
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          Completado
                        </span>
                      )}
                      {hasVariants && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-[color:var(--text-muted)]"
                          title="Variante actual"
                        >
                          <Repeat2 className="h-3 w-3" aria-hidden="true" />
                          {variantPosition}/{variantTotal}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {optionsButton}
                {setupNote && (
                  <div
                    className="training-exercise-card__setup flex min-w-0 items-start gap-1.5 text-xs text-[color:var(--text-muted)]"
                    title={`Ajuste: ${setupNote}`}
                  >
                    <Settings2
                      className="mt-0.5 h-3.5 w-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span className={`min-w-0 ${open ? "" : "truncate"}`}>
                      <strong>Ajuste:</strong> {setupNote}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          <div
            className="training-exercise-card__actions"
            role="group"
            aria-label={`Controles de ${exercise.name}`}
          >
            <button
              type="button"
              onClick={handleToggleOpen}
              className="training-exercise-card__disclosure grid h-11 w-11 shrink-0 place-items-center text-[color:var(--text-muted)]"
              aria-label={`${open ? "Contraer" : "Expandir"} ${exercise.name}`}
              aria-expanded={open}
            >
              <ChevronDown
                className={`h-5 w-5 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.18 }}
              className="training-exercise-card__expanded relative flex flex-col border-t border-[color:var(--border)] bg-[color:var(--bg)]/70"
            >
              <div className="training-exercise-card__sets order-1 space-y-2 px-2 py-3 sm:px-3">
                <AnimatePresence initial={false}>
                  {showOptions && !readOnly && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                      id={optionsPanelId}
                    >
                      <div className="training-exercise-card__settings">
                        <div className="training-exercise-card__switches">
                          <ExerciseOptionSwitch
                            label="Formato"
                            value={seriesValue}
                            options={[
                              ["serie", "Normal"],
                              ["biserie", "Bi", "Biserie"],
                              ["triserie", "Tri", "Triserie"],
                            ]}
                            onChange={onSeriesTypeChange}
                          />
                          {supportsUnilateral && (
                            <ExerciseOptionSwitch
                              label="Ejecución"
                              value={movementMode}
                              options={[
                                ["bilateral", "Bilateral"],
                                ["unilateral", "Unilateral"],
                              ]}
                              onChange={onMovementModeChange}
                            />
                          )}
                        </div>
                        <label
                          className="training-exercise-card__setting"
                          title="Ajuste del equipo"
                        >
                          <span>Ajuste del equipo</span>
                          <input
                            type="text"
                            value={exercise.setupNote || ""}
                            onChange={(event) =>
                              onSetupNoteChange(event.target.value)
                            }
                            maxLength={240}
                            enterKeyHint="done"
                            autoComplete="off"
                            placeholder="Ej. asiento 3"
                            aria-label={`Ajuste de ${exercise.name}`}
                          />
                        </label>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div
                  className="training-exercise-card__set-table-header"
                  aria-hidden="true"
                >
                  <span>Serie</span>
                  <span>Anterior</span>
                  <span>Kg</span>
                  <span>Reps</span>
                  <span>Listo</span>
                </div>

                <div className="training-exercise-card__set-list space-y-2">
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
                        weightUnitLabel={weightUnitLabel}
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
                      className="training-exercise-card__add-set w-full rounded-xl border-dashed border-[color:var(--border)] text-[color:var(--text)]"
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
    referenceSourceText: PropTypes.string,
    hasStoredHistory: PropTypes.bool,
    storedHistoryLastDate: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.instanceOf(Date),
    ]),
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
    isExtra: PropTypes.bool,
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
  onViewTracking: PropTypes.func,
  onSwapVariant: PropTypes.func,
  onActivate: PropTypes.func,
};
