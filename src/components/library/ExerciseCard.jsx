import { useEffect, useRef, useState } from "react";
import { Eye, Plus } from "lucide-react";
import { api } from "../../services/api";
import { getExerciseImageUrl } from "../../utils/cloudinary";

function ExerciseCard({ exercise, onView, onEdit, onDelete }) {
  const [imageSrc, setImageSrc] = useState(() => {
    const key = `exercise_thumb_${exercise.id || exercise._id}`;
    if (typeof localStorage !== "undefined") {
      const cached = localStorage.getItem(key);
      if (cached) return cached;
    }
    return getExerciseImageUrl(exercise, { width: 400, height: 400 });
  });

  const cardRef = useRef(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (imageSrc || loadedRef.current) return;

    const observer = new IntersectionObserver(
      async (entries) => {
        const entry = entries[0];
        if (!entry.isIntersecting) return;

        loadedRef.current = true;
        try {
          const full = await api.getExercise(exercise.id || exercise._id);
          const nextImg = getExerciseImageUrl(full, { width: 400, height: 400 });
          if (nextImg) {
            setImageSrc(nextImg);
            if (typeof localStorage !== "undefined") {
              const key = `exercise_thumb_${exercise.id || exercise._id}`;
              localStorage.setItem(key, nextImg);
            }
          }
        } catch {
          // ignore
        }
        observer.disconnect();
      },
      { rootMargin: "200px" }
    );

    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [exercise.id, exercise._id, imageSrc]);

  const branches = exercise.branches?.length ? exercise.branches : ["general"];
  const branchLabels = branches
    .map((b) => b.charAt(0).toUpperCase() + b.slice(1))
    .join(" / ");

  const imgFallback = "https://via.placeholder.com/120x120?text=Ejercicio";

  return (
    <article
      ref={cardRef}
      className="
        rounded-2xl border border-[color:var(--border)]
        bg-[color:var(--card)]
        flex items-center gap-3
        px-3 py-3
        md:flex-col md:items-stretch md:gap-0 md:p-0
      "
    >
      <button
        type="button"
        className="h-14 w-14 rounded-2xl overflow-hidden bg-slate-100 shrink-0 md:h-40 md:w-full md:rounded-t-2xl md:rounded-b-none"
        onClick={() => onView(exercise)}
        aria-label="Ver ejercicio"
        title="Ver ejercicio"
      >
        <img
          src={imageSrc || imgFallback}
          alt={exercise.name}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </button>

      <div className="min-w-0 flex-1 md:p-4">
        <div className="min-w-0">
          <p className="text-xs text-[color:var(--text-muted)]">
            {exercise.muscle || "Sin grupo"}
          </p>
          <p className="text-sm font-semibold text-[color:var(--text)] truncate md:text-base md:line-clamp-2">
            {exercise.name}
          </p>
        </div>

        {exercise.equipment ? (
          <p className="mt-1 text-xs text-[color:var(--text-muted)] truncate">
            {exercise.equipment}
          </p>
        ) : null}

        <div className="mt-2 hidden md:flex flex-wrap gap-2">
          {branches.map((branch) => (
            <span
              key={branch}
              className="inline-flex items-center rounded-full border border-[color:var(--border)] bg-[color:var(--bg)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--text-muted)]"
            >
              {branch.charAt(0).toUpperCase() + branch.slice(1)}
            </span>
          ))}
        </div>

        <p className="mt-1 text-[10px] text-[color:var(--text-muted)] truncate md:hidden">
          {branchLabels}
        </p>

        <div className="mt-3 flex items-center gap-2 md:mt-4">
          <button
            type="button"
            className="
              h-9 w-9 rounded-full
              border border-[color:var(--border)]
              bg-[color:var(--bg)]
              inline-flex items-center justify-center gap-2
              text-[color:var(--text-muted)]
              hover:bg-[color:var(--card)]
              focus:outline-none focus:ring-2 focus:ring-emerald-500/25
              transition
              md:w-auto md:px-3 md:rounded-lg
            "
            onClick={() => onView(exercise)}
            aria-label="Ver"
            title="Ver"
          >
            <Eye className="h-4 w-4 shrink-0" />
            <span className="hidden md:inline text-xs font-semibold text-[color:var(--text)]">
              Ver
            </span>
          </button>

          <button
            type="button"
            className="
              h-9 w-9 rounded-full
              bg-emerald-500 text-white
              inline-flex items-center justify-center gap-2
              hover:bg-emerald-600 active:bg-emerald-700
              focus:outline-none focus:ring-2 focus:ring-emerald-500/25
              transition
              md:w-auto md:px-3 md:rounded-lg
            "
            onClick={() => onEdit(exercise)}
            aria-label="Editar"
            title="Editar"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span className="hidden md:inline text-xs font-semibold text-white">
              Editar
            </span>
          </button>
        </div>
      </div>
    </article>
  );
}

export default ExerciseCard;
