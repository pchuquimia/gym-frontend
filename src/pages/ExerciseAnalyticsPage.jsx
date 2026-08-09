import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  ChevronDown,
  Clock3,
  Dumbbell,
  Gauge,
  Search,
  TrendingUp,
} from "lucide-react";
import ExerciseAnalytics from "../components/analytics/ExerciseAnalytics";
import ExerciseThumbnail from "../components/analytics/ExerciseThumbnail";
import { useTrainingData } from "../context/TrainingContext";
import { useThemeMode } from "../hooks/useThemeMode";
import { getExerciseImageUrl } from "../utils/cloudinary";
import { estimate1RM } from "../utils/trainingMetrics";

const DAY_MS = 24 * 60 * 60 * 1000;

const slugify = (text = "") =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const toTimestamp = (value) => {
  const date = value ? new Date(`${String(value).slice(0, 10)}T12:00:00`) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
};

const compact = (value) => {
  const number = Number(value) || 0;
  if (!number) return "--";
  if (Math.abs(number) >= 1000) return `${(number / 1000).toFixed(number >= 10000 ? 0 : 1)}k`;
  return Math.round(number).toLocaleString("es-BO");
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

const formatDuration = (seconds) => {
  const value = Number(seconds) || 0;
  if (!value) return "--";
  return value >= 60 ? `${Math.round(value / 60)} min` : `${Math.round(value)} s`;
};

const flattenSets = (sets = []) =>
  (sets || []).flatMap((set) => {
    const entries = Array.isArray(set?.entries) && set.entries.length
      ? set.entries
      : [set];
    return entries
      .map((entry) => ({
        weight: Number(entry?.weightKg ?? entry?.weight ?? entry?.kg ?? 0) || 0,
        reps: Number(entry?.reps ?? 0) || 0,
      }))
      .filter((entry) => entry.weight > 0 && entry.reps > 0);
  });

function MetricCard({ label, value, detail, icon: Icon, accent = false }) {
  return (
    <article className="rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm dark:rounded-[4px] dark:shadow-none">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">
          {label}
        </p>
        <Icon className="h-4 w-4 text-[#ff5722] dark:text-[#e2ff00]" />
      </div>
      <p className={`mt-3 text-2xl font-black leading-none ${accent ? "text-[#ff5722] dark:text-[#e2ff00]" : ""}`}>
        {value}
      </p>
      <p className="mt-2 text-[11px] font-semibold text-[color:var(--text-muted)]">
        {detail}
      </p>
    </article>
  );
}

export default function ExerciseAnalyticsPage() {
  const [pageOpenedAt] = useState(() => Date.now());
  const { sessions = [], trainings = [], exercises = [] } = useTrainingData();
  const { isDark } = useThemeMode();
  const [selectedExerciseId, setSelectedExerciseId] = useState(() =>
    typeof localStorage === "undefined"
      ? ""
      : localStorage.getItem("last_exercise_id") || "",
  );
  const [selectedMuscle, setSelectedMuscle] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");

  const workouts = useMemo(
    () => [
      ...sessions
        .filter((session) => session.exerciseId)
        .map((session) => ({
          exerciseId: session.exerciseId || slugify(session.exerciseName),
          date: session.date,
          sets: flattenSets(session.sets),
        })),
      ...trainings.flatMap((training) =>
        (training.exercises || [])
          .filter((exercise) => exercise.exerciseId || exercise.exerciseName)
          .map((exercise) => ({
            exerciseId: exercise.exerciseId || slugify(exercise.exerciseName),
            date: training.date,
            sets: flattenSets(exercise.sets),
          })),
      ),
    ],
    [sessions, trainings],
  );

  const trainedExerciseIds = useMemo(
    () => new Set(workouts.filter((item) => item.sets.length).map((item) => item.exerciseId)),
    [workouts],
  );
  const exerciseOptions = useMemo(() => {
    const trained = exercises.filter((exercise) => trainedExerciseIds.has(exercise.id));
    return trained.length ? trained : exercises;
  }, [exercises, trainedExerciseIds]);
  const muscleOptions = useMemo(
    () =>
      Array.from(
        new Set(
          exerciseOptions.map(
            (exercise) => exercise.muscle || exercise.muscleGroup || "Sin grupo",
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
          (exercise.muscle || exercise.muscleGroup || "Sin grupo") === effectiveMuscle,
      ),
    [effectiveMuscle, exerciseOptions],
  );
  const effectiveExerciseId =
    selectedExerciseId && muscleExercises.some((item) => item.id === selectedExerciseId)
      ? selectedExerciseId
      : muscleExercises[0]?.id || exerciseOptions[0]?.id || "";
  const selectedExercise =
    exerciseOptions.find((exercise) => exercise.id === effectiveExerciseId) || null;

  useEffect(() => {
    if (!effectiveExerciseId || typeof localStorage === "undefined") return;
    localStorage.setItem("last_exercise_id", effectiveExerciseId);
  }, [effectiveExerciseId]);

  const selectedWorkouts = useMemo(
    () => workouts.filter((workout) => workout.exerciseId === effectiveExerciseId),
    [effectiveExerciseId, workouts],
  );

  const stats = useMemo(() => {
    const summaries = selectedWorkouts
      .map((workout) => {
        const sets = workout.sets || [];
        const topSet = [...sets].sort(
          (left, right) => right.weight - left.weight || right.reps - left.reps,
        )[0] || null;
        return {
          date: workout.date,
          timestamp: toTimestamp(workout.date),
          topSet,
          oneRM: sets.reduce(
            (best, set) => Math.max(best, estimate1RM(set.weight, set.reps)),
            0,
          ),
          volume: sets.reduce((sum, set) => sum + set.weight * set.reps, 0),
          sets: sets.length,
        };
      })
      .filter((item) => item.timestamp && (item.volume > 0 || item.oneRM > 0))
      .sort((left, right) => left.timestamp - right.timestamp);
    const oneRMValues = summaries.filter((item) => item.oneRM > 0);
    const first = oneRMValues[0]?.oneRM || 0;
    const latest = oneRMValues[oneRMValues.length - 1]?.oneRM || 0;
    const previous = oneRMValues[oneRMValues.length - 2]?.oneRM || 0;
    const best = oneRMValues.reduce(
      (record, item) => (item.oneRM > (record?.oneRM || 0) ? item : record),
      null,
    );
    const totalVolume = summaries.reduce((sum, item) => sum + item.volume, 0);
    const recent = oneRMValues.slice(-6);
    const consistency = best?.oneRM && recent.length
      ? (recent.filter((item) => item.oneRM >= best.oneRM * 0.9).length / recent.length) * 100
      : null;
    const recentThree = oneRMValues.slice(-3);
    const previousThree = oneRMValues.slice(-6, -3);
    const average = (items) =>
      items.length ? items.reduce((sum, item) => sum + item.oneRM, 0) / items.length : 0;
    const recentAverage = average(recentThree);
    const previousAverage = average(previousThree);
    const shortTrend = previousAverage
      ? ((recentAverage - previousAverage) / previousAverage) * 100
      : null;
    const weeks = summaries.length > 1
      ? Math.max(1, (summaries[summaries.length - 1].timestamp - summaries[0].timestamp) / (7 * DAY_MS))
      : 1;

    return {
      summaries,
      sessions: summaries.length,
      latestDate: summaries[summaries.length - 1]?.date || null,
      latestOneRM: latest,
      best,
      progress: first && latest ? ((latest - first) / first) * 100 : null,
      vsPrevious: previous && latest ? ((latest - previous) / previous) * 100 : null,
      avgVolume: summaries.length ? totalVolume / summaries.length : 0,
      frequency: summaries.length / weeks,
      consistency,
      shortTrend,
    };
  }, [selectedWorkouts]);

  const avgDuration = useMemo(() => {
    const values = trainings
      .flatMap((training) => training.exerciseDurations || [])
      .filter((item) => item.exerciseId === effectiveExerciseId)
      .map((item) => Number(item.durationOverrideSeconds ?? item.durationSeconds) || 0)
      .filter(Boolean);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  }, [effectiveExerciseId, trainings]);

  const filteredPickerExercises = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    return muscleExercises.filter(
      (exercise) =>
        !normalized || exercise.name.toLocaleLowerCase("es").includes(normalized),
    );
  }, [muscleExercises, query]);

  const exerciseName = selectedExercise?.name || "Ejercicio";
  const selectedImage = selectedExercise
    ? getExerciseImageUrl(selectedExercise, { width: 240, height: 240 })
    : "";
  const daysSinceLast = stats.latestDate
    ? Math.max(0, Math.floor((pageOpenedAt - toTimestamp(stats.latestDate)) / DAY_MS))
    : null;
  const insight = !stats.sessions
    ? "Registra una sesion con carga y repeticiones para iniciar el seguimiento."
    : stats.shortTrend !== null && stats.shortTrend >= 3
      ? `La media de tus ultimas 3 sesiones subio ${Math.round(stats.shortTrend)}%.`
      : stats.shortTrend !== null && stats.shortTrend <= -3
        ? `La media de tus ultimas 3 sesiones bajo ${Math.abs(Math.round(stats.shortTrend))}%. Revisa fatiga, orden y descanso.`
        : "Tu rendimiento reciente se mantiene dentro del rango habitual.";

  return (
    <main className="analytics-shell mx-auto w-full max-w-md space-y-4 pb-24 text-[color:var(--text)] md:max-w-5xl xl:max-w-6xl 2xl:max-w-[1280px]">
      <header className="border-b border-[color:var(--border)] pb-4">
        <p className="text-[10px] font-black uppercase text-[#ff5722] dark:text-[#e2ff00]">
          Progreso individual
        </p>
        <h1 className="mt-1 text-[30px] font-black uppercase leading-none md:text-[36px]">
          Por ejercicio
        </h1>
        <p className="mt-2 text-[13px] font-semibold text-[color:var(--text-muted)]">
          Fuerza, volumen y consistencia con tus sesiones registradas.
        </p>
      </header>

      <section className="rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-3 shadow-sm dark:rounded-[4px] dark:shadow-none">
        <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
          <label>
            <span className="mb-1 block text-[10px] font-black uppercase text-[color:var(--text-muted)]">Grupo muscular</span>
            <select
              value={effectiveMuscle}
              onChange={(event) => {
                setSelectedMuscle(event.target.value);
                setSelectedExerciseId("");
                setPickerOpen(false);
              }}
              className="theme-accent-focus h-11 w-full border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-sm font-black outline-none"
            >
              {muscleOptions.map((muscle) => <option key={muscle}>{muscle}</option>)}
            </select>
          </label>
          <div className="relative">
            <span className="mb-1 block text-[10px] font-black uppercase text-[color:var(--text-muted)]">Ejercicio</span>
            <button type="button" onClick={() => setPickerOpen((value) => !value)} className="flex min-h-24 w-full items-center gap-3 border border-[color:var(--border)] bg-[color:var(--bg)] px-2 py-2 text-left">
              <ExerciseThumbnail src={selectedImage} />
              <span className="min-w-0 flex-1"><span className="block truncate text-base font-black uppercase">{exerciseName}</span><span className="mt-0.5 block text-[11px] font-semibold text-[color:var(--text-muted)]">{stats.sessions} sesiones con datos</span></span>
              <ChevronDown className={`h-4 w-4 shrink-0 transition ${pickerOpen ? "rotate-180" : ""}`} />
            </button>
            {pickerOpen ? (
              <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-40 border border-[color:var(--border)] bg-[color:var(--card)] p-2 shadow-2xl">
                <label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar ejercicio" className="theme-accent-focus h-10 w-full border border-[color:var(--border)] bg-[color:var(--bg)] pl-10 pr-3 text-sm outline-none" /></label>
                <div className="mt-2 max-h-64 divide-y divide-[color:var(--border)] overflow-y-auto">
                  {filteredPickerExercises.map((exercise) => (
                    <button key={exercise.id} type="button" onClick={() => { setSelectedExerciseId(exercise.id); setPickerOpen(false); setQuery(""); }} className={`flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm font-bold hover:bg-[color:var(--bg)] ${exercise.id === effectiveExerciseId ? "text-[#ff5722] dark:text-[#e2ff00]" : ""}`}><span className="truncate">{exercise.name}</span><span className="text-[10px] font-black text-[color:var(--text-muted)]">{workouts.filter((item) => item.exerciseId === exercise.id).length}</span></button>
                  ))}
                  {!filteredPickerExercises.length ? <p className="px-3 py-6 text-center text-sm text-[color:var(--text-muted)]">Sin coincidencias.</p> : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <MetricCard label="Sesiones" value={stats.sessions || "--"} detail={daysSinceLast === null ? "sin historial" : daysSinceLast ? `ultima hace ${daysSinceLast} dias` : "entrenado hoy"} icon={CalendarDays} />
        <MetricCard label="1RM actual" value={stats.latestOneRM ? `${Math.round(stats.latestOneRM)} kg` : "--"} detail={stats.best ? `mejor ${Math.round(stats.best.oneRM)} kg` : "sin estimacion"} icon={Dumbbell} accent />
        <MetricCard label="Progreso total" value={percent(stats.progress)} detail={stats.sessions > 1 ? "primera vs ultima sesion" : "requiere 2 sesiones"} icon={TrendingUp} />
        <MetricCard label="Volumen medio" value={stats.avgVolume ? `${compact(stats.avgVolume)} kg` : "--"} detail="por sesion registrada" icon={Activity} />
      </section>

      <section className="border-l-2 border-[#ff5722] bg-[#fff5f1] px-4 py-3 dark:border-[#e2ff00] dark:bg-[#171900]">
        <p className="text-[10px] font-black uppercase text-[#c52d00] dark:text-[#e2ff00]">Lectura actual</p>
        <p className="mt-1 text-[13px] font-semibold text-[color:var(--text-muted)]">{insight}</p>
      </section>

      <ExerciseAnalytics exerciseId={effectiveExerciseId} workouts={workouts} mode={isDark ? "dark" : "light"} summary={{ pr: stats.best ? `${stats.best.oneRM.toFixed(1)} kg` : "--", vsPrevious: percent(stats.vsPrevious) }} />

      <section className="grid gap-3 lg:grid-cols-[0.7fr_1.3fr]">
        <div className="border border-[color:var(--border)] bg-[color:var(--card)] p-4">
          <div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase text-[#ff5722] dark:text-[#e2ff00]">Patron de trabajo</p><h2 className="mt-1 text-xl font-black uppercase">Consistencia</h2></div><Gauge className="h-5 w-5 text-[#ff5722] dark:text-[#e2ff00]" /></div>
          <div className="mt-5 grid grid-cols-3 divide-x divide-[color:var(--border)] text-center"><div><p className="text-2xl font-black">{stats.consistency === null ? "--" : `${Math.round(stats.consistency)}%`}</p><p className="text-[9px] font-black uppercase text-[color:var(--text-muted)]">Cerca del PR</p></div><div><p className="text-2xl font-black">{stats.frequency ? stats.frequency.toFixed(1) : "--"}</p><p className="text-[9px] font-black uppercase text-[color:var(--text-muted)]">Veces/sem</p></div><div><p className="text-2xl font-black">{formatDuration(avgDuration)}</p><p className="text-[9px] font-black uppercase text-[color:var(--text-muted)]">Trabajo medio</p></div></div>
        </div>

        <div>
          <div className="mb-2 flex items-end justify-between"><div><p className="text-[10px] font-black uppercase text-[#ff5722] dark:text-[#e2ff00]">Historial</p><h2 className="mt-1 text-xl font-black uppercase">Ultimas sesiones</h2></div><Clock3 className="h-5 w-5 text-[#ff5722] dark:text-[#e2ff00]" /></div>
          <div className="divide-y divide-[color:var(--border)] border border-[color:var(--border)] bg-[color:var(--card)]">
            {stats.summaries.length ? [...stats.summaries].reverse().slice(0, 6).map((item) => (
              <div key={`${item.date}-${item.oneRM}-${item.volume}`} className="grid grid-cols-[90px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 sm:grid-cols-[100px_1fr_1fr_100px]">
                <p className="text-xs font-black">{formatDate(item.date)}</p><p className="truncate text-xs font-semibold text-[color:var(--text-muted)]">{item.topSet ? `${item.topSet.weight} kg × ${item.topSet.reps}` : "Sin top set"}</p><p className="hidden text-sm font-bold sm:block">{compact(item.volume)} kg</p><p className="text-right text-sm font-black text-[#ff5722] dark:text-[#e2ff00]">{item.oneRM ? `${item.oneRM.toFixed(1)} kg` : "--"}</p>
              </div>
            )) : <p className="px-4 py-8 text-center text-sm font-semibold text-[color:var(--text-muted)]">Este ejercicio aun no tiene sesiones registradas.</p>}
          </div>
        </div>
      </section>
    </main>
  );
}
