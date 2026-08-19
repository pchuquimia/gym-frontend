import { useState } from "react";
import {
  ChevronRight,
  Clock3,
  ImageIcon,
  Layers3,
  Sparkles,
  UserRound,
} from "lucide-react";
import { getExerciseImageUrl } from "../../utils/cloudinary";
import {
  formatList,
  getExerciseCategories,
  getExerciseEquipment,
  getExerciseMovementPatterns,
  getPrimaryMuscleGroup,
} from "../../constants/exerciseTaxonomy";

export default function ExerciseCard({
  exercise,
  displayName,
  isEssential = false,
  isRecent = false,
  featured = false,
  variantCount = 0,
  onShowVariants,
  onView,
}) {
  const imageSrc = getExerciseImageUrl(exercise, { preset: "card" });
  const [failedImageSrc, setFailedImageSrc] = useState("");
  const isPersonal = exercise.type === "custom" && Boolean(exercise.ownerId);
  const muscle = getPrimaryMuscleGroup(exercise) || "Sin grupo";
  const category = getExerciseCategories(exercise)[0] || "Ejercicio";
  const pattern = getExerciseMovementPatterns(exercise)[0] || "";
  const equipment = getExerciseEquipment(exercise);
  const title = displayName || exercise.name;
  const supportingText = [
    displayName && displayName !== exercise.name ? exercise.name : pattern,
    equipment.length ? formatList(equipment) : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="group overflow-hidden rounded border border-[color:var(--border)] border-t-2 border-t-[#ff5722] bg-[color:var(--card)] shadow-sm transition hover:border-[#ff5722] focus-within:ring-2 focus-within:ring-[#ff5722]/30 dark:border-t-[#e2ff00] dark:hover:border-[#e2ff00] dark:focus-within:ring-[#e2ff00]/30">
      <button
        type="button"
        onClick={() => onView(exercise)}
        className={`grid w-full items-stretch text-left focus-visible:outline-none ${
          featured
            ? "min-h-[176px] grid-cols-[minmax(128px,42%)_minmax(0,1fr)_20px] gap-4 pr-4"
            : "min-h-[98px] grid-cols-[92px_minmax(0,1fr)_20px] gap-3 pr-3"
        }`}
        aria-label={`Ver ficha de ${title}`}
      >
        <div
          className={`h-full overflow-hidden border-r border-[color:var(--border)] bg-[color:var(--bg)] ${
            featured ? "min-h-[174px] w-full" : "min-h-[96px] w-[92px]"
          }`}
        >
          {imageSrc && failedImageSrc !== imageSrc ? (
            <img
              src={imageSrc}
              alt=""
              loading="lazy"
              onError={() => setFailedImageSrc(imageSrc)}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-[color:var(--text-muted)]">
              <ImageIcon className="h-5 w-5" />
            </div>
          )}
        </div>

        <div
          className={`min-w-0 self-center font-condensed ${
            featured ? "py-4" : "py-3"
          }`}
        >
          <div className="mb-1.5 flex flex-wrap gap-1">
            {isEssential ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#ff5722]/10 px-2 py-0.5 text-[9px] font-black uppercase text-[#c52d00] dark:bg-[#e2ff00]/10 dark:text-[#e2ff00]">
                <Sparkles className="h-2.5 w-2.5" />
                Básico
              </span>
            ) : null}
            {isRecent ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--bg)] px-2 py-0.5 text-[9px] font-black uppercase text-[color:var(--text-muted)]">
                <Clock3 className="h-2.5 w-2.5" />
                Reciente
              </span>
            ) : null}
          </div>
          <h3
            className={`line-clamp-2 font-black uppercase leading-[1.02] text-[color:var(--text)] ${
              featured ? "text-2xl sm:text-3xl" : "text-lg"
            }`}
          >
            {title}
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
          {isPersonal ? (
            <p className="mt-2 inline-flex items-center gap-1 text-[10px] font-black uppercase text-[#c52d00] dark:text-[#e2ff00]">
              <UserRound className="h-3 w-3" />
              Creado por ti
            </p>
          ) : null}
        </div>

        <ChevronRight className="h-5 w-5 self-center text-[#ff5722] transition group-hover:translate-x-0.5 dark:text-[#e2ff00]" />
      </button>

      {variantCount > 1 && onShowVariants ? (
        <button
          type="button"
          onClick={onShowVariants}
          className="flex h-10 w-full items-center justify-center gap-2 border-t border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-xs font-black text-[color:var(--text)] transition hover:text-[#ff5722] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ff5722]/30 dark:hover:text-[#e2ff00] dark:focus-visible:ring-[#e2ff00]/30"
          aria-label={`Ver ${variantCount} variantes de ${title}`}
        >
          <Layers3 className="h-3.5 w-3.5" />
          Ver {variantCount} variantes
        </button>
      ) : null}
    </article>
  );
}
