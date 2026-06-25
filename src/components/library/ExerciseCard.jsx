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
      className="grid grid-cols-[92px_minmax(0,1fr)] overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-sm transition hover:border-blue-300/50 hover:shadow-md md:grid-cols-1"
    >
      <button
        type="button"
        className="relative aspect-square h-full min-h-[116px] overflow-hidden bg-[color:var(--bg)] md:aspect-[4/3] md:min-h-0"
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
        <span
          className={`absolute left-2 top-2 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${typeClass}`}
        >
          {typeLabel}
        </span>
      </button>

      <div className="flex min-w-0 flex-col p-3">
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                {exercise.primaryMuscle || exercise.muscle || "Sin grupo"}
              </p>
              <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-[color:var(--text)] md:text-base">
                {exercise.name}
              </h3>
            </div>
          </div>

          {exercise.equipment ? (
            <p className="mt-1 truncate text-xs text-[color:var(--text-muted)]">
              {exercise.equipment}
            </p>
          ) : null}
        </div>

        <div className="mt-2 flex min-w-0 items-center gap-1.5 text-[11px] text-[color:var(--text-muted)]">
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

        <div className="mt-auto flex items-center gap-2 pt-3">
          <button
            type="button"
            className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-xs font-semibold text-[color:var(--text)] transition hover:border-blue-300"
            onClick={() => onView(exercise)}
          >
            <Eye className="h-4 w-4" />
            Ver
          </button>
          {canEdit ? (
            <button
              type="button"
              className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700"
              onClick={() => onEdit(exercise)}
            >
              <Edit3 className="h-4 w-4" />
              Editar
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default ExerciseCard;
