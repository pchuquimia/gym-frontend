import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Pause,
  Pencil,
  Play,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  getExerciseAnimationUrl,
  getExerciseImageUrl,
} from "../../utils/cloudinary";
import {
  getExerciseEquipment,
  getExerciseGoals,
  getExerciseType,
  getPrimaryMuscleGroup,
  normalizeText,
  toArray,
} from "../../constants/exerciseTaxonomy";

const capitalizeName = (value = "") =>
  value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : "Ejercicio";

const normalizeInstructionSteps = (value) =>
  toArray(value).reduce((steps, rawStep) => {
    const step = rawStep.trim();
    if (!step) return steps;
    const previous = steps[steps.length - 1];
    const continuesPrevious =
      previous && (!/[.!?]$/.test(previous) || /^[a-záéíóúüñ]/.test(step));
    if (continuesPrevious) {
      steps[steps.length - 1] = `${previous} ${step}`;
    } else {
      steps.push(step);
    }
    return steps;
  }, []);

function TaxonomyTag({ children, accent = false }) {
  if (!children) return null;
  return (
    <span
      className={`inline-flex min-h-6 items-center border px-2 py-1 font-condensed text-[11px] font-black uppercase leading-none ${
        accent
          ? "border-[#181918] bg-[#181918] text-white dark:border-[#e2ff00] dark:bg-[#e2ff00] dark:text-black"
          : "border-[color:var(--border)] bg-[color:var(--bg)] text-[color:var(--text)]"
      }`}
    >
      {children}
    </span>
  );
}

