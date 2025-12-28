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
  onUpdateSet,
  onToggleDone,
  onRemoveSet,
  onRemoveExercise,
  onViewHistory = null,
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
    <motion.div layout whileHover={{ y: -2 }}>
      <Card className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center gap-3 p-4 text-left"
        >
          {imageSrc ? (
            <div className="h-12 w-12 rounded-xl overflow-hidden bg-slate-100">
              <img src={imageSrc} alt={exercise.name} className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="h-12 w-12 rounded-xl bg-slate-100" />
          )}
          <div className="flex-1">
            <p className="text-sm font-semibold text-[color:var(--text)]">{exercise.name}</p>
            <div className="flex items-center gap-2 text-xs text-[color:var(--text-muted)]">
              <Badge variant="secondary">{exercise.prText || "Sin referencia"}</Badge>
            </div>
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
              className="border-t border-[color:var(--border)] bg-[color:var(--bg)]"
            >
              <div className="flex items-center justify-between px-4 py-3 gap-2">
                <div className="flex gap-2 flex-wrap">
                  <motion.div whileTap={{ scale: 0.97 }}>
                    <Button size="sm" onClick={onAddSet}>
                      Iniciar serie
                    </Button>
                  </motion.div>
                  <motion.div whileTap={{ scale: 0.97 }}>
              <Button
                size="sm"
                variant="outline"
                className="border-[color:var(--border)] text-[color:var(--text)]"
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
                  aria-label="Eliminar ejercicio de la sesión"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>

              <div className="px-3 pb-3 space-y-2">
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
                        previousText={set.previousText}
                        kg={set.kg}
                        reps={set.reps}
                        done={set.done}
                        onChangeKg={(value) => onUpdateSet(set.id, "kg", value)}
                        onChangeReps={(value) => onUpdateSet(set.id, "reps", value)}
                        onToggleDone={() => onToggleDone(set.id)}
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
                    + Añadir set
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
    image: PropTypes.string,
    imagePublicId: PropTypes.string,
    sets: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        previousText: PropTypes.string.isRequired,
        kg: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        reps: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        done: PropTypes.bool.isRequired,
      })
    ).isRequired,
  }).isRequired,
  onAddSet: PropTypes.func.isRequired,
  onUpdateSet: PropTypes.func.isRequired,
  onToggleDone: PropTypes.func.isRequired,
  onRemoveSet: PropTypes.func.isRequired,
  onRemoveExercise: PropTypes.func.isRequired,
  onViewHistory: PropTypes.func,
};
