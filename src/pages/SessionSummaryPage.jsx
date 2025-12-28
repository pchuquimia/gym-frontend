import { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { CalendarDays, ChevronDown } from "lucide-react";
import TopBar from "../components/layout/TopBar";
import MuscleGroupSummaryCard from "../components/summary/MuscleGroupSummaryCard";
import ExerciseComparisonCard from "../components/summary/ExerciseComparisonCard";
import {
 muscleGroupConfig,
 summarizeSession,
 compareMuscle,
 compareExercise,
} from "../utils/sessionAnalytics";
import { useTrainingData } from "../context/TrainingContext";
import { useRoutines } from "../context/RoutineContext";

const formatDateLong = (iso) =>
 new Date(`${iso}T00:00:00`).toLocaleDateString("es-ES", {
 day: "2-digit",
 month: "long",
 year: "numeric",
 });

const getPillClass = (status) => {
 if (status === "Mejoró")
 return `
 bg-emerald-50 text-emerald-700 border border-emerald-200
 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700/40
 `;
 if (status === "Bajó")
 return `
 bg-rose-50 text-rose-700 border border-rose-200
 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-700/40
 `;
 return `
 bg-[color:var(--bg)] text-[color:var(--text-muted)] border border-[color:var(--border)]
 
 `;
};

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
 muscleGroup:
 ex.muscleGroup ||
 exerciseMeta.find((m) => m.id === ex.exerciseId)?.muscle ||
 "Sin grupo",
 sets: (ex.sets || []).map((set) => ({
 weightKg: Number(set.weightKg ?? set.weight) || 0,
 reps: Number(set.reps) || 0,
 })),
 })),
 }))
 .sort((a, b) => new Date(b.date) - new Date(a.date));
 }, [ctxTrainings, exerciseMeta, routineBranch]);

 const { currentSummary, historySummaries, currentDate, currentId } =
 useMemo(() => {
 const baseSessions = propSessions.length
 ? propSessions
 : normalizedCtxSessions;

 if (!baseSessions.length)
 return {
 currentSummary: summarizeSession({}),
 historySummaries: [],
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

 const curr = summarizeSession(current || {});
 const history = baseSessions
 .filter((s) => s.id !== current?.id)
 .map((s) => summarizeSession(s))
 .filter((s) => s.exercises?.length);

 return {
 currentSummary: curr,
 historySummaries: history,
 currentDate: current?.date,
 currentId: current?.id,
 };
 }, [propSessions, normalizedCtxSessions, propCurrentSession, selectedId]);

 const muscleKeys = useMemo(
 () => Object.keys(currentSummary.groups || {}),
 [currentSummary]
 );

 const muscleComparisons = muscleKeys
 .map((key) => compareMuscle(currentSummary, historySummaries, key))
 .filter(Boolean);

 const exerciseComparisons = (currentSummary.exercises || []).map(
 (ex, idx) => {
 const cmp = compareExercise(
 currentSummary,
 historySummaries,
 ex.exerciseId
 );
 return { ...cmp, muscleGroup: ex.muscleGroup, idx };
 }
 );

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

 const handleSelectByDate = (value) => {
 setSelectedDate(value);
 const match = normalizedCtxSessions.find((s) => s.date === value);
 if (match) setSelectedId(match.id);
 };

 const selectedRoutineName =
 propCurrentSession?.routineName ||
 normalizedCtxSessions.find((s) => s.id === currentId)?.routineName ||
 "Seleccionar sesión";

 return (
 <>
 <TopBar
 title="Resumen de sesión"
 subtitle={`Hoy: ${formatDateLong(
 currentDate || ""
 )} | Referencia: promedio últimos 7 entrenamientos`}
 />

 {/* SESIONES RECIENTES (UI como tu segunda imagen, misma lógica) */}
 {normalizedCtxSessions.length > 0 && (
 <div className="mb-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm ">
 <p className="text-[12px] font-semibold tracking-wide text-[color:var(--text-muted)] uppercase ">
 Sesiones recientes
 </p>

 <div className="mt-3 flex items-center gap-3">
 <div className="relative flex-1">
 <button
 type="button"
 onClick={() => setShowList((v) => !v)}
 className="
 w-full rounded-2xl border border-[color:var(--border)]
 bg-[color:var(--bg)] px-4 py-1 text-left
 transition hover:bg-[color:var(--bg)]
 focus:outline-none focus:ring-2 focus:ring-blue-500/25
 
 "
 >
 <div className="flex items-center justify-between gap-3">
 <div className="min-w-0">
 <p className="text-base font-semibold text-[color:var(--text)] truncate ">
 {selectedRoutineName}
 </p>
 <p className="mt-1 text-sm text-[color:var(--text-muted)] ">
 {normalizedCtxSessions.length} guardadas
 </p>
 </div>
 <ChevronDown className="h-5 w-5 text-[color:var(--text-muted)] " />
 </div>
 </button>

 {showList && (
 <>
 {/* Backdrop (mobile-friendly) */}
 <button
 type="button"
 aria-label="Cerrar menú"
 onClick={() => setShowList(false)}
 className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] md:hidden"
 />

 {/* Panel */}
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
 {/* Header del dropdown */}
 <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--border)] ">
 <p className="text-sm font-semibold text-[color:var(--text)] ">
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

 {/* Contenido en 2 columnas */}
 <div className="grid grid-cols-1 md:grid-cols-[220px_1fr]">
 {/* Columna izquierda: Rutinas */}
 <div className="md:border-r border-[color:var(--border)] ">
 <div className="px-4 pt-3 pb-2">
 <p className="text-[11px] font-semibold tracking-wide text-[color:var(--text-muted)] uppercase ">
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
 className={`
 w-full text-left px-4 py-2.5 text-sm
 transition
 ${
 active
 ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
 : "text-[color:var(--text)] hover:bg-[color:var(--bg)] "
 }
 `}
 >
 <div className="flex items-center justify-between gap-2">
 <span className="truncate font-medium">
 {routine}
 </span>
 <span
 className={`
 text-xs
 ${
 active
 ? "text-blue-700/80 dark:text-blue-300/80"
 : "text-[color:var(--text-muted)] "
 }
 `}
 >
 ›
 </span>
 </div>
 </button>
 );
 })}
 </div>
 </div>

 {/* Columna derecha: Fechas */}
 <div>
 <div className="px-4 pt-3 pb-2">
 <p className="text-[11px] font-semibold tracking-wide text-[color:var(--text-muted)] uppercase ">
 Fechas
 </p>
 </div>

 <div className="max-h-56 md:max-h-80 overflow-auto pb-2">
 {menuRoutine ? (
 (
 groupedSessions.find(
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
 setSelectedDate(s.date);
 setShowList(false);
 }}
 className={`
 w-full text-left px-4 py-2.5 text-sm transition
 ${
 isCurrent
 ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"
 : "text-[color:var(--text)] hover:bg-[color:var(--bg)] "
 }
 `}
 >
 <div className="flex items-start justify-between gap-2">
 <div className="min-w-0">
 <p className="font-semibold truncate">
 {formatDateLong(s.date)}
 </p>
 <p className="text-xs text-[color:var(--text-muted)] truncate ">
 {s.routineName}
 </p>
 </div>

 <span className="shrink-0 inline-flex items-center rounded-full bg-[color:var(--bg)] text-[color:var(--text)] text-[11px] px-2 py-0.5 ">
 {s.routineBranch || "general"}
 </span>
 </div>
 </button>
 );
 })
 ) : (
 <div className="px-4 py-10 text-sm text-[color:var(--text-muted)] ">
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

 {/* Botón calendario (visual; misma lógica: abre lista) */}
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

 {/* Chips de grupos musculares (como tu segunda imagen) */}
 <div className="mb-6 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-3 shadow-sm ">
 <div className="flex flex-wrap gap-2">
 {muscleComparisons.map((mc) => {
 const label =
 muscleGroupConfig[mc.muscleKey]?.label || mc.muscleKey;
 const deltaText =
 mc.delta !== null
 ? `${mc.delta >= 0 ? "+" : ""}${mc.delta.toFixed(1)}%`
 : "";
 return (
 <span
 key={mc.muscleKey}
 className={`
 inline-flex items-center rounded-full px-3 py-1
 text-sm font-medium
 ${getPillClass(mc.status)}
 `}
 >
 {label}: {mc.status} {deltaText}
 </span>
 );
 })}
 </div>
 </div>

 <section className="space-y-4 mb-5">
 <h3 className="text-2xl font-bold">Por grupo muscular</h3>
 <div className="grid gap-3 md:grid-cols-2">
 {muscleComparisons.map((mc) => (
 <MuscleGroupSummaryCard
 key={mc.muscleKey}
 muscleLabel={
 muscleGroupConfig[mc.muscleKey]?.label || mc.muscleKey
 }
 today={mc.today}
 refData={mc.ref}
 delta={mc.delta}
 status={mc.status}
 refCount={mc.refCount}
 />
 ))}
 </div>
 </section>

 <section className="space-y-4">
 <h3 className="text-2xl font-bold">Ejercicios de la sesión</h3>
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
