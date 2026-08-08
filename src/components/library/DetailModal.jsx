import { useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Dumbbell,
  MapPin,
  Pause,
  Pencil,
  Play,
  Tags,
  Target,
  Trash2,
} from "lucide-react";
import {
  getExerciseAnimationUrl,
  getExerciseImageUrl,
} from "../../utils/cloudinary";
import {
  formatList,
  getExerciseBodyRegion,
  getExerciseCategories,
  getExerciseEquipment,
  getExerciseGoals,
  getExerciseMovementPatterns,
  getExerciseNavigationRegion,
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
    const previous = steps.at(-1);
    const continuesPrevious =
      previous &&
      (!/[.!?]$/.test(previous) || /^[a-záéíóúüñ]/.test(step));
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
          ? "border-[#ff5722] bg-[#ff5722] text-white dark:border-[#e2ff00] dark:bg-[#e2ff00] dark:text-black"
          : "border-[color:var(--border)] bg-[color:var(--bg)] text-[color:var(--text)]"
      }`}
    >
      {children}
    </span>
  );
}

function Metric({ label, value, accent = false }) {
  if (!value) return null;
  return (
    <div
      className={`min-h-24 border border-[color:var(--border)] p-3 ${
        accent
          ? "bg-[repeating-linear-gradient(135deg,transparent,transparent_5px,rgba(255,87,34,0.09)_5px,rgba(255,87,34,0.09)_8px)] dark:bg-[repeating-linear-gradient(135deg,transparent,transparent_5px,rgba(226,255,0,0.08)_5px,rgba(226,255,0,0.08)_8px)]"
          : "bg-[color:var(--bg)]"
      }`}
    >
      <p className="font-condensed text-[11px] font-black uppercase text-[color:var(--text-muted)]">
        {label}
      </p>
      <p
        className={`mt-1 break-words font-condensed text-xl font-black leading-tight ${
          accent
            ? "text-[#ff5722] dark:text-[#e2ff00]"
            : "text-[color:var(--text)]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SectionHeading({ icon: Icon, children }) {
  return (
    <h3 className="flex items-center gap-2 font-condensed text-lg font-black uppercase text-[color:var(--text)]">
      <Icon className="h-4 w-4 text-[#ff5722] dark:text-[#e2ff00]" />
      {children}
    </h3>
  );
}

function TechnicalRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 border-b border-[color:var(--border)] py-3 last:border-b-0">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5722] dark:text-[#e2ff00]" />
      <div className="min-w-0">
        <p className="font-condensed text-[11px] font-black uppercase text-[color:var(--text-muted)]">
          {label}
        </p>
        <p className="mt-0.5 text-sm leading-5 text-[color:var(--text)]">{value}</p>
      </div>
    </div>
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

  const imageUrl = getExerciseImageUrl(exercise, { width: 960, height: 540 });
  const animationUrl = getExerciseAnimationUrl(exercise);
  const instructions = normalizeInstructionSteps(exercise.instructions);
  const categories = getExerciseCategories(exercise);
  const muscleGroup = getPrimaryMuscleGroup(exercise);
  const bodyRegion = getExerciseBodyRegion(exercise);
  const navigationRegion = getExerciseNavigationRegion(exercise);
  const movementPatterns = getExerciseMovementPatterns(exercise);
  const equipment = getExerciseEquipment(exercise);
  const goals = getExerciseGoals(exercise);
  const primaryMuscles = toArray(exercise.primaryMuscles);
  const secondaryMuscles = toArray(exercise.secondaryMuscles);
  const stabilizerMuscles = toArray(exercise.stabilizerMuscles);
  const precautions = toArray(exercise.precautions);
  const aliases = toArray(exercise.aliases);
  const alternateName = [
    exercise.nameSpanish,
    exercise.nameEnglish,
    ...aliases,
  ].find((alias) => normalizeText(alias) !== normalizeText(exercise.name));
  const exerciseType = getExerciseType(exercise);
  const mechanicsObject =
    exercise.mechanics && typeof exercise.mechanics === "object"
      ? exercise.mechanics
      : {};
  const forceType =
    exercise.forceType || mechanicsObject.forceType || movementPatterns[0];
  const maxEffort =
    exercise.maxEffortPercentage || mechanicsObject.maxEffortPercentage;
  const fourthMetric = maxEffort
    ? { label: "Esfuerzo máximo", value: `${maxEffort}%`, accent: true }
    : {
        label: exercise.position ? "Posición" : "Equipamiento",
        value: exercise.position || equipment[0] || "No definido",
        accent: false,
      };
  const headerTags = [exerciseType, equipment[0], muscleGroup || goals[0]].filter(
    Boolean,
  );
  const technicalMechanics = [
    exercise.kineticChain,
    exercise.executionType,
    exercise.stability,
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

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="px-4 pb-4 pt-5 sm:px-6">
            {alternateName ? (
              <p className="text-xs font-semibold uppercase text-[color:var(--text-muted)]">
                {alternateName}
              </p>
            ) : null}
            <h2
              id="exercise-detail-title"
              className="mt-1 break-words font-condensed text-3xl font-black uppercase leading-[0.95] text-[color:var(--text)] sm:text-4xl"
            >
              {capitalizeName(exercise.name)}
            </h2>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {headerTags.map((tag, index) => (
                <TaxonomyTag
                  key={`${tag}-${index}`}
                  accent={index === headerTags.length - 1}
                >
                  {tag}
                </TaxonomyTag>
              ))}
            </div>
          </div>

          <div className="relative border-y border-[color:var(--border)] bg-black/5 dark:bg-black/30">
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
                className="aspect-video w-full object-contain"
              />
            ) : (
              <div className="grid aspect-video place-items-center font-condensed text-sm font-bold uppercase text-[color:var(--text-muted)]">
                Sin imagen disponible
              </div>
            )}
            {animationUrl ? (
              <button
                type="button"
                onClick={() => setShowAnimation((value) => !value)}
                aria-pressed={showAnimation}
                className="absolute inset-0 m-auto grid h-16 w-16 place-items-center rounded-full bg-[#ff5722] text-white shadow-xl transition hover:scale-105 dark:bg-[#e2ff00] dark:text-black"
                aria-label={showAnimation ? "Ver imagen estática" : "Ver animación"}
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

          <div className="grid grid-cols-2 gap-1 p-1 sm:gap-2 sm:p-2">
            <Metric label="Dificultad" value={exercise.difficulty || "No definida"} />
            <Metric
              label="Patrón"
              value={forceType || movementPatterns[0] || "No definido"}
            />
            <Metric
              label="Mecánica"
              value={
                exerciseType ||
                (typeof exercise.mechanics === "string"
                  ? capitalizeName(exercise.mechanics)
                  : "No definida")
              }
            />
            <Metric {...fourthMetric} />
          </div>

          {(primaryMuscles.length || muscleGroup || secondaryMuscles.length || stabilizerMuscles.length) ? (
            <section className="mt-6 border-y border-[color:var(--border)] px-4 py-5 sm:px-6">
              <SectionHeading icon={Target}>Músculos implicados</SectionHeading>
              <div className="mt-4">
                <p className="font-condensed text-[11px] font-black uppercase text-[color:var(--text-muted)]">
                  Principal
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {(primaryMuscles.length ? primaryMuscles : [muscleGroup]).map(
                    (muscle) => (
                      <TaxonomyTag key={muscle} accent>
                        {muscle}
                      </TaxonomyTag>
                    ),
                  )}
                </div>
              </div>
              {secondaryMuscles.length ? (
                <div className="mt-4">
                  <p className="font-condensed text-[11px] font-black uppercase text-[color:var(--text-muted)]">
                    Secundarios
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {secondaryMuscles.map((muscle) => (
                      <TaxonomyTag key={muscle}>{muscle}</TaxonomyTag>
                    ))}
                  </div>
                </div>
              ) : null}
              {stabilizerMuscles.length ? (
                <div className="mt-4">
                  <p className="font-condensed text-[11px] font-black uppercase text-[color:var(--text-muted)]">
                    Estabilizadores
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {stabilizerMuscles.map((muscle) => (
                      <TaxonomyTag key={muscle}>{muscle}</TaxonomyTag>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="mt-4 border-y border-[color:var(--border)] px-4 py-5 sm:px-6">
            <SectionHeading icon={Activity}>Ejecución</SectionHeading>
            {instructions.length ? (
              <ol className="mt-5">
                {instructions.map((instruction, index) => (
                  <li
                    key={`${index}-${instruction}`}
                    className="relative flex gap-3 pb-5 last:pb-0"
                  >
                    {index < instructions.length - 1 ? (
                      <span className="absolute bottom-0 left-[11px] top-6 w-px bg-[color:var(--border)]" />
                    ) : null}
                    <span className="relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#1a1a1a] font-condensed text-xs font-black text-white dark:bg-[#e2ff00] dark:text-black">
                      {index + 1}
                    </span>
                    <p className="pt-0.5 text-sm leading-6 text-[color:var(--text-muted)]">
                      {instruction}
                    </p>
                  </li>
                ))}
              </ol>
            ) : exercise.description ? (
              <p className="mt-4 whitespace-pre-line text-sm leading-6 text-[color:var(--text-muted)]">
                {exercise.description}
              </p>
            ) : (
              <p className="mt-4 text-sm text-[color:var(--text-muted)]">
                Este ejercicio todavía no tiene instrucciones cargadas.
              </p>
            )}
          </section>

          {precautions.length ? (
            <section className="mt-4 border-l-4 border-l-[#ff5722] bg-[#ff5722]/5 px-4 py-5 dark:border-l-[#e2ff00] dark:bg-[#e2ff00]/5 sm:px-6">
              <SectionHeading icon={AlertTriangle}>Consejo técnico</SectionHeading>
              <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
                {formatList(precautions)}
              </p>
            </section>
          ) : null}

          <section className="mt-4 border-y border-[color:var(--border)] px-4 py-5 sm:px-6">
            <SectionHeading icon={Tags}>Ficha técnica</SectionHeading>
            <div className="mt-2 grid sm:grid-cols-2 sm:gap-x-6">
              <TechnicalRow icon={MapPin} label="Región" value={bodyRegion} />
              <TechnicalRow icon={Tags} label="Navegación" value={navigationRegion} />
              <TechnicalRow
                icon={Activity}
                label="Patrón"
                value={movementPatterns.length ? formatList(movementPatterns) : ""}
              />
              <TechnicalRow
                icon={Dumbbell}
                label="Equipamiento"
                value={equipment.length ? formatList(equipment) : ""}
              />
              <TechnicalRow
                icon={Activity}
                label="Ejecución"
                value={technicalMechanics.join(" / ")}
              />
              <TechnicalRow
                icon={Target}
                label="Objetivos"
                value={goals.length ? formatList(goals) : categories.join(", ")}
              />
            </div>
          </section>

          {exercise.source?.attribution ? (
            <p className="px-4 py-4 text-xs leading-5 text-[color:var(--text-muted)] sm:px-6">
              Fuente: {exercise.source.attribution}
            </p>
          ) : null}
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
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 bg-[#ff5722] px-4 font-condensed text-sm font-black uppercase text-white transition hover:brightness-95 dark:bg-[#e2ff00] dark:text-black"
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
