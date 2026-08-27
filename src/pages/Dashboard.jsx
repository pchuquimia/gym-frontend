import { useEffect, useMemo, useRef, useState } from "react";
import { ResponsiveBar } from "@nivo/bar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Dumbbell,
  Flame,
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
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { useThemeMode } from "../hooks/useThemeMode";
import ThemeToggle from "../components/ThemeToggle";
import MobileMenuButton from "../components/layout/MobileMenuButton";
import MobilePageHeader from "../components/layout/MobilePageHeader";
import ProfileAvatar from "../components/profile/ProfileAvatar";
import OperationLoader from "../components/system/OperationLoader";
import QuickWeightModal from "../components/dashboard/QuickWeightModal";
import CalorieEstimateModal from "../components/analytics/CalorieEstimateModal";
import { useUserProfile } from "../context/UserContext";
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
import {
  canAccessActiveTraining,
  isActiveTrainingSnapshot,
  readActiveTrainingSnapshot,
} from "../utils/activeTraining";
import {
  estimateTrainingCalories,
  summarizeCalorieEstimates,
} from "../utils/calorieEstimate";

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
    "Sesión"
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

function formatAdminPreviewDate(dateKey) {
  if (!dateKey) return "Fecha no disponible";
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString("es-BO", {
    weekday: "short",
    day: "numeric",
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
  return "Prioriza recuperación";
}

function getPostWorkoutRecoveryLabel(value) {
  if (value >= 85) return "Proyección alta";
  if (value >= 70) return "Buena base próxima";
  if (value >= 55) return "Recuperación parcial";
  return "Necesita recuperación";
}

function formatPercentChange(current = 0, previous = 0) {
  if (!previous && !current) return "0%";
  if (!previous) return "+100%";
  const change = ((current - previous) / previous) * 100;
  return `${change >= 0 ? "+" : ""}${Math.round(change)}%`;
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
      description: "Registra una sesión para comenzar la comparación semanal.",
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
        "Los ciclos entrenados aún no tienen una semana anterior comparable.",
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
    changeLabel: `${formatPercentChange(comparableCurrent, previous)} vs semana anterior`,
    label,
    description: isPartial
      ? `${formatValue(excluded)} ${unit} pertenecen a ciclos nuevos y no alteran el porcentaje.`
      : "Comparación realizada con los mismos ciclos de progreso.",
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

function formatLiftedWeight(value = 0) {
  const number = Math.max(0, Number(value) || 0);
  if (number >= 1000) {
    const tonnes = number / 1000;
    return `${tonnes.toFixed(tonnes >= 10 ? 1 : 2).replace(/\.0+$/, "")} t`;
  }
  return `${Math.round(number)} kg`;
}

function formatNaturalPercentChange(current = 0, previous = 0) {
  const currentValue = Number(current) || 0;
  const previousValue = Number(previous) || 0;
  if (!previousValue) return "Aún sin una semana anterior para comparar";
  const change = Math.round(
    ((currentValue - previousValue) / previousValue) * 100,
  );
  if (!change) return "Similar a la semana anterior";
  return `${Math.abs(change)}% ${change > 0 ? "más" : "menos"} que la semana anterior`;
}

function formatSeriesCount(value = 0) {
  const number = Number(value) || 0;
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function formatSessionCount(value = 0) {
  const number = Math.max(0, Number(value) || 0);
  return `${number} ${number === 1 ? "sesión" : "sesiones"}`;
}

function formatExerciseCount(value = 0) {
  const number = Math.max(0, Number(value) || 0);
  return `${number} ${number === 1 ? "ejercicio" : "ejercicios"}`;
}

function getRoutinePlannedSets(routine = {}) {
  return (routine.exercises || []).reduce(
    (sum, exercise) => sum + Math.max(0, Number(exercise.sets) || 0),
    0,
  );
}

function getRoutineEstimatedMinutes(routine = {}) {
  return Math.max(
    0,
    Number(
      routine.estimatedDuration ??
        routine.durationMinutes ??
        routine.duration ??
        0,
    ) || 0,
  );
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
    previousValue: `${previous.weight} kg × ${previous.reps}`,
    currentValue: `${current.weight} kg × ${current.reps}`,
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
  tone = "accent",
  children,
  onClick,
  primary = false,
}) {
  const tones = {
    blue: "bg-transparent text-[#ff5722] dark:text-[#e2ff00]",
    amber: "bg-transparent text-[#ff5722] dark:text-[#e2ff00]",
    accent: "bg-transparent text-[#ff5722] dark:text-[#e2ff00]",
    violet: "bg-transparent text-[#ff5722] dark:text-[#e2ff00]",
  };

  const Component = onClick ? "button" : "article";

  return (
    <Component
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-label={onClick ? `Ver detalle de ${label}` : undefined}
      className={`dashboard-pilot__metric dashboard-weekly-metric w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-left shadow-sm dark:rounded-[4px] dark:shadow-none ${
        primary ? "dashboard-pilot__metric--primary" : ""
      } ${
        onClick ? "transition hover:border-[color:var(--border-strong)]" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
          {label}
        </p>
        {Icon ? (
          <span
            className={`dashboard-pilot__metric-icon grid h-7 w-7 place-items-center rounded-xl dark:rounded-none ${tones[tone] || tones.accent}`}
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
          ? "text-[color:var(--accent-strong)]"
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
                Semana actual vs anterior
              </p>
              <span className="border border-[#ff5722]/30 px-1.5 py-0.5 text-[9px] font-black uppercase text-[#ff5722] dark:border-[#e2ff00]/30 dark:text-[#e2ff00]">
                Pro
              </span>
            </div>
            <h2 className="mt-1 text-lg font-black uppercase text-[color:var(--text)]">
              Comparativa inteligente
            </h2>
            <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
              Sesiones, volumen, fuerza, adherencia y recuperación frente a los
              mismos días de la semana anterior.
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
          Calculando semana actual vs anterior...
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
      label: "Recuperación",
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
            Semana actual vs anterior
          </p>
          <h2 className="mt-1 text-lg font-black uppercase text-[color:var(--text)]">
            Comparativa inteligente
          </h2>
        </div>
        <span className="border border-[color:var(--border)] bg-[color:var(--bg)] px-2 py-1 text-[9px] font-black uppercase text-[color:var(--text-muted)]">
          Mismos {comparison.period.elapsedDays} días
        </span>
      </div>
      <p className="mt-1 text-[11px] font-semibold text-[color:var(--text-muted)]">
        Semana actual hasta hoy frente a los días equivalentes de la semana
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
    <section className="dashboard-pilot__week dashboard-week-strip grid grid-cols-7 border border-[color:var(--border)] bg-[color:var(--card)] px-2 shadow-sm dark:shadow-none sm:px-3">
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
    <section className="dashboard-month-card rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm dark:rounded-[4px] dark:shadow-none">
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

      <div className="dashboard-month-chart relative mt-4 h-40 rounded border border-[#d8d8d8] bg-[#fafafa] px-3 pb-2 pt-10 dark:rounded-[3px] dark:border-[#292929] dark:bg-[#080808]">
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
                Peso externo {formatCompact(selectedDay.externalKg)} kg ·
                Máquina {formatCompact(selectedDay.machineKg)} kg
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
                  className={`flex h-full min-w-0 flex-col items-center justify-end ${[8, 15, 22, 29].includes(day.dayNumber) ? "ml-1" : ""} ${day.isToday ? "bg-[color:var(--accent)] text-[color:var(--accent-contrast)]" : ""}`}
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

      <div className="dashboard-month-summary mt-3 grid grid-cols-2 border-t border-[color:var(--border)] pt-3">
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
    <section className="dashboard-trend-card overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] shadow-sm dark:rounded-[4px] dark:shadow-none">
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
        <span className="rounded bg-[color:var(--accent)] px-2.5 py-1 text-[10px] font-black uppercase text-[color:var(--accent-contrast)]">
          {detail.trainedDays} días entrenados
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {detail.days.map((day) => (
          <article
            key={day.key}
            className={`relative min-h-[86px] rounded-2xl border p-3 shadow-sm ${
              day.active
                ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--accent-contrast)]"
                : "border-[color:var(--border)] bg-[#fafafa] text-[color:var(--text)] dark:bg-[#080808]"
            }`}
          >
            <span
              className={`absolute right-3 top-3 h-2 w-2 rounded-full ${
                day.active
                  ? "bg-[color:var(--accent-contrast)]"
                  : "bg-[#d8d8d8] dark:bg-[#383838]"
              }`}
            />
            <p
              className={`text-[9px] font-black uppercase tracking-wide ${
                day.active
                  ? "text-current/75"
                  : "text-[color:var(--text-muted)]"
              }`}
            >
              {day.weekday}
            </p>
            <p className="mt-1 text-lg font-black leading-none">
              {day.dayNumber}
            </p>
            <p className="mt-2 truncate text-[11px] font-black">
              {day.active ? day.routine : "Descanso"}
            </p>
            <p
              className={`mt-1 truncate text-[10px] font-semibold ${
                day.active
                  ? "text-current/75"
                  : "text-[color:var(--text-muted)]"
              }`}
            >
              {day.active
                ? `${formatSessionCount(day.sessions)} · ${day.minutes}`
                : "Sin sesión"}
            </p>
          </article>
        ))}
      </div>

      <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ff5722] dark:text-[#e2ff00]">
          Rutinas entrenadas este mes
        </p>
        <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
          Cuántas veces se entrenó cada rutina
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
                      {routine.sessions === 1
                        ? "sesión registrada"
                        : "sesiones registradas"}
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

function TodayActionCard({ action, onPrimary, onSecondary, readOnly = false }) {
  const compactRest = action.type === "rest";
  const toneColor =
    action.tone === "success"
      ? "var(--accent-strong)"
      : action.tone === "warning"
        ? "var(--warning)"
        : "var(--accent-strong)";
  const toneBackground =
    action.tone === "success"
      ? "var(--accent-soft)"
      : action.tone === "warning"
        ? "var(--warning-soft)"
        : "var(--accent-soft)";
  const toneIconColor =
    action.tone === "warning" ? "var(--warning)" : "var(--accent-contrast)";
  const StatusIcon =
    action.type === "active"
      ? Activity
      : action.type === "completed"
        ? Check
        : action.type === "rest"
          ? Gauge
          : action.type === "scheduled"
            ? Dumbbell
            : Target;

  return (
    <section
      data-dashboard-action={action.type}
      className="dashboard-pilot__card dashboard-today-card overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] shadow-sm dark:rounded-[4px] dark:shadow-none"
    >
      <div className="dashboard-today-card__accent h-0.5 bg-[color:var(--accent)] sm:h-1" />
      <div
        className={`dashboard-today-card__body ${compactRest ? "p-3 sm:p-4" : "p-3.5 sm:p-4"}`}
      >
        <div
          className={`dashboard-today-card__layout flex flex-col md:flex-row md:items-center md:justify-between ${
            compactRest ? "gap-2.5 sm:gap-3" : "gap-3"
          }`}
        >
          <div className="min-w-0 flex-1">
            <div className="dashboard-today-card__eyebrow flex items-center gap-2">
              <span
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full"
                style={{
                  backgroundColor: toneBackground,
                  color: toneIconColor,
                }}
              >
                <StatusIcon className="h-3.5 w-3.5" />
              </span>
              <p
                className="text-[10px] font-black uppercase tracking-[0.18em]"
                style={{ color: toneColor }}
              >
                {action.eyebrow}
              </p>
            </div>

            <h2
              className={`font-black tracking-tight text-[color:var(--text)] ${
                compactRest
                  ? "mt-1.5 text-lg sm:mt-2 sm:text-2xl"
                  : "mt-2 text-xl sm:text-2xl"
              }`}
            >
              {action.mobileTitle ? (
                <>
                  <span className="sm:hidden">{action.mobileTitle}</span>
                  <span className="hidden sm:inline">{action.title}</span>
                </>
              ) : (
                action.title
              )}
            </h2>
            {compactRest && action.mobileDescription ? (
              <>
                <p className="dashboard-today-card__description mt-1 text-[11px] font-semibold leading-snug text-[color:var(--text-muted)] sm:hidden">
                  {action.mobileDescription}
                </p>
                <p className="dashboard-today-card__description mt-1 hidden max-w-2xl text-xs font-semibold leading-relaxed text-[color:var(--text-muted)] sm:block">
                  {action.description}
                </p>
              </>
            ) : (
              <p className="dashboard-today-card__description mt-1 max-w-2xl text-xs font-semibold leading-relaxed text-[color:var(--text-muted)]">
                {action.description}
              </p>
            )}

            {action.meta?.length ? (
              <div
                className={`dashboard-today-card__meta flex flex-wrap gap-1.5 ${compactRest ? "mt-2" : "mt-2.5"}`}
              >
                {action.meta.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-[color:var(--border)] bg-[color:var(--bg)] px-2 py-0.5 text-[9px] font-bold text-[color:var(--text-muted)]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : null}

            {action.progress != null ? (
              <div className="mt-3 max-w-xl">
                <div className="mb-1.5 flex items-center justify-between gap-3 text-[10px] font-bold text-[color:var(--text-muted)]">
                  <span>Progreso de la sesión</span>
                  <span>{action.progress}%</span>
                </div>
                <div
                  className="h-1.5 overflow-hidden rounded-full bg-[color:var(--border)]"
                  role="progressbar"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-valuenow={action.progress}
                >
                  <div
                    className="h-full rounded-full bg-[color:var(--accent)]"
                    style={{ width: `${action.progress}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div
            data-dashboard-today-actions
            className={
              compactRest
                ? "grid shrink-0 grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex sm:flex-row md:w-[200px] md:flex-col"
                : "flex shrink-0 flex-col gap-1.5 sm:flex-row md:w-[200px] md:flex-col"
            }
          >
            {readOnly ? (
              <div className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[color:var(--border)] bg-[color:var(--bg)] px-4 text-[10px] font-black uppercase text-[color:var(--text-muted)]">
                <CalendarDays className="h-4 w-4" />
                Vista histórica
              </div>
            ) : (
              <button
                type="button"
                onClick={onPrimary}
                className="dashboard-today-card__primary inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[color:var(--accent)] px-4 text-[10px] font-black uppercase text-[color:var(--accent-contrast)] transition hover:bg-[color:var(--accent-hover)] active:translate-y-px"
              >
                {action.type === "completed" ? (
                  <ArrowRight className="h-4 w-4" />
                ) : action.type === "rest" ? (
                  <Gauge className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4 fill-current" />
                )}
                {action.primaryLabel}
              </button>
            )}
            {!readOnly && action.secondaryLabel ? (
              <button
                type="button"
                onClick={onSecondary}
                className={`dashboard-today-card__secondary inline-flex h-9 items-center justify-center rounded-md border border-[color:var(--border)] bg-[color:var(--bg)] text-[9px] font-black uppercase text-[color:var(--text)] transition hover:border-[color:var(--border-strong)] ${
                  compactRest ? "px-3 sm:px-4" : "px-4"
                }`}
              >
                {compactRest && action.secondaryMobileLabel ? (
                  <>
                    <span className="sm:hidden">
                      {action.secondaryMobileLabel}
                    </span>
                    <span className="hidden sm:inline">
                      {action.secondaryLabel}
                    </span>
                  </>
                ) : (
                  action.secondaryLabel
                )}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function AdminDateControl({ value, actualDateKey, onChange }) {
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const isPreview = value !== actualDateKey;

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const applyDate = () => {
    const selectedDate = inputRef.current?.value || draft;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) return;
    onChange(selectedDate);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          if (!open) setDraft(value);
          setOpen((current) => !current);
        }}
        aria-label="Cambiar fecha del dashboard"
        aria-expanded={open}
        className={`relative grid h-10 w-10 place-items-center rounded-full border shadow-sm transition ${
          isPreview
            ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--accent-contrast)]"
            : "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text)] hover:border-[color:var(--border-strong)]"
        }`}
        title="Cambiar fecha del dashboard (solo Admin)"
      >
        <CalendarDays className="h-[18px] w-[18px]" />
        {isPreview ? (
          <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-[color:var(--bg)] bg-[color:var(--accent)]" />
        ) : null}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-end bg-black/35 p-4 backdrop-blur-[2px] sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Cambiar fecha de análisis"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-xs rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-left shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">
                  Herramienta administrativa
                </p>
                <h2 className="mt-1 text-base font-black text-[color:var(--text)]">
                  Cambiar fecha de análisis
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar selector de fecha"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[color:var(--border)] text-[color:var(--text-muted)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-[11px] font-semibold leading-relaxed text-[color:var(--text-muted)]">
              Simula el dashboard sin modificar entrenamientos ni registros.
            </p>
            <label className="mt-4 block text-[10px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
              Fecha
              <input
                ref={inputRef}
                type="date"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-md border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-sm font-bold text-[color:var(--text)] outline-none focus:border-[color:var(--accent)]"
              />
            </label>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setDraft(actualDateKey);
                  onChange(actualDateKey);
                  setOpen(false);
                }}
                className="h-10 rounded-md border border-[color:var(--border)] bg-[color:var(--bg)] text-[10px] font-black uppercase text-[color:var(--text)]"
              >
                Volver a hoy
              </button>
              <button
                type="button"
                onClick={applyDate}
                className="h-10 rounded-md bg-[color:var(--accent)] text-[10px] font-black uppercase text-[color:var(--accent-contrast)]"
              >
                Aplicar fecha
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RecoveryMuscleSection({ muscles, prioritizeRecovery = false }) {
  return (
    <section className="mt-5">
      <div>
        <h3 className="text-sm font-black text-[color:var(--text)]">
          {prioritizeRecovery
            ? "Músculos por recuperar"
            : "Recuperación muscular"}
        </h3>
        <p className="mt-0.5 text-[11px] font-semibold text-[color:var(--text-muted)]">
          {prioritizeRecovery
            ? "Los grupos con menor disponibilidad aparecen primero."
            : "Disponibilidad estimada por grupo trabajado."}
        </p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-3 sm:gap-x-6">
        {muscles.length ? (
          muscles.map((muscle) => (
            <article
              key={muscle.muscle}
              className="border-t border-[color:var(--border)] py-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-black text-[color:var(--text)] sm:text-sm">
                  {muscle.muscle}
                </p>
                <span
                  className="text-xs font-black"
                  style={{
                    color:
                      muscle.value >= 70
                        ? "var(--accent-strong)"
                        : muscle.value >= 55
                          ? "var(--warning)"
                          : "var(--danger)",
                  }}
                >
                  {muscle.value}%
                </span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-[color:var(--border)]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${muscle.value}%`,
                    backgroundColor:
                      muscle.value >= 70
                        ? "var(--accent)"
                        : muscle.value >= 55
                          ? "var(--warning)"
                          : "var(--danger)",
                  }}
                />
              </div>
              <p className="mt-2 text-[10px] font-semibold leading-relaxed text-[color:var(--text-muted)]">
                <span className="block">
                  {muscle.daysSinceLast === 0
                    ? "Entrenado hoy"
                    : muscle.daysSinceLast === 1
                      ? "Entrenado ayer"
                      : `${muscle.daysSinceLast} días sin entrenar`}
                </span>
                <span className="block">
                  Carga: {formatSeriesCount(muscle.latestSets)} series ·
                  habitual{" "}
                  {muscle.typicalSets
                    ? formatSeriesCount(muscle.typicalSets)
                    : "--"}
                </span>
              </p>
            </article>
          ))
        ) : (
          <p className="col-span-2 border-t border-[color:var(--border)] py-4 text-sm font-semibold text-[color:var(--text-muted)]">
            Sin grupos musculares registrados.
          </p>
        )}
      </div>
    </section>
  );
}

function RecoveryInsightSection({ insights, isPostWorkout, isPlannedRestDay }) {
  return (
    <section className="mt-5">
      <h3 className="text-sm font-black text-[color:var(--text)]">
        Lo que debes tener en cuenta
      </h3>
      <p className="mt-0.5 text-[11px] font-semibold text-[color:var(--text-muted)]">
        {isPostWorkout
          ? "Cómo afecta la sesión que acabas de completar."
          : isPlannedRestDay
            ? "Por qué conviene respetar el descanso de hoy."
            : "Señales prácticas para ajustar tu próximo entrenamiento."}
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {insights.length ? (
          insights.map((insight, index) => {
            const InsightIcon = index === 0 ? Activity : BarChart3;
            const warning = insight.tone === "warning";
            return (
              <article
                key={`${insight.title}-${insight.action}`}
                className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3.5"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                      warning
                        ? "bg-[color:var(--warning-soft)] text-[color:var(--warning)]"
                        : "bg-[color:var(--accent)] text-[color:var(--accent-contrast)]"
                    }`}
                  >
                    <InsightIcon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-[color:var(--text)]">
                      {insight.title}
                    </h4>
                    <p className="mt-1 text-[11px] font-semibold leading-relaxed text-[color:var(--text-muted)]">
                      {insight.detail}
                    </p>
                  </div>
                </div>
                <p
                  className={`mt-3 border-t border-[color:var(--border)] pt-2 text-[10px] font-black uppercase tracking-wide ${
                    warning
                      ? "text-[color:var(--warning)]"
                      : "text-[color:var(--accent-strong)]"
                  }`}
                >
                  {insight.action}
                </p>
              </article>
            );
          })
        ) : (
          <p className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-4 text-sm font-semibold text-[color:var(--text-muted)] sm:col-span-2">
            Aún no hay suficiente historial para explicar tu recuperación.
          </p>
        )}
      </div>
    </section>
  );
}

function Dashboard({ onNavigate = () => {}, coachAthlete = null }) {
  const queryClient = useQueryClient();
  const dashboardBootstrap = useDashboardBootstrap();
  const { user: authUser } = useAuth();
  const { profile } = useUserProfile();
  const {
    trainings = [],
    exercises: catalogExercises = [],
    trainingsLoading,
    trainingsError,
    reloadTrainings,
  } = useTrainingData();
  const { routines = [] } = useRoutines();
  const { theme } = useThemeMode();
  const isAdmin = authUser?.role === "Admin";
  const systemTodayKey = useMemo(() => getISODateKey(new Date()), []);
  const [dashboardDateKey, setDashboardDateKey] = useState(systemTodayKey);
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
  const [caloriesModalOpen, setCaloriesModalOpen] = useState(false);
  const [weeklyDetailsOpen, setWeeklyDetailsOpen] = useState(false);
  const [quickWeightOpen, setQuickWeightOpen] = useState(false);
  const [activeTrainingSnapshot, setActiveTrainingSnapshot] = useState(null);
  const hasOpenModal = Boolean(
    durationModalOpen ||
    performanceModalType ||
    recoveryModalOpen ||
    weeklyLoadModalOpen ||
    weeklySetsModalOpen ||
    caloriesModalOpen,
  );

  useEffect(() => {
    const syncActiveTraining = () => {
      const snapshot = readActiveTrainingSnapshot();
      setActiveTrainingSnapshot(
        isActiveTrainingSnapshot(snapshot) &&
          canAccessActiveTraining(snapshot, authUser, coachAthlete)
          ? snapshot
          : null,
      );
    };
    syncActiveTraining();
    window.addEventListener("active-training-updated", syncActiveTraining);
    window.addEventListener("storage", syncActiveTraining);
    return () => {
      window.removeEventListener("active-training-updated", syncActiveTraining);
      window.removeEventListener("storage", syncActiveTraining);
    };
  }, [authUser, coachAthlete]);

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
      setCaloriesModalOpen(false);
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

  const now = useMemo(
    () => new Date(`${dashboardDateKey}T12:00:00`),
    [dashboardDateKey],
  );
  const todayKey = dashboardDateKey;
  const isAdminDatePreview = isAdmin && todayKey !== systemTodayKey;
  const todayWeighInKey = ["weigh-ins", "today", "self", systemTodayKey];
  const todayWeighInQuery = useQuery({
    queryKey: todayWeighInKey,
    queryFn: () =>
      api.getWeighIns({
        from: systemTodayKey,
        to: systemTodayKey,
        today: systemTodayKey,
      }),
    staleTime: 30 * 1000,
    enabled: !dashboardBootstrap.enabled,
  });
  const todayWeighInData = dashboardBootstrap.enabled
    ? dashboardBootstrap.data?.todayWeighIn
    : todayWeighInQuery.data;
  const needsDailyWeighIn =
    !isAdminDatePreview &&
    todayWeighInData &&
    !todayWeighInData.summary?.completedToday;

  const saveQuickWeight = async (weightKg) => {
    const saved = await api.saveWeighIn({
      dateKey: systemTodayKey,
      weightKg,
    });
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
        training.routineName || training.routineId?.name || "Sesión",
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

  const calorieWeightKg =
    coachAthlete?.profile?.weight ?? coachAthlete?.weight ?? profile?.weight;
  const weeklyCalorieEstimates = useMemo(
    () =>
      (weekData.currentTrainings || [])
        .map((training) => ({
          ...estimateTrainingCalories(training, { weightKg: calorieWeightKg }),
          id: String(
            training.id ||
              training._id ||
              `${training.date}-${getRoutineName(training)}`,
          ),
          date: training.date,
          routineName: getRoutineName(training),
        }))
        .filter((estimate) => estimate.available)
        .sort(
          (left, right) =>
            getDateTimestamp(right.date) - getDateTimestamp(left.date),
        ),
    [calorieWeightKg, weekData.currentTrainings],
  );
  const weeklyCalories = useMemo(
    () => summarizeCalorieEstimates(weeklyCalorieEstimates),
    [weeklyCalorieEstimates],
  );

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
        training.routineName || training.routineId?.name || "Sesión";
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
    const workSeconds = trackedRows.reduce(
      (sum, row) => sum + row.workSeconds,
      0,
    );
    const restSeconds = trackedRows.reduce(
      (sum, row) => sum + row.restSeconds,
      0,
    );
    const measuredSeconds = workSeconds + restSeconds;
    return {
      sessionSeconds: durationRows.reduce(
        (sum, row) => sum + row.sessionSeconds,
        0,
      ),
      workSeconds,
      restSeconds,
      pauseSeconds: durationRows.reduce(
        (sum, row) => sum + row.pauseSeconds,
        0,
      ),
      trackedCount: trackedRows.length,
      workPercent: measuredSeconds
        ? Math.round((workSeconds / measuredSeconds) * 100)
        : 0,
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
    const sessions = weekData.sessions || 0;
    const previousSessions = weekData.previousSessions || 0;
    const completionRate = weekData.loadMetrics.recordedSets
      ? Math.round(
          (weekData.loadMetrics.completedSets /
            weekData.loadMetrics.recordedSets) *
            100,
        )
      : 0;
    return {
      total: weekData.totalSets,
      recorded: weekData.loadMetrics.recordedSets,
      incomplete: weekData.loadMetrics.incompleteSets,
      sessions,
      previousSessions,
      averagePerSession: sessions ? weekData.totalSets / sessions : 0,
      previousAveragePerSession: previousSessions
        ? previousTotal / previousSessions
        : 0,
      completionRate,
      comparableCurrent: comparison.comparableCurrent,
      previous: comparison.previous,
      previousTotal,
      excluded: comparison.excluded,
      hasReference: previousTotal > 0,
      hasProgressionReference: comparison.hasReference,
      isPartial: comparison.isPartial,
      description:
        "Cuenta las series que terminaste en tus entrenamientos de esta semana.",
      diff,
      diffLabel:
        previousTotal > 0
          ? !diff
            ? "Igual que la semana anterior"
            : `${Math.abs(diff)} ${diff > 0 ? "más" : "menos"} que la semana anterior`
          : "Aún sin comparación semanal",
      statusLabel: weekData.loadMetrics.incompleteSets
        ? `${weekData.loadMetrics.incompleteSets} sin completar`
        : "Todo completado",
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
          count: weekData.declines?.length || 0,
          groups: declinesByMuscle,
          tone: "red",
          typeKey: "declineType",
          emptyTitle: "Sin marcas por recuperar",
          empty:
            "Ningún ejercicio quedó por debajo de su ejecución anterior esta semana.",
        }
      : {
          count: weekData.improvements?.length || 0,
          groups: improvementsByMuscle,
          tone: "accent",
          typeKey: "improvementType",
          emptyTitle: "Aún no hay nuevas marcas",
          empty:
            "Tu próxima sesión puede registrar la primera mejora de esta semana.",
        };

  const performanceSummary =
    performanceModalType === "declines"
      ? performanceModalConfig.count === 1
        ? "1 ejercicio quedó por debajo de su marca anterior"
        : `${performanceModalConfig.count} ejercicios quedaron por debajo de su marca anterior`
      : performanceModalConfig.count === 1
        ? "1 ejercicio superó su marca anterior"
        : `${performanceModalConfig.count} ejercicios superaron su marca anterior`;

  const performanceTabs = [
    {
      key: "improvements",
      label: "Mejoraron",
      count: weekData.improvements?.length || 0,
    },
    {
      key: "declines",
      label: "Por recuperar",
      count: weekData.declines?.length || 0,
    },
  ];

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
    const recoveryInsights = [];
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
        const lastRecordDay = lastRecord
          ? new Date(getISODateKey(new Date(lastRecord.timestamp))).getTime()
          : null;
        const days = lastRecord
          ? Math.max(0, Math.floor((todayStart - lastRecordDay) / DAY_MS))
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
      ? "Activa una planificación para recibir una sugerencia"
      : isPlannedRest
        ? scheduledDay?.type === "recovery"
          ? "Hoy corresponde recuperación en tu plan"
          : "Hoy corresponde descanso en tu plan"
        : betterAlternative && scheduledRoutine?.value < 65
          ? `${scheduledRoutine.name} está limitada por ${scheduledRoutine.limitingMuscle?.muscle || "fatiga reciente"}`
          : scheduledRoutine?.value < 65
            ? "La rutina prevista presenta fatiga alta; reduce volumen o descansa"
            : "Rutina prevista y compatible con tu recuperación";
    const value = recommended?.value ?? globalValue;
    const label = recommended?.name || recommendationReason;

    const overloadedMuscles = muscleReadiness.filter(
      (item) => item.latestSetRatio >= 1.5 && item.daysSinceLast <= 3,
    );
    overloadedMuscles.slice(0, 2).forEach((item) => {
      recoveryInsights.push({
        title: `${item.muscle}: carga por encima de lo habitual`,
        detail: `Hiciste ${formatSeriesCount(item.latestSets)} series frente a ${formatSeriesCount(item.typicalSets || 0)} habituales. Dale más tiempo antes de repetir carga intensa.`,
        action: "Descansa este grupo",
        tone: "warning",
      });
    });
    if (!overloadedMuscles.length && daysSinceLast != null) {
      recoveryInsights.push({
        title:
          daysSinceLast <= 1 ? "Entrenamiento reciente" : "Descanso acumulado",
        detail:
          daysSinceLast === 0
            ? "Entrenaste hoy. Es normal que los músculos trabajados todavía necesiten descanso."
            : daysSinceLast === 1
              ? "Entrenaste ayer. Ajusta la intensidad si repites músculos que aún se sienten fatigados."
              : `Han pasado ${daysSinceLast} días desde tu última sesión. La disponibilidad muscular debería ir aumentando.`,
        action:
          daysSinceLast <= 1
            ? "La fatiga es esperable"
            : "Recuperación favorable",
        tone: daysSinceLast <= 1 ? "warning" : "accent",
      });
    }
    if (previousWeeklySets > 0 && Math.abs(loadSpike) >= 0.2) {
      const loadIsHigher = loadSpike > 0;
      recoveryInsights.push({
        title: loadIsHigher
          ? "Carga semanal más alta"
          : "Carga semanal más baja",
        detail: `Llevas ${weeklySets} series frente a ${previousWeeklySets} en el mismo punto de la semana anterior. ${
          loadIsHigher
            ? "Evita añadir volumen si la técnica o la energía empeoran."
            : "No necesitas compensar toda la diferencia en una sola sesión."
        }`,
        action: loadIsHigher ? "Controla el volumen" : "Sigue tu plan",
        tone: loadIsHigher ? "warning" : "accent",
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
      recoveryInsights,
      lastTraining,
      routineReadiness,
      muscleReadiness,
      recommended,
      recommendationReason,
      activePlan,
      scheduledDay,
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
    const sessions = weekData.sessions || 0;
    const previousSessions = weekData.previousSessions || 0;
    return {
      current,
      previousTotal,
      sessions,
      previousSessions,
      averagePerSession: sessions ? current / sessions : 0,
      previousAveragePerSession: previousSessions
        ? previousTotal / previousSessions
        : 0,
      changeLabel: formatNaturalPercentChange(current, previousTotal),
      description:
        "Suma el peso libre que registraste en cada repetición completada. No representa tu peso máximo.",
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

  const completedTodayTrainings = useMemo(
    () =>
      (weekData.currentTrainings || []).filter(
        (training) => getISODateKey(training.date) === todayKey,
      ),
    [todayKey, weekData.currentTrainings],
  );
  const latestCompletedToday =
    completedTodayTrainings[completedTodayTrainings.length - 1] || null;
  const postWorkoutNextRoutine = useMemo(() => {
    if (!latestCompletedToday || !activePlan) return null;
    const schedule = activePlan.weeklySchedule || [];
    if (!schedule.length) return recovery.scheduledRoutine || null;
    const completedSlotId = String(
      latestCompletedToday.trainingPlanSlotId || "",
    );
    let completedIndex = completedSlotId
      ? schedule.findIndex(
          (day) => String(day.slotId || "") === completedSlotId,
        )
      : -1;
    if (completedIndex < 0 && activePlan.scheduleMode === "fixed") {
      const mondayIndex = (now.getDay() + 6) % 7;
      completedIndex = schedule.findIndex(
        (day) => Number(day.dayIndex || day.order) === mondayIndex + 1,
      );
    }
    for (let offset = 1; offset <= schedule.length; offset += 1) {
      const day =
        schedule[(Math.max(0, completedIndex) + offset) % schedule.length];
      if (day?.type !== "training" || !day.routineId) continue;
      const readiness = recovery.routineReadiness.find(
        (routine) => routine.id === String(day.routineId),
      );
      if (readiness) return readiness;
    }
    return recovery.scheduledRoutine || recovery.recommended || null;
  }, [activePlan, latestCompletedToday, now, recovery]);
  const isPostWorkout = Boolean(latestCompletedToday);
  const isPlannedRestDay = !isPostWorkout && Boolean(recovery.isPlannedRest);
  const plannedRestNextRoutine = useMemo(() => {
    if (!isPlannedRestDay || !activePlan) return null;
    const schedule = activePlan.weeklySchedule || [];
    if (!schedule.length) return null;
    const mondayIndex = (now.getDay() + 6) % 7;
    const currentIndex =
      activePlan.scheduleMode === "fixed"
        ? schedule.findIndex(
            (day) => Number(day.dayIndex || day.order) === mondayIndex + 1,
          )
        : Math.min(
            Math.max(0, Number(activePlan.cycleProgress?.currentIndex || 0)),
            schedule.length - 1,
          );
    for (let offset = 1; offset <= schedule.length; offset += 1) {
      const day =
        schedule[(Math.max(0, currentIndex) + offset) % schedule.length];
      if (day?.type !== "training" || !day.routineId) continue;
      const readiness = recovery.routineReadiness.find(
        (routine) => routine.id === String(day.routineId),
      );
      if (readiness) return readiness;
    }
    return null;
  }, [activePlan, isPlannedRestDay, now, recovery.routineReadiness]);
  const futurePlanRoutine = isPostWorkout
    ? postWorkoutNextRoutine
    : plannedRestNextRoutine;
  const recoveryDisplayValue = isPostWorkout
    ? (postWorkoutNextRoutine?.value ?? recovery.globalValue)
    : recovery.value;
  const recoveryMusclesForDisplay = useMemo(
    () =>
      isPostWorkout || isPlannedRestDay
        ? [...recovery.muscleReadiness].sort(
            (a, b) => a.value - b.value || a.muscle.localeCompare(b.muscle),
          )
        : recovery.muscleReadiness,
    [isPlannedRestDay, isPostWorkout, recovery.muscleReadiness],
  );
  const postWorkoutPriorityMuscles = recoveryMusclesForDisplay
    .filter((muscle) => muscle.daysSinceLast === 0)
    .slice(0, 2);
  const recoveryRoutinesForDisplay = useMemo(() => {
    if (!isPostWorkout || !postWorkoutNextRoutine) {
      return recovery.routineReadiness;
    }
    return [...recovery.routineReadiness].sort((a, b) => {
      if (a.id === postWorkoutNextRoutine.id) return -1;
      if (b.id === postWorkoutNextRoutine.id) return 1;
      return b.value - a.value || a.name.localeCompare(b.name);
    });
  }, [isPostWorkout, postWorkoutNextRoutine, recovery.routineReadiness]);

  const todayAction = useMemo(() => {
    if (activeTrainingSnapshot && !isAdminDatePreview) {
      const snapshotExercises = activeTrainingSnapshot.exercises || [];
      const plannedSets = snapshotExercises.reduce(
        (sum, exercise) => sum + (exercise.sets || []).length,
        0,
      );
      const completedSets = snapshotExercises.reduce(
        (sum, exercise) =>
          sum + getExerciseLoadMetrics(exercise, catalogIndex).completedSets,
        0,
      );
      const progress = plannedSets
        ? Math.round((completedSets / plannedSets) * 100)
        : 0;
      const routine =
        activeTrainingSnapshot.selectedRoutine ||
        routines.find(
          (item) =>
            String(item.id || item._id) ===
            String(activeTrainingSnapshot.selectedRoutineId),
        );
      return {
        type: "active",
        tone: "warning",
        eyebrow: "Entrenamiento en curso",
        title: routine?.name || "Continúa donde lo dejaste",
        description:
          "Tu sesión sigue guardada. Retómala sin perder el progreso registrado.",
        meta: [
          formatExerciseCount(snapshotExercises.length),
          `${completedSets} de ${plannedSets} series`,
          formatDashboardDuration(
            activeTrainingSnapshot.elapsed ||
              activeTrainingSnapshot.durationSeconds,
          ),
        ].filter(Boolean),
        progress,
        primaryLabel: "Continuar entrenamiento",
      };
    }

    if (latestCompletedToday) {
      const durationSeconds = getEffectiveDurationSeconds(latestCompletedToday);
      return {
        type: "completed",
        tone: "success",
        eyebrow:
          completedTodayTrainings.length > 1
            ? `${completedTodayTrainings.length} sesiones completadas hoy`
            : "Listo por hoy",
        title: `${getRoutineName(latestCompletedToday)} completada`,
        description:
          "Buen trabajo. Tu actividad y recuperación ya incluyen esta sesión.",
        meta: [
          `${getTrainingSetCount(latestCompletedToday, catalogIndex)} series`,
          durationSeconds
            ? formatDashboardDuration(durationSeconds)
            : "Duración no registrada",
          formatExerciseCount(latestCompletedToday.exercises?.length || 0),
        ],
        primaryLabel: "Ver resumen",
        secondaryLabel: "Registrar otra sesión",
      };
    }

    if (activePlan && recovery.isPlannedRest) {
      const activeRecovery = recovery.scheduledDay?.type === "recovery";
      return {
        type: "rest",
        tone: "success",
        eyebrow: activeRecovery ? "Recuperación programada" : "Día de descanso",
        title: activeRecovery ? "Hoy toca recuperar" : "Hoy toca descansar",
        description: activeRecovery
          ? "Tu planificación reservó el día para recuperar y llegar mejor a la próxima sesión."
          : "El descanso también forma parte del progreso. Evita sumar carga sin necesidad.",
        mobileDescription: activeRecovery
          ? "Movilidad suave y recuperación para llegar mejor a tu próxima sesión."
          : "Recupera hoy para llegar mejor a tu próxima sesión.",
        meta: [
          plannedRestNextRoutine
            ? `Próxima: ${plannedRestNextRoutine.name}`
            : activeRecovery
              ? "Recuperación activa"
              : activePlan.name,
        ].filter(Boolean),
        primaryLabel: "Ver recuperación",
        secondaryLabel: "Entrenar de todos modos",
        secondaryMobileLabel: "Entrenar",
      };
    }

    if (recovery.scheduledRoutine) {
      const routine =
        routines.find(
          (item) =>
            String(item.id || item._id) ===
            String(recovery.scheduledRoutine.id),
        ) || {};
      const plannedSets = getRoutinePlannedSets(routine);
      const duration = getRoutineEstimatedMinutes(routine);
      const fixedSchedule = activePlan?.scheduleMode === "fixed";
      return {
        type: "scheduled",
        tone: recovery.scheduledRoutine.value < 55 ? "warning" : "accent",
        eyebrow: fixedSchedule ? "Rutina de hoy" : "Siguiente en tu plan",
        title: `${fixedSchedule ? "Hoy toca" : "Tu próxima rutina:"} ${recovery.scheduledRoutine.name}`,
        mobileTitle: recovery.scheduledRoutine.name,
        description: fixedSchedule
          ? "Tu planificación marca esta rutina para hoy. Todo está preparado para comenzar."
          : "Continúa el orden de tu ciclo con esta rutina.",
        meta: [
          recovery.scheduledRoutine.muscles.slice(0, 4).join(" · "),
          plannedSets ? `${plannedSets} series` : null,
          duration ? `${duration} min aprox.` : null,
          `${recovery.scheduledRoutine.value}% de compatibilidad muscular`,
        ].filter(Boolean),
        primaryLabel: "Iniciar entrenamiento",
        secondaryLabel: "Ver recuperación",
      };
    }

    const hasRoutines = routines.length > 0;
    return {
      type: "empty",
      tone: "accent",
      eyebrow: activePlan ? "Planificación pendiente" : "Tu próximo paso",
      title: hasRoutines
        ? "Elige tu entrenamiento de hoy"
        : "Crea tu primera rutina",
      description: hasRoutines
        ? "No hay una rutina asignada para hoy. Puedes elegir una de tus rutinas disponibles."
        : "Prepara una rutina para empezar a registrar tu progreso.",
      meta: hasRoutines ? [formatSessionCount(weekData.sessions)] : [],
      primaryLabel: hasRoutines ? "Elegir rutina" : "Crear rutina",
      secondaryLabel: hasRoutines ? "Ver rutinas" : null,
    };
  }, [
    activePlan,
    activeTrainingSnapshot,
    catalogIndex,
    completedTodayTrainings.length,
    isAdminDatePreview,
    latestCompletedToday,
    plannedRestNextRoutine,
    recovery,
    routines,
    weekData.sessions,
  ]);

  const openFreeTraining = () => {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("training_plan_routine_intent");
    }
    onNavigate("registrar");
  };

  const handleTodayPrimary = () => {
    if (todayAction.type === "active") {
      onNavigate("registrar");
      return;
    }
    if (todayAction.type === "completed") {
      const trainingId =
        latestCompletedToday?.id || latestCompletedToday?._id || "";
      if (trainingId && typeof localStorage !== "undefined") {
        localStorage.setItem("last_training_id", String(trainingId));
      }
      onNavigate("resumen_sesion", { trainingId });
      return;
    }
    if (todayAction.type === "rest") {
      setRecoveryModalOpen(true);
      return;
    }
    if (todayAction.type === "scheduled") {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(
          "training_plan_routine_intent",
          JSON.stringify({
            routineId: recovery.scheduledRoutine.id,
            planId: activePlan?._id || activePlan?.id || "",
            slotId: recovery.scheduledDay?.slotId || "",
            createdAt: Date.now(),
          }),
        );
      }
      onNavigate("registrar");
      return;
    }
    if (routines.length) openFreeTraining();
    else onNavigate("rutinas");
  };

  const handleTodaySecondary = () => {
    if (todayAction.type === "scheduled") {
      setRecoveryModalOpen(true);
      return;
    }
    if (todayAction.type === "completed" || todayAction.type === "rest") {
      openFreeTraining();
      return;
    }
    if (todayAction.type === "empty") onNavigate("rutinas");
  };

  const isDark = theme === "dark";
  const hasTrainingHistory = orderedTrainings.length > 0;

  if (trainingsLoading) {
    return (
      <OperationLoader
        active
        delayMs={0}
        mode="inline"
        title="Cargando tu actividad"
        description="Sincronizando entrenamientos y métricas del dashboard."
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
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[color:var(--accent)] text-[color:var(--accent-contrast)]">
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
      className="dashboard-shell dashboard-pilot mx-auto w-full max-w-md space-y-6 px-[6px] pb-10 pt-2 text-[color:var(--text)] md:max-w-5xl md:space-y-4 md:px-0 md:pt-0 xl:max-w-6xl 2xl:max-w-[1280px]"
    >
      <MobilePageHeader
        title="Inicio"
        actions={
          <>
            {isAdmin ? (
              <AdminDateControl
                value={todayKey}
                actualDateKey={systemTodayKey}
                onChange={setDashboardDateKey}
              />
            ) : null}
            {needsDailyWeighIn ? (
              <button
                type="button"
                onClick={() => setQuickWeightOpen(true)}
                className="dashboard-pilot__action dashboard-pilot__action--accent relative grid h-10 w-10 place-items-center rounded-full border border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--accent-contrast)] shadow-sm"
                aria-label="Registrar pesaje de hoy"
              >
                <Weight className="h-5 w-5 motion-safe:animate-pulse" />
                <span
                  aria-hidden="true"
                  className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-[color:var(--bg)] bg-[#ff5722]"
                />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("open-main-menu"))}
              className="dashboard-mobile-avatar h-11 w-11 shrink-0 overflow-hidden rounded-full border border-[color:var(--border)] bg-[color:var(--card)]"
              aria-label="Abrir menú principal"
            >
              <ProfileAvatar
                photoId={
                  profile?.avatarPhotoId || authUser?.profile?.avatarPhotoId
                }
                name={profile?.name || authUser?.name}
                className="h-full w-full"
                fallbackClassName="bg-[#ead8dd] text-sm font-semibold text-[#4a2430]"
              />
            </button>
          </>
        }
      />
      <header className="dashboard-pilot__header relative z-40 hidden items-center justify-between gap-3 border-b border-transparent pb-3 md:flex dark:border-[#252525] dark:pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <MobileMenuButton />
          <div className="min-w-0">
            <h1 className="text-[22px] font-bold leading-[0.95] tracking-[-0.035em] text-[#1a1a1a] md:text-3xl md:font-black md:italic md:leading-[0.9] md:tracking-normal dark:text-white">
              APEX
              <br />
              <span className="dashboard-pilot__brand-accent text-[#ff5722] dark:text-[#e2ff00]">
                PERFORMANCE
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin ? (
            <AdminDateControl
              value={todayKey}
              actualDateKey={systemTodayKey}
              onChange={setDashboardDateKey}
            />
          ) : null}
          {needsDailyWeighIn ? (
            <button
              type="button"
              onClick={() => setQuickWeightOpen(true)}
              className="dashboard-pilot__action dashboard-pilot__action--accent relative grid h-10 w-10 place-items-center rounded-full border border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--accent-contrast)] shadow-sm dark:shadow-none"
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
          <ThemeToggle />
        </div>
      </header>

      {isAdminDatePreview ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[color:var(--accent)] bg-[color:var(--accent)] px-3 py-2 text-[color:var(--accent-contrast)]">
          <div className="flex min-w-0 items-center gap-2.5">
            <CalendarDays className="h-4 w-4 shrink-0 text-current" />
            <p className="truncate text-[11px] font-bold">
              Vista administrativa · {formatAdminPreviewDate(todayKey)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDashboardDateKey(systemTodayKey)}
            className="shrink-0 text-[10px] font-black uppercase text-current"
          >
            Volver a hoy
          </button>
        </div>
      ) : null}

      <div className="dashboard-today-module grid gap-4">
        <TodayActionCard
          action={todayAction}
          onPrimary={handleTodayPrimary}
          onSecondary={handleTodaySecondary}
          readOnly={isAdminDatePreview}
        />
        <WeekStrip days={weekData.days} />
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="dashboard-pilot__section-label text-xs font-black uppercase text-[color:var(--text-muted)] dark:text-[#d8d8c0]">
          Rendimiento semanal
        </p>
        <button
          type="button"
          onClick={() => setWeeklyDetailsOpen((current) => !current)}
          aria-expanded={weeklyDetailsOpen}
          aria-controls="weekly-extra-metrics"
          className="dashboard-weekly-toggle inline-flex h-8 items-center gap-1.5 rounded-md border border-[color:var(--border)] bg-[color:var(--card)] px-3 text-[9px] font-black uppercase text-[color:var(--text)] transition hover:border-[color:var(--border-strong)]"
        >
          {weeklyDetailsOpen ? "Ocultar" : "Ver todas"}
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${weeklyDetailsOpen ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      <div className="dashboard-weekly-grid grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Días entrenados"
          value={`${weekData.activeDays}/7`}
          icon={CalendarDays}
          tone="accent"
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
          label="Tiempo semanal"
          value={formatDashboardDuration(weekData.totalSeconds)}
          icon={Clock3}
          tone="amber"
          onClick={() => setDurationModalOpen(true)}
        />
        <StatCard
          label="Calorías quemadas"
          value={
            weeklyCalories.available ? `~${weeklyCalories.calories}` : "--"
          }
          suffix={weeklyCalories.available ? "kcal" : ""}
          icon={Flame}
          tone="accent"
          onClick={() => setCaloriesModalOpen(true)}
        >
          <p className="mt-2 text-[10px] font-semibold text-[color:var(--text-muted)]">
            {weeklyCalories.available
              ? `${weeklyCalories.minCalories}–${weeklyCalories.maxCalories} kcal · ${formatSessionCount(weeklyCalories.sessions)}`
              : "Completa una sesión para calcularlas"}
          </p>
        </StatCard>
        <article className="dashboard-pilot__metric dashboard-weekly-metric dashboard-weekly-comparison rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-left shadow-sm dark:rounded-[4px] dark:shadow-none">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
              Comparación por ejercicio
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
                Marca menor
              </p>
              <p className="mt-1 text-2xl font-black text-[#1a1a1a] dark:text-red-300">
                {Math.max(0, Number(weekData.declines?.length) || 0)}
              </p>
            </button>
            <button
              type="button"
              onClick={() => setPerformanceModalType("improvements")}
              className="px-2.5 py-2 text-left transition hover:text-[color:var(--text)] active:opacity-70"
            >
              <p className="text-[9px] font-black uppercase tracking-wide text-[#6f6f6f] dark:text-[#e2ff00]">
                Marca mejor
              </p>
              <p className="mt-1 text-2xl font-black text-[#ff5722] dark:text-[#e2ff00]">
                {Math.max(0, Number(weekData.improvements?.length) || 0)}
              </p>
            </button>
          </div>
        </article>
      </div>

      {weeklyDetailsOpen ? (
        <div
          id="weekly-extra-metrics"
          className="dashboard-weekly-extra grid grid-cols-2 gap-3"
        >
          <button
            type="button"
            onClick={() => setWeeklyLoadModalOpen(true)}
            aria-label={`Ver detalle del peso levantado: ${formatLiftedWeight(weeklyLoad.current)}`}
            className="dashboard-pilot__metric rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-left shadow-sm transition hover:border-[color:var(--border-strong)] dark:rounded-[4px] dark:shadow-none"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
                Peso levantado
              </p>
              <TrendingUp className="h-3.5 w-3.5 text-[color:var(--accent-strong)]" />
            </div>
            <p className="mt-2 text-2xl font-black text-[color:var(--text)]">
              {formatLiftedWeight(weeklyLoad.current)}
            </p>
            <p className="mt-1 text-[11px] font-semibold text-[color:var(--text-muted)]">
              Peso libre × repeticiones ·{" "}
              {formatSessionCount(weeklyLoad.sessions)}
            </p>
          </button>
          <button
            type="button"
            onClick={() => setWeeklySetsModalOpen(true)}
            aria-label={`Ver detalle del trabajo semanal: ${weeklySets.total} series completadas`}
            className="dashboard-pilot__metric rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-left shadow-sm transition hover:border-[color:var(--border-strong)] dark:rounded-[4px] dark:shadow-none"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
                Trabajo semanal
              </p>
              <ListChecks className="h-3.5 w-3.5 text-[color:var(--accent-strong)]" />
            </div>
            <p className="mt-2 text-2xl font-black text-[color:var(--text)]">
              {weeklySets.total} series
            </p>
            <p className="mt-1 text-[11px] font-semibold text-[color:var(--text-muted)]">
              {formatSessionCount(weeklySets.sessions)} ·{" "}
              {weeklySets.statusLabel}
            </p>
          </button>
        </div>
      ) : null}

      <p className="dashboard-pilot__section-label text-xs font-black uppercase text-[color:var(--text-muted)] dark:text-[#d8d8c0]">
        Recuperación actual
      </p>

      <div>
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
          className="dashboard-pilot__card dashboard-pilot__recovery dashboard-recovery-card w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-left shadow-sm transition hover:border-[color:var(--border-strong)] dark:rounded-[4px] dark:shadow-none"
        >
          {isPostWorkout ? (
            <div className="flex items-center gap-3 text-left">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--accent)] text-[color:var(--accent-contrast)]">
                <Check className="h-5 w-5" strokeWidth={3} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
                  Después de {getRoutineName(latestCompletedToday)}
                </p>
                <p className="mt-0.5 text-base font-black text-[color:var(--text)]">
                  Recuperación en curso
                </p>
                <p className="mt-0.5 truncate text-[10px] font-semibold text-[color:var(--text-muted)]">
                  {postWorkoutPriorityMuscles.length
                    ? `${postWorkoutPriorityMuscles.map((muscle) => muscle.muscle).join(" y ")} necesitan más descanso.`
                    : "Tu cuerpo ya está procesando la carga de la sesión."}
                </p>
              </div>
              <div className="max-w-[34%] shrink-0 text-right">
                <p className="text-[8px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
                  Próxima
                </p>
                <p className="mt-0.5 truncate text-xs font-black text-[color:var(--accent-strong)]">
                  {postWorkoutNextRoutine?.name || "Por definir"}
                </p>
              </div>
            </div>
          ) : isPlannedRestDay ? (
            <div className="flex items-center gap-3 text-left">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--accent)] text-[color:var(--accent-contrast)]">
                <Gauge className="h-5 w-5" strokeWidth={2.4} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
                  Día de descanso
                </p>
                <p className="mt-0.5 text-base font-black text-[color:var(--text)]">
                  Recuperación programada
                </p>
                <p className="mt-0.5 truncate text-[10px] font-semibold text-[color:var(--text-muted)]">
                  Sin otra sesión necesaria hoy.
                </p>
              </div>
              <div className="max-w-[34%] shrink-0 text-right">
                <p className="text-[8px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
                  Próxima
                </p>
                <p className="mt-0.5 truncate text-xs font-black text-[color:var(--accent-strong)]">
                  {plannedRestNextRoutine?.name || "Por definir"}
                </p>
              </div>
            </div>
          ) : (
            <div className="dashboard-recovery-overview flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-[#ff5722] dark:text-[#e2ff00]" />
                  <p className="text-[10px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
                    Disponibilidad muscular
                  </p>
                </div>
                <p className="dashboard-recovery-overview__value mt-2 text-2xl font-black text-[color:var(--text)]">
                  {hasTrainingHistory
                    ? `${recoveryDisplayValue}% disponible`
                    : "Sin datos todavía"}
                </p>
                <p className="mt-1 text-[11px] font-semibold text-[color:var(--text-muted)]">
                  {hasTrainingHistory
                    ? recovery.recommended
                      ? `Para ${recovery.recommended.name}`
                      : recovery.label
                    : "Registra tu primera sesión"}
                </p>
                {hasTrainingHistory && recovery.activePlan ? (
                  <p className="mt-2 truncate text-[10px] font-black uppercase text-[#ff5722] dark:text-[#e2ff00]">
                    {recovery.activePlan.name}
                  </p>
                ) : null}
              </div>
              <div className="grid shrink-0 place-items-center">
                <div
                  className="dashboard-pilot__recovery-ring grid h-20 w-20 place-items-center rounded-full p-[6px] sm:h-36 sm:w-36 sm:p-[9px]"
                  style={{
                    background: `conic-gradient(${isDark ? "#e2ff00" : "#ff5722"} ${hasTrainingHistory ? recoveryDisplayValue : 0}%, ${isDark ? "#292929" : "#d7d7d7"} 0)`,
                  }}
                >
                  <div className="grid h-full w-full place-items-center rounded-full bg-[color:var(--card)]">
                    <span className="text-lg font-black text-[color:var(--text)] sm:text-[34px]">
                      {hasTrainingHistory ? `${recoveryDisplayValue}%` : "--"}
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-[color:var(--text-subtle)]" />
            </div>
          )}
        </button>
      </div>

      <MonthActivityChart
        data={monthActivity.days}
        trainedDays={monthActivity.trainedDays}
        totalSets={monthActivity.totalSets}
        monthLabel={monthActivity.monthLabel}
      />

      <CollapsibleSection
        title="Últimos 3 meses"
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
                    <p>{formatSessionCount(data.sessions)}</p>
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
                      {formatSessionCount(month.sessions)}
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
          <div className="max-h-[86dvh] w-full overflow-hidden rounded-t-3xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-2xl sm:max-w-xl sm:rounded-3xl">
            <div className="flex items-start justify-between gap-3 border-b border-[color:var(--border)] p-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">
                  {isPostWorkout
                    ? "Recuperación post-entrenamiento"
                    : isPlannedRestDay
                      ? "Recuperación programada"
                      : "Estado de recuperación"}
                </p>
                <h2 className="mt-1 text-xl font-black text-[color:var(--text)]">
                  {isPostWorkout
                    ? `Después de ${getRoutineName(latestCompletedToday)}`
                    : isPlannedRestDay
                      ? "Hoy toca descansar"
                      : "Tu disponibilidad para hoy"}
                </h2>
                <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
                  {isPostWorkout
                    ? "Tu sesión de hoy ya está completa. Esta lectura prepara tu próximo entrenamiento."
                    : isPlannedRestDay
                      ? "Tu plan reservó este día para recuperar y llegar mejor a la próxima sesión."
                      : "Estimación basada en tu actividad y carga muscular reciente."}
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
              {isPostWorkout ? (
                <section className="rounded-2xl bg-[color:var(--bg)] p-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[color:var(--accent)] text-[color:var(--accent-contrast)]">
                      <Check className="h-6 w-6" strokeWidth={3} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">
                        Sesión completada hoy
                      </p>
                      <p className="mt-1 truncate text-2xl font-black text-[color:var(--text)]">
                        {getRoutineName(latestCompletedToday)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 border-l-2 border-[color:var(--accent)] pl-3 text-xs font-semibold leading-relaxed text-[color:var(--text-muted)]">
                    Tu recuperación ya comenzó. Los porcentajes siguientes
                    describen grupos musculares y rutinas concretas, no tu
                    recuperación general.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--card)] px-2.5 py-1 text-[10px] font-bold text-[color:var(--text-muted)]">
                      {getTrainingSetCount(latestCompletedToday, catalogIndex)}{" "}
                      series
                    </span>
                    <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--card)] px-2.5 py-1 text-[10px] font-bold text-[color:var(--text-muted)]">
                      {formatDashboardDuration(
                        getEffectiveDurationSeconds(latestCompletedToday),
                      )}
                    </span>
                    <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--card)] px-2.5 py-1 text-[10px] font-bold text-[color:var(--text-muted)]">
                      {formatExerciseCount(
                        latestCompletedToday.exercises?.length || 0,
                      )}
                    </span>
                  </div>
                </section>
              ) : isPlannedRestDay ? (
                <section className="rounded-2xl bg-[color:var(--bg)] p-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[color:var(--accent)] text-[color:var(--accent-contrast)]">
                      <Gauge className="h-6 w-6" strokeWidth={2.4} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">
                        Descanso programado
                      </p>
                      <p className="mt-1 text-2xl font-black text-[color:var(--text)]">
                        Recuperación en curso
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 border-l-2 border-[color:var(--accent)] pl-3 text-xs font-semibold leading-relaxed text-[color:var(--text-muted)]">
                    Que algunos grupos musculares estén disponibles no significa
                    que debas añadir otra sesión hoy. Mantén el descanso
                    previsto por tu plan.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {recovery.activePlan ? (
                      <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--card)] px-2.5 py-1 text-[10px] font-bold text-[color:var(--text-muted)]">
                        {recovery.activePlan.name}
                      </span>
                    ) : null}
                    {plannedRestNextRoutine ? (
                      <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--card)] px-2.5 py-1 text-[10px] font-bold text-[color:var(--text-muted)]">
                        Próxima: {plannedRestNextRoutine.name}
                      </span>
                    ) : null}
                  </div>
                </section>
              ) : (
                <section className="rounded-2xl bg-[color:var(--bg)] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                        Disponibilidad para{" "}
                        {recovery.recommended?.name || "entrenar"}
                      </p>
                      <p className="mt-1 text-4xl font-black tracking-tight text-[color:var(--text)]">
                        {recoveryDisplayValue}%
                      </p>
                    </div>
                    <span
                      className="max-w-[55%] rounded-full px-3 py-1.5 text-right text-[10px] font-black uppercase"
                      style={{
                        backgroundColor:
                          recoveryDisplayValue >= 70
                            ? "var(--accent-soft)"
                            : recoveryDisplayValue >= 55
                              ? "var(--warning-soft)"
                              : "var(--danger-soft)",
                        color:
                          recoveryDisplayValue >= 70
                            ? "var(--accent-contrast)"
                            : recoveryDisplayValue >= 55
                              ? "var(--warning)"
                              : "var(--danger)",
                      }}
                    >
                      {getRecoveryLabel(recoveryDisplayValue)}
                    </span>
                  </div>

                  <div
                    className="mt-3 h-2 overflow-hidden rounded-full bg-[color:var(--border)]"
                    role="img"
                    aria-label={`${recoveryDisplayValue}% de compatibilidad muscular estimada`}
                  >
                    <div
                      className="h-full rounded-full bg-[color:var(--accent)]"
                      style={{ width: `${recoveryDisplayValue}%` }}
                    />
                  </div>

                  <div className="mt-4 border-l-2 border-[color:var(--accent)] pl-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--accent-strong)]">
                      Recomendación de hoy
                    </p>
                    <p className="mt-1 text-base font-black text-[color:var(--text)]">
                      {recovery.recommended
                        ? recovery.recommended.name
                        : recovery.label}
                    </p>
                    <p className="mt-1 text-xs font-semibold leading-relaxed text-[color:var(--text-muted)]">
                      {recovery.recommendationReason}.
                    </p>
                  </div>
                </section>
              )}

              {!isPostWorkout && !isPlannedRestDay ? (
                <section className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-[color:var(--border)] py-4 sm:grid-cols-4 sm:gap-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
                      Última sesión
                    </p>
                    <p className="mt-1 text-base font-black text-[color:var(--text)]">
                      {recovery.daysSinceLast == null
                        ? "--"
                        : recovery.daysSinceLast === 0
                          ? "Hoy"
                          : `${recovery.daysSinceLast} d`}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] font-semibold text-[color:var(--text-muted)]">
                      {recovery.lastTraining
                        ? getRoutineName(recovery.lastTraining)
                        : "Sin datos"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
                      Racha actual
                    </p>
                    <p className="mt-1 text-base font-black text-[color:var(--text)]">
                      {recovery.consecutiveDays} d
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold text-[color:var(--text-muted)]">
                      consecutivos
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
                      Series
                    </p>
                    <p className="mt-1 text-base font-black text-[color:var(--text)]">
                      {formatSeriesCount(recovery.weeklySets)}
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold text-[color:var(--text-muted)]">
                      esta semana
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
                      Tiempo
                    </p>
                    <p className="mt-1 text-base font-black text-[color:var(--text)]">
                      {formatDashboardDuration(recovery.weeklySeconds)}
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold text-[color:var(--text-muted)]">
                      esta semana
                    </p>
                  </div>
                </section>
              ) : null}

              <RecoveryInsightSection
                insights={recovery.recoveryInsights}
                isPostWorkout={isPostWorkout}
                isPlannedRestDay={isPlannedRestDay}
              />

              {isPostWorkout || isPlannedRestDay ? (
                <RecoveryMuscleSection
                  muscles={recoveryMusclesForDisplay}
                  prioritizeRecovery
                />
              ) : null}

              <section className="mt-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-[color:var(--text)]">
                      {isPostWorkout || isPlannedRestDay
                        ? "Próxima rutina del plan"
                        : "Disponibilidad por rutina"}
                    </h3>
                    <p className="mt-0.5 text-[11px] font-semibold text-[color:var(--text-muted)]">
                      {isPostWorkout || isPlannedRestDay
                        ? "Vuelve a consultar esta estimación antes de entrenar."
                        : "Compara antes de elegir tu entrenamiento."}
                    </p>
                  </div>
                  <span className="max-w-[45%] truncate rounded-full bg-[color:var(--accent)] px-2.5 py-1 text-[9px] font-black uppercase text-[color:var(--accent-contrast)]">
                    {recovery.activePlan?.name || "Sin plan vigente"}
                  </span>
                </div>
                <div className="mt-3 divide-y divide-[color:var(--border)] border-y border-[color:var(--border)]">
                  {(isPostWorkout || isPlannedRestDay
                    ? [futurePlanRoutine].filter(Boolean)
                    : recoveryRoutinesForDisplay
                  ).length ? (
                    (isPostWorkout || isPlannedRestDay
                      ? [futurePlanRoutine].filter(Boolean)
                      : recoveryRoutinesForDisplay
                    ).map((routine) => (
                      <article key={routine.name} className="py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-black text-[color:var(--text)]">
                                {routine.name}
                              </p>
                              {(
                                isPostWorkout || isPlannedRestDay
                                  ? futurePlanRoutine?.id === routine.id
                                  : recovery.recommended?.id === routine.id
                              ) ? (
                                <span className="shrink-0 rounded-full bg-[color:var(--accent)] px-2 py-0.5 text-[8px] font-black uppercase text-[color:var(--accent-contrast)]">
                                  {isPostWorkout || isPlannedRestDay
                                    ? "Próxima"
                                    : "Recomendada"}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 truncate text-[10px] font-semibold text-[color:var(--text-muted)]">
                              {routine.muscles.join(" · ")}
                            </p>
                          </div>
                          <span
                            className="shrink-0 text-sm font-black"
                            style={{
                              color:
                                routine.value >= 70
                                  ? "var(--accent-strong)"
                                  : routine.value >= 55
                                    ? "var(--warning)"
                                    : "var(--danger)",
                            }}
                          >
                            {routine.value}%
                          </span>
                        </div>
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-[color:var(--border)]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${routine.value}%`,
                              backgroundColor:
                                routine.value >= 70
                                  ? "var(--accent)"
                                  : routine.value >= 55
                                    ? "var(--warning)"
                                    : "var(--danger)",
                            }}
                          />
                        </div>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-[10px] font-semibold text-[color:var(--text-muted)]">
                          <span>
                            {isPostWorkout || isPlannedRestDay
                              ? `Compatibilidad muscular actual · ${getPostWorkoutRecoveryLabel(routine.value)}`
                              : routine.label}
                          </span>
                          <span className="text-right">
                            {routine.limitingMuscle
                              ? `Limita: ${routine.limitingMuscle.muscle}`
                              : "Sin limitantes"}
                          </span>
                        </div>
                      </article>
                    ))
                  ) : (
                    <p className="py-4 text-sm font-semibold text-[color:var(--text-muted)]">
                      {recovery.activePlan
                        ? "El plan vigente no tiene rutinas disponibles para sugerir."
                        : "Activa una planificación para recibir sugerencias de rutina."}
                    </p>
                  )}
                </div>
              </section>

              {!isPostWorkout && !isPlannedRestDay ? (
                <RecoveryMuscleSection muscles={recoveryMusclesForDisplay} />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <CalorieEstimateModal
        open={caloriesModalOpen}
        onClose={() => setCaloriesModalOpen(false)}
        summary={weeklyCalories}
        estimates={weeklyCalorieEstimates}
        periodLabel="Semana actual"
      />

      {weeklyLoadModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Detalle del peso levantado"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget)
              setWeeklyLoadModalOpen(false);
          }}
        >
          <div className="max-h-[86dvh] w-full overflow-hidden rounded-t-3xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-2xl sm:max-w-xl sm:rounded-3xl">
            <div className="flex items-start justify-between gap-3 border-b border-[color:var(--border)] p-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">
                  Peso levantado
                </p>
                <h2 className="mt-1 text-xl font-black text-[color:var(--text)]">
                  Tu carga con peso libre
                </h2>
                <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
                  {weeklyLoad.description}
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
              <section className="rounded-2xl bg-[color:var(--bg)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                      Acumulado esta semana
                    </p>
                    <p className="mt-1 text-4xl font-black tracking-tight text-[color:var(--text)]">
                      {formatLiftedWeight(weeklyLoad.current)}
                    </p>
                  </div>
                  <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-1.5 text-[10px] font-black text-[color:var(--text-muted)]">
                    {weeklyLoad.changeLabel}
                  </span>
                </div>
                <p className="mt-4 border-l-2 border-[color:var(--accent)] pl-3 text-xs font-semibold leading-relaxed text-[color:var(--text-muted)]">
                  Ejemplo: 10 repeticiones con 20 kg suman 200 kg. Usa este dato
                  para observar tu tendencia, no como una marca máxima.
                </p>
              </section>

              <section className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-[color:var(--border)] py-4 sm:grid-cols-4 sm:gap-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
                    Sesiones
                  </p>
                  <p className="mt-1 text-base font-black text-[color:var(--text)]">
                    {weeklyLoad.sessions}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold text-[color:var(--text-muted)]">
                    esta semana
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
                    Por sesión
                  </p>
                  <p className="mt-1 text-base font-black text-[color:var(--text)]">
                    {formatLiftedWeight(weeklyLoad.averagePerSession)}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold text-[color:var(--text-muted)]">
                    promedio
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
                    Semana anterior
                  </p>
                  <p className="mt-1 text-base font-black text-[color:var(--text)]">
                    {formatLiftedWeight(weeklyLoad.previousTotal)}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold text-[color:var(--text-muted)]">
                    {formatSessionCount(weeklyLoad.previousSessions)}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
                    Antes por sesión
                  </p>
                  <p className="mt-1 text-base font-black text-[color:var(--text)]">
                    {formatLiftedWeight(weeklyLoad.previousAveragePerSession)}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold text-[color:var(--text-muted)]">
                    promedio
                  </p>
                </div>
              </section>

              <section className="mt-5">
                <div>
                  <h3 className="text-sm font-black text-[color:var(--text)]">
                    Otros tipos de ejercicio
                  </h3>
                  <p className="mt-0.5 text-[11px] font-semibold text-[color:var(--text-muted)]">
                    Se separan porque no se comparan igual que el peso libre.
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-6 border-y border-[color:var(--border)] sm:grid-cols-4 sm:gap-4">
                  <div className="py-3">
                    <p className="text-[10px] font-black text-[color:var(--text)]">
                      Máquinas
                    </p>
                    <p className="mt-1 text-sm font-black text-[color:var(--accent-strong)]">
                      {formatLiftedWeight(weeklyLoad.loadMetrics.machineKg)}
                    </p>
                    <p className="text-[10px] font-semibold text-[color:var(--text-muted)]">
                      {weeklyLoad.loadMetrics.machineSets} series
                    </p>
                  </div>
                  <div className="py-3">
                    <p className="text-[10px] font-black text-[color:var(--text)]">
                      Peso corporal
                    </p>
                    <p className="mt-1 text-sm font-black text-[color:var(--accent-strong)]">
                      {weeklyLoad.loadMetrics.bodyweightSets} series
                    </p>
                    <p className="text-[10px] font-semibold text-[color:var(--text-muted)]">
                      sin carga externa
                    </p>
                  </div>
                  <div className="py-3">
                    <p className="text-[10px] font-black text-[color:var(--text)]">
                      Asistidos
                    </p>
                    <p className="mt-1 text-sm font-black text-[color:var(--accent-strong)]">
                      {weeklyLoad.loadMetrics.assistedSets} series
                    </p>
                    <p className="text-[10px] font-semibold text-[color:var(--text-muted)]">
                      con ayuda
                    </p>
                  </div>
                  <div className="py-3">
                    <p className="text-[10px] font-black text-[color:var(--text)]">
                      Sin clasificar
                    </p>
                    <p className="mt-1 text-sm font-black text-[color:var(--accent-strong)]">
                      {weeklyLoad.loadMetrics.unknownSets} series
                    </p>
                    <p className="text-[10px] font-semibold text-[color:var(--text-muted)]">
                      revisa el tipo
                    </p>
                  </div>
                </div>
              </section>

              <section className="mt-5">
                <div>
                  <h3 className="text-sm font-black text-[color:var(--text)]">
                    Peso levantado por rutina
                  </h3>
                  <p className="mt-0.5 text-[11px] font-semibold text-[color:var(--text-muted)]">
                    Identifica qué entrenamiento aportó más carga.
                  </p>
                </div>
                <div className="mt-3 divide-y divide-[color:var(--border)] border-y border-[color:var(--border)]">
                  {weeklyLoad.byRoutine.length ? (
                    weeklyLoad.byRoutine.map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between gap-3 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-[color:var(--text)]">
                            {item.name}
                          </p>
                          <p className="mt-0.5 text-[10px] font-semibold text-[color:var(--text-muted)]">
                            {formatSessionCount(item.sessions)} ·{" "}
                            {item.completedSets} series
                            {item.machineKg
                              ? ` · Máquinas ${formatLiftedWeight(item.machineKg)}`
                              : ""}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-black text-[color:var(--accent-strong)]">
                          {formatLiftedWeight(item.externalKg)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="py-4 text-sm font-semibold text-[color:var(--text-muted)]">
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
          <div className="max-h-[86dvh] w-full overflow-hidden rounded-t-3xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-2xl sm:max-w-xl sm:rounded-3xl">
            <div className="flex items-start justify-between gap-3 border-b border-[color:var(--border)] p-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">
                  Trabajo semanal
                </p>
                <h2 className="mt-1 text-xl font-black text-[color:var(--text)]">
                  Series que completaste
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
              <section className="rounded-2xl bg-[color:var(--bg)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                      Completadas esta semana
                    </p>
                    <p className="mt-1 text-4xl font-black tracking-tight text-[color:var(--text)]">
                      {weeklySets.total}{" "}
                      <span className="text-lg text-[color:var(--text-muted)]">
                        series
                      </span>
                    </p>
                  </div>
                  <span
                    className="rounded-full px-3 py-1.5 text-[10px] font-black"
                    style={{
                      backgroundColor:
                        weeklySets.completionRate >= 90
                          ? "var(--accent-soft)"
                          : "var(--warning-soft)",
                      color:
                        weeklySets.completionRate >= 90
                          ? "var(--accent-contrast)"
                          : "var(--warning)",
                    }}
                  >
                    {weeklySets.recorded
                      ? `${weeklySets.completionRate}% terminadas`
                      : "Sin series registradas"}
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[color:var(--border)]">
                  <div
                    className="h-full rounded-full bg-[color:var(--accent)]"
                    style={{ width: `${weeklySets.completionRate}%` }}
                  />
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-[color:var(--text-muted)]">
                  <span>{weeklySets.diffLabel}</span>
                  <span>
                    {weeklySets.incomplete
                      ? `${weeklySets.incomplete} sin completar`
                      : "Todas las registradas fueron completadas"}
                  </span>
                </div>
              </section>

              <section className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-[color:var(--border)] py-4 sm:grid-cols-4 sm:gap-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
                    Sesiones
                  </p>
                  <p className="mt-1 text-base font-black text-[color:var(--text)]">
                    {weeklySets.sessions}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold text-[color:var(--text-muted)]">
                    esta semana
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
                    Por sesión
                  </p>
                  <p className="mt-1 text-base font-black text-[color:var(--text)]">
                    {formatSeriesCount(weeklySets.averagePerSession)}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold text-[color:var(--text-muted)]">
                    promedio
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
                    Semana anterior
                  </p>
                  <p className="mt-1 text-base font-black text-[color:var(--text)]">
                    {weeklySets.previousTotal}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold text-[color:var(--text-muted)]">
                    {formatSessionCount(weeklySets.previousSessions)}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
                    Antes por sesión
                  </p>
                  <p className="mt-1 text-base font-black text-[color:var(--text)]">
                    {formatSeriesCount(weeklySets.previousAveragePerSession)}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold text-[color:var(--text-muted)]">
                    promedio
                  </p>
                </div>
              </section>

              <p className="mt-5 border-l-2 border-[color:var(--accent)] pl-3 text-xs font-semibold leading-relaxed text-[color:var(--text-muted)]">
                Más series no siempre significa mejor entrenamiento. Úsalas para
                observar constancia y distribución, junto con tu recuperación y
                progreso.
              </p>

              <section className="mt-5">
                <div>
                  <h3 className="text-sm font-black text-[color:var(--text)]">
                    Distribución por músculo
                  </h3>
                  <p className="mt-0.5 text-[11px] font-semibold text-[color:var(--text-muted)]">
                    Estimación del trabajo principal y secundario recibido.
                  </p>
                </div>
                <div className="mt-3 divide-y divide-[color:var(--border)] border-y border-[color:var(--border)]">
                  {weeklySets.byMuscle.length ? (
                    weeklySets.byMuscle.map((item) => (
                      <div key={item.name} className="py-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-black text-[color:var(--text)]">
                            {item.name}
                          </p>
                          <span className="shrink-0 text-xs font-black text-[color:var(--accent-strong)]">
                            {formatSeriesCount(item.sets)} series aprox.
                          </span>
                        </div>
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-[color:var(--border)]">
                          <div
                            className="h-full rounded-full bg-[color:var(--accent)]"
                            style={{
                              width: `${Math.min(
                                100,
                                weeklySets.byMuscle[0]?.sets
                                  ? (item.sets / weeklySets.byMuscle[0].sets) *
                                      100
                                  : 0,
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="py-4 text-sm font-semibold text-[color:var(--text-muted)]">
                      No hay series completadas esta semana.
                    </p>
                  )}
                </div>
              </section>

              <section className="mt-5">
                <div>
                  <h3 className="text-sm font-black text-[color:var(--text)]">
                    Trabajo por rutina
                  </h3>
                  <p className="mt-0.5 text-[11px] font-semibold text-[color:var(--text-muted)]">
                    Series terminadas en cada entrenamiento.
                  </p>
                </div>
                <div className="mt-3 divide-y divide-[color:var(--border)] border-y border-[color:var(--border)]">
                  {weeklySets.byRoutine.length ? (
                    weeklySets.byRoutine.map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between gap-3 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-[color:var(--text)]">
                            {item.name}
                          </p>
                          <p className="text-[11px] font-semibold text-[color:var(--text-muted)]">
                            {formatSessionCount(item.sessions)}
                          </p>
                          {item.incompleteSets ? (
                            <p className="mt-1 text-[10px] font-bold text-[color:var(--warning)]">
                              {item.incompleteSets}{" "}
                              {item.incompleteSets === 1
                                ? "serie sin completar"
                                : "series sin completar"}
                            </p>
                          ) : null}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-black text-[color:var(--accent-strong)]">
                            {item.sets} series
                          </p>
                          <p className="text-[10px] font-semibold text-[color:var(--text-muted)]">
                            {item.sets} de {item.recordedSets} terminadas
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="py-4 text-sm font-semibold text-[color:var(--text-muted)]">
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
          aria-label="Detalle del tiempo semanal"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget)
              setDurationModalOpen(false);
          }}
        >
          <div className="max-h-[86dvh] w-full overflow-hidden rounded-t-3xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-2xl sm:max-w-xl sm:rounded-3xl">
            <div className="flex items-start justify-between gap-3 border-b border-[color:var(--border)] p-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">
                  Semana actual
                </p>
                <h2 className="mt-1 text-xl font-black text-[color:var(--text)]">
                  Tiempo semanal
                </h2>
                <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
                  Tiempo acumulado en tus sesiones. Las pausas manuales no se
                  suman al total.
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
              <section className="border-b border-[color:var(--border)] pb-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                      Tiempo acumulado
                    </p>
                    <p className="mt-2 text-4xl font-black text-[color:var(--text)]">
                      {formatSessionMinutes(durationSummary.sessionSeconds)}
                    </p>
                  </div>
                  <span className="pb-1 text-xs font-black text-[color:var(--accent-strong)]">
                    {formatSessionCount(durationRows.length)}
                  </span>
                </div>

                {durationSummary.trackedCount ? (
                  <div className="mt-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                        Distribución medida
                      </p>
                      <p className="text-[11px] font-semibold text-[color:var(--text-muted)]">
                        {durationSummary.trackedCount} de {durationRows.length}{" "}
                        sesiones
                      </p>
                    </div>
                    <div
                      className="mt-3 flex h-2 overflow-hidden rounded-full bg-[color:var(--surface-subtle)]"
                      role="img"
                      aria-label={`${durationSummary.workPercent}% trabajo estimado y ${100 - durationSummary.workPercent}% descanso medido`}
                    >
                      <span
                        className="h-full bg-[color:var(--accent)]"
                        style={{ width: `${durationSummary.workPercent}%` }}
                      />
                      <span className="h-full flex-1 bg-[color:var(--border-strong)]" />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wide text-[color:var(--accent-strong)]">
                          Trabajo estimado
                        </p>
                        <p className="mt-1 text-lg font-black text-[color:var(--text)]">
                          {formatSessionMinutes(durationSummary.workSeconds)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
                          Descanso medido
                        </p>
                        <p className="mt-1 text-lg font-black text-[color:var(--text)]">
                          {formatSessionMinutes(durationSummary.restSeconds)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm font-semibold text-[color:var(--text-muted)]">
                    Aún no hay sesiones con descansos medidos para mostrar la
                    distribución.
                  </p>
                )}

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-[color:var(--border)] pt-3 text-xs font-semibold text-[color:var(--text-muted)]">
                  <span>Pausas excluidas del total</span>
                  <span className="font-black text-[color:var(--text)]">
                    {formatSessionMinutes(durationSummary.pauseSeconds)}
                  </span>
                </div>

                {durationSummary.trackedCount < durationRows.length ? (
                  <p className="mt-3 rounded-lg bg-[color:var(--warning-soft)] px-3 py-2 text-[11px] font-semibold text-[color:var(--warning)]">
                    Algunas sesiones no tienen descansos medidos; la
                    distribución solo usa las sesiones disponibles.
                  </p>
                ) : null}
              </section>

              {durationRows.length ? (
                <section className="pt-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-black text-[color:var(--text)]">
                      Sesiones de esta semana
                    </h3>
                    <span className="text-[11px] font-semibold text-[color:var(--text-muted)]">
                      {formatSessionCount(durationRows.length)}
                    </span>
                  </div>
                  <div className="mt-2 divide-y divide-[color:var(--border)]">
                    {durationRows.map((row) => (
                      <article
                        key={row.id}
                        className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-[color:var(--text)]">
                            {row.routine}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
                            {formatLongDate(row.date)}
                            {row.branch ? ` · ${titleCase(row.branch)}` : ""}
                          </p>
                          <p className="mt-2 text-[11px] font-semibold text-[color:var(--text-muted)]">
                            {row.hasRestTracking
                              ? `Trabajo ${formatSessionMinutes(row.workSeconds)} · Descanso ${formatSessionMinutes(row.restSeconds)}`
                              : "Descanso no medido"}
                            {row.pauseSeconds
                              ? ` · Pausa excluida ${formatSessionMinutes(row.pauseSeconds)}`
                              : ""}
                            {row.adjusted ? " · Tiempo ajustado" : ""}
                          </p>
                        </div>
                        <div className="sm:text-right">
                          <p className="text-[9px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
                            Total
                          </p>
                          <p className="mt-1 text-lg font-black text-[color:var(--accent-strong)]">
                            {formatSessionMinutes(row.seconds)}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ) : (
                <div className="py-10 text-center">
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[color:var(--accent)] text-[color:var(--accent-contrast)]">
                    <Clock3 className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-base font-black text-[color:var(--text)]">
                    Sin tiempo registrado
                  </h3>
                  <p className="mt-2 text-sm font-semibold text-[color:var(--text-muted)]">
                    Completa una sesión para empezar tu resumen semanal.
                  </p>
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
          aria-label="Comparación semanal por ejercicio"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget)
              setPerformanceModalType(null);
          }}
        >
          <div className="max-h-[86dvh] w-full overflow-hidden rounded-t-3xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-2xl sm:max-w-2xl sm:rounded-3xl">
            <div className="flex items-start justify-between gap-3 border-b border-[color:var(--border)] p-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">
                  Progreso semanal
                </p>
                <h2 className="mt-1 text-xl font-black text-[color:var(--text)]">
                  Comparación por ejercicio
                </h2>
                <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
                  Tu mejor serie de esta semana frente a la ejecución anterior.
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
              <div className="sticky -top-4 z-10 -mx-4 bg-[color:var(--card)] px-4">
                <div
                  className="grid grid-cols-2 border-b border-[color:var(--border)]"
                  role="group"
                  aria-label="Resultado de la comparación"
                >
                  {performanceTabs.map((tab) => {
                    const active = performanceModalType === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        aria-pressed={active}
                        aria-controls="performance-comparison-results"
                        onClick={() => setPerformanceModalType(tab.key)}
                        className={`flex min-h-12 min-w-0 items-center justify-center gap-2 border-b-2 px-3 py-2 text-center transition ${
                          active
                            ? tab.key === "improvements"
                              ? "border-[color:var(--accent)] text-[color:var(--text)]"
                              : "border-[color:var(--danger)] text-[color:var(--text)]"
                            : "border-transparent text-[color:var(--text-muted)]"
                        }`}
                      >
                        <span className="truncate text-xs font-black">
                          {tab.label}
                        </span>
                        <span
                          className={`grid h-7 min-w-7 shrink-0 place-items-center rounded-full px-1.5 text-xs font-black ${
                            active
                              ? tab.key === "improvements"
                                ? "bg-[color:var(--accent)] text-[color:var(--accent-contrast)]"
                                : "bg-[color:var(--danger-soft)] text-[color:var(--danger)]"
                              : "bg-[color:var(--bg)] text-[color:var(--text-muted)]"
                          }`}
                        >
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                className="flex items-start justify-between gap-4 border-b border-[color:var(--border)] py-4"
                aria-live="polite"
              >
                <p className="text-sm font-black text-[color:var(--text)]">
                  {performanceSummary}
                </p>
                <span className="shrink-0 text-[11px] font-semibold text-[color:var(--text-muted)]">
                  Semana actual
                </span>
              </div>

              {performanceModalConfig.groups.length ? (
                <div
                  id="performance-comparison-results"
                  className="divide-y divide-[color:var(--border)]"
                >
                  {performanceModalConfig.groups.map(({ group, items }) => (
                    <section
                      key={`${performanceModalType}-${group}`}
                      className="py-5 first:pt-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-base font-black text-[color:var(--text)]">
                          {group}
                        </h3>
                        <span className="text-[11px] font-semibold text-[color:var(--text-muted)]">
                          {formatExerciseCount(items.length)}
                        </span>
                      </div>
                      <div className="mt-1 divide-y divide-[color:var(--border)]">
                        {items.map((item) => (
                          <article
                            key={`${performanceModalType}-${item.key}-${item.date}`}
                            className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(240px,0.9fr)] sm:items-center sm:gap-5"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-[color:var(--text)]">
                                {item.exerciseName}
                              </p>
                              <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
                                {formatLongDate(item.date)}
                              </p>
                              <p
                                className={`mt-2 text-[10px] font-black uppercase tracking-wide ${
                                  performanceModalConfig.tone === "red"
                                    ? "text-[color:var(--danger)]"
                                    : "text-[color:var(--accent-strong)]"
                                }`}
                              >
                                {item[performanceModalConfig.typeKey]}
                              </p>
                            </div>
                            {item.previousValue ? (
                              <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                                <div className="min-w-0 rounded-xl bg-[color:var(--bg)] p-3">
                                  <p className="text-[9px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
                                    Anterior
                                  </p>
                                  <p className="mt-1 truncate text-xs font-black text-[color:var(--text)]">
                                    {item.previousValue}
                                  </p>
                                </div>
                                <ArrowRight
                                  className="h-4 w-4 shrink-0 text-[color:var(--text-muted)]"
                                  aria-hidden="true"
                                />
                                <div
                                  className={`min-w-0 rounded-xl p-3 ${
                                    performanceModalConfig.tone === "red"
                                      ? "bg-[color:var(--danger-soft)] text-[color:var(--danger)]"
                                      : "bg-[color:var(--accent)] text-[color:var(--accent-contrast)]"
                                  }`}
                                >
                                  <p className="text-[9px] font-black uppercase tracking-wide opacity-70">
                                    Actual
                                  </p>
                                  <p className="mt-1 truncate text-xs font-black">
                                    {item.currentValue}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs font-semibold text-[color:var(--text-muted)]">
                                Primer registro comparativo.
                              </p>
                            )}
                          </article>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <div
                  id="performance-comparison-results"
                  className="py-10 text-center"
                >
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[color:var(--accent)] text-[color:var(--accent-contrast)]">
                    <Check className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-base font-black text-[color:var(--text)]">
                    {performanceModalConfig.emptyTitle}
                  </h3>
                  <p className="mx-auto mt-2 max-w-sm text-sm font-semibold text-[color:var(--text-muted)]">
                    {performanceModalConfig.empty}
                  </p>
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
