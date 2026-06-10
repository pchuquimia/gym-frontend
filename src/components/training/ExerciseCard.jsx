import PropTypes from "prop-types";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Play, Trash2 } from "lucide-react";
import Card from "../ui/card";
import Button from "../ui/button";
import Badge from "../ui/badge";
import SetRow from "./SetRow";
import { api } from "../../services/api";
import { getExerciseImageUrl } from "../../utils/cloudinary";

const formatDuration = (sec = 0) => {
  const total = Math.max(0, Math.floor(sec));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return [hours, minutes, seconds]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
};

export default function ExerciseCard({
  exercise,
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
  const [open, setOpen] = useState(false);
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
  const seriesLabel =
    seriesValue === "triserie"
      ? "Triserie"
      : seriesValue === "biserie"
        ? "Biserie"
        : "Serie";
  const seriesLabelLower = seriesLabel.toLowerCase();
  const supportsUnilateral = Boolean(exercise.supportsUnilateral);
  const movementMode =
    exercise.movementMode === "unilateral" ? "unilateral" : "bilateral";
  const hasVariants =
    Array.isArray(exercise.variants) && exercise.variants.length > 1;
  const variantIndex =
    typeof exercise.variantIndex === "number" ? exercise.variantIndex : 0;
  const variantLabel = hasVariants
    ? `Alternativa ${variantIndex + 1}/${exercise.variants.length}`
    : "";
  const referenceText = exercise.prText?.startsWith("PR:")
    ? exercise.prText.replace("PR:", "Referencia:")
    : exercise.prText || "Sin referencia aquí";
  const isMoved =
    exercise.orderContext === "early" || exercise.orderContext === "fatigued";
  const isExtra = exercise.orderContext === "extra" || exercise.isExtra;
  const isComplete =
    Array.isArray(exercise.sets) &&
    exercise.sets.length > 0 &&
    exercise.sets.every((set) =>
      Array.isArray(set.entries) && set.entries.length
        ? set.entries.every((entry) => entry.done)
        : Boolean(set.done),
    );
  const durationLabel = exercise.durationSeconds
    ? formatDuration(exercise.durationSeconds)
    : "";
  const statusLabel = exercise.isActive && !isComplete
    ? `En curso${durationLabel ? ` · ${durationLabel}` : ""}`
    : durationLabel;
  const _displayStatusLabel =
    statusLabel ||
    (isComplete
      ? `Completado${durationLabel ? ` · ${durationLabel}` : ""}`
      : "");
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
            onClick={() => setOpen((v) => !v)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            {imageSrc ? (
              <div className="h-12 w-12 shrink-0 rounded-xl overflow-hidden bg-[color:var(--bg)] border border-[color:var(--border)]">
                <img
                  src={imageSrc}
                  alt={exercise.name}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="h-12 w-12 shrink-0 rounded-xl bg-[color:var(--bg)] border border-[color:var(--border)]" />
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
              </div>
              <p className="mt-0.5 truncate text-xs text-[color:var(--text-muted)]">
                {exercise.muscle || "Sin grupo"} · {referenceText}
                {statusLabel ? ` · ${statusLabel}` : ""}
              </p>
              {exercise.globalPrText && (
                <p className="mt-0.5 truncate text-[11px] text-[color:var(--text-muted)]">
                  {exercise.globalPrText}
                </p>
              )}
              <div className="mt-2 flex items-center gap-2 text-xs text-[color:var(--text-muted)] flex-wrap">
                <Badge
                  variant="secondary"
                  className="uppercase tracking-wide text-[10px]"
                >
                  {seriesLabel}
                </Badge>
                {variantLabel && (
                  <Badge className="text-[10px]">{variantLabel}</Badge>
                )}
                {supportsUnilateral && (
                  <Badge className="text-[10px]">
                    {movementMode === "unilateral" ? "Unilateral" : "Bilateral"}
                  </Badge>
                )}
                {isMoved && <Badge className="text-[10px]">Movido</Badge>}
                {isExtra && <Badge className="text-[10px]">Extra</Badge>}
              </div>
              {hasVariants && (
                <p className="text-[10px] text-[color:var(--text-muted)] mt-1">
                  Desliza para cambiar ejercicio
                </p>
              )}
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
              aria-label="Empezar este ejercicio ahora"
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
              aria-label="Empezar este ejercicio ahora"
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
              <div className="flex flex-wrap items-center gap-5 px-4 pt-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-muted)] font-semibold">
                    Tipo de serie
                  </p>
                  <select
                    value={seriesValue}
                    onChange={(e) => onSeriesTypeChange(e.target.value)}
                    className="mt-1 rounded-full border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-1.5 text-xs text-[color:var(--text)] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="serie">Serie</option>
                    <option value="biserie">Biserie</option>
                    <option value="triserie">Triserie</option>
                  </select>
                </div>
                {supportsUnilateral && (
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-muted)] font-semibold text-align-left">
                      Modo
                    </p>
                    <select
                      value={movementMode}
                      onChange={(e) => onMovementModeChange(e.target.value)}
                      className="mt-1 rounded-full border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-1.5 text-xs text-[color:var(--text)] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    >
                      <option value="bilateral">Bilateral</option>
                      <option value="unilateral">Unilateral</option>
                    </select>
                  </div>
                )}
              </div>
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
                  <motion.div whileTap={{ scale: 0.97 }}></motion.div>
                </div>
                <div className="flex items-center gap-2">
                  {onStartNow && (
                    <Button
                      size="sm"
                      variant="outline"
                      className={`rounded-full px-3 ${actionClass}`}
                      onClick={onStartNow}
                      aria-label="Empezar este ejercicio ahora"
                      disabled={isComplete}
                    >
                      <Play className="h-4 w-4" />
                      <span>{isComplete ? "Completado" : actionLabel}</span>
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-red-600"
                    onClick={onRemoveExercise}
                    aria-label="Eliminar ejercicio de la sesion"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <div className="px-3 pb-3 space-y-2">
                <div className="flex items-center justify-between px-2">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-muted)] font-semibold">
                    Set de {seriesLabelLower}
                  </span>
                  <span className="text-[11px] text-[color:var(--text-muted)]">
                    {exercise.sets.length} sets
                  </span>
                </div>
                <div className="grid grid-cols-[48px,1fr,1fr,60px,40px] text-[11px] text-[color:var(--text-muted)] px-2">
                  <span>#</span>
                  <span>Previo</span>
                  <span>Kg</span>
                  <span className="text-center">Reps</span>
                  <span className="text-right">Done</span>
                </div>
                <div className="space-y-2">
                  <AnimatePresence>
                    {exercise.sets.map((set, idx) => (
                      <SetRow
                        key={set.id}
                        index={idx + 1}
                        seriesType={seriesValue}
                        entries={set.entries}
                        prSummary={set.prSummary}
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
                    + Anadir set a la {seriesLabelLower}
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
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
