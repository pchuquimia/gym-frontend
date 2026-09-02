import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Flame,
  Layers3,
  ListChecks,
  LoaderCircle,
  Minus,
  Repeat2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import {
  compareExercise,
  formatExerciseProgress,
  formatMuscleGroup,
  summarizeSession,
} from "../utils/sessionAnalytics";
import { useTrainingData } from "../context/TrainingContext";
import { useRoutines } from "../context/RoutineContext";
import { getExerciseImageUrl } from "../utils/cloudinary";
import ExerciseThumbnail from "../components/analytics/ExerciseThumbnail";
import CalorieEstimateModal from "../components/analytics/CalorieEstimateModal";
import MobilePageHeader from "../components/layout/MobilePageHeader";
import { useUserProfile } from "../context/UserContext";
import {
  estimateTrainingCalories,
  summarizeCalorieEstimates,
} from "../utils/calorieEstimate";

const formatDateLong = (iso) =>
  iso
    ? new Date(`${String(iso).slice(0, 10)}T12:00:00`).toLocaleDateString(
        "es-BO",
        { weekday: "short", day: "2-digit", month: "long", year: "numeric" },
      )
    : "--";

const comparisonText = (value) => {
  if (!Number.isFinite(value)) return "series completadas";
  const rounded = Math.abs(Math.round(value));
  if (rounded < 5) return "igual que tu promedio";
  return value > 0
    ? `${rounded}% más que tu promedio`
    : `${rounded}% menos que tu promedio`;
};

const duration = (seconds) => {
  const minutes = Math.max(0, Math.round((Number(seconds) || 0) / 60));
  if (!minutes) return "--";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}h ${rest}m` : `${minutes} min`;
};

const flattenSets = (sets = []) =>
  (Array.isArray(sets) ? sets : []).flatMap((set) => {
    const source =
      Array.isArray(set?.entries) && set.entries.length ? set.entries : [set];
    return source
      .map((entry) => ({
        weightKg:
          Number(entry?.weightKg ?? entry?.weight ?? entry?.kg ?? 0) || 0,
        reps: Number(entry?.reps ?? 0) || 0,
        done: entry?.done ?? set?.done,
      }))
      .filter(
        (entry) => entry.done !== false && entry.weightKg > 0 && entry.reps > 0,
      );
  });

const safeArray = (value) => (Array.isArray(value) ? value : []);

const countLabel = (count, singular, plural) =>
  `${Number(count) || 0} ${Number(count) === 1 ? singular : plural}`;

const exerciseCountLabel = (count) =>
  countLabel(count, "ejercicio", "ejercicios");

function MobileSessionPicker({ currentId, onClose, onSelect, sessions }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] sm:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-session-picker-title"
    >
      <button
        type="button"
        aria-label="Cerrar selector de sesiones"
        onClick={onClose}
        className="session-summary-picker__backdrop absolute inset-0 bg-black/55"
      />
      <section className="session-summary-picker absolute inset-x-0 bottom-0 flex max-h-[78dvh] flex-col rounded-t-2xl border-t border-[color:var(--border)] bg-[color:var(--card)] pb-[env(safe-area-inset-bottom)] shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-[color:var(--border)] px-5 py-4">
          <div>
            <p className="session-summary-kicker text-[10px] font-black uppercase text-[#352018] dark:text-[#e2ff00]">
              Historial
            </p>
            <h2
              id="mobile-session-picker-title"
              className="mt-0.5 text-lg font-black"
            >
              Selecciona una sesión
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--surface-subtle)]"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
          {sessions.map((session) => {
            const id = String(session.id || session._id || "");
            const isSelected = id === String(currentId || "");
            return (
              <button
                key={id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelect(id)}
                className={`session-summary-picker__option flex min-h-16 w-full items-center gap-3 border-b border-[color:var(--border)] px-4 py-3 text-left ${isSelected ? "is-selected bg-[color:var(--accent)] text-[color:var(--accent-contrast)]" : ""}`}
              >
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-[10px] font-semibold ${isSelected ? "text-current" : "text-[color:var(--text-muted)]"}`}
                  >
                    {String(session.date || "").slice(0, 10) || "Sin fecha"}
                  </span>
                  <span className="mt-0.5 block truncate text-sm font-semibold">
                    {session.routineName || "Entrenamiento"}
                  </span>
                </span>
                {isSelected ? (
                  <Check className="h-5 w-5 shrink-0 text-current" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-[color:var(--text-muted)]" />
                )}
              </button>
            );
          })}
        </div>
      </section>
    </div>,
    document.body,
  );
}