export default function DetailModal({
  exercise,
  onClose,
  onEdit,
  onDelete,
  canManage = false,
}) {
  const [showAnimation, setShowAnimation] = useState(false);
  const dialogRef = useRef(null);
  const scrollRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [exercise]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onCloseRef.current?.();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, []);

  const imageUrl = getExerciseImageUrl(exercise, { preset: "detail" });
  const animationUrl = getExerciseAnimationUrl(exercise);
  const instructions = normalizeInstructionSteps(exercise.instructions);
  const muscleGroup = getPrimaryMuscleGroup(exercise);
  const equipment = getExerciseEquipment(exercise);
  const goals = getExerciseGoals(exercise);
  const precautions = toArray(exercise.precautions);
  const commonMistakes = toArray(exercise.commonMistakes);
  const aliases = toArray(exercise.aliases);
  const alternateName = [
    exercise.nameSpanish,
    exercise.nameEnglish,
    ...aliases,
  ].find((alias) => normalizeText(alias) !== normalizeText(exercise.name));
  const exerciseType = getExerciseType(exercise);
  const isPersonal = exercise.type === "custom" && Boolean(exercise.ownerId);
  const headerTags = [
    exerciseType,
    equipment[0],
    muscleGroup || goals[0],
  ].filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <article
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-detail-title"
        tabIndex={-1}
        className="flex h-dvh w-full flex-col overflow-hidden bg-[color:var(--card)] text-[color:var(--text)] shadow-2xl sm:h-[94vh] sm:max-h-[94vh] sm:max-w-3xl sm:rounded-sm sm:border sm:border-[color:var(--border)]"
      >
        <header className="grid h-14 shrink-0 grid-cols-[44px_minmax(0,1fr)_44px] items-center border-b border-[color:var(--border)] px-2 sm:px-4">
          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 place-items-center text-[color:var(--text)] transition hover:bg-[color:var(--bg)]"
            aria-label="Volver"
            title="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <p className="truncate text-center font-condensed text-xs font-black uppercase text-[color:var(--text)]">
            Detalle del ejercicio
          </p>
          <span aria-hidden="true" />
        </header>

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          <div className="exercise-detail-editorial__media relative bg-black/5 dark:bg-black/30">
            {showAnimation && animationUrl ? (
              <img
                src={animationUrl}
                alt={`Demostración de ${exercise.name}`}
                className="aspect-video w-full object-contain"
              />
            ) : imageUrl ? (
              <img
                src={imageUrl}
                alt={exercise.name}
                className="aspect-video w-full object-cover"
              />
            ) : (
              <div className="grid aspect-video place-items-center text-sm font-semibold text-[color:var(--text-muted)]">
                Sin imagen disponible
              </div>
            )}
            {animationUrl ? (
              <button
                type="button"
                onClick={() => setShowAnimation((value) => !value)}
                aria-pressed={showAnimation}
                className="absolute inset-0 m-auto grid h-16 w-16 place-items-center rounded-full bg-[#181918] text-white shadow-xl transition hover:scale-105 dark:bg-[#e2ff00] dark:text-black"
                aria-label={
                  showAnimation ? "Ver imagen estática" : "Ver animación"
                }
                title={showAnimation ? "Ver imagen estática" : "Ver animación"}
              >
                {showAnimation ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="ml-0.5 h-7 w-7" />
                )}
              </button>
            ) : null}
          </div>

          <div className="exercise-detail-editorial">
            {isPersonal ? (
              <div className="exercise-detail-editorial__personal hidden items-center gap-2 sm:flex">
                <UserRound className="h-4 w-4" />
                Ejercicio personal
              </div>
            ) : null}
            {alternateName ? (
              <p className="exercise-detail-editorial__alternate hidden sm:block">
                {alternateName}
              </p>
            ) : null}
            <h2
              id="exercise-detail-title"
              className="exercise-detail-editorial__title"
            >
              {capitalizeName(exercise.name)}
            </h2>
            <div className="exercise-detail-editorial__tags hidden flex-wrap gap-1.5 sm:flex">
              {headerTags.map((tag, index) => (
                <TaxonomyTag
                  key={`${tag}-${index}`}
                  accent={index === headerTags.length - 1}
                >
                  {tag}
                </TaxonomyTag>
              ))}
            </div>

            {exercise.description ? (
              <p className="exercise-detail-editorial__intro whitespace-pre-line">
                {exercise.description}
              </p>
            ) : null}

            <section className="exercise-detail-editorial__section">
              <h3 className="exercise-detail-editorial__heading">
                Cómo realizarlo:
              </h3>
              {instructions.length ? (
                <ol className="exercise-detail-editorial__list">
                  {instructions.map((instruction, index) => (
                    <li key={`${index}-${instruction}`}>
                      <span className="exercise-detail-editorial__marker">
                        {index + 1}.
                      </span>
                      <p>{instruction}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="exercise-detail-editorial__copy">
                  Este ejercicio todavía no tiene instrucciones cargadas.
                </p>
              )}
            </section>

            {commonMistakes.length ? (
              <section className="exercise-detail-editorial__section">
                <h3 className="exercise-detail-editorial__heading">
                  Errores comunes:
                </h3>
                <ul className="exercise-detail-editorial__list">
                  {commonMistakes.map((mistake) => (
                    <li key={mistake}>
                      <span
                        className="exercise-detail-editorial__marker"
                        aria-hidden="true"
                      >
                        •
                      </span>
                      <p>{mistake}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {precautions.length ? (
              <section className="exercise-detail-editorial__section">
                <h3 className="exercise-detail-editorial__heading">
                  Consejos:
                </h3>
                {precautions.length === 1 ? (
                  <p className="exercise-detail-editorial__copy">
                    {precautions[0]}
                  </p>
                ) : (
                  <ul className="exercise-detail-editorial__list">
                    {precautions.map((precaution) => (
                      <li key={precaution}>
                        <span
                          className="exercise-detail-editorial__marker"
                          aria-hidden="true"
                        >
                          •
                        </span>
                        <p>{precaution}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : null}
          </div>

          <div className="h-4" />
        </div>

        {canManage ? (
          <footer className="flex shrink-0 gap-2 border-t border-[color:var(--border)] bg-[color:var(--card)] p-3 sm:px-6">
            <button
              type="button"
              onClick={onDelete}
              className="grid h-12 w-12 shrink-0 place-items-center border border-red-400 text-red-600 transition hover:bg-red-50 dark:border-red-500/50 dark:text-red-300 dark:hover:bg-red-950/30"
              aria-label="Eliminar ejercicio"
              title="Eliminar ejercicio"
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 bg-[#181918] px-4 font-condensed text-sm font-black uppercase text-white transition hover:brightness-95 dark:bg-[#e2ff00] dark:text-black"
            >
              <Pencil className="h-4 w-4" />
              Editar ejercicio
            </button>
          </footer>
        ) : null}
      </article>
    </div>
  );
}
