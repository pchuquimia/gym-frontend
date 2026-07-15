import { useEffect, useRef, useState } from "react";
import { ChevronRight, ImageIcon } from "lucide-react";
import { api } from "../../services/api";
import { getExerciseImageUrl } from "../../utils/cloudinary";
import {
  formatList,
  getExerciseCategories,
  getExerciseEquipment,
  getExerciseMovementPatterns,
  getPrimaryMuscleGroup,
} from "../../constants/exerciseTaxonomy";

function ExerciseCard({ exercise, onView }) {
  const [imageSrc, setImageSrc] = useState(() =>
    getExerciseImageUrl(exercise, { width: 180, height: 180 }),
  );
  const cardRef = useRef(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (imageSrc || loadedRef.current) return;
    const observer = new IntersectionObserver(
      async (entries) => {
        if (!entries[0]?.isIntersecting) return;
        loadedRef.current = true;
        try {
          const full = await api.getExercise(exercise.id || exercise._id);
          const nextImg = getExerciseImageUrl(full, {
            width: 180,
            height: 180,
          });
          if (nextImg) setImageSrc(nextImg);
        } catch {
          // ignore lazy image errors
        }
        observer.disconnect();
      },
      { rootMargin: "200px" },
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [exercise.id, exercise._id, imageSrc]);

  const sourceLabel = exercise.type === "system" ? "Catalogo" : "Personal";
  const muscle = getPrimaryMuscleGroup(exercise) || "Sin grupo";
  const category = getExerciseCategories(exercise)[0] || sourceLabel;
  const pattern = getExerciseMovementPatterns(exercise)[0] || "Sin patrón";
  const equipment = formatList(getExerciseEquipment(exercise), "Sin equipo");

  return (
    <button
      type="button"
      ref={cardRef}
      onClick={() => onView(exercise)}
      className="grid w-full grid-cols-[64px_minmax(0,1fr)_24px] items-center gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-3 text-left shadow-sm transition hover:border-blue-300/50 hover:shadow-md"
    >
      <div className="h-16 w-16 overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)]">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={exercise.name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-[color:var(--text-muted)]">
            <ImageIcon className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="min-w-0 space-y-1.5">
        <h3 className="truncate text-base font-black leading-tight text-[color:var(--text)]">
          {exercise.name}
        </h3>
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 rounded-md bg-emerald-500/10 px-2 py-1 text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-300">
            {muscle}
          </span>
          <span className="truncate text-sm font-semibold text-[color:var(--text-muted)]">
            {category}
          </span>
        </div>
        <p className="truncate text-xs font-semibold text-[color:var(--text-muted)]">
          {pattern} / {equipment}
        </p>
      </div>

      <ChevronRight className="h-5 w-5 text-blue-300" />
    </button>
  );
}

export default ExerciseCard;
