import PropTypes from "prop-types";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Trash2 } from "lucide-react";
import Card from "../ui/card";
import Button from "../ui/button";
import Badge from "../ui/badge";
import SetRow from "./SetRow";
import { api } from "../../services/api";
import { getExerciseImageUrl } from "../../utils/cloudinary";

export default function ExerciseCard({
  exercise,
  onAddSet,
  onUpdateEntry,
  onToggleEntry,
  onRemoveSet,
  onRemoveExercise,
  onSeriesTypeChange = () => {},
  onViewTracking = null,
  onViewHistory = null,
  onSwapVariant = null,
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
  const hasVariants =
    Array.isArray(exercise.variants) && exercise.variants.length > 1;
  const variantIndex =
    typeof exercise.variantIndex === "number" ? exercise.variantIndex : 0;
  const variantLabel = hasVariants
    ? `Alternativa ${variantIndex + 1}/${exercise.variants.length}`
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
      } catch (e) {
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
      style={onSwapVariant && hasVariants ? { touchAction: "pan-y" } : undefined}
    >
      <Card className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)]/90 shadow-lg backdrop-blur overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-[color:var(--bg)]/40 transition-colors"
        >
          {imageSrc ? (
            <div className="h-12 w-12 rounded-xl overflow-hidden bg-[color:var(--bg)] border border-[color:var(--border)]">
              <img
                src={imageSrc}
                alt={exercise.name}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="h-12 w-12 rounded-xl bg-[color:var(--bg)] border border-[color:var(--border)]" />
          )}
          <div className="flex-1">
            <p className="text-sm font-semibold text-[color:var(--text)]">
              {exercise.name}
            </p>
            <div className="flex items-center gap-2 text-xs text-[color:var(--text-muted)] flex-wrap">
              <Badge
                variant="secondary"
                className="uppercase tracking-wide text-[10px]"
              >
                {seriesLabel}
              </Badge>
              {variantLabel && (
                <Badge className="text-[10px]">{variantLabel}</Badge>
              )}
              <Badge>{exercise.prText || "Sin referencia"}</Badge>
            </div>
            {hasVariants && (
              <p className="text-[10px] text-[color:var(--text-muted)] mt-1">
                Desliza para cambiar ejercicio
              </p>
            )}
          </div>
          <ChevronDown
            className={`h-5 w-5 text-[color:var(--text-muted)] transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-[color:var(--border)] bg-[color:var(--bg)]/70"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-muted)] font-semibold">
                  Tipo de serie
                </p>
                <select
                  value={seriesValue}
                  onChange={(e) => onSeriesTypeChange(e.target.value)}
                  className="rounded-full border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-1.5 text-xs text-[color:var(--text)] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="serie">Serie</option>
                  <option value="biserie">Biserie</option>
                  <option value="triserie">Triserie</option>
                </select>
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
                  <motion.div whileTap={{ scale: 0.97 }}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full px-4 border-[color:var(--border)] text-[color:var(--text)]"
                      onClick={onViewHistory}
                    >
                      Historial
                    </Button>
                  </motion.div>
                </div>
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
    seriesType: PropTypes.oneOf(["serie", "biserie", "triserie"]),
    variantIndex: PropTypes.number,
    variants: PropTypes.arrayOf(
      PropTypes.shape({
        exerciseId: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        muscle: PropTypes.string,
        image: PropTypes.string,
        imagePublicId: PropTypes.string,
      })
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
          })
        ),
      })
    ).isRequired,
  }).isRequired,
  onAddSet: PropTypes.func.isRequired,
  onUpdateEntry: PropTypes.func.isRequired,
  onToggleEntry: PropTypes.func.isRequired,
  onRemoveSet: PropTypes.func.isRequired,
  onRemoveExercise: PropTypes.func.isRequired,
  onSeriesTypeChange: PropTypes.func,
  onViewTracking: PropTypes.func,
  onViewHistory: PropTypes.func,
  onSwapVariant: PropTypes.func,
};
