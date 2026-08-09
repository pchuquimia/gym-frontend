import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  Dumbbell,
  Layers3,
  ListChecks,
  TrendingUp,
} from "lucide-react";
import {
  compareExercise,
  compareMuscle,
  formatMuscleGroup,
  summarizeSession,
} from "../utils/sessionAnalytics";
import { useTrainingData } from "../context/TrainingContext";
import { useRoutines } from "../context/RoutineContext";
import { getExerciseImageUrl } from "../utils/cloudinary";
import ExerciseThumbnail from "../components/analytics/ExerciseThumbnail";

const formatDateLong = (iso) =>
  iso
    ? new Date(`${String(iso).slice(0, 10)}T12:00:00`).toLocaleDateString(
        "es-BO",
        { weekday: "short", day: "2-digit", month: "long", year: "numeric" },
      )
    : "--";

const compact = (value) => {
  const number = Number(value) || 0;
  if (Math.abs(number) >= 1000) return `${(number / 1000).toFixed(number >= 10000 ? 0 : 1)}k`;
  return Math.round(number).toLocaleString("es-BO");
};

const percent = (value) => {
  if (value === null || value === undefined || !Number.isFinite(value)) return "--";
  return `${value > 0 ? "+" : ""}${Math.round(value)}%`;
};

