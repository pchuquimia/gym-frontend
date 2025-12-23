import { useEffect, useRef, useState } from "react";
import { Eye, Plus } from "lucide-react";
import { api } from "../../services/api";

function ExerciseCard({ exercise, onView, onEdit, onDelete }) {
  const [imageSrc, setImageSrc] = useState(() => {
    const key = `exercise_thumb_${exercise.id || exercise._id}`;
    if (typeof localStorage !== "undefined") {
      const cached = localStorage.getItem(key);
      if (cached) return cached;
    }
    return exercise.thumb || exercise.image || "";
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
          if (full?.thumb || full?.image) {
            const nextImg = full.thumb || full.image;
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
    .join(" · ");

  const imgFallback = "https://via.placeholder.com/120x120?text=Ejercicio";

  return (
    <article
      ref={cardRef}
      className="
        rounded-2xl border border-[color:var(--border)]
        bg-[color:var(--card)]
        px-3 py-3
        flex items-center gap-3
      "
    >
      {/* Thumb */}
      <button
        type="button"
        className="h-14 w-14 rounded-2xl overflow-hidden bg-slate-100 shrink-0"
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

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[color:var(--text)] truncate">
          {exercise.name}
        </p>

        <p className="text-xs text-[color:var(--text-muted)] truncate">
          {exercise.muscle || "—"}
          {exercise.equipment ? `, ${exercise.equipment}` : ""}
        </p>

        {/* Sede (pequeño) */}
        <p className="mt-1 text-[10px] text-[color:var(--text-muted)] truncate">
          {branchLabels}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          className="
            h-9 w-9 rounded-full
            border border-[color:var(--border)]
            bg-[color:var(--bg)]
            grid place-items-center
            text-[color:var(--text-muted)]
            hover:bg-[color:var(--card)]
            focus:outline-none focus:ring-2 focus:ring-emerald-500/25
            transition
          "
          onClick={() => onView(exercise)}
          aria-label="Ver"
          title="Ver"
        >
          <Eye className="h-4 w-4" />
        </button>

        <button
          type="button"
          className="
            h-9 w-9 rounded-full
            bg-emerald-500 text-white
            grid place-items-center
            hover:bg-emerald-600 active:bg-emerald-700
            focus:outline-none focus:ring-2 focus:ring-emerald-500/25
            transition
          "
          onClick={() => onEdit(exercise)}
          aria-label="Agregar/Editar"
          title="Agregar/Editar"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

export default ExerciseCard;
