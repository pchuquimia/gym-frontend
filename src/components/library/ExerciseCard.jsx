import { useEffect, useRef, useState } from "react";
import { Eye } from "lucide-react";
import { api } from "../../services/api";

function ExerciseCard({ exercise, onView, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
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
        if (entry.isIntersecting) {
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
            // ignore errors
          }
          observer.disconnect();
        }
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
  const isCustom = exercise.type === "custom";

  return (
    <article
      ref={cardRef}
      className="group rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-sm overflow-hidden transition duration-150 hover:-translate-y-[1px] hover:shadow-md flex flex-col"
    >
      <button
        type="button"
        className="relative block h-40 w-full overflow-hidden bg-slate-100"
        onClick={() => onView(exercise)}
      >
        <img
          src={imageSrc || "https://via.placeholder.com/400x225?text=Ejercicio"}
          alt={exercise.name}
          loading="lazy"
          className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <div className="absolute top-2 left-2 flex gap-2">
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/80 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {branchLabels}
          </span>
        </div>
      </button>

      <div className="flex items-start justify-between px-3 py-2.5 gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] px-2 py-1 rounded-full border border-[color:var(--border)] text-[color:var(--text-muted)]">
              {exercise.muscle}
            </span>
            {isCustom && (
              <span className="text-[11px] px-2 py-1 rounded-full bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100 opacity-80 group-hover:opacity-100 transition">
                Personalizado
              </span>
            )}
          </div>
          <p className="text-base font-semibold leading-6 text-[color:var(--text)] line-clamp-2">
            {exercise.name}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            className="w-9 h-9 grid place-items-center rounded-lg border border-[color:var(--border)] text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
            onClick={() => onView(exercise)}
            aria-label="Ver ejercicio"
          >
            <Eye className="w-4 h-4" />
          </button>
          <div className="relative">
            <button
              type="button"
              className="w-9 h-9 grid place-items-center rounded-lg border border-[color:var(--border)] text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Más acciones"
            >
              ⋯
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-1 w-36 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] shadow-lg z-20">
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[color:var(--bg)] transition"
                  onClick={() => {
                    onEdit(exercise);
                    setMenuOpen(false);
                  }}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-[color:var(--bg)] transition"
                  onClick={() => {
                    onDelete(exercise);
                    setMenuOpen(false);
                  }}
                >
                  Eliminar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default ExerciseCard;