const duration = (seconds) => {
  const minutes = Math.max(0, Math.round((Number(seconds) || 0) / 60));
  if (!minutes) return "--";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}h ${rest}m` : `${minutes} min`;
};

const titleCase = (value = "") =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(" ");

const flattenSets = (sets = []) =>
  (sets || []).flatMap((set) => {
    const source = Array.isArray(set?.entries) && set.entries.length
      ? set.entries
      : [set];
    return source
      .map((entry) => ({
        weightKg: Number(entry?.weightKg ?? entry?.weight ?? entry?.kg ?? 0) || 0,
        reps: Number(entry?.reps ?? 0) || 0,
      }))
      .filter((entry) => entry.weightKg > 0 && entry.reps > 0);
  });

function MetricCard({ label, value, detail, icon: Icon, accent = false }) {
  return (
    <article className="rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm dark:rounded-[4px] dark:shadow-none">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">{label}</p>
        <Icon className="h-4 w-4 text-[#ff5722] dark:text-[#e2ff00]" />
      </div>
      <p className={`mt-3 text-2xl font-black leading-none ${accent ? "text-[#ff5722] dark:text-[#e2ff00]" : ""}`}>{value}</p>
      <p className="mt-2 text-[11px] font-semibold text-[color:var(--text-muted)]">{detail}</p>
    </article>
  );
}

function Delta({ value }) {
  const className = value === null || value === undefined
    ? "text-[color:var(--text-muted)]"
    : value >= 1
      ? "text-emerald-600 dark:text-[#e2ff00]"
      : value <= -1
        ? "text-red-500"
        : "text-[color:var(--text-muted)]";
  return <span className={`text-xs font-black ${className}`}>{percent(value)}</span>;
}

export default function SessionSummaryPage({
  sessions: propSessions = [],
  currentSession: propCurrentSession,
  onViewExerciseAnalytics = null,
  onNavigate = null,
}) {
  const { trainings: ctxTrainings = [], exercises: exerciseMeta = [] } =
    useTrainingData();
  const { routines = [] } = useRoutines();
  const [selectedId, setSelectedId] = useState(() =>
    typeof localStorage === "undefined"
      ? ""
      : localStorage.getItem("last_training_id") || "",
  );

  const routineBranches = useMemo(() => {
    const map = new Map();
    routines.forEach((routine) => map.set(String(routine.id || routine._id), routine.branch || "general"));
    return map;
  }, [routines]);

  const normalizedContextSessions = useMemo(
    () =>
      ctxTrainings
        .map((training) => ({
          id: String(training.id || training._id || `${training.date}-${training.routineId || ""}`),
          date: training.date,
          routineName: training.routineName || "Entrenamiento",
          routineBranch:
            training.branch ||
            routineBranches.get(String(training.routineId || "")) ||
            "general",
          durationSeconds: Number(training.durationSeconds) || 0,
          exercises: (training.exercises || []).map((exercise) => ({
            exerciseId: exercise.exerciseId,
            exerciseName: exercise.exerciseName || "Ejercicio",
            muscleGroup:
              exercise.muscleGroup ||
              exerciseMeta.find((item) => item.id === exercise.exerciseId)?.muscle ||
              "Sin grupo",
            sets: flattenSets(exercise.sets),
          })),
        }))
        .sort((left, right) => String(right.date).localeCompare(String(left.date))),
    [ctxTrainings, exerciseMeta, routineBranches],
  );

  const baseSessions = propSessions.length ? propSessions : normalizedContextSessions;
  const sortedSessions = useMemo(
    () => [...baseSessions].sort((left, right) => String(right.date).localeCompare(String(left.date))),
    [baseSessions],
  );
  const currentRaw =
    propCurrentSession ||
    sortedSessions.find((session) => String(session.id) === String(selectedId)) ||
    sortedSessions[0] ||
    null;
  const currentSummary = useMemo(
    () => summarizeSession(currentRaw || {}),
    [currentRaw],
  );
  const historySummaries = useMemo(
    () => sortedSessions.map((session) => summarizeSession(session)).filter((item) => item.date),
    [sortedSessions],
  );

  useEffect(() => {
    if (!currentRaw?.id || typeof localStorage === "undefined") return;
    localStorage.setItem("last_training_id", String(currentRaw.id));
  }, [currentRaw?.id]);

  const totals = useMemo(() => {
    const exercises = currentSummary.exercises || [];
    return {
      volume: exercises.reduce((sum, item) => sum + item.volume, 0),
      sets: exercises.reduce((sum, item) => sum + item.setsCount, 0),
      reps: exercises.reduce((sum, item) => sum + item.repsTotal, 0),
      bestOneRM: exercises.reduce((best, item) => Math.max(best, item.oneRMTop), 0),
      exercises: exercises.length,
    };
  }, [currentSummary.exercises]);

  const sessionReference = useMemo(() => {
    if (!currentRaw?.date) return { count: 0, volume: 0, sets: 0, volumeDelta: null, setsDelta: null };
    const references = historySummaries
      .filter(
        (item) =>
          item.date < currentRaw.date &&
          (!currentRaw.routineName || item.routineName === currentRaw.routineName),
      )
      .slice(0, 7);
    const referenceTotals = references.map((summary) => ({
      volume: (summary.exercises || []).reduce((sum, item) => sum + item.volume, 0),
      sets: (summary.exercises || []).reduce((sum, item) => sum + item.setsCount, 0),
    }));
    const average = (field) =>
      referenceTotals.length
        ? referenceTotals.reduce((sum, item) => sum + item[field], 0) / referenceTotals.length
        : 0;
    const volume = average("volume");
    const sets = average("sets");
    return {
      count: references.length,
      volume,
      sets,
      volumeDelta: volume ? ((totals.volume - volume) / volume) * 100 : null,
      setsDelta: sets ? ((totals.sets - sets) / sets) * 100 : null,
    };
  }, [currentRaw, historySummaries, totals]);

  const muscleRows = useMemo(() => {
    const entries = Object.keys(currentSummary.groups || {})
      .map((key) => compareMuscle(currentSummary, historySummaries, key))
      .filter(Boolean)
      .map((entry) => ({
        ...entry,
        label: formatMuscleGroup(entry.muscleKey || "Otros"),
      }));
    const maxVolume = Math.max(1, ...entries.map((entry) => entry.today?.volume || 0));
    return entries
      .map((entry) => ({
        ...entry,
        share: ((entry.today?.volume || 0) / maxVolume) * 100,
      }))
      .sort((left, right) => (right.today?.volume || 0) - (left.today?.volume || 0));
  }, [currentSummary, historySummaries]);

  const exerciseRows = useMemo(
    () =>
      (currentSummary.exercises || []).map((exercise, index) => ({
        ...(compareExercise(currentSummary, historySummaries, exercise.exerciseId) || {
          today: exercise,
          ref: null,
          delta: null,
          refCount: 0,
        }),
        order: index + 1,
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
    ? "Selecciona una sesion registrada para ver su analisis."
    : sessionReference.count < 2
      ? "Todavia no hay suficientes sesiones equivalentes para una comparacion estable."
      : sessionReference.volumeDelta >= 20
        ? `Esta sesion tuvo ${Math.round(sessionReference.volumeDelta)}% mas volumen que tu media reciente.`
        : sessionReference.volumeDelta <= -20
          ? `Esta sesion tuvo ${Math.abs(Math.round(sessionReference.volumeDelta))}% menos volumen que tu media reciente.`
          : "La carga total se mantuvo dentro de tu rango reciente.";

  return (
    <main className="analytics-shell mx-auto w-full max-w-md space-y-4 pb-24 text-[color:var(--text)] md:max-w-5xl xl:max-w-6xl 2xl:max-w-[1280px]">
      <header className="border-b border-[color:var(--border)] pb-4">
        <p className="text-[10px] font-black uppercase text-[#ff5722] dark:text-[#e2ff00]">Lectura posterior</p>
        <h1 className="mt-1 text-[30px] font-black uppercase leading-none md:text-[36px]">Resumen de sesion</h1>
        <p className="mt-2 text-[13px] font-semibold text-[color:var(--text-muted)]">Compara carga, grupos musculares y ejercicios contra tu propio historial.</p>
      </header>

      {sortedSessions.length ? (
        <section className="grid gap-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-3 shadow-sm sm:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)] sm:items-end dark:rounded-[4px] dark:shadow-none">
          <div><p className="text-[10px] font-black uppercase text-[#ff5722] dark:text-[#e2ff00]">{formatDateLong(currentRaw?.date)}</p><h2 className="mt-1 truncate text-xl font-black uppercase">{currentRaw?.routineName || "Entrenamiento"}</h2><p className="mt-1 text-[11px] font-semibold text-[color:var(--text-muted)]">{titleCase(currentRaw?.routineBranch || "general")} · {totals.exercises} ejercicios</p></div>
          <label><span className="mb-1 block text-[10px] font-black uppercase text-[color:var(--text-muted)]">Cambiar sesion</span><select value={currentRaw?.id || ""} onChange={(event) => setSelectedId(event.target.value)} className="theme-accent-focus h-11 w-full border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-sm font-bold outline-none">{sortedSessions.map((session) => <option key={session.id} value={session.id}>{String(session.date).slice(0, 10)} · {session.routineName}</option>)}</select></label>
        </section>
      ) : null}

      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <MetricCard label="Volumen" value={totals.volume ? `${compact(totals.volume)} kg` : "--"} detail={sessionReference.count ? `${percent(sessionReference.volumeDelta)} vs media` : "sin referencia"} icon={Dumbbell} accent />
        <MetricCard label="Series" value={totals.sets || "--"} detail={sessionReference.count ? `${percent(sessionReference.setsDelta)} vs media` : `${totals.reps} repeticiones`} icon={ListChecks} />
        <MetricCard label="Mejor 1RM" value={totals.bestOneRM ? `${totals.bestOneRM.toFixed(1)} kg` : "--"} detail="mayor estimacion de la sesion" icon={TrendingUp} />
        <MetricCard label="Duracion" value={duration(currentRaw?.durationSeconds)} detail={`${totals.exercises} ejercicios completados`} icon={Clock3} />
      </section>

      <section className="border-l-2 border-[#ff5722] bg-[#fff5f1] px-4 py-3 dark:border-[#e2ff00] dark:bg-[#171900]"><p className="text-[10px] font-black uppercase text-[#c52d00] dark:text-[#e2ff00]">Lectura de la sesion</p><p className="mt-1 text-[13px] font-semibold text-[color:var(--text-muted)]">{sessionInsight}</p></section>

      <section>
        <div className="mb-2 flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase text-[#ff5722] dark:text-[#e2ff00]">Distribucion</p><h2 className="mt-1 text-xl font-black uppercase">Por grupo muscular</h2></div><Layers3 className="h-5 w-5 text-[#ff5722] dark:text-[#e2ff00]" /></div>
        <div className="divide-y divide-[color:var(--border)] border border-[color:var(--border)] bg-[color:var(--card)]">
          {muscleRows.length ? muscleRows.map((muscle) => (
            <div key={muscle.muscleKey} className="grid gap-2 px-4 py-3 sm:grid-cols-[160px_minmax(160px,1fr)_100px_80px] sm:items-center">
              <div><p className="text-sm font-black uppercase">{muscle.label}</p><p className="text-[10px] font-semibold text-[color:var(--text-muted)]">{muscle.today?.setsCount || 0} series · {muscle.refCount || 0} referencias</p></div>
              <div className="h-2 overflow-hidden bg-[color:var(--border)]"><div className="h-full bg-[#ff5722] dark:bg-[#e2ff00]" style={{ width: `${muscle.share}%` }} /></div>
              <p className="text-sm font-black sm:text-right">{compact(muscle.today?.volume)} kg</p>
              <div className="sm:text-right"><Delta value={muscle.delta} /></div>
            </div>
          )) : <p className="px-4 py-8 text-center text-sm font-semibold text-[color:var(--text-muted)]">No hay series con carga y repeticiones en esta sesion.</p>}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase text-[#ff5722] dark:text-[#e2ff00]">Detalle</p><h2 className="mt-1 text-xl font-black uppercase">Ejercicios realizados</h2></div><span className="text-[11px] font-bold text-[color:var(--text-muted)]">{exerciseRows.length} ejercicios</span></div>
        <div className="divide-y divide-[color:var(--border)] border border-[color:var(--border)] bg-[color:var(--card)]">
          {exerciseRows.length ? exerciseRows.map((entry) => {
            const exercise = entry.today || {};
            const meta = exerciseMeta.find((item) => item.id === exercise.exerciseId);
            const image = meta ? getExerciseImageUrl(meta, { width: 240, height: 240 }) : "";
            return (
              <button key={`${entry.order}-${exercise.exerciseId}`} type="button" onClick={() => handleViewExercise(exercise.exerciseId)} className="grid w-full grid-cols-[76px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 text-left transition hover:bg-[#fff5f1] dark:hover:bg-[#171900] sm:grid-cols-[92px_minmax(180px,1fr)_130px_120px_70px_auto]">
                <span className="relative h-20 w-[76px] border border-[color:var(--border)] sm:h-24 sm:w-[92px]"><ExerciseThumbnail src={image} className="h-full w-full" /><span className="absolute left-0 top-0 grid h-5 min-w-5 place-items-center bg-[#1a1a1a] px-1 text-[9px] font-black text-white dark:bg-[#e2ff00] dark:text-black">{entry.order}</span></span>
                <span className="min-w-0"><span className="block truncate text-sm font-black uppercase">{exercise.exerciseName}</span><span className="mt-0.5 block truncate text-[10px] font-semibold text-[color:var(--text-muted)]">{formatMuscleGroup(exercise.muscleGroup || "Sin grupo")} · {exercise.topSet ? `${exercise.topSet.weightKg} kg x ${exercise.topSet.reps}` : `${entry.refCount || 0} referencias`} · {compact(exercise.volume)} kg</span></span>
                <span className="hidden text-xs font-bold sm:block">{exercise.topSet ? `${exercise.topSet.weightKg} kg × ${exercise.topSet.reps}` : "--"}</span>
                <span className="hidden text-xs font-bold sm:block">{compact(exercise.volume)} kg</span>
                <span className="justify-self-end"><Delta value={entry.delta} /></span><ChevronRight className="hidden h-4 w-4 text-[color:var(--text-muted)] sm:block" />
              </button>
            );
          }) : <div className="px-4 py-10 text-center"><CalendarDays className="mx-auto h-7 w-7 text-[color:var(--text-muted)]" /><p className="mt-3 text-sm font-semibold text-[color:var(--text-muted)]">Aun no hay una sesion guardada para analizar.</p></div>}
        </div>
      </section>
    </main>
  );
}

SessionSummaryPage.propTypes = {
  sessions: PropTypes.arrayOf(PropTypes.object),
  currentSession: PropTypes.object,
  onViewExerciseAnalytics: PropTypes.func,
  onNavigate: PropTypes.func,
};
