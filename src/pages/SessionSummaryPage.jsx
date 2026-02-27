import { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { CalendarDays, ChevronDown } from "lucide-react";
import {
  compareExercise,
  compareMuscle,
  summarizeSession,
} from "../utils/sessionAnalytics";
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

const formatDelta = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  const sign = value > 0 ? "+" : value < 0 ? "" : "";
  return `${sign}${value.toFixed(1)}%`;
};

const formatNumber = (value, digits = 1) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  const num = Number(value);
  if (!Number.isFinite(num)) return "--";
  return num.toFixed(digits);
};

const deltaBadgeClass = (value) => {
  if (value === null || value === undefined || Number.isNaN(value))
    return "border-[color:var(--border)] bg-[color:var(--bg)] text-[color:var(--text-muted)]";
  if (value >= 1)
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300";
  if (value <= -1)
    return "border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300";
  return "border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300";
};

const formatMuscleLabel = (value) => {
  if (!value) return "Otros";
  return value.charAt(0).toUpperCase() + value.slice(1);
};

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

  const historySummaries = useMemo(() => {
    const baseSessions = propSessions.length
      ? propSessions
      : normalizedCtxSessions;
    return baseSessions
      .map((s) => summarizeSession(s))
      .filter((s) => s && s.date);
  }, [propSessions, normalizedCtxSessions]);

  const muscleComparisons = useMemo(() => {
    const groups = currentSummary.groups || {};
    return Object.keys(groups)
      .map((key) => compareMuscle(currentSummary, historySummaries, key))
      .filter(Boolean)
      .map((entry) => ({
        ...entry,
        label: formatMuscleLabel(entry.muscleKey),
      }));
  }, [currentSummary, historySummaries]);

  const highlightMuscles = useMemo(() => {
    if (!muscleComparisons.length) return [];
    const withDelta = muscleComparisons.filter((m) =>
      Number.isFinite(m?.delta)
    );
    const sorted = (withDelta.length ? withDelta : muscleComparisons).slice();
    sorted.sort(
      (a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0)
    );
    return sorted.slice(0, 2);
  }, [muscleComparisons]);

  const exerciseComparisons = useMemo(() => {
    const list = currentSummary.exercises || [];
    return list
      .map(
        (ex) =>
          compareExercise(currentSummary, historySummaries, ex.exerciseId) || {
            today: ex,
            ref: null,
            delta: null,
            status: "Sin referencia",
            refCount: 0,
          }
      )
      .filter(Boolean);
  }, [currentSummary, historySummaries]);

  const sortedExerciseComparisons = useMemo(() => {
    const list = [...exerciseComparisons];
    list.sort((a, b) => (b.today?.volume || 0) - (a.today?.volume || 0));
    return list;
  }, [exerciseComparisons]);

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

  const selectedRoutineSessions = useMemo(() => {
    const found = groupedSessions.find(
      ([routine]) => routine === selectedRoutineName
    );
    return found ? found[1] || [] : [];
  }, [groupedSessions, selectedRoutineName]);

  const routineCount =
    selectedRoutineSessions.length || normalizedCtxSessions.length;
  return (
  <div className="space-y-6">
    <header className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-muted)]">
        <span>{formatDateLong(currentDate || "")}</span>
        <span className="inline-flex items-center rounded-full border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-1 text-[10px] font-semibold text-[color:var(--text-muted)]">
          Ref: Últimas 7 sesiones
        </span>
      </div>
      <h1 className="text-2xl font-bold text-[color:var(--text)]">
        Resumen de sesión
      </h1>
    </header>

    {normalizedCtxSessions.length > 0 && (
      <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-muted)]">
            Sesiones recientes
          </p>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowList((v) => !v)}
            className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] px-4 py-3 text-left transition hover:bg-[color:var(--bg)] focus:outline-none focus:ring-2 focus:ring-blue-500/25"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-base font-semibold text-[color:var(--text)] truncate">
                {selectedRoutineName} ({routineCount} guardadas)
              </p>
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
                className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-xl md:max-w-[520px]"
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
                    className="rounded-lg px-2 py-1 text-sm font-semibold text-[color:var(--text-muted)] hover:bg-[color:var(--bg)]"
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
                        )?.[1] || []).map((s) => {
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

        <div className="flex flex-wrap items-center gap-2">
          {highlightMuscles.length ? (
            highlightMuscles.map((muscle) => (
              <span
                key={muscle.muscleKey}
                className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold ${deltaBadgeClass(
                  muscle.delta
                )}`}
              >
                {muscle.label}: {muscle.status} {formatDelta(muscle.delta)}
              </span>
            ))
          ) : (
            <span className="text-xs text-[color:var(--text-muted)]">
              Sin comparativos recientes.
            </span>
          )}
          <button
            type="button"
            className="ml-auto h-9 w-9 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] grid place-items-center text-[color:var(--text-muted)] transition hover:bg-[color:var(--bg)] focus:outline-none focus:ring-2 focus:ring-blue-500/25"
            onClick={() => setShowList(true)}
            aria-label="Abrir selector"
          >
            <CalendarDays className="h-4 w-4" />
          </button>
        </div>
      </section>
    )}

    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-blue-500" />
        <h2 className="text-lg font-bold text-[color:var(--text)]">
          Por grupo muscular
        </h2>
      </div>

      <div className="grid gap-3">
        {muscleComparisons.length ? (
          muscleComparisons.map((muscle) => {
            const today = muscle.today || {};
            const ref = muscle.ref || {};
            return (
              <div
                key={muscle.muscleKey}
                className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-[color:var(--text)]">
                      {muscle.label}
                    </p>
                    <p className="text-xs text-[color:var(--text-muted)]">
                      Ref: {muscle.refCount || 0} entrenamientos
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${deltaBadgeClass(
                      muscle.delta
                    )}`}
                  >
                    {formatDelta(muscle.delta)}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                      Índice fuerza
                    </p>
                    <p className="mt-1 text-lg font-semibold text-[color:var(--text)]">
                      {formatNumber(today.strengthIndex, 1)}
                    </p>
                    <p className="text-xs text-[color:var(--text-muted)]">
                      Avg 7: {formatNumber(ref.strengthIndex, 1)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                      Volumen
                    </p>
                    <p className="mt-1 text-lg font-semibold text-[color:var(--text)]">
                      {formatNumber(today.volume, 0)} kg·reps
                    </p>
                    <p className="text-xs text-[color:var(--text-muted)]">
                      Avg 7: {formatNumber(ref.volume, 0)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                      Sets
                    </p>
                    <p className="mt-1 text-lg font-semibold text-[color:var(--text)]">
                      {formatNumber(today.setsCount, 0)}
                    </p>
                    <p className="text-xs text-[color:var(--text-muted)]">
                      Avg 7: {formatNumber(ref.setsCount, 1)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                      Mejor 1RM
                    </p>
                    <p className="mt-1 text-lg font-semibold text-[color:var(--text)]">
                      {formatNumber(today.bestOneRM, 1)} kg
                    </p>
                    <p className="text-xs text-[color:var(--text-muted)]">
                      Avg 7: {formatNumber(ref.bestOneRM, 1)} kg
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-[color:var(--card)] p-4 text-sm text-[color:var(--text-muted)]">
            Aún no hay datos por grupo muscular.
          </div>
        )}
      </div>
    </section>

    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-blue-500" />
        <h2 className="text-lg font-bold text-[color:var(--text)]">
          Ejercicios de la sesión
        </h2>
      </div>

      <div className="grid gap-3">
        {sortedExerciseComparisons.length ? (
          sortedExerciseComparisons.map((entry) => {
            const ex = entry.today || {};
            const topSet = ex.topSet || {};
            return (
              <div
                key={ex.exerciseId}
                className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[color:var(--text)] truncate">
                      {ex.exerciseName}
                    </p>
                    <p className="text-xs text-[color:var(--text-muted)]">
                      {ex.muscleGroup || "Sin grupo"}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${deltaBadgeClass(
                      entry.delta
                    )}`}
                  >
                    {formatDelta(entry.delta)}
                  </span>
                </div>

                <div className="mt-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-[color:var(--text-muted)] uppercase tracking-[0.2em]">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    Hoy
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[11px] text-[color:var(--text-muted)]">
                        Top set
                      </p>
                      <p className="text-base font-semibold text-[color:var(--text)]">
                        {formatNumber(topSet.weightKg, 1)} kg x {topSet.reps ?? "--"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-[color:var(--text-muted)]">
                        1RM estimado
                      </p>
                      <p className="text-base font-semibold text-[color:var(--text)]">
                        {formatNumber(ex.oneRMTop, 1)} kg
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[color:var(--border)] pt-3 text-[11px] text-[color:var(--text-muted)]">
                    <div>
                      <p className="uppercase tracking-[0.2em]">Volumen</p>
                      <p className="text-sm font-semibold text-[color:var(--text)]">
                        {formatNumber(ex.volume, 0)} kg·reps
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="uppercase tracking-[0.2em]">Sets / reps</p>
                      <p className="text-sm font-semibold text-[color:var(--text)]">
                        {ex.setsCount || 0} sets · {ex.repsTotal || 0} reps
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleViewProgress(ex.exerciseId)}
                  className="mt-3 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-sm font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                >
                  Ver progreso detallado
                </button>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-[color:var(--card)] p-4 text-sm text-[color:var(--text-muted)]">
            Aún no hay ejercicios registrados en esta sesión.
          </div>
        )}
      </div>
    </section>

    {!normalizedCtxSessions.length && (
      <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-[color:var(--card)] p-4 text-sm text-[color:var(--text-muted)]">
        Aún no hay sesiones guardadas para mostrar el resumen.
      </div>
    )}
  </div>
);
}

SessionSummaryPage.propTypes = {
  sessions: PropTypes.arrayOf(PropTypes.object),
  currentSession: PropTypes.object,
  onViewExerciseAnalytics: PropTypes.func,
  onNavigate: PropTypes.func,
};

export default SessionSummaryPage;


