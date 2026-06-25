import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Clock3,
  Dumbbell,
  TimerReset,
  TrendingUp,
} from "lucide-react";
import ExerciseAnalytics from "../components/analytics/ExerciseAnalytics";
import Badge from "../components/ui/badge";
import { useTrainingData } from "../context/TrainingContext";
import { getExerciseImageUrl } from "../utils/cloudinary";
import { estimate1RM } from "../utils/trainingMetrics";

const slugify = (text) =>
  text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const toValidDate = (value) => {
  if (!value) return null;
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const normalized = trimmed.length <= 10 ? `${trimmed}T00:00:00` : trimmed;
    const d = new Date(normalized);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
};

const getDateTimestamp = (value) => {
  const d = toValidDate(value);
  return d ? d.getTime() : 0;
};

const formatCompactNumber = (value) => {
  const number = Number(value) || 0;
  if (!number) return "--";
  if (Math.abs(number) >= 1000) {
    return `${(number / 1000).toFixed(number >= 10000 ? 0 : 1)}k`;
  }
  return `${Math.round(number)}`;
};

const formatPercent = (value) => {
  if (!Number.isFinite(value)) return "--";
  return `${value >= 0 ? "+" : ""}${Math.round(value)}%`;
};

const formatSeconds = (seconds) => {
  const value = Number(seconds) || 0;
  if (!value) return "--";
  if (value >= 60) return `${Math.round(value / 60)} min`;
  return `${Math.round(value)} seg`;
};

const flattenSets = (sets = []) =>
  (sets || []).flatMap((set) => {
    const entries =
      Array.isArray(set?.entries) && set.entries.length ? set.entries : null;
    if (!entries) {
      return [
        {
          weight: Number(set?.weightKg ?? set?.weight ?? set?.kg ?? 0) || 0,
          reps: Number(set?.reps ?? 0) || 0,
        },
      ];
    }
    return entries.map((entry) => ({
      weight: Number(entry?.weightKg ?? entry?.weight ?? entry?.kg ?? 0) || 0,
      reps: Number(entry?.reps ?? 0) || 0,
    }));
  });

function MetricCard({ label, value, suffix = "", icon: Icon, tone = "blue" }) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-400"
      : "text-blue-700 dark:text-blue-200";

  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
          {label}
        </p>
        <Icon className="h-4 w-4 text-[color:var(--text-muted)]" />
      </div>
      <p className={`mt-3 text-2xl font-black leading-none ${toneClass}`}>
        {value}
        {suffix ? (
          <span className="ml-1 text-sm font-semibold text-[color:var(--text)]">
            {suffix}
          </span>
        ) : null}
      </p>
    </div>
  );
}

function RecoveryCard({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-blue-500/10 text-emerald-400">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
          {label}
        </p>
        <p className="mt-1 text-2xl font-black leading-none text-[color:var(--text)]">
          {value}
        </p>
      </div>
    </div>
  );
}

