import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, Search } from "lucide-react";
import ExerciseAnalytics from "../components/analytics/ExerciseAnalytics";
import ExerciseThumbnail from "../components/analytics/ExerciseThumbnail";
import MuscleGroupAnalytics from "../components/analytics/MuscleGroupAnalytics";
import MobilePageHeader from "../components/layout/MobilePageHeader";
import { useTrainingData } from "../context/TrainingContext";
import { useThemeMode } from "../hooks/useThemeMode";
import { api } from "../services/api";
import { getExerciseImageUrl } from "../utils/cloudinary";
import { summarizeExerciseSets } from "../utils/exerciseAnalyticsData";
import { getEffectiveWeightKg } from "../utils/weightConfig";

const ANALYTICS_VIEW_KEY = "exercise_analytics_view";

const readAnalyticsView = () => {
  if (typeof sessionStorage === "undefined") return {};
  try {
    return JSON.parse(sessionStorage.getItem(ANALYTICS_VIEW_KEY) || "{}");
  } catch {
    return {};
  }
};

const DAY_MS = 24 * 60 * 60 * 1000;

const slugify = (text = "") =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const toTimestamp = (value) => {
  const date = value
    ? new Date(`${String(value).slice(0, 10)}T12:00:00`)
    : null;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
};

const percent = (value) => {
  if (!Number.isFinite(value)) return "--";
  return `${value > 0 ? "+" : ""}${Math.round(value)}%`;
};

const formatDate = (value) =>
  value
    ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString(
        "es-BO",
        { day: "2-digit", month: "short", year: "2-digit" },
      )
    : "--";

const flattenSets = (sets = [], weightConfig = {}) =>
  (sets || []).flatMap((set) => {
    const entries =
      Array.isArray(set?.entries) && set.entries.length ? set.entries : [set];
    return entries
      .map((entry) => ({
        weight: getEffectiveWeightKg(
          entry?.weightKg ?? entry?.weight ?? entry?.kg,
          weightConfig,
        ),
        reps: Number(entry?.reps ?? 0) || 0,
      }))
      .filter((entry) => entry.weight > 0 && entry.reps > 0);
  });

function MetricCard({ label, value, detail, accent = false }) {
  return (
    <article className="dashboard-pilot__metric dashboard-weekly-metric w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-left shadow-sm dark:rounded-[4px] dark:shadow-none">
      <p className="dashboard-weekly-metric__label text-[color:var(--text-muted)]">
        {label}
      </p>
      <div className="dashboard-weekly-metric__value-row flex items-end gap-1.5">
        <span
          className={`dashboard-weekly-metric__value ${accent ? "text-[#352018] dark:text-[#e2ff00]" : "text-[color:var(--text)]"}`}
        >
          {value}
        </span>
      </div>
      <div className="dashboard-weekly-metric__footer">
        <span>{detail}</span>
      </div>
    </article>
  );
}

