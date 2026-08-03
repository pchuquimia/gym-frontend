import { useEffect, useMemo, useState } from "react";
import { ResponsiveBar } from "@nivo/bar";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  ChevronDown,
  Clock3,
  ListChecks,
  Menu,
  Play,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { presets } from "../utils/motion";
import { useTrainingData } from "../context/TrainingContext";
import { useThemeMode } from "../hooks/useThemeMode";
import ThemeToggle from "../components/ThemeToggle";

const DAY_MS = 24 * 60 * 60 * 1000;

function toValidDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function getDateTimestamp(value) {
  return toValidDate(value)?.getTime() || 0;
}

function getISODateKey(date) {
  return date.toISOString().slice(0, 10);
}

function titleCase(value = "") {
  return value
    .toString()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(
      (word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`,
    )
    .join(" ");
}

function clampText(value, max = 12) {
  const text = titleCase(value || "");
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1)}.` : text;
}

function getRoutineName(training = {}) {
  return (
    training.routineName ||
    training.routineId?.name ||
    training.routine?.name ||
    "Sesion"
  );
}

function formatSessionMinutes(seconds = 0) {
  const minutes = Math.round(Number(seconds || 0) / 60);
  if (minutes <= 0) return "0 min";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${minutes} min`;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

function formatLongDate(value) {
  const date = toValidDate(value);
  if (!date) return "--";
  return date.toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDashboardDuration(seconds = 0) {
  const minutes = Math.max(0, Math.round(Number(seconds || 0) / 60));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h ${rest}m`;
}

function parseEventTime(value) {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function getLastCompletedEntryTimestamp(training = {}) {
  const times = (training.exercises || []).flatMap((exercise) =>
    (exercise.sets || []).flatMap((set) =>
      (set.entries || [])
        .filter((entry) => entry.done && entry.completedAt)
        .map((entry) => parseEventTime(entry.completedAt))
        .filter((timestamp) => Number.isFinite(timestamp)),
    ),
  );
  return times.length ? Math.max(...times) : null;
}

function calculateDurationUntil(events = [], endTimestamp) {
  if (!Number.isFinite(endTimestamp)) return 0;
  let running = false;
  let lastAt = null;
  let seconds = 0;

  const normalized = (Array.isArray(events) ? events : [])
    .map((event) => ({ ...event, timestamp: parseEventTime(event.at) }))
    .filter((event) => Number.isFinite(event.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp);

  normalized.forEach((event) => {
    if (event.timestamp > endTimestamp) return;
    if (running && lastAt != null && event.timestamp > lastAt) {
      seconds += Math.floor((event.timestamp - lastAt) / 1000);
    }
    if (event.type === "session_start" || event.type === "session_resume") {
      running = true;
      lastAt = event.timestamp;
      return;
    }
    if (event.type === "session_pause" || event.type === "session_end") {
      running = false;
      lastAt = event.timestamp;
      return;
    }
    if (event.type === "exercise_start") {
      if (!running) running = true;
      lastAt = event.timestamp;
    }
  });

  if (running && lastAt != null && endTimestamp > lastAt) {
    seconds += Math.floor((endTimestamp - lastAt) / 1000);
  }

  return Math.max(0, seconds);
}

function getEffectiveDurationSeconds(training = {}) {
  const stored = Math.max(0, Number(training.durationSeconds || 0));
  const lastCompletedAt = getLastCompletedEntryTimestamp(training);
  if (
    !lastCompletedAt ||
    !Array.isArray(training.timeEvents) ||
    !training.timeEvents.length
  ) {
    return stored;
  }
  const effective = calculateDurationUntil(
    training.timeEvents,
    lastCompletedAt,
  );
  if (effective <= 0) return stored;
  return stored > 0 ? Math.min(stored, effective) : effective;
}

function getSetVolumeValue(set = {}) {
  const entries =
    Array.isArray(set.entries) && set.entries.length ? set.entries : [set];
  return entries.reduce((sum, entry) => {
    const weight = Number(entry.weightKg ?? entry.weight ?? entry.kg ?? 0);
    const reps = Number(entry.reps ?? 0);
    return (
      sum +
      (Number.isFinite(weight) && Number.isFinite(reps) ? weight * reps : 0)
    );
  }, 0);
}

function isValidTrainingSet(set = {}) {
  const entries =
    Array.isArray(set.entries) && set.entries.length ? set.entries : [set];
  return entries.some((entry) => {
    const weight = Number(entry.weightKg ?? entry.weight ?? entry.kg ?? 0);
    const reps = Number(entry.reps ?? entry.repetitions ?? 0);
    return entry.done || weight > 0 || reps > 0;
  });
}

function getExerciseSetCount(exercise = {}) {
  return (exercise.sets || []).filter(isValidTrainingSet).length;
}

function getTrainingSetCount(training = {}) {
  return (training.exercises || []).reduce(
    (sum, exercise) => sum + getExerciseSetCount(exercise),
    0,
  );
}

function getExerciseVolumeValue(exercise = {}) {
  return (exercise.sets || []).reduce(
    (sum, set) => sum + getSetVolumeValue(set),
    0,
  );
}

function getExerciseMuscleGroup(exercise = {}) {
  return titleCase(
    exercise.muscleGroup ||
      exercise.muscle ||
      exercise.primaryMuscle ||
      "Sin grupo",
  );
}

function getTrainingMuscleLoads(training = {}) {
  const groups = new Map();
  (training.exercises || []).forEach((exercise) => {
    const group = getExerciseMuscleGroup(exercise);
    const current = groups.get(group) || 0;
    groups.set(group, current + getExerciseVolumeValue(exercise));
  });
  return groups;
}

function getRecoveryScoreFromDays(daysSinceLast, weeklyVolume = 0) {
  let score;
  if (daysSinceLast == null) score = 96;
  else if (daysSinceLast <= 0) score = 45;
  else if (daysSinceLast === 1) score = 58;
  else if (daysSinceLast === 2) score = 72;
  else if (daysSinceLast === 3) score = 84;
  else if (daysSinceLast === 4) score = 90;
  else score = 95;

  if (weeklyVolume > 5000) score -= 10;
  else if (weeklyVolume > 3000) score -= 6;
  else if (weeklyVolume > 1500) score -= 3;

  return Math.max(35, Math.min(98, Math.round(score)));
}

function getRecoveryLabel(value) {
  if (value >= 85) return "Listo para carga alta";
  if (value >= 70) return "Buen estado para entrenar";
  if (value >= 55) return "Carga moderada recomendada";
  return "Prioriza recuperacion";
}

function formatPercentChange(current = 0, previous = 0) {
  if (!previous && !current) return "0%";
  if (!previous) return "+100%";
  const change = ((current - previous) / previous) * 100;
  return `${change >= 0 ? "+" : ""}${Math.round(change)}%`;
}

function formatSignedCount(value, sign) {
  const count = Math.max(0, Number(value) || 0);
  return count ? `${sign}${count}` : "0";
}

function getExerciseKey(exercise = {}) {
  return (
    exercise.exerciseId ||
    exercise._id ||
    exercise.id ||
    exercise.exerciseName ||
    exercise.name ||
    "exercise"
  )
    .toString()
    .toLowerCase();
}

function parsePerformance(set = {}) {
  const weight = Number(set.weightKg ?? set.weight ?? set.kg ?? set.peso ?? 0);
  const reps = Number(set.reps || set.repetitions || 0);
  if (!Number.isFinite(weight) || weight <= 0) return null;
  return {
    weight,
    reps: Number.isFinite(reps) && reps > 0 ? reps : 1,
    volume: weight * (Number.isFinite(reps) && reps > 0 ? reps : 1),
    score: weight * (1 + (Number.isFinite(reps) && reps > 0 ? reps : 1) / 30),
  };
}

function getSetPerformances(set = {}) {
  const entries =
    Array.isArray(set.entries) && set.entries.length ? set.entries : [set];
  return entries.map(parsePerformance).filter(Boolean);
}

function isBetter(current, previous) {
  if (!previous) return true;
  if (current.score !== previous.score) return current.score > previous.score;
  if (current.weight !== previous.weight)
    return current.weight > previous.weight;
  return current.reps > previous.reps;
}

function formatCompact(value = 0) {
  const number = Number(value) || 0;
  if (Math.abs(number) >= 1000) {
    return `${(number / 1000).toFixed(number >= 10000 ? 1 : 2).replace(/\.0$/, "")}k`;
  }
  return Math.round(number).toString();
}

function extractExercisePerformances(training) {
  return (training.exercises || []).flatMap((exercise) => {
    const key = getExerciseKey(exercise);
    const exerciseName =
      exercise.exerciseName || exercise.name || exercise.label || "Ejercicio";
    const muscleGroup =
      exercise.muscleGroup ||
      exercise.muscle ||
      exercise.primaryMuscle ||
      "Sin grupo";
    return (exercise.sets || [])
      .flatMap((set, setIndex) =>
        getSetPerformances(set).map((performance) => ({
          ...performance,
          setIndex,
        })),
      )
      .map((performance) => ({
        ...performance,
        key,
        exerciseName,
        muscleGroup,
        date: training.date,
      }));
  });
}

function createExerciseStats() {
  return {
    maxWeight: 0,
    maxReps: 0,
    maxVolume: 0,
    bestRepsByWeight: new Map(),
  };
}

function cloneExerciseStats(stats) {
  if (!stats) return createExerciseStats();
  return {
    maxWeight: stats.maxWeight || 0,
    maxReps: stats.maxReps || 0,
    maxVolume: stats.maxVolume || 0,
    bestRepsByWeight: new Map(stats.bestRepsByWeight || []),
  };
}

function updateExerciseStats(stats, performance) {
  const next = cloneExerciseStats(stats);
  next.maxWeight = Math.max(next.maxWeight, performance.weight);
  next.maxReps = Math.max(next.maxReps, performance.reps);
  next.maxVolume = Math.max(next.maxVolume, performance.volume);
  const weightKey = String(performance.weight);
  next.bestRepsByWeight.set(
    weightKey,
    Math.max(next.bestRepsByWeight.get(weightKey) || 0, performance.reps),
  );
  return next;
}

function getImprovementAgainstStats(performance, stats) {
  if (!stats) {
    return {
      type: "Primer registro",
      previousValue: null,
      currentValue: `${performance.weight}kg x ${performance.reps}`,
    };
  }

  if (performance.weight > (stats.maxWeight || 0)) {
    return {
      type: "Peso",
      previousValue: `${stats.maxWeight}kg`,
      currentValue: `${performance.weight}kg`,
    };
  }

  const previousRepsAtWeight =
    stats.bestRepsByWeight?.get(String(performance.weight)) || 0;
  if (previousRepsAtWeight > 0 && performance.reps > previousRepsAtWeight) {
    return {
      type: "Repeticiones",
      previousValue: `${previousRepsAtWeight} reps con ${performance.weight}kg`,
      currentValue: `${performance.reps} reps con ${performance.weight}kg`,
    };
  }

  if (performance.volume > (stats.maxVolume || 0)) {
    return {
      type: "Volumen de serie",
      previousValue: `${formatCompact(stats.maxVolume)} kg-reps`,
      currentValue: `${formatCompact(performance.volume)} kg-reps`,
    };
  }

  return null;
}

function getDeclineAgainstStats(currentStats, previousStats) {
  if (!currentStats || !previousStats) return null;

  if (
    previousStats.maxWeight > 0 &&
    currentStats.maxWeight > 0 &&
    currentStats.maxWeight < previousStats.maxWeight
  ) {
    return {
      type: "Peso",
      previousValue: `${previousStats.maxWeight}kg`,
      currentValue: `${currentStats.maxWeight}kg`,
    };
  }

  const previousWeightKey = String(previousStats.maxWeight || "");
  const previousRepsAtMax =
    previousStats.bestRepsByWeight?.get(previousWeightKey) || 0;
  const currentRepsAtMax =
    currentStats.bestRepsByWeight?.get(previousWeightKey) || 0;
  if (
    previousStats.maxWeight > 0 &&
    previousRepsAtMax > 0 &&
    currentRepsAtMax > 0 &&
    currentRepsAtMax < previousRepsAtMax
  ) {
    return {
      type: "Repeticiones",
      previousValue: `${previousRepsAtMax} reps con ${previousStats.maxWeight}kg`,
      currentValue: `${currentRepsAtMax} reps con ${previousStats.maxWeight}kg`,
    };
  }

  if (
    previousStats.maxVolume > 0 &&
    currentStats.maxVolume > 0 &&
    currentStats.maxVolume < previousStats.maxVolume
  ) {
    return {
      type: "Volumen de serie",
      previousValue: `${formatCompact(previousStats.maxVolume)} kg-reps`,
      currentValue: `${formatCompact(currentStats.maxVolume)} kg-reps`,
    };
  }

  return null;
}

function collectPerformanceChangesInRange(trainings, startDate, endDate) {
  const start = startDate.getTime();
  const end = endDate.getTime();
  const statsByExercise = new Map();
  const improvementsByExercise = new Map();
  const currentStatsByExercise = new Map();
  const currentBestByExercise = new Map();

  trainings.forEach((training) => {
    const timestamp = getDateTimestamp(training.date);
    if (!timestamp) return;

    extractExercisePerformances(training).forEach((performance) => {
      const previousStats = statsByExercise.get(performance.key);
      const current = { ...performance, timestamp };

      if (timestamp < start) {
        statsByExercise.set(
          performance.key,
          updateExerciseStats(previousStats, current),
        );
        return;
      }

      if (timestamp > end) return;

      currentStatsByExercise.set(
        performance.key,
        updateExerciseStats(
          currentStatsByExercise.get(performance.key),
          current,
        ),
      );
      const currentBest = currentBestByExercise.get(performance.key);
      if (!currentBest || isBetter(current, currentBest)) {
        currentBestByExercise.set(performance.key, current);
      }

      const improvementMeta = getImprovementAgainstStats(
        current,
        previousStats,
      );
      if (improvementMeta) {
        const existing = improvementsByExercise.get(performance.key);
        const improvement = {
          ...current,
          improvementType: improvementMeta.type,
          previousValue: improvementMeta.previousValue,
          currentValue: improvementMeta.currentValue,
        };
        if (!existing || isBetter(current, existing)) {
          improvementsByExercise.set(performance.key, improvement);
        }
      }
      statsByExercise.set(
        performance.key,
        updateExerciseStats(previousStats, current),
      );
    });
  });

  const declines = Array.from(currentStatsByExercise.entries())
    .map(([key, currentStats]) => {
      if (improvementsByExercise.has(key)) return null;
      const previousStats = statsByExercise.get(key);
      const declineMeta = getDeclineAgainstStats(currentStats, previousStats);
      const best = currentBestByExercise.get(key);
      if (!declineMeta || !best) return null;
      return {
        ...best,
        declineType: declineMeta.type,
        previousValue: declineMeta.previousValue,
        currentValue: declineMeta.currentValue,
      };
    })
    .filter(Boolean);

  const sortByDate = (a, b) =>
    getDateTimestamp(b.date) - getDateTimestamp(a.date) ||
    a.muscleGroup.localeCompare(b.muscleGroup) ||
    a.exerciseName.localeCompare(b.exerciseName);

  return {
    improvements: Array.from(improvementsByExercise.values()).sort(sortByDate),
    declines: declines.sort(sortByDate),
  };
}

function StatCard({
  label,
  value,
  suffix,
  icon: Icon,
  tone = "emerald",
  children,
  onClick,
}) {
  const tones = {
    blue: "bg-transparent text-[#ff5722] dark:text-[#e2ff00]",
    amber: "bg-transparent text-[#ff5722] dark:text-[#e2ff00]",
    emerald: "bg-transparent text-[#ff5722] dark:text-[#e2ff00]",
    violet: "bg-transparent text-[#ff5722] dark:text-[#e2ff00]",
  };

  const Component = onClick ? "button" : "article";

  return (
    <Component
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-label={onClick ? `Ver detalle de ${label}` : undefined}
      className={`w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-left shadow-sm dark:rounded-[4px] dark:shadow-none ${
        onClick
          ? "transition hover:border-[#ff5722] hover:bg-[#fff4f0] dark:hover:border-[#e2ff00] dark:hover:bg-[#161900]"
          : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
          {label}
        </p>
        {Icon ? (
          <span
            className={`grid h-7 w-7 place-items-center rounded-xl dark:rounded-none ${tones[tone] || tones.emerald}`}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex items-end gap-1">
        <span className="text-[34px] font-black leading-none text-[color:var(--text)]">
          {value}
        </span>
        {suffix ? (
          <span className="pb-0.5 text-xs font-bold text-[color:var(--text-muted)]">
            {suffix}
          </span>
        ) : null}
      </div>
      {children}
    </Component>
  );
}

function WeekStrip({ days }) {
  return (
    <section className="grid grid-cols-7 gap-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-3 shadow-sm dark:rounded-[4px] dark:shadow-none">
      {days.map((day) => (
        <div
          key={day.key}
          className={`rounded-xl px-1.5 py-2 text-center dark:rounded-[3px] ${
            day.isToday
              ? "border border-[#ff5722] bg-[#fff4f0] text-[#ff5722] dark:border-[#e2ff00] dark:bg-[#161900] dark:text-[#e2ff00]"
              : "text-[color:var(--text-muted)]"
          }`}
        >
          <p className="text-[10px] font-black uppercase">{day.label}</p>
          <p
            className={`mt-1 h-4 text-[9px] font-black ${
              day.trained
                ? "text-[#ff5722] dark:text-[#e2ff00]"
                : "text-slate-300 dark:text-slate-600"
            }`}
          >
            {day.routine || "-"}
          </p>
        </div>
      ))}
    </section>
  );
}

function ActivityThirtyDaysChart({ data, trainedDays, totalVolume, mode }) {
  const isDark = mode === "dark";
  const xTickLabels = data
    .filter(
      (_, index) =>
        index === 0 || index === data.length - 1 || (index + 1) % 7 === 0,
    )
    .map((item) => item.label);
  const startLabel = data[0]?.label || "";
  const endLabel = data[data.length - 1]?.label || "";

  return (
    <section className="rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm dark:rounded-[4px] dark:shadow-none">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--text)]">
            Actividad de 30 dias
          </p>
          <p className="mt-1 text-xs font-bold text-[color:var(--text-muted)]">
            Dias con entrenamiento registrado
          </p>
        </div>
        <span className="rounded bg-[#1a1a1a] px-2 py-1 text-[10px] font-black uppercase text-[#ff5722] dark:rounded-[3px] dark:bg-[#1d2100] dark:text-[#e2ff00]">
          {trainedDays}/30 dias
        </span>
      </div>

      <div className="mt-4 h-40 rounded border border-[#d8d8d8] bg-[#fafafa] p-2 dark:rounded-[3px] dark:border-[#292929] dark:bg-[#080808]">
        <ResponsiveBar
          data={data}
          keys={["active"]}
          indexBy="label"
          margin={{ top: 8, right: 4, bottom: 26, left: 4 }}
          padding={0.24}
          colors={({ data: item }) =>
            item.active > 0
              ? isDark
                ? "#e2ff00"
                : "#ff5722"
              : isDark
                ? "#242424"
                : "#e2e8f0"
          }
          borderRadius={4}
          enableLabel={false}
          axisTop={null}
          axisRight={null}
          axisLeft={null}
          axisBottom={{
            tickSize: 0,
            tickPadding: 8,
            tickRotation: 0,
            tickValues: xTickLabels,
          }}
          enableGridY={false}
          theme={{
            text: {
              fill: isDark ? "#b8b8a6" : "#64748b",
              fontSize: 11,
              fontWeight: 700,
            },
            axis: {
              ticks: {
                line: { stroke: "transparent" },
                text: { fill: isDark ? "#b8b8a6" : "#64748b" },
              },
              domain: { line: { stroke: "transparent" } },
            },
          }}
          tooltip={({ data: item }) => (
            <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 text-xs text-[color:var(--text)] shadow-xl">
              <strong>{item.key}</strong>
              <p>{item.active > 0 ? "Entrenado" : "Sin entrenamiento"}</p>
              {item.volume > 0 ? <p>{formatCompact(item.volume)} kg</p> : null}
            </div>
          )}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
        <span>{startLabel}</span>
        <span className="rounded border border-[#d8d8d8] bg-white px-2 py-0.5 text-[#8e8e93] dark:rounded-[3px] dark:border-0 dark:bg-[#242424] dark:text-[#e2ff00]">
          30 dias
        </span>
        <span>Hoy · {endLabel}</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded border border-[color:var(--border)] bg-[#fafafa] p-3 dark:rounded-[3px] dark:bg-transparent">
          <p className="text-[10px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
            Dias entrenados
          </p>
          <p className="mt-2 text-2xl font-black text-[color:var(--text)]">
            {trainedDays}
          </p>
          <p className="mt-1 text-[11px] font-bold text-[color:var(--text-muted)]">
            de 30 dias
          </p>
        </div>
        <div className="rounded border border-[color:var(--border)] bg-[#fafafa] p-3 dark:rounded-[3px] dark:bg-transparent">
          <p className="text-[10px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
            Volumen
          </p>
          <p className="mt-2 text-2xl font-black text-[color:var(--text)]">
            {formatCompact(totalVolume)} kg
          </p>
          <p className="mt-1 text-[11px] font-bold text-[color:var(--text-muted)]">
            acumulado
          </p>
        </div>
      </div>
    </section>
  );
}

function CollapsibleSection({
  title,
  subtitle,
  meta,
  open,
  onToggle,
  children,
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] shadow-sm dark:rounded-[4px] dark:shadow-none">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <span>
          <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-[#1a1a1a] dark:text-[#e2ff00]">
            {subtitle}
          </span>
          <span className="mt-1 block text-lg font-black text-[color:var(--text)]">
            {title}
          </span>
        </span>
        <span className="flex items-center gap-2">
          {meta ? (
            <span className="text-xs font-black text-[color:var(--text-muted)]">
              {meta}
            </span>
          ) : null}
          <ChevronDown
            className={`h-5 w-5 text-[color:var(--text-muted)] transition-transform ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>
      {open ? (
        <div className="border-t border-[color:var(--border)] p-4">
          {children}
        </div>
      ) : null}
    </section>
  );
}

function MonthDetailView({ detail, onBack }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[color:var(--border)] bg-[color:var(--card)] text-blue-700 shadow-sm dark:text-blue-200"
          aria-label="Volver a tendencia"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700 dark:text-blue-200">
            Detalle mensual
          </p>
          <h3 className="truncate text-xl font-black text-[color:var(--text)]">
            {detail.monthName}
          </h3>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-300">
          {detail.trainedDays} dias
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {detail.days.map((day) => (
          <article
            key={day.key}
            className={`relative min-h-[86px] rounded-2xl border p-3 shadow-sm ${
              day.active
                ? "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-50"
                : "border-[color:var(--border)] bg-slate-50 text-[color:var(--text)] dark:bg-slate-950/30"
            }`}
          >
            <span
              className={`absolute right-3 top-3 h-2 w-2 rounded-full ${
                day.active ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
              }`}
            />
            <p className="text-[9px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
              {day.weekday}
            </p>
            <p className="mt-1 text-lg font-black leading-none">
              {day.dayNumber}
            </p>
            <p className="mt-2 truncate text-[11px] font-black">
              {day.active ? day.routine : "Descanso"}
            </p>
            <p className="mt-1 truncate text-[10px] font-semibold text-[color:var(--text-muted)]">
              {day.active
                ? `${day.sessions} ses. · ${day.minutes}`
                : "Sin sesion"}
            </p>
          </article>
        ))}
      </div>

      <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700 dark:text-blue-200">
          Rutinas entrenadas este mes
        </p>
        <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
          Cuantas veces se entreno cada rutina
        </p>

        <div className="mt-3 space-y-2">
          {detail.routines.length ? (
            detail.routines.map((routine) => (
              <article
                key={routine.name}
                className="rounded-2xl border border-[color:var(--border)] bg-slate-50 p-3 dark:bg-slate-950/30"
              >
                <p className="text-sm font-black text-[color:var(--text)]">
                  {routine.name}
                </p>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-2xl font-black text-[color:var(--text)]">
                      {routine.sessions}
                    </p>
                    <p className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">
                      veces entrenada
                    </p>
                  </div>
                  <p className="text-right text-[11px] font-bold text-[color:var(--text-muted)]">
                    {formatCompact(routine.volume)} kg
                    <br />
                    {routine.minutes}
                  </p>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-4 text-sm font-semibold text-[color:var(--text-muted)]">
              No hay sesiones registradas en este mes.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Dashboard({ onNavigate = () => {} }) {
  const { trainings = [] } = useTrainingData();
  const { theme } = useThemeMode();
  const [isThreeMonthsOpen, setIsThreeMonthsOpen] = useState(false);
  const [selectedMonthKey, setSelectedMonthKey] = useState(null);
  const [durationModalOpen, setDurationModalOpen] = useState(false);
  const [performanceModalType, setPerformanceModalType] = useState(null);
  const [recoveryModalOpen, setRecoveryModalOpen] = useState(false);
  const [weeklyLoadModalOpen, setWeeklyLoadModalOpen] = useState(false);
  const [weeklySetsModalOpen, setWeeklySetsModalOpen] = useState(false);
  const hasOpenModal = Boolean(
    durationModalOpen ||
    performanceModalType ||
    recoveryModalOpen ||
    weeklyLoadModalOpen ||
    weeklySetsModalOpen,
  );

  useEffect(() => {
    if (!hasOpenModal) return undefined;
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      setDurationModalOpen(false);
      setPerformanceModalType(null);
      setRecoveryModalOpen(false);
      setWeeklyLoadModalOpen(false);
      setWeeklySetsModalOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasOpenModal]);

  const orderedTrainings = useMemo(
    () =>
      [...trainings].sort(
        (a, b) => getDateTimestamp(a.date) - getDateTimestamp(b.date),
      ),
    [trainings],
  );

  const now = useMemo(() => new Date(), []);
  const todayKey = getISODateKey(now);

  const weekData = useMemo(() => {
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    const start = new Date(end.getTime() - 6 * DAY_MS);
    start.setHours(0, 0, 0, 0);
    const previousStart = new Date(start.getTime() - 7 * DAY_MS);
    const previousEnd = new Date(start.getTime() - 1);

    const dayMap = new Map();
    for (let index = 0; index < 7; index += 1) {
      const date = new Date(start.getTime() + index * DAY_MS);
      dayMap.set(getISODateKey(date), {
        key: getISODateKey(date),
        label: ["D", "L", "M", "M", "J", "V", "S"][date.getDay()],
        routine: "",
        trained: false,
        isToday: getISODateKey(date) === todayKey,
      });
    }

    const currentTrainings = orderedTrainings.filter((training) => {
      const timestamp = getDateTimestamp(training.date);
      return timestamp >= start.getTime() && timestamp <= end.getTime();
    });
    const previousTrainings = orderedTrainings.filter((training) => {
      const timestamp = getDateTimestamp(training.date);
      return (
        timestamp >= previousStart.getTime() &&
        timestamp <= previousEnd.getTime()
      );
    });

    currentTrainings.forEach((training) => {
      const key = getISODateKey(toValidDate(training.date) || now);
      const day = dayMap.get(key);
      if (!day) return;
      day.trained = true;
      day.routine = clampText(
        training.routineName || training.routineId?.name || "Sesion",
        6,
      );
    });

    const performanceChanges = collectPerformanceChangesInRange(
      orderedTrainings,
      start,
      end,
    );

    return {
      days: Array.from(dayMap.values()),
      activeDays: Array.from(dayMap.values()).filter((day) => day.trained)
        .length,
      sessions: currentTrainings.length,
      totalSeconds: currentTrainings.reduce(
        (sum, training) => sum + getEffectiveDurationSeconds(training),
        0,
      ),
      totalVolume: currentTrainings.reduce(
        (sum, training) => sum + Number(training.totalVolume || 0),
        0,
      ),
      previousVolume: previousTrainings.reduce(
        (sum, training) => sum + Number(training.totalVolume || 0),
        0,
      ),
      previousSeconds: previousTrainings.reduce(
        (sum, training) => sum + getEffectiveDurationSeconds(training),
        0,
      ),
      totalSets: currentTrainings.reduce(
        (sum, training) => sum + getTrainingSetCount(training),
        0,
      ),
      previousSets: previousTrainings.reduce(
        (sum, training) => sum + getTrainingSetCount(training),
        0,
      ),
      currentTrainings,
      previousTrainings,
      improvements: performanceChanges.improvements,
      declines: performanceChanges.declines,
      previousSessions: previousTrainings.length,
    };
  }, [now, orderedTrainings, todayKey]);

  const monthActivity = useMemo(() => {
    const map = new Map();
    for (let index = 29; index >= 0; index -= 1) {
      const date = new Date(now.getTime() - index * DAY_MS);
      const key = getISODateKey(date);
      map.set(key, {
        key,
        label: `${date.getDate()}/${date.getMonth() + 1}`,
        sessions: 0,
        volume: 0,
        routine: "",
      });
    }

    trainings.forEach((training) => {
      const date = toValidDate(training.date);
      if (!date) return;
      const key = getISODateKey(date);
      const day = map.get(key);
      if (!day) return;
      day.sessions += 1;
      day.volume += Number(training.totalVolume || 0);
      day.routine = clampText(
        training.routineName || training.routineId?.name || "Sesion",
        16,
      );
    });

    const days = Array.from(map.values());
    days.forEach((day) => {
      day.active = day.sessions > 0 ? 1 : 0;
    });
    const trainedDays = days.filter((day) => day.sessions > 0).length;
    const totalSessions = days.reduce((sum, day) => sum + day.sessions, 0);
    const totalVolume = days.reduce((sum, day) => sum + day.volume, 0);

    return { days, trainedDays, totalSessions, totalVolume };
  }, [now, trainings]);

  const threeMonthSummary = useMemo(() => {
    const monthFormatter = new Intl.DateTimeFormat("es-BO", { month: "short" });
    const map = new Map();

    for (let index = 2; index >= 0; index -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      map.set(key, {
        key,
        year: date.getFullYear(),
        monthIndex: date.getMonth(),
        month: titleCase(monthFormatter.format(date).replace(".", "")),
        sessions: 0,
        volume: 0,
        minutes: 0,
      });
    }

    trainings.forEach((training) => {
      const date = toValidDate(training.date);
      if (!date) return;
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const month = map.get(key);
      if (!month) return;
      month.sessions += 1;
      month.volume += Number(training.totalVolume || 0);
      month.minutes += Math.round(getEffectiveDurationSeconds(training) / 60);
    });

    return Array.from(map.values());
  }, [now, trainings]);

  const selectedMonthDetail = useMemo(() => {
    const selected = threeMonthSummary.find(
      (month) => month.key === selectedMonthKey,
    );
    if (!selected) return null;

    const weekdayFormatter = new Intl.DateTimeFormat("es-BO", {
      weekday: "short",
    });
    const daysInMonth = new Date(
      selected.year,
      selected.monthIndex + 1,
      0,
    ).getDate();
    const dayMap = new Map();

    for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
      const date = new Date(selected.year, selected.monthIndex, dayNumber);
      const key = getISODateKey(date);
      dayMap.set(key, {
        key,
        weekday: weekdayFormatter.format(date).replace(".", "").toUpperCase(),
        dayNumber: String(dayNumber).padStart(2, "0"),
        active: false,
        sessions: 0,
        seconds: 0,
        volume: 0,
        routine: "",
      });
    }

    const routines = new Map();

    trainings.forEach((training) => {
      const date = toValidDate(training.date);
      if (
        !date ||
        date.getFullYear() !== selected.year ||
        date.getMonth() !== selected.monthIndex
      )
        return;

      const day = dayMap.get(getISODateKey(date));
      if (!day) return;

      const routineName = getRoutineName(training);
      const volume = Number(training.totalVolume || 0);
      const seconds = getEffectiveDurationSeconds(training);

      day.active = true;
      day.sessions += 1;
      day.seconds += seconds;
      day.volume += volume;
      day.routine = day.routine
        ? `${day.routine}, ${clampText(routineName, 12)}`
        : clampText(routineName, 18);

      const routine = routines.get(routineName) || {
        name: routineName,
        sessions: 0,
        volume: 0,
        seconds: 0,
      };
      routine.sessions += 1;
      routine.volume += volume;
      routine.seconds += seconds;
      routines.set(routineName, routine);
    });

    const days = Array.from(dayMap.values()).map((day) => ({
      ...day,
      minutes: formatSessionMinutes(day.seconds),
    }));

    return {
      ...selected,
      monthName: selected.month,
      days,
      trainedDays: days.filter((day) => day.active).length,
      routines: Array.from(routines.values())
        .sort((a, b) => b.sessions - a.sessions || b.volume - a.volume)
        .map((routine) => ({
          ...routine,
          minutes: formatSessionMinutes(routine.seconds),
        })),
    };
  }, [selectedMonthKey, threeMonthSummary, trainings]);

  const durationRows = useMemo(
    () =>
      [...orderedTrainings]
        .sort((a, b) => getDateTimestamp(b.date) - getDateTimestamp(a.date))
        .map((training) => ({
          id:
            training.id ||
            training._id ||
            `${training.date}-${getRoutineName(training)}`,
          date: training.date,
          routine: getRoutineName(training),
          branch: training.branch || training.routineBranch || "",
          seconds: getEffectiveDurationSeconds(training),
        })),
    [orderedTrainings],
  );

  const weeklySets = useMemo(() => {
    const byMuscle = new Map();
    const byRoutine = new Map();

    (weekData.currentTrainings || []).forEach((training) => {
      const routineName = getRoutineName(training);
      const routine = byRoutine.get(routineName) || {
        name: routineName,
        sets: 0,
        sessions: 0,
      };
      routine.sessions += 1;

      (training.exercises || []).forEach((exercise) => {
        const sets = getExerciseSetCount(exercise);
        if (!sets) return;
        const muscle = getExerciseMuscleGroup(exercise);
        const muscleRow = byMuscle.get(muscle) || { name: muscle, sets: 0 };
        muscleRow.sets += sets;
        byMuscle.set(muscle, muscleRow);
        routine.sets += sets;
      });

      byRoutine.set(routineName, routine);
    });

    const diff = weekData.totalSets - weekData.previousSets;
    return {
      total: weekData.totalSets,
      previous: weekData.previousSets,
      diff,
      diffLabel: `${diff >= 0 ? "+" : ""}${diff} vs anterior`,
      byMuscle: Array.from(byMuscle.values()).sort((a, b) => b.sets - a.sets),
      byRoutine: Array.from(byRoutine.values()).sort((a, b) => b.sets - a.sets),
    };
  }, [weekData]);

  const improvementsByMuscle = useMemo(() => {
    const groups = new Map();
    (weekData.improvements || []).forEach((item) => {
      const group = titleCase(item.muscleGroup || "Sin grupo");
      const list = groups.get(group) || [];
      list.push(item);
      groups.set(group, list);
    });
    return Array.from(groups.entries()).map(([group, items]) => ({
      group,
      items: [...items].sort(
        (a, b) =>
          getDateTimestamp(b.date) - getDateTimestamp(a.date) ||
          a.exerciseName.localeCompare(b.exerciseName),
      ),
    }));
  }, [weekData.improvements]);

  const declinesByMuscle = useMemo(() => {
    const groups = new Map();
    (weekData.declines || []).forEach((item) => {
      const group = titleCase(item.muscleGroup || "Sin grupo");
      const list = groups.get(group) || [];
      list.push(item);
      groups.set(group, list);
    });
    return Array.from(groups.entries()).map(([group, items]) => ({
      group,
      items: [...items].sort(
        (a, b) =>
          getDateTimestamp(b.date) - getDateTimestamp(a.date) ||
          a.exerciseName.localeCompare(b.exerciseName),
      ),
    }));
  }, [weekData.declines]);

  const performanceModalConfig =
    performanceModalType === "declines"
      ? {
          eyebrow: "Vs anterior",
          title: "Donde bajamos",
          description:
            "Ejercicios donde el rendimiento quedo por debajo de tus registros anteriores.",
          label: "Bajamos",
          count: weekData.declines?.length || 0,
          groups: declinesByMuscle,
          tone: "red",
          typeKey: "declineType",
          empty: "No se detectaron bajadas en esta semana activa.",
        }
      : {
          eyebrow: "Vs anterior",
          title: "Donde mejoramos",
          description:
            "Ejercicios donde subiste peso, repeticiones o volumen frente a tus registros anteriores.",
          label: "Mejoras",
          count: weekData.improvements?.length || 0,
          groups: improvementsByMuscle,
          tone: "emerald",
          typeKey: "improvementType",
          empty: "No se detectaron mejoras en esta semana activa.",
        };

  const recovery = useMemo(() => {
    const todayStart = new Date(todayKey).getTime();
    const weekStart = todayStart - 6 * DAY_MS;
    const trainedKeys = new Set(
      orderedTrainings
        .map((training) => toValidDate(training.date))
        .filter(Boolean)
        .map(getISODateKey),
    );
    const lastTraining = [...orderedTrainings]
      .filter((training) => getDateTimestamp(training.date) <= now.getTime())
      .sort((a, b) => getDateTimestamp(b.date) - getDateTimestamp(a.date))[0];
    const lastTrainingDate = toValidDate(lastTraining?.date);
    const daysSinceLast = lastTrainingDate
      ? Math.max(
          0,
          Math.floor(
            (new Date(todayKey).getTime() -
              new Date(getISODateKey(lastTrainingDate)).getTime()) /
              DAY_MS,
          ),
        )
      : null;
    let consecutiveDays = 0;
    if (lastTrainingDate) {
      const cursor = new Date(getISODateKey(lastTrainingDate));
      while (trainedKeys.has(getISODateKey(cursor))) {
        consecutiveDays += 1;
        cursor.setDate(cursor.getDate() - 1);
      }
    }

    const weeklyVolume = Number(weekData.totalVolume || 0);
    const weeklySeconds = Number(weekData.totalSeconds || 0);
    const volumeSpike =
      weekData.previousVolume > 0
        ? (weeklyVolume - weekData.previousVolume) / weekData.previousVolume
        : 0;
    let score = 85;
    const factors = [];

    if (daysSinceLast == null) {
      score += 6;
      factors.push({ label: "Sin sesiones recientes", impact: "+6" });
    } else if (daysSinceLast === 0) {
      score -= 18;
      factors.push({ label: "Entrenaste hoy", impact: "-18" });
    } else if (daysSinceLast === 1) {
      score -= 10;
      factors.push({ label: "Entrenaste ayer", impact: "-10" });
    } else if (daysSinceLast === 2) {
      score -= 4;
      factors.push({ label: "Descanso corto", impact: "-4" });
    } else {
      score += 6;
      factors.push({ label: "Descanso suficiente", impact: "+6" });
    }

    if (weeklyVolume > 12000) {
      score -= 12;
      factors.push({ label: "Volumen semanal alto", impact: "-12" });
    } else if (weeklyVolume > 8000) {
      score -= 8;
      factors.push({ label: "Volumen semanal medio-alto", impact: "-8" });
    } else if (weeklyVolume > 4000) {
      score -= 4;
      factors.push({ label: "Volumen semanal moderado", impact: "-4" });
    }

    if (weeklySeconds > 6 * 3600) {
      score -= 10;
      factors.push({ label: "Tiempo acumulado alto", impact: "-10" });
    } else if (weeklySeconds > 4 * 3600) {
      score -= 7;
      factors.push({ label: "Tiempo acumulado medio-alto", impact: "-7" });
    } else if (weeklySeconds > 2 * 3600) {
      score -= 3;
      factors.push({ label: "Tiempo acumulado moderado", impact: "-3" });
    }

    if (consecutiveDays >= 4) {
      score -= 12;
      factors.push({ label: "Muchos dias consecutivos", impact: "-12" });
    } else if (consecutiveDays === 3) {
      score -= 8;
      factors.push({ label: "Tres dias consecutivos", impact: "-8" });
    } else if (consecutiveDays === 2) {
      score -= 4;
      factors.push({ label: "Dos dias consecutivos", impact: "-4" });
    }

    if (volumeSpike > 0.35) {
      score -= 10;
      factors.push({
        label: "Subida fuerte vs semana anterior",
        impact: "-10",
      });
    } else if (volumeSpike > 0.2) {
      score -= 6;
      factors.push({ label: "Carga en aumento", impact: "-6" });
    }

    const globalValue = Math.max(45, Math.min(96, Math.round(score)));
    const muscleStats = new Map();
    const routineStats = new Map();

    orderedTrainings.forEach((training) => {
      const timestamp = getDateTimestamp(training.date);
      if (!timestamp || timestamp > now.getTime()) return;

      const muscleLoads = getTrainingMuscleLoads(training);
      muscleLoads.forEach((volume, muscle) => {
        const current = muscleStats.get(muscle) || {
          muscle,
          lastTimestamp: 0,
          weeklyVolume: 0,
          sessions: 0,
        };
        if (timestamp >= current.lastTimestamp)
          current.lastTimestamp = timestamp;
        if (timestamp >= weekStart) {
          current.weeklyVolume += volume;
          current.sessions += 1;
        }
        muscleStats.set(muscle, current);
      });

      const routineName = getRoutineName(training);
      const routine = routineStats.get(routineName) || {
        name: routineName,
        muscles: new Set(),
        lastTimestamp: 0,
        sessions: 0,
      };
      muscleLoads.forEach((_, muscle) => routine.muscles.add(muscle));
      if (timestamp >= routine.lastTimestamp) routine.lastTimestamp = timestamp;
      if (timestamp >= weekStart) routine.sessions += 1;
      routineStats.set(routineName, routine);
    });

    const muscleReadiness = Array.from(muscleStats.values())
      .map((item) => {
        const days = item.lastTimestamp
          ? Math.max(
              0,
              Math.floor(
                (todayStart -
                  new Date(
                    getISODateKey(new Date(item.lastTimestamp)),
                  ).getTime()) /
                  DAY_MS,
              ),
            )
          : null;
        const value = getRecoveryScoreFromDays(days, item.weeklyVolume);
        return {
          ...item,
          daysSinceLast: days,
          value,
          label: getRecoveryLabel(value),
        };
      })
      .sort((a, b) => b.value - a.value || a.muscle.localeCompare(b.muscle));

    const muscleReadinessMap = new Map(
      muscleReadiness.map((item) => [item.muscle, item]),
    );

    const routineReadiness = Array.from(routineStats.values())
      .map((routine) => {
        const muscles = Array.from(routine.muscles);
        const scores = muscles.map(
          (muscle) => muscleReadinessMap.get(muscle)?.value ?? 96,
        );
        const min = scores.length ? Math.min(...scores) : globalValue;
        const avg = scores.length
          ? scores.reduce((sum, value) => sum + value, 0) / scores.length
          : globalValue;
        const value = Math.max(
          35,
          Math.min(98, Math.round(avg * 0.55 + min * 0.45)),
        );
        const lastRoutineDays = routine.lastTimestamp
          ? Math.max(
              0,
              Math.floor(
                (todayStart -
                  new Date(
                    getISODateKey(new Date(routine.lastTimestamp)),
                  ).getTime()) /
                  DAY_MS,
              ),
            )
          : null;
        const limitingMuscle = muscles
          .map((muscle) => muscleReadinessMap.get(muscle))
          .filter(Boolean)
          .sort((a, b) => a.value - b.value)[0];

        return {
          name: routine.name,
          muscles,
          value,
          label: getRecoveryLabel(value),
          daysSinceLast: lastRoutineDays,
          sessions: routine.sessions,
          limitingMuscle,
        };
      })
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));

    const recommended = routineReadiness[0] || null;
    const value = recommended?.value ?? globalValue;
    const label = recommended ? `${recommended.name}` : getRecoveryLabel(value);

    return {
      value,
      label,
      globalValue,
      globalLabel: getRecoveryLabel(globalValue),
      daysSinceLast,
      consecutiveDays,
      weeklyVolume,
      weeklySeconds,
      volumeSpike,
      factors,
      lastTraining,
      routineReadiness,
      muscleReadiness,
      recommended,
    };
  }, [now, orderedTrainings, todayKey, weekData]);

  const weeklyLoad = useMemo(() => {
    const current = Number(weekData.totalVolume || 0);
    const previous = Number(weekData.previousVolume || 0);
    const change = previous
      ? (current - previous) / previous
      : current > 0
        ? 1
        : 0;
    const byMuscle = new Map();
    const byRoutine = new Map();

    (weekData.currentTrainings || []).forEach((training) => {
      const routineName = getRoutineName(training);
      const routine = byRoutine.get(routineName) || {
        name: routineName,
        volume: 0,
        sessions: 0,
      };
      routine.sessions += 1;

      (training.exercises || []).forEach((exercise) => {
        const volume = getExerciseVolumeValue(exercise);
        if (volume <= 0) return;
        const muscle = titleCase(
          exercise.muscleGroup ||
            exercise.muscle ||
            exercise.primaryMuscle ||
            "Sin grupo",
        );
        const muscleRow = byMuscle.get(muscle) || {
          muscle,
          volume: 0,
          exercises: 0,
        };
        muscleRow.volume += volume;
        muscleRow.exercises += 1;
        byMuscle.set(muscle, muscleRow);
        routine.volume += volume;
      });

      byRoutine.set(routineName, routine);
    });

    const label =
      change > 0.2
        ? "Carga en aumento"
        : change < -0.2
          ? "Carga reducida"
          : "Carga estable";

    return {
      current,
      previous,
      change,
      changeLabel: formatPercentChange(current, previous),
      label,
      byMuscle: Array.from(byMuscle.values()).sort(
        (a, b) => b.volume - a.volume,
      ),
      byRoutine: Array.from(byRoutine.values()).sort(
        (a, b) => b.volume - a.volume,
      ),
    };
  }, [weekData]);

  const isDark = theme === "dark";
  const hasTrainingHistory = orderedTrainings.length > 0;

  return (
    <motion.div
      {...presets.fadeUp}
      className="dashboard-shell mx-auto w-full max-w-md space-y-4 pb-10 pt-4 text-[color:var(--text)] md:max-w-5xl md:pt-0 xl:max-w-6xl 2xl:max-w-[1280px]"
    >
      <header className="flex items-center justify-between gap-3 border-b border-transparent pb-1 dark:border-[#252525] dark:pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("open-main-menu"))}
            className="grid h-10 w-10 shrink-0 place-items-center text-[#1a1a1a] dark:text-[#d8d8c0] md:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-3xl font-black italic leading-[0.9] text-[#1a1a1a] dark:text-white">
              APEX
              <br />
              <span className="text-[#ff5722] dark:text-[#e2ff00]">
                PERFORMANCE
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate("registrar")}
            className="grid h-10 w-10 place-items-center rounded-full border border-[color:var(--border)] bg-[color:var(--card)] text-[#1a1a1a] shadow-sm dark:text-[#e2ff00] dark:shadow-none"
            aria-label="Registrar entrenamiento"
          >
            <Play className="h-5 w-5" />
          </button>
          <ThemeToggle />
        </div>
      </header>

      <p className="text-xs font-black uppercase text-[color:var(--text-muted)] dark:text-[#d8d8c0]">
        Semana activa
      </p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Dias activos"
          value={`${weekData.activeDays}/7`}
          icon={CalendarDays}
          tone="emerald"
        >
          <div className="mt-3 grid grid-cols-7 gap-1">
            {weekData.days.map((day) => (
              <span
                key={day.key}
                className={`h-1.5 rounded-full ${day.trained ? "bg-[#ff5722] dark:bg-[#e2ff00]" : "bg-[#e5e5e5] dark:bg-[#292929]"}`}
              />
            ))}
          </div>
        </StatCard>
        <StatCard
          label="Sesiones"
          value={weekData.sessions}
          icon={BarChart3}
          tone="blue"
        />
        <StatCard
          label="Tiempo total"
          value={formatDashboardDuration(weekData.totalSeconds)}
          icon={Clock3}
          tone="amber"
          onClick={() => setDurationModalOpen(true)}
        />
        <article className="rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-left shadow-sm dark:rounded-[4px] dark:shadow-none">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
              Vs anterior
            </p>
            <TrendingUp className="h-3.5 w-3.5 text-[#ff5722] dark:text-[#e2ff00]" />
          </div>
          <div className="mt-3 grid grid-cols-2 overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] dark:rounded-[3px]">
            <button
              type="button"
              onClick={() => setPerformanceModalType("declines")}
              className="border-r border-[color:var(--border)] px-2.5 py-2 text-left transition hover:bg-red-500/10 active:bg-red-500/15"
            >
              <p className="text-[9px] font-black uppercase tracking-wide text-[#6f6f6f] dark:text-red-300">
                Bajamos
              </p>
              <p className="mt-1 text-2xl font-black text-[#1a1a1a] dark:text-red-300">
                {formatSignedCount(weekData.declines?.length, "-")}
              </p>
            </button>
            <button
              type="button"
              onClick={() => setPerformanceModalType("improvements")}
              className="px-2.5 py-2 text-left transition hover:bg-emerald-500/10 active:bg-emerald-500/15"
            >
              <p className="text-[9px] font-black uppercase tracking-wide text-[#6f6f6f] dark:text-[#e2ff00]">
                Mejoras
              </p>
              <p className="mt-1 text-2xl font-black text-[#ff5722] dark:text-[#e2ff00]">
                {formatSignedCount(weekData.improvements?.length, "+")}
              </p>
            </button>
          </div>
        </article>
      </div>

      <WeekStrip days={weekData.days} />

      <div className="grid gap-3 lg:grid-cols-2">
        <button
          type="button"
          onClick={() =>
            hasTrainingHistory
              ? setRecoveryModalOpen(true)
              : onNavigate("registrar")
          }
          aria-label={
            hasTrainingHistory
              ? "Ver detalle de recuperación"
              : "Registrar primera sesión"
          }
          className="row-span-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-left shadow-sm transition hover:border-[#ff5722] hover:bg-[#fff4f0] dark:rounded-[4px] dark:shadow-none dark:hover:border-[#e2ff00] dark:hover:bg-[#161900]"
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
              Recovery
            </p>
            <Zap className="h-4 w-4 text-[#ff5722] dark:text-[#e2ff00]" />
          </div>
          <div className="mt-5 grid place-items-center">
            <div
              className="grid h-36 w-36 place-items-center rounded-full p-[11px] shadow-[0_0_22px_rgba(255,87,34,0.12)] dark:shadow-[0_0_24px_rgba(226,255,0,0.12)]"
              style={{
                background: `conic-gradient(${isDark ? "#e2ff00" : "#ff5722"} ${hasTrainingHistory ? recovery.value : 0}%, ${isDark ? "#292929" : "#d7d7d7"} 0)`,
              }}
            >
              <div className="grid h-full w-full place-items-center rounded-full bg-[color:var(--card)]">
                <span className="text-[34px] font-black text-[color:var(--text)]">
                  {hasTrainingHistory ? `${recovery.value}%` : "--"}
                </span>
              </div>
            </div>
          </div>
          <p className="mt-4 text-center text-[11px] font-semibold text-[color:var(--text-muted)]">
            {hasTrainingHistory
              ? recovery.recommended
                ? `Mejor hoy: ${recovery.recommended.name}`
                : recovery.label
              : "Registra tu primera sesión"}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setWeeklyLoadModalOpen(true)}
          className="rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-left shadow-sm transition hover:border-[#ff5722] hover:bg-[#fff4f0] dark:rounded-[4px] dark:shadow-none dark:hover:border-[#e2ff00] dark:hover:bg-[#161900]"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
              Carga semanal
            </p>
            <TrendingUp className="h-3.5 w-3.5 text-[#ff5722] dark:text-[#e2ff00]" />
          </div>
          <p className="mt-2 text-2xl font-black text-[color:var(--text)]">
            {formatCompact(weeklyLoad.current)} kg
          </p>
          <p className="mt-1 text-[11px] font-semibold text-[color:var(--text-muted)]">
            {weeklyLoad.changeLabel} vs anterior
          </p>
        </button>
        <button
          type="button"
          onClick={() => setWeeklySetsModalOpen(true)}
          className="rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-left shadow-sm transition hover:border-[#ff5722] hover:bg-[#fff4f0] dark:rounded-[4px] dark:shadow-none dark:hover:border-[#e2ff00] dark:hover:bg-[#161900]"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
              Sets semana
            </p>
            <ListChecks className="h-3.5 w-3.5 text-[#5f5f5f] dark:text-[#e2ff00]" />
          </div>
          <p className="mt-2 text-2xl font-black text-[color:var(--text)]">
            {weeklySets.total}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-[color:var(--text-muted)]">
            {weeklySets.diffLabel}
          </p>
        </button>
      </div>

      <ActivityThirtyDaysChart
        data={monthActivity.days}
        trainedDays={monthActivity.trainedDays}
        totalVolume={monthActivity.totalVolume}
        mode={theme}
      />

      <CollapsibleSection
        title="Ultimos 3 meses"
        subtitle={selectedMonthDetail ? "Mes seleccionado" : "Tendencia"}
        meta={`${formatCompact(threeMonthSummary.reduce((sum, item) => sum + item.volume, 0))} kg`}
        open={isThreeMonthsOpen}
        onToggle={() => {
          setIsThreeMonthsOpen((value) => !value);
          if (isThreeMonthsOpen) setSelectedMonthKey(null);
        }}
      >
        {selectedMonthDetail ? (
          <MonthDetailView
            detail={selectedMonthDetail}
            onBack={() => setSelectedMonthKey(null)}
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
            <div className="h-56 rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/50">
              <ResponsiveBar
                data={threeMonthSummary}
                keys={["volume"]}
                indexBy="month"
                margin={{ top: 12, right: 8, bottom: 28, left: 46 }}
                padding={0.35}
                colors={isDark ? "#e2ff00" : "#ff5722"}
                borderRadius={6}
                enableLabel={false}
                axisTop={null}
                axisRight={null}
                axisLeft={{
                  tickSize: 0,
                  tickPadding: 8,
                  tickValues: 4,
                  format: (value) => `${formatCompact(value)}`,
                }}
                axisBottom={{ tickSize: 0, tickPadding: 8 }}
                theme={{
                  text: {
                    fill: isDark ? "#94a3b8" : "#64748b",
                    fontSize: 11,
                    fontWeight: 700,
                  },
                  grid: {
                    line: {
                      stroke: isDark ? "#1e293b" : "#e2e8f0",
                      strokeDasharray: "3 3",
                    },
                  },
                  axis: {
                    ticks: {
                      line: { stroke: "transparent" },
                      text: { fill: isDark ? "#94a3b8" : "#64748b" },
                    },
                    domain: { line: { stroke: "transparent" } },
                  },
                }}
                gridYValues={4}
                onClick={(bar) => setSelectedMonthKey(bar.data.key)}
                tooltip={({ data }) => (
                  <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 text-xs text-[color:var(--text)] shadow-xl">
                    <strong>{data.month}</strong>
                    <p>{data.sessions} sesiones</p>
                    <p>{formatCompact(data.volume)} kg</p>
                    <p className="mt-1 text-[10px] font-bold text-[color:var(--text-muted)]">
                      Toca para ver detalle
                    </p>
                  </div>
                )}
              />
            </div>

            <div className="space-y-3">
              {threeMonthSummary.map((month) => (
                <button
                  type="button"
                  key={month.key}
                  onClick={() => setSelectedMonthKey(month.key)}
                  className="w-full rounded-2xl border border-[color:var(--border)] bg-slate-50 p-3 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50 dark:bg-slate-950/40 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-black text-[color:var(--text)]">
                      {month.month}
                    </p>
                    <p className="text-xs font-black text-emerald-700 dark:text-emerald-300">
                      {month.sessions} sesiones
                    </p>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-[color:var(--text-muted)]">
                    <span>{formatCompact(month.volume)} kg</span>
                    <span>{formatSessionMinutes(month.minutes * 60)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </CollapsibleSection>

      {recoveryModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Detalle de recuperación"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget)
              setRecoveryModalOpen(false);
          }}
        >
          <div className="max-h-[86dvh] w-full overflow-hidden rounded-t-3xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-2xl sm:max-w-lg sm:rounded-3xl">
            <div className="flex items-start justify-between gap-3 border-b border-[color:var(--border)] p-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                  Recovery
                </p>
                <h2 className="mt-1 text-xl font-black text-[color:var(--text)]">
                  {recovery.value}% -{" "}
                  {recovery.recommended
                    ? `Mejor hoy: ${recovery.recommended.name}`
                    : recovery.label}
                </h2>
                <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
                  Estimado por rutina segun los grupos musculares trabajados
                  recientemente.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRecoveryModalOpen(false)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[color:var(--border)] bg-[color:var(--bg)] text-[color:var(--text)]"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[calc(86dvh-112px)] overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-3">
                <article className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
                    Ultima sesion
                  </p>
                  <p className="mt-2 text-xl font-black text-[color:var(--text)]">
                    {recovery.daysSinceLast == null
                      ? "--"
                      : recovery.daysSinceLast === 0
                        ? "Hoy"
                        : `${recovery.daysSinceLast} d`}
                  </p>
                  <p className="mt-1 truncate text-[11px] font-semibold text-[color:var(--text-muted)]">
                    {recovery.lastTraining
                      ? getRoutineName(recovery.lastTraining)
                      : "Sin datos"}
                  </p>
                </article>
                <article className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
                    Racha
                  </p>
                  <p className="mt-2 text-xl font-black text-[color:var(--text)]">
                    {recovery.consecutiveDays} d
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-[color:var(--text-muted)]">
                    dias consecutivos
                  </p>
                </article>
                <article className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
                    Volumen semanal
                  </p>
                  <p className="mt-2 text-xl font-black text-[color:var(--text)]">
                    {formatCompact(recovery.weeklyVolume)} kg
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-[color:var(--text-muted)]">
                    carga registrada
                  </p>
                </article>
                <article className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
                    Tiempo semanal
                  </p>
                  <p className="mt-2 text-xl font-black text-[color:var(--text)]">
                    {formatDashboardDuration(recovery.weeklySeconds)}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-[color:var(--text-muted)]">
                    acumulado
                  </p>
                </article>
              </div>

              <section className="mt-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                    Si entrenas hoy
                  </p>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-black text-emerald-700 dark:text-emerald-300">
                    Por rutina
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {recovery.routineReadiness.length ? (
                    recovery.routineReadiness.map((routine) => (
                      <article
                        key={routine.name}
                        className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-[color:var(--text)]">
                              {routine.name}
                            </p>
                            <p className="mt-1 truncate text-[11px] font-semibold text-[color:var(--text-muted)]">
                              {routine.muscles.join(" / ")}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-xl px-3 py-2 text-sm font-black ${
                              routine.value >= 70
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                            }`}
                          >
                            {routine.value}%
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 text-[11px] font-bold text-[color:var(--text-muted)]">
                          <span>{routine.label}</span>
                          <span>
                            {routine.limitingMuscle
                              ? `Limita: ${routine.limitingMuscle.muscle}`
                              : "Sin limite claro"}
                          </span>
                        </div>
                      </article>
                    ))
                  ) : (
                    <p className="text-sm font-semibold text-[color:var(--text-muted)]">
                      No hay rutinas suficientes para estimar recuperacion.
                    </p>
                  )}
                </div>
              </section>

              <section className="mt-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                  Grupos musculares
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {recovery.muscleReadiness.length ? (
                    recovery.muscleReadiness.map((muscle) => (
                      <article
                        key={muscle.muscle}
                        className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-xs font-black text-[color:var(--text)]">
                            {muscle.muscle}
                          </p>
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-black ${
                              muscle.value >= 70
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                            }`}
                          >
                            {muscle.value}%
                          </span>
                        </div>
                        <p className="mt-2 text-[11px] font-semibold text-[color:var(--text-muted)]">
                          {muscle.daysSinceLast === 0
                            ? "Entrenado hoy"
                            : muscle.daysSinceLast === 1
                              ? "Entrenado ayer"
                              : `${muscle.daysSinceLast} dias`}
                        </p>
                      </article>
                    ))
                  ) : (
                    <p className="col-span-2 text-sm font-semibold text-[color:var(--text-muted)]">
                      Sin grupos musculares registrados.
                    </p>
                  )}
                </div>
              </section>

              <section className="mt-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                  Factores
                </p>
                <div className="mt-3 space-y-2">
                  {recovery.factors.length ? (
                    recovery.factors.map((factor) => (
                      <div
                        key={`${factor.label}-${factor.impact}`}
                        className="flex items-center justify-between gap-3 rounded-xl bg-[color:var(--card)] px-3 py-2"
                      >
                        <p className="text-sm font-bold text-[color:var(--text)]">
                          {factor.label}
                        </p>
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-black ${
                            factor.impact.startsWith("+")
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {factor.impact}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm font-semibold text-[color:var(--text-muted)]">
                      Sin factores relevantes por ahora.
                    </p>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}

      {weeklyLoadModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Detalle de carga semanal"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget)
              setWeeklyLoadModalOpen(false);
          }}
        >
          <div className="max-h-[86dvh] w-full overflow-hidden rounded-t-3xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-2xl sm:max-w-lg sm:rounded-3xl">
            <div className="flex items-start justify-between gap-3 border-b border-[color:var(--border)] p-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                  Carga semanal
                </p>
                <h2 className="mt-1 text-xl font-black text-[color:var(--text)]">
                  {formatCompact(weeklyLoad.current)} kg ·{" "}
                  {weeklyLoad.changeLabel}
                </h2>
                <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
                  {weeklyLoad.label} frente a la semana anterior.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setWeeklyLoadModalOpen(false)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[color:var(--border)] bg-[color:var(--bg)] text-[color:var(--text)]"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[calc(86dvh-112px)] overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-3">
                <article className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
                    Esta semana
                  </p>
                  <p className="mt-2 text-xl font-black text-[color:var(--text)]">
                    {formatCompact(weeklyLoad.current)} kg
                  </p>
                </article>
                <article className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
                    Semana anterior
                  </p>
                  <p className="mt-2 text-xl font-black text-[color:var(--text)]">
                    {formatCompact(weeklyLoad.previous)} kg
                  </p>
                </article>
              </div>

              <section className="mt-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                  Por grupo muscular
                </p>
                <div className="mt-3 space-y-2">
                  {weeklyLoad.byMuscle.length ? (
                    weeklyLoad.byMuscle.map((item) => (
                      <div
                        key={item.muscle}
                        className="rounded-xl bg-[color:var(--card)] px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-black text-[color:var(--text)]">
                            {item.muscle}
                          </p>
                          <p className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                            {formatCompact(item.volume)} kg
                          </p>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{
                              width: `${Math.min(
                                100,
                                weeklyLoad.current
                                  ? (item.volume / weeklyLoad.current) * 100
                                  : 0,
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm font-semibold text-[color:var(--text-muted)]">
                      No hay volumen registrado esta semana.
                    </p>
                  )}
                </div>
              </section>

              <section className="mt-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                  Por rutina
                </p>
                <div className="mt-3 space-y-2">
                  {weeklyLoad.byRoutine.length ? (
                    weeklyLoad.byRoutine.map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between gap-3 rounded-xl bg-[color:var(--card)] px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-[color:var(--text)]">
                            {item.name}
                          </p>
                          <p className="text-[11px] font-semibold text-[color:var(--text-muted)]">
                            {item.sessions} sesion(es)
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-black text-[color:var(--text)]">
                          {formatCompact(item.volume)} kg
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm font-semibold text-[color:var(--text-muted)]">
                      No hay rutinas registradas esta semana.
                    </p>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}

      {weeklySetsModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Detalle de series semanales"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget)
              setWeeklySetsModalOpen(false);
          }}
        >
          <div className="max-h-[86dvh] w-full overflow-hidden rounded-t-3xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-2xl sm:max-w-lg sm:rounded-3xl">
            <div className="flex items-start justify-between gap-3 border-b border-[color:var(--border)] p-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">
                  Sets semana
                </p>
                <h2 className="mt-1 text-xl font-black text-[color:var(--text)]">
                  {weeklySets.total} sets - {weeklySets.diffLabel}
                </h2>
                <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
                  Series con datos registrados durante la semana activa.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setWeeklySetsModalOpen(false)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[color:var(--border)] bg-[color:var(--bg)] text-[color:var(--text)]"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[calc(86dvh-112px)] overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-3">
                <article className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
                    Esta semana
                  </p>
                  <p className="mt-2 text-2xl font-black text-[color:var(--text)]">
                    {weeklySets.total}
                  </p>
                </article>
                <article className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
                    Semana anterior
                  </p>
                  <p className="mt-2 text-2xl font-black text-[color:var(--text)]">
                    {weeklySets.previous}
                  </p>
                </article>
              </div>

              <section className="mt-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                  Por grupo muscular
                </p>
                <div className="mt-3 space-y-2">
                  {weeklySets.byMuscle.length ? (
                    weeklySets.byMuscle.map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between gap-3 rounded-xl bg-[color:var(--card)] px-3 py-2"
                      >
                        <p className="truncate text-sm font-black text-[color:var(--text)]">
                          {item.name}
                        </p>
                        <span className="shrink-0 rounded-full bg-blue-500/10 px-2 py-1 text-xs font-black text-blue-700 dark:text-blue-300">
                          {item.sets} sets
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm font-semibold text-[color:var(--text-muted)]">
                      No hay sets registrados esta semana.
                    </p>
                  )}
                </div>
              </section>

              <section className="mt-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                  Por rutina
                </p>
                <div className="mt-3 space-y-2">
                  {weeklySets.byRoutine.length ? (
                    weeklySets.byRoutine.map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between gap-3 rounded-xl bg-[color:var(--card)] px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-[color:var(--text)]">
                            {item.name}
                          </p>
                          <p className="text-[11px] font-semibold text-[color:var(--text-muted)]">
                            {item.sessions} sesion(es)
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-black text-[color:var(--text)]">
                          {item.sets} sets
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm font-semibold text-[color:var(--text-muted)]">
                      No hay rutinas registradas esta semana.
                    </p>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}

      {durationModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Detalle del tiempo entrenado"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget)
              setDurationModalOpen(false);
          }}
        >
          <div className="max-h-[86dvh] w-full overflow-hidden rounded-t-3xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-2xl sm:max-w-lg sm:rounded-3xl">
            <div className="flex items-start justify-between gap-3 border-b border-[color:var(--border)] p-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
                  Tiempo total
                </p>
                <h2 className="mt-1 text-xl font-black text-[color:var(--text)]">
                  Duracion por entrenamiento
                </h2>
                <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
                  Calculado hasta la ultima serie completada.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDurationModalOpen(false)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[color:var(--border)] bg-[color:var(--bg)] text-[color:var(--text)]"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[calc(86dvh-112px)] overflow-y-auto p-4">
              {durationRows.length ? (
                <div className="space-y-2">
                  {durationRows.map((row) => (
                    <article
                      key={row.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-[color:var(--text)]">
                          {row.routine}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
                          {formatLongDate(row.date)}
                          {row.branch ? ` · ${titleCase(row.branch)}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-xl bg-amber-500/10 px-3 py-2 text-sm font-black text-amber-700 dark:text-amber-300">
                        {formatSessionMinutes(row.seconds)}
                      </span>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-4 text-sm font-semibold text-[color:var(--text-muted)]">
                  No hay entrenamientos registrados.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {performanceModalType ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Detalle de rendimiento"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget)
              setPerformanceModalType(null);
          }}
        >
          <div className="max-h-[86dvh] w-full overflow-hidden rounded-t-3xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-2xl sm:max-w-lg sm:rounded-3xl">
            <div className="flex items-start justify-between gap-3 border-b border-[color:var(--border)] p-4">
              <div>
                <p
                  className={`text-[10px] font-black uppercase tracking-[0.18em] ${
                    performanceModalConfig.tone === "red"
                      ? "text-red-700 dark:text-red-300"
                      : "text-emerald-700 dark:text-emerald-300"
                  }`}
                >
                  {performanceModalConfig.eyebrow}
                </p>
                <h2 className="mt-1 text-xl font-black text-[color:var(--text)]">
                  {performanceModalConfig.title}
                </h2>
                <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
                  {performanceModalConfig.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPerformanceModalType(null)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[color:var(--border)] bg-[color:var(--bg)] text-[color:var(--text)]"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[calc(86dvh-112px)] overflow-y-auto p-4">
              <article
                className={`rounded-2xl border p-3 ${
                  performanceModalConfig.tone === "red"
                    ? "border-red-200 bg-red-50 dark:border-red-400/20 dark:bg-red-500/10"
                    : "border-emerald-200 bg-emerald-50 dark:border-emerald-400/20 dark:bg-emerald-500/10"
                }`}
              >
                <p
                  className={`text-[10px] font-black uppercase tracking-wide ${
                    performanceModalConfig.tone === "red"
                      ? "text-red-700 dark:text-red-300"
                      : "text-emerald-700 dark:text-emerald-300"
                  }`}
                >
                  {performanceModalConfig.label}
                </p>
                <p
                  className={`mt-2 text-3xl font-black ${
                    performanceModalConfig.tone === "red"
                      ? "text-red-700 dark:text-red-300"
                      : "text-emerald-700 dark:text-emerald-300"
                  }`}
                >
                  {performanceModalConfig.tone === "red" ? "-" : "+"}
                  {performanceModalConfig.count}
                </p>
              </article>

              {performanceModalConfig.groups.length ? (
                <div className="mt-4 space-y-4">
                  {performanceModalConfig.groups.map(({ group, items }) => (
                    <section key={`${performanceModalType}-${group}`}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                          {group}
                        </p>
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-black ${
                            performanceModalConfig.tone === "red"
                              ? "bg-red-500/10 text-red-700 dark:text-red-300"
                              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          }`}
                        >
                          {items.length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {items.map((item) => (
                          <article
                            key={`${performanceModalType}-${item.key}-${item.date}`}
                            className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-black text-[color:var(--text)]">
                                  {item.exerciseName}
                                </p>
                                <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
                                  {formatLongDate(item.date)}
                                </p>
                              </div>
                              <span
                                className={`shrink-0 rounded-xl px-3 py-2 text-sm font-black ${
                                  performanceModalConfig.tone === "red"
                                    ? "bg-red-500/10 text-red-700 dark:text-red-300"
                                    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                }`}
                              >
                                {item.weight}kg x {item.reps}
                              </span>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                                  performanceModalConfig.tone === "red"
                                    ? "bg-red-500/10 text-red-700 dark:text-red-300"
                                    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                }`}
                              >
                                {item[performanceModalConfig.typeKey]}
                              </span>
                              <p className="text-[11px] font-semibold text-[color:var(--text-muted)]">
                                {item.previousValue
                                  ? `Antes: ${item.previousValue} / Ahora: ${item.currentValue}`
                                  : "Primer registro comparativo."}
                              </p>
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-[color:var(--border)] p-4 text-sm font-semibold text-[color:var(--text-muted)]">
                  {performanceModalConfig.empty}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}

export default Dashboard;
