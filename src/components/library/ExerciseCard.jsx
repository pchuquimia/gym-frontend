import { useEffect, useRef, useState } from "react";
import { Edit3, Eye, ImageIcon, MapPin } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { getExerciseImageUrl } from "../../utils/cloudinary";

const branchLabel = (branch) =>
  branch === "general"
    ? "Todas"
    : branch.charAt(0).toUpperCase() + branch.slice(1);

function ExerciseCard({ exercise, onView, onEdit }) {
  const { user } = useAuth();
  const canEdit = exercise.type !== "system" || user?.role === "Admin";
  const [imageSrc, setImageSrc] = useState(() =>
    getExerciseImageUrl(exercise, { width: 520, height: 360 }),
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
            width: 520,
            height: 360,
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

  const branches = exercise.branches?.length ? exercise.branches : ["general"];
  const typeLabel = exercise.type === "system" ? "Catalogo" : "Personal";
  const typeClass =
    exercise.type === "system"
      ? "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300"
      : "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";

  return (
    <article
      ref={cardRef}
      className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-sm transition hover:border-blue-300/50 hover:shadow-md"
    >
      <button
        type="button"
        className="relative aspect-[1.02/1] w-full overflow-hidden bg-[color:var(--bg)] md:aspect-[4/3]"
        onClick={() => onView(exercise)}
        aria-label={`Ver ${exercise.name}`}
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={exercise.name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-[color:var(--text-muted)]">
            <ImageIcon className="h-6 w-6" />
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-md bg-slate-950/70 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-blue-200 ring-1 ring-white/10 md:hidden">
          {exercise.primaryMuscle || exercise.muscle || "Sin grupo"}
        </span>
        <span
          className={`absolute right-2 top-2 rounded-full border px-2 py-0.5 text-[10px] font-semibold md:left-2 md:right-auto ${typeClass}`}
        >
          {typeLabel}
        </span>
      </button>

      <div className="flex min-w-0 flex-col p-2.5 md:p-3">
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="hidden text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)] md:block">
                {exercise.primaryMuscle || exercise.muscle || "Sin grupo"}
              </p>
              <h3 className="line-clamp-2 min-h-[34px] text-[13px] font-semibold leading-[17px] text-[color:var(--text)] md:mt-0.5 md:min-h-0 md:text-base md:leading-snug">
                {exercise.name}
              </h3>
            </div>
          </div>

          {exercise.equipment ? (
            <p className="mt-1 hidden truncate text-xs text-[color:var(--text-muted)] md:block">
              {exercise.equipment}
            </p>
          ) : null}
        </div>

        <div className="mt-2 hidden min-w-0 items-center gap-1.5 text-[11px] text-[color:var(--text-muted)] md:flex">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {branches.map(branchLabel).join(" / ")}
          </span>
        </div>

        {exercise.tags?.length ? (
          <div className="mt-2 hidden flex-wrap gap-1 md:flex">
            {exercise.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[color:var(--border)] bg-[color:var(--bg)] px-2 py-0.5 text-[10px] text-[color:var(--text-muted)]"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-auto flex items-center gap-2 pt-2.5 md:pt-3">
          <button
            type="button"
            className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-2 text-[10px] font-black uppercase tracking-wide text-[color:var(--text)] transition hover:border-blue-300 md:h-9 md:gap-2 md:px-3 md:text-xs md:normal-case md:tracking-normal"
            onClick={() => onView(exercise)}
          >
            <Eye className="hidden h-4 w-4 md:block" />
            Ver
          </button>
          {canEdit ? (
            <button
              type="button"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white transition hover:bg-blue-700 md:h-9 md:w-auto md:flex-1 md:gap-2 md:px-3 md:text-xs md:font-semibold"
              onClick={() => onEdit(exercise)}
              aria-label={`Editar ${exercise.name}`}
            >
              <Edit3 className="h-4 w-4" />
              <span className="hidden md:inline">Editar</span>
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default ExerciseCard;