export default function ExerciseAnalyticsPage({
  onBack = null,
  onNavigate = null,
  onMobileNavVisibilityChange = () => {},
}) {
  const [pageOpenedAt] = useState(() => Date.now());
  const [initialView] = useState(readAnalyticsView);
  const {
    sessions = [],
    trainings = [],
    exercises = [],
    dataOwnerId = "",
  } = useTrainingData();
  const { isDark } = useThemeMode();
  const [selectedExerciseId, setSelectedExerciseId] = useState(() =>
    typeof localStorage === "undefined"
      ? ""
      : localStorage.getItem("last_exercise_id") || "",
  );
  const [selectedMuscle, setSelectedMuscle] = useState(
    initialView.selectedMuscle || "",
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState(initialView.query || "");
  const [analyticsScope, setAnalyticsScope] = useState(
    initialView.scope === "muscle" ? "muscle" : "exercise",
  );
  const [exerciseView, setExerciseView] = useState("progress");
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [visibleHistorySessions, setVisibleHistorySessions] = useState(10);

  useEffect(() => {
    onMobileNavVisibilityChange(true);
    return () => onMobileNavVisibilityChange(false);
  }, [onMobileNavVisibilityChange]);

  useEffect(() => {
    if (typeof sessionStorage === "undefined") return;
    sessionStorage.setItem(
      ANALYTICS_VIEW_KEY,
      JSON.stringify({ selectedMuscle, query, scope: analyticsScope }),
    );
  }, [analyticsScope, query, selectedMuscle]);

  const workouts = useMemo(
    () => [
      ...sessions
        .filter((session) => session.exerciseId)
        .map((session, index) => ({
          exerciseId: session.exerciseId || slugify(session.exerciseName),
          date: session.date,
          routineName: session.routineName || "",
          sessionKey: `session:${session.id || `${session.date}:${index}`}`,
          sets: flattenSets(session.sets),
        })),
      ...trainings.flatMap((training) =>
        (training.exercises || [])
          .filter((exercise) => exercise.exerciseId || exercise.exerciseName)
          .map((exercise, index) => ({
            exerciseId: exercise.exerciseId || slugify(exercise.exerciseName),
            date: training.date,
            routineName: training.routineName || "",
            sessionKey: `training:${training.id || `${training.date}:${index}`}`,
            sets: flattenSets(exercise.sets, exercise),
          })),
      ),
    ],
    [sessions, trainings],
  );

  const exerciseCountsQuery = useQuery({
    queryKey: ["exercise-analytics-counts", dataOwnerId || "self"],
    queryFn: () =>
      api.getExerciseHistoryCounts({ athleteId: dataOwnerId || undefined }),
    staleTime: 60_000,
  });
  const exerciseCountById = useMemo(
    () =>
      new Map(
        (exerciseCountsQuery.data?.exercises || []).map((item) => [
          String(item.exerciseId),
          Number(item.trainingCount) || Number(item.legacyCount) || 0,
        ]),
      ),
    [exerciseCountsQuery.data?.exercises],
  );

  const localExerciseCountById = useMemo(() => {
    const counts = new Map();
    workouts.forEach((workout) => {
      const exerciseId = String(workout.exerciseId || "");
      if (!exerciseId || !workout.sets.length) return;
      counts.set(exerciseId, (counts.get(exerciseId) || 0) + 1);
    });
    return counts;
  }, [workouts]);

  const exerciseSessionCountById = useMemo(() => {
    if (!exerciseCountsQuery.isSuccess) return localExerciseCountById;
    return exerciseCountById;
  }, [
    exerciseCountById,
    exerciseCountsQuery.isSuccess,
    localExerciseCountById,
  ]);

  const trainedExerciseIds = useMemo(
    () =>
      new Set(
        [...exerciseSessionCountById.entries()]
          .filter(([, count]) => count > 0)
          .map(([exerciseId]) => exerciseId),
      ),
    [exerciseSessionCountById],
  );
  const exerciseOptions = useMemo(() => {
    const trained = exercises.filter((exercise) =>
      trainedExerciseIds.has(String(exercise.id)),
    );
    return [...(trained.length ? trained : exercises)].sort((left, right) => {
      const sessionDifference =
        (exerciseSessionCountById.get(String(right.id)) || 0) -
        (exerciseSessionCountById.get(String(left.id)) || 0);
      return (
        sessionDifference ||
        String(left.name || "").localeCompare(String(right.name || ""), "es")
      );
    });
  }, [exerciseSessionCountById, exercises, trainedExerciseIds]);
  const muscleOptions = useMemo(
    () =>
      Array.from(
        new Set(
          exerciseOptions.map(
            (exercise) =>
              exercise.muscle || exercise.muscleGroup || "Sin grupo",
          ),
        ),
      ).sort((left, right) => left.localeCompare(right, "es")),
    [exerciseOptions],
  );
  const selectedFromState = exerciseOptions.find(
    (exercise) => exercise.id === selectedExerciseId,
  );
  const effectiveMuscle =
    selectedMuscle ||
    selectedFromState?.muscle ||
    selectedFromState?.muscleGroup ||
    muscleOptions[0] ||
    "";
  const muscleExercises = useMemo(
    () =>
      exerciseOptions.filter(
        (exercise) =>
          (exercise.muscle || exercise.muscleGroup || "Sin grupo") ===
          effectiveMuscle,
      ),
    [effectiveMuscle, exerciseOptions],
  );
  const effectiveExerciseId =
    selectedExerciseId &&
    muscleExercises.some((item) => item.id === selectedExerciseId)
      ? selectedExerciseId
      : muscleExercises[0]?.id || exerciseOptions[0]?.id || "";
  const selectedExercise =
    exerciseOptions.find((exercise) => exercise.id === effectiveExerciseId) ||
    null;

  const exerciseHistoryQuery = useQuery({
    queryKey: [
      "exercise-analytics-history",
      effectiveExerciseId,
      dataOwnerId || "self",
    ],
    queryFn: () =>
      api.getExerciseHistory({
        exerciseId: effectiveExerciseId,
        athleteId: dataOwnerId || undefined,
      }),
    enabled: Boolean(effectiveExerciseId && analyticsScope === "exercise"),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!effectiveExerciseId || typeof localStorage === "undefined") return;
    localStorage.setItem("last_exercise_id", effectiveExerciseId);
  }, [effectiveExerciseId]);

  const completeExerciseWorkouts = useMemo(
    () =>
      (exerciseHistoryQuery.data?.items || []).flatMap((training) =>
        (training.exercises || [])
          .filter((exercise) => exercise.exerciseId === effectiveExerciseId)
          .map((exercise, index) => ({
            exerciseId: effectiveExerciseId,
            date: training.date,
            routineName: training.routineName || "",
            sessionKey: `training:${training._id || training.id || `${training.date}:${index}`}`,
            sets: flattenSets(exercise.sets, exercise),
          })),
      ),
    [effectiveExerciseId, exerciseHistoryQuery.data?.items],
  );

  const selectedWorkouts = useMemo(() => {
    if (exerciseHistoryQuery.isSuccess) return completeExerciseWorkouts;
    return workouts.filter(
      (workout) => workout.exerciseId === effectiveExerciseId,
    );
  }, [
    completeExerciseWorkouts,
    effectiveExerciseId,
    exerciseHistoryQuery.isSuccess,
    workouts,
  ]);

  const analyticsWorkouts = useMemo(() => {
    if (!exerciseHistoryQuery.isSuccess) return workouts;
    return [
      ...workouts.filter(
        (workout) => workout.exerciseId !== effectiveExerciseId,
      ),
      ...completeExerciseWorkouts,
    ];
  }, [
    completeExerciseWorkouts,
    effectiveExerciseId,
    exerciseHistoryQuery.isSuccess,
    workouts,
  ]);

  const stats = useMemo(() => {
    const summaries = selectedWorkouts
      .map((workout) => {
        const sets = workout.sets || [];
        const summary = summarizeExerciseSets(sets);
        return {
          sessionKey: workout.sessionKey,
          date: workout.date,
          routineName: workout.routineName || "",
          timestamp: toTimestamp(workout.date),
          topSet: summary.topSet,
          oneRM: summary.strength,
          volume: summary.volume,
          sets: summary.setsCount,
          setDetails: sets,
        };
      })
      .filter((item) => item.timestamp && (item.volume > 0 || item.oneRM > 0))
      .sort((left, right) => left.timestamp - right.timestamp);
    const oneRMValues = summaries.filter((item) => item.oneRM > 0);
    const latest = oneRMValues[oneRMValues.length - 1]?.oneRM || 0;
    const previous = oneRMValues[oneRMValues.length - 2]?.oneRM || 0;
    const best = oneRMValues.reduce(
      (record, item) => (item.oneRM > (record?.oneRM || 0) ? item : record),
      null,
    );
    return {
      summaries,
      sessions: summaries.length,
      latestDate: summaries[summaries.length - 1]?.date || null,
      latestOneRM: latest,
      best,
      vsPrevious:
        previous && latest ? ((latest - previous) / previous) * 100 : null,
    };
  }, [selectedWorkouts]);

  const historySeries = useMemo(
    () =>
      Array.from(
        {
          length: Math.max(
            0,
            ...stats.summaries.map((item) => item.setDetails.length),
          ),
        },
        (_, index) => index,
      ),
    [stats.summaries],
  );

  const filteredPickerExercises = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    return muscleExercises.filter(
      (exercise) =>
        !normalized ||
        exercise.name.toLocaleLowerCase("es").includes(normalized),
    );
  }, [muscleExercises, query]);

  const exerciseName = selectedExercise?.name || "Ejercicio";
  const selectedImage = selectedExercise
    ? getExerciseImageUrl(selectedExercise, { width: 240, height: 240 })
    : "";
  const daysSinceLast = stats.latestDate
    ? Math.max(
        0,
        Math.floor((pageOpenedAt - toTimestamp(stats.latestDate)) / DAY_MS),
      )
    : null;
  const handleReturn = () => {
    if (onBack) {
      onBack("dashboard");
      return;
    }
    onNavigate?.("dashboard");
  };
  return (
    <main className="exercise-analytics-page analytics-shell mx-auto w-full max-w-md space-y-5 pb-8 text-[color:var(--text)] md:max-w-5xl md:pb-24 xl:max-w-6xl 2xl:max-w-[1280px]">
      <MobilePageHeader
        title="Analítica"
        variant="detail"
        onBack={handleReturn}
      />
      <header className="exercise-analytics-page__header hidden items-center gap-3 md:flex">
        <button
          type="button"
          onClick={handleReturn}
          aria-label="Volver a la página anterior"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[color:var(--text)] transition-colors hover:bg-[color:var(--surface-subtle)]"
        >
          <ArrowLeft className="h-6 w-6" strokeWidth={2.1} />
        </button>
        <h1 className="text-[36px] font-medium leading-none tracking-[-0.035em]">
          Analítica
        </h1>
      </header>

      <div className="grid grid-cols-2 rounded-xl bg-[color:var(--segmented-surface)] p-1">
        <button
          type="button"
          onClick={() => setAnalyticsScope("exercise")}
          aria-pressed={analyticsScope === "exercise"}
          className={`h-10 rounded-lg text-sm font-medium transition-all ${
            analyticsScope === "exercise"
              ? "theme-accent-solid shadow-sm"
              : "text-[color:var(--text-muted)]"
          }`}
        >
          Ejercicio
        </button>
        <button
          type="button"
          onClick={() => {
            setAnalyticsScope("muscle");
            setPickerOpen(false);
          }}
          aria-pressed={analyticsScope === "muscle"}
          className={`h-10 rounded-lg text-sm font-medium transition-all ${
            analyticsScope === "muscle"
              ? "theme-accent-solid shadow-sm"
              : "text-[color:var(--text-muted)]"
          }`}
        >
          Grupo muscular
        </button>
      </div>

      <section className="exercise-analytics-controls space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-normal text-[color:var(--text-muted)]">
            Grupo muscular
          </span>
          <select
            value={effectiveMuscle}
            onChange={(event) => {
              setSelectedMuscle(event.target.value);
              setSelectedExerciseId("");
              setPickerOpen(false);
              setShowAllSessions(false);
              setVisibleHistorySessions(10);
            }}
            className="theme-accent-focus h-12 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 text-sm font-medium outline-none"
          >
            {muscleOptions.map((muscle) => (
              <option key={muscle}>{muscle}</option>
            ))}
          </select>
        </label>

        {analyticsScope === "exercise" ? (
          <div className="relative">
            <p className="mb-1.5 text-xs font-normal text-[color:var(--text-muted)]">
              Ejercicio
            </p>
            <button
              type="button"
              onClick={() => setPickerOpen((value) => !value)}
              aria-expanded={pickerOpen}
              className="flex min-h-[88px] w-full items-center gap-3 rounded-2xl bg-[color:var(--card)] p-3 text-left transition-colors hover:bg-[color:var(--surface-subtle)]"
            >
              <ExerciseThumbnail
                src={selectedImage}
                alt={exerciseName}
                className="exercise-analytics-thumb h-16 w-16 rounded-xl"
              />
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 block text-[17px] font-medium leading-[1.2] tracking-[-0.02em] sm:text-xl">
                  {exerciseName}
                </span>
                <span className="mt-1.5 block text-xs font-normal text-[color:var(--text-muted)]">
                  {effectiveMuscle} · {stats.sessions}{" "}
                  {stats.sessions === 1 ? "sesión" : "sesiones"}
                </span>
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition ${pickerOpen ? "rotate-180" : ""}`}
              />
            </button>
            {pickerOpen ? (
              <div className="mt-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-2 shadow-sm">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar ejercicio"
                    className="h-11 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] pl-10 pr-3 text-sm outline-none transition-colors focus:border-[color:var(--border-strong)]"
                  />
                </label>
                <div className="mt-2 max-h-72 space-y-1 overflow-y-auto">
                  {filteredPickerExercises.map((exercise) => {
                    const completeExerciseSessions =
                      exerciseSessionCountById.get(String(exercise.id)) || 0;
                    const isSelected = exercise.id === effectiveExerciseId;

                    return (
                      <button
                        key={exercise.id}
                        type="button"
                        onClick={() => {
                          setSelectedExerciseId(exercise.id);
                          setPickerOpen(false);
                          setQuery("");
                          setShowAllSessions(false);
                          setVisibleHistorySessions(10);
                        }}
                        className={`flex min-h-[68px] w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-[color:var(--surface-subtle)] ${
                          isSelected ? "bg-[color:var(--surface-subtle)]" : ""
                        }`}
                      >
                        <ExerciseThumbnail
                          src={getExerciseImageUrl(exercise, {
                            width: 120,
                            height: 120,
                          })}
                          alt=""
                          className="exercise-analytics-thumb h-12 w-12 shrink-0 rounded-lg"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 block text-sm font-medium leading-tight text-[color:var(--text)]">
                            {exercise.name}
                          </span>
                          <span className="mt-1 block text-xs font-normal text-[color:var(--text-muted)]">
                            {completeExerciseSessions}{" "}
                            {completeExerciseSessions === 1
                              ? "sesión"
                              : "sesiones"}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                  {!filteredPickerExercises.length ? (
                    <p className="px-3 py-6 text-center text-sm text-[color:var(--text-muted)]">
                      Sin coincidencias.
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {analyticsScope === "exercise" ? (
        <>
          <section className="analytics-summary-grid dashboard-weekly-grid">
            <MetricCard
              label="Fuerza actual"
              value={
                stats.latestOneRM ? `${Math.round(stats.latestOneRM)} kg` : "--"
              }
              detail={stats.best ? "Valor estimado" : "Sin datos"}
            />
            <MetricCard
              label="Último cambio"
              value={percent(stats.vsPrevious)}
              detail={
                stats.sessions > 1
                  ? "Vs. sesión anterior"
                  : "Requiere 2 sesiones"
              }
              accent
            />
            <MetricCard
              label="Sesiones"
              value={stats.sessions || "--"}
              detail={
                daysSinceLast === null
                  ? "Sin historial"
                  : daysSinceLast
                    ? `Última: hace ${daysSinceLast} días`
                    : "Entrenado hoy"
              }
            />
            <MetricCard
              label="Mejor marca"
              value={stats.best ? `${Math.round(stats.best.oneRM)} kg` : "--"}
              detail={stats.best ? formatDate(stats.best.date) : "Sin datos"}
            />
          </section>

          <ExerciseAnalytics
            exerciseId={effectiveExerciseId}
            workouts={analyticsWorkouts}
            mode={isDark ? "dark" : "light"}
          />

          <div className="grid grid-cols-2 border-b border-[color:var(--border)]">
            {[
              ["progress", "Sesiones"],
              ["history", "Historial"],
            ].map(([view, label]) => (
              <button
                key={view}
                type="button"
                onClick={() => setExerciseView(view)}
                className={`h-11 border-b-2 text-sm font-medium transition-colors ${
                  exerciseView === view
                    ? "border-[#352018] text-[color:var(--text)] dark:border-[#e2ff00]"
                    : "border-transparent text-[color:var(--text-muted)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {exerciseView === "progress" ? (
            <section>
              <div className="mb-2 flex items-end justify-between gap-3">
                <h2 className="text-xl font-medium tracking-[-0.025em]">
                  Sesiones
                </h2>
                <p className="text-xs text-[color:var(--text-muted)]">
                  {stats.sessions} en total
                </p>
              </div>
              <div className="analytics-history__head grid grid-cols-[78px_minmax(0,1fr)_auto] gap-2 px-3 pb-1.5 text-[11px] text-[color:var(--text-muted)]">
                <span>Fecha</span>
                <span>Mejor serie</span>
                <span className="text-right">Fuerza estimada</span>
              </div>
              <div className="divide-y divide-[color:var(--border)] overflow-hidden rounded-2xl bg-[color:var(--card)]">
                {stats.summaries.length ? (
                  [...stats.summaries]
                    .reverse()
                    .slice(0, showAllSessions ? undefined : 6)
                    .map((item) => (
                      <div
                        key={item.sessionKey}
                        className="grid min-h-11 grid-cols-[78px_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2"
                      >
                        <p className="text-xs font-black">
                          {formatDate(item.date)}
                        </p>
                        <p className="truncate text-xs font-semibold text-[color:var(--text-muted)]">
                          {item.topSet
                            ? `${item.topSet.weight} kg × ${item.topSet.reps}`
                            : "Sin top set"}
                        </p>
                        <p className="text-right text-sm font-semibold text-[#352018] dark:text-[#e2ff00]">
                          {item.oneRM ? `${item.oneRM.toFixed(1)} kg` : "--"}
                        </p>
                      </div>
                    ))
                ) : (
                  <p className="px-4 py-8 text-center text-sm font-semibold text-[color:var(--text-muted)]">
                    Este ejercicio aún no tiene sesiones registradas.
                  </p>
                )}
              </div>
              {stats.summaries.length > 6 ? (
                <button
                  type="button"
                  onClick={() => setShowAllSessions((value) => !value)}
                  className="mt-3 h-11 w-full text-sm font-semibold text-[color:var(--text)]"
                >
                  {showAllSessions ? "Ver menos" : "Ver más"}
                </button>
              ) : null}
            </section>
          ) : (
            <section>
              <div className="mb-3 flex items-end justify-between gap-3">
                <h2 className="text-xl font-medium tracking-[-0.025em]">
                  Historial completo
                </h2>
                <p className="text-xs text-[color:var(--text-muted)]">
                  {stats.sessions}{" "}
                  {stats.sessions === 1 ? "sesión" : "sesiones"}
                </p>
              </div>

              {historySeries.length ? (
                <div className="overflow-x-auto pb-1">
                  <div
                    style={{ minWidth: `${78 + historySeries.length * 72}px` }}
                  >
                    <div
                      className="grid px-3 pb-1.5 text-[10px] font-medium text-[color:var(--text-muted)]"
                      style={{
                        gridTemplateColumns: `78px repeat(${historySeries.length}, minmax(72px, 1fr))`,
                      }}
                    >
                      <span>Fecha</span>
                      {historySeries.map((seriesIndex) => (
                        <span
                          key={`history-series-heading:${seriesIndex}`}
                          className="border-l border-[color:var(--detail-row-divider)] px-2"
                        >
                          Serie {seriesIndex + 1}
                        </span>
                      ))}
                    </div>

                    <div className="divide-y divide-[color:var(--border)] overflow-hidden rounded-xl bg-[color:var(--card)]">
                      {[...stats.summaries]
                        .reverse()
                        .slice(0, visibleHistorySessions)
                        .map((item) => (
                          <article
                            key={item.sessionKey}
                            className="grid min-h-11 items-center px-3 py-1.5"
                            style={{
                              gridTemplateColumns: `78px repeat(${historySeries.length}, minmax(72px, 1fr))`,
                            }}
                          >
                            <p
                              className="whitespace-nowrap pr-2 text-xs font-semibold"
                              title={item.routineName || undefined}
                            >
                              {formatDate(item.date)}
                            </p>
                            {historySeries.map((seriesIndex) => {
                              const set = item.setDetails[seriesIndex];
                              return (
                                <p
                                  key={`${item.sessionKey}:set:${seriesIndex}`}
                                  className="h-full content-center border-l border-[color:var(--detail-row-divider)] px-2 text-xs font-semibold"
                                >
                                  {set ? `${set.weight} × ${set.reps}` : "--"}
                                </p>
                              );
                            })}
                          </article>
                        ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="rounded-xl bg-[color:var(--card)] px-4 py-8 text-center text-sm font-semibold text-[color:var(--text-muted)]">
                  Este ejercicio aún no tiene historial registrado.
                </p>
              )}

              {visibleHistorySessions < stats.summaries.length ? (
                <button
                  type="button"
                  onClick={() =>
                    setVisibleHistorySessions((value) => value + 10)
                  }
                  className="mt-4 h-11 w-full text-sm font-semibold text-[color:var(--text)]"
                >
                  Ver más
                </button>
              ) : null}
            </section>
          )}
        </>
      ) : (
        <MuscleGroupAnalytics
          muscle={effectiveMuscle}
          exercises={exerciseOptions}
          workouts={workouts}
          mode={isDark ? "dark" : "light"}
        />
      )}
    </main>
  );
}
