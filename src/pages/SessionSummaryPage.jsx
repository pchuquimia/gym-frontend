import { useMemo, useState } from "react";
import PropTypes from "prop-types";
import TopBar from "../components/layout/TopBar";
import MuscleGroupSummaryCard from "../components/summary/MuscleGroupSummaryCard";
import ExerciseComparisonCard from "../components/summary/ExerciseComparisonCard";
import { muscleGroupConfig, summarizeSession, compareMuscle, compareExercise } from "../utils/sessionAnalytics";
import { useTrainingData } from "../context/TrainingContext";
import { useRoutines } from "../context/RoutineContext";

const formatDateLong = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });

function SessionSummaryPage({
  sessions: propSessions = [],
  currentSession: propCurrentSession,
  onViewExerciseAnalytics = null,
  onNavigate = null,
}) {
  const { trainings: ctxTrainings = [], exercises: exerciseMeta = [] } = useTrainingData();
  const { routines = [] } = useRoutines();
  const [selectedId, setSelectedId] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
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
          muscleGroup: ex.muscleGroup || exerciseMeta.find((m) => m.id === ex.exerciseId)?.muscle || "Sin grupo",
          sets: (ex.sets || []).map((set) => ({
            weightKg: Number(set.weightKg ?? set.weight) || 0,
            reps: Number(set.reps) || 0,
          })),
        })),
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [ctxTrainings, exerciseMeta]);

  const { currentSummary, historySummaries, currentDate, currentId } = useMemo(() => {
    const baseSessions = propSessions.length ? propSessions : normalizedCtxSessions;
    if (!baseSessions.length) return { currentSummary: summarizeSession({}), historySummaries: [], currentDate: "", currentId: "" };
    const sorted = baseSessions.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    const current = propCurrentSession || sorted.find((s) => s.id === selectedId) || sorted[0];
    const curr = summarizeSession(current || {});
    const history = baseSessions
      .filter((s) => s.id !== current?.id)
      .map((s) => summarizeSession(s))
      .filter((s) => s.exercises?.length);
    return { currentSummary: curr, historySummaries: history, currentDate: current?.date, currentId: current?.id };
  }, [propSessions, normalizedCtxSessions, propCurrentSession, selectedId]);

  const muscleKeys = useMemo(() => Object.keys(currentSummary.groups || {}), [currentSummary]);

  const muscleComparisons = muscleKeys
    .map((key) => compareMuscle(currentSummary, historySummaries, key))
    .filter(Boolean);

  const exerciseComparisons = (currentSummary.exercises || []).map((ex, idx) => {
    const cmp = compareExercise(currentSummary, historySummaries, ex.exerciseId);
    return { ...cmp, muscleGroup: ex.muscleGroup, idx };
  });

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
      const sorted = list.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
      return [routine, sorted.slice(0, 6)];
    });
  }, [normalizedCtxSessions]);

  const handleSelectByDate = (value) => {
    setSelectedDate(value);
    const match = normalizedCtxSessions.find((s) => s.date === value);
    if (match) setSelectedId(match.id);
  };

  return (
    <>
      <TopBar
        title="Resumen de sesión"
        subtitle={`Hoy: ${formatDateLong(currentDate || "")} | Referencia: promedio últimos 7 entrenamientos`}
      />

      {normalizedCtxSessions.length > 0 && (
        <div className="card flex flex-col gap-3 mb-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Sesiones recientes</span>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted" htmlFor="summary-date">
                Buscar por fecha
              </label>
              <input
                id="summary-date"
                type="date"
                value={selectedDate}
                onChange={(e) => handleSelectByDate(e.target.value)}
                className="rounded-md border border-border-soft bg-transparent px-2 py-1 text-sm"
              />
            </div>
          </div>
          <div className="relative inline-block">
            <button
              type="button"
              className="px-4 py-2 rounded-md border border-primary/40 text-sm flex items-center gap-2 bg-primary/5 hover:border-primary/70 text-primary"
              onClick={() => setShowList((v) => !v)}
            >
              Seleccionar sesión
              <span className="text-muted text-xs">{normalizedCtxSessions.length} guardadas</span>
            </button>
            {showList && (
              <div className="absolute z-20 mt-2 w-[420px] max-h-80 rounded-lg border border-border-soft bg-[color:var(--card)] shadow-lg">
                <div className="grid grid-cols-[1fr,1.4fr] h-full">
                  <div className="border-r border-border-soft max-h-80 overflow-auto">
                    {groupedSessions.map(([routine]) => (
                      <button
                        key={routine}
                        className={`w-full text-left px-3 py-2 text-sm border-b border-border-soft last:border-b-0 hover:bg-primary/10 ${
                          routine === menuRoutine
                            ? "bg-primary/15 text-primary border-primary/40"
                            : "text-[color:var(--text)]"
                        }`}
                        onClick={() => setMenuRoutine((prev) => (prev === routine ? "" : routine))}
                      >
                        {routine}
                      </button>
                ))}
              </div>
                  <div className="max-h-80 overflow-auto">
                    {menuRoutine
                      ? (groupedSessions.find(([r]) => r === menuRoutine)?.[1] || []).map((s) => (
                          <button
                            key={s.id}
                            className={`w-full text-left px-3 py-2 text-sm border-b border-border-soft last:border-b-0 hover:bg-emerald-50 ${
                              s.id === currentId
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                : "text-[color:var(--text)]"
                            }`}
                            onClick={() => {
                              setSelectedId(s.id);
                              setSelectedDate(s.date);
                              setShowList(false);
                            }}
                          >
                            <div className="font-semibold flex items-center justify-between">
                              <span>{formatDateLong(s.date)}</span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 text-[11px] px-2 py-0.5">
                                {s.routineBranch || "general"}
                              </span>
                            </div>
                            <div className="text-xs text-muted">{s.routineName}</div>
                          </button>
                        ))
                      : (
                        <div className="h-full w-full flex items-center justify-center text-xs text-muted px-3">
                          Selecciona una rutina para ver sus fechas
                        </div>
                        )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card flex flex-wrap gap-2">
        {muscleComparisons.map((mc) => {
          const label = muscleGroupConfig[mc.muscleKey]?.label || mc.muscleKey;
          return (
            <span
              key={mc.muscleKey}
              className="px-3 py-1 rounded-full border border-border-soft bg-white/5 text-xs text-muted"
            >
              {label}: {mc.status} {mc.delta !== null ? `${mc.delta >= 0 ? "+" : ""}${mc.delta.toFixed(1)}%` : ""}
            </span>
          );
        })}
      </div>

      <section className="space-y-3">
        <h3 className="text-base font-semibold">Por grupo muscular</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {muscleComparisons.map((mc) => (
            <MuscleGroupSummaryCard
              key={mc.muscleKey}
              muscleLabel={muscleGroupConfig[mc.muscleKey]?.label || mc.muscleKey}
              today={mc.today}
              refData={mc.ref}
              delta={mc.delta}
              status={mc.status}
              refCount={mc.refCount}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold">Ejercicios de la sesión</h3>
        <div className="grid gap-3">
          {exerciseComparisons.map((ex) => (
            <ExerciseComparisonCard
              key={`${ex.today.exerciseId}-${ex.idx}`}
              exercise={ex.today}
              refData={ex.ref}
              delta={ex.delta}
              status={ex.status}
              refCount={ex.refCount}
              onViewProgress={handleViewProgress}
              index={ex.idx}
            />
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
