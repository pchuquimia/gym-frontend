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
    width: 260,
    height: 220,
  });
  const sourceLabel = exercise.type === "system" ? "Catálogo" : "Personal";
  const muscle = getPrimaryMuscleGroup(exercise) || "Sin grupo";
  const category = getExerciseCategories(exercise)[0] || "Ejercicio";
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
      className="group grid min-h-[98px] w-full grid-cols-[92px_minmax(0,1fr)_20px] items-stretch gap-3 overflow-hidden rounded border border-[color:var(--border)] border-t-2 border-t-[#ff5722] bg-[color:var(--card)] pr-3 text-left shadow-sm transition hover:border-[#ff5722] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5722]/30 dark:border-t-[#e2ff00] dark:hover:border-[#e2ff00] dark:focus-visible:ring-[#e2ff00]/30"
      aria-label={`Ver ficha de ${exercise.name}`}
    >
      <div className="h-full min-h-[96px] w-[92px] overflow-hidden border-r border-[color:var(--border)] bg-[color:var(--bg)]">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-[color:var(--text-muted)]">
            <ImageIcon className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="min-w-0 self-center py-3 font-condensed">
        <h3 className="line-clamp-2 text-lg font-black uppercase leading-[1.05] text-[color:var(--text)]">
          {exercise.name}
        </h3>
        <div className="mt-2 flex min-w-0 items-center gap-1.5">
          <span className="shrink-0 bg-[#1a1a1a] px-2 py-1 text-[9px] font-black uppercase text-white dark:bg-[#e2ff00] dark:text-black">
            {muscle}
          </span>
          <span className="truncate text-[10px] font-black uppercase text-[#ff5722] dark:text-[#e2ff00]">
            {category}
          </span>
        </div>
        {supportingText ? (
          <p className="mt-2 truncate text-xs font-semibold text-[color:var(--text-muted)]">
            {supportingText}
          </p>
        ) : null}
        {exercise.type !== "system" ? (
          <p className="mt-1 text-[9px] font-black uppercase text-[color:var(--text-muted)]">
            {sourceLabel}
          </p>
        ) : null}
      </div>

      <ChevronRight className="h-5 w-5 self-center text-[#ff5722] transition group-hover:translate-x-0.5 dark:text-[#e2ff00]" />
    </button>
  );
}
