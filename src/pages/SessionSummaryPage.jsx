import { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { CalendarDays, ChevronDown } from "lucide-react";
import TopBar from "../components/layout/TopBar";
import { summarizeSession } from "../utils/sessionAnalytics";
import { useTrainingData } from "../context/TrainingContext";
import { useRoutines } from "../context/RoutineContext";

const formatDateLong = (iso) =>
  iso
    ? new Date(`${iso}T00:00:00`).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "--";

const flattenSets = (sets = []) =>
  (sets || []).flatMap((set) => {
    const entries =
      Array.isArray(set?.entries) && set.entries.length ? set.entries : null;
    if (!entries) {
      return [
        {
          weightKg: Number(set?.weightKg ?? set?.weight ?? set?.kg ?? 0) || 0,
          reps: Number(set?.reps ?? 0) || 0,
        },
      ];
    }
    return entries.map((entry) => ({
      weightKg: Number(entry?.weightKg ?? entry?.weight ?? entry?.kg ?? 0) || 0,
      reps: Number(entry?.reps ?? 0) || 0,
    }));
  });

function SessionSummaryPage({
  sessions: propSessions = [],
  currentSession: propCurrentSession,
  onViewExerciseAnalytics = null,
  onNavigate = null,
}) {
  const { trainings: ctxTrainings = [], exercises: exerciseMeta = [] } =
    useTrainingData();
  const { routines = [] } = useRoutines();

  const [selectedId, setSelectedId] = useState(() => {
    if (typeof localStorage !== "undefined")
      return localStorage.getItem("last_training_id") || null;
    return null;
  });
  const [showList, setShowList] = useState(false);
  const [menuRoutine, setMenuRoutine] = useState("");
  const [showAllExercises, setShowAllExercises] = useState(false);
  const [isCompact, setIsCompact] = useState(true);

  const routineBranch = useMemo(() => {
    const map = new Map();
    routines.forEach((r) => map.set(r.id, r.branch || "general"));
    return map;
  }, [routines]);

  const normalizedCtxSessions = useMemo(() => {
    if (!ctxTrainings.length) return [];
    return ctxTrainings
      .map((t) => ({
        id: t.id || t._id || `${t.date}-${t.routineId || ""}`,
        date: t.date,
        routineName: t.routineName || "Entrenamiento",
        routineBranch: routineBranch.get(t.routineId) || "general",
        exercises: (t.exercises || []).map((ex) => ({
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          muscleGroup:
            ex.muscleGroup ||
            exerciseMeta.find((m) => m.id === ex.exerciseId)?.muscle ||
            "Sin grupo",
          sets: flattenSets(ex.sets || []),
        })),
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [ctxTrainings, exerciseMeta, routineBranch]);

  const { currentSummary, currentDate, currentId } = useMemo(() => {
    const baseSessions = propSessions.length
      ? propSessions
      : normalizedCtxSessions;

    if (!baseSessions.length)
      return {
        currentSummary: summarizeSession({}),
        currentDate: "",
        currentId: "",
      };

    const sorted = baseSessions
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const current =
      propCurrentSession ||
      sorted.find((s) => s.id === selectedId) ||
      sorted[0];

    return {
      currentSummary: summarizeSession(current || {}),
      currentDate: current?.date,
      currentId: current?.id,
    };
  }, [propSessions, normalizedCtxSessions, propCurrentSession, selectedId]);

  const summaryStats = useMemo(() => {
    const exercises = currentSummary.exercises || [];
    const totals = exercises.reduce(
      (acc, ex) => {
        acc.volume += ex.volume || 0;
        acc.sets += ex.setsCount || 0;
        acc.reps += ex.repsTotal || 0;
        acc.muscles.add(ex.muscleGroup || "otros");
        const score =
          (ex.topSet?.weightKg || 0) * 1000 + (ex.topSet?.reps || 0);
        if (!acc.best || score > acc.best.score) {
          acc.best = { exercise: ex, score };
        }
        return acc;
      },
      { volume: 0, sets: 0, reps: 0, muscles: new Set(), best: null }
    );
    return {
      totalExercises: exercises.length,
      totalVolume: Math.round(totals.volume),
      totalSets: totals.sets,
      totalReps: totals.reps,
      muscleCount: totals.muscles.size,
      best: totals.best?.exercise || null,
    };
  }, [currentSummary]);

  const sortedExercises = useMemo(() => {
    const list = [...(currentSummary.exercises || [])];
    list.sort((a, b) => (b.volume || 0) - (a.volume || 0));
    return list;
  }, [currentSummary]);

  const visibleExercises = useMemo(() => {
    if (isCompact) return sortedExercises.slice(0, 3);
    return showAllExercises ? sortedExercises : sortedExercises.slice(0, 5);
  }, [sortedExercises, showAllExercises, isCompact]);

  const handleViewProgress = (exerciseId) => {
    if (onViewExerciseAnalytics) onViewExerciseAnalytics(exerciseId);
    else if (onNavigate) onNavigate("ejercicio_analitica");
  };

  const groupedSessions = useMemo(() => {
    const map = new Map();
    normalizedCtxSessions.forEach((s) => {
      const key = s.routineName || "Sin rutina";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    });
    return Array.from(map.entries()).map(([routine, list]) => {
      const sorted = list
        .slice()
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      return [routine, sorted.slice(0, 6)];
    });
  }, [normalizedCtxSessions]);

  const selectedRoutineName =
    propCurrentSession?.routineName ||
    normalizedCtxSessions.find((s) => s.id === currentId)?.routineName ||
    "Seleccionar sesión";

  return (
    <>
      <TopBar
        title="Resumen de sesión"
        subtitle={`Sesión: ${formatDateLong(currentDate || "")}`}
      />

      {normalizedCtxSessions.length > 0 && (
        <div className="mb-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm">
          <p className="text-[12px] font-semibold tracking-wide text-[color:var(--text-muted)] uppercase">
            Sesiones recientes
          </p>

          <div className="mt-3 flex items-center gap-3">
            <div className="relative flex-1">
              <button
                type="button"
                onClick={() => setShowList((v) => !v)}
                className="
                  w-full rounded-2xl border border-[color:var(--border)]
                  bg-[color:var(--bg)] px-4 py-3 text-left
                  transition hover:bg-[color:var(--bg)]
                  focus:outline-none focus:ring-2 focus:ring-blue-500/25
                "
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-[color:var(--text)] truncate">
                      {selectedRoutineName}
                    </p>
                    <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                      {normalizedCtxSessions.length} guardadas
                    </p>
                  </div>
                  <ChevronDown className="h-5 w-5 text-[color:var(--text-muted)]" />
                </div>
              </button>

              {showList && (
                <>
                  <button
                    type="button"
                    aria-label="Cerrar menú"
                    onClick={() => setShowList(false)}
                    className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] md:hidden"
                  />

                  <div
                    className="
                      absolute z-50 mt-2 w-full
                      overflow-hidden
                      rounded-2xl
                      border border-[color:var(--border)]
                      bg-[color:var(--card)]
                      shadow-xl
                      md:max-w-[520px]
                    "
                    role="dialog"
                    aria-label="Sesiones recientes"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--border)]">
                      <p className="text-sm font-semibold text-[color:var(--text)]">
                        Seleccionar sesión
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowList(false)}
                        className="
                          rounded-lg px-2 py-1 text-sm font-semibold
                          text-[color:var(--text-muted)] hover:bg-[color:var(--bg)]
                        "
                      >
                        Cerrar
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr]">
                      <div className="md:border-r border-[color:var(--border)]">
                        <div className="px-4 pt-3 pb-2">
                          <p className="text-[11px] font-semibold tracking-wide text-[color:var(--text-muted)] uppercase">
                            Rutinas
                          </p>
                        </div>

                        <div className="max-h-56 md:max-h-80 overflow-auto pb-2">
                          {groupedSessions.map(([routine]) => {
                            const active = routine === menuRoutine;
                            return (
                              <button
                                key={routine}
                                type="button"
                                onClick={() =>
                                  setMenuRoutine((prev) =>
                                    prev === routine ? "" : routine
                                  )
                                }
                                className={`w-full text-left px-4 py-2.5 text-sm transition ${
                                  active
                                    ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                                    : "text-[color:var(--text)] hover:bg-[color:var(--bg)]"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="truncate font-medium">
                                    {routine}
                                  </span>
                                  <span
                                    className={`text-xs ${
                                      active
                                        ? "text-blue-700/80 dark:text-blue-300/80"
                                        : "text-[color:var(--text-muted)]"
                                    }`}
                                  >
                                    ›
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <div className="px-4 pt-3 pb-2">
                          <p className="text-[11px] font-semibold tracking-wide text-[color:var(--text-muted)] uppercase">
                            Fechas
                          </p>
                        </div>

                        <div className="max-h-56 md:max-h-80 overflow-auto pb-2">
                          {menuRoutine ? (
                            (groupedSessions.find(
                              ([r]) => r === menuRoutine
                            )?.[1] || []
                            ).map((s) => {
                              const isCurrent = s.id === currentId;
                              return (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedId(s.id);
                                    setShowList(false);
                                  }}
                                  className={`w-full text-left px-4 py-2.5 text-sm transition ${
                                    isCurrent
                                      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"
                                      : "text-[color:var(--text)] hover:bg-[color:var(--bg)]"
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="font-semibold truncate">
                                        {formatDateLong(s.date)}
                                      </p>
                                      <p className="text-xs text-[color:var(--text-muted)] truncate">
                                        {s.routineName}
                                      </p>
                                    </div>

                                    <span className="shrink-0 inline-flex items-center rounded-full bg-[color:var(--bg)] text-[color:var(--text)] text-[11px] px-2 py-0.5">
                                      {s.routineBranch || "general"}
                                    </span>
                                  </div>
                                </button>
                              );
                            })
                          ) : (
                            <div className="px-4 py-10 text-sm text-[color:var(--text-muted)]">
                              Selecciona una rutina para ver sus fechas.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              className="
                h-12 w-12 rounded-2xl border border-[color:var(--border)]
                bg-[color:var(--card)] grid place-items-center
                text-[color:var(--text-muted)] transition hover:bg-[color:var(--bg)]
                focus:outline-none focus:ring-2 focus:ring-blue-500/25
              "
              onClick={() => setShowList(true)}
              aria-label="Abrir selector"
            >
              <CalendarDays className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <section className="mb-6 space-y-4">
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[12px] font-semibold tracking-wide text-[color:var(--text-muted)] uppercase">
              Resumen rápido
            </p>
            <button
              type="button"
              onClick={() => setIsCompact((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-1 text-[11px] font-semibold text-[color:var(--text)]"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isCompact ? "bg-emerald-500" : "bg-slate-300"
                }`}
              />
              {isCompact ? "Modo compacto" : "Vista detallada"}
            </button>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                Ejercicios
              </p>
              <p className="text-lg font-semibold text-[color:var(--text)]">
                {summaryStats.totalExercises || 0}
              </p>
            </div>
            <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                Sets
              </p>
              <p className="text-lg font-semibold text-[color:var(--text)]">
                {summaryStats.totalSets || 0}
              </p>
            </div>
            <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                Volumen
              </p>
              <p className="text-lg font-semibold text-[color:var(--text)]">
                {summaryStats.totalVolume} kg·reps
              </p>
            </div>
            <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                Músculos
              </p>
              <p className="text-lg font-semibold text-[color:var(--text)]">
                {summaryStats.muscleCount || 0}
              </p>
            </div>
          </div>

          {summaryStats.best && (
            <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-4">
              <p className="text-xs text-[color:var(--text-muted)]">
                Mejor set de la sesión
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-base font-semibold text-[color:var(--text)]">
                    {summaryStats.best.exerciseName}
                  </p>
                  <p className="text-sm text-[color:var(--text-muted)]">
                    {summaryStats.best.muscleGroup || "Sin grupo"}
                  </p>
                </div>
                <div className="text-base font-semibold text-[color:var(--text)]">
                  {summaryStats.best.topSet?.weightKg || 0} kg x{" "}
                  {summaryStats.best.topSet?.reps || 0}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">Ejercicios clave</h3>
          {!isCompact && sortedExercises.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAllExercises((v) => !v)}
              className="text-sm font-semibold text-blue-700 dark:text-blue-300"
            >
              {showAllExercises ? "Ver menos" : "Ver todos"}
            </button>
          )}
        </div>

        <div className="grid gap-3">
          {visibleExercises.map((ex, idx) => (
            <div
              key={`${ex.exerciseId}-${idx}`}
              className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-[color:var(--text)] truncate">
                    {ex.exerciseName}
                  </p>
                  <p className="text-sm text-[color:var(--text-muted)]">
                    {ex.muscleGroup || "Sin grupo"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[color:var(--text-muted)]">
                    Top set
                  </p>
                  <p className="text-sm font-semibold text-[color:var(--text)]">
                    {ex.topSet?.weightKg || 0} kg x {ex.topSet?.reps || 0}
                  </p>
                  {isCompact && (
                    <button
                      type="button"
                      onClick={() => handleViewProgress(ex.exerciseId)}
                      className="mt-2 text-[11px] font-semibold text-blue-700 dark:text-blue-300"
                    >
                      Ver progreso
                    </button>
                  )}
                </div>
              </div>
              {!isCompact && (
                <>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[color:var(--text-muted)]">
                    <span>{Math.round(ex.volume || 0)} kg·reps</span>
                    <span>{ex.setsCount || 0} sets</span>
                    <span>{ex.repsTotal || 0} reps</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleViewProgress(ex.exerciseId)}
                    className="
                      mt-3 w-full rounded-xl border border-[color:var(--border)]
                      bg-[color:var(--bg)] px-3 py-2 text-sm font-semibold
                      text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/10
                    "
                  >
                    Ver progreso
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

SessionSummaryPage.propTypes = {
  sessions: PropTypes.arrayOf(PropTypes.object),
  currentSession: PropTypes.object,
  onViewExerciseAnalytics: PropTypes.func,
  onNavigate: PropTypes.func,
};

export default SessionSummaryPage;
