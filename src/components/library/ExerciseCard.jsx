import { ChevronRight, ImageIcon } from "lucide-react";
import { getExerciseImageUrl } from "../../utils/cloudinary";
import {
  formatList,
  getExerciseCategories,
  getExerciseEquipment,
  getExerciseMovementPatterns,
  getPrimaryMuscleGroup,
} from "../../constants/exerciseTaxonomy";

export default function ExerciseCard({ exercise, onView }) {
  const imageSrc = getExerciseImageUrl(exercise, {
    width: 180,
    height: 180,
  });
  const sourceLabel = exercise.type === "system" ? "Catálogo" : "Personal";
  const muscle = getPrimaryMuscleGroup(exercise) || "Sin grupo";
  const category = getExerciseCategories(exercise)[0] || sourceLabel;
  const pattern = getExerciseMovementPatterns(exercise)[0] || "";
  const equipment = getExerciseEquipment(exercise);
  const supportingText = [
    pattern,
    equipment.length ? formatList(equipment) : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <button
      type="button"
      onClick={() => onView(exercise)}
      className="grid w-full grid-cols-[64px_minmax(0,1fr)_24px] items-center gap-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-3 text-left shadow-sm transition hover:border-blue-300/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      aria-label={`Ver ficha de ${exercise.name}`}
    >
      <div className="h-16 w-16 overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)]">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt=""
            loading="lazy"
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-[color:var(--text-muted)]">
            <ImageIcon className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="min-w-0 space-y-1.5">
        <h3 className="truncate text-base font-black capitalize leading-tight text-[color:var(--text)]">
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
        {supportingText ? (
          <p className="truncate text-xs font-semibold text-[color:var(--text-muted)]">
            {supportingText}
          </p>
        ) : null}
      </div>

      <ChevronRight className="h-5 w-5 text-blue-400" />
    </button>
  );
}
