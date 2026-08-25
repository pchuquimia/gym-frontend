import { useEffect, useMemo, useRef, useState } from "react";
import { ResponsiveBar } from "@nivo/bar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  ChevronDown,
  Clock3,
  Dumbbell,
  Gauge,
  ListChecks,
  Minus,
  Play,
  Target,
  Weight,
  TrendingDown,
  TrendingUp,
  RotateCcw,
  X,
  Zap,
} from "lucide-react";
import { useTrainingData } from "../context/TrainingContext";
import { useRoutines } from "../context/RoutineContext";
import { useDashboardBootstrap } from "../context/DashboardBootstrapContext";
import { api } from "../services/api";
import { useThemeMode } from "../hooks/useThemeMode";
import ThemeToggle from "../components/ThemeToggle";
import MobileMenuButton from "../components/layout/MobileMenuButton";
import OperationLoader from "../components/system/OperationLoader";
import QuickWeightModal from "../components/dashboard/QuickWeightModal";
import {
  DetailModule,
  DetailRow,
  DetailRows,
  DetailSection,
  DetailSheet,
  DetailSheetBody,
  DetailSheetHeader,
  DetailStat,
  DetailStatGrid,
} from "../components/dashboard/DetailSheet";
import {
  buildScopedPeriodComparison,
  getScopedExerciseKey,
  getTrainingProgressScopeKey,
} from "../utils/progressScope";
import {
  buildExerciseCatalogIndex,
  getExerciseLoadMetrics,
  getExerciseMuscleExposure,
  getExerciseMuscleWeights,
  getTrainingLoadMetrics,
} from "../utils/trainingLoad";

const DAY_MS = 24 * 60 * 60 * 1000;