function ExerciseAnalyticsPage() {
  const { sessions = [], trainings = [], exercises = [] } = useTrainingData();
  const getThemeMode = () => {
    if (typeof document === "undefined") return "light";
    return document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
  };
  const [themeMode, setThemeMode] = useState(getThemeMode);
  const [selectedExerciseId, setSelectedExerciseId] = useState(() => {
    if (typeof localStorage !== "undefined") {
      const last = localStorage.getItem("last_exercise_id");
      if (last) return last;
    }
    return exercises[0]?.id || "";
  });
  const [selectedMuscle, setSelectedMuscle] = useState("");
  const [exercisePickerOpen, setExercisePickerOpen] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setThemeMode(getThemeMode());
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const workouts = useMemo(
    () => [
      ...sessions
        .filter((session) => session.exerciseId)
        .map((session) => ({
          exerciseId: session.exerciseId || slugify(session.exerciseName || ""),
          date: session.date,
          sets: flattenSets(session.sets || []),
        })),
      ...trainings.flatMap((training) =>
        (training.exercises || [])
          .filter((exercise) => exercise.exerciseId || exercise.exerciseName)
          .map((exercise) => ({
            exerciseId:
              exercise.exerciseId || slugify(exercise.exerciseName || ""),
            date: training.date,
            sets: flattenSets(exercise.sets || []),
          })),
      ),
    ],
    [sessions, trainings],
  );

  const muscleOptions = useMemo(() => {
    const set = new Set();
    exercises.forEach((exercise) => {
      set.add(exercise.muscle || exercise.muscleGroup || "Sin grupo");
    });
    return Array.from(set);
  }, [exercises]);

  const selectedExerciseFromState = useMemo(
    () =>
      exercises.find((exercise) => exercise.id === selectedExerciseId) || null,
    [exercises, selectedExerciseId],
  );
  const effectiveSelectedMuscle =
    selectedMuscle ||
    selectedExerciseFromState?.muscle ||
    selectedExerciseFromState?.muscleGroup ||
    muscleOptions[0] ||
    "";

  const filteredExercises = useMemo(() => {
    if (!effectiveSelectedMuscle) return exercises;
    return exercises.filter(
      (exercise) =>
        (exercise.muscle || exercise.muscleGroup || "Sin grupo") ===
        effectiveSelectedMuscle,
    );
  }, [effectiveSelectedMuscle, exercises]);

  const effectiveSelectedExerciseId = useMemo(() => {
    if (
      selectedExerciseId &&
      filteredExercises.some((exercise) => exercise.id === selectedExerciseId)
    ) {
      return selectedExerciseId;
    }
    return filteredExercises[0]?.id || exercises[0]?.id || "";
  }, [exercises, filteredExercises, selectedExerciseId]);

  useEffect(() => {
    if (typeof localStorage === "undefined" || !effectiveSelectedExerciseId) {
      return;
    }
    localStorage.setItem("last_exercise_id", effectiveSelectedExerciseId);
  }, [effectiveSelectedExerciseId]);

  const selectedExercise = useMemo(
    () =>
      exercises.find((exercise) => exercise.id === effectiveSelectedExerciseId) ||
      null,
    [effectiveSelectedExerciseId, exercises],
  );
  const selectedWorkouts = useMemo(
    () =>
      workouts.filter(
        (workout) => workout.exerciseId === effectiveSelectedExerciseId,
      ),
    [effectiveSelectedExerciseId, workouts],
  );

  const stats = useMemo(() => {
    let best = null;
    let bestOneRM = null;
    let lastDate = null;
    let lastTs = 0;
    let totalVolume = 0;
    const sessionSummaries = [];

    selectedWorkouts.forEach((workout) => {
      const ts = getDateTimestamp(workout.date);
      if (ts > lastTs) {
        lastTs = ts;
        lastDate = workout.date;
      }
      let workoutVolume = 0;
      let workoutBestOneRM = 0;

      workout.sets.forEach((set) => {
        const weight = Number(set.weight ?? set.weightKg ?? 0) || 0;
        const reps = Number(set.reps ?? 0) || 0;
        const volume = weight * reps;
        const oneRM = estimate1RM(weight, reps);
        totalVolume += volume;
        workoutVolume += volume;
        if (weight <= 0 && reps <= 0) return;
        workoutBestOneRM = Math.max(workoutBestOneRM, oneRM);
        if (
          !best ||
          weight > best.weight ||
          (weight === best.weight && reps > best.reps) ||
          (weight === best.weight && reps === best.reps && ts < best.ts)
        ) {
          best = { weight, reps, date: workout.date, ts };
        }
        if (
          oneRM > 0 &&
          (!bestOneRM || oneRM > bestOneRM.value || ts < bestOneRM.ts)
        ) {
          bestOneRM = { value: oneRM, date: workout.date, ts };
        }
      });

      if (workoutBestOneRM > 0 || workoutVolume > 0) {
        sessionSummaries.push({
          date: workout.date,
          ts,
          oneRM: workoutBestOneRM,
          volume: workoutVolume,
        });
      }
    });

    const totalSessions = selectedWorkouts.length;
    const avgVolume = totalSessions
      ? Math.round(totalVolume / totalSessions)
      : 0;
    const chronological = sessionSummaries.sort((a, b) => a.ts - b.ts);
    const firstOneRM = chronological.find((item) => item.oneRM > 0)?.oneRM || 0;
    const lastOneRM =
      [...chronological].reverse().find((item) => item.oneRM > 0)?.oneRM || 0;
    const previousOneRM =
      chronological.length > 1
        ? chronological[chronological.length - 2].oneRM
        : 0;
    const progress =
      firstOneRM && lastOneRM
        ? ((lastOneRM - firstOneRM) / firstOneRM) * 100
        : null;
    const vsPrevious =
      previousOneRM && lastOneRM
        ? ((lastOneRM - previousOneRM) / previousOneRM) * 100
        : null;
    const frequency =
      chronological.length >= 2
        ? chronological.length /
          Math.max(
            1,
            (chronological[chronological.length - 1].ts - chronological[0].ts) /
              (7 * 24 * 60 * 60 * 1000),
          )
        : totalSessions;

    return {
      totalSessions,
      lastDate,
      best,
      bestOneRM,
      avgVolume,
      progress,
      vsPrevious,
      frequency,
    };
  }, [selectedWorkouts]);

  const recovery = useMemo(() => {
    const durations = trainings
      .flatMap((training) => training.exerciseDurations || [])
      .filter((item) => item.exerciseId === effectiveSelectedExerciseId)
      .map((item) => Number(item.durationSeconds) || 0)
      .filter(Boolean);
    const avgDuration = durations.length
      ? durations.reduce((sum, value) => sum + value, 0) / durations.length
      : 0;
    return {
      avgDuration,
      frequency: stats.frequency,
    };
  }, [effectiveSelectedExerciseId, stats.frequency, trainings]);

  const exerciseName =
    exercises.find((exercise) => exercise.id === effectiveSelectedExerciseId)?.name ||
    sessions.find((session) => session.exerciseId === effectiveSelectedExerciseId)
      ?.exerciseName ||
    "Ejercicio";
  const selectedImage = selectedExercise
    ? getExerciseImageUrl(selectedExercise, { width: 240, height: 240 })
    : "";
  const selectedMuscleLabel =
    selectedExercise?.muscle || selectedExercise?.muscleGroup || "Sin grupo";
  const statusLabel = stats.totalSessions
    ? `${stats.totalSessions} sesiones`
    : "Sin sesiones recientes";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 pb-24">
      <header className="space-y-1">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700 dark:text-blue-200">
          Analiza fuerza, volumen e intensidad
        </p>
        <h1 className="text-2xl font-bold leading-tight text-[color:var(--text)]">
          Gráficas y análisis
        </h1>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {muscleOptions.map((group) => (
          <button
            key={group}
            type="button"
            onClick={() => {
              setSelectedMuscle(group);
              setExercisePickerOpen(false);
            }}
            className={`h-10 shrink-0 rounded-full px-4 text-xs font-bold transition ${
              effectiveSelectedMuscle === group
                ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                : "bg-[color:var(--card)] text-[color:var(--text)]"
            }`}
          >
            {group}
          </button>
        ))}
      </div>

      <section className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-3">
        <button
          type="button"
          className="flex w-full items-center gap-3 text-left"
          onClick={() => setExercisePickerOpen((value) => !value)}
        >
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)]">
            {selectedImage ? (
              <img
                src={selectedImage}
                alt={exerciseName}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="grid h-full w-full place-items-center text-[11px] text-[color:var(--text-muted)]">
                Sin imagen
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="line-clamp-2 text-lg font-bold leading-5 text-[color:var(--text)]">
              {exerciseName}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-[10px] uppercase">
                {selectedMuscleLabel}
              </Badge>
              <span className="text-[11px] text-[color:var(--text-muted)]">
                {statusLabel}
              </span>
            </div>
          </div>
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-[color:var(--text-muted)] transition ${
              exercisePickerOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {exercisePickerOpen ? (
          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto border-t border-[color:var(--border)] pt-3">
            {filteredExercises.map((exercise) => {
              const thumb = getExerciseImageUrl(exercise, {
                width: 120,
                height: 120,
              });
              const isActive = exercise.id === effectiveSelectedExerciseId;
              return (
                <button
                  key={exercise.id}
                  type="button"
                  onClick={() => {
                    setSelectedExerciseId(exercise.id);
                    setExercisePickerOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${
                    isActive
                      ? "border-blue-500/40 bg-blue-500/10"
                      : "border-[color:var(--border)] bg-[color:var(--bg)]"
                  }`}
                >
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[color:var(--card)]">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={exercise.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-xs text-[color:var(--text-muted)]">
                        {(exercise.name || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[color:var(--text)]">
                    {exercise.name}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Mejor set"
          value={stats.best ? `${stats.best.weight}` : "--"}
          suffix={stats.best ? "kg" : ""}
          icon={Dumbbell}
          tone="emerald"
        />
        <MetricCard
          label="Primer PR"
          value={stats.bestOneRM ? stats.bestOneRM.value.toFixed(0) : "--"}
          suffix={stats.bestOneRM ? "kg" : ""}
          icon={CalendarDays}
        />
        <MetricCard
          label="Progreso"
          value={formatPercent(stats.progress)}
          icon={TrendingUp}
          tone="emerald"
        />
        <MetricCard
          label="Volumen prom."
          value={formatCompactNumber(stats.avgVolume)}
          suffix={stats.avgVolume ? "kg" : ""}
          icon={Dumbbell}
        />
      </section>

      <ExerciseAnalytics
        exerciseId={effectiveSelectedExerciseId || exercises[0]?.id || ""}
        exerciseName={exerciseName}
        workouts={workouts}
        mode={themeMode}
        summary={{
          pr: stats.bestOneRM ? `${stats.bestOneRM.value.toFixed(1)} kg` : "--",
          vsPrevious: formatPercent(stats.vsPrevious),
        }}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[color:var(--text)]">
          Insights de Recuperación
        </h2>
        <RecoveryCard
          icon={TimerReset}
          label="Tiempo de trabajo promedio"
          value={formatSeconds(recovery.avgDuration)}
        />
        <RecoveryCard
          icon={Clock3}
          label="Frecuencia de entrenamiento semanal"
          value={
            recovery.frequency
              ? `${Number(recovery.frequency).toFixed(1)} veces/sem`
              : "--"
          }
        />
      </section>
    </div>
  );
}

export default ExerciseAnalyticsPage;