MobileSessionPicker.propTypes = {
  currentId: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
  sessions: PropTypes.arrayOf(PropTypes.object).isRequired,
};

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  accent = false,
  onClick = null,
  className = "",
}) {
  const Component = onClick ? "button" : "article";
  return (
    <Component
      type={onClick ? "button" : undefined}
      onClick={onClick || undefined}
      className={`session-summary-metric rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-left shadow-sm dark:rounded-[4px] dark:shadow-none ${onClick ? "transition hover:border-[color:var(--border-strong)]" : ""} ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="session-summary-metric__label text-[10px] font-black uppercase text-[color:var(--text-muted)]">
          {label}
        </p>
        <Icon className="h-4 w-4 text-[#352018] dark:text-[#e2ff00]" />
      </div>
      <p
        className={`session-summary-metric__value mt-3 text-2xl font-black leading-none ${accent ? "text-[#352018] dark:text-[#e2ff00]" : ""}`}
      >
        {value}
      </p>
      <p className="session-summary-metric__detail mt-2 text-[11px] font-semibold text-[color:var(--text-muted)]">
        {detail}
      </p>
    </Component>
  );
}

export default function SessionSummaryPage({
  sessions: propSessions = [],
  currentSession: propCurrentSession,
  onViewExerciseAnalytics = null,
  onNavigate = null,
  onBack = null,
}) {
  const {
    trainings: ctxTrainings = [],
    trainingsLoading = false,
    trainingsFetching = false,
    exercises: exerciseMeta = [],
  } = useTrainingData();
  const { routines = [] } = useRoutines();
  const { profile } = useUserProfile();
  const [isSessionPickerOpen, setIsSessionPickerOpen] = useState(false);
  const [isCaloriesOpen, setIsCaloriesOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(() =>
    typeof localStorage === "undefined"
      ? ""
      : localStorage.getItem("last_training_id") || "",
  );

  const routineBranches = useMemo(() => {
    const map = new Map();
    routines.forEach((routine) =>
      map.set(String(routine.id || routine._id), routine.branch || "general"),
    );
    return map;
  }, [routines]);

  const normalizedContextSessions = useMemo(
    () =>
      safeArray(ctxTrainings)
        .map((training) => ({
          id: String(
            training.id ||
              training._id ||
              `${training.date}-${training.routineId || ""}`,
          ),
          date: training.date,
          routineName: training.routineName || "Entrenamiento",
          routineBranch:
            training.branch ||
            routineBranches.get(String(training.routineId || "")) ||
            "general",
          durationSeconds: Number(training.durationSeconds) || 0,
          durationOverrideSeconds:
            Number(training.durationOverrideSeconds) || 0,
          workSeconds: Number(training.workSeconds) || 0,
          restSeconds: Number(training.restSeconds) || 0,
          preparationSeconds: Number(training.preparationSeconds) || 0,
          timeEvents: Array.isArray(training.timeEvents)
            ? training.timeEvents
            : [],
          exercises: Array.isArray(training.exercises)
            ? training.exercises.map((exercise) => ({
                exerciseId: exercise.exerciseId,
                exerciseName: exercise.exerciseName || "Ejercicio",
                muscleGroup:
                  exercise.muscleGroup ||
                  exerciseMeta.find((item) => item.id === exercise.exerciseId)
                    ?.muscle ||
                  "Sin grupo",
                movementMode: exercise.movementMode,
                weightBasis: exercise.weightBasis,
                barWeightKg: exercise.barWeightKg,
                implementCount: exercise.implementCount,
                loadType: exercise.loadType,
                equipment: exercise.equipment,
                sets: flattenSets(exercise.sets),
              }))
            : undefined,
        }))
        .sort((left, right) =>
          String(right.date).localeCompare(String(left.date)),
        ),
    [ctxTrainings, exerciseMeta, routineBranches],
  );

  const baseSessions = safeArray(propSessions).length
    ? safeArray(propSessions)
    : normalizedContextSessions;
  const sortedSessions = useMemo(
    () =>
      [...baseSessions].sort((left, right) =>
        String(right.date).localeCompare(String(left.date)),
      ),
    [baseSessions],
  );
  const currentRaw =
    propCurrentSession ||
    sortedSessions.find(
      (session) => String(session.id) === String(selectedId),
    ) ||
    sortedSessions[0] ||
    null;
  const currentSummary = useMemo(
    () => summarizeSession(currentRaw || {}),
    [currentRaw],
  );
  const isSessionDetailLoading = Boolean(
    currentRaw &&
    !Array.isArray(currentRaw.exercises) &&
    (trainingsLoading || trainingsFetching),
  );
  const historySummaries = useMemo(
    () =>
      sortedSessions
        .map((session) => summarizeSession(session))
        .filter((item) => item.date),
    [sortedSessions],
  );

  useEffect(() => {
    if (!currentRaw?.id || typeof localStorage === "undefined") return;
    localStorage.setItem("last_training_id", String(currentRaw.id));
  }, [currentRaw?.id]);

  const selectSession = (id) => {
    setSelectedId(String(id || ""));
    setIsSessionPickerOpen(false);
  };

  const totals = useMemo(() => {
    const exercises = currentSummary.exercises || [];
    return {
      sets: exercises.reduce((sum, item) => sum + item.setsCount, 0),
      reps: exercises.reduce((sum, item) => sum + item.repsTotal, 0),
      exercises: exercises.length,
    };
  }, [currentSummary.exercises]);

  const calorieEstimate = useMemo(
    () =>
      estimateTrainingCalories(currentRaw || {}, {
        weightKg: profile?.weight,
      }),
    [currentRaw, profile?.weight],
  );
  const calorieEstimateWithSession = useMemo(
    () => ({
      ...calorieEstimate,
      id: String(currentRaw?.id || currentRaw?._id || "current-session"),
      date: currentRaw?.date,
      routineName: currentRaw?.routineName || "Entrenamiento",
    }),
    [calorieEstimate, currentRaw],
  );
  const calorieSummary = useMemo(
    () => summarizeCalorieEstimates([calorieEstimate]),
    [calorieEstimate],
  );

  const sessionReference = useMemo(() => {
    if (!currentRaw?.date)
      return {
        count: 0,
        sets: 0,
        setsDelta: null,
      };
    const references = historySummaries
      .filter(
        (item) =>
          item.date < currentRaw.date &&
          (!currentRaw.routineName ||
            item.routineName === currentRaw.routineName),
      )
      .slice(0, 7);
    const referenceTotals = references.map((summary) => ({
      sets: (summary.exercises || []).reduce(
        (sum, item) => sum + item.setsCount,
        0,
      ),
    }));
    const average = (field) =>
      referenceTotals.length
        ? referenceTotals.reduce((sum, item) => sum + item[field], 0) /
          referenceTotals.length
        : 0;
    const sets = average("sets");
    return {
      count: references.length,
      sets,
      setsDelta: sets ? ((totals.sets - sets) / sets) * 100 : null,
    };
  }, [currentRaw, historySummaries, totals]);

  const muscleRows = useMemo(() => {
    const entries = Object.entries(currentSummary.groups || {}).map(
      ([muscleKey, today]) => ({
        muscleKey,
        today,
        label: formatMuscleGroup(muscleKey || "Otros"),
      }),
    );
    const totalSets = Math.max(
      1,
      entries.reduce((sum, entry) => sum + (entry.today?.setsCount || 0), 0),
    );
    return entries
      .map((entry) => ({
        ...entry,
        share: ((entry.today?.setsCount || 0) / totalSets) * 100,
      }))
      .sort(
        (left, right) =>
          (right.today?.setsCount || 0) - (left.today?.setsCount || 0),
      );
  }, [currentSummary.groups]);

  const exerciseRows = useMemo(
    () =>
      (currentSummary.exercises || []).map((exercise, index) => ({
        today: exercise,
        order: index + 1,
        comparison: compareExercise(
          currentSummary,
          historySummaries,
          exercise.exerciseId,
        ),
      })),
    [currentSummary, historySummaries],
  );

  const handleViewExercise = (exerciseId) => {
    if (typeof localStorage !== "undefined" && exerciseId) {
      localStorage.setItem("last_exercise_id", exerciseId);
    }
    if (onViewExerciseAnalytics) onViewExerciseAnalytics(exerciseId);
    else onNavigate?.("ejercicio_analitica");
  };

  const sessionInsight = !currentRaw
    ? "Selecciona una sesión registrada para ver su análisis."
    : sessionReference.count < 2
      ? "Todavía no hay suficientes sesiones equivalentes para una comparación estable."
      : sessionReference.setsDelta >= 20
        ? `Completaste ${Math.round(sessionReference.setsDelta)}% más series que en tus sesiones recientes.`
        : sessionReference.setsDelta <= -20
          ? `Completaste ${Math.abs(Math.round(sessionReference.setsDelta))}% menos series que en tus sesiones recientes.`
          : "La cantidad de series se mantuvo cerca de tu promedio reciente.";

  return (
    <main className="session-summary-page analytics-shell mx-auto w-full max-w-md space-y-5 pb-8 text-[color:var(--text)] md:max-w-5xl md:space-y-4 md:pb-24 xl:max-w-6xl 2xl:max-w-[1280px]">
      <MobilePageHeader
        title="Resumen diario"
        variant="detail"
        onBack={() =>
          onBack ? onBack("dashboard") : onNavigate?.("dashboard")
        }
        className="session-summary-page__mobile-header"
      />

      <header className="session-summary-page__desktop-header hidden items-end justify-between gap-3 border-b border-[color:var(--border)] pb-4 md:flex">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase text-[#352018] dark:text-[#e2ff00]">
            Lectura posterior
          </p>
          <h1 className="mt-1 text-[30px] font-black uppercase leading-none md:text-[36px]">
            Resumen diario
          </h1>
          <p className="mt-2 text-[13px] font-semibold text-[color:var(--text-muted)]">
            Revisa la sesión que acabas de completar y compárala con tu
            historial.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            onBack ? onBack("dashboard") : onNavigate?.("dashboard")
          }
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-3 text-xs font-black uppercase text-[color:var(--text)] transition-colors hover:border-[#352018]/50 dark:hover:border-[#e2ff00]/50"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Volver</span>
        </button>
      </header>

      {sortedSessions.length ? (
        <section className="session-summary-session-card grid gap-4 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)] sm:items-end dark:rounded-[4px] dark:shadow-none">
          <div className="session-summary-session-card__overview min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="session-summary-session-card__title truncate text-xl font-black">
                  {currentRaw?.routineName || "Entrenamiento"}
                </h2>
                <p className="session-summary-session-card__date mt-1 text-sm font-normal text-[color:var(--text-muted)]">
                  {formatDateLong(currentRaw?.date)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSessionPickerOpen(true)}
                aria-haspopup="dialog"
                aria-label="Cambiar sesión"
                className="session-summary-session-change grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[color:var(--surface-subtle)] sm:hidden"
              >
                <CalendarDays className="h-5 w-5" strokeWidth={1.8} />
              </button>
            </div>
          </div>
          <label className="hidden sm:block">
            <span className="mb-1 block text-[10px] font-black uppercase text-[color:var(--text-muted)]">
              Cambiar sesión
            </span>
            <select
              value={currentRaw?.id || ""}
              onChange={(event) => selectSession(event.target.value)}
              className="theme-accent-focus h-11 w-full border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-sm font-bold outline-none"
            >
              {sortedSessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {String(session.date).slice(0, 10)} · {session.routineName}
                </option>
              ))}
            </select>
          </label>
        </section>
      ) : null}

      {isSessionPickerOpen ? (
        <MobileSessionPicker
          currentId={String(currentRaw?.id || "")}
          sessions={sortedSessions}
          onClose={() => setIsSessionPickerOpen(false)}
          onSelect={selectSession}
        />
      ) : null}

      {!sortedSessions.length ? (
        <section
          className="session-summary-empty grid min-h-[360px] place-items-center rounded-2xl bg-[color:var(--card)] px-6 py-12 text-center"
          role="status"
        >
          <div className="max-w-xs">
            {trainingsLoading || trainingsFetching ? (
              <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-[color:var(--text-muted)]" />
            ) : (
              <CalendarDays className="mx-auto h-8 w-8 text-[color:var(--text-muted)]" />
            )}
            <h2 className="mt-5 text-xl font-semibold">
              {trainingsLoading || trainingsFetching
                ? "Preparando tu resumen"
                : "Aún no hay entrenamientos"}
            </h2>
            <p className="mt-2 text-sm font-normal leading-6 text-[color:var(--text-muted)]">
              {trainingsLoading || trainingsFetching
                ? "Estamos cargando los datos de tu última sesión."
                : "Cuando termines una sesión, aquí verás sus ejercicios, series, repeticiones y duración."}
            </p>
            {!trainingsLoading && !trainingsFetching ? (
              <button
                type="button"
                onClick={() => onNavigate?.("registrar")}
                className="mt-6 h-12 rounded-xl bg-[color:var(--accent)] px-6 text-sm font-semibold text-[color:var(--accent-contrast)]"
              >
                Empezar entrenamiento
              </button>
            ) : null}
          </div>
        </section>
      ) : isSessionDetailLoading ? (
        <section
          className="session-summary-loading flex min-h-[300px] flex-col items-center justify-center rounded-2xl bg-[color:var(--card)] px-6 text-center"
          role="status"
        >
          <LoaderCircle className="h-8 w-8 animate-spin text-[color:var(--text-muted)]" />
          <h2 className="mt-5 text-lg font-semibold">Cargando el detalle</h2>
          <p className="mt-2 text-sm font-normal text-[color:var(--text-muted)]">
            Estamos preparando las series y comparaciones de esta sesión.
          </p>
        </section>
      ) : (
        <>
          <section className="session-summary-metrics grid grid-cols-2 gap-3 lg:grid-cols-5">
            <MetricCard
              label="Ejercicios"
              value={totals.exercises || "--"}
              detail={
                totals.exercises === 1
                  ? "ejercicio completado"
                  : "ejercicios completados"
              }
              icon={ListChecks}
              accent
            />
            <MetricCard
              label="Series"
              value={totals.sets || "--"}
              detail={comparisonText(sessionReference.setsDelta)}
              icon={Layers3}
            />
            <MetricCard
              label="Repeticiones"
              value={totals.reps || "--"}
              detail="repeticiones completadas"
              icon={Repeat2}
            />
            <MetricCard
              label="Duración"
              value={duration(currentRaw?.durationSeconds)}
              detail={`${exerciseCountLabel(totals.exercises)} ${totals.exercises === 1 ? "completado" : "completados"}`}
              icon={Clock3}
            />
            <MetricCard
              label="Calorías activas"
              value={
                calorieEstimate.available
                  ? `${calorieEstimate.calories} cal`
                  : "--"
              }
              detail={
                calorieEstimate.available
                  ? `${calorieEstimate.minCalories}–${calorieEstimate.maxCalories} cal · ver detalle`
                  : "sin datos suficientes"
              }
              icon={Flame}
              accent
              onClick={
                calorieEstimate.available ? () => setIsCaloriesOpen(true) : null
              }
              className="col-span-2 lg:col-span-1"
            />
          </section>

          <CalorieEstimateModal
            open={isCaloriesOpen}
            onClose={() => setIsCaloriesOpen(false)}
            summary={calorieSummary}
            estimates={
              calorieEstimate.available ? [calorieEstimateWithSession] : []
            }
            periodLabel="Entrenamiento completado"
          />

          <section className="session-summary-insight rounded-xl bg-[color:var(--accent)] px-5 py-4 text-[color:var(--accent-contrast)]">
            <p className="text-[10px] font-black uppercase text-current">
              Lectura de la sesión
            </p>
            <p className="mt-1 text-[13px] font-semibold text-current/80">
              {sessionInsight}
            </p>
          </section>

          <section className="session-summary-section">
            <div className="mb-2 flex items-end justify-between gap-3">
              <div>
                <p className="session-summary-kicker text-[10px] font-black uppercase text-[#352018] dark:text-[#e2ff00]">
                  Enfoque muscular
                </p>
                <h2 className="mt-1 text-xl font-black uppercase">
                  Qué músculos trabajaste
                </h2>
              </div>
              {muscleRows.length ? (
                <span className="session-summary-muscle-total text-right text-[11px] font-semibold text-[color:var(--text-muted)]">
                  100% de las series
                </span>
              ) : null}
            </div>
            <div className="session-summary-muscle-card overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--card)]">
              {muscleRows.length ? (
                <>
                  <div className="session-summary-muscle-lead flex items-center justify-between gap-5 p-5">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase text-[color:var(--text-muted)]">
                        Mayor enfoque
                      </p>
                      <h3 className="mt-1 truncate text-2xl font-semibold">
                        {muscleRows[0].label}
                      </h3>
                      <p className="mt-2 text-sm font-normal text-[color:var(--text-muted)]">
                        {countLabel(
                          muscleRows[0].today?.setsCount,
                          "serie",
                          "series",
                        )}{" "}
                        ·{" "}
                        {countLabel(
                          muscleRows[0].today?.repsTotal,
                          "repetición",
                          "repeticiones",
                        )}
                      </p>
                    </div>
                    <div
                      className="session-summary-muscle-ring grid shrink-0 place-items-center rounded-full"
                      style={{
                        "--muscle-share": `${
                          Math.max(0, Math.min(100, muscleRows[0].share)) * 3.6
                        }deg`,
                      }}
                      aria-label={`${Math.round(muscleRows[0].share)} por ciento de las series completadas`}
                    >
                      <span className="relative z-[1] text-center">
                        <strong className="block text-xl font-semibold leading-none">
                          {Math.round(muscleRows[0].share)}%
                        </strong>
                        <small className="mt-1 block text-[9px] font-medium text-[color:var(--text-muted)]">
                          de series
                        </small>
                      </span>
                    </div>
                  </div>

                  <p className="session-summary-muscle-explanation border-t border-[color:var(--detail-row-divider)] px-5 py-3 text-xs font-normal leading-5 text-[color:var(--text-muted)]">
                    El porcentaje indica qué parte de tus series completadas
                    trabajó cada grupo muscular.
                  </p>

                  {muscleRows.length > 1 ? (
                    <div className="session-summary-muscle-ranking divide-y divide-[color:var(--detail-row-divider)] border-t border-[color:var(--detail-row-divider)]">
                      {muscleRows.slice(1).map((muscle) => (
                        <div key={muscle.muscleKey} className="px-5 py-4">
                          <div className="flex items-baseline justify-between gap-4">
                            <p className="truncate text-sm font-semibold">
                              {muscle.label}
                            </p>
                            <strong className="shrink-0 text-base font-semibold">
                              {Math.round(muscle.share)}%
                            </strong>
                          </div>
                          <div className="session-summary-muscle-bar mt-2 overflow-hidden rounded-full bg-[color:var(--surface-subtle)]">
                            <div
                              className="h-full rounded-full bg-[color:var(--accent)]"
                              style={{ width: `${muscle.share}%` }}
                            />
                          </div>
                          <p className="mt-2 text-xs font-normal text-[color:var(--text-muted)]">
                            {countLabel(
                              muscle.today?.setsCount,
                              "serie",
                              "series",
                            )}{" "}
                            ·{" "}
                            {countLabel(
                              muscle.today?.repsTotal,
                              "repetición",
                              "repeticiones",
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="px-5 py-10 text-center text-sm font-normal leading-6 text-[color:var(--text-muted)]">
                  Esta sesión no tiene suficientes series para calcular el
                  enfoque muscular.
                </p>
              )}
            </div>
          </section>

          <section className="session-summary-section">
            <div className="mb-2 flex items-end justify-between gap-3">
              <div>
                <p className="session-summary-kicker text-[10px] font-black uppercase text-[#352018] dark:text-[#e2ff00]">
                  Detalle
                </p>
                <h2 className="mt-1 text-xl font-black uppercase">
                  Ejercicios realizados
                </h2>
              </div>
              <span className="text-[11px] font-bold text-[color:var(--text-muted)]">
                {exerciseCountLabel(exerciseRows.length)}
              </span>
            </div>
            <div className="session-summary-list session-summary-exercise-list divide-y divide-[color:var(--border)] border border-[color:var(--border)] bg-[color:var(--card)]">
              {exerciseRows.length ? (
                exerciseRows.map((entry) => {
                  const exercise = entry.today || {};
                  const progress = formatExerciseProgress(entry.comparison);
                  const ProgressIcon =
                    progress.direction === "up"
                      ? TrendingUp
                      : progress.direction === "down"
                        ? TrendingDown
                        : Minus;
                  const meta = exerciseMeta.find(
                    (item) => item.id === exercise.exerciseId,
                  );
                  const image = meta
                    ? getExerciseImageUrl(meta, { width: 240, height: 240 })
                    : "";
                  return (
                    <button
                      key={`${entry.order}-${exercise.exerciseId}`}
                      type="button"
                      onClick={() => handleViewExercise(exercise.exerciseId)}
                      className="group grid w-full grid-cols-[76px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 text-left transition hover:bg-[color:var(--accent)] hover:text-[color:var(--accent-contrast)] sm:grid-cols-[92px_minmax(180px,1fr)_auto]"
                    >
                      <span className="relative h-20 w-[76px] border border-[color:var(--border)] sm:h-24 sm:w-[92px]">
                        <ExerciseThumbnail
                          src={image}
                          className="h-full w-full"
                        />
                        <span className="session-summary-exercise-order absolute left-0 top-0 grid h-5 min-w-5 place-items-center bg-[#1a1a1a] px-1 text-[9px] font-black text-white dark:bg-[#e2ff00] dark:text-black">
                          {entry.order}
                        </span>
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black uppercase">
                          {exercise.exerciseName}
                        </span>
                        <span className="mt-0.5 block truncate text-[10px] font-semibold text-[color:var(--text-muted)] group-hover:text-current/80">
                          {formatMuscleGroup(
                            exercise.muscleGroup || "Sin grupo",
                          )}{" "}
                          · {countLabel(exercise.setsCount, "serie", "series")}{" "}
                          ·{" "}
                          {countLabel(
                            exercise.repsTotal,
                            "repetición",
                            "repeticiones",
                          )}
                        </span>
                      </span>
                      <span className="flex items-center gap-2 justify-self-end">
                        <span
                          className={`min-w-[3.75rem] text-right ${
                            progress.direction === "up"
                              ? "text-emerald-600 dark:text-emerald-300"
                              : progress.direction === "down"
                                ? "text-red-600 dark:text-red-300"
                                : "text-[color:var(--text-muted)]"
                          }`}
                          aria-label={`${progress.detail}: ${progress.label}`}
                        >
                          <span className="flex items-center justify-end gap-1 text-sm font-black tabular-nums">
                            <ProgressIcon className="h-3.5 w-3.5" />
                            {progress.label}
                          </span>
                          <span className="mt-0.5 block text-[9px] font-semibold">
                            {progress.detail}
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 text-[color:var(--text-muted)]" />
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="px-4 py-10 text-center">
                  <CalendarDays className="mx-auto h-7 w-7 text-[color:var(--text-muted)]" />
                  <p className="mt-3 text-sm font-semibold text-[color:var(--text-muted)]">
                    Esta sesión no contiene ejercicios completados.
                  </p>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

SessionSummaryPage.propTypes = {
  sessions: PropTypes.arrayOf(PropTypes.object),
  currentSession: PropTypes.object,
  onViewExerciseAnalytics: PropTypes.func,
  onNavigate: PropTypes.func,
  onBack: PropTypes.func,
};