function toValidDate(value) {
  const dateOnlyMatch =
    typeof value === "string" ? value.match(/^(\d{4})-(\d{2})-(\d{2})$/) : null;
  const date = dateOnlyMatch
    ? new Date(
        Number(dateOnlyMatch[1]),
        Number(dateOnlyMatch[2]) - 1,
        Number(dateOnlyMatch[3]),
      )
    : value
      ? new Date(value)
      : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function getDateTimestamp(value) {
  return toValidDate(value)?.getTime() || 0;
}

function getISODateKey(date) {
  const validDate = toValidDate(date);
  if (!validDate) return "";
  return [
    validDate.getFullYear(),
    String(validDate.getMonth() + 1).padStart(2, "0"),
    String(validDate.getDate()).padStart(2, "0"),
  ].join("-");
}

function getMondayWeekStart(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  const mondayOffset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - mondayOffset);
  return date;
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
  if (
    training.durationOverrideSeconds !== null &&
    training.durationOverrideSeconds !== undefined &&
    Number.isFinite(Number(training.durationOverrideSeconds))
  ) {
    return Math.max(0, Number(training.durationOverrideSeconds));
  }
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

function getPauseSeconds(training = {}) {
  if (
    training.pauseSeconds !== null &&
    training.pauseSeconds !== undefined &&
    Number.isFinite(Number(training.pauseSeconds))
  ) {
    return Math.max(0, Number(training.pauseSeconds));
  }

  let pauseStartedAt = null;
  let pauseSeconds = 0;
  const events = (Array.isArray(training.timeEvents) ? training.timeEvents : [])
    .map((event) => ({ ...event, timestamp: parseEventTime(event.at) }))
    .filter((event) => Number.isFinite(event.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp);

  events.forEach((event) => {
    if (event.type === "session_pause") {
      pauseStartedAt = event.timestamp;
      return;
    }
    if (
      pauseStartedAt !== null &&
      (event.type === "session_resume" || event.type === "session_end")
    ) {
      pauseSeconds += Math.max(
        0,
        Math.floor((event.timestamp - pauseStartedAt) / 1000),
      );
      pauseStartedAt = null;
    }
  });

  return pauseSeconds;
}

function getTimingBreakdown(training = {}) {
  const sessionSeconds = getEffectiveDurationSeconds(training);
  const hasRestTracking =
    training.restSeconds !== null &&
    training.restSeconds !== undefined &&
    Number.isFinite(Number(training.restSeconds));
  const restSeconds = hasRestTracking
    ? Math.min(sessionSeconds, Math.max(0, Number(training.restSeconds)))
    : null;

  return {
    sessionSeconds,
    workSeconds: hasRestTracking
      ? Math.max(0, sessionSeconds - restSeconds)
      : null,
    restSeconds,
    pauseSeconds: getPauseSeconds(training),
    hasRestTracking,
    adjusted:
      training.durationOverrideSeconds !== null &&
      training.durationOverrideSeconds !== undefined,
  };
}

function getTrainingSetCount(training = {}, catalogIndex = new Map()) {
  return getTrainingLoadMetrics(training, catalogIndex).completedSets;
}

function sumTrainingLoadMetrics(trainings = [], catalogIndex = new Map()) {
  const total = {
    recordedSets: 0,
    completedSets: 0,
    incompleteSets: 0,
    externalKg: 0,
    machineKg: 0,
    unknownKg: 0,
    assistanceKg: 0,
    bodyweightSets: 0,
    assistedSets: 0,
    machineSets: 0,
    cardioSets: 0,
    unknownSets: 0,
    recordedKg: 0,
  };
  trainings.forEach((training) => {
    const metrics = getTrainingLoadMetrics(training, catalogIndex);
    Object.keys(total).forEach((key) => {
      total[key] += Number(metrics[key] || 0);
    });
  });
  return total;
}

function median(values = []) {
  const sorted = values
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function getTrainingMuscleMetrics(training = {}, catalogIndex = new Map()) {
  const groups = new Map();
  (training.exercises || []).forEach((exercise) => {
    getExerciseMuscleExposure(exercise, catalogIndex).forEach((exposure) => {
      const key = exposure.group
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      const current = groups.get(key) || {
        key,
        muscle: exposure.group,
        sets: 0,
      };
      current.sets += exposure.equivalentSets;
      groups.set(key, current);
    });
  });
  return groups;
}

function getRoutineMuscles(routine = {}, catalogIndex = new Map()) {
  const muscles = new Map();
  (routine.exercises || []).forEach((exercise) => {
    getExerciseMuscleWeights(exercise, catalogIndex).forEach((entry) => {
      const key = entry.group
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      muscles.set(key, { key, muscle: entry.group, weight: entry.weight });
    });
  });
  return Array.from(muscles.values());
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

function getWeeklyComparisonSummary(comparison, formatValue, unit) {
  const current = Number(comparison?.currentTotal || 0);
  const comparableCurrent = Number(comparison?.currentComparable || 0);
  const previous = Number(comparison?.previousComparable || 0);
  const excluded = Number(comparison?.excludedCurrent || 0);
  const hasCurrentScopes = Number(comparison?.currentScopeCount || 0) > 0;
  const hasReference =
    Number(comparison?.comparableScopeCount || 0) > 0 && previous > 0;
  const isPartial = hasReference && Number(comparison?.newScopeCount || 0) > 0;
  const change = hasReference ? (comparableCurrent - previous) / previous : 0;

  if (!hasCurrentScopes) {
    return {
      current,
      comparableCurrent,
      previous,
      excluded,
      change: 0,
      hasReference: false,
      isPartial: false,
      changeLabel: "Sin carga esta semana",
      label: "Sin datos semanales",
      description: "Registra una sesion para comenzar la comparacion semanal.",
    };
  }

  if (!hasReference) {
    return {
      current,
      comparableCurrent,
      previous,
      excluded,
      change: 0,
      hasReference: false,
      isPartial: false,
      changeLabel: "Sin referencia semanal",
      label: "Nuevo ciclo",
      description:
        "Los ciclos entrenados aun no tienen una semana anterior comparable.",
    };
  }

  const label =
    change > 0.2
      ? "Carga en aumento"
      : change < -0.2
        ? "Carga reducida"
        : "Carga estable";
  return {
    current,
    comparableCurrent,
    previous,
    excluded,
    change,
    hasReference: true,
    isPartial,
    changeLabel: `${formatPercentChange(comparableCurrent, previous)} vs anterior`,
    label,
    description: isPartial
      ? `${formatValue(excluded)} ${unit} pertenecen a ciclos nuevos y no alteran el porcentaje.`
      : "Comparacion realizada con los mismos ciclos de progreso.",
  };
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

function formatSeriesCount(value = 0) {
  const number = Number(value) || 0;
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function formatEquivalentSeries(value = 0) {
  const number = Number(value) || 0;
  return `${formatSeriesCount(number)} ${number === 1 ? "equivalente" : "equivalentes"}`;
}

function formatSessionCount(value = 0) {
  const number = Math.max(0, Number(value) || 0);
  return `${number} ${number === 1 ? "sesión" : "sesiones"}`;
}

function extractBestExercisePerformances(training) {
  const bestByExercise = new Map();

  (training.exercises || []).forEach((exercise) => {
    const exerciseKey = getExerciseKey(exercise);
    const key = getScopedExerciseKey(training, exerciseKey);
    const exerciseName =
      exercise.exerciseName || exercise.name || exercise.label || "Ejercicio";
    const muscleGroup =
      exercise.muscleGroup ||
      exercise.muscle ||
      exercise.primaryMuscle ||
      "Sin grupo";
    const performances = (exercise.sets || []).flatMap((set, setIndex) =>
      getSetPerformances(set).map((performance) => ({
        ...performance,
        setIndex,
      })),
    );
    const best = performances.reduce(
      (currentBest, performance) =>
        !currentBest || isBetter(performance, currentBest)
          ? performance
          : currentBest,
      null,
    );
    if (!best) return;

    const current = bestByExercise.get(key);
    if (!current || isBetter(best, current)) {
      bestByExercise.set(key, {
        ...best,
        key,
        exerciseKey,
        exerciseName,
        muscleGroup,
        date: training.date,
      });
    }
  });

  return Array.from(bestByExercise.values());
}

function getPerformanceChange(current, previous) {
  if (!current || !previous || previous.score <= 0) return null;
  const tolerance = Math.max(0.05, previous.score * 0.005);
  const difference = current.score - previous.score;
  if (Math.abs(difference) <= tolerance) return null;

  const type =
    current.weight === previous.weight
      ? "Repeticiones"
      : current.reps === previous.reps
        ? "Peso"
        : "Rendimiento estimado";
  return {
    direction: difference > 0 ? "improvement" : "decline",
    type,
    previousValue: `${previous.weight}kg x ${previous.reps}`,
    currentValue: `${current.weight}kg x ${current.reps}`,
  };
}

function collectPerformanceChangesInRange(trainings, startDate, endDate) {
  const start = startDate.getTime();
  const end = endDate.getTime();
  const previousByExercise = new Map();
  const latestChangeByExercise = new Map();
  const ordered = [...trainings].sort((left, right) => {
    const dateDifference =
      getDateTimestamp(left.date) - getDateTimestamp(right.date);
    if (dateDifference) return dateDifference;
    return getDateTimestamp(left.createdAt) - getDateTimestamp(right.createdAt);
  });

  ordered.forEach((training) => {
    const timestamp = getDateTimestamp(training.date);
    if (!timestamp) return;

    extractBestExercisePerformances(training).forEach((performance) => {
      const current = { ...performance, timestamp };
      const previous = previousByExercise.get(performance.key);
      if (timestamp >= start && timestamp <= end) {
        const change = getPerformanceChange(current, previous);
        latestChangeByExercise.set(
          performance.key,
          change
            ? {
                ...current,
                changeType: change.type,
                direction: change.direction,
                previousValue: change.previousValue,
                currentValue: change.currentValue,
              }
            : null,
        );
      }
      previousByExercise.set(performance.key, current);
    });
  });

  const changes = Array.from(latestChangeByExercise.values()).filter(Boolean);

  const sortByDate = (a, b) =>
    getDateTimestamp(b.date) - getDateTimestamp(a.date) ||
    a.muscleGroup.localeCompare(b.muscleGroup) ||
    a.exerciseName.localeCompare(b.exerciseName);

  return {
    improvements: changes
      .filter((item) => item.direction === "improvement")
      .map((item) => ({ ...item, improvementType: item.changeType }))
      .sort(sortByDate),
    declines: changes
      .filter((item) => item.direction === "decline")
      .map((item) => ({ ...item, declineType: item.changeType }))
      .sort(sortByDate),
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
  primary = false,
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
      className={`dashboard-pilot__metric w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-left shadow-sm dark:rounded-[4px] dark:shadow-none ${
        primary ? "dashboard-pilot__metric--primary" : ""
      } ${
        onClick
          ? "transition hover:border-[color:var(--border-strong)]"
          : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
          {label}
        </p>
        {Icon ? (
          <span
            className={`dashboard-pilot__metric-icon grid h-7 w-7 place-items-center rounded-xl dark:rounded-none ${tones[tone] || tones.emerald}`}
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

function ComparisonChange({ metric }) {
  if (!metric?.hasReference || metric.changePercent === null) {
    return (
      <span className="text-[10px] font-bold text-[color:var(--text-muted)]">
        Sin referencia previa
      </span>
    );
  }
  const change = Number(metric.changePercent || 0);
  const isUp = change > 1;
  const isDown = change < -1;
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-black ${
        isUp
          ? "text-emerald-600 dark:text-emerald-300"
          : isDown
            ? "text-red-500 dark:text-red-300"
            : "text-[color:var(--text-muted)]"
      }`}
    >
      <Icon className="h-3 w-3" />
      {isUp ? "+" : ""}
      {Math.round(change)}%
    </span>
  );
}

function PeriodComparisonPanel({
  comparison,
  loading,
  error,
  locked,
  onUpgrade,
}) {
  if (locked) {
    return (
      <section className="dashboard-pilot__card border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#ff5722] dark:text-[#e2ff00]">
                Actual vs anterior
              </p>
              <span className="border border-[#ff5722]/30 px-1.5 py-0.5 text-[9px] font-black uppercase text-[#ff5722] dark:border-[#e2ff00]/30 dark:text-[#e2ff00]">
                Pro
              </span>
            </div>
            <h2 className="mt-1 text-lg font-black uppercase text-[color:var(--text)]">
              Comparativa inteligente
            </h2>
            <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
              Sesiones, volumen, fuerza, adherencia y recuperacion contra los
              mismos dias de la semana anterior.
            </p>
          </div>
          <button
            type="button"
            onClick={onUpgrade}
            className="h-10 shrink-0 bg-[#ff5722] px-4 text-xs font-black uppercase text-white dark:bg-[#e2ff00] dark:text-black"
          >
            Ver Premium
          </button>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="dashboard-pilot__card border border-[color:var(--border)] bg-[color:var(--card)] p-4">
        <p className="text-xs font-black uppercase text-[color:var(--text-muted)]">
          Calculando actual vs anterior...
        </p>
      </section>
    );
  }

  if (error || !comparison?.metrics) {
    return (
      <section className="dashboard-pilot__card border border-[color:var(--border)] bg-[color:var(--card)] p-4">
        <p className="text-xs font-bold text-[color:var(--text-muted)]">
          No se pudo preparar la comparativa semanal.
        </p>
      </section>
    );
  }

  const metrics = comparison.metrics;
  const cards = [
    {
      key: "sessions",
      label: "Sesiones",
      icon: Activity,
      metric: metrics.sessions,
      value: Math.round(metrics.sessions.current),
      previous: `${Math.round(metrics.sessions.previous)} anterior`,
    },
    {
      key: "volume",
      label: "Volumen",
      icon: TrendingUp,
      metric: metrics.volume,
      value: `${formatCompact(metrics.volume.current)} kg`,
      previous: `${formatCompact(metrics.volume.previous)} kg anterior`,
    },
    {
      key: "strength",
      label: "Fuerza estimada",
      icon: Dumbbell,
      metric: metrics.strength,
      value: metrics.strength.available
        ? `${Math.round(metrics.strength.current)} kg`
        : "--",
      previous: metrics.strength.available
        ? `${Math.round(metrics.strength.previous)} kg e1RM · ${metrics.strength.comparableExercises} ejercicios`
        : "Repite ejercicios en ambos periodos",
    },
    {
      key: "adherence",
      label: "Adherencia",
      icon: Target,
      metric: metrics.adherence,
      value: metrics.adherence.available
        ? `${Math.round(metrics.adherence.current)}%`
        : "--",
      previous: metrics.adherence.available
        ? metrics.adherence.hasReference
          ? `${Math.round(metrics.adherence.previous)}% anterior · meta ${metrics.adherence.target}`
          : `Meta actual ${metrics.adherence.target} · plan sin referencia previa`
        : "Activa un plan para medirla",
    },
    {
      key: "recovery",
      label: "Recuperacion",
      icon: Gauge,
      metric: metrics.recovery,
      value: metrics.recovery.available
        ? `${Math.round(metrics.recovery.current)}%`
        : "--",
      previous: metrics.recovery.available
        ? metrics.recovery.hasReference
          ? `${Math.round(metrics.recovery.previous)}% anterior · ${metrics.recovery.currentObservations} check-ins`
          : "Sin check-in en el periodo anterior"
        : "Completa check-ins en ambos periodos",
    },
  ];

  return (
    <section className="dashboard-pilot__card dashboard-pilot__comparison border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#ff5722] dark:text-[#e2ff00]">
            Actual vs anterior
          </p>
          <h2 className="mt-1 text-lg font-black uppercase text-[color:var(--text)]">
            Comparativa inteligente
          </h2>
        </div>
        <span className="border border-[color:var(--border)] bg-[color:var(--bg)] px-2 py-1 text-[9px] font-black uppercase text-[color:var(--text-muted)]">
          Mismos {comparison.period.elapsedDays} dias
        </span>
      </div>
      <p className="mt-1 text-[11px] font-semibold text-[color:var(--text-muted)]">
        Semana activa hasta hoy frente a los dias equivalentes de la semana
        pasada.
      </p>

      <div className="dashboard-pilot__comparison-grid mt-4 grid grid-cols-2 lg:grid-cols-5">
        {cards.map(({ key, label, icon: Icon, metric, value, previous }) => (
          <article
            key={key}
            className="dashboard-pilot__comparison-cell min-w-0 border border-[color:var(--border)] bg-[color:var(--bg)] p-3 last:col-span-2 lg:last:col-span-1"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-[9px] font-black uppercase text-[color:var(--text-muted)]">
                {label}
              </p>
              <Icon className="h-3.5 w-3.5 shrink-0 text-[#ff5722] dark:text-[#e2ff00]" />
            </div>
            <p className="mt-2 text-xl font-black text-[color:var(--text)]">
              {value}
            </p>
            <div className="mt-2 min-h-8">
              <ComparisonChange metric={metric} />
              <p className="mt-0.5 text-[9px] font-semibold leading-tight text-[color:var(--text-muted)]">
                {previous}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function WeekStrip({ days }) {
  return (
    <section className="dashboard-pilot__week grid grid-cols-7 border border-[color:var(--border)] bg-[color:var(--card)] px-2 shadow-sm dark:shadow-none sm:px-3">
      {days.map((day) => (
        <div
          key={day.key}
          data-current={day.isToday || undefined}
          data-trained={day.trained || undefined}
          className="dashboard-pilot__day px-1.5 py-2.5 text-center text-[color:var(--text-muted)]"
        >
          <p className="text-[10px] font-black uppercase">{day.label}</p>
          <p
            className={`mt-1 h-4 text-[9px] font-black ${
              day.trained
                ? "text-[#ff5722] dark:text-[#e2ff00]"
                : "text-[#c9c9c9] dark:text-[#454545]"
            }`}
          >
            {day.routine || "-"}
          </p>
        </div>
      ))}
    </section>
  );
}

function MonthActivityChart({ data, trainedDays, totalSets, monthLabel }) {
  const reduceMotion = useReducedMotion();
  const [selectedDay, setSelectedDay] = useState(null);
  const chartScrollRef = useRef(null);
  const activeSetCounts = data
    .map((day) => Number(day.sets || 0))
    .filter((sets) => sets > 0);
  const maxSets = Math.max(1, ...activeSetCounts);
  const typicalSets = median(activeSetCounts);

  useEffect(() => {
    const container = chartScrollRef.current;
    if (!container) return;
    container.scrollLeft = container.scrollWidth;
  }, [data.length]);

  return (
    <section className="rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm dark:rounded-[4px] dark:shadow-none">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--text)]">
            Actividad de {monthLabel}
          </p>
          <p className="mt-1 text-xs font-bold text-[color:var(--text-muted)]">
            Series completadas por día de entrenamiento
          </p>
        </div>
      </div>

      <div className="relative mt-4 h-40 rounded border border-[#d8d8d8] bg-[#fafafa] px-3 pb-2 pt-10 dark:rounded-[3px] dark:border-[#292929] dark:bg-[#080808]">
        {selectedDay ? (
          <div
            className={`absolute top-2 z-10 max-w-[190px] rounded border border-[color:var(--border)] bg-[color:var(--card)] px-2.5 py-1.5 text-[10px] font-bold text-[color:var(--text)] shadow-lg ${selectedDay.dayNumber > 20 ? "right-2" : "left-2"}`}
          >
            <span className="font-black">
              Día {selectedDay.dayNumber} · {selectedDay.dateLabel}
            </span>
            <span className="ml-2 text-[color:var(--text-muted)]">
              {selectedDay.sets > 0
                ? `${formatSeriesCount(selectedDay.sets)} series`
                : selectedDay.sessions > 0
                  ? "Sin series completadas"
                  : "Descanso"}
            </span>
            {selectedDay.incompleteSets > 0 ? (
              <span className="ml-1 text-[#c52d00] dark:text-[#e2ff00]">
                · {selectedDay.incompleteSets}{" "}
                {selectedDay.incompleteSets === 1 ? "pendiente" : "pendientes"}
              </span>
            ) : null}
            {selectedDay.routine ? (
              <span
                className="mt-0.5 block truncate text-[color:var(--text-muted)]"
                title={selectedDay.routine}
              >
                {selectedDay.routine}
              </span>
            ) : null}
            {selectedDay.sets > 0 ? (
              <span className="mt-0.5 block text-[color:var(--text-muted)]">
                Libre {formatCompact(selectedDay.externalKg)} kg · Máquina{" "}
                {formatCompact(selectedDay.machineKg)} kg
                {selectedDay.assistedSets
                  ? ` · Asistido ${selectedDay.assistedSets} series`
                  : ""}
                {selectedDay.bodyweightSets
                  ? ` · Corporal ${selectedDay.bodyweightSets} series`
                  : ""}
              </span>
            ) : null}
          </div>
        ) : null}

        <div
          ref={chartScrollRef}
          className="h-full overflow-x-auto overscroll-x-contain [scrollbar-width:thin]"
        >
          <div
            className="grid h-full items-end gap-[2px]"
            style={{
              gridTemplateColumns: `repeat(${data.length}, minmax(24px, 1fr))`,
              minWidth: data.length > 10 ? `${data.length * 28}px` : "100%",
            }}
          >
            {data.map((day) => {
              const sets = Number(day.sets || 0);
              const overloaded =
                sets > 0 && typicalSets > 0 && sets >= typicalSets * 1.5;
              const height = sets
                ? `${Math.max(10, (sets / maxSets) * 100)}%`
                : "3px";
              return (
                <button
                  type="button"
                  key={day.key}
                  onClick={() => setSelectedDay(day)}
                  onMouseEnter={() => setSelectedDay(day)}
                  onMouseLeave={() => setSelectedDay(null)}
                  className={`flex h-full min-w-0 flex-col items-center justify-end ${[8, 15, 22, 29].includes(day.dayNumber) ? "ml-1" : ""} ${day.isToday ? "bg-[#ff5722]/5 dark:bg-[#e2ff00]/5" : ""}`}
                  aria-label={`Día ${day.dayNumber}, ${day.dateLabel}: ${sets ? `${formatSeriesCount(sets)} series completadas` : day.sessions ? "sesión sin series completadas" : "sin entrenamiento"}`}
                >
                  <span className="flex min-h-0 w-full flex-1 items-end justify-center">
                    <motion.span
                      className={`block w-full max-w-6 rounded-t-[3px] transition-[height,opacity] duration-200 md:max-w-8 ${
                        sets
                          ? overloaded
                            ? "bg-[#c52d00] shadow-[0_0_8px_rgba(197,45,0,0.2)] dark:bg-[#e2ff00] dark:shadow-[0_0_10px_rgba(226,255,0,0.3)]"
                            : "bg-[#ff5722] dark:bg-[#b8d000]"
                          : day.isToday
                            ? "bg-[#ff5722] dark:bg-[#e2ff00]"
                            : "bg-[#d8d8d8] dark:bg-[#292929]"
                      }`}
                      initial={
                        reduceMotion ? false : { height: "3px", opacity: 0.45 }
                      }
                      animate={{ height, opacity: 1 }}
                      transition={{
                        duration: reduceMotion ? 0 : 0.45,
                        delay: reduceMotion
                          ? 0
                          : Math.min(day.dayNumber * 0.025, 0.3),
                        ease: [0.2, 0.8, 0.2, 1],
                      }}
                    />
                  </span>
                  <span
                    className={`mt-1 grid h-4 min-w-4 place-items-center rounded-[2px] px-0.5 text-[8px] font-black leading-none md:text-[9px] ${
                      day.isToday
                        ? "bg-[#ff5722] text-white dark:bg-[#e2ff00] dark:text-black"
                        : "text-[color:var(--text-muted)]"
                    }`}
                  >
                    {day.dayNumber}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 border-t border-[color:var(--border)] pt-3">
        <div className="border-r border-[color:var(--border)] px-3">
          <p className="text-[10px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
            Días entrenados
          </p>
          <p className="mt-2 text-2xl font-black text-[color:var(--text)]">
            {trainedDays}
          </p>
          <p className="mt-1 text-[11px] font-bold text-[color:var(--text-muted)]">
            en {monthLabel}
          </p>
        </div>
        <div className="px-3">
          <p className="text-[10px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
            Series completadas
          </p>
          <p className="mt-2 text-2xl font-black text-[color:var(--text)]">
            {formatSeriesCount(totalSets)}
          </p>
          <p className="mt-1 text-[11px] font-bold text-[color:var(--text-muted)]">
            completadas
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
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[color:var(--border)] bg-[color:var(--card)] text-[#ff5722] shadow-sm dark:text-[#e2ff00]"
          aria-label="Volver a tendencia"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ff5722] dark:text-[#e2ff00]">
            Detalle mensual
          </p>
          <h3 className="truncate text-xl font-black text-[color:var(--text)]">
            {detail.monthName}
          </h3>
        </div>
        <span className="rounded bg-[#fff0eb] px-2.5 py-1 text-[10px] font-black uppercase text-[#c52d00] dark:bg-[#1d2100] dark:text-[#e2ff00]">
          {detail.trainedDays} dias
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {detail.days.map((day) => (
          <article
            key={day.key}
            className={`relative min-h-[86px] rounded-2xl border p-3 shadow-sm ${
              day.active
                ? "border-[#ffb199] bg-[#fff0eb] text-[#1a1a1a] dark:border-[#e2ff00]/30 dark:bg-[#161900] dark:text-white"
                : "border-[color:var(--border)] bg-[#fafafa] text-[color:var(--text)] dark:bg-[#080808]"
            }`}
          >
            <span
              className={`absolute right-3 top-3 h-2 w-2 rounded-full ${
                day.active
                  ? "bg-[#ff5722] dark:bg-[#e2ff00]"
                  : "bg-[#d8d8d8] dark:bg-[#383838]"
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
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ff5722] dark:text-[#e2ff00]">
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
                className="rounded-lg border border-[color:var(--border)] bg-[#fafafa] p-3 dark:rounded-[4px] dark:bg-[#080808]"
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

function Dashboard({ onNavigate = () => {}, coachAthlete = null }) {
  const queryClient = useQueryClient();
  const dashboardBootstrap = useDashboardBootstrap();
  const {
    trainings = [],
    exercises: catalogExercises = [],
    trainingsLoading,
    trainingsError,
    reloadTrainings,
  } = useTrainingData();
  const { routines = [] } = useRoutines();
  const { theme } = useThemeMode();
  const [loadedActivePlan, setLoadedActivePlan] = useState(null);
  const activePlan = dashboardBootstrap.enabled
    ? dashboardBootstrap.data?.activePlan || null
    : loadedActivePlan;
  const [isThreeMonthsOpen, setIsThreeMonthsOpen] = useState(false);
  const [selectedMonthKey, setSelectedMonthKey] = useState(null);
  const [durationModalOpen, setDurationModalOpen] = useState(false);
  const [performanceModalType, setPerformanceModalType] = useState(null);
  const [recoveryModalOpen, setRecoveryModalOpen] = useState(false);
  const [weeklyLoadModalOpen, setWeeklyLoadModalOpen] = useState(false);
  const [weeklySetsModalOpen, setWeeklySetsModalOpen] = useState(false);
  const [quickWeightOpen, setQuickWeightOpen] = useState(false);
  const hasOpenModal = Boolean(
    durationModalOpen ||
    performanceModalType ||
    recoveryModalOpen ||
    weeklyLoadModalOpen ||
    weeklySetsModalOpen,
  );

  useEffect(() => {
    if (dashboardBootstrap.enabled) return undefined;
    let active = true;
    const athleteId = coachAthlete?.id || coachAthlete?._id || "";
    api
      .getTrainingPlans(athleteId)
      .then((plans) => {
        if (!active) return;
        setLoadedActivePlan(
          (Array.isArray(plans) ? plans : []).find(
            (plan) => plan.status === "active",
          ) || null,
        );
      })
      .catch(() => {
        if (active) setLoadedActivePlan(null);
      });
    return () => {
      active = false;
    };
  }, [coachAthlete, dashboardBootstrap.enabled]);

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
  const catalogIndex = useMemo(
    () => buildExerciseCatalogIndex(catalogExercises),
    [catalogExercises],
  );

  const now = useMemo(() => new Date(), []);
  const todayKey = getISODateKey(now);
  const todayWeighInKey = ["weigh-ins", "today", "self", todayKey];
  const todayWeighInQuery = useQuery({
    queryKey: todayWeighInKey,
    queryFn: () =>
      api.getWeighIns({ from: todayKey, to: todayKey, today: todayKey }),
    staleTime: 30 * 1000,
    enabled: !dashboardBootstrap.enabled,
  });
  const todayWeighInData = dashboardBootstrap.enabled
    ? dashboardBootstrap.data?.todayWeighIn
    : todayWeighInQuery.data;
  const needsDailyWeighIn =
    todayWeighInData && !todayWeighInData.summary?.completedToday;

  const saveQuickWeight = async (weightKg) => {
    const saved = await api.saveWeighIn({ dateKey: todayKey, weightKg });
    queryClient.setQueryData(todayWeighInKey, (previous = {}) => ({
      ...previous,
      entries: [saved],
      summary: {
        ...(previous.summary || {}),
        completedToday: true,
        latest: saved,
      },
    }));
    queryClient.invalidateQueries({ queryKey: ["weigh-ins"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-bootstrap"] });
    return saved;
  };

  const weekData = useMemo(() => {
    const start = getMondayWeekStart(now);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    const previousStart = new Date(start.getTime() - 7 * DAY_MS);
    const previousEnd = new Date(start.getTime() - 1);

    const dayMap = new Map();
    for (let index = 0; index < 7; index += 1) {
      const date = new Date(start.getTime() + index * DAY_MS);
      dayMap.set(getISODateKey(date), {
        key: getISODateKey(date),
        label: ["D", "L", "M", "X", "J", "V", "S"][date.getDay()],
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
    const volumeComparison = buildScopedPeriodComparison(
      currentTrainings,
      previousTrainings,
      (training) => getTrainingLoadMetrics(training, catalogIndex).externalKg,
    );
    const setsComparison = buildScopedPeriodComparison(
      currentTrainings,
      previousTrainings,
      (training) => getTrainingSetCount(training, catalogIndex),
    );
    const loadMetrics = sumTrainingLoadMetrics(currentTrainings, catalogIndex);
    const previousLoadMetrics = sumTrainingLoadMetrics(
      previousTrainings,
      catalogIndex,
    );

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
      totalVolume: loadMetrics.recordedKg,
      previousTotalVolume: previousLoadMetrics.recordedKg,
      loadMetrics,
      previousLoadMetrics,
      previousSeconds: previousTrainings.reduce(
        (sum, training) => sum + getEffectiveDurationSeconds(training),
        0,
      ),
      totalSets: setsComparison.currentTotal,
      volumeComparison,
      setsComparison,
      currentTrainings,
      previousTrainings,
      improvements: performanceChanges.improvements,
      declines: performanceChanges.declines,
      previousSessions: previousTrainings.length,
    };
  }, [catalogIndex, now, orderedTrainings, todayKey]);

  const monthActivity = useMemo(() => {
    const map = new Map();
    const elapsedDays = now.getDate();
    for (let index = 0; index < elapsedDays; index += 1) {
      const date = new Date(now.getFullYear(), now.getMonth(), index + 1);
      const key = getISODateKey(date);
      map.set(key, {
        key,
        dayNumber: index + 1,
        label: `D${index + 1}`,
        dateLabel: `${date.getDate()}/${date.getMonth() + 1}`,
        isToday: key === todayKey,
        sessions: 0,
        sets: 0,
        incompleteSets: 0,
        externalKg: 0,
        machineKg: 0,
        unknownKg: 0,
        assistanceKg: 0,
        bodyweightSets: 0,
        assistedSets: 0,
        routine: "",
      });
    }

    trainings.forEach((training) => {
      const date = toValidDate(training.date);
      if (!date) return;
      const key = getISODateKey(date);
      const day = map.get(key);
      if (!day) return;
      const metrics = getTrainingLoadMetrics(training, catalogIndex);
      day.sessions += 1;
      day.sets += metrics.completedSets;
      day.incompleteSets += metrics.incompleteSets;
      day.externalKg += metrics.externalKg;
      day.machineKg += metrics.machineKg;
      day.unknownKg += metrics.unknownKg;
      day.assistanceKg += metrics.assistanceKg;
      day.bodyweightSets += metrics.bodyweightSets;
      day.assistedSets += metrics.assistedSets;
      const routineName =
        training.routineName || training.routineId?.name || "Sesion";
      day.routine = day.routine
        ? `${day.routine}, ${routineName}`
        : routineName;
    });

    const days = Array.from(map.values());
    const trainedDays = days.filter((day) => day.sessions > 0).length;
    const totalSessions = days.reduce((sum, day) => sum + day.sessions, 0);
    const totalSets = days.reduce((sum, day) => sum + day.sets, 0);
    const monthLabel = titleCase(
      now.toLocaleDateString("es-BO", { month: "long" }),
    );

    return { days, trainedDays, totalSessions, totalSets, monthLabel };
  }, [catalogIndex, now, todayKey, trainings]);

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
      month.volume += getTrainingLoadMetrics(training, catalogIndex).externalKg;
      month.minutes += Math.round(getEffectiveDurationSeconds(training) / 60);
    });

    return Array.from(map.values());
  }, [catalogIndex, now, trainings]);

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
      const volume = getTrainingLoadMetrics(training, catalogIndex).externalKg;
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
  }, [catalogIndex, selectedMonthKey, threeMonthSummary, trainings]);

  const durationRows = useMemo(
    () =>
      [...(weekData.currentTrainings || [])]
        .sort((a, b) => getDateTimestamp(b.date) - getDateTimestamp(a.date))
        .map((training) => {
          const timing = getTimingBreakdown(training);
          return {
            id:
              training.id ||
              training._id ||
              `${training.date}-${getRoutineName(training)}`,
            date: training.date,
            routine: getRoutineName(training),
            branch: training.branch || training.routineBranch || "",
            seconds: timing.sessionSeconds,
            ...timing,
          };
        }),
    [weekData.currentTrainings],
  );

  const durationSummary = useMemo(() => {
    const trackedRows = durationRows.filter((row) => row.hasRestTracking);
    return {
      sessionSeconds: durationRows.reduce(
        (sum, row) => sum + row.sessionSeconds,
        0,
      ),
      workSeconds: trackedRows.reduce((sum, row) => sum + row.workSeconds, 0),
      restSeconds: trackedRows.reduce((sum, row) => sum + row.restSeconds, 0),
      pauseSeconds: durationRows.reduce(
        (sum, row) => sum + row.pauseSeconds,
        0,
      ),
      trackedCount: trackedRows.length,
    };
  }, [durationRows]);

  const weeklySets = useMemo(() => {
    const byMuscle = new Map();
    const byRoutine = new Map();
    const comparableScopes = new Set(
      weekData.setsComparison?.comparableScopeKeys || [],
    );

    (weekData.currentTrainings || []).forEach((training) => {
      const routineName = getRoutineName(training);
      const scopeKey = getTrainingProgressScopeKey(training);
      const routineKey = `${scopeKey}::${routineName}`;
      const routine = byRoutine.get(routineKey) || {
        key: routineKey,
        name: routineName,
        sets: 0,
        recordedSets: 0,
        incompleteSets: 0,
        sessions: 0,
        hasReference: comparableScopes.has(scopeKey),
      };
      routine.sessions += 1;

      (training.exercises || []).forEach((exercise) => {
        const metrics = getExerciseLoadMetrics(exercise, catalogIndex);
        const sets = metrics.completedSets;
        routine.recordedSets += metrics.recordedSets;
        routine.incompleteSets += metrics.incompleteSets;
        if (!sets) return;
        routine.sets += sets;
        getExerciseMuscleExposure(exercise, catalogIndex).forEach(
          (exposure) => {
            const muscleRow = byMuscle.get(exposure.group) || {
              name: exposure.group,
              sets: 0,
            };
            muscleRow.sets += exposure.equivalentSets;
            byMuscle.set(exposure.group, muscleRow);
          },
        );
      });

      byRoutine.set(routineKey, routine);
    });

    const comparison = getWeeklyComparisonSummary(
      weekData.setsComparison,
      (value) => Math.round(value),
      "series",
    );
    const previousTotal = weekData.previousLoadMetrics.completedSets;
    const diff = weekData.totalSets - previousTotal;
    return {
      total: weekData.totalSets,
      recorded: weekData.loadMetrics.recordedSets,
      incomplete: weekData.loadMetrics.incompleteSets,
      comparableCurrent: comparison.comparableCurrent,
      previous: comparison.previous,
      previousTotal,
      excluded: comparison.excluded,
      hasReference: previousTotal > 0,
      hasProgressionReference: comparison.hasReference,
      isPartial: comparison.isPartial,
      description:
        "Solo se cuentan series marcadas como completadas. La comparacion principal incluye toda la semana.",
      diff,
      diffLabel:
        previousTotal > 0
          ? `${diff >= 0 ? "+" : ""}${diff} vs anterior`
          : "Sin referencia semanal",
      statusLabel: weekData.loadMetrics.incompleteSets
        ? `${weekData.loadMetrics.incompleteSets} ${weekData.loadMetrics.incompleteSets === 1 ? "pendiente" : "pendientes"}`
        : "Sin pendientes",
      progressionDescription: comparison.description,
      progressionLabel: comparison.changeLabel,
      byMuscle: Array.from(byMuscle.values()).sort((a, b) => b.sets - a.sets),
      byRoutine: Array.from(byRoutine.values()).sort((a, b) => b.sets - a.sets),
    };
  }, [catalogIndex, weekData]);

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
            "Mejor serie de esta semana frente a la ejecución inmediatamente anterior del ejercicio.",
          label: "Bajamos",
          count: weekData.declines?.length || 0,
          groups: declinesByMuscle,
          tone: "red",
          typeKey: "declineType",
          empty: "No se detectaron bajadas en esta semana activa.",
        }
      : {
          eyebrow: "Vs anterior",
          title: "Donde subimos",
          description:
            "Mejor serie de esta semana frente a la ejecución inmediatamente anterior del ejercicio.",
          label: "Subimos",
          count: weekData.improvements?.length || 0,
          groups: improvementsByMuscle,
          tone: "emerald",
          typeKey: "improvementType",
          empty: "No se detectaron subidas en esta semana activa.",
        };

  const recovery = useMemo(() => {
    const todayStart = new Date(todayKey).getTime();
    const weekStart = getMondayWeekStart(now).getTime();
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

    const weeklySets = Number(weekData.loadMetrics.completedSets || 0);
    const previousWeeklySets = Number(
      weekData.previousLoadMetrics.completedSets || 0,
    );
    const weeklySeconds = Number(weekData.totalSeconds || 0);
    const loadSpike =
      previousWeeklySets > 0
        ? (weeklySets - previousWeeklySets) / previousWeeklySets
        : 0;
    const weeklyLoadAdjustment =
      loadSpike >= 0.2
        ? -Math.min(12, Math.round(loadSpike * 10))
        : loadSpike <= -0.2
          ? Math.min(4, Math.round(Math.abs(loadSpike) * 5))
          : 0;
    const factors = [];
    const muscleStats = new Map();

    orderedTrainings.forEach((training) => {
      const timestamp = getDateTimestamp(training.date);
      if (!timestamp || timestamp > now.getTime()) return;
      getTrainingMuscleMetrics(training, catalogIndex).forEach(
        (metric, key) => {
          if (!metric.sets) return;
          const current = muscleStats.get(key) || {
            key,
            muscle: metric.muscle,
            records: [],
          };
          current.records.push({
            timestamp,
            sets: metric.sets,
          });
          muscleStats.set(key, current);
        },
      );
    });

    const muscleReadiness = Array.from(muscleStats.values())
      .map((item) => {
        const records = [...item.records].sort(
          (a, b) => a.timestamp - b.timestamp,
        );
        const baselineRecords =
          records.length > 1 ? records.slice(0, -1).slice(-8) : records;
        const typicalSets = median(
          baselineRecords.map((record) => record.sets),
        );
        const recentRecords = records.filter(
          (record) => now.getTime() - record.timestamp <= 7 * DAY_MS,
        );
        let fatigue = 0;
        recentRecords.forEach((record) => {
          const ageDays = Math.max(
            0,
            (now.getTime() - record.timestamp) / DAY_MS,
          );
          const setRatio = typicalSets ? record.sets / typicalSets : 1;
          const relativeLoad = Math.min(3, setRatio);
          fatigue += relativeLoad * 0.5 ** (ageDays / 2);
        });
        const value = Math.max(
          10,
          Math.min(98, Math.round(100 - fatigue * 48)),
        );
        const lastRecord = records[records.length - 1] || null;
        const days = lastRecord
          ? Math.max(
              0,
              Math.floor((todayStart - lastRecord.timestamp) / DAY_MS),
            )
          : null;
        const latestSetRatio =
          lastRecord && typicalSets ? lastRecord.sets / typicalSets : 1;
        const weeklyRecords = records.filter(
          (record) => record.timestamp >= weekStart,
        );
        return {
          key: item.key,
          muscle: item.muscle,
          lastTimestamp: lastRecord?.timestamp || 0,
          daysSinceLast: days,
          typicalSets: Math.round(typicalSets),
          latestSets: lastRecord?.sets || 0,
          latestSetRatio,
          weeklySets: weeklyRecords.reduce(
            (sum, record) => sum + record.sets,
            0,
          ),
          value,
          label: getRecoveryLabel(value),
        };
      })
      .sort((a, b) => b.value - a.value || a.muscle.localeCompare(b.muscle));

    const muscleReadinessMap = new Map(
      muscleReadiness.map((item) => [item.key, item]),
    );

    const routineById = new Map(
      routines.map((routine) => [String(routine.id || routine._id), routine]),
    );
    const planSchedule = activePlan?.weeklySchedule || [];
    const seenRoutineIds = new Set();
    const routineReadiness = planSchedule
      .filter((day) => day.type === "training" && day.routineId)
      .map((day) => {
        const routineId = String(day.routineId);
        if (seenRoutineIds.has(routineId)) return null;
        seenRoutineIds.add(routineId);
        const routine = routineById.get(routineId);
        if (!routine) return null;
        const muscleEntries = getRoutineMuscles(routine, catalogIndex);
        const muscles = muscleEntries.map((entry) => entry.muscle);
        const scores = muscleEntries.map((entry) => ({
          value: muscleReadinessMap.get(entry.key)?.value ?? 96,
          weight: entry.weight,
        }));
        const limitingScores = scores.filter((score) => score.weight >= 0.5);
        const min = limitingScores.length
          ? Math.min(...limitingScores.map((score) => score.value))
          : 90;
        const totalWeight = scores.reduce(
          (sum, score) => sum + score.weight,
          0,
        );
        const avg = totalWeight
          ? scores.reduce((sum, score) => sum + score.value * score.weight, 0) /
            totalWeight
          : 90;
        const value = Math.max(
          10,
          Math.min(
            98,
            Math.round(avg * 0.55 + min * 0.45 + weeklyLoadAdjustment),
          ),
        );
        const limitingMuscle = muscleEntries
          .map((entry) => muscleReadinessMap.get(entry.key))
          .filter(Boolean)
          .sort((a, b) => a.value - b.value)[0];

        return {
          id: routineId,
          name: routine.name || day.focus || "Rutina del plan",
          muscles,
          value,
          label: getRecoveryLabel(value),
          limitingMuscle,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));

    const globalValue = Math.max(
      10,
      Math.min(
        98,
        (muscleReadiness.length
          ? Math.round(
              muscleReadiness.reduce((sum, item) => sum + item.value, 0) /
                muscleReadiness.length,
            )
          : 96) + weeklyLoadAdjustment,
      ),
    );
    const mondayIndex = (now.getDay() + 6) % 7;
    const scheduleIndex =
      activePlan?.scheduleMode === "fixed"
        ? planSchedule.findIndex(
            (day) => Number(day.dayIndex || day.order) === mondayIndex + 1,
          )
        : Math.min(
            Math.max(0, Number(activePlan?.cycleProgress?.currentIndex || 0)),
            Math.max(0, planSchedule.length - 1),
          );
    const scheduledDay = activePlan
      ? planSchedule[scheduleIndex] || null
      : null;
    const scheduledRoutine = scheduledDay?.routineId
      ? routineReadiness.find(
          (routine) => routine.id === String(scheduledDay.routineId),
        ) || null
      : null;
    const betterAlternative = scheduledRoutine
      ? routineReadiness.find(
          (routine) =>
            routine.id !== scheduledRoutine.id &&
            routine.value >= 65 &&
            routine.value >= scheduledRoutine.value + 12,
        ) || null
      : routineReadiness[0] || null;
    const isPlannedRest =
      Boolean(activePlan) &&
      (!scheduledDay || scheduledDay.type !== "training");
    const recommended = isPlannedRest
      ? null
      : scheduledRoutine?.value >= 65
        ? scheduledRoutine
        : betterAlternative || scheduledRoutine;
    const recommendationReason = !activePlan
      ? "Activa una planificacion para recibir una sugerencia"
      : isPlannedRest
        ? scheduledDay?.type === "recovery"
          ? "Hoy corresponde recuperacion en tu plan"
          : "Hoy corresponde descanso en tu plan"
        : betterAlternative && scheduledRoutine?.value < 65
          ? `${scheduledRoutine.name} esta limitada por ${scheduledRoutine.limitingMuscle?.muscle || "fatiga reciente"}`
          : scheduledRoutine?.value < 65
            ? "La rutina prevista presenta fatiga alta; reduce volumen o descansa"
            : "Rutina prevista y compatible con tu recuperacion";
    const value = recommended?.value ?? globalValue;
    const label = recommended?.name || recommendationReason;

    const overloadedMuscles = muscleReadiness.filter(
      (item) => item.latestSetRatio >= 1.5 && item.daysSinceLast <= 3,
    );
    overloadedMuscles.slice(0, 2).forEach((item) => {
      factors.push({
        label: `${item.muscle}: ${formatEquivalentSeries(item.latestSets)} vs ${formatEquivalentSeries(item.typicalSets || 0)} habituales`,
        impact: `${Math.round(item.latestSetRatio * 100)}%`,
      });
    });
    if (!overloadedMuscles.length && daysSinceLast != null) {
      factors.push({
        label: daysSinceLast <= 1 ? "Sesion reciente" : "Descanso acumulado",
        impact: daysSinceLast <= 1 ? "Carga" : "+Recuperacion",
      });
    }
    if (previousWeeklySets > 0 && Math.abs(loadSpike) >= 0.2) {
      factors.push({
        label: `Series semanales: ${weeklySets} vs ${previousWeeklySets}`,
        impact: `${weeklyLoadAdjustment >= 0 ? "+" : ""}${weeklyLoadAdjustment} rec.`,
      });
    }

    return {
      value,
      label,
      globalValue,
      globalLabel: getRecoveryLabel(globalValue),
      daysSinceLast,
      consecutiveDays,
      weeklySets,
      previousWeeklySets,
      weeklySeconds,
      loadSpike,
      factors,
      lastTraining,
      routineReadiness,
      muscleReadiness,
      recommended,
      recommendationReason,
      activePlan,
      scheduledRoutine,
      isPlannedRest,
    };
  }, [
    activePlan,
    catalogIndex,
    now,
    orderedTrainings,
    routines,
    todayKey,
    weekData,
  ]);

  const weeklyLoad = useMemo(() => {
    const progression = getWeeklyComparisonSummary(
      weekData.volumeComparison,
      formatCompact,
      "kg",
    );
    const byMuscle = new Map();
    const byRoutine = new Map();
    const comparableScopes = new Set(
      weekData.volumeComparison?.comparableScopeKeys || [],
    );

    (weekData.currentTrainings || []).forEach((training) => {
      const routineName = getRoutineName(training);
      const scopeKey = getTrainingProgressScopeKey(training);
      const routineKey = `${scopeKey}::${routineName}`;
      const routine = byRoutine.get(routineKey) || {
        key: routineKey,
        name: routineName,
        completedSets: 0,
        externalKg: 0,
        machineKg: 0,
        unknownKg: 0,
        assistanceKg: 0,
        bodyweightSets: 0,
        assistedSets: 0,
        machineSets: 0,
        sessions: 0,
        hasReference: comparableScopes.has(scopeKey),
      };
      routine.sessions += 1;

      (training.exercises || []).forEach((exercise) => {
        const metrics = getExerciseLoadMetrics(exercise, catalogIndex);
        routine.completedSets += metrics.completedSets;
        routine.externalKg += metrics.externalKg;
        routine.machineKg += metrics.machineKg;
        routine.unknownKg += metrics.unknownKg;
        routine.assistanceKg += metrics.assistanceKg;
        routine.bodyweightSets += metrics.bodyweightSets;
        routine.assistedSets += metrics.assistedSets;
        routine.machineSets += metrics.machineSets;
        getExerciseMuscleExposure(exercise, catalogIndex).forEach(
          (exposure) => {
            const muscleRow = byMuscle.get(exposure.group) || {
              muscle: exposure.group,
              equivalentSets: 0,
            };
            muscleRow.equivalentSets += exposure.equivalentSets;
            byMuscle.set(exposure.group, muscleRow);
          },
        );
      });

      byRoutine.set(routineKey, routine);
    });

    const current = weekData.loadMetrics.externalKg;
    const previousTotal = weekData.previousLoadMetrics.externalKg;
    return {
      current,
      previousTotal,
      changeLabel:
        previousTotal > 0
          ? `${formatPercentChange(current, previousTotal)} vs semana anterior`
          : "Sin referencia semanal",
      description:
        "Peso externo por repeticiones en series completadas. Maquinas, asistencia y peso corporal se muestran por separado.",
      comparableCurrent: progression.comparableCurrent,
      previous: progression.previous,
      progressionChangeLabel: progression.changeLabel,
      progressionDescription: progression.description,
      hasProgressionReference: progression.hasReference,
      loadMetrics: weekData.loadMetrics,
      byMuscle: Array.from(byMuscle.values()).sort(
        (a, b) => b.equivalentSets - a.equivalentSets,
      ),
      byRoutine: Array.from(byRoutine.values()).sort(
        (a, b) => b.completedSets - a.completedSets,
      ),
    };
  }, [catalogIndex, weekData]);

  const isDark = theme === "dark";
  const hasTrainingHistory = orderedTrainings.length > 0;

  if (trainingsLoading) {
    return (
      <OperationLoader
        active
        delayMs={0}
        mode="inline"
        title="Cargando tu actividad"
        description="Sincronizando entrenamientos y metricas del dashboard."
      />
    );
  }

  if (trainingsError && !hasTrainingHistory) {
    return (
      <section
        role="alert"
        className="mx-auto grid min-h-[55dvh] w-full max-w-md place-items-center px-3 py-10 text-center"
      >
        <div className="w-full border border-[color:var(--border)] bg-[color:var(--card)] p-6 shadow-sm dark:shadow-none">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#fff0eb] text-[#ff5722] dark:bg-[#e2ff00]/10 dark:text-[#e2ff00]">
            <AlertTriangle className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-xl font-black uppercase">
            No pudimos cargar tu actividad
          </h1>
          <p className="mt-2 text-sm font-semibold text-[color:var(--text-muted)]">
            Tu historial sigue guardado. Reintenta la sincronizacion con el
            servidor.
          </p>
          <button
            type="button"
            onClick={() => reloadTrainings()}
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 bg-[#ff5722] px-5 text-xs font-black uppercase text-white dark:bg-[#e2ff00] dark:text-black"
          >
            <RotateCcw className="h-4 w-4" />
            Reintentar
          </button>
        </div>
      </section>
    );
  }

  return (
    <motion.div
      initial={false}
      className="dashboard-shell dashboard-pilot mx-auto w-full max-w-md space-y-4 pb-10 pt-4 text-[color:var(--text)] md:max-w-5xl md:pt-0 xl:max-w-6xl 2xl:max-w-[1280px]"
    >
      <header className="dashboard-pilot__header flex items-center justify-between gap-3 border-b border-transparent pb-3 dark:border-[#252525] dark:pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <MobileMenuButton />
          <div className="min-w-0">
            <h1 className="text-3xl font-black italic leading-[0.9] text-[#1a1a1a] dark:text-white">
              APEX
              <br />
              <span className="text-[#ff5722] dark:text-[#e2ff00]">
                PERFORMANCE
              </span>
            </h1>
            <p className="dashboard-pilot__period mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
              Semana activa · {weekData.days[0]?.key?.slice(8)}–
              {weekData.days[6]?.key?.slice(8)}{" "}
              {titleCase(
                now.toLocaleDateString("es-BO", { month: "short" }),
              ).replace(".", "")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {needsDailyWeighIn ? (
            <button
              type="button"
              onClick={() => setQuickWeightOpen(true)}
              className="dashboard-pilot__action dashboard-pilot__action--accent relative grid h-10 w-10 place-items-center rounded-full border border-[#ff5722] bg-[#fff0eb] text-[#ff5722] shadow-sm dark:border-[#e2ff00] dark:bg-[#1d2100] dark:text-[#e2ff00] dark:shadow-none"
              aria-label="Registrar pesaje de hoy"
              title="Registrar pesaje de hoy"
            >
              <Weight className="h-5 w-5 motion-safe:animate-pulse" />
              <span
                aria-hidden="true"
                className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-[color:var(--bg)] bg-[#ff5722] dark:bg-[#e2ff00]"
              />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onNavigate("registrar")}
            className="dashboard-pilot__action grid h-10 w-10 place-items-center rounded-full border border-[color:var(--border)] bg-[color:var(--card)] text-[#1a1a1a] shadow-sm dark:text-[#e2ff00] dark:shadow-none"
            aria-label="Registrar entrenamiento"
          >
            <Play className="h-5 w-5" />
          </button>
          <ThemeToggle />
        </div>
      </header>

      <p className="dashboard-pilot__section-label text-xs font-black uppercase text-[color:var(--text-muted)] dark:text-[#d8d8c0]">
        Rendimiento semanal
      </p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Dias activos"
          value={`${weekData.activeDays}/7`}
          icon={CalendarDays}
          tone="emerald"
          primary
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
          label="Tiempo de sesión"
          value={formatDashboardDuration(weekData.totalSeconds)}
          icon={Clock3}
          tone="amber"
          onClick={() => setDurationModalOpen(true)}
        />
        <article className="dashboard-pilot__metric rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-left shadow-sm dark:rounded-[4px] dark:shadow-none">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
              Vs anterior
            </p>
            <TrendingUp className="h-3.5 w-3.5 text-[#ff5722] dark:text-[#e2ff00]" />
          </div>
          <div className="dashboard-pilot__split mt-3 grid grid-cols-2 overflow-hidden border border-[color:var(--border)] bg-[color:var(--segmented-surface)]">
            <button
              type="button"
              onClick={() => setPerformanceModalType("declines")}
              className="border-r border-[color:var(--border)] px-2.5 py-2 text-left transition hover:text-[color:var(--text)] active:opacity-70"
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
              className="px-2.5 py-2 text-left transition hover:text-[color:var(--text)] active:opacity-70"
            >
              <p className="text-[9px] font-black uppercase tracking-wide text-[#6f6f6f] dark:text-[#e2ff00]">
                Subimos
              </p>
              <p className="mt-1 text-2xl font-black text-[#ff5722] dark:text-[#e2ff00]">
                {formatSignedCount(weekData.improvements?.length, "+")}
              </p>
            </button>
          </div>
        </article>
      </div>

      <WeekStrip days={weekData.days} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-2">
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
          className="dashboard-pilot__card dashboard-pilot__recovery col-span-2 row-span-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-left shadow-sm transition hover:border-[color:var(--border-strong)] dark:rounded-[4px] dark:shadow-none lg:col-span-1"
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
              Recovery
            </p>
            <Zap className="h-4 w-4 text-[#ff5722] dark:text-[#e2ff00]" />
          </div>
          <div className="mt-5 grid place-items-center">
            <div
              className="dashboard-pilot__recovery-ring grid h-36 w-36 place-items-center rounded-full p-[9px]"
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
          {hasTrainingHistory && recovery.activePlan ? (
            <p className="mt-1 truncate text-center text-[10px] font-black uppercase text-[#ff5722] dark:text-[#e2ff00]">
              {recovery.activePlan.name}
            </p>
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => setWeeklyLoadModalOpen(true)}
          className="dashboard-pilot__card rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-left shadow-sm transition hover:border-[color:var(--border-strong)] dark:rounded-[4px] dark:shadow-none"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
              Tonelaje libre
            </p>
            <TrendingUp className="h-3.5 w-3.5 text-[#ff5722] dark:text-[#e2ff00]" />
          </div>
          <p className="mt-2 text-2xl font-black text-[color:var(--text)]">
            {formatCompact(weeklyLoad.current)} kg
          </p>
          <p className="mt-1 text-[11px] font-semibold text-[color:var(--text-muted)]">
            {weeklyLoad.changeLabel}
          </p>
        </button>
        <button
          type="button"
          onClick={() => setWeeklySetsModalOpen(true)}
          className="dashboard-pilot__card rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-left shadow-sm transition hover:border-[color:var(--border-strong)] dark:rounded-[4px] dark:shadow-none"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
              Series completadas
            </p>
            <ListChecks className="h-3.5 w-3.5 text-[#5f5f5f] dark:text-[#e2ff00]" />
          </div>
          <p className="mt-2 text-2xl font-black text-[color:var(--text)]">
            {weeklySets.total}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-[color:var(--text-muted)]">
            {weeklySets.statusLabel} · {weeklySets.diffLabel}
          </p>
        </button>
      </div>

      <MonthActivityChart
        data={monthActivity.days}
        trainedDays={monthActivity.trainedDays}
        totalSets={monthActivity.totalSets}
        monthLabel={monthActivity.monthLabel}
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
            <div className="h-56 rounded border border-[color:var(--border)] bg-[#fafafa] p-3 dark:bg-[#080808]">
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
                    fill: isDark ? "#b8b8a6" : "#6f6f6f",
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily:
                      '"Barlow Condensed", "Arial Narrow", sans-serif',
                  },
                  grid: {
                    line: {
                      stroke: isDark ? "#292929" : "#dedede",
                      strokeDasharray: "3 3",
                    },
                  },
                  axis: {
                    ticks: {
                      line: { stroke: "transparent" },
                      text: { fill: isDark ? "#b8b8a6" : "#6f6f6f" },
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
                  className="w-full rounded-lg border border-[color:var(--border)] bg-[#fafafa] p-3 text-left shadow-sm transition hover:border-[color:var(--border-strong)] dark:rounded-[4px] dark:bg-[#080808]"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-black text-[color:var(--text)]">
                      {month.month}
                    </p>
                    <p className="text-xs font-black text-[#ff5722] dark:text-[#e2ff00]">
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
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ff5722] dark:text-[#e2ff00]">
                  Recovery
                </p>
                <h2 className="mt-1 text-xl font-black text-[color:var(--text)]">
                  {recovery.value}% -{" "}
                  {recovery.recommended
                    ? `Mejor hoy: ${recovery.recommended.name}`
                    : recovery.label}
                </h2>
                <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
                  {recovery.recommendationReason}. Se compara la exposición
                  muscular reciente con tu carga habitual.
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
                    Series completadas
                  </p>
                  <p className="mt-2 text-xl font-black text-[color:var(--text)]">
                    {formatSeriesCount(recovery.weeklySets)}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-[color:var(--text-muted)]">
                    semana activa
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
                  <span className="rounded bg-[#fff0eb] px-2 py-1 text-[10px] font-black text-[#c52d00] dark:bg-[#1d2100] dark:text-[#e2ff00]">
                    {recovery.activePlan?.name || "Sin plan vigente"}
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
                                ? "bg-[#fff0eb] text-[#c52d00] dark:bg-[#1d2100] dark:text-[#e2ff00]"
                                : "bg-red-500/10 text-red-700 dark:text-red-300"
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
                      {recovery.activePlan
                        ? "El plan vigente no tiene rutinas disponibles para sugerir."
                        : "Activa una planificación para recibir sugerencias de rutina."}
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
                                ? "bg-[#fff0eb] text-[#c52d00] dark:bg-[#1d2100] dark:text-[#e2ff00]"
                                : "bg-red-500/10 text-red-700 dark:text-red-300"
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
                        <p className="mt-1 text-[10px] font-bold text-[color:var(--text-muted)]">
                          Último: {formatEquivalentSeries(muscle.latestSets)} ·
                          habitual:{" "}
                          {muscle.typicalSets
                            ? formatEquivalentSeries(muscle.typicalSets)
                            : "--"}
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
                              ? "bg-[#fff0eb] text-[#c52d00] dark:bg-[#1d2100] dark:text-[#e2ff00]"
                              : "bg-red-500/10 text-red-700 dark:text-red-300"
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
        <DetailSheet
          ariaLabel="Detalle de tonelaje libre semanal"
          onClose={() => setWeeklyLoadModalOpen(false)}
        >
          <DetailSheetHeader
            eyebrow="Tonelaje libre semanal"
            title={
              <>
                {formatCompact(weeklyLoad.current)} kg ·{" "}
                {weeklyLoad.changeLabel}
              </>
            }
            description={weeklyLoad.description}
            onClose={() => setWeeklyLoadModalOpen(false)}
          />

          <DetailSheetBody>
            <DetailModule>
              <DetailStatGrid className="grid-cols-2 sm:grid-cols-3">
                <DetailStat
                  label="Esta semana"
                  value={`${formatCompact(weeklyLoad.current)} kg`}
                />
                <DetailStat
                  label="Semana anterior"
                  value={`${formatCompact(weeklyLoad.previousTotal)} kg`}
                />
                <DetailStat
                  label="Comparable"
                  value={`${formatCompact(weeklyLoad.comparableCurrent)} kg`}
                  className="col-span-2 sm:col-span-1"
                />
              </DetailStatGrid>
              <p className="mt-4 border-t border-[color:var(--detail-row-divider)] pt-3 text-xs font-semibold text-[color:var(--text-muted)]">
                Progresión comparable: {weeklyLoad.progressionChangeLabel}
                {weeklyLoad.hasProgressionReference
                  ? ` · base ${formatCompact(weeklyLoad.previous)} kg`
                  : ""}
              </p>
            </DetailModule>

            <DetailSection title="Otras modalidades">
              <DetailStatGrid className="grid-cols-2">
                <DetailStat
                  label="Máquinas"
                  value={`${formatCompact(weeklyLoad.loadMetrics.machineKg)} kg`}
                  detail={`${weeklyLoad.loadMetrics.machineSets} series`}
                />
                <DetailStat
                  label="Peso corporal"
                  value={`${weeklyLoad.loadMetrics.bodyweightSets} series`}
                />
                <DetailStat
                  label="Asistencia"
                  value={`${weeklyLoad.loadMetrics.assistedSets} series`}
                  detail={`${formatCompact(weeklyLoad.loadMetrics.assistanceKg)} kg`}
                />
                <DetailStat
                  label="Sin clasificar"
                  value={`${weeklyLoad.loadMetrics.unknownSets} series`}
                  detail={`${formatCompact(weeklyLoad.loadMetrics.unknownKg)} kg`}
                />
              </DetailStatGrid>
            </DetailSection>

            <DetailSection title="Exposición muscular estimada">
              {weeklyLoad.byMuscle.length ? (
                <DetailRows>
                  {weeklyLoad.byMuscle.map((item) => (
                    <DetailRow key={item.muscle}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-bold text-[color:var(--text)]">
                          {item.muscle}
                        </p>
                        <p className="text-sm font-bold text-[color:var(--accent)]">
                          {formatEquivalentSeries(item.equivalentSets)}
                        </p>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[color:var(--detail-row-divider)]">
                        <div
                          className="h-full rounded-full bg-[color:var(--accent)]"
                          style={{
                            width: `${Math.min(
                              100,
                              weeklyLoad.byMuscle[0]?.equivalentSets
                                ? (item.equivalentSets /
                                    weeklyLoad.byMuscle[0].equivalentSets) *
                                    100
                                : 0,
                            )}%`,
                          }}
                        />
                      </div>
                    </DetailRow>
                  ))}
                </DetailRows>
              ) : (
                <p className="text-sm font-semibold text-[color:var(--text-muted)]">
                  No hay series completadas esta semana.
                </p>
              )}
            </DetailSection>

            <DetailSection title="Por rutina">
              {weeklyLoad.byRoutine.length ? (
                <DetailRows>
                  {weeklyLoad.byRoutine.map((item) => (
                    <DetailRow
                      key={item.key}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[color:var(--text)]">
                          {item.name}
                        </p>
                        <p className="text-[11px] font-semibold text-[color:var(--text-muted)]">
                          {formatSessionCount(item.sessions)} ·{" "}
                          {item.completedSets} series
                          {!item.hasReference
                            ? " / ciclo sin referencia"
                            : ""}
                        </p>
                        <p className="mt-1 text-[10px] font-semibold text-[color:var(--text-muted)]">
                          Libre {formatCompact(item.externalKg)} kg · Máquina{" "}
                          {formatCompact(item.machineKg)} kg
                          {item.bodyweightSets
                            ? ` · Corporal ${item.bodyweightSets} series`
                            : ""}
                          {item.assistedSets
                            ? ` · Asistido ${item.assistedSets} series`
                            : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-bold text-[color:var(--text)]">
                        {item.completedSets}
                      </span>
                    </DetailRow>
                  ))}
                </DetailRows>
              ) : (
                <p className="text-sm font-semibold text-[color:var(--text-muted)]">
                  No hay rutinas registradas esta semana.
                </p>
              )}
            </DetailSection>
          </DetailSheetBody>
        </DetailSheet>
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
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ff5722] dark:text-[#e2ff00]">
                  Series completadas
                </p>
                <h2 className="mt-1 text-xl font-black text-[color:var(--text)]">
                  {weeklySets.total} series · {weeklySets.diffLabel}
                </h2>
                <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
                  {weeklySets.description}
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
              <div className="grid grid-cols-3 gap-2">
                <article className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
                    Total
                  </p>
                  <p className="mt-2 text-2xl font-black text-[color:var(--text)]">
                    {weeklySets.total}
                  </p>
                </article>
                <article className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
                    Pendientes
                  </p>
                  <p className="mt-2 text-2xl font-black text-[color:var(--text)]">
                    {weeklySets.incomplete}
                  </p>
                </article>
                <article className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
                    Semana anterior
                  </p>
                  <p className="mt-2 text-2xl font-black text-[color:var(--text)]">
                    {weeklySets.previousTotal}
                  </p>
                </article>
              </div>

              <p className="mt-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-xs font-semibold text-[color:var(--text-muted)]">
                Progresión comparable:{" "}
                {weeklySets.hasProgressionReference
                  ? `${weeklySets.comparableCurrent} series · ${weeklySets.progressionLabel}`
                  : "sin ciclo anterior comparable"}
              </p>

              <section className="mt-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                  Series equivalentes por músculo
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
                        <span className="shrink-0 rounded bg-[#fff0eb] px-2 py-1 text-xs font-black text-[#c52d00] dark:bg-[#1d2100] dark:text-[#e2ff00]">
                          {formatEquivalentSeries(item.sets)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm font-semibold text-[color:var(--text-muted)]">
                      No hay series completadas esta semana.
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
                        key={item.key}
                        className="flex items-center justify-between gap-3 rounded-xl bg-[color:var(--card)] px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-[color:var(--text)]">
                            {item.name}
                          </p>
                          <p className="text-[11px] font-semibold text-[color:var(--text-muted)]">
                            {formatSessionCount(item.sessions)}
                            {!item.hasReference
                              ? " / ciclo sin referencia"
                              : ""}
                          </p>
                          {item.incompleteSets ? (
                            <p className="mt-1 text-[10px] font-bold text-[#c52d00] dark:text-[#e2ff00]">
                              {item.incompleteSets}{" "}
                              {item.incompleteSets === 1
                                ? "serie pendiente"
                                : "series pendientes"}
                            </p>
                          ) : null}
                        </div>
                        <span className="shrink-0 text-sm font-black text-[color:var(--text)]">
                          {item.sets}/{item.recordedSets}
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
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ff5722] dark:text-[#e2ff00]">
                  Semana activa
                </p>
                <h2 className="mt-1 text-xl font-black text-[color:var(--text)]">
                  Tiempo de sesión
                </h2>
                <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
                  Incluye los descansos medidos. Las pausas quedan fuera del
                  total.
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
              <div className="mb-4 grid grid-cols-3 gap-2">
                {[
                  {
                    label: "Sesión",
                    value: formatSessionMinutes(durationSummary.sessionSeconds),
                  },
                  {
                    label: "Trabajo est.",
                    value: durationSummary.trackedCount
                      ? formatSessionMinutes(durationSummary.workSeconds)
                      : "--",
                  },
                  {
                    label: "Descanso",
                    value: durationSummary.trackedCount
                      ? formatSessionMinutes(durationSummary.restSeconds)
                      : "--",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="min-w-0 rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-2 py-3 text-center"
                  >
                    <p className="truncate text-[9px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
                      {item.label}
                    </p>
                    <p className="mt-1 text-sm font-black text-[color:var(--text)]">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mb-4 flex items-center justify-between gap-3 border-y border-[color:var(--border)] py-2 text-xs font-bold text-[color:var(--text-muted)]">
                <span>Pausas excluidas</span>
                <span className="text-[color:var(--text)]">
                  {formatSessionMinutes(durationSummary.pauseSeconds)}
                </span>
              </div>
              {durationSummary.trackedCount < durationRows.length ? (
                <p className="mb-3 text-[11px] font-semibold text-[color:var(--text-muted)]">
                  El descanso no fue medido en algunas sesiones anteriores.
                </p>
              ) : null}
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
                        <p className="mt-1 text-[11px] font-bold text-[color:var(--text-muted)]">
                          {row.hasRestTracking
                            ? `Trabajo est. ${formatSessionMinutes(row.workSeconds)} · Descanso ${formatSessionMinutes(row.restSeconds)}`
                            : "Descanso no medido"}
                          {row.pauseSeconds
                            ? ` · Pausa ${formatSessionMinutes(row.pauseSeconds)}`
                            : ""}
                          {row.adjusted ? " · Ajustado" : ""}
                        </p>
                      </div>
                      <span className="shrink-0 rounded bg-[#fff0eb] px-3 py-2 text-sm font-black text-[#c52d00] dark:bg-[#1d2100] dark:text-[#e2ff00]">
                        {formatSessionMinutes(row.seconds)}
                      </span>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-4 text-sm font-semibold text-[color:var(--text-muted)]">
                  No hay entrenamientos registrados esta semana.
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
                      : "text-[#ff5722] dark:text-[#e2ff00]"
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
                    : "border-[#ffb199] bg-[#fff0eb] dark:border-[#e2ff00]/30 dark:bg-[#161900]"
                }`}
              >
                <p
                  className={`text-[10px] font-black uppercase tracking-wide ${
                    performanceModalConfig.tone === "red"
                      ? "text-red-700 dark:text-red-300"
                      : "text-[#c52d00] dark:text-[#e2ff00]"
                  }`}
                >
                  {performanceModalConfig.label}
                </p>
                <p
                  className={`mt-2 text-3xl font-black ${
                    performanceModalConfig.tone === "red"
                      ? "text-red-700 dark:text-red-300"
                      : "text-[#ff5722] dark:text-[#e2ff00]"
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
                              : "bg-[#fff0eb] text-[#c52d00] dark:bg-[#1d2100] dark:text-[#e2ff00]"
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
                                    : "bg-[#fff0eb] text-[#c52d00] dark:bg-[#1d2100] dark:text-[#e2ff00]"
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
                                    : "bg-[#fff0eb] text-[#c52d00] dark:bg-[#1d2100] dark:text-[#e2ff00]"
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
      <QuickWeightModal
        open={quickWeightOpen}
        onClose={() => setQuickWeightOpen(false)}
        onSave={saveQuickWeight}
      />
    </motion.div>
  );
}

export default Dashboard;
