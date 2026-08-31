import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Circle,
  CircleDot,
  ClipboardList,
  Dumbbell,
  Flag,
  Hourglass,
  LoaderCircle,
  MapPin,
  Minimize2,
  MoreVertical,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  Timer,
  X,
} from "lucide-react";
import { toast } from "sonner";
import Card from "../components/ui/card";
import Button from "../components/ui/button";
import Badge from "../components/ui/badge";
import Modal from "../components/shared/Modal";
import RoutineSelector from "../components/training/RoutineSelector";
import ExerciseCard from "../components/training/ExerciseCard";
import ExerciseOrderPanel from "../components/training/ExerciseOrderPanel";
import ActivePlanWorkoutPlanner from "../components/training/ActivePlanWorkoutPlanner";
import AutoRestCountdownModal from "../components/training/AutoRestCountdownModal";
import AutoRestCompleteModal from "../components/training/AutoRestCompleteModal";
import TrainingCompletionPanel from "../components/training/TrainingCompletionPanel";
import TrainingCompletePage from "../components/training/TrainingCompletePage";
import ThemeToggle from "../components/ThemeToggle";
import MobileMenuButton from "../components/layout/MobileMenuButton";
import MobilePageHeader from "../components/layout/MobilePageHeader";
import ProfileAvatar from "../components/profile/ProfileAvatar";
import ExerciseThumbnail from "../components/analytics/ExerciseThumbnail";
import OperationLoader from "../components/system/OperationLoader";
import { useRoutines } from "../context/RoutineContext";
import { useTrainingData } from "../context/TrainingContext";
import { useAuth } from "../context/AuthContext";
import { useUserProfile } from "../context/UserContext";
import { api } from "../services/api";
import { getExerciseImageUrl } from "../utils/cloudinary";
import { canAccessActiveTraining, getUserId } from "../utils/activeTraining";
import { findAutoFlowDestination } from "../utils/autoWorkoutFlow";
import { inferWeightConfig, normalizeWeightBasis } from "../utils/weightConfig";
import {
  computeCompatibleRecentBySet,
  getCompatibleExerciseHistoryKeys,
  getLatestCompatibleReference,
} from "../utils/historyCompatibility";
import {
  buildExerciseTrackingRows,
  getExerciseTrackingRoutineLabel,
} from "../utils/exerciseTracking";
import {
  getTrainingSaveErrorMessage,
  hasRecordedTrainingData,
} from "../utils/trainingSubmission";
import { resolveRoutinePlanContext } from "../utils/trainingPlanContext";
import { estimateTrainingCalories } from "../utils/calorieEstimate";
import {
  buildFallbackTimeEvents,
  calculateTimingSummary,
  createTimeEvent,
  getEventTime,
  hasOpenRestInterval,
  normalizeTimeEvents,
  removeLatestSetCompletion,
  resolveSetWorkEstimate,
} from "../utils/trainingTiming";

const getLocalISODate = (value) => {
  if (value) return value.slice(0, 10);
  const d = new Date();
  const offsetMs = d.getTimezoneOffset() * 60000;
  const local = new Date(d.getTime() - offsetMs);
  return local.toISOString().slice(0, 10);
};
const todayISO = getLocalISODate();
const getCurrentPlanWeek = (plan, dateValue = getLocalISODate()) => {
  if (!plan?.startDate) return 0;
  const start = new Date(plan.startDate);
  start.setUTCHours(0, 0, 0, 0);
  const selectedDate = new Date(`${dateValue.slice(0, 10)}T00:00:00.000Z`);
  return Math.min(
    Math.max(0, Number(plan.durationWeeks || 1) - 1),
    Math.max(0, Math.floor((selectedDate - start) / (7 * 86400000))),
  );
};
const SNAPSHOT_KEY = "active_training_snapshot";
const TRAINING_ROUTINES_RETURN_KEY = "training_routines_return";
const TRAINING_ROUTINE_EDIT_TARGET_KEY = "training_routine_edit_target";
const ROUTINE_UPDATED_DURING_TRAINING_KEY = "routine_updated_during_training";
const TRAINING_PLAN_ROUTINE_INTENT_KEY = "training_plan_routine_intent";
const MAX_TRAINING_PHOTO_BYTES = 5 * 1024 * 1024;
const TRAINING_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const BRANCH_OPTIONS = ["sopocachi", "miraflores"];
const DEFAULT_BRANCH = "sopocachi";
const formatExerciseCount = (count) => {
  const total = Number(count) || 0;
  return `${total} ${total === 1 ? "ejercicio" : "ejercicios"}`;
};
const TRAINING_COMPLETION_HERO_IMAGES = Object.freeze({
  "lower a": "/images/routine-lower-a.webp",
  upper: "/images/routine-upper.webp",
  "lower b": "/images/workout-hero-model.webp",
  push: "/images/routine-push.webp",
  pull: "/images/routine-pull.webp",
});
const getTrainingCompletionHeroImage = (routine) => {
  const routineName = String(routine?.name || routine?.raw?.name || "")
    .trim()
    .toLocaleLowerCase("es")
    .replace(/\s+/g, " ");
  return (
    TRAINING_COMPLETION_HERO_IMAGES[routineName] ||
    "/images/workout-hero-model.webp"
  );
};
const createTrainingRequestId = () => {
  const browserCrypto = typeof window !== "undefined" ? window.crypto : null;
  const id =
    browserCrypto && typeof browserCrypto.randomUUID === "function"
      ? browserCrypto.randomUUID()
      : "";
  return `training_${id || `${Date.now()}_${Math.random().toString(36).slice(2)}`}`;
};
const normalizeBranch = (value) =>
  BRANCH_OPTIONS.includes(value) ? value : DEFAULT_BRANCH;

const toValidDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
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

const formatLongDate = (iso) => {
  const d = toValidDate(iso);
  if (!d) return "--";
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const formatShort = (iso) => {
  const d = toValidDate(iso);
  if (!d) return "--";
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  });
};

const buildPrevText = (meta, fallback) => {
  if (meta && (meta.weight != null || meta.reps != null || meta.date)) {
    const weightLabel =
      meta.weight != null && meta.weight !== "" ? `${meta.weight}kg` : "--kg";
    const repsLabel = meta.reps != null && meta.reps !== "" ? meta.reps : "--";
    const dateLabel = meta.date ? formatShort(meta.date) : "--";
    return `${weightLabel} x ${repsLabel} | ${dateLabel}`;
  }
  return fallback || "Sin referencia";
};

const formatHistoryLift = (meta) => buildPrevText(meta, "");

const formatDuration = (sec) => {
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;
  return [hours, minutes, seconds]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
};

const branchMeta = {
  sopocachi: {
    title: "Sopocachi",
    subtitle: "Av. 20 de Octubre",
  },
  miraflores: {
    title: "Miraflores",
    subtitle: "Av. Busch",
  },
  general: {
    title: "General",
    subtitle: "Disponible en todas las sucursales",
  },
};

const getBranchTitle = (branch) =>
  branchMeta[normalizeBranch(branch)]?.title || branch || "Sucursal";

const formatRelativeSessionDate = (value) => {
  const date = toValidDate(value);
  if (!date) return "Sin registros anteriores";
  const today = toValidDate(todayISO);
  const days = Math.max(
    0,
    Math.round((today.getTime() - date.getTime()) / 86400000),
  );
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 7) return `Hace ${days} días`;
  if (days < 14) return "Hace 1 semana";
  if (days < 30) return `Hace ${Math.floor(days / 7)} semanas`;
  return formatShort(value);
};

function SetupStep({ number, title, subtitle, active = false, done = false }) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-black ${
          done
            ? "bg-[#1a1a1a] text-white dark:bg-[#e2ff00] dark:text-black"
            : active
              ? "bg-[#352018] text-white dark:bg-[#e2ff00] dark:text-black"
              : "bg-[color:var(--card)] text-[color:var(--text-muted)] dark:bg-[#252525]"
        }`}
      >
        {number}
      </span>
      <div className="min-w-0">
        <h2 className="text-lg font-semibold leading-tight text-[color:var(--text)]">
          {title}
        </h2>
        <p className="mt-0.5 text-sm font-medium text-[color:var(--text-muted)]">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function BranchCard({ branch, selected, compact = false, onClick }) {
  const meta = branchMeta[normalizeBranch(branch)] || {
    title: branch,
    subtitle: "Sucursal disponible",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
        selected
          ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--accent-contrast)]"
          : "border-transparent bg-[color:var(--card)]"
      } ${compact ? "py-2.5" : "py-3.5"}`}
    >
      <span
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${
          selected
            ? "border border-current bg-transparent text-current"
            : "bg-[color:var(--bg)] text-[#352018] dark:text-[#e2ff00]"
        }`}
      >
        <MapPin className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-base font-black ${
            selected ? "text-current" : "text-[color:var(--text)]"
          }`}
        >
          {meta.title}
        </span>
        {!compact ? (
          <span
            className={`mt-0.5 block truncate text-xs font-semibold ${
              selected ? "text-current/80" : "text-[color:var(--text-muted)]"
            }`}
          >
            {meta.subtitle}
          </span>
        ) : null}
      </span>
      {selected ? (
        <CircleDot className="h-5 w-5 shrink-0 text-current" />
      ) : (
        <Circle className="h-5 w-5 shrink-0 text-[color:var(--text-muted)]" />
      )}
    </button>
  );
}

function RoutineSetupCard({ routine, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`group relative w-full border-2 bg-[#fbfaff] p-4 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#352018]/25 dark:bg-[#1b1b1b] dark:focus-visible:ring-[#e2ff00]/25 ${
        selected
          ? "border-[#352018] dark:border-[#e2ff00]"
          : "border-transparent hover:border-[#8e8e93] dark:hover:border-[#5a5a5a]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-condensed line-clamp-2 text-2xl font-bold uppercase leading-none text-[#1a1a1a] dark:text-white">
            {routine.name}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {routine.kind ? (
          <span className="font-condensed bg-[#1a1a1a] px-2 py-1 text-xs font-bold uppercase leading-none text-white">
            {routine.kind}
          </span>
        ) : null}
        {routine.optionalExerciseCount ? (
          <span className="font-condensed bg-[#1a1a1a] px-2 py-1 text-xs font-bold uppercase leading-none text-white">
            {routine.optionalExerciseCount} opcional
          </span>
        ) : null}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#e2e2e2] pt-3 dark:border-[#353535]">
        <p className="inline-flex min-w-0 items-center gap-1.5 text-xs font-semibold text-[#60443e] dark:text-[#d7d7d7]">
          <Timer className="h-3.5 w-3.5" />
          <span className="font-bold">
            {formatRelativeSessionDate(routine.lastDateRaw)}
          </span>
        </p>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold uppercase text-[#60443e] dark:text-white">
          <Dumbbell className="h-3.5 w-3.5" />
          {formatExerciseCount(routine.exerciseCount)}
        </span>
      </div>
    </button>
  );
}

const formatEntryValue = (entry = {}) => {
  const weightRaw = entry.weightKg ?? entry.weight ?? entry.kg ?? null;
  const repsRaw = entry.reps ?? null;
  const hasWeight = weightRaw !== null && weightRaw !== "";
  const hasReps = repsRaw !== null && repsRaw !== "";
  if (!hasWeight && !hasReps) return "--";
  const weightLabel = hasWeight ? `${weightRaw}kg` : "--kg";
  const repsLabel = hasReps ? repsRaw : "--";
  return `${weightLabel} x ${repsLabel}`;
};

const parseDecimal = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isNaN(parsed) ? null : parsed;
};

const normalizeSeriesType = (value) => {
  if (value === "triserie") return "triserie";
  if (value === "biserie") return "biserie";
  return "serie";
};

const normalizeMovementMode = (value) =>
  value === "unilateral" ? "unilateral" : "bilateral";

const getMovementHistoryKey = (key, movementMode = "bilateral") =>
  `${key}::${normalizeMovementMode(movementMode)}`;

const getPositionHistoryKey = (
  key,
  movementMode = "bilateral",
  order = null,
) =>
  order ? `${getMovementHistoryKey(key, movementMode)}::order-${order}` : null;

const getExerciseOrder = (exercise = {}, fallbackIndex = null) => {
  const rawOrder =
    exercise.startedOrder ??
    exercise.actualOrder ??
    exercise.order ??
    exercise.exerciseOrder;
  const parsed = Number(rawOrder);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return fallbackIndex != null ? fallbackIndex + 1 : null;
};

const getPlannedExerciseOrder = (exercise = {}, fallbackIndex = null) => {
  const rawOrder =
    exercise.plannedOrder ?? exercise.programmedOrder ?? exercise.routineOrder;
  const parsed = Number(rawOrder);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return fallbackIndex != null ? fallbackIndex + 1 : null;
};

const getExerciseSignatureId = (exercise = {}) =>
  exercise.exerciseId ||
  exercise.id ||
  slugify(exercise.exerciseName || exercise.name || "");

const getExerciseOrderSignature = (exercises = []) =>
  (Array.isArray(exercises) ? exercises : [])
    .map((exercise, index) => ({
      id: getExerciseSignatureId(exercise),
      order: getExerciseOrder(exercise, index),
      index,
    }))
    .filter((entry) => entry.id)
    .sort((a, b) => a.order - b.order || a.index - b.index)
    .map((entry) => entry.id)
    .join("|");

const getRoutineDefinitionSignature = (routine = {}) =>
  JSON.stringify({
    name: routine.name || "",
    branch: normalizeBranch(routine.branch),
    exerciseOrderMode:
      routine.exerciseOrderMode === "muscle_blocks" ? "muscle_blocks" : "free",
    exercises: (routine.exercises || []).map((exercise) => ({
      exerciseId: exercise.exerciseId || exercise.id || "",
      name: exercise.name || "",
      sets: Number(exercise.sets) || 1,
      movementMode: normalizeMovementMode(exercise.movementMode),
      isExtra: Boolean(exercise.isExtra),
      alternatives: (exercise.alternatives || []).map(
        (alternative) => alternative.exerciseId || alternative.id || "",
      ),
    })),
  });

const buildExerciseDisplayGroups = (items = [], orderMode = "free") => {
  if (orderMode === "muscle_blocks") {
    const groups = new Map();
    items.forEach((exercise) => {
      const muscle = exercise.muscle || "Sin grupo";
      if (!groups.has(muscle)) groups.set(muscle, []);
      groups.get(muscle).push(exercise);
    });
    return Array.from(groups.entries()).map(([muscle, exercises], index) => ({
      key: `muscle-${muscle}-${index}`,
      muscle,
      items: exercises,
    }));
  }

  return items.reduce((groups, exercise) => {
    const muscle = exercise.muscle || "Sin grupo";
    const current = groups[groups.length - 1];
    if (current?.muscle === muscle) {
      current.items.push(exercise);
      return groups;
    }
    groups.push({
      key: `sequence-${groups.length}-${muscle}`,
      muscle,
      items: [exercise],
    });
    return groups;
  }, []);
};

const getTrainingOrderSignature = (training = {}) =>
  training.orderSignature ||
  getExerciseOrderSignature(training.exercises || []);

const filterHistoryByOrderSignature = (trainings = [], signature = "") => {
  if (!signature) return [];
  return (trainings || []).filter(
    (training) => getTrainingOrderSignature(training) === signature,
  );
};

const getOrderContext = (plannedOrder, actualOrder, isExtra = false) => {
  if (isExtra) return "extra";
  if (!plannedOrder || !actualOrder) return "normal";
  if (actualOrder === 1) return plannedOrder === 1 ? "first" : "early";
  if (actualOrder === plannedOrder) return "normal";
  if (actualOrder < plannedOrder) return "early";
  return "fatigued";
};

const getMovementHistoryKeys = (exercise = {}) => {
  const mode = normalizeMovementMode(exercise.movementMode);
  return getExerciseKeys(exercise).map((key) =>
    getMovementHistoryKey(key, mode),
  );
};

const getPositionHistoryKeys = (exercise = {}, fallbackIndex = null) => {
  const mode = normalizeMovementMode(exercise.movementMode);
  const order = getExerciseOrder(exercise, fallbackIndex);
  if (!order) return [];
  return getExerciseKeys(exercise)
    .map((key) => getPositionHistoryKey(key, mode, order))
    .filter(Boolean);
};

const getMuscleGroupKey = (exercise = {}) =>
  slugify(
    exercise.muscleGroup ||
      exercise.muscle ||
      exercise.primaryMuscleGroup ||
      "sin-grupo",
  );

const getMuscleSequenceContext = (exercises = [], muscleGroupKey = "") => {
  if (!muscleGroupKey) return "";
  const signature = (exercises || [])
    .map((exercise, index) => ({
      exercise,
      index,
      order: getExerciseOrder(exercise, index),
    }))
    .filter(({ exercise }) => getMuscleGroupKey(exercise) === muscleGroupKey)
    .sort((a, b) => a.order - b.order || a.index - b.index)
    .map(({ exercise }) => getExerciseSignatureId(exercise))
    .filter(Boolean)
    .join("|");
  return signature ? `muscle-${muscleGroupKey}::sequence-${signature}` : "";
};

const getMuscleSequenceHistoryKeys = (exercise = {}, exercises = []) => {
  const context = getMuscleSequenceContext(
    exercises,
    getMuscleGroupKey(exercise),
  );
  if (!context) return [];
  const mode = normalizeMovementMode(exercise.movementMode);
  return getExerciseKeys(exercise).map(
    (key) => `${getMovementHistoryKey(key, mode)}::${context}`,
  );
};

const getMuscleSequenceContexts = (exercises = []) =>
  new Set(
    (exercises || [])
      .map((exercise) =>
        getMuscleSequenceContext(exercises, getMuscleGroupKey(exercise)),
      )
      .filter(Boolean),
  );

const filterHistoryByMuscleSequences = (
  trainings = [],
  currentExercises = [],
) => {
  const currentContexts = getMuscleSequenceContexts(currentExercises);
  if (!currentContexts.size) return [];
  return (trainings || []).filter((training) => {
    const trainingContexts = getMuscleSequenceContexts(
      training.exercises || [],
    );
    return [...trainingContexts].some((context) =>
      currentContexts.has(context),
    );
  });
};

const getSeriesCount = (seriesType) => {
  if (seriesType === "triserie") return 3;
  if (seriesType === "biserie") return 2;
  return 1;
};

const inferSeriesTypeFromSets = (sets = []) => {
  let maxEntries = 0;
  let foundType = null;
  (Array.isArray(sets) ? sets : []).forEach((set) => {
    if (set?.seriesType) foundType = normalizeSeriesType(set.seriesType);
    const entriesCount = Array.isArray(set?.entries) ? set.entries.length : 0;
    if (entriesCount > maxEntries) maxEntries = entriesCount;
  });
  if (maxEntries >= 3) return "triserie";
  if (maxEntries === 2) return "biserie";
  return foundType || null;
};

const normalizeEntries = ({
  entries = [],
  seriesType,
  setId,
  fallbackPrev,
  previousByIndex = [],
  compareByIndex = [],
}) => {
  const count = getSeriesCount(seriesType);
  const normalized = (Array.isArray(entries) ? entries : [])
    .filter(Boolean)
    .map((entry, idx) => {
      const prevMeta = previousByIndex[idx] || {};
      const compareMeta = compareByIndex[idx] || {};
      const hasPrevMeta =
        prevMeta &&
        (prevMeta.weight != null || prevMeta.reps != null || prevMeta.date);
      const hasCompareMeta =
        compareMeta &&
        (compareMeta.weight != null ||
          compareMeta.reps != null ||
          compareMeta.date);
      const previousWeight = hasPrevMeta
        ? (prevMeta.weight ?? null)
        : (entry.previousWeight ?? null);
      const previousReps = hasPrevMeta
        ? (prevMeta.reps ?? null)
        : (entry.previousReps ?? null);
      const previousDate = hasPrevMeta
        ? (prevMeta.date ?? null)
        : (entry.previousDate ?? null);
      const previousCompareWeight = hasCompareMeta
        ? (compareMeta.weight ?? null)
        : (entry.previousCompareWeight ?? null);
      const previousCompareReps = hasCompareMeta
        ? (compareMeta.reps ?? null)
        : (entry.previousCompareReps ?? null);
      const previousCompareDate = hasCompareMeta
        ? (compareMeta.date ?? null)
        : (entry.previousCompareDate ?? null);
      const previousText = hasPrevMeta
        ? buildPrevText(prevMeta, fallbackPrev)
        : entry.previousText || buildPrevText(prevMeta, fallbackPrev);
      return {
        id: entry.id || `${setId}-entry-${idx}`,
        previousText,
        previousWeight,
        previousReps,
        previousDate,
        previousCompareWeight,
        previousCompareReps,
        previousCompareDate,
        kg: entry.kg ?? entry.weightKg ?? entry.weight ?? "",
        reps: entry.reps ?? "",
        done: Boolean(entry.done),
        completedAt: entry.completedAt || null,
        userEdited: Boolean(entry.userEdited),
      };
    });
  while (normalized.length < count) {
    const prevMeta = previousByIndex[normalized.length] || {};
    const compareMeta = compareByIndex[normalized.length] || {};
    normalized.push({
      id: `${setId}-entry-${normalized.length}`,
      previousText: buildPrevText(
        prevMeta,
        fallbackPrev || normalized[0]?.previousText,
      ),
      previousWeight: prevMeta.weight ?? null,
      previousReps: prevMeta.reps ?? null,
      previousDate: prevMeta.date ?? null,
      previousCompareWeight: compareMeta.weight ?? null,
      previousCompareReps: compareMeta.reps ?? null,
      previousCompareDate: compareMeta.date ?? null,
      kg: "",
      reps: "",
      done: false,
      completedAt: null,
      userEdited: false,
    });
  }
  return normalized.slice(0, count);
};

const isSetDone = (set) => {
  const entries = Array.isArray(set?.entries) ? set.entries : [];
  if (!entries.length) return Boolean(set?.done);
  return entries.every((entry) => entry.done);
};

const slugify = (text) =>
  text
    ?.toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const getExerciseKeys = (exercise = {}) => {
  const keys = new Set();
  if (exercise.exerciseId) keys.add(exercise.exerciseId);
  if (exercise.id) keys.add(exercise.id);
  const name = exercise.exerciseName || exercise.name;
  const slug = slugify(name || "");
  if (slug) keys.add(slug);
  return Array.from(keys);
};

const findExerciseMeta = (library = [], exercise = {}) => {
  const name = exercise.exerciseName || exercise.name || "";
  return (
    library.find(
      (m) =>
        m.id === exercise.exerciseId ||
        m.id === exercise.id ||
        m.id === exercise.exerciseName ||
        m.name?.toLowerCase() === name.toLowerCase(),
    ) || null
  );
};

const buildVariantList = (baseExercise, library = []) => {
  const variants = [];
  const seen = new Set();
  const addVariant = (entry) => {
    if (!entry) return;
    const meta = findExerciseMeta(library, entry) || {};
    const exerciseId =
      entry.exerciseId || entry.id || meta.id || slugify(entry.name || "");
    if (!exerciseId || seen.has(exerciseId)) return;
    seen.add(exerciseId);
    variants.push({
      exerciseId,
      name: entry.name || entry.exerciseName || meta.name || "Ejercicio",
      muscle: entry.muscle || meta.muscle || "Sin grupo",
      image: entry.image || meta.image || "",
      imagePublicId: entry.imagePublicId || meta.imagePublicId || "",
      supportsUnilateral: Boolean(
        entry.supportsUnilateral ||
        entry.movementMode === "unilateral" ||
        meta.supportsUnilateral,
      ),
      movementMode: normalizeMovementMode(
        entry.movementMode || meta.movementMode,
      ),
    });
  };
  addVariant(baseExercise);
  (baseExercise?.alternatives || []).forEach(addVariant);
  return variants;
};

const findRoutineSlot = (routineExercises = [], exercise = {}) => {
  if (!Array.isArray(routineExercises) || !routineExercises.length) return null;
  const keys = getExerciseKeys(exercise);
  if (!keys.length) return null;
  const keySet = new Set(keys);
  return (
    routineExercises.find((item) =>
      getExerciseKeys(item).some((key) => keySet.has(key)),
    ) || null
  );
};

const findRoutineMovementSource = (routineExercises = [], exercise = {}) => {
  if (!Array.isArray(routineExercises) || !routineExercises.length) return null;
  const keys = getExerciseKeys(exercise);
  if (!keys.length) return null;
  const keySet = new Set(keys);
  for (const item of routineExercises) {
    if (getExerciseKeys(item).some((key) => keySet.has(key))) return item;
    const alternative = (item.alternatives || []).find((alt) =>
      getExerciseKeys(alt).some((key) => keySet.has(key)),
    );
    if (alternative) return alternative;
  }
  return null;
};

const getRoutineMovementConfig = (routineExercises = [], exercise = {}) => {
  const source = findRoutineMovementSource(routineExercises, exercise);
  if (!source) {
    return {
      supportsUnilateral: Boolean(exercise.supportsUnilateral),
      movementMode: normalizeMovementMode(exercise.movementMode),
    };
  }
  const supportsUnilateral = Boolean(
    source.supportsUnilateral ||
    source.movementMode === "unilateral" ||
    exercise.supportsUnilateral ||
    exercise.movementMode === "unilateral",
  );
  return {
    supportsUnilateral,
    movementMode: supportsUnilateral
      ? normalizeMovementMode(source.movementMode || exercise.movementMode)
      : "bilateral",
  };
};

const pickVariantIndex = (variants = [], exercise = {}) => {
  if (!variants.length) return 0;
  const byId = variants.findIndex(
    (variant) =>
      variant.exerciseId === exercise.exerciseId ||
      variant.exerciseId === exercise.id,
  );
  if (byId >= 0) return byId;
  const nameSlug = slugify(exercise.exerciseName || exercise.name || "");
  if (!nameSlug) return 0;
  const byName = variants.findIndex(
    (variant) => slugify(variant.name || "") === nameSlug,
  );
  return byName >= 0 ? byName : 0;
};

const wrapIndex = (index, length) => {
  if (!length) return 0;
  const next = index % length;
  return next < 0 ? next + length : next;
};

const hasEntryValue = (value) =>
  value !== null && value !== undefined && value !== "";

const exerciseHasInput = (exercise) =>
  (exercise?.sets || []).some((set) =>
    (set?.entries || []).length
      ? (set?.entries || []).some(
          (entry) =>
            hasEntryValue(entry?.kg) ||
            hasEntryValue(entry?.weightKg) ||
            hasEntryValue(entry?.weight) ||
            hasEntryValue(entry?.reps) ||
            entry?.done,
        )
      : hasEntryValue(set?.kg) ||
        hasEntryValue(set?.weightKg) ||
        hasEntryValue(set?.weight) ||
        hasEntryValue(set?.reps) ||
        set?.done,
  );

const exerciseHasUserInput = (exercise) =>
  (exercise?.sets || []).some((set) =>
    (set?.entries || []).length
      ? (set.entries || []).some(
          (entry) => entry.userEdited || entry.done || entry.completedAt,
        )
      : Boolean(set?.done),
  );

const setHasInput = (set) =>
  (set?.entries || []).length
    ? (set?.entries || []).some(
        (entry) =>
          hasEntryValue(entry?.kg) ||
          hasEntryValue(entry?.weightKg) ||
          hasEntryValue(entry?.weight) ||
          hasEntryValue(entry?.reps) ||
          entry?.done,
      )
    : hasEntryValue(set?.kg) ||
      hasEntryValue(set?.weightKg) ||
      hasEntryValue(set?.weight) ||
      hasEntryValue(set?.reps) ||
      set?.done;

const mergeSetsToRoutineCount = (currentSets = [], templateSets = []) => {
  if (!Array.isArray(templateSets) || !templateSets.length) {
    return currentSets;
  }
  const resized = templateSets.map((templateSet, idx) => {
    const currentSet = currentSets[idx];
    if (!currentSet) return templateSet;
    return {
      ...templateSet,
      ...currentSet,
      id: currentSet.id || templateSet.id,
      prSummary: templateSet.prSummary || currentSet.prSummary,
      entries: currentSet.entries?.length
        ? currentSet.entries
        : templateSet.entries,
    };
  });
  const extraWithData = currentSets
    .slice(templateSets.length)
    .filter(setHasInput)
    .map((set) => ({ ...set, keptFromPreviousRoutine: true }));
  return [...resized, ...extraWithData];
};

const getHistoryLookupKeys = (
  exercise = {},
  fallbackIndex = null,
  exercises = [],
) =>
  Array.from(
    new Set([
      ...getMuscleSequenceHistoryKeys(exercise, exercises),
      ...getPositionHistoryKeys(exercise, fallbackIndex),
      ...getMovementHistoryKeys(exercise),
    ]),
  );

const pickMapKey = (map, keys = []) => {
  if (!map) return null;
  return keys.find((key) => key && map.has(key)) || null;
};

const seedEntriesFromHistory = ({
  setId,
  seriesType,
  sourceEntries = [],
  sourceDate = null,
  previousByIndex = [],
  perSet = null,
  best = null,
  fallbackPrev = "Sin referencia",
}) => {
  const count = getSeriesCount(seriesType);
  return Array.from({ length: count }).map((_, idx) => {
    const previous = previousByIndex[idx] || null;
    const sourceEntry = sourceEntries[idx] || null;
    const sourceWeight = parseDecimal(
      sourceEntry?.weightKg ?? sourceEntry?.weight ?? sourceEntry?.kg,
    );
    const sourceReps = parseDecimal(sourceEntry?.reps);
    const hasSource = sourceWeight !== null || sourceReps !== null;
    const sourceMeta = hasSource
      ? { weight: sourceWeight, reps: sourceReps, date: sourceDate }
      : null;
    const weight =
      sourceWeight ??
      previous?.weight ??
      (idx === 0 ? (perSet?.weight ?? best?.weight) : "");
    const reps =
      sourceReps ??
      previous?.reps ??
      (idx === 0 ? (perSet?.reps ?? best?.reps) : "");
    return {
      id: `${setId}-entry-${idx}`,
      previousText:
        sourceEntry?.previousText ||
        buildPrevText(sourceMeta || previous, fallbackPrev),
      kg: weight ?? "",
      reps: reps ?? "",
      done: false,
    };
  });
};

const findLatestHistoryExerciseSnapshot = (
  trainings = [],
  historyKeys = [],
  movementMode = "bilateral",
  branchFilter = null,
) => {
  const targetKeys = new Set(historyKeys.filter(Boolean));
  if (!targetKeys.size) return null;
  const targetMode = normalizeMovementMode(movementMode);
  let latest = null;
  trainings.forEach((tr) => {
    if (!shouldIncludeBranch(tr, branchFilter)) return;
    const date = tr.date || tr.createdAt;
    const ts = getDateTimestamp(date);
    (tr.exercises || []).forEach((ex, exIdx) => {
      if (normalizeMovementMode(ex?.movementMode) !== targetMode) return;
      const matches = getHistoryLookupKeys(ex, exIdx, tr.exercises || []).some(
        (key) => targetKeys.has(key),
      );
      if (!matches) return;
      if (!latest || ts > latest.ts) {
        latest = { exercise: ex, date, ts };
      }
    });
  });
  return latest;
};

const getDateTimestamp = (value) => {
  if (!value) return 0;
  const normalized = value.length <= 10 ? `${value}T00:00:00` : value;
  const ts = Date.parse(normalized);
  return Number.isNaN(ts) ? 0 : ts;
};

const computeLatestSeriesTypeFromHistory = (
  trainings = [],
  routineId = null,
  branchFilter = null,
) => {
  const map = new Map();
  trainings.forEach((tr) => {
    if (routineId && tr?.routineId && tr.routineId !== routineId) return;
    if (!shouldIncludeBranch(tr, branchFilter)) return;
    const ts = getDateTimestamp(tr?.date || tr?.createdAt);
    (tr?.exercises || []).forEach((ex, exIdx) => {
      const rawType =
        ex?.seriesType ||
        ex?.sets?.[0]?.seriesType ||
        inferSeriesTypeFromSets(ex?.sets);
      if (!rawType) return;
      const type = normalizeSeriesType(rawType);
      const keys = getHistoryLookupKeys(ex, exIdx, tr.exercises || []);
      if (!keys.length) return;
      keys.forEach((key) => {
        const current = map.get(key);
        if (!current || ts > current.ts) {
          map.set(key, { type, ts });
        }
      });
    });
  });
  return map;
};

const computeLatestSetupNotesFromHistory = (
  trainings = [],
  branchFilter = null,
) => {
  const map = new Map();
  trainings.forEach((tr) => {
    if (!shouldIncludeBranch(tr, branchFilter)) return;
    const ts = getDateTimestamp(tr?.date || tr?.createdAt);
    (tr?.exercises || []).forEach((ex, exIdx) => {
      const note = String(ex?.setupNote || "").trim();
      getHistoryLookupKeys(ex, exIdx, tr.exercises || []).forEach((key) => {
        const current = map.get(key);
        if (!current || ts > current.ts) map.set(key, { note, ts });
      });
    });
  });
  return map;
};

const shouldIncludeBranch = (training, branchFilter = null) =>
  !branchFilter ||
  (training?.branch &&
    normalizeBranch(training.branch) === normalizeBranch(branchFilter));

const formatBranchLabel = (branch) => {
  if (!branch) return "Sin sucursal";
  const value = normalizeBranch(branch);
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const getRemoteBranchLabel = (branch, selectedBranch) => {
  if (!branch || !selectedBranch) return "";
  return normalizeBranch(branch) !== normalizeBranch(selectedBranch)
    ? formatBranchLabel(branch)
    : "";
};

const computeBestFromHistory = (trainings = [], branchFilter = null) => {
  const map = new Map();
  trainings.forEach((tr) => {
    if (!shouldIncludeBranch(tr, branchFilter)) return;
    const date = tr.date || tr.createdAt;
    const ts = getDateTimestamp(date) || Number.POSITIVE_INFINITY;
    const branch = tr.branch ? normalizeBranch(tr.branch) : "";
    (tr.exercises || []).forEach((ex, exIdx) => {
      const keys = getHistoryLookupKeys(ex, exIdx, tr.exercises || []);
      if (!keys.length) return;
      const sets = ex.sets || [];
      sets.forEach((s) => {
        const entries =
          Array.isArray(s.entries) && s.entries.length ? s.entries : [s];
        entries.forEach((entry) => {
          const w = Number(entry.weightKg ?? entry.weight ?? entry.kg ?? 0);
          const r = Number(entry.reps ?? 0);
          keys.forEach((key) => {
            const current = map.get(key);
            const isBetter =
              !current ||
              w > current.weight ||
              (w === current.weight && r > (current.reps ?? 0)) ||
              (w === current.weight &&
                r === (current.reps ?? 0) &&
                ts < current.ts);
            if (isBetter) {
              map.set(key, { weight: w, reps: r, date, ts, branch });
            }
          });
        });
      });
    });
  });
  return map;
};

const computeBestBySetFromHistory = (trainings = [], branchFilter = null) => {
  const map = new Map();
  trainings.forEach((tr) => {
    if (!shouldIncludeBranch(tr, branchFilter)) return;
    const date = tr.date || tr.createdAt;
    const ts = getDateTimestamp(date) || Number.POSITIVE_INFINITY;
    const branch = tr.branch ? normalizeBranch(tr.branch) : "";
    (tr.exercises || []).forEach((ex, exIdx) => {
      const keys = getHistoryLookupKeys(ex, exIdx, tr.exercises || []);
      if (!keys.length) return;
      keys.forEach((key) => {
        const arr = map.get(key) || [];
        const sets = ex.sets || [];
        sets.forEach((s, idx) => {
          const entries =
            Array.isArray(s.entries) && s.entries.length ? s.entries : [s];
          entries.forEach((entry) => {
            const w = Number(entry.weightKg ?? entry.weight ?? entry.kg ?? 0);
            const r = Number(entry.reps ?? 0);
            const current = arr[idx];
            const isBetter =
              !current ||
              w > current.weight ||
              (w === current.weight && r > (current.reps ?? 0)) ||
              (w === current.weight &&
                r === (current.reps ?? 0) &&
                ts < current.ts);
            if (isBetter) {
              arr[idx] = { weight: w, reps: r, date, ts, branch };
            }
          });
        });
        map.set(key, arr);
      });
    });
  });
  return map;
};

const computeRecentBySetFromHistory = (
  trainings = [],
  cutoffDate = null,
  branchFilter = null,
) => {
  const map = new Map();
  const cutoffTs = cutoffDate ? getDateTimestamp(cutoffDate) : null;
  trainings.forEach((tr) => {
    if (!shouldIncludeBranch(tr, branchFilter)) return;
    const date = tr.date || tr.createdAt;
    const ts = getDateTimestamp(date);
    const branch = tr.branch ? normalizeBranch(tr.branch) : "";
    if (cutoffTs && ts > cutoffTs) return;
    (tr.exercises || []).forEach((ex, exIdx) => {
      const keys = getHistoryLookupKeys(ex, exIdx, tr.exercises || []);
      if (!keys.length) return;
      keys.forEach((key) => {
        const arr = map.get(key) || [];
        const sets = ex.sets || [];
        sets.forEach((s, sIdx) => {
          const entries =
            Array.isArray(s.entries) && s.entries.length ? s.entries : [s];
          if (!arr[sIdx]) arr[sIdx] = [];
          entries.forEach((entry, entryIdx) => {
            const weightRaw =
              entry.weightKg ?? entry.weight ?? entry.kg ?? null;
            const repsRaw = entry.reps ?? null;
            const weight = parseDecimal(weightRaw);
            const reps = parseDecimal(repsRaw);
            const record = { weight, reps, date, ts, branch };
            const slot = arr[sIdx][entryIdx] || {
              latest: null,
              previous: null,
            };
            if (!slot.latest || ts > slot.latest.ts) {
              slot.previous = slot.latest;
              slot.latest = record;
            } else if (!slot.previous || ts > slot.previous.ts) {
              slot.previous = record;
            }
            arr[sIdx][entryIdx] = slot;
          });
        });
        map.set(key, arr);
      });
    });
  });
  return map;
};

function DevTrainingDateControl({ value, onChange }) {
  if (!import.meta.env.DEV) return null;

  return (
    <label
      className={`relative grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full border bg-[color:var(--card)] transition-colors hover:border-[#352018] dark:hover:border-[#d8ff00] ${
        value !== todayISO
          ? "border-[#352018] text-[#352018] dark:border-[#d8ff00] dark:text-[#d8ff00]"
          : "border-[color:var(--border)] text-[color:var(--text)]"
      }`}
      title={`Fecha de prueba: ${formatLongDate(value)}`}
      aria-label={`Cambiar fecha de prueba. Fecha actual: ${formatLongDate(value)}`}
    >
      <CalendarDays className="h-4 w-4" />
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value || todayISO)}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label="Seleccionar fecha de prueba"
      />
    </label>
  );
}

function AdminAutoFlowControl({
  enabled,
  durationSeconds,
  onToggle,
  onDurationChange,
}) {
  const durationOptions = [
    { seconds: 120, label: "2 min" },
    { seconds: 180, label: "3 min" },
    { seconds: 240, label: "4 min" },
    { seconds: 300, label: "5 min" },
  ];

  return (
    <div className="border border-[color:var(--border)] bg-[color:var(--bg)] p-3 dark:bg-[#171717]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Timer className="h-4 w-4 shrink-0 text-[#352018] dark:text-[#e2ff00]" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-[color:var(--text)]">
                Flujo automatico
              </span>
              <span className="bg-[#352018] px-1.5 py-0.5 text-[9px] font-black uppercase text-white dark:bg-[#e2ff00] dark:text-black">
                Beta
              </span>
            </div>
            <p className="text-[11px] font-semibold text-[color:var(--text-muted)]">
              Descanso y siguiente paso
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Activar flujo automatico beta"
          onClick={() => onToggle(!enabled)}
          className={`relative h-8 w-14 shrink-0 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-[#352018]/30 dark:focus:ring-[#e2ff00]/30 ${
            enabled
              ? "border-[#352018] bg-[#352018] dark:border-[#e2ff00] dark:bg-[#e2ff00]"
              : "border-[color:var(--border)] bg-[color:var(--card)] shadow-inner"
          }`}
        >
          <span
            className={`absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow-md transition-transform dark:bg-[#111] ${
              enabled ? "translate-x-6" : "translate-x-0"
            }`}
          />
        </button>
      </div>
      {enabled ? (
        <div
          className="mt-3 grid grid-cols-4 gap-1.5"
          aria-label="Duracion del descanso"
        >
          {durationOptions.map(({ seconds, label }) => (
            <button
              key={seconds}
              type="button"
              onClick={() => onDurationChange(seconds)}
              className={`h-9 rounded-md border px-1 text-xs font-black tabular-nums transition-colors ${
                durationSeconds === seconds
                  ? "border-[#352018] bg-[#352018] text-white dark:border-[#e2ff00] dark:bg-[#e2ff00] dark:text-black"
                  : "border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--text-muted)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function RegisterTraining({
  onNavigate = () => {},
  onBack = null,
  coachAthlete = null,
}) {
  const reduceMotion = useReducedMotion();
  const { user: authUser } = useAuth();
  const { profile } = useUserProfile();
  const isAdmin = authUser?.role === "Admin";
  const {
    routines,
    loading: routinesLoading,
    error: routinesError,
    reloadRoutines,
  } = useRoutines();
  const {
    exercises: libraryExercises,
    addTraining,
    updateTraining,
    addPhoto,
    trainings,
    branch: userBranch,
    locationMode,
    allowedBranches,
    setBranch,
    dataOwnerId,
  } = useTrainingData();

  const [durationSeconds, setDurationSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [timeEvents, setTimeEvents] = useState([]);
  const [activeExerciseId, setActiveExerciseId] = useState("");
  const [nowMs, setNowMs] = useState(Date.now());
  const [selectedRoutineId, setSelectedRoutineId] = useState(null);
  const [selectedRoutine, setSelectedRoutine] = useState(null);
  const [showAllRoutineOptions, setShowAllRoutineOptions] = useState(false);
  const [exercises, setExercises] = useState([]);
  const exercisesRef = useRef(exercises);
  const removedExerciseIdsRef = useRef(new Set());
  const [removedExerciseIds, setRemovedExerciseIds] = useState([]);
  exercisesRef.current = exercises;
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [isOrderingExercises, setIsOrderingExercises] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState("");
  const [expandedExerciseId, setExpandedExerciseId] = useState("");
  const [trackingExerciseId, setTrackingExerciseId] = useState("");
  const [showTracking, setShowTracking] = useState(false);
  const [historyViewScope, setHistoryViewScope] = useState("routine");
  const [sessionDate, setSessionDate] = useState(todayISO);
  const [trainingPhotoFile, setTrainingPhotoFile] = useState(null);
  const [trainingPhotoPreview, setTrainingPhotoPreview] = useState("");
  const [trainingPhotoError, setTrainingPhotoError] = useState("");
  const [finishWarningOpen, setFinishWarningOpen] = useState(false);
  const [finishWarningExercises, setFinishWarningExercises] = useState([]);
  const [completionPageOpen, setCompletionPageOpen] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [loadingTraining, setLoadingTraining] = useState(false);
  const [historyTrainings, setHistoryTrainings] = useState([]);
  const [planHistoryTrainings, setPlanHistoryTrainings] = useState([]);
  const [generalHistoryTrainings, setGeneralHistoryTrainings] = useState([]);
  const [loadingGeneralHistory, setLoadingGeneralHistory] = useState(false);
  const [generalHistoryError, setGeneralHistoryError] = useState("");
  const [generalHistoryReloadKey, setGeneralHistoryReloadKey] = useState(0);
  const [editingId, setEditingId] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isHistoryReadOnly, setIsHistoryReadOnly] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(() =>
    normalizeBranch(userBranch),
  );
  const [branchConfirmed, setBranchConfirmed] = useState(false);
  const [setupStarted, setSetupStarted] = useState(false);
  const [trainingPlans, setTrainingPlans] = useState([]);
  const [activeTrainingPlan, setActiveTrainingPlan] = useState(null);
  const [trainingPlanLoading, setTrainingPlanLoading] = useState(true);
  const [trainingPlanError, setTrainingPlanError] = useState("");
  const [selectedPlanWeek, setSelectedPlanWeek] = useState(0);
  const [advancingPlanCycle, setAdvancingPlanCycle] = useState(false);
  const [pendingPlanRoutineId, setPendingPlanRoutineId] = useState("");
  const [selectedPlanContext, setSelectedPlanContext] = useState(null);
  const [pendingSameDayTraining, setPendingSameDayTraining] = useState(null);
  const [sessionMenuOpen, setSessionMenuOpen] = useState(false);
  const [desktopSessionMenuOpen, setDesktopSessionMenuOpen] = useState(false);
  const initializedTrainingScreen = useRef(false);
  const routineLoadRequestRef = useRef(0);
  const loadedHistoryRoutineRef = useRef("");
  const lastUpdateRef = useRef(Date.now());
  const timerRef = useRef(null);
  const datePickerRef = useRef(null);
  const restTimerRef = useRef(null);
  const exerciseFocusTimerRef = useRef(null);
  const completionFocusTimerRef = useRef(null);
  const completionAnnouncedRef = useRef(false);
  const resumedAfterCompletionRef = useRef(false);
  const restEventOpenRef = useRef(false);
  const [restTimerOpen, setRestTimerOpen] = useState(false);
  const [restTimerMinimized, setRestTimerMinimized] = useState(true);
  const [restMinutesInput, setRestMinutesInput] = useState(2);
  const [restDurationSeconds, setRestDurationSeconds] = useState(120);
  const [restRemainingSeconds, setRestRemainingSeconds] = useState(120);
  const [restTimerRunning, setRestTimerRunning] = useState(false);
  const [restTimerStarted, setRestTimerStarted] = useState(false);
  const [restDeadlineMs, setRestDeadlineMs] = useState(null);
  const [autoFlowEnabled, setAutoFlowEnabled] = useState(false);
  const [autoFlowTarget, setAutoFlowTarget] = useState(null);
  const [autoFlowPrompt, setAutoFlowPrompt] = useState(null);
  const restVibratedRef = useRef(false);
  const autoFlowEnabledRef = useRef(false);
  const autoFlowTargetRef = useRef(null);
  const autoFlowPromptRef = useRef(null);
  const completeAutoFlowRef = useRef(null);
  autoFlowEnabledRef.current = isAdmin && autoFlowEnabled;
  autoFlowTargetRef.current = autoFlowTarget;
  autoFlowPromptRef.current = autoFlowPrompt;

  const updateAutoFlowTarget = (target) => {
    autoFlowTargetRef.current = target;
    setAutoFlowTarget(target);
  };
  const updateAutoFlowPrompt = (prompt) => {
    autoFlowPromptRef.current = prompt;
    setAutoFlowPrompt(prompt);
  };
  const loadTrainingByIdRef = useRef(null);
  const loadHistoryForRoutineRef = useRef(null);
  const mergeRoutineIntoActiveExercisesRef = useRef(null);
  const applyHistoryToExercisesRef = useRef(null);
  const buildExercisesForRoutineRef = useRef(null);
  const notifyRestCompleteRef = useRef(null);
  const restAudioContextRef = useRef(null);
  const startSetupSessionRef = useRef(null);
  const resetStateRef = useRef(null);
  const desktopSessionMenuRef = useRef(null);
  const finalizingRef = useRef(false);
  const trainingRequestIdRef = useRef("");

  useEffect(() => {
    if (!desktopSessionMenuOpen) return undefined;
    const closeMenu = (event) => {
      if (event.type === "keydown" && event.key !== "Escape") {
        return;
      }
      if (
        event.type === "pointerdown" &&
        desktopSessionMenuRef.current?.contains(event.target)
      ) {
        return;
      }
      setDesktopSessionMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeMenu);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeMenu);
    };
  }, [desktopSessionMenuOpen]);

  const locationDisabled = locationMode === "disabled";
  const requiresBranchSelection = locationMode === "multiple";
  const branchReady = !requiresBranchSelection || branchConfirmed;
  const effectiveBranch = locationDisabled
    ? ""
    : setupStarted || isEditing || requiresBranchSelection
      ? selectedBranch
      : normalizeBranch(userBranch);
  const historyBranchFilter = requiresBranchSelection
    ? effectiveBranch || null
    : null;

  const handleDevTrainingDateChange = (nextDate) => {
    const normalizedDate = nextDate.slice(0, 10);
    setSessionDate(normalizedDate);
    setSelectedPlanWeek(getCurrentPlanWeek(activeTrainingPlan, normalizedDate));
    setPendingSameDayTraining(null);
    toast.success(`Fecha de prueba: ${formatLongDate(normalizedDate)}`);
  };

  const loadActiveTrainingPlan = useCallback(async () => {
    setTrainingPlanLoading(true);
    setTrainingPlanError("");
    try {
      const plans = await api.getTrainingPlans(dataOwnerId || "");
      setTrainingPlans(plans || []);
      const active =
        (plans || []).find((plan) => plan.status === "active") || null;
      setActiveTrainingPlan(active);
      setSelectedPlanWeek(getCurrentPlanWeek(active, sessionDate));
    } catch (error) {
      setTrainingPlans([]);
      setActiveTrainingPlan(null);
      setTrainingPlanError(
        error.message || "No se pudo cargar la planificación",
      );
    } finally {
      setTrainingPlanLoading(false);
    }
  }, [dataOwnerId, sessionDate]);

  useEffect(() => {
    loadActiveTrainingPlan();
  }, [loadActiveTrainingPlan]);

  const branchOptions = useMemo(() => {
    const configured = (allowedBranches || []).filter((branch) =>
      BRANCH_OPTIONS.includes(branch),
    );
    return configured.length ? configured : BRANCH_OPTIONS;
  }, [allowedBranches]);

  const latestRoutineDates = useMemo(() => {
    const map = new Map();
    (trainings || []).forEach((tr) => {
      const routineId = tr?.routineId;
      if (!routineId) return;
      const ts = getDateTimestamp(tr.date || tr.createdAt);
      if (!ts) return;
      const current = map.get(routineId);
      if (!current || ts > current.ts) {
        map.set(routineId, { date: tr.date || tr.createdAt, ts });
      }
    });
    return map;
  }, [trainings]);

  const toRoutineOption = useCallback(
    (r) => {
      const primaryExercises = (r.exercises || []).filter(
        (exercise) => !exercise.isExtra,
      );
      const optionalExercises = (r.exercises || []).filter(
        (exercise) => exercise.isExtra,
      );
      return {
        id: r.id,
        name: r.name,
        location: normalizeBranch(r.branch),
        progressScopeId: r.progressScopeId || "",
        progressMode: r.progressMode || "fresh",
        sourceRoutineId: r.sourceRoutineId || null,
        exerciseCount: primaryExercises.length,
        optionalExerciseCount: optionalExercises.length,
        estimatedDuration:
          Number(r.estimatedDuration || r.durationMinutes || r.duration) ||
          Math.max(20, primaryExercises.length * 7),
        kind:
          r.assignmentType === "plan"
            ? "Plan semanal"
            : r.assignmentType === "extra"
              ? "Sesión extra"
              : "Rutina personal",
        lastDateRaw: latestRoutineDates.get(r.id)?.date || "",
        lastDate: latestRoutineDates.get(r.id)?.date
          ? formatShort(latestRoutineDates.get(r.id).date)
          : "",
        raw: r,
      };
    },
    [latestRoutineDates],
  );

  const allRoutineOptions = useMemo(
    () =>
      (routines || [])
        .filter((r) => r.isAvailableForTraining !== false)
        .map((r) => toRoutineOption(r)),
    [routines, toRoutineOption],
  );

  const routineOptions = useMemo(() => {
    const filtered =
      (routines || []).filter(
        (r) =>
          r.isAvailableForTraining !== false &&
          (effectiveBranch
            ? [effectiveBranch, "general"].includes(normalizeBranch(r.branch))
            : true),
      ) || [];
    return filtered.map((r) => toRoutineOption(r));
  }, [routines, effectiveBranch, toRoutineOption]);
  const visibleRoutineOptions = useMemo(() => {
    if (showAllRoutineOptions || routineOptions.length <= 3) {
      return routineOptions;
    }
    const initial = routineOptions.slice(0, 3);
    const selected = routineOptions.find(
      (routine) => routine.id === selectedRoutineId,
    );
    if (selected && !initial.some((routine) => routine.id === selected.id)) {
      return [selected, ...initial.slice(0, 2)];
    }
    return initial;
  }, [routineOptions, selectedRoutineId, showAllRoutineOptions]);

  const currentBranch =
    effectiveBranch || (locationDisabled ? "" : selectedRoutine?.location);
  const selectedProgressScopeId =
    selectedRoutine?.progressScopeId ||
    selectedRoutine?.raw?.progressScopeId ||
    "";
  const resolveHistoryPlanId = useCallback(
    (routine, planContext = null) => {
      const explicitPlanId = String(planContext?.planId || "");
      if (explicitPlanId) return explicitPlanId;
      const assignedPlanId = String(routine?.raw?.trainingPlanId || "");
      if (assignedPlanId) return assignedPlanId;
      const routineId = String(routine?.id || routine?.raw?._id || "");
      const belongsToActivePlan = (
        activeTrainingPlan?.weeklySchedule || []
      ).some((day) => String(day.routineId || "") === routineId);
      return belongsToActivePlan
        ? String(activeTrainingPlan?._id || activeTrainingPlan?.id || "")
        : "";
    },
    [activeTrainingPlan],
  );
  const selectedHistoryPlanId = resolveHistoryPlanId(
    selectedRoutine,
    selectedPlanContext,
  );
  const selectedHistoryPlan = useMemo(
    () =>
      trainingPlans.find(
        (plan) => String(plan?._id || plan?.id || "") === selectedHistoryPlanId,
      ) || null,
    [selectedHistoryPlanId, trainingPlans],
  );
  const selectedHistoryPlanName =
    selectedHistoryPlan?.name || "el plan seleccionado";
  const libraryExerciseOptions = useMemo(() => {
    const seen = new Set();
    return (libraryExercises || [])
      .filter((ex) => {
        if (seen.has(ex.id)) return false;
        seen.add(ex.id);
        return true;
      })
      .filter((ex) => {
        if (!currentBranch) return true;
        const branches = ex.branches || [];
        return branches.includes(currentBranch) || branches.includes("general");
      })
      .map((ex) => ({
        id: ex.id,
        name: ex.name,
        muscle: ex.muscle || ex.muscleGroup || "Sin grupo",
        image: ex.image || "",
        imagePublicId: ex.imagePublicId || "",
        supportsUnilateral: Boolean(ex.supportsUnilateral),
        branches: ex.branches || [],
      }));
  }, [libraryExercises, currentBranch]);
  const muscleGroupOptions = useMemo(() => {
    const set = new Set();
    libraryExerciseOptions.forEach((ex) => {
      if (ex.muscle) set.add(ex.muscle);
    });
    return Array.from(set);
  }, [libraryExerciseOptions]);
  const filteredLibraryExercises = useMemo(() => {
    const search = exerciseSearch.trim().toLowerCase();
    return libraryExerciseOptions.filter(
      (ex) =>
        (!selectedMuscleGroup || ex.muscle === selectedMuscleGroup) &&
        (!search || ex.name.toLowerCase().includes(search)),
    );
  }, [libraryExerciseOptions, exerciseSearch, selectedMuscleGroup]);
  const sessionLocked =
    setupStarted &&
    (hasStarted ||
      isRunning ||
      durationSeconds > 0 ||
      exercises.some(exerciseHasUserInput));

  const activeOrderExercises = useMemo(
    () =>
      exercises.length
        ? exercises
        : (
            selectedRoutine?.raw?.exercises ||
            selectedRoutine?.exercises ||
            []
          ).filter((exercise) => !exercise.isExtra),
    [exercises, selectedRoutine],
  );
  const orderMatchedHistoryTrainings = useMemo(
    () =>
      filterHistoryByMuscleSequences(historyTrainings, activeOrderExercises),
    [historyTrainings, activeOrderExercises],
  );
  const referenceHistoryTrainings = useMemo(() => {
    const unique = new Map();
    [...historyTrainings, ...planHistoryTrainings].forEach((training) => {
      const key = String(
        training?._id ||
          `${training?.date || ""}:${training?.routineId || ""}:${training?.trainingPlanSlotId || ""}`,
      );
      unique.set(key, training);
    });
    return Array.from(unique.values());
  }, [historyTrainings, planHistoryTrainings]);
  const historyCompatibleRecentBySet = useMemo(
    () =>
      computeCompatibleRecentBySet(referenceHistoryTrainings, {
        branch: historyBranchFilter || "",
      }),
    [referenceHistoryTrainings, historyBranchFilter],
  );
  const historyBest = useMemo(
    () =>
      computeBestFromHistory(orderMatchedHistoryTrainings, historyBranchFilter),
    [orderMatchedHistoryTrainings, historyBranchFilter],
  );
  const historyGlobalBest = useMemo(
    () => computeBestFromHistory(historyTrainings),
    [historyTrainings],
  );
  const historyBestBySet = useMemo(
    () =>
      computeBestBySetFromHistory(
        orderMatchedHistoryTrainings,
        historyBranchFilter,
      ),
    [orderMatchedHistoryTrainings, historyBranchFilter],
  );
  const historyRecentBySet = useMemo(
    () =>
      computeRecentBySetFromHistory(
        orderMatchedHistoryTrainings,
        historyBranchFilter,
      ),
    [orderMatchedHistoryTrainings, historyBranchFilter],
  );
  const historySeriesTypeMap = useMemo(
    () =>
      computeLatestSeriesTypeFromHistory(
        orderMatchedHistoryTrainings,
        selectedRoutineId,
        historyBranchFilter,
      ),
    [orderMatchedHistoryTrainings, selectedRoutineId, historyBranchFilter],
  );
  const historySetupNotes = useMemo(
    () =>
      computeLatestSetupNotesFromHistory(
        orderMatchedHistoryTrainings,
        historyBranchFilter,
      ),
    [orderMatchedHistoryTrainings, historyBranchFilter],
  );

  const timingSummary = useMemo(
    () => calculateTimingSummary(timeEvents, nowMs),
    [timeEvents, nowMs],
  );

  useEffect(() => {
    setDurationSeconds(timingSummary.durationSeconds);
    setActiveExerciseId(timingSummary.activeExerciseId);
  }, [timingSummary]);

  useEffect(() => {
    if (!showExercisePicker) return;
    setExerciseSearch("");
    if (!muscleGroupOptions.length) {
      if (selectedMuscleGroup) setSelectedMuscleGroup("");
      return;
    }
    if (
      !selectedMuscleGroup ||
      !muscleGroupOptions.includes(selectedMuscleGroup)
    ) {
      setSelectedMuscleGroup(muscleGroupOptions[0]);
    }
  }, [showExercisePicker, muscleGroupOptions, selectedMuscleGroup]);

  useEffect(() => {
    if (!trainingPhotoFile) {
      setTrainingPhotoPreview("");
      return;
    }
    const previewUrl = URL.createObjectURL(trainingPhotoFile);
    setTrainingPhotoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [trainingPhotoFile]);

  const buildExercisesForRoutine = (
    routine,
    training,
    bestMap = historyBest,
    bestBySetMap = historyBestBySet,
    recentBySetMap = historyRecentBySet,
    seriesTypeMap = historySeriesTypeMap,
    includeExtras = false,
    compatibleRecentBySetMap = historyCompatibleRecentBySet,
  ) => {
    const trainingList =
      training?.exercises?.length &&
      training.exercises.map((ex) => ({
        exerciseId: ex.exerciseId,
        name: ex.exerciseName,
        muscle: ex.muscleGroup,
        order: ex.order,
        plannedOrder: ex.plannedOrder,
        actualOrder: ex.actualOrder ?? ex.order,
        orderContext: ex.orderContext,
        sets: ex.sets?.length || 3,
        movementMode: normalizeMovementMode(ex.movementMode),
      }));
    const routineList = (routine?.exercises || []).length
      ? routine.exercises
      : (training?.exercises || []).map((ex) => ({
          exerciseId: ex.exerciseId,
          name: ex.exerciseName,
          muscle: ex.muscleGroup,
          order: ex.order,
          plannedOrder: ex.plannedOrder,
          actualOrder: ex.actualOrder ?? ex.order,
          orderContext: ex.orderContext,
          sets: ex.sets?.length || 3,
          movementMode: normalizeMovementMode(ex.movementMode),
        }));
    const list = trainingList?.length
      ? trainingList
      : includeExtras
        ? routineList
        : routineList.filter((ex) => !ex.isExtra);
    const trainingById = new Map();
    const trainingByPosition = new Map();
    (training?.exercises || []).forEach((ex, exIdx) => {
      getPositionHistoryKeys(ex, exIdx).forEach((key) => {
        trainingByPosition.set(key, ex);
      });
      getExerciseKeys(ex).forEach((key) => {
        trainingById.set(key, ex);
      });
    });

    const safeSeriesTypeMap = seriesTypeMap || new Map();
    return list.map((ex, idx) => {
      const meta = findExerciseMeta(libraryExercises, ex) || {};
      const routineExercises = routine?.exercises || routineList;
      const routineSlot =
        findRoutineSlot(routineExercises, ex) || routineExercises[idx] || ex;
      const variants = buildVariantList(routineSlot, libraryExercises);
      const currentCandidate = {
        exerciseId:
          ex.exerciseId || ex.id || meta.id || slugify(ex.name || `ex-${idx}`),
        name: ex.name || meta.name || ex.exerciseName || "Ejercicio",
        muscle: ex.muscle || ex.muscleGroup || meta.muscle || "Sin grupo",
        image: ex.image || meta.image || "",
        imagePublicId: ex.imagePublicId || meta.imagePublicId || "",
        supportsUnilateral: Boolean(
          ex.supportsUnilateral ||
          routineSlot?.supportsUnilateral ||
          meta.supportsUnilateral,
        ),
      };
      const hasCurrent = variants.some(
        (variant) => variant.exerciseId === currentCandidate.exerciseId,
      );
      if (!hasCurrent && currentCandidate.exerciseId)
        variants.push(currentCandidate);
      const variantIndex = pickVariantIndex(variants, ex);
      const activeVariant =
        variants[variantIndex] || variants[0] || currentCandidate;
      const id =
        activeVariant?.exerciseId ||
        ex.exerciseId ||
        ex.id ||
        slugify(ex.name || `ex-${idx}`);
      const nameKey = slugify(
        activeVariant?.name ||
          ex.name ||
          meta.name ||
          ex.exerciseName ||
          ex.exerciseId ||
          "",
      );
      const setsCount = Number(ex.sets) || 3;
      const currentOrder = getExerciseOrder(ex, idx);
      const plannedOrder = getPlannedExerciseOrder(
        ex.plannedOrder ? ex : routineSlot,
        idx,
      );
      const trainingPositionKeys = [id, nameKey]
        .filter(Boolean)
        .map((key) =>
          getPositionHistoryKey(
            key,
            normalizeMovementMode(ex.movementMode || routineSlot?.movementMode),
            currentOrder,
          ),
        )
        .filter(Boolean);
      const trainingEx =
        trainingPositionKeys
          .map((key) => trainingByPosition.get(key))
          .find(Boolean) ||
        trainingById.get(id) ||
        (nameKey ? trainingById.get(nameKey) : null);
      const supportsUnilateral = Boolean(
        routineSlot?.supportsUnilateral ||
        routineSlot?.movementMode === "unilateral" ||
        ex.supportsUnilateral ||
        ex.movementMode === "unilateral" ||
        activeVariant?.supportsUnilateral ||
        meta.supportsUnilateral,
      );
      const movementMode = supportsUnilateral
        ? normalizeMovementMode(
            trainingEx?.movementMode ||
              ex.movementMode ||
              routineSlot?.movementMode,
          )
        : "bilateral";
      const catalogWeightConfig = inferWeightConfig({
        ...meta,
        ...routineSlot,
        ...ex,
        name: activeVariant?.name || ex.name || meta.name,
        movementMode: "bilateral",
        equipment: meta.equipment || ex.equipment || [],
      });
      const savedWeightConfig = trainingEx
        ? {
            weightBasis: normalizeWeightBasis(trainingEx.weightBasis, "legacy"),
            barWeightKg: Math.max(0, Number(trainingEx.barWeightKg || 0)),
            implementCount: Math.max(1, Number(trainingEx.implementCount || 1)),
          }
        : catalogWeightConfig;
      const weightConfig = {
        ...savedWeightConfig,
        implementCount:
          !trainingEx &&
          movementMode === "unilateral" &&
          savedWeightConfig.weightBasis === "per_implement"
            ? 1
            : savedWeightConfig.implementCount,
      };
      const baseHistoryKeys = [id, nameKey]
        .filter(Boolean)
        .map((key) => getMovementHistoryKey(key, movementMode));
      const muscleSequenceHistoryKeys = getMuscleSequenceHistoryKeys(
        {
          ...ex,
          exerciseId: id,
          name: activeVariant?.name || ex.name,
          muscleGroup:
            ex.muscleGroup || ex.muscle || meta.muscle || "Sin grupo",
          movementMode,
        },
        list,
      );
      const localHistoryKeys = muscleSequenceHistoryKeys.length
        ? muscleSequenceHistoryKeys
        : baseHistoryKeys;
      const historySeriesType =
        safeSeriesTypeMap.get(localHistoryKeys[0]) ||
        localHistoryKeys.map((key) => safeSeriesTypeMap.get(key)).find(Boolean);
      const inferredSeriesType = trainingEx
        ? inferSeriesTypeFromSets(trainingEx.sets)
        : null;
      const seriesType = normalizeSeriesType(
        trainingEx?.seriesType ||
          trainingEx?.sets?.[0]?.seriesType ||
          (inferredSeriesType && inferredSeriesType !== "serie"
            ? inferredSeriesType
            : null) ||
          historySeriesType?.type ||
          inferredSeriesType ||
          ex.seriesType,
      );
      const best =
        localHistoryKeys.map((key) => bestMap.get(key)).find(Boolean) || null;
      const globalBest =
        baseHistoryKeys
          .map((key) => historyGlobalBest.get(key))
          .find(Boolean) || null;
      const bestBySet =
        localHistoryKeys.map((key) => bestBySetMap.get(key)).find(Boolean) ||
        [];
      const recentBySet =
        localHistoryKeys.map((key) => recentBySetMap.get(key)).find(Boolean) ||
        [];
      const compatibleHistoryKeys = getCompatibleExerciseHistoryKeys({
        exerciseId: id,
        name: activeVariant?.name || ex.name,
        movementMode,
        ...weightConfig,
      });
      const compatibleRecentBySet =
        compatibleHistoryKeys
          .map((key) => compatibleRecentBySetMap.get(key))
          .find(Boolean) || recentBySet;
      const latestReference = getLatestCompatibleReference(
        compatibleRecentBySet,
      );
      const currentRoutineId = String(routine?._id || routine?.id || "");
      const referenceSourceText = latestReference
        ? latestReference.routineId &&
          String(latestReference.routineId) !== currentRoutineId
          ? `Plan · ${latestReference.routineName || "otra rutina"}`
          : "Esta rutina"
        : "";
      const setupNoteEntry = localHistoryKeys
        .map((key) => historySetupNotes.get(key))
        .find(Boolean);
      const prSummary = best ? formatHistoryLift(best) : "";
      const sets =
        (trainingEx?.sets || []).length > 0
          ? (trainingEx.sets || []).map((s, sIdx) => {
              const setId = s.id || `${id}-set-${sIdx}`;
              const perSet = bestBySet[sIdx];
              const perSetSummary = perSet
                ? formatHistoryLift(perSet)
                : s.prSummary || "";
              const fallbackPrev = `${s.weightKg ?? "--"}kg x ${
                s.reps ?? "--"
              } | ${formatShort(training?.date)}`;
              const recentEntries = compatibleRecentBySet[sIdx] || [];
              const previousByIndex = recentEntries.map((slot) => slot?.latest);
              const compareByIndex = recentEntries.map(
                (slot) => slot?.previous,
              );
              const seedEntries = Array.isArray(s.entries)
                ? s.entries
                : [
                    {
                      id: s.id,
                      previousText: fallbackPrev,
                      kg: s.weightKg ?? "",
                      reps: s.reps ?? "",
                      done: Boolean(s.done),
                    },
                  ];
              return {
                id: setId,
                prSummary: perSetSummary,
                prBranchLabel: perSet
                  ? getRemoteBranchLabel(perSet.branch, effectiveBranch)
                  : s.prBranchLabel || "",
                entries: normalizeEntries({
                  entries: seedEntries,
                  seriesType,
                  setId,
                  fallbackPrev: buildPrevText(previousByIndex[0], fallbackPrev),
                  previousByIndex,
                  compareByIndex,
                }),
              };
            })
          : Array.from({ length: setsCount }).map((_, sIdx) => {
              const setId = `${id}-set-${sIdx}`;
              const perSet = bestBySet[sIdx];
              const perSetSummary = perSet ? formatHistoryLift(perSet) : "";
              const recentEntries = compatibleRecentBySet[sIdx] || [];
              const previousByIndex = recentEntries.map((slot) => slot?.latest);
              const compareByIndex = recentEntries.map(
                (slot) => slot?.previous,
              );
              const fallbackPrev = perSet
                ? formatHistoryLift(perSet)
                : best
                  ? formatHistoryLift(best)
                  : "Sin referencia";
              const defaultKg =
                seriesType === "serie"
                  ? (previousByIndex[0]?.weight ??
                    perSet?.weight ??
                    best?.weight ??
                    "")
                  : "";
              const defaultReps =
                seriesType === "serie"
                  ? (previousByIndex[0]?.reps ??
                    perSet?.reps ??
                    best?.reps ??
                    "")
                  : "";
              return {
                id: setId,
                prSummary: perSetSummary,
                prBranchLabel: perSet
                  ? getRemoteBranchLabel(perSet.branch, effectiveBranch)
                  : "",
                entries: normalizeEntries({
                  entries: [
                    {
                      previousText: buildPrevText(
                        previousByIndex[0],
                        fallbackPrev,
                      ),
                      kg: defaultKg,
                      reps: defaultReps,
                      done: false,
                    },
                  ],
                  seriesType,
                  setId,
                  fallbackPrev: buildPrevText(previousByIndex[0], fallbackPrev),
                  previousByIndex,
                  compareByIndex,
                }),
              };
            });
      const headerText = best
        ? `Aquí: ${best.weight}kg x ${best.reps} | ${formatShort(best.date)}`
        : "Sin referencia aquí";
      const globalPrText =
        globalBest &&
        (!best ||
          globalBest.weight > best.weight ||
          (globalBest.weight === best.weight &&
            globalBest.reps > (best.reps ?? 0)) ||
          normalizeBranch(globalBest.branch) !==
            normalizeBranch(effectiveBranch))
          ? `Mejor global: ${globalBest.weight}kg x ${globalBest.reps}${
              locationDisabled
                ? ""
                : ` · ${formatBranchLabel(globalBest.branch)}`
            }`
          : "";
      return {
        id,
        name: activeVariant?.name || ex.name || meta.name || "Ejercicio",
        order: currentOrder,
        plannedOrder,
        actualOrder: currentOrder,
        orderContext: getOrderContext(
          plannedOrder,
          currentOrder,
          Boolean(ex.isExtra ?? routineSlot?.isExtra),
        ),
        prText: headerText,
        globalPrText,
        referenceSourceText,
        image: activeVariant?.image || ex.image || meta.image || "",
        imagePublicId:
          activeVariant?.imagePublicId ||
          ex.imagePublicId ||
          meta.imagePublicId ||
          "",
        muscle:
          activeVariant?.muscle ||
          ex.muscle ||
          ex.muscleGroup ||
          meta.muscle ||
          meta.muscleGroup ||
          "Sin grupo",
        primaryMuscleGroup:
          trainingEx?.primaryMuscleGroup ||
          meta.primaryMuscleGroup ||
          ex.muscleGroup ||
          ex.muscle ||
          "",
        primaryMuscles: trainingEx?.primaryMuscles || meta.primaryMuscles || [],
        secondaryMuscles:
          trainingEx?.secondaryMuscles || meta.secondaryMuscles || [],
        stabilizerMuscles:
          trainingEx?.stabilizerMuscles || meta.stabilizerMuscles || [],
        equipment: trainingEx?.equipment || meta.equipment || [],
        loadType: trainingEx?.loadType || meta.loadType || "",
        ...weightConfig,
        bilateralImplementCount: Math.max(
          1,
          Number(catalogWeightConfig.implementCount || 1),
        ),
        isExtra: Boolean(ex.isExtra ?? routineSlot?.isExtra),
        supportsUnilateral,
        movementMode,
        seriesType,
        setupNote:
          trainingEx?.setupNote ?? setupNoteEntry?.note ?? ex.setupNote ?? "",
        prSummary,
        prWeight: best?.weight ?? null,
        variants,
        variantIndex,
        sets,
      };
    });
  };

  const applyHistoryToExercises = (
    list,
    bestMap = historyBest,
    bestBySetMap = historyBestBySet,
    recentBySetMap = historyRecentBySet,
    seriesTypeMap = historySeriesTypeMap,
    sourceHistory = orderMatchedHistoryTrainings,
    compatibleRecentBySetMap = historyCompatibleRecentBySet,
  ) =>
    (list || []).map((ex, idx) => {
      const id = ex.id || ex.exerciseId || slugify(ex.name || `ex-${idx}`);
      const keys = getExerciseKeys({
        ...ex,
        id,
        exerciseId: ex.exerciseId || ex.id,
      });
      const movementMode = normalizeMovementMode(ex.movementMode);
      const currentOrder = getExerciseOrder(ex, idx);
      const baseHistoryKeys = keys.map((key) =>
        getMovementHistoryKey(key, movementMode),
      );
      const muscleSequenceHistoryKeys = getMuscleSequenceHistoryKeys(
        { ...ex, id, exerciseId: ex.exerciseId || ex.id, movementMode },
        list,
      );
      const localHistoryKeys = muscleSequenceHistoryKeys.length
        ? muscleSequenceHistoryKeys
        : baseHistoryKeys;
      const findLocalKey = (map) =>
        localHistoryKeys.find((key) => map.has(key));
      const findGlobalKey = (map) =>
        baseHistoryKeys.find((key) => map.has(key));
      const bestKey = findLocalKey(bestMap);
      const globalBestKey = findGlobalKey(historyGlobalBest);
      const bestBySetKey = findLocalKey(bestBySetMap);
      const recentBySetKey = findLocalKey(recentBySetMap);
      const best = bestMap.get(bestKey);
      const globalBest = historyGlobalBest.get(globalBestKey);
      const bestBySet = bestBySetMap.get(bestBySetKey) || [];
      const compatibleHistoryKey = getCompatibleExerciseHistoryKeys(ex).find(
        (key) => compatibleRecentBySetMap.has(key),
      );
      const recentBySet =
        compatibleRecentBySetMap.get(compatibleHistoryKey) ||
        recentBySetMap.get(recentBySetKey) ||
        [];
      const latestReference = getLatestCompatibleReference(recentBySet);
      const referenceSourceText = latestReference
        ? latestReference.routineId &&
          String(latestReference.routineId) !== String(selectedRoutineId || "")
          ? `Plan · ${latestReference.routineName || "otra rutina"}`
          : "Esta rutina"
        : ex.referenceSourceText || "";
      const seriesTypeEntry = localHistoryKeys
        .map((key) => seriesTypeMap?.get(key))
        .find(Boolean);
      const setupNoteEntry = localHistoryKeys
        .map((key) => historySetupNotes.get(key))
        .find(Boolean);
      const historySeriesType = seriesTypeEntry?.type || null;
      const inferredSeriesType = inferSeriesTypeFromSets(ex.sets);
      const shouldReloadInputs = Boolean(ex.reloadMovementHistory);
      const latestHistory = shouldReloadInputs
        ? findLatestHistoryExerciseSnapshot(
            sourceHistory,
            localHistoryKeys,
            movementMode,
            historyBranchFilter,
          )
        : null;
      const latestExercise = latestHistory?.exercise || null;
      const latestSeriesType =
        latestExercise?.seriesType ||
        latestExercise?.sets?.[0]?.seriesType ||
        inferSeriesTypeFromSets(latestExercise?.sets);
      const seriesType = normalizeSeriesType(
        shouldReloadInputs
          ? latestSeriesType ||
              historySeriesType ||
              ex.seriesType ||
              inferredSeriesType
          : ex.seriesType ||
              (inferredSeriesType && inferredSeriesType !== "serie"
                ? inferredSeriesType
                : null) ||
              historySeriesType ||
              inferredSeriesType,
      );
      const prSummary = best
        ? formatHistoryLift(best)
        : shouldReloadInputs
          ? ""
          : ex.prSummary || "";
      const prText = best
        ? `Aquí: ${best.weight}kg x ${best.reps} | ${formatShort(best.date)}`
        : !shouldReloadInputs && ex.prText?.startsWith("Aquí:")
          ? ex.prText
          : "Sin referencia aquí";
      const globalPrText =
        globalBest &&
        (!best ||
          globalBest.weight > best.weight ||
          (globalBest.weight === best.weight &&
            globalBest.reps > (best.reps ?? 0)) ||
          normalizeBranch(globalBest.branch) !==
            normalizeBranch(effectiveBranch))
          ? `Mejor global: ${globalBest.weight}kg x ${globalBest.reps}${
              locationDisabled
                ? ""
                : ` · ${formatBranchLabel(globalBest.branch)}`
            }`
          : ex.globalPrText || "";
      const sourceSets =
        shouldReloadInputs && latestExercise?.sets?.length
          ? latestExercise.sets
          : ex.sets || [];
      const sets = sourceSets.map((set, sIdx) => {
        const setId = `${id}-${movementMode}-set-${sIdx}`;
        const perSet = bestBySet[sIdx];
        const perSetSummary = perSet
          ? formatHistoryLift(perSet)
          : shouldReloadInputs
            ? ""
            : set.prSummary || "";
        const recentEntries =
          shouldReloadInputs && !latestExercise ? [] : recentBySet[sIdx] || [];
        const previousByIndex = recentEntries.map((slot) => slot?.latest);
        const compareByIndex = recentEntries.map((slot) => slot?.previous);
        const fallbackPrev = perSet
          ? formatHistoryLift(perSet)
          : best
            ? formatHistoryLift(best)
            : "Sin referencia";
        const sourceEntries =
          shouldReloadInputs && !latestExercise
            ? []
            : Array.isArray(set.entries)
              ? set.entries
              : set.entries && typeof set.entries === "object"
                ? [set.entries]
                : set.weightKg != null || set.reps != null
                  ? [set]
                  : [];
        const seedEntries = shouldReloadInputs
          ? seedEntriesFromHistory({
              setId,
              seriesType,
              sourceEntries,
              sourceDate: latestHistory?.date,
              previousByIndex,
              perSet: latestExercise ? perSet : null,
              best: latestExercise ? best : null,
              fallbackPrev,
            })
          : Array.isArray(set.entries) && set.entries.length
            ? set.entries
            : [
                {
                  id: set.id,
                  previousText: set.previousText,
                  kg: set.kg ?? set.weightKg ?? "",
                  reps: set.reps ?? "",
                  done: set.done ?? false,
                },
              ];
        return {
          ...set,
          id: setId,
          done: false,
          prSummary: perSetSummary,
          prBranchLabel: perSet
            ? getRemoteBranchLabel(perSet.branch, effectiveBranch)
            : set.prBranchLabel || "",
          entries: normalizeEntries({
            entries: seedEntries,
            seriesType,
            setId,
            fallbackPrev: buildPrevText(previousByIndex[0], fallbackPrev),
            previousByIndex,
            compareByIndex,
          }),
        };
      });
      return {
        ...ex,
        id,
        order: currentOrder,
        actualOrder: ex.startedOrder || currentOrder,
        plannedOrder: getPlannedExerciseOrder(ex, idx),
        orderContext: getOrderContext(
          getPlannedExerciseOrder(ex, idx),
          ex.startedOrder || currentOrder,
          Boolean(ex.isExtra),
        ),
        reloadMovementHistory: undefined,
        movementMode,
        seriesType,
        setupNote: ex.setupNoteEdited
          ? ex.setupNote
          : (latestExercise?.setupNote ??
            setupNoteEntry?.note ??
            ex.setupNote ??
            ""),
        weightBasis: ex.weightBasis,
        barWeightKg: Number(ex.barWeightKg || 0),
        implementCount: Math.max(1, Number(ex.implementCount || 1)),
        prSummary,
        prWeight: best?.weight ?? ex.prWeight ?? null,
        prText,
        globalPrText,
        referenceSourceText,
        sets,
      };
    });

  const applyExerciseOrder = (nextOrder) => {
    const orderedExercises = (nextOrder || []).map((ex, idx) => ({
      ...ex,
      order: idx + 1,
      actualOrder: idx + 1,
      plannedOrder: getPlannedExerciseOrder(ex, idx),
      orderContext: getOrderContext(
        getPlannedExerciseOrder(ex, idx),
        idx + 1,
        Boolean(ex.isExtra),
      ),
      reloadMovementHistory: !exerciseHasUserInput(ex),
    }));
    const matchingHistory = filterHistoryByMuscleSequences(
      historyTrainings,
      orderedExercises,
    );
    return applyHistoryToExercises(
      orderedExercises,
      computeBestFromHistory(matchingHistory, historyBranchFilter),
      computeBestBySetFromHistory(matchingHistory, historyBranchFilter),
      computeRecentBySetFromHistory(matchingHistory, historyBranchFilter),
      computeLatestSeriesTypeFromHistory(
        matchingHistory,
        selectedRoutineId,
        historyBranchFilter,
      ),
      matchingHistory,
    );
  };

  useEffect(() => {
    if (!removedExerciseIds.length) return;
    const removed = new Set(removedExerciseIds);
    setExercises((current) => {
      const filtered = current.filter(
        (exercise) => !removed.has(String(exercise.id || "")),
      );
      if (filtered.length === current.length) return current;
      return filtered.map((exercise, index) => ({
        ...exercise,
        order: index + 1,
        actualOrder: index + 1,
      }));
    });
  }, [exercises, removedExerciseIds]);

  const mergeRoutineIntoActiveExercises = (currentList = [], routine) => {
    const routineTemplate = buildExercisesForRoutine(
      routine,
      null,
      historyBest,
      historyBestBySet,
      historyRecentBySet,
      historySeriesTypeMap,
    ).filter(
      (exercise) =>
        !removedExerciseIdsRef.current.has(String(exercise.id || "")),
    );
    if (!routineTemplate.length) {
      return {
        exercises: currentList,
        added: 0,
        removed: 0,
        keptRemoved: 0,
        resized: 0,
        reordered: 0,
      };
    }

    const currentByKey = new Map();
    currentList.forEach((ex) => {
      getExerciseKeys(ex).forEach((key) => {
        if (key && !currentByKey.has(key)) currentByKey.set(key, ex);
      });
    });

    const used = new Set();
    let added = 0;
    let resized = 0;
    let reordered = 0;
    const merged = routineTemplate.map((template, idx) => {
      const match =
        getExerciseKeys(template)
          .map((key) => currentByKey.get(key))
          .find(Boolean) || null;
      if (!match) {
        added += 1;
        return template;
      }
      used.add(match.id);
      const movementConfig = getRoutineMovementConfig(
        routine?.exercises || [],
        template,
      );
      const mergedSets = mergeSetsToRoutineCount(
        match.sets || [],
        template.sets || [],
      );
      if ((match.sets || []).length !== mergedSets.length) resized += 1;
      const nextPlannedOrder = template.plannedOrder || idx + 1;
      if (getPlannedExerciseOrder(match) !== nextPlannedOrder) reordered += 1;
      return {
        ...template,
        ...match,
        name: template.name,
        muscle: template.muscle,
        image: template.image,
        imagePublicId: template.imagePublicId,
        variants: template.variants,
        variantIndex: template.variantIndex,
        supportsUnilateral: movementConfig.supportsUnilateral,
        movementMode: movementConfig.supportsUnilateral
          ? normalizeMovementMode(match.movementMode || template.movementMode)
          : "bilateral",
        isExtra: Boolean(template.isExtra),
        removedFromRoutine: false,
        plannedOrder: nextPlannedOrder,
        order: template.order || idx + 1,
        actualOrder:
          match.startedOrder || match.actualOrder || nextPlannedOrder,
        prText: template.prText,
        globalPrText: template.globalPrText,
        prSummary: template.prSummary,
        prWeight: template.prWeight,
        sets: mergedSets,
      };
    });

    let removed = 0;
    let keptRemoved = 0;
    const orphaned = currentList
      .filter((ex) => !used.has(ex.id))
      .map((ex) => {
        const shouldKeep =
          exerciseHasInput(ex) ||
          ex.startedOrder ||
          activeExerciseId === ex.id ||
          timingSummary.exerciseDurations.has(ex.id);
        if (!shouldKeep) {
          removed += 1;
          return null;
        }
        keptRemoved += 1;
        return {
          ...ex,
          isExtra: true,
          removedFromRoutine: true,
          orderContext: "extra",
        };
      })
      .filter(Boolean);

    return {
      exercises: applyHistoryToExercises(
        [...merged, ...orphaned],
        historyBest,
        historyBestBySet,
        historyRecentBySet,
        historySeriesTypeMap,
      ),
      added,
      removed,
      keptRemoved,
      resized,
      reordered,
    };
  };

  const handleMoveExercise = (exerciseId, direction) => {
    setExercises((prev) => {
      const currentIndex = prev.findIndex((ex) => ex.id === exerciseId);
      const nextIndex = currentIndex + direction;
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= prev.length) {
        return prev;
      }
      const nextOrder = [...prev];
      const [item] = nextOrder.splice(currentIndex, 1);
      nextOrder.splice(nextIndex, 0, item);
      return applyExerciseOrder(nextOrder);
    });
  };

  const focusExerciseBelowToolbar = useCallback(
    (exerciseId, { delay = 320, setId = "", highlight = false } = {}) => {
      if (typeof document === "undefined" || typeof window === "undefined") {
        return;
      }
      if (exerciseFocusTimerRef.current) {
        window.clearTimeout(exerciseFocusTimerRef.current);
      }
      exerciseFocusTimerRef.current = window.setTimeout(
        () => {
          exerciseFocusTimerRef.current = null;
          const exerciseElement = Array.from(
            document.querySelectorAll("[data-exercise-id]"),
          ).find(
            (element) =>
              String(element.dataset.exerciseId) === String(exerciseId) &&
              element.getClientRects().length > 0,
          );
          if (!exerciseElement) return;

          const setElement = setId
            ? Array.from(
                exerciseElement.querySelectorAll("[data-set-id]"),
              ).find(
                (element) => String(element.dataset.setId) === String(setId),
              )
            : null;
          const target = setElement || exerciseElement;
          const visibleToolbar = [
            document.querySelector("[data-training-header]"),
            document.querySelector("[data-training-session-bar]"),
          ].find((element) => {
            if (
              !element ||
              element.getClientRects().length === 0 ||
              window.getComputedStyle(element).visibility === "hidden"
            ) {
              return false;
            }
            const rect = element.getBoundingClientRect();
            return rect.bottom > 0 && rect.top < window.innerHeight;
          });
          const toolbarRect = visibleToolbar?.getBoundingClientRect();
          const toolbarStyle = visibleToolbar
            ? window.getComputedStyle(visibleToolbar)
            : null;
          const toolbarBottom = toolbarRect
            ? toolbarStyle?.position === "sticky"
              ? Math.max(
                  0,
                  (Number.parseFloat(toolbarStyle.top) || 0) +
                    toolbarRect.height,
                )
              : Math.max(0, toolbarRect.bottom)
            : 0;
          const topGap = window.matchMedia("(min-width: 768px)").matches
            ? 18
            : 12;
          const targetTop =
            target.getBoundingClientRect().top +
            window.scrollY -
            toolbarBottom -
            topGap;

          window.scrollTo({
            top: Math.max(0, targetTop),
            behavior: reduceMotion ? "auto" : "smooth",
          });

          if (
            highlight &&
            !reduceMotion &&
            typeof target.animate === "function"
          ) {
            target.animate(
              [
                { boxShadow: "0 0 0 0 rgba(53,32,24,0)" },
                { boxShadow: "0 0 0 3px rgba(53,32,24,0.38)" },
                { boxShadow: "0 0 0 0 rgba(53,32,24,0)" },
              ],
              { duration: 700, easing: "ease-out" },
            );
          }
        },
        reduceMotion ? Math.min(delay, 80) : delay,
      );
    },
    [reduceMotion],
  );

  const handleToggleExercise = useCallback(
    (exerciseId) => {
      const willOpen = expandedExerciseId !== exerciseId;
      setExpandedExerciseId(willOpen ? exerciseId : "");
      if (willOpen) {
        focusExerciseBelowToolbar(exerciseId, { delay: 340 });
      } else if (exerciseFocusTimerRef.current) {
        window.clearTimeout(exerciseFocusTimerRef.current);
        exerciseFocusTimerRef.current = null;
      }
    },
    [expandedExerciseId, focusExerciseBelowToolbar],
  );

  useEffect(
    () => () => {
      if (exerciseFocusTimerRef.current) {
        window.clearTimeout(exerciseFocusTimerRef.current);
      }
    },
    [],
  );

  const handleStartExerciseNow = (exerciseId, { silent = false } = {}) => {
    const now = Date.now();
    if (activeExerciseId === exerciseId && isRunning) {
      if (!silent) toast.message("Este ejercicio ya esta en curso.");
      return;
    }
    if (autoFlowTargetRef.current || autoFlowPromptRef.current) {
      updateAutoFlowTarget(null);
      updateAutoFlowPrompt(null);
    }
    setExercises((prev) => {
      const current = prev.find((ex) => ex.id === exerciseId);
      if (!current) return prev;
      const nextStartedOrder =
        current.startedOrder ||
        prev.reduce(
          (max, ex) => Math.max(max, Number(ex.startedOrder) || 0),
          0,
        ) + 1;
      const withStartedOrder = prev.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              startedOrder: nextStartedOrder,
              actualOrder: nextStartedOrder,
              orderContext: getOrderContext(
                getPlannedExerciseOrder(ex),
                nextStartedOrder,
                Boolean(ex.isExtra),
              ),
            }
          : ex,
      );
      const currentPosition = new Map(
        prev.map((exercise, index) => [exercise.id, index]),
      );
      const executionOrder = [...withStartedOrder].sort((a, b) => {
        const aStarted = Number(a.startedOrder) || 0;
        const bStarted = Number(b.startedOrder) || 0;
        if (aStarted && bStarted) return aStarted - bStarted;
        if (aStarted) return -1;
        if (bStarted) return 1;
        return (
          (currentPosition.get(a.id) ?? 0) - (currentPosition.get(b.id) ?? 0)
        );
      });
      return applyExerciseOrder(executionOrder);
    });
    const wasResting = restEventOpenRef.current;
    restEventOpenRef.current = false;
    if (wasResting) {
      setRestTimerRunning(false);
      setRestDeadlineMs(null);
      updateAutoFlowTarget(null);
    }
    setTimeEvents((prev) => [
      ...prev,
      ...(wasResting ? [createTimeEvent("rest_end", null, now)] : []),
      ...(!isRunning
        ? [
            createTimeEvent(
              prev.length ? "session_resume" : "session_start",
              null,
              now,
            ),
          ]
        : []),
      createTimeEvent("exercise_selected", exerciseId, now),
    ]);
    lastUpdateRef.current = now;
    setNowMs(now);
    setIsRunning(true);
    setHasStarted(true);
    setExpandedExerciseId(exerciseId);
    if (!silent) {
      focusExerciseBelowToolbar(exerciseId, {
        delay: 360,
        highlight: true,
      });
    }
  };

  const completeAutoFlow = () => {
    const pendingTarget = autoFlowTargetRef.current;
    if (!pendingTarget || autoFlowPromptRef.current) return;
    if (!isAdmin || !autoFlowEnabledRef.current) return;

    const destination = findAutoFlowDestination(
      exercisesRef.current,
      pendingTarget.exerciseId,
    );
    if (!destination) return;
    const destinationExercise = exercisesRef.current.find(
      (exercise) =>
        String(exercise.id) === String(destination.exerciseId || ""),
    );
    const destinationSetIndex =
      destination.type === "set"
        ? (destinationExercise?.sets || []).findIndex(
            (set) => String(set.id) === String(destination.setId),
          )
        : -1;
    updateAutoFlowPrompt({
      ...destination,
      exerciseName: destinationExercise?.name || "Siguiente ejercicio",
      setNumber: destinationSetIndex >= 0 ? destinationSetIndex + 1 : null,
    });
    setRestTimerOpen(true);
    setRestTimerMinimized(false);
  };
  completeAutoFlowRef.current = completeAutoFlow;

  const beginFlowDestination = (destination) => {
    if (!destination || destination.type === "complete") return;
    const destinationExercise = exercisesRef.current.find(
      (exercise) =>
        String(exercise.id) === String(destination.exerciseId || ""),
    );
    const destinationSet =
      destination.type === "set"
        ? (destinationExercise?.sets || []).find(
            (set) => String(set.id) === String(destination.setId || ""),
          )
        : (destinationExercise?.sets || []).find((set) => !isSetDone(set));
    const now = Date.now();

    if (destination.type === "exercise") {
      handleStartExerciseNow(destination.exerciseId, { silent: true });
    } else {
      setExpandedExerciseId(destination.exerciseId);
    }
    if (destinationSet) {
      setTimeEvents((prev) => [
        ...prev,
        createTimeEvent("set_start", destination.exerciseId, now, {
          setId: destinationSet.id,
          source: "manual",
        }),
      ]);
    }

    focusExerciseBelowToolbar(destination.exerciseId, {
      delay: destination.type === "exercise" ? 380 : 340,
      setId: destinationSet?.id || "",
      highlight: true,
    });
  };

  const handleConfirmAutoFlowAdvance = () => {
    const destination = autoFlowPromptRef.current;
    if (!destination) return;
    updateAutoFlowPrompt(null);
    updateAutoFlowTarget(null);
    setRestTimerOpen(false);
    setRestTimerMinimized(true);
    setRestTimerStarted(false);
    setRestRemainingSeconds(restDurationSeconds);
    setRestDeadlineMs(null);

    if (destination.type === "complete") {
      toast.success("Todas las series de la rutina estan completas.");
      return;
    }

    beginFlowDestination(destination);
    toast.success(
      destination.type === "exercise"
        ? "Siguiente ejercicio preparado."
        : "Siguiente serie iniciada.",
    );
  };

  const handleBeginNextSeries = () => {
    const pendingTarget = autoFlowTargetRef.current;
    if (!pendingTarget) return;
    const destination = findAutoFlowDestination(
      exercisesRef.current,
      pendingTarget.exerciseId,
    );
    updateAutoFlowPrompt(null);
    updateAutoFlowTarget(null);
    setRestTimerOpen(false);
    setRestTimerMinimized(true);
    setRestTimerStarted(false);
    setRestRemainingSeconds(restDurationSeconds);
    setRestDeadlineMs(null);
    if (!destination || destination.type === "complete") return;
    beginFlowDestination(destination);
  };

  const loadTrainingForDate = async (
    date,
    routineId,
    bestMap = historyBest,
    bestBySetMap = historyBestBySet,
    recentBySetMap = historyRecentBySet,
    seriesTypeMap = historySeriesTypeMap,
    options = {},
  ) => {
    const {
      requestId = null,
      promptForExisting = false,
      compatibleRecentBySetMap = historyCompatibleRecentBySet,
    } = options;
    const isCurrentRequest = () =>
      requestId == null || routineLoadRequestRef.current === requestId;
    if (!allRoutineOptions.length || !routineId) {
      if (isCurrentRequest()) setExercises([]);
      return;
    }
    const routine = allRoutineOptions.find((r) => r.id === routineId);
    if (!routine) {
      if (isCurrentRequest()) setExercises([]);
      return;
    }
    try {
      const resp = await api.getTrainings({
        athleteId: dataOwnerId,
        from: date,
        to: date,
        limit: 1,
        fields:
          "date,routineId,routineName,progressScopeId,orderSignature,branch,durationSeconds,timeEvents,exerciseDurations,exercises.exerciseId,exercises.exerciseName,exercises.muscleGroup,exercises.order,exercises.plannedOrder,exercises.actualOrder,exercises.orderContext,exercises.movementMode,exercises.seriesType,exercises.setupNote,exercises.weightBasis,exercises.barWeightKg,exercises.implementCount,exercises.sets.seriesType,exercises.sets.weightKg,exercises.sets.reps,exercises.sets.done,exercises.sets.entries.weightKg,exercises.sets.entries.reps,exercises.sets.entries.done,exercises.sets.entries.completedAt,exercises.sets.entries.previousText",
        meta: false,
        routineId: routine.id,
      });
      const list = Array.isArray(resp) ? resp : resp?.items || [];
      const trainingMatch = list.find((t) => {
        if (!t) return false;
        if (t.date !== date) return false;
        if (routine.id && t.routineId) return t.routineId === routine.id;
        return true;
      });
      if (!isCurrentRequest()) return;
      if (trainingMatch && promptForExisting) {
        setPendingSameDayTraining({
          training: trainingMatch,
          routine,
          bestMap,
          bestBySetMap,
          recentBySetMap,
          seriesTypeMap,
          compatibleRecentBySetMap,
        });
        setExercises(
          buildExercisesForRoutine(
            routine.raw,
            null,
            bestMap,
            bestBySetMap,
            recentBySetMap,
            seriesTypeMap,
            false,
            compatibleRecentBySetMap,
          ),
        );
        setDurationSeconds(0);
        setTimeEvents([]);
        return;
      }
      setPendingSameDayTraining(null);
      setExercises(
        buildExercisesForRoutine(
          routine.raw,
          trainingMatch,
          bestMap,
          bestBySetMap,
          recentBySetMap,
          seriesTypeMap,
          false,
          compatibleRecentBySetMap,
        ),
      );
      setDurationSeconds(Number(trainingMatch?.durationSeconds) || 0);
      const loadedEvents = normalizeTimeEvents(trainingMatch?.timeEvents);
      setTimeEvents(
        loadedEvents.length
          ? loadedEvents
          : buildFallbackTimeEvents(trainingMatch?.durationSeconds),
      );
    } catch (e) {
      if (!isCurrentRequest()) return;
      console.warn("No se pudo cargar entrenamiento previo", e);
      setPendingSameDayTraining(null);
      setDurationSeconds(0);
      setTimeEvents([]);
      setExercises(
        buildExercisesForRoutine(
          routine.raw,
          null,
          bestMap,
          bestBySetMap,
          recentBySetMap,
          seriesTypeMap,
          false,
          compatibleRecentBySetMap,
        ),
      );
    }
  };

  const loadTrainingById = async (id, { readOnly = false } = {}) => {
    if (!id) return;
    const requestId = routineLoadRequestRef.current + 1;
    routineLoadRequestRef.current = requestId;
    setLoadingTraining(true);
    try {
      const training = await api.getTraining(id);
      if (requestId !== routineLoadRequestRef.current) return;
      const routineId = training.routineId || allRoutineOptions[0]?.id;
      const routine =
        allRoutineOptions.find((r) => r.id === routineId) ||
        allRoutineOptions[0];
      if (!routine) throw new Error("No hay una rutina asociada al registro.");
      const branch = normalizeBranch(training.branch || routine.location);
      setSelectedBranch(branch);
      setSessionDate(training.date);
      setSelectedRoutineId(routine.id);
      setSelectedRoutine(routine);
      setSelectedPlanContext(
        training.trainingPlanId
          ? {
              planId: String(training.trainingPlanId),
              slotId: String(training.trainingPlanSlotId || ""),
            }
          : null,
      );
      setIsEditing(true);
      setIsHistoryReadOnly(readOnly);
      const historyResult = await loadHistoryForRoutine(routine.id, {
        commit: false,
        planId: training.trainingPlanId || "",
      });
      if (requestId !== routineLoadRequestRef.current) return;
      const hist = historyResult.routineHistory;
      loadedHistoryRoutineRef.current = routine.id;
      setHistoryTrainings(hist);
      setPlanHistoryTrainings(historyResult.planHistory);
      const matchingHist = filterHistoryByOrderSignature(
        hist,
        getTrainingOrderSignature(training),
      );
      const bestMap = computeBestFromHistory(matchingHist, branch);
      const bestBySetMap = computeBestBySetFromHistory(matchingHist, branch);
      const recentBySetMap = computeRecentBySetFromHistory(
        matchingHist,
        branch,
      );
      const seriesTypeMap = computeLatestSeriesTypeFromHistory(
        matchingHist,
        routine.id,
        branch,
      );
      const compatibleRecentMap = computeCompatibleRecentBySet(
        [...hist, ...historyResult.planHistory],
        { branch },
      );
      setExercises(
        buildExercisesForRoutine(
          routine.raw,
          training,
          bestMap,
          bestBySetMap,
          recentBySetMap,
          seriesTypeMap,
          false,
          compatibleRecentMap,
        ),
      );
      if (training.durationSeconds)
        setDurationSeconds(training.durationSeconds);
      const loadedEvents = normalizeTimeEvents(training.timeEvents);
      setTimeEvents(
        loadedEvents.length
          ? loadedEvents
          : buildFallbackTimeEvents(training.durationSeconds),
      );
    } catch (e) {
      if (requestId !== routineLoadRequestRef.current) return;
      console.warn("No se pudo cargar el entrenamiento a editar", e);
      if (typeof localStorage !== "undefined")
        localStorage.removeItem("edit_training_id");
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("view_training_id");
        localStorage.removeItem("view_training_date");
      }
      setEditingId("");
      setIsEditing(false);
      setIsHistoryReadOnly(false);
      if (readOnly) {
        resetStateRef.current?.();
        toast.error("La sesión consultada ya no está disponible.");
        return;
      }
      // fallback: cargar rutina inicial en la fecha actual
      const routine =
        allRoutineOptions.find((r) => r.id === selectedRoutineId) ||
        allRoutineOptions[0];
      if (routine) {
        await loadHistoryForRoutine(routine.id);
        await loadTrainingForDate(sessionDate, routine.id);
      }
    } finally {
      if (requestId === routineLoadRequestRef.current) {
        setLoadingTraining(false);
      }
    }
  };
  const loadHistoryForRoutine = async (_routineId, options = {}) => {
    const {
      commit = true,
      planContext = selectedPlanContext,
      planId = "",
    } = options;
    const routine =
      allRoutineOptions.find((item) => item.id === _routineId) ||
      routineOptions.find((item) => item.id === _routineId);
    const progressScopeId =
      routine?.progressScopeId || routine?.raw?.progressScopeId || "";
    const historyPlanId =
      String(planId || "") || resolveHistoryPlanId(routine, planContext);
    const splitHistory = (items = []) => {
      const routineHistory = progressScopeId
        ? items.filter(
            (training) => training.progressScopeId === progressScopeId,
          )
        : items.filter((training) => training.routineId === _routineId);
      const planHistory = historyPlanId
        ? items.filter(
            (training) =>
              String(training.trainingPlanId || "") === historyPlanId,
          )
        : [];
      return { routineHistory, planHistory, historyPlanId };
    };
    try {
      let resp;
      try {
        resp = await api.getTrainings({
          athleteId: dataOwnerId,
          limit: 200,
          fields:
            "date,routineId,routineName,trainingPlanId,trainingPlanSlotId,progressScopeId,orderSignature,branch,exercises.exerciseId,exercises.exerciseName,exercises.muscleGroup,exercises.order,exercises.plannedOrder,exercises.actualOrder,exercises.orderContext,exercises.movementMode,exercises.seriesType,exercises.setupNote,exercises.weightBasis,exercises.barWeightKg,exercises.implementCount,exercises.sets.seriesType,exercises.sets.weightKg,exercises.sets.reps,exercises.sets.entries.weightKg,exercises.sets.entries.reps,exercises.sets.entries.done,exercises.sets.entries.completedAt,exercises.sets.entries.previousText",
          progressScopeId,
          includeTrainingPlanId: historyPlanId,
          meta: false,
        });
      } catch (projectionError) {
        console.warn(
          "No se pudo cargar historial optimizado, intentando historial completo",
          projectionError,
        );
        resp = await api.getTrainings({
          athleteId: dataOwnerId,
          limit: 200,
          fields:
            "date,routineId,routineName,trainingPlanId,trainingPlanSlotId,progressScopeId,orderSignature,branch,exercises",
          progressScopeId,
          includeTrainingPlanId: historyPlanId,
          meta: false,
        });
      }
      const list = Array.isArray(resp) ? resp : resp?.items || [];
      const result = splitHistory(list);
      if (commit) {
        loadedHistoryRoutineRef.current = _routineId;
        setHistoryTrainings(result.routineHistory);
        setPlanHistoryTrainings(result.planHistory);
      }
      return result;
    } catch (e) {
      console.warn("No se pudo cargar historial general", e);
      if (Array.isArray(trainings) && trainings.length) {
        const result = splitHistory(trainings);
        if (commit) {
          loadedHistoryRoutineRef.current = _routineId;
          setHistoryTrainings(result.routineHistory);
          setPlanHistoryTrainings(result.planHistory);
        }
        return result;
      }
      if (commit) {
        loadedHistoryRoutineRef.current = _routineId;
        setHistoryTrainings([]);
        setPlanHistoryTrainings([]);
      }
      return { routineHistory: [], planHistory: [], historyPlanId };
    }
  };

  loadTrainingByIdRef.current = loadTrainingById;
  loadHistoryForRoutineRef.current = loadHistoryForRoutine;
  mergeRoutineIntoActiveExercisesRef.current = mergeRoutineIntoActiveExercises;
  applyHistoryToExercisesRef.current = applyHistoryToExercises;
  buildExercisesForRoutineRef.current = buildExercisesForRoutine;

  useEffect(() => {
    if (!allRoutineOptions.length) return;
    if (initializedTrainingScreen.current) return;
    initializedTrainingScreen.current = true;
    const viewId =
      typeof localStorage !== "undefined"
        ? localStorage.getItem("view_training_id")
        : "";
    const viewDate =
      typeof localStorage !== "undefined"
        ? localStorage.getItem("view_training_date")
        : "";
    const editId =
      typeof localStorage !== "undefined"
        ? localStorage.getItem("edit_training_id")
        : "";
    const editDate =
      typeof localStorage !== "undefined"
        ? localStorage.getItem("edit_training_date")
        : "";
    if (viewId) {
      setEditingId(viewId);
      (async () => {
        await loadTrainingByIdRef.current?.(viewId, { readOnly: true });
        if (viewDate) setSessionDate(viewDate);
      })();
    } else if (editId) {
      setEditingId(editId);
      (async () => {
        await loadTrainingByIdRef.current?.(editId);
        if (editDate) setSessionDate(editDate);
      })();
    } else {
      setIsEditing(false);
      setIsHistoryReadOnly(false);
      // esperar a que el usuario seleccione rutina
      setSelectedRoutineId(null);
      setSelectedRoutine(null);
      setExercises([]);
      setHistoryTrainings([]);
      setPlanHistoryTrainings([]);
      setDurationSeconds(0);
      setIsRunning(false);
    }
  }, [allRoutineOptions]);

  useEffect(() => {
    if (!selectedRoutineId) return;
    if (loadedHistoryRoutineRef.current === selectedRoutineId) return;
    if (loadingTraining) return;
    loadHistoryForRoutineRef.current?.(selectedRoutineId);
  }, [selectedRoutineId, loadingTraining]);

  useEffect(() => {
    if (!selectedRoutineId || !routineOptions.length) return;
    const latestRoutine = routineOptions.find(
      (r) => r.id === selectedRoutineId,
    );
    if (!latestRoutine) return;
    const previousRaw = selectedRoutine?.raw;
    const previousDefinition = previousRaw
      ? getRoutineDefinitionSignature(previousRaw)
      : "";
    const latestDefinition = getRoutineDefinitionSignature(
      latestRoutine.raw || {},
    );
    setSelectedRoutine((current) =>
      current?.raw === latestRoutine.raw ? current : latestRoutine,
    );
    const routineExercises = latestRoutine.raw?.exercises || [];
    if (!routineExercises.length) return;
    if (!exercisesRef.current.length) return;
    // Context refreshes can recreate the routine object without changing it.
    // Only merge a real template edit; otherwise a session-only deletion would
    // be immediately reinserted when the exercise count changes.
    if (previousDefinition === latestDefinition) return;

    let shouldNotify = false;
    if (typeof localStorage !== "undefined") {
      try {
        const rawMarker = localStorage.getItem(
          ROUTINE_UPDATED_DURING_TRAINING_KEY,
        );
        const marker = rawMarker ? JSON.parse(rawMarker) : null;
        shouldNotify = marker?.routineId === selectedRoutineId;
        if (shouldNotify) {
          localStorage.removeItem(ROUTINE_UPDATED_DURING_TRAINING_KEY);
        }
      } catch {
        localStorage.removeItem(ROUTINE_UPDATED_DURING_TRAINING_KEY);
      }
    }

    setExercises((prev) => {
      const result = mergeRoutineIntoActiveExercisesRef.current(
        prev,
        latestRoutine.raw,
      );
      if (shouldNotify) {
        const details = [];
        if (result.added) details.push(`${result.added} agregados`);
        if (result.resized)
          details.push(`${result.resized} con series ajustadas`);
        if (result.reordered) details.push(`${result.reordered} reordenados`);
        if (result.removed) details.push(`${result.removed} quitados`);
        if (result.keptRemoved)
          details.push(`${result.keptRemoved} mantenidos por tener datos`);
        toast.success(
          details.length
            ? `Rutina actualizada: ${details.join(", ")}.`
            : "Rutina actualizada. Tus registros se mantuvieron.",
        );
      }
      return result.exercises;
    });
  }, [selectedRoutineId, routineOptions, selectedRoutine]);

  useEffect(() => {
    const needsRoutineHistory = !historyTrainings.length;
    const needsPlanHistory =
      Boolean(selectedHistoryPlanId) && !planHistoryTrainings.length;
    if (!needsRoutineHistory && !needsPlanHistory) return;
    if (!selectedRoutineId) return;
    if (!trainings.length) return;
    if (needsRoutineHistory) {
      const scopedTrainings = selectedProgressScopeId
        ? trainings.filter(
            (training) => training.progressScopeId === selectedProgressScopeId,
          )
        : trainings.filter(
            (training) => training.routineId === selectedRoutineId,
          );
      if (scopedTrainings.length) setHistoryTrainings(scopedTrainings);
    }
    if (needsPlanHistory) {
      const scopedPlanTrainings = trainings.filter(
        (training) =>
          String(training.trainingPlanId || "") === selectedHistoryPlanId,
      );
      if (scopedPlanTrainings.length)
        setPlanHistoryTrainings(scopedPlanTrainings);
    }
  }, [
    trainings,
    historyTrainings.length,
    planHistoryTrainings.length,
    selectedRoutineId,
    selectedProgressScopeId,
    selectedHistoryPlanId,
  ]);

  useEffect(() => {
    if (!allRoutineOptions.length || isEditing || selectedRoutineId) return;
    if (typeof localStorage === "undefined") return;
    const raw = localStorage.getItem(TRAINING_PLAN_ROUTINE_INTENT_KEY);
    if (!raw) return;
    try {
      const intent = JSON.parse(raw);
      if (Date.now() - Number(intent.createdAt || 0) > 5 * 60 * 1000) return;
      const routine = allRoutineOptions.find(
        (item) => String(item.id) === String(intent.routineId),
      );
      if (!routine) return;
      setSelectedRoutineId(routine.id);
      setSelectedRoutine(routine);
      setSelectedBranch(normalizeBranch(routine.location));
      setSelectedPlanContext({
        planId: String(intent.planId || ""),
        slotId: String(intent.slotId || ""),
      });
    } catch {
      // Ignore stale or malformed navigation intents.
    } finally {
      localStorage.removeItem(TRAINING_PLAN_ROUTINE_INTENT_KEY);
    }
  }, [allRoutineOptions, dataOwnerId, isEditing, selectedRoutineId]);

  // Restaurar entrenamiento activo desde snapshot local
  useEffect(() => {
    if (!allRoutineOptions.length) return;
    if (isEditing) return;
    if (selectedRoutineId) return;
    if (typeof localStorage === "undefined") return;
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return;
    try {
      const snap = JSON.parse(raw);
      if (!snap?.selectedRoutineId) return;
      if (!canAccessActiveTraining(snap, authUser, coachAthlete)) {
        toast.error("Este entrenamiento fue iniciado por otro usuario.");
        return;
      }
      if (
        snap.ownerId &&
        dataOwnerId &&
        String(snap.ownerId) !== String(dataOwnerId)
      ) {
        toast.error(
          `Este entrenamiento pertenece a ${snap.athleteName || "otro atleta"}.`,
        );
        return;
      }
      const snapshotElapsed = Number(snap.durationSeconds ?? snap.elapsed ?? 0);
      if (!snap.hasStarted && !snap.isRunning && snapshotElapsed <= 0) {
        localStorage.removeItem(SNAPSHOT_KEY);
        return;
      }
      const routine = allRoutineOptions.find(
        (r) => r.id === snap.selectedRoutineId,
      );
      if (!routine) return;
      trainingRequestIdRef.current =
        snap.trainingRequestId || createTrainingRequestId();
      const now = Date.now();
      const baseSeconds =
        Number(snap.durationSeconds ?? snap.elapsed ?? 0) || 0;
      const extraSeconds =
        snap.isRunning && snap.lastUpdate
          ? Math.max(0, Math.floor((now - snap.lastUpdate) / 1000))
          : 0;
      const totalSeconds = baseSeconds + extraSeconds;
      const restoredEvents = normalizeTimeEvents(snap.timeEvents);
      const fallbackEvents =
        restoredEvents.length || !totalSeconds
          ? restoredEvents
          : [
              createTimeEvent("session_start", null, now - totalSeconds * 1000),
              ...(snap.isRunning
                ? []
                : [createTimeEvent("session_pause", null, now)]),
            ];
      const restoredRestDuration = Math.max(
        1,
        Number(snap.restDurationSeconds) || 120,
      );
      const restoredRestDeadline = Number(snap.restDeadlineMs) || null;
      const restoredAutoFlowEnabled = isAdmin && Boolean(snap.autoFlowEnabled);
      const restoredAutoFlowTarget =
        restoredAutoFlowEnabled && snap.autoFlowTarget
          ? snap.autoFlowTarget
          : null;
      const shouldResumeRest = Boolean(
        snap.restTimerRunning &&
        snap.isRunning &&
        restoredRestDeadline &&
        restoredRestDeadline > now,
      );
      const restWasOpen = hasOpenRestInterval(fallbackEvents);
      const restoredTimeEvents =
        restWasOpen && !shouldResumeRest
          ? normalizeTimeEvents([
              ...fallbackEvents,
              createTimeEvent(
                "rest_end",
                null,
                restoredRestDeadline && restoredRestDeadline <= now
                  ? restoredRestDeadline
                  : now,
              ),
            ])
          : fallbackEvents;
      restEventOpenRef.current = shouldResumeRest && restWasOpen;
      setSelectedBranch(
        normalizeBranch(snap.selectedBranch || routine.location),
      );
      setBranchConfirmed(true);
      setSelectedRoutineId(snap.selectedRoutineId);
      setSelectedRoutine(routine);
      setSelectedPlanContext(snap.selectedPlanContext || null);
      removedExerciseIdsRef.current = new Set(
        Array.isArray(snap.removedExerciseIds)
          ? snap.removedExerciseIds.map(String)
          : [],
      );
      setRemovedExerciseIds(Array.from(removedExerciseIdsRef.current));
      setSessionDate(snap.sessionDate || todayISO);
      lastUpdateRef.current = now;
      setNowMs(now);
      setDurationSeconds(totalSeconds);
      setTimeEvents(restoredTimeEvents);
      setIsRunning(Boolean(snap.isRunning));
      setActiveExerciseId(snap.activeExerciseId || "");
      setHasStarted(
        Boolean(snap.hasStarted) || Boolean(snap.isRunning) || totalSeconds > 0,
      );
      if (snap.hasStarted || snap.isRunning || totalSeconds > 0) {
        setSetupStarted(true);
      }
      setRestDurationSeconds(restoredRestDuration);
      setRestMinutesInput(Math.max(1, restoredRestDuration / 60));
      setAutoFlowEnabled(restoredAutoFlowEnabled);
      autoFlowEnabledRef.current = restoredAutoFlowEnabled;
      updateAutoFlowPrompt(null);
      updateAutoFlowTarget(restoredAutoFlowTarget);
      setRestTimerStarted(Boolean(snap.restTimerStarted));
      setRestTimerRunning(shouldResumeRest);
      setRestDeadlineMs(shouldResumeRest ? restoredRestDeadline : null);
      setRestRemainingSeconds(
        shouldResumeRest
          ? Math.max(1, Math.ceil((restoredRestDeadline - now) / 1000))
          : Math.max(
              0,
              restoredAutoFlowTarget &&
                restoredRestDeadline &&
                restoredRestDeadline <= now
                ? 0
                : Number(snap.restRemainingSeconds) || restoredRestDuration,
            ),
      );
      if (Array.isArray(snap.exercises)) {
        const restoredExercises = snap.exercises.map((ex) => {
          const seriesType = normalizeSeriesType(ex.seriesType);
          const sets = (ex.sets || []).map((set, idx) => {
            const setId = set.id || `${ex.id}-set-${idx}`;
            const fallbackPrev =
              set.entries?.[0]?.previousText ||
              set.previousText ||
              "Sin referencia";
            const seedEntries =
              Array.isArray(set.entries) && set.entries.length
                ? set.entries
                : [
                    {
                      id: set.id,
                      previousText: fallbackPrev,
                      kg: set.kg ?? "",
                      reps: set.reps ?? "",
                      done: set.done ?? false,
                    },
                  ];
            return {
              ...set,
              id: setId,
              entries: normalizeEntries({
                entries: seedEntries,
                seriesType,
                setId,
                fallbackPrev,
                compareByIndex: (set.entries || []).map((entry) => ({
                  weight: entry.previousCompareWeight ?? null,
                  reps: entry.previousCompareReps ?? null,
                  date: entry.previousCompareDate ?? null,
                })),
              }),
            };
          });
          return {
            ...ex,
            movementMode: normalizeMovementMode(ex.movementMode),
            seriesType,
            sets,
          };
        });
        let nextExercises = restoredExercises;
        let mergeResult = null;
        let routineWasUpdated = false;
        try {
          const rawMarker = localStorage.getItem(
            ROUTINE_UPDATED_DURING_TRAINING_KEY,
          );
          const marker = rawMarker ? JSON.parse(rawMarker) : null;
          routineWasUpdated = marker?.routineId === snap.selectedRoutineId;
        } catch {
          localStorage.removeItem(ROUTINE_UPDATED_DURING_TRAINING_KEY);
        }
        const snapshotRoutine = snap.selectedRoutine?.raw;
        if (snapshotRoutine && routine.raw) {
          routineWasUpdated =
            routineWasUpdated ||
            getRoutineDefinitionSignature(snapshotRoutine) !==
              getRoutineDefinitionSignature(routine.raw);
        }

        if (
          routineWasUpdated &&
          routine.raw &&
          mergeRoutineIntoActiveExercisesRef.current
        ) {
          mergeResult = mergeRoutineIntoActiveExercisesRef.current(
            restoredExercises,
            routine.raw,
          );
          nextExercises = mergeResult.exercises;
          localStorage.removeItem(ROUTINE_UPDATED_DURING_TRAINING_KEY);
        }
        exercisesRef.current = nextExercises;
        setExercises(nextExercises);

        if (
          restoredAutoFlowTarget &&
          restoredRestDeadline &&
          restoredRestDeadline <= now
        ) {
          window.setTimeout(() => completeAutoFlowRef.current?.(), 0);
        }

        if (mergeResult) {
          const details = [];
          if (mergeResult.added) details.push(`${mergeResult.added} agregados`);
          if (mergeResult.resized)
            details.push(`${mergeResult.resized} con series ajustadas`);
          if (mergeResult.reordered)
            details.push(`${mergeResult.reordered} reordenados`);
          if (mergeResult.removed)
            details.push(`${mergeResult.removed} quitados`);
          if (mergeResult.keptRemoved)
            details.push(
              `${mergeResult.keptRemoved} mantenidos por tener datos`,
            );
          toast.success(
            details.length
              ? `Rutina actualizada: ${details.join(", ")}.`
              : "Rutina actualizada. Tus registros se mantuvieron.",
          );
        }
      }
    } catch (e) {
      console.warn("No se pudo restaurar el entrenamiento activo", e);
    }
  }, [
    allRoutineOptions,
    authUser,
    coachAthlete,
    dataOwnerId,
    isAdmin,
    isEditing,
    selectedRoutineId,
  ]);

  useEffect(() => {
    if (!historyTrainings.length) return;
    if (!exercises.length) return;
    setExercises((prev) =>
      applyHistoryToExercisesRef.current(
        prev,
        historyBest,
        historyBestBySet,
        historyRecentBySet,
      ),
    );
  }, [
    historyTrainings,
    historyBest,
    historyGlobalBest,
    historyBestBySet,
    historyRecentBySet,
    historySeriesTypeMap,
    historySetupNotes,
    historyBranchFilter,
    exercises.length,
  ]);

  // En modo múltiple se recuerda la última sede elegida.
  useEffect(() => {
    if (!requiresBranchSelection || !branchConfirmed || !selectedBranch) return;
    if (typeof setBranch === "function") setBranch(selectedBranch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch, branchConfirmed, requiresBranchSelection]);

  const persistTrainingSnapshot = useCallback(() => {
    if (typeof localStorage === "undefined") return;
    if (!selectedRoutineId) return;
    if (!setupStarted) {
      localStorage.removeItem(SNAPSHOT_KEY);
      return;
    }
    try {
      const now = Date.now();
      if (!trainingRequestIdRef.current) {
        trainingRequestIdRef.current = createTrainingRequestId();
      }
      const liveTimingSummary = calculateTimingSummary(timeEvents, now);
      const liveDurationSeconds = liveTimingSummary.durationSeconds;
      const snapshot = {
        ownerId: dataOwnerId || "",
        athleteName: coachAthlete?.name || "",
        startedById: getUserId(authUser),
        startedByName: authUser?.name || authUser?.email || "",
        trainingRequestId: trainingRequestIdRef.current,
        selectedRoutineId,
        selectedRoutine,
        selectedBranch,
        selectedPlanContext,
        sessionDate,
        durationSeconds: liveDurationSeconds,
        elapsed: liveDurationSeconds,
        isRunning,
        hasStarted,
        activeExerciseId,
        lastUpdate: now,
        timeEvents,
        restTimerRunning,
        restTimerStarted,
        restDurationSeconds,
        restRemainingSeconds,
        restDeadlineMs,
        autoFlowEnabled: isAdmin && autoFlowEnabled,
        autoFlowTarget: isAdmin && autoFlowEnabled ? autoFlowTarget : null,
        exercises,
        removedExerciseIds: Array.from(removedExerciseIdsRef.current),
      };
      lastUpdateRef.current = now;
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
      window.dispatchEvent(new Event("active-training-updated"));
    } catch (e) {
      console.warn("No se pudo guardar el estado del entrenamiento", e);
    }
  }, [
    selectedRoutineId,
    selectedRoutine,
    selectedBranch,
    selectedPlanContext,
    sessionDate,
    setupStarted,
    isRunning,
    hasStarted,
    activeExerciseId,
    timeEvents,
    restTimerRunning,
    restTimerStarted,
    restDurationSeconds,
    restRemainingSeconds,
    restDeadlineMs,
    autoFlowEnabled,
    autoFlowTarget,
    exercises,
    isAdmin,
    dataOwnerId,
    coachAthlete?.name,
    authUser,
  ]);

  // Guardar snapshot local del entrenamiento en curso
  useEffect(() => {
    const timeoutId = window.setTimeout(persistTrainingSnapshot, 250);
    return () => window.clearTimeout(timeoutId);
  }, [persistTrainingSnapshot]);

  useEffect(() => {
    const persistNow = () => persistTrainingSnapshot();
    window.addEventListener("persist-active-training", persistNow);
    window.addEventListener("popstate", persistNow);
    window.addEventListener("pagehide", persistNow);
    return () => {
      window.removeEventListener("persist-active-training", persistNow);
      window.removeEventListener("popstate", persistNow);
      window.removeEventListener("pagehide", persistNow);
    };
  }, [persistTrainingSnapshot]);

  const handleEditRoutineFromTraining = useCallback(() => {
    if (!selectedRoutineId) {
      toast.message("Selecciona una rutina para editarla.");
      return;
    }
    persistTrainingSnapshot();
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(
        TRAINING_ROUTINES_RETURN_KEY,
        JSON.stringify({
          from: "registrar",
          selectedRoutineId,
          savedAt: Date.now(),
        }),
      );
      localStorage.setItem(
        TRAINING_ROUTINE_EDIT_TARGET_KEY,
        JSON.stringify({
          routineId: selectedRoutineId,
          savedAt: Date.now(),
        }),
      );
    }
    onNavigate?.("rutinas");
  }, [selectedRoutineId, persistTrainingSnapshot, onNavigate]);

  useEffect(() => {
    if (!isRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      return undefined;
    }
    timerRef.current = setInterval(() => {
      const now = Date.now();
      setNowMs(now);
      lastUpdateRef.current = now;
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [isRunning]);

  useEffect(() => {
    const handleVisibility = () => {
      if (!isRunning) return;
      const now = Date.now();
      setNowMs(now);
      lastUpdateRef.current = now;
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [isRunning]);

  const ensureRestAudioContext = async () => {
    if (typeof window === "undefined") return null;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!restAudioContextRef.current) {
      restAudioContextRef.current = new AudioContextClass();
    }
    if (restAudioContextRef.current.state === "suspended") {
      try {
        await restAudioContextRef.current.resume();
      } catch {
        return restAudioContextRef.current;
      }
    }
    return restAudioContextRef.current;
  };

  const playRestCompleteSound = async () => {
    const audioContext = await ensureRestAudioContext();
    if (!audioContext) return;

    const now = audioContext.currentTime;
    const notes = [
      { at: 0, freq: 880 },
      { at: 0.18, freq: 1174.66 },
      { at: 0.36, freq: 1567.98 },
    ];

    notes.forEach(({ at, freq }) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(freq, now + at);
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(0.18, now + at + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.14);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(now + at);
      oscillator.stop(now + at + 0.16);
    });
  };

  const notifyRestComplete = () => {
    if (restVibratedRef.current) return;
    restVibratedRef.current = true;
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([220, 120, 220, 120, 320]);
    }
    playRestCompleteSound();
  };
  notifyRestCompleteRef.current = notifyRestComplete;

  useEffect(() => {
    if (!restTimerRunning || !restDeadlineMs) {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
      return undefined;
    }

    const syncRemaining = () => {
      const remaining = Math.max(
        0,
        Math.ceil((restDeadlineMs - Date.now()) / 1000),
      );
      setRestRemainingSeconds(remaining);
      if (remaining <= 0) {
        clearInterval(restTimerRef.current);
        setRestTimerRunning(false);
        if (restEventOpenRef.current) {
          restEventOpenRef.current = false;
          setTimeEvents((prev) => [
            ...prev,
            createTimeEvent("rest_end", null, restDeadlineMs),
          ]);
        }
        notifyRestCompleteRef.current?.();
        completeAutoFlowRef.current?.();
      }
    };

    syncRemaining();
    restTimerRef.current = setInterval(syncRemaining, 500);
    return () => clearInterval(restTimerRef.current);
  }, [restDeadlineMs, restTimerRunning]);

  useEffect(() => {
    const handleVisibility = () => {
      if (!restTimerStarted || !restDeadlineMs) return;
      const remaining = Math.max(
        0,
        Math.ceil((restDeadlineMs - Date.now()) / 1000),
      );
      setRestRemainingSeconds(remaining);
      if (remaining <= 0) {
        setRestTimerRunning(false);
        if (restEventOpenRef.current) {
          restEventOpenRef.current = false;
          setTimeEvents((prev) => [
            ...prev,
            createTimeEvent("rest_end", null, restDeadlineMs),
          ]);
        }
        notifyRestCompleteRef.current?.();
        completeAutoFlowRef.current?.();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
    };
  }, [restDeadlineMs, restTimerStarted]);

  const handleOpenRestTimer = () => {
    setRestTimerOpen(true);
    setRestTimerMinimized(false);
  };

  const handleStartRestTimer = (
    minutes = restMinutesInput,
    { minimized = false, origin, restType = "between_sets" } = {},
  ) => {
    const parsedMinutes = Math.max(1, Number(minutes) || 1);
    const seconds = parsedMinutes * 60;
    updateAutoFlowPrompt(null);
    restVibratedRef.current = false;
    ensureRestAudioContext();
    setRestMinutesInput(parsedMinutes);
    setRestDurationSeconds(seconds);
    setRestRemainingSeconds(seconds);
    const now = Date.now();
    const nextDeadline = now + seconds * 1000;
    const wasResting = restEventOpenRef.current;
    if (origin) updateAutoFlowTarget(origin);
    restEventOpenRef.current = isRunning;
    if (wasResting || isRunning) {
      setTimeEvents((prev) => [
        ...prev,
        ...(wasResting ? [createTimeEvent("rest_end", null, now)] : []),
        ...(isRunning
          ? [
              createTimeEvent(
                "rest_start",
                origin?.exerciseId || activeExerciseId || null,
                now,
                {
                  setId: origin?.setId,
                  restType,
                },
              ),
            ]
          : []),
      ]);
    }
    setRestDeadlineMs(nextDeadline);
    setRestTimerStarted(true);
    setRestTimerRunning(true);
    setRestTimerOpen(true);
    setRestTimerMinimized(minimized);
  };

  const handleAutoFlowToggle = (enabled) => {
    if (!isAdmin) return;
    setAutoFlowEnabled(enabled);
    autoFlowEnabledRef.current = enabled;
    if (!enabled) {
      const now = Date.now();
      if (restEventOpenRef.current) {
        restEventOpenRef.current = false;
        setTimeEvents((prev) => [
          ...prev,
          createTimeEvent("rest_end", null, now),
        ]);
      }
      setRestTimerOpen(false);
      setRestTimerMinimized(true);
      setRestTimerRunning(false);
      setRestTimerStarted(false);
      setRestRemainingSeconds(restDurationSeconds);
      setRestDeadlineMs(null);
      updateAutoFlowTarget(null);
      updateAutoFlowPrompt(null);
      restVibratedRef.current = false;
    }
    toast.success(
      enabled
        ? "Flujo automatico beta activado."
        : "Flujo automatico desactivado.",
    );
  };

  const handleAutoFlowDurationChange = (seconds) => {
    if (!isAdmin) return;
    const safeSeconds = [120, 180, 240, 300].includes(Number(seconds))
      ? Number(seconds)
      : 120;
    setRestDurationSeconds(safeSeconds);
    setRestMinutesInput(safeSeconds / 60);
    if (!restTimerRunning) setRestRemainingSeconds(safeSeconds);
  };

  const handleToggleRestTimer = () => {
    if (!restTimerStarted) {
      handleStartRestTimer();
      return;
    }
    if (restRemainingSeconds <= 0) {
      handleStartRestTimer(restMinutesInput);
      return;
    }
    if (restTimerRunning) {
      const now = Date.now();
      if (restEventOpenRef.current) {
        restEventOpenRef.current = false;
        setTimeEvents((prev) => [
          ...prev,
          createTimeEvent("rest_end", null, now),
        ]);
      }
      setRestTimerRunning(false);
      setRestDeadlineMs(null);
      return;
    }
    ensureRestAudioContext();
    const now = Date.now();
    if (isRunning && !restEventOpenRef.current) {
      restEventOpenRef.current = true;
      setTimeEvents((prev) => [
        ...prev,
        createTimeEvent("rest_start", null, now),
      ]);
    }
    setRestDeadlineMs(now + restRemainingSeconds * 1000);
    setRestTimerRunning(true);
  };

  const handleResetRestTimer = () => {
    const now = Date.now();
    if (restEventOpenRef.current) {
      restEventOpenRef.current = false;
      setTimeEvents((prev) => [
        ...prev,
        createTimeEvent("rest_end", null, now),
      ]);
    }
    const seconds = Math.max(1, Number(restMinutesInput) || 1) * 60;
    setRestDurationSeconds(seconds);
    setRestRemainingSeconds(seconds);
    setRestTimerRunning(false);
    setRestTimerStarted(false);
    setRestDeadlineMs(null);
    updateAutoFlowTarget(null);
    updateAutoFlowPrompt(null);
    restVibratedRef.current = false;
  };

  const handleCloseRestTimer = () => {
    const now = Date.now();
    if (restEventOpenRef.current) {
      restEventOpenRef.current = false;
      setTimeEvents((prev) => [
        ...prev,
        createTimeEvent("rest_end", null, now),
      ]);
    }
    setRestTimerOpen(false);
    setRestTimerMinimized(true);
    setRestTimerRunning(false);
    setRestTimerStarted(false);
    setRestRemainingSeconds(restDurationSeconds);
    setRestDeadlineMs(null);
    updateAutoFlowTarget(null);
    updateAutoFlowPrompt(null);
    restVibratedRef.current = false;
  };

  const handleStart = () => {
    const now = Date.now();
    lastUpdateRef.current = now;
    setNowMs(now);
    setTimeEvents((prev) => [
      ...prev,
      createTimeEvent(
        prev.length ? "session_resume" : "session_start",
        null,
        now,
      ),
    ]);
    setIsRunning(true);
    setHasStarted(true);
  };

  const handleSameDayTrainingChoice = (continueExisting) => {
    const pending = pendingSameDayTraining;
    if (!pending) return;
    const {
      training,
      routine,
      bestMap,
      bestBySetMap,
      recentBySetMap,
      seriesTypeMap,
      compatibleRecentBySetMap,
    } = pending;
    setExercises(
      buildExercisesForRoutine(
        routine.raw,
        continueExisting ? training : null,
        bestMap,
        bestBySetMap,
        recentBySetMap,
        seriesTypeMap,
        false,
        compatibleRecentBySetMap,
      ),
    );
    if (continueExisting) {
      const loadedEvents = normalizeTimeEvents(training.timeEvents);
      setDurationSeconds(Number(training.durationSeconds) || 0);
      setTimeEvents(
        loadedEvents.length
          ? loadedEvents
          : buildFallbackTimeEvents(training.durationSeconds),
      );
      toast.message("Sesión de hoy cargada para continuar.");
    } else {
      setDurationSeconds(0);
      setTimeEvents([]);
      toast.message("Se reemplazará la sesión de hoy al guardar.");
    }
    setPendingSameDayTraining(null);
  };

  const handleCloseSameDayWarning = () => {
    routineLoadRequestRef.current += 1;
    loadedHistoryRoutineRef.current = "";
    setPendingSameDayTraining(null);
    setPendingPlanRoutineId("");
    setSelectedRoutineId(null);
    setSelectedRoutine(null);
    setSelectedPlanContext(null);
    setHistoryTrainings([]);
    setPlanHistoryTrainings([]);
    setExercises([]);
    setDurationSeconds(0);
    setTimeEvents([]);
  };

  const handleStartSetupSession = () => {
    if (!branchReady) {
      toast.message("Selecciona una sucursal para continuar.");
      return;
    }
    if (!selectedRoutineId) {
      toast.message("Selecciona una rutina para iniciar.");
      return;
    }
    if (loadingTraining) {
      toast.message("Espera mientras cargamos la rutina.");
      return;
    }
    if (pendingSameDayTraining) {
      toast.message("Elige si deseas continuar o reiniciar la sesión de hoy.");
      return;
    }
    if (!exercises.length) {
      toast.error("La rutina todavía no tiene ejercicios disponibles.");
      return;
    }
    if (!trainingRequestIdRef.current) {
      trainingRequestIdRef.current = createTrainingRequestId();
    }
    setSetupStarted(true);
    if (!isRunning) handleStart();
  };
  startSetupSessionRef.current = handleStartSetupSession;

  const handlePause = () => {
    const now = Date.now();
    lastUpdateRef.current = now;
    setNowMs(now);
    if (isRunning) {
      const wasResting = restEventOpenRef.current;
      restEventOpenRef.current = false;
      setTimeEvents((prev) => [
        ...prev,
        ...(wasResting ? [createTimeEvent("rest_end", null, now)] : []),
        createTimeEvent("session_pause", null, now),
      ]);
    }
    setRestTimerRunning(false);
    setRestDeadlineMs(null);
    updateAutoFlowTarget(null);
    updateAutoFlowPrompt(null);
    setIsRunning(false);
  };

  const pauseForRoutineCompletion = () => {
    const now = Date.now();
    const wasResting = restEventOpenRef.current;
    restEventOpenRef.current = false;
    lastUpdateRef.current = now;
    setNowMs(now);
    setTimeEvents((prev) => [
      ...prev,
      ...(wasResting ? [createTimeEvent("rest_end", null, now)] : []),
      createTimeEvent("session_pause", null, now),
    ]);
    setIsRunning(false);
    setRestTimerOpen(false);
    setRestTimerMinimized(true);
    setRestTimerRunning(false);
    setRestTimerStarted(false);
    setRestDeadlineMs(null);
    updateAutoFlowTarget(null);
    updateAutoFlowPrompt(null);
    resumedAfterCompletionRef.current = false;
    setCompletionPageOpen(true);
  };

  const handleDismissCompletionPage = () => {
    if (finalizingRef.current) return;
    setCompletionPageOpen(false);
    resumedAfterCompletionRef.current = true;
    handleStart();
  };

  const handleReset = () => {
    const now = Date.now();
    lastUpdateRef.current = now;
    setNowMs(now);
    setIsRunning(false);
    setDurationSeconds(0);
    setTimeEvents([]);
    restEventOpenRef.current = false;
    setRestTimerRunning(false);
    setRestTimerStarted(false);
    setRestDeadlineMs(null);
    updateAutoFlowTarget(null);
    updateAutoFlowPrompt(null);
    setActiveExerciseId("");
    setExpandedExerciseId("");
    setHasStarted(false);
    setSessionMenuOpen(false);
    toast.message("Cronómetro reiniciado. Tus series se conservaron.");
  };

  const resetState = () => {
    routineLoadRequestRef.current += 1;
    loadedHistoryRoutineRef.current = "";
    removedExerciseIdsRef.current = new Set();
    setRemovedExerciseIds([]);
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRunning(false);
    setTimeEvents([]);
    restEventOpenRef.current = false;
    setRestTimerRunning(false);
    setRestTimerStarted(false);
    setRestDeadlineMs(null);
    updateAutoFlowTarget(null);
    updateAutoFlowPrompt(null);
    setAutoFlowEnabled(false);
    autoFlowEnabledRef.current = false;
    setActiveExerciseId("");
    setExpandedExerciseId("");
    setNowMs(Date.now());
    setDurationSeconds(0);
    setHasStarted(false);
    setSetupStarted(false);
    setPendingSameDayTraining(null);
    setLoadingTraining(false);
    setBranchConfirmed(false);
    setSelectedBranch(DEFAULT_BRANCH);
    setSelectedRoutineId("");
    setSelectedRoutine(null);
    setSelectedPlanContext(null);
    setExercises([]);
    setIsOrderingExercises(false);
    setShowExercisePicker(false);
    setExerciseSearch("");
    setSelectedMuscleGroup("");
    setShowTracking(false);
    setTrackingExerciseId("");
    setTrainingPhotoFile(null);
    setTrainingPhotoPreview("");
    setTrainingPhotoError("");
    setCompletionPageOpen(false);
    resumedAfterCompletionRef.current = false;
    finalizingRef.current = false;
    trainingRequestIdRef.current = "";
    setIsFinalizing(false);
    setSessionDate(todayISO);
    setEditingId("");
    setIsEditing(false);
    setIsHistoryReadOnly(false);
    setHasStarted(false);
    setSessionMenuOpen(false);
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(SNAPSHOT_KEY);
      localStorage.removeItem(TRAINING_ROUTINES_RETURN_KEY);
      localStorage.removeItem("edit_training_id");
      localStorage.removeItem("edit_training_date");
      localStorage.removeItem("view_training_id");
      localStorage.removeItem("view_training_date");
      window.dispatchEvent(new Event("active-training-updated"));
    }
  };
  resetStateRef.current = resetState;

  useEffect(() => {
    const openDefaultTrainingPage = () => resetStateRef.current?.();
    window.addEventListener(
      "open-default-training-page",
      openDefaultTrainingPage,
    );
    return () =>
      window.removeEventListener(
        "open-default-training-page",
        openDefaultTrainingPage,
      );
  }, []);

  const handleSelectRoutine = (id, planContext = null) => {
    if (!id || id === "sin-rutina") return;
    if (sessionLocked) {
      toast.message("Finaliza o cancela la sesión antes de cambiar de rutina.");
      return;
    }
    const found =
      routineOptions.find((r) => r.id === id) ||
      allRoutineOptions.find((r) => r.id === id);
    if (!found) {
      setPendingPlanRoutineId("");
      toast.error("La rutina seleccionada ya no está disponible.");
      return;
    }
    const resolvedPlanContext = resolveRoutinePlanContext(
      found,
      planContext,
      trainingPlans,
    );
    const requestId = routineLoadRequestRef.current + 1;
    routineLoadRequestRef.current = requestId;
    removedExerciseIdsRef.current = new Set();
    setRemovedExerciseIds([]);
    const branch = locationDisabled
      ? ""
      : effectiveBranch || normalizeBranch(found?.location);
    const branchFilter = requiresBranchSelection ? branch : null;
    setSelectedBranch(branch);
    setBranchConfirmed(true);
    setSelectedRoutineId(id);
    setSelectedRoutine(found);
    setSelectedPlanContext(resolvedPlanContext);
    setLoadingTraining(true);
    setPendingSameDayTraining(null);
    setHistoryTrainings([]);
    setPlanHistoryTrainings([]);
    setExercises([]);
    setDurationSeconds(0);
    setIsRunning(false);
    setHasStarted(false);
    setSetupStarted(false);
    setTimeEvents([]);
    setActiveExerciseId("");
    setExpandedExerciseId("");
    setIsOrderingExercises(false);
    setNowMs(Date.now());
    (async () => {
      const historyResult = await loadHistoryForRoutine(id, {
        commit: false,
        planContext: resolvedPlanContext,
      });
      if (routineLoadRequestRef.current !== requestId) return;
      const hist = historyResult.routineHistory;
      loadedHistoryRoutineRef.current = id;
      setHistoryTrainings(hist);
      setPlanHistoryTrainings(historyResult.planHistory);
      const primaryRoutineExercises = (found?.raw?.exercises || []).filter(
        (exercise) => !exercise.isExtra,
      );
      const matchingHist = filterHistoryByMuscleSequences(
        hist,
        primaryRoutineExercises,
      );
      const bestMap = computeBestFromHistory(matchingHist, branchFilter);
      const bestBySetMap = computeBestBySetFromHistory(
        matchingHist,
        branchFilter,
      );
      const recentBySetMap = computeRecentBySetFromHistory(
        matchingHist,
        branchFilter,
      );
      const seriesTypeMap = computeLatestSeriesTypeFromHistory(
        matchingHist,
        id,
        branchFilter,
      );
      const compatibleRecentMap = computeCompatibleRecentBySet(
        [...hist, ...historyResult.planHistory],
        { branch: branchFilter || "" },
      );
      await loadTrainingForDate(
        sessionDate,
        id,
        bestMap,
        bestBySetMap,
        recentBySetMap,
        seriesTypeMap,
        {
          requestId,
          promptForExisting: true,
          compatibleRecentBySetMap: compatibleRecentMap,
        },
      );
    })()
      .catch((error) => {
        if (routineLoadRequestRef.current !== requestId) return;
        console.error("No se pudo preparar la rutina", error);
        setPendingPlanRoutineId("");
        toast.error("No se pudo cargar la rutina seleccionada.");
      })
      .finally(() => {
        if (routineLoadRequestRef.current === requestId) {
          setLoadingTraining(false);
        }
      });
  };

  const handleStartPlanRoutine = (routineId, slotId, selection = {}) => {
    if (!routineId || loadingTraining) return;
    const scheduleOverride = selection.isScheduleOverride
      ? {
          acknowledged: true,
          scheduledDate: selection.scheduledDate || "",
          selectedDayIndex: Number(selection.dayIndex) + 1,
          scheduleMode:
            selection.scheduleMode ||
            activeTrainingPlan?.scheduleMode ||
            "fixed",
          acknowledgedAt: new Date().toISOString(),
        }
      : null;
    const planContext = {
      planId: String(activeTrainingPlan?._id || activeTrainingPlan?.id || ""),
      slotId: String(slotId || ""),
      scheduleOverride,
    };
    setSelectedPlanContext(planContext);
    setPendingPlanRoutineId(String(routineId));
    if (String(selectedRoutineId) !== String(routineId) || !exercises.length) {
      handleSelectRoutine(routineId, planContext);
      return;
    }
    setPendingPlanRoutineId("");
    startSetupSessionRef.current?.();
  };

  useEffect(() => {
    if (
      !pendingPlanRoutineId ||
      loadingTraining ||
      pendingSameDayTraining ||
      String(selectedRoutineId) !== String(pendingPlanRoutineId) ||
      !exercises.length
    ) {
      return;
    }
    setPendingPlanRoutineId("");
    startSetupSessionRef.current?.();
  }, [
    exercises.length,
    loadingTraining,
    pendingPlanRoutineId,
    pendingSameDayTraining,
    selectedRoutineId,
  ]);

  const handleAdvancePlanCycle = async () => {
    if (!activeTrainingPlan || advancingPlanCycle) return;
    setAdvancingPlanCycle(true);
    try {
      const saved = await api.advanceTrainingPlanCycle(
        activeTrainingPlan._id || activeTrainingPlan.id,
      );
      setActiveTrainingPlan(saved);
      toast.success("Ciclo actualizado");
    } catch (error) {
      toast.error(error.message || "No se pudo avanzar el ciclo");
    } finally {
      setAdvancingPlanCycle(false);
    }
  };

  const handleBranchChange = (value) => {
    if (sessionLocked) {
      toast.message("Finaliza o cancela la sesión antes de cambiar de sede.");
      return;
    }
    routineLoadRequestRef.current += 1;
    loadedHistoryRoutineRef.current = "";
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(SNAPSHOT_KEY);
      localStorage.removeItem(TRAINING_ROUTINES_RETURN_KEY);
    }
    setSelectedBranch(normalizeBranch(value));
    setBranchConfirmed(true);
    setSelectedRoutineId(null);
    setSelectedRoutine(null);
    setShowAllRoutineOptions(false);
    setPendingSameDayTraining(null);
    setHistoryTrainings([]);
    setPlanHistoryTrainings([]);
    setLoadingTraining(false);
    setDurationSeconds(0);
    setTimeEvents([]);
    setExercises([]);
    setIsOrderingExercises(false);
    setExpandedExerciseId("");
    setSetupStarted(false);
  };

  const handleReopenBranchSelection = () => {
    if (sessionLocked) return;
    routineLoadRequestRef.current += 1;
    loadedHistoryRoutineRef.current = "";
    setBranchConfirmed(false);
    setSelectedRoutineId(null);
    setSelectedRoutine(null);
    setShowAllRoutineOptions(false);
    setPendingSameDayTraining(null);
    setHistoryTrainings([]);
    setPlanHistoryTrainings([]);
    setExercises([]);
    setLoadingTraining(false);
    setDurationSeconds(0);
    setTimeEvents([]);
  };

  const handleExitEdit = async () => {
    routineLoadRequestRef.current += 1;
    loadedHistoryRoutineRef.current = "";
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("edit_training_id");
      localStorage.removeItem("edit_training_date");
      localStorage.removeItem("view_training_id");
      localStorage.removeItem("view_training_date");
      localStorage.removeItem(SNAPSHOT_KEY);
      localStorage.removeItem(TRAINING_ROUTINES_RETURN_KEY);
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setEditingId("");
    setIsEditing(false);
    setIsHistoryReadOnly(false);
    setHasStarted(false);
    setBranchConfirmed(false);
    setSelectedRoutineId(null);
    setSelectedRoutine(null);
    setPendingSameDayTraining(null);
    setExercises([]);
    setShowExercisePicker(false);
    setExerciseSearch("");
    setSelectedMuscleGroup("");
    setShowTracking(false);
    setTrackingExerciseId("");
    setTrainingPhotoFile(null);
    setTrainingPhotoPreview("");
    setTrainingPhotoError("");
    setHistoryTrainings([]);
    setPlanHistoryTrainings([]);
    setDurationSeconds(0);
    setIsRunning(false);
    setTimeEvents([]);
    setActiveExerciseId("");
    setExpandedExerciseId("");
    setNowMs(Date.now());
  };

  const handleEnableHistoryEdit = () => {
    if (!editingId) return;
    setIsHistoryReadOnly(false);
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("view_training_id");
      localStorage.removeItem("view_training_date");
      localStorage.setItem("edit_training_id", editingId);
      localStorage.setItem("edit_training_date", sessionDate);
    }
    toast.success("Modo edición activado");
  };

  const handleHistoryDateChange = (value) => {
    const nextDate = String(value || getLocalISODate()).slice(0, 10);
    setSessionDate(nextDate);
    if (typeof localStorage !== "undefined" && editingId) {
      localStorage.setItem("edit_training_date", nextDate);
    }
    toast.success(`Nueva fecha: ${formatLongDate(nextDate)}`);
  };

  const handleExitHistoryView = () => {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("view_training_id");
      localStorage.removeItem("view_training_date");
      localStorage.removeItem("edit_training_id");
      localStorage.removeItem("edit_training_date");
    }
    setIsHistoryReadOnly(false);
    setIsEditing(false);
    if (onBack) onBack("admin_sesiones");
    else onNavigate("admin_sesiones");
  };

  const handleSeriesTypeChange = (exerciseId, value) => {
    const nextType = normalizeSeriesType(value);
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              seriesType: nextType,
              sets: ex.sets.map((set) => ({
                ...set,
                entries: normalizeEntries({
                  entries:
                    Array.isArray(set.entries) && set.entries.length
                      ? set.entries
                      : [
                          {
                            id: set.id,
                            previousText: set.previousText,
                            kg: set.kg,
                            reps: set.reps,
                            done: set.done,
                          },
                        ],
                  seriesType: nextType,
                  setId: set.id,
                  fallbackPrev:
                    set.entries?.[0]?.previousText ||
                    set.previousText ||
                    "Sin referencia",
                  previousByIndex: (set.entries || []).map((entry) => ({
                    weight: entry.previousWeight ?? null,
                    reps: entry.previousReps ?? null,
                    date: entry.previousDate ?? null,
                  })),
                  compareByIndex: (set.entries || []).map((entry) => ({
                    weight: entry.previousCompareWeight ?? null,
                    reps: entry.previousCompareReps ?? null,
                    date: entry.previousCompareDate ?? null,
                  })),
                }),
              })),
            }
          : ex,
      ),
    );
  };

  const handleSetupNoteChange = (exerciseId, value) => {
    const setupNote = String(value || "").slice(0, 240);
    setExercises((prev) =>
      prev.map((exercise) =>
        exercise.id === exerciseId
          ? { ...exercise, setupNote, setupNoteEdited: true }
          : exercise,
      ),
    );
  };

  const handleMovementModeChange = (exerciseId, value) => {
    const nextMode = normalizeMovementMode(value);
    setExercises((prev) => {
      const nextList = prev.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              movementMode: nextMode,
              implementCount:
                ex.weightBasis === "per_implement"
                  ? nextMode === "unilateral"
                    ? 1
                    : Math.max(
                        1,
                        Number(
                          ex.bilateralImplementCount ?? ex.implementCount ?? 1,
                        ),
                      )
                  : ex.implementCount,
              reloadMovementHistory: true,
              sets: ex.sets.map((set) => ({
                ...set,
                entries: normalizeEntries({
                  entries: Array.isArray(set.entries) ? set.entries : [],
                  seriesType: ex.seriesType,
                  setId: set.id,
                  fallbackPrev:
                    set.entries?.[0]?.previousText ||
                    set.previousText ||
                    "Sin referencia",
                  previousByIndex: (set.entries || []).map((entry) => ({
                    weight: entry.previousWeight ?? null,
                    reps: entry.previousReps ?? null,
                    date: entry.previousDate ?? null,
                  })),
                  compareByIndex: (set.entries || []).map((entry) => ({
                    weight: entry.previousCompareWeight ?? null,
                    reps: entry.previousCompareReps ?? null,
                    date: entry.previousCompareDate ?? null,
                  })),
                }),
              })),
            }
          : ex,
      );
      const exerciseWithClearedRows = nextList.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              sets: ex.sets.map((set) => ({
                ...set,
                entries: [],
              })),
            }
          : ex,
      );
      return applyHistoryToExercises(
        exerciseWithClearedRows,
        historyBest,
        historyBestBySet,
        historyRecentBySet,
        historySeriesTypeMap,
      );
    });
  };

  const handleSwapVariant = (exerciseId, direction = 1) => {
    setExercises((prev) => {
      const startIndex = prev.findIndex((ex) => ex.id === exerciseId);
      if (startIndex < 0) return prev;
      const target = prev[startIndex];
      const targetVariants = Array.isArray(target.variants)
        ? target.variants
        : [];
      if (targetVariants.length < 2) return prev;
      const nextIndex = wrapIndex(
        (typeof target.variantIndex === "number" ? target.variantIndex : 0) +
          direction,
        targetVariants.length,
      );
      const muscleKey = target.muscle;
      let nextTrackingId = trackingExerciseId;
      const nextList = prev.map((ex, idx) => {
        if (idx < startIndex) return ex;
        if ((ex.muscle || "") !== muscleKey) return ex;
        const variants =
          Array.isArray(ex.variants) && ex.variants.length
            ? ex.variants
            : [
                {
                  exerciseId: ex.id,
                  name: ex.name,
                  muscle: ex.muscle,
                  image: ex.image || "",
                  imagePublicId: ex.imagePublicId || "",
                  supportsUnilateral: Boolean(ex.supportsUnilateral),
                },
              ];
        if (variants.length < 2) return ex;
        const appliedIndex = wrapIndex(nextIndex, variants.length);
        const variant = variants[appliedIndex] || variants[0];
        const shouldReset = !exerciseHasInput(ex);
        let updated = {
          ...ex,
          id: variant.exerciseId,
          name: variant.name,
          muscle: variant.muscle || ex.muscle,
          image: variant.image || ex.image || "",
          imagePublicId: variant.imagePublicId || ex.imagePublicId || "",
          variantIndex: appliedIndex,
          variants,
        };
        if (shouldReset) {
          const template = buildExercisesForRoutine(
            {
              exercises: [
                {
                  exerciseId: variant.exerciseId,
                  name: variant.name,
                  muscle: variant.muscle || ex.muscle,
                  sets: ex.sets?.length || 3,
                  image: variant.image || ex.image || "",
                  imagePublicId:
                    variant.imagePublicId || ex.imagePublicId || "",
                  isExtra: ex.isExtra,
                  supportsUnilateral: Boolean(
                    ex.supportsUnilateral || variant.supportsUnilateral,
                  ),
                  movementMode: normalizeMovementMode(ex.movementMode),
                  seriesType: ex.seriesType,
                },
              ],
            },
            null,
            historyBest,
            historyBestBySet,
            historyRecentBySet,
            historySeriesTypeMap,
            true,
          );
          if (template?.[0]) {
            updated = {
              ...updated,
              ...template[0],
              variants,
              variantIndex: appliedIndex,
            };
          }
        }
        if (nextTrackingId && nextTrackingId === ex.id) {
          nextTrackingId = updated.id;
        }
        return updated;
      });
      if (nextTrackingId !== trackingExerciseId) {
        setTrackingExerciseId(nextTrackingId);
      }
      return applyHistoryToExercises(
        nextList,
        historyBest,
        historyBestBySet,
        historyRecentBySet,
        historySeriesTypeMap,
      );
    });
  };

  const handleAddSet = (exerciseId) => {
    const newSetId = `${exerciseId}-set-${Date.now()}`;
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId
          ? (() => {
              const keys = getExerciseKeys({
                ...ex,
                id: ex.id || exerciseId,
                exerciseId: ex.exerciseId || ex.id || exerciseId,
              }).map((key) => getMovementHistoryKey(key, ex.movementMode));
              const setIndex = ex.sets.length;
              const bestKey = keys.find((key) => historyBestBySet.has(key));
              const bestBySet = bestKey
                ? historyBestBySet.get(bestKey) || []
                : [];
              const recentKey = keys.find((key) => historyRecentBySet.has(key));
              const recentBySet = recentKey
                ? historyRecentBySet.get(recentKey) || []
                : [];
              const perSet = bestBySet[setIndex];
              const recentEntries = recentBySet[setIndex] || [];
              const previousByIndex = recentEntries.map((slot) => slot?.latest);
              const compareByIndex = recentEntries.map(
                (slot) => slot?.previous,
              );
              const fallbackPrev = perSet
                ? formatHistoryLift(perSet)
                : "Sin referencia";
              return {
                ...ex,
                sets: [
                  ...ex.sets,
                  {
                    id: newSetId,
                    prSummary: perSet ? formatHistoryLift(perSet) : "",
                    prBranchLabel: perSet
                      ? getRemoteBranchLabel(perSet.branch, effectiveBranch)
                      : "",
                    entries: normalizeEntries({
                      entries: [
                        {
                          previousText: buildPrevText(
                            previousByIndex[0],
                            fallbackPrev,
                          ),
                          kg: "",
                          reps: "",
                          done: false,
                        },
                      ],
                      seriesType: normalizeSeriesType(ex.seriesType),
                      setId: newSetId,
                      fallbackPrev: buildPrevText(
                        previousByIndex[0],
                        fallbackPrev,
                      ),
                      previousByIndex,
                      compareByIndex,
                    }),
                  },
                ],
              };
            })()
          : ex,
      ),
    );
  };

  const handleUpdateEntry = (exerciseId, setId, entryId, field, value) => {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              sets: ex.sets.map((s) =>
                s.id === setId
                  ? {
                      ...s,
                      entries: (s.entries || []).map((entry) =>
                        entry.id === entryId
                          ? { ...entry, [field]: value, userEdited: true }
                          : entry,
                      ),
                    }
                  : s,
              ),
            }
          : ex,
      ),
    );
  };

  const handleToggleEntry = (exerciseId, setId, entryId) => {
    const targetExercise = exercises.find((ex) => ex.id === exerciseId);
    const targetSet = targetExercise?.sets?.find((set) => set.id === setId);
    const targetEntry = targetSet?.entries?.find(
      (entry) => entry.id === entryId,
    );
    const completesSet =
      targetEntry &&
      !targetEntry.done &&
      (targetSet?.entries || []).every(
        (entry) => entry.id === entryId || entry.done,
      );
    const reopensCompletedSet =
      targetEntry?.done &&
      (targetSet?.entries || []).every((entry) => entry.done);
    const completesExercise =
      targetEntry &&
      !targetEntry.done &&
      targetExercise?.sets?.every((set) => {
        const entries = set.entries || [];
        return entries.length
          ? entries.every((entry) => entry.id === entryId || entry.done)
          : Boolean(set.done);
      });
    const completesRoutine =
      completesExercise &&
      exercises.every((exercise) => {
        if (exercise.id === exerciseId) return true;
        return (exercise.sets || []).every((set) => isSetDone(set));
      });
    const completedAtMs = Date.now();
    if (targetEntry && !targetEntry.done) {
      handleStartExerciseNow(exerciseId, { silent: true });
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.vibrate === "function"
      ) {
        navigator.vibrate(completesExercise ? [18, 24, 18] : 12);
      }
    }
    const completedAt = new Date(completedAtMs).toISOString();
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              sets: ex.sets.map((s) =>
                s.id === setId
                  ? {
                      ...s,
                      entries: (s.entries || []).map((entry) =>
                        entry.id === entryId
                          ? {
                              ...entry,
                              done: !entry.done,
                              completedAt: entry.done ? null : completedAt,
                              userEdited: true,
                            }
                          : entry,
                      ),
                    }
                  : s,
              ),
            }
          : ex,
      ),
    );
    if (completesSet && !isEditing && !isHistoryReadOnly && targetSet) {
      const workEstimate = resolveSetWorkEstimate({
        events: timeEvents,
        exerciseId,
        setId,
        set: targetSet,
        completedAtMs,
      });
      setTimeEvents((prev) => [
        ...prev,
        createTimeEvent("set_complete", exerciseId, completedAtMs, {
          setId,
          ...workEstimate,
        }),
      ]);
    } else if (reopensCompletedSet && !isEditing && !isHistoryReadOnly) {
      setTimeEvents((prev) =>
        removeLatestSetCompletion(prev, exerciseId, setId),
      );
      const pendingTarget = autoFlowTargetRef.current;
      if (
        pendingTarget &&
        String(pendingTarget.exerciseId) === String(exerciseId) &&
        String(pendingTarget.setId) === String(setId)
      ) {
        handleCloseRestTimer();
      }
    }
    if (
      completesSet &&
      !completesRoutine &&
      !isEditing &&
      !isHistoryReadOnly &&
      isAdmin &&
      autoFlowEnabledRef.current
    ) {
      handleStartRestTimer(restDurationSeconds / 60, {
        minimized: false,
        origin: { exerciseId, setId },
        restType: completesExercise ? "between_exercises" : "between_sets",
      });
    }
    if (completesRoutine && !isEditing && !isHistoryReadOnly) {
      pauseForRoutineCompletion();
    }
    if (completesExercise) {
      setExpandedExerciseId((current) =>
        current === exerciseId ? "" : current,
      );
      if (typeof document !== "undefined") {
        window.setTimeout(() => {
          const target = Array.from(
            document.querySelectorAll("[data-exercise-id]"),
          ).find(
            (element) =>
              element.dataset.exerciseId === exerciseId &&
              element.getClientRects().length > 0,
          );
          target?.scrollIntoView({
            behavior: reduceMotion ? "auto" : "smooth",
            block: "center",
          });
        }, 280);
      }
    }
  };

  const handleRemoveSet = (exerciseId, setId) => {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId
          ? { ...ex, sets: ex.sets.filter((s) => s.id !== setId) }
          : ex,
      ),
    );
  };

  const handleRemoveExercise = (exerciseId) => {
    const normalizedExerciseId = String(exerciseId);
    removedExerciseIdsRef.current.add(normalizedExerciseId);
    setRemovedExerciseIds((current) =>
      current.includes(normalizedExerciseId)
        ? current
        : [...current, normalizedExerciseId],
    );
    setExercises((prev) =>
      applyExerciseOrder(prev.filter((ex) => ex.id !== exerciseId)),
    );
    setExpandedExerciseId((current) => (current === exerciseId ? "" : current));
    setActiveExerciseId((current) => (current === exerciseId ? "" : current));
    toast("Ejercicio eliminado solo para hoy");
    if (trackingExerciseId === exerciseId) {
      setShowTracking(false);
      setTrackingExerciseId("");
    }
  };

  const handleAddExtraExercise = (exercise) => {
    if (!exercise) return;
    if (exercises.some((ex) => ex.id === exercise.id)) {
      toast.message("Este ejercicio ya esta en la sesion.");
      return;
    }
    const clone = JSON.parse(JSON.stringify(exercise));
    setExercises((prev) =>
      applyExerciseOrder([...prev, { ...clone, isExtra: true }]),
    );
    toast.success("Ejercicio extra agregado.");
  };

  const addCustomExercise = () => {
    const newExerciseId = `extra-${Date.now()}`;
    const newSetId = `${newExerciseId}-set-1`;
    setExercises((prev) =>
      applyExerciseOrder([
        ...prev,
        {
          id: newExerciseId,
          name: "Nuevo ejercicio",
          prText: "Sin referencia previa",
          muscle: "Sin grupo",
          supportsUnilateral: false,
          movementMode: "bilateral",
          seriesType: "serie",
          sets: [
            {
              id: newSetId,
              entries: normalizeEntries({
                entries: [
                  {
                    previousText: "Sin referencia",
                    kg: "",
                    reps: "",
                    done: false,
                  },
                ],
                seriesType: "serie",
                setId: newSetId,
                fallbackPrev: "Sin referencia",
              }),
            },
          ],
        },
      ]),
    );
  };

  const handleAddExerciseFromLibrary = (exercise) => {
    if (!exercise) return;
    const exerciseId = exercise.id || slugify(exercise.name || "");
    if (!exerciseId) return;
    if (exercises.some((ex) => ex.id === exerciseId)) {
      toast.message("Este ejercicio ya esta en la sesion.");
      return;
    }
    const nameKey = slugify(exercise.name || "");
    const supportsUnilateral = Boolean(exercise.supportsUnilateral);
    const movementMode = "bilateral";
    const keys = [exerciseId, nameKey]
      .filter(Boolean)
      .map((key) => getMovementHistoryKey(key, movementMode));
    const bestKey = pickMapKey(historyBest, keys);
    const globalBestKey = pickMapKey(historyGlobalBest, keys);
    const bestBySetKey = pickMapKey(historyBestBySet, keys);
    const recentBySetKey = pickMapKey(historyRecentBySet, keys);
    const seriesKey = pickMapKey(historySeriesTypeMap, keys);
    const best = bestKey ? historyBest.get(bestKey) : null;
    const globalBest = globalBestKey
      ? historyGlobalBest.get(globalBestKey)
      : null;
    const bestBySet = bestBySetKey
      ? historyBestBySet.get(bestBySetKey) || []
      : [];
    const recentBySet = recentBySetKey
      ? historyRecentBySet.get(recentBySetKey) || []
      : [];
    const seriesFromHistory = seriesKey
      ? historySeriesTypeMap.get(seriesKey)?.type
      : null;
    const seriesType = normalizeSeriesType(
      seriesFromHistory || exercise.seriesType || "serie",
    );
    const prText = best
      ? `Aquí: ${best.weight}kg x ${best.reps} | ${formatShort(best.date)}`
      : "Sin referencia aquí";
    const globalPrText =
      globalBest &&
      (!best ||
        globalBest.weight > best.weight ||
        (globalBest.weight === best.weight &&
          globalBest.reps > (best.reps ?? 0)) ||
        normalizeBranch(globalBest.branch) !== normalizeBranch(effectiveBranch))
        ? `Mejor global: ${globalBest.weight}kg x ${globalBest.reps}${
            locationDisabled ? "" : ` · ${formatBranchLabel(globalBest.branch)}`
          }`
        : "";
    const prSummary = best ? formatHistoryLift(best) : "";
    const perSet = bestBySet[0];
    const perSetSummary = perSet ? formatHistoryLift(perSet) : "";
    const recentEntries = recentBySet[0] || [];
    const previousByIndex = recentEntries.map((slot) => slot?.latest);
    const compareByIndex = recentEntries.map((slot) => slot?.previous);
    const fallbackPrev = perSet
      ? formatHistoryLift(perSet)
      : prSummary || "Sin referencia";
    const newSetId = `${exerciseId}-set-${Date.now()}`;

    setExercises((prev) =>
      applyExerciseOrder([
        ...prev,
        {
          id: exerciseId,
          name: exercise.name || "Ejercicio",
          prText,
          globalPrText,
          prSummary,
          prWeight: best?.weight ?? null,
          image: exercise.image || "",
          imagePublicId: exercise.imagePublicId || "",
          muscle: exercise.muscle || exercise.muscleGroup || "Sin grupo",
          primaryMuscleGroup:
            exercise.primaryMuscleGroup || exercise.muscle || "",
          primaryMuscles: exercise.primaryMuscles || [],
          secondaryMuscles: exercise.secondaryMuscles || [],
          stabilizerMuscles: exercise.stabilizerMuscles || [],
          equipment: exercise.equipment || [],
          loadType: exercise.loadType || "",
          ...inferWeightConfig({ ...exercise, movementMode }),
          supportsUnilateral,
          movementMode,
          seriesType,
          sets: [
            {
              id: newSetId,
              prSummary: perSetSummary,
              prBranchLabel: perSet
                ? getRemoteBranchLabel(perSet.branch, effectiveBranch)
                : "",
              entries: normalizeEntries({
                entries: [
                  {
                    previousText: buildPrevText(
                      previousByIndex[0],
                      fallbackPrev,
                    ),
                    kg: "",
                    reps: "",
                    done: false,
                  },
                ],
                seriesType,
                setId: newSetId,
                fallbackPrev: buildPrevText(previousByIndex[0], fallbackPrev),
                previousByIndex,
                compareByIndex,
              }),
            },
          ],
        },
      ]),
    );
    toast.success("Ejercicio agregado a la sesion.");
  };

  const handleAddExercise = () => {
    setShowExercisePicker(true);
  };

  const handleTrainingPhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!TRAINING_PHOTO_TYPES.has(file.type)) {
      setTrainingPhotoError("Usa una imagen JPG, PNG o WebP");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_TRAINING_PHOTO_BYTES) {
      setTrainingPhotoError("La imagen no puede superar 5 MB");
      event.target.value = "";
      return;
    }
    setTrainingPhotoError("");
    setTrainingPhotoFile(file);
    event.target.value = "";
  };

  const clearTrainingPhoto = () => {
    setTrainingPhotoFile(null);
    setTrainingPhotoError("");
  };

  const getLastCompletedEntryTime = () => {
    const timestamps = exercises.flatMap((ex) =>
      (ex.sets || []).flatMap((set) =>
        (set.entries || [])
          .filter((entry) => entry.done && entry.completedAt)
          .map((entry) => Date.parse(entry.completedAt))
          .filter((time) => Number.isFinite(time)),
      ),
    );
    return timestamps.length ? Math.max(...timestamps) : null;
  };

  const getIncompleteExercisesForFinish = () =>
    exercises.filter((ex) => {
      const sets = Array.isArray(ex.sets) ? ex.sets : [];
      if (!sets.length) return false;
      return !sets.every((set) => isSetDone(set));
    });

  const confirmFinishTraining = async () => {
    if (finalizingRef.current) return;
    finalizingRef.current = true;
    setIsFinalizing(true);
    setFinishWarningOpen(false);
    setFinishWarningExercises([]);
    setSessionMenuOpen(false);
    setDesktopSessionMenuOpen(false);
    const releaseFinalization = () => {
      finalizingRef.current = false;
      setIsFinalizing(false);
    };
    const finishAt = Date.now();
    const lastCompletedAt = getLastCompletedEntryTime();
    const effectiveFinishAt =
      !resumedAfterCompletionRef.current &&
      lastCompletedAt &&
      lastCompletedAt <= finishAt
        ? lastCompletedAt
        : finishAt;
    const effectiveEvents = timeEvents.filter((event) => {
      const eventTime = getEventTime(event);
      return eventTime != null && eventTime <= effectiveFinishAt;
    });
    const effectiveRestWasOpen = hasOpenRestInterval(effectiveEvents);
    restEventOpenRef.current = false;
    const finalTimeEvents = normalizeTimeEvents([
      ...effectiveEvents,
      ...(effectiveRestWasOpen
        ? [createTimeEvent("rest_end", null, effectiveFinishAt)]
        : []),
      ...(timeEvents.length
        ? [createTimeEvent("session_end", null, effectiveFinishAt)]
        : []),
    ]);
    const finalTimingSummary = calculateTimingSummary(
      finalTimeEvents,
      effectiveFinishAt,
    );
    setIsRunning(false);
    setRestTimerRunning(false);
    setRestTimerStarted(false);
    setRestDeadlineMs(null);
    updateAutoFlowTarget(null);
    updateAutoFlowPrompt(null);
    setTimeEvents(finalTimeEvents);
    setNowMs(effectiveFinishAt);
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      if (!selectedRoutineId || !selectedRoutine) {
        toast.error("Selecciona una rutina antes de guardar.");
        releaseFinalization();
        return;
      }
      if (!editingId && !trainingRequestIdRef.current) {
        trainingRequestIdRef.current = createTrainingRequestId();
      }
      const dateStr = sessionDate || getLocalISODate();
      const resolvedPlanContext = resolveRoutinePlanContext(
        selectedRoutine,
        selectedPlanContext,
        trainingPlans,
      );
      const payload = {
        id: editingId ? undefined : trainingRequestIdRef.current,
        date: dateStr,
        routineId: selectedRoutine?.id,
        routineName: selectedRoutine?.name,
        trainingPlanId: resolvedPlanContext?.planId || null,
        trainingPlanSlotId: resolvedPlanContext?.slotId || null,
        scheduleOverride: resolvedPlanContext?.scheduleOverride
          ? {
              ...resolvedPlanContext.scheduleOverride,
              actualDate: dateStr,
            }
          : undefined,
        progressScopeId: selectedRoutine?.progressScopeId || "",
        orderSignature: getExerciseOrderSignature(exercises),
        branch: locationDisabled
          ? null
          : normalizeBranch(effectiveBranch || selectedRoutine?.location),
        durationSeconds: finalTimingSummary.durationSeconds || durationSeconds,
        workSeconds: finalTimingSummary.workSeconds,
        restSeconds: finalTimingSummary.restSeconds,
        preparationSeconds: finalTimingSummary.preparationSeconds,
        pauseSeconds: finalTimingSummary.pauseSeconds,
        timeEvents: finalTimeEvents,
        exerciseDurations: finalTimingSummary.exerciseDurationsPayload,
        exercises: exercises
          .map((ex, exIdx) => {
            const seriesType = normalizeSeriesType(ex.seriesType);
            const sets = (ex.sets || [])
              .map((set, idx) => {
                const entries =
                  Array.isArray(set.entries) && set.entries.length
                    ? set.entries
                    : [
                        {
                          kg: set.kg,
                          reps: set.reps,
                          done: set.done,
                          previousText: set.previousText,
                        },
                      ];
                const entriesPayload = entries.map((entry, entryIdx) => {
                  const shouldPersist = Boolean(
                    entry.done || entry.userEdited || entry.completedAt,
                  );
                  return {
                    weightKg: shouldPersist ? parseDecimal(entry.kg) : null,
                    reps: shouldPersist ? parseDecimal(entry.reps) : null,
                    done: Boolean(entry.done),
                    order: entryIdx + 1,
                    previousText: entry.previousText,
                    completedAt: entry.completedAt || null,
                  };
                });
                const hasValues = entriesPayload.some(
                  (entry) =>
                    entry.weightKg !== null ||
                    entry.reps !== null ||
                    entry.done,
                );
                if (!hasValues) return null;
                const primary = entriesPayload[0] || {};
                const setDone =
                  entriesPayload.length > 0 &&
                  entriesPayload.every((entry) => entry.done);
                return {
                  weightKg: primary.weightKg ?? null,
                  reps: primary.reps ?? null,
                  done: setDone,
                  order: idx + 1,
                  seriesType,
                  entries: entriesPayload,
                };
              })
              .filter(Boolean);
            return {
              exerciseId: ex.id,
              exerciseName: ex.name,
              muscleGroup: ex.muscle,
              primaryMuscleGroup: ex.primaryMuscleGroup || ex.muscle || "",
              primaryMuscles: ex.primaryMuscles || [],
              secondaryMuscles: ex.secondaryMuscles || [],
              stabilizerMuscles: ex.stabilizerMuscles || [],
              equipment: ex.equipment || [],
              loadType: ex.loadType || "",
              weightBasis: normalizeWeightBasis(ex.weightBasis, "legacy"),
              barWeightKg: Math.max(0, Number(ex.barWeightKg || 0)),
              implementCount: Math.min(
                4,
                Math.max(1, Number(ex.implementCount || 1)),
              ),
              order: ex.startedOrder || ex.actualOrder || exIdx + 1,
              plannedOrder: getPlannedExerciseOrder(ex, exIdx),
              actualOrder: ex.startedOrder || ex.actualOrder || exIdx + 1,
              orderContext: getOrderContext(
                getPlannedExerciseOrder(ex, exIdx),
                ex.startedOrder || ex.actualOrder || exIdx + 1,
                Boolean(ex.isExtra),
              ),
              movementMode: normalizeMovementMode(ex.movementMode),
              seriesType,
              setupNote: String(ex.setupNote || "")
                .trim()
                .slice(0, 240),
              sets,
            };
          })
          .filter((ex) => ex.sets.length > 0),
      };
      // verificar duplicados en misma fecha + rutina
      let duplicateTrainingId = "";
      if (selectedRoutine?.id) {
        const existing = await api.getTrainings({
          athleteId: dataOwnerId,
          from: dateStr,
          to: dateStr,
          routineId: selectedRoutine.id,
          limit: 3,
          fields: "_id,id,date,routineId",
          meta: false,
        });
        const dup = (Array.isArray(existing) ? existing : []).find(
          (t) => (t._id || t.id) !== editingId,
        );
        if (dup) {
          const proceed = window.confirm(
            "Ya existe un entrenamiento para esta rutina en esa fecha. ¿Deseas reemplazarlo?",
          );
          if (!proceed) {
            releaseFinalization();
            return;
          }
          duplicateTrainingId = dup._id || dup.id;
        }
      }

      let savedTraining = null;
      if (editingId) {
        savedTraining = await updateTraining(editingId, payload);
        setEditingId("");
        setIsEditing(false);
      } else if (duplicateTrainingId) {
        savedTraining = await updateTraining(duplicateTrainingId, payload);
      } else {
        savedTraining = await addTraining(payload);
      }
      const savedTrainingId = savedTraining?.id || savedTraining?._id || "";
      if (!savedTrainingId) {
        throw new Error("La base de datos no devolvió la sesión guardada");
      }
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("last_training_id", String(savedTrainingId));
      }
      if (savedTraining && trainingPhotoFile) {
        const routineLabel = selectedRoutine?.name
          ? `Entrenamiento - ${selectedRoutine.name}`
          : "Foto en entrenamiento";
        try {
          await addPhoto({
            file: trainingPhotoFile,
            date: dateStr,
            label: routineLabel,
            type: "gym",
            sessionId: String(savedTrainingId),
          });
        } catch (err) {
          console.error("No se pudo subir la foto", err);
          toast.error("No se pudo subir la foto del entrenamiento.");
        }
      }
      (savedTraining?.registrationWarnings || []).forEach((warning) => {
        if (warning?.message) toast.warning(warning.message);
      });
      toast.success("Entrenamiento guardado correctamente.");
      resetState();
      if (typeof onNavigate === "function") {
        window.setTimeout(() => {
          onNavigate("resumen_sesion", { trainingId: savedTrainingId });
        }, 0);
      }
    } catch (err) {
      console.error("No se pudo guardar el entrenamiento", err);
      releaseFinalization();
      toast.error(getTrainingSaveErrorMessage(err));
    }
  };

  const handleFinish = async () => {
    if (finalizingRef.current) return;
    if (!hasRecordedTrainingData(exercises)) {
      toast.error("Registra al menos una serie antes de finalizar.");
      return;
    }
    const incompleteExercises = getIncompleteExercisesForFinish();
    if (incompleteExercises.length) {
      setFinishWarningExercises(incompleteExercises);
      setFinishWarningOpen(true);
      return;
    }
    await confirmFinishTraining();
  };

  const performCancel = () => {
    setSessionMenuOpen(false);
    setDesktopSessionMenuOpen(false);
    setCancelConfirmOpen(false);
    if (isEditing) {
      handleExitEdit();
      toast.message("Edición cancelada");
      return;
    }
    resetState();
    toast.message("Entrenamiento cancelado");
  };

  const handleCancel = () => {
    setSessionMenuOpen(false);
    if (sessionLocked) {
      setCancelConfirmOpen(true);
      return;
    }
    performCancel();
  };

  const totalSets = useMemo(
    () => exercises.reduce((acc, ex) => acc + ex.sets.length, 0),
    [exercises],
  );
  const doneSets = useMemo(
    () =>
      exercises.reduce(
        (acc, ex) => acc + ex.sets.filter((set) => isSetDone(set)).length,
        0,
      ),
    [exercises],
  );
  const calorieEstimate = useMemo(
    () =>
      estimateTrainingCalories(
        {
          durationSeconds,
          workSeconds: timingSummary.workSeconds,
          restSeconds: timingSummary.restSeconds,
          preparationSeconds: timingSummary.preparationSeconds,
          exercises,
        },
        { weightKg: profile?.weight },
      ),
    [
      durationSeconds,
      exercises,
      profile?.weight,
      timingSummary.restSeconds,
      timingSummary.preparationSeconds,
      timingSummary.workSeconds,
    ],
  );
  const allSetsDone = totalSets > 0 && doneSets === totalSets;
  const completedExercises = useMemo(
    () =>
      exercises.reduce(
        (acc, ex) =>
          acc +
          (ex.sets.length > 0 && ex.sets.every((set) => isSetDone(set))
            ? 1
            : 0),
        0,
      ),
    [exercises],
  );
  const sessionComplete = Boolean(
    selectedRoutineId && allSetsDone && !isHistoryReadOnly,
  );
  const showFinishButton =
    !isHistoryReadOnly &&
    (isEditing || hasStarted || isRunning || durationSeconds > 0);
  const showCancelButton =
    !isHistoryReadOnly && (hasStarted || isRunning || durationSeconds > 0);
  const showResetButton =
    !isHistoryReadOnly && (hasStarted || durationSeconds > 0);
  const showMobileTrainingBar =
    isHistoryReadOnly || hasStarted || isRunning || durationSeconds > 0;
  const progressPct = totalSets
    ? Math.min(100, Math.round((doneSets / totalSets) * 100))
    : 0;
  const selectorRoutine = selectedRoutine || null;
  const groupedExercises = useMemo(
    () =>
      buildExerciseDisplayGroups(
        exercises,
        selectedRoutine?.raw?.exerciseOrderMode,
      ),
    [exercises, selectedRoutine?.raw?.exerciseOrderMode],
  );

  const trackingExercise = useMemo(
    () => exercises.find((ex) => ex.id === trackingExerciseId) || null,
    [exercises, trackingExerciseId],
  );
  const trackingExerciseHistoryId =
    trackingExercise?.exerciseId || trackingExercise?.id || "";
  const trackingExerciseHistoryName = trackingExercise?.name || "";
  const activeExercise = useMemo(
    () => exercises.find((ex) => ex.id === activeExerciseId) || null,
    [exercises, activeExerciseId],
  );
  const activeExerciseDuration = activeExerciseId
    ? timingSummary.exerciseDurations.get(activeExerciseId) || 0
    : 0;

  useEffect(() => {
    if (!sessionComplete) {
      completionAnnouncedRef.current = false;
      resumedAfterCompletionRef.current = false;
      setCompletionPageOpen(false);
      if (completionFocusTimerRef.current) {
        window.clearTimeout(completionFocusTimerRef.current);
        completionFocusTimerRef.current = null;
      }
      return undefined;
    }
    if (completionAnnouncedRef.current) return undefined;
    completionAnnouncedRef.current = true;
    if (!resumedAfterCompletionRef.current) {
      setCompletionPageOpen(true);
    }
    completionFocusTimerRef.current = window.setTimeout(
      () => {
        completionFocusTimerRef.current = null;
        const panel = document.querySelector("[data-training-completion]");
        if (!panel) return;
        const toolbar = document.querySelector(
          window.matchMedia("(min-width: 768px)").matches
            ? "[data-training-session-bar]"
            : "[data-training-header]",
        );
        const toolbarBottom = toolbar?.getBoundingClientRect().bottom || 0;
        const targetTop =
          panel.getBoundingClientRect().top +
          window.scrollY -
          toolbarBottom -
          14;
        window.scrollTo({
          top: Math.max(0, targetTop),
          behavior: reduceMotion ? "auto" : "smooth",
        });
      },
      reduceMotion ? 100 : 720,
    );

    return () => {
      if (completionFocusTimerRef.current) {
        window.clearTimeout(completionFocusTimerRef.current);
        completionFocusTimerRef.current = null;
      }
    };
  }, [reduceMotion, sessionComplete]);

  useEffect(() => {
    if (
      !showTracking ||
      (!trackingExerciseHistoryId && !trackingExerciseHistoryName)
    ) {
      setGeneralHistoryTrainings([]);
      setGeneralHistoryError("");
      return;
    }

    let cancelled = false;
    setLoadingGeneralHistory(true);
    setGeneralHistoryError("");
    api
      .getExerciseHistory({
        athleteId: dataOwnerId,
        exerciseId: trackingExerciseHistoryId,
        exerciseName: trackingExerciseHistoryName,
      })
      .then((resp) => {
        if (cancelled) return;
        const list = Array.isArray(resp) ? resp : resp?.items || [];
        setGeneralHistoryTrainings(list);
      })
      .catch((error) => {
        if (cancelled) return;
        console.warn("No se pudo cargar el seguimiento general", error);
        setGeneralHistoryTrainings([]);
        setGeneralHistoryError(
          error.message || "No se pudo cargar el seguimiento general.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingGeneralHistory(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    dataOwnerId,
    generalHistoryReloadKey,
    showTracking,
    trackingExerciseHistoryId,
    trackingExerciseHistoryName,
  ]);

  const extraExerciseOptions = useMemo(() => {
    const routineExtras = selectedRoutine?.raw?.exercises || [];
    const extras = routineExtras.filter((ex) => ex.isExtra);
    if (!extras.length) return [];
    return buildExercisesForRoutineRef.current(
      { exercises: extras },
      null,
      historyBest,
      historyBestBySet,
      historyRecentBySet,
      historySeriesTypeMap,
      true,
    );
  }, [
    selectedRoutine,
    historyBest,
    historyBestBySet,
    historyRecentBySet,
    historySeriesTypeMap,
  ]);

  const trackingRows = useMemo(
    () => buildExerciseTrackingRows(trackingExercise, historyTrainings),
    [trackingExercise, historyTrainings],
  );

  const planTrackingRows = useMemo(
    () => buildExerciseTrackingRows(trackingExercise, planHistoryTrainings),
    [trackingExercise, planHistoryTrainings],
  );

  const generalTrackingRows = useMemo(
    () => buildExerciseTrackingRows(trackingExercise, generalHistoryTrainings),
    [trackingExercise, generalHistoryTrainings],
  );

  const visibleTrackingRows =
    historyViewScope === "plan"
      ? planTrackingRows
      : historyViewScope === "general"
        ? generalTrackingRows
        : trackingRows;

  const trackingSetCount = useMemo(() => {
    if (!visibleTrackingRows.length) return 0;
    return visibleTrackingRows.reduce(
      (acc, row) => Math.max(acc, row.sets.length),
      0,
    );
  }, [visibleTrackingRows]);
  const restProgressPct = restDurationSeconds
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round(
            ((restDurationSeconds - restRemainingSeconds) /
              restDurationSeconds) *
              100,
          ),
        ),
      )
    : 0;
  const restTimerDone = restTimerStarted && restRemainingSeconds <= 0;
  const restTimerLabel = restTimerDone
    ? "Listo"
    : formatDuration(restRemainingSeconds);
  const showAutoRestCountdown = Boolean(
    isAdmin &&
    autoFlowEnabled &&
    autoFlowTarget &&
    !autoFlowPrompt &&
    restTimerOpen &&
    !restTimerMinimized &&
    restTimerStarted,
  );
  const showAutoRestComplete = Boolean(
    isAdmin &&
    autoFlowEnabled &&
    autoFlowPrompt &&
    restTimerOpen &&
    !restTimerMinimized,
  );

  if (completionPageOpen && sessionComplete) {
    return (
      <TrainingCompletePage
        routineName={selectorRoutine?.name || "Entrenamiento"}
        heroImage={getTrainingCompletionHeroImage(selectorRoutine)}
        completedExercises={completedExercises}
        totalExercises={exercises.length}
        totalSets={totalSets}
        durationLabel={formatDuration(durationSeconds)}
        calorieEstimate={calorieEstimate}
        isFinalizing={isFinalizing}
        onFinish={handleFinish}
        onDismiss={handleDismissCompletionPage}
      />
    );
  }

  return (
    <main className="training-shell relative min-h-0 w-full max-w-full overflow-x-clip bg-[color:var(--bg)] text-[color:var(--text)]">
      <div
        className={`relative mx-auto w-full max-w-full min-w-0 overflow-x-clip md:max-w-5xl md:px-4 lg:max-w-7xl 2xl:max-w-[1500px] space-y-4 ${
          showMobileTrainingBar
            ? sessionComplete
              ? "pt-[7.75rem] md:pt-4"
              : "pt-14 md:pt-4"
            : !setupStarted && !isEditing
              ? "pt-0 md:pt-4"
              : "pt-4"
        } ${!setupStarted && !isEditing ? "pb-0" : "pb-28"}`}
      >
        {showMobileTrainingBar && (
          <div
            data-training-header
            className="fixed left-0 right-0 top-0 z-40 border-b border-[color:var(--border)] bg-[color:var(--bg)]/96 px-3 py-2 backdrop-blur md:hidden"
          >
            <div className="mx-auto flex max-w-md items-center gap-1.5">
              {isHistoryReadOnly ? (
                <button
                  type="button"
                  onClick={handleExitHistoryView}
                  className="grid h-10 w-10 shrink-0 place-items-center text-[color:var(--text)]"
                  aria-label="Volver al historial"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              ) : (
                <>
                  <MobileMenuButton />
                  <button
                    type="button"
                    onClick={() => setSessionMenuOpen(true)}
                    className="overflow-menu-trigger !h-10 !w-10"
                    aria-label="Opciones del entrenamiento"
                    aria-expanded={sessionMenuOpen}
                    aria-haspopup="menu"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </>
              )}
              <div className="min-w-0 flex-1" />
              {isEditing && !isHistoryReadOnly ? (
                <label
                  className="relative grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--text)]"
                  title={`Cambiar fecha: ${formatLongDate(sessionDate)}`}
                  aria-label={`Cambiar fecha de la sesión. Fecha actual: ${formatLongDate(sessionDate)}`}
                >
                  <CalendarDays className="h-4 w-4" />
                  <input
                    type="date"
                    value={sessionDate}
                    max={todayISO}
                    onChange={(event) =>
                      handleHistoryDateChange(event.target.value)
                    }
                    className="absolute inset-0 cursor-pointer opacity-0"
                    aria-label="Seleccionar nueva fecha de la sesión"
                  />
                </label>
              ) : null}
              {isHistoryReadOnly ? (
                <div className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[color:var(--card)] px-2 font-mono text-sm font-black text-[color:var(--text)] dark:rounded-[3px]">
                  <Timer className="h-4 w-4 text-[color:var(--text-muted)]" />
                  {formatDuration(durationSeconds)}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={isRunning ? handlePause : handleStart}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-[color:var(--card)] px-2 font-mono text-sm font-black text-[color:var(--text)]"
                  aria-label={`${isRunning ? "Pausar" : "Reanudar"} entrenamiento, ${formatDuration(durationSeconds)}`}
                >
                  <Timer className="h-4 w-4 text-[color:var(--text-muted)]" />
                  {formatDuration(durationSeconds)}
                </button>
              )}
              {!isHistoryReadOnly && !sessionComplete ? (
                <button
                  type="button"
                  onClick={handleOpenRestTimer}
                  className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[color:var(--border)] ${
                    restTimerRunning
                      ? "bg-[#352018] text-white dark:bg-[#e2ff00] dark:text-black"
                      : "bg-[color:var(--card)] text-[color:var(--text)]"
                  }`}
                  aria-label="Abrir temporizador de descanso"
                >
                  <Hourglass className="h-4 w-4" />
                  {restTimerStarted ? (
                    <span className="absolute -right-1.5 -top-1.5 rounded-full bg-[#352018] px-1 text-[8px] font-black text-white dark:bg-[#e2ff00] dark:text-black">
                      {restTimerLabel}
                    </span>
                  ) : null}
                </button>
              ) : null}
              {isHistoryReadOnly ? (
                <button
                  type="button"
                  onClick={handleEnableHistoryEdit}
                  className="theme-accent-solid inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-black uppercase dark:rounded-[3px]"
                >
                  <Pencil className="h-4 w-4" />
                  Editar rutina
                </button>
              ) : showFinishButton ? (
                <motion.button
                  type="button"
                  onClick={handleFinish}
                  disabled={!exercises.length || isFinalizing}
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#352018] px-0 text-xs font-black uppercase text-white disabled:opacity-60 min-[360px]:flex min-[360px]:w-auto min-[360px]:gap-1.5 min-[360px]:px-3 dark:bg-[#e2ff00] dark:text-black ${
                    sessionComplete
                      ? "shadow-[0_0_0_4px_rgba(53,32,24,0.14)] dark:shadow-[0_0_0_4px_rgba(226,255,0,0.12)]"
                      : ""
                  }`}
                  initial={false}
                  animate={
                    sessionComplete && !reduceMotion
                      ? { scale: [1, 1.12, 1] }
                      : { scale: 1 }
                  }
                  transition={{ duration: 0.65, delay: 0.18 }}
                  aria-label={
                    isFinalizing
                      ? "Finalizando entrenamiento"
                      : "Finalizar entrenamiento"
                  }
                >
                  {isFinalizing ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Flag className="h-4 w-4" />
                  )}
                  <span className="hidden min-[360px]:inline">
                    {isFinalizing ? "Finalizando" : "Finalizar"}
                  </span>
                </motion.button>
              ) : null}
            </div>
            <AnimatePresence initial={false}>
              {sessionComplete ? (
                <motion.div
                  data-training-complete-summary
                  initial={
                    reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }
                  }
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: reduceMotion ? 0 : 0.3 }}
                  className="mx-auto mt-2 grid max-w-md grid-cols-[minmax(0,1fr)_auto_auto] items-center border-t border-[#352018]/25 pt-2 dark:border-[#e2ff00]/25"
                >
                  <div className="min-w-0 pr-3">
                    <p className="font-condensed text-[9px] font-black uppercase text-[#352018] dark:text-[#e2ff00]">
                      Rutina activa
                    </p>
                    <p className="truncate font-condensed text-[15px] font-black uppercase leading-none">
                      {selectorRoutine?.name || "Rutina completada"}
                    </p>
                  </div>
                  <div className="border-l border-[color:var(--border)] px-3 text-center">
                    <p className="font-condensed text-[9px] font-black uppercase text-[color:var(--text-muted)]">
                      Completado
                    </p>
                    <p className="font-condensed text-base font-black leading-none text-[#352018] dark:text-[#e2ff00]">
                      {completedExercises}/{exercises.length}
                    </p>
                  </div>
                  <div className="border-l border-[color:var(--border)] pl-3 text-center">
                    <p className="font-condensed text-[9px] font-black uppercase text-[color:var(--text-muted)]">
                      Total series
                    </p>
                    <p className="font-condensed text-base font-black leading-none">
                      {totalSets}
                    </p>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        )}

        {sessionMenuOpen && showMobileTrainingBar ? (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/50"
              aria-label="Cerrar menu"
              onClick={() => setSessionMenuOpen(false)}
            />
            <div className="overflow-menu-sheet absolute inset-x-0 bottom-0 rounded-t-3xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-2xl">
              <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-[color:var(--border)]" />
              <div className="space-y-2">
                {isAdmin ? (
                  <AdminAutoFlowControl
                    enabled={autoFlowEnabled}
                    durationSeconds={restDurationSeconds}
                    onToggle={handleAutoFlowToggle}
                    onDurationChange={handleAutoFlowDurationChange}
                  />
                ) : null}
                <button
                  type="button"
                  className="flex h-12 w-full items-center justify-between rounded-2xl bg-[color:var(--bg)] px-4 text-sm font-bold text-[color:var(--text)]"
                  onClick={() => {
                    setSessionMenuOpen(false);
                    if (isRunning) handlePause();
                    else handleStart();
                  }}
                >
                  <span>
                    {isRunning ? "Pausar cronometro" : "Reanudar entrenamiento"}
                  </span>
                  {isRunning ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  className="flex h-12 w-full items-center justify-between rounded-2xl bg-[color:var(--bg)] px-4 text-sm font-bold text-[color:var(--text)]"
                  onClick={() => {
                    setSessionMenuOpen(false);
                    handleEditRoutineFromTraining();
                  }}
                >
                  <span>Editar rutina activa</span>
                  <ClipboardList className="h-4 w-4" />
                </button>
                <div className="flex h-12 w-full items-center justify-between rounded-2xl bg-[color:var(--bg)] px-4 text-sm font-bold text-[color:var(--text)]">
                  <span>Apariencia</span>
                  <ThemeToggle compact />
                </div>
                <button
                  type="button"
                  className="flex h-12 w-full items-center justify-between rounded-2xl border border-red-500/25 bg-red-500/10 px-4 text-sm font-bold text-red-700 dark:text-red-300"
                  onClick={handleCancel}
                >
                  <span>Cancelar entrenamiento</span>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                className="mt-3 h-11 w-full rounded-2xl border border-[color:var(--border)] text-sm font-bold text-[color:var(--text-muted)]"
                onClick={() => setSessionMenuOpen(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : null}

        <div
          className={`hidden items-center justify-between md:flex ${
            !setupStarted && !isEditing
              ? "md:mx-auto md:w-full md:max-w-4xl"
              : ""
          }`}
        >
          <h1 className="training-page-desktop-title">
            {isHistoryReadOnly
              ? "Entrenamiento registrado"
              : "Registrar entrenamiento"}
          </h1>
          <div className="flex items-center gap-2">
            {!setupStarted && !isEditing ? (
              <DevTrainingDateControl
                value={sessionDate}
                onChange={handleDevTrainingDateChange}
              />
            ) : null}
            {isHistoryReadOnly ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExitHistoryView}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Historial
                </Button>
                <Button
                  size="sm"
                  className="theme-accent-solid"
                  onClick={handleEnableHistoryEdit}
                >
                  <Pencil className="h-4 w-4" />
                  Editar rutina
                </Button>
              </>
            ) : isEditing ? (
              <Button variant="outline" size="sm" onClick={handleExitEdit}>
                Salir de edición
              </Button>
            ) : null}
          </div>
        </div>

        {!setupStarted && !isEditing ? (
          <section className="training-setup-page mx-auto flex min-h-[calc(100dvh-96px)] w-full max-w-md flex-col px-[6px] pb-28 md:min-h-0 md:max-w-4xl md:px-0 md:pb-0">
            <MobilePageHeader
              title="Entrenar"
              className="training-setup-page__header"
              actions={
                <>
                  <DevTrainingDateControl
                    value={sessionDate}
                    onChange={handleDevTrainingDateChange}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      window.dispatchEvent(new Event("open-main-menu"))
                    }
                    className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-[color:var(--border)] bg-[color:var(--card)]"
                    aria-label="Abrir menú principal"
                  >
                    <ProfileAvatar
                      photoId={
                        profile?.avatarPhotoId ||
                        authUser?.profile?.avatarPhotoId
                      }
                      name={profile?.name || authUser?.name}
                      className="h-full w-full"
                      fallbackClassName="bg-[#ead8dd] text-sm font-semibold text-[#4a2430]"
                    />
                  </button>
                </>
              }
            />

            <div className="training-setup-page__content space-y-8">
              {requiresBranchSelection ? (
                <div className="space-y-4">
                  <SetupStep
                    number={1}
                    title="Seleccionar sucursal"
                    subtitle="¿Dónde vas a entrenar hoy?"
                    active={!branchConfirmed}
                    done={branchConfirmed}
                  />

                  <div className="space-y-3">
                    {branchConfirmed ? (
                      <BranchCard
                        branch={selectedBranch}
                        selected
                        compact
                        onClick={handleReopenBranchSelection}
                      />
                    ) : (
                      branchOptions.map((branch) => (
                        <BranchCard
                          key={branch}
                          branch={branch}
                          selected={false}
                          onClick={() => handleBranchChange(branch)}
                        />
                      ))
                    )}
                  </div>
                </div>
              ) : null}

              {branchReady ? (
                <div className="training-setup-page__planner-fullbleed">
                  <ActivePlanWorkoutPlanner
                    plan={activeTrainingPlan}
                    routines={allRoutineOptions}
                    trainings={trainings}
                    loading={trainingPlanLoading || routinesLoading}
                    error={trainingPlanError || routinesError}
                    selectedWeek={selectedPlanWeek}
                    currentDate={sessionDate}
                    onRetry={() => {
                      loadActiveTrainingPlan();
                      reloadRoutines?.();
                    }}
                    onOpenPlans={() => onNavigate?.("rutinas")}
                    onStart={handleStartPlanRoutine}
                    onAdvance={handleAdvancePlanCycle}
                    advancing={advancingPlanCycle}
                    preparingRoutineId={pendingPlanRoutineId}
                    weightKg={profile?.weight}
                  />
                </div>
              ) : null}

              {branchReady &&
              import.meta.env.VITE_SHOW_LEGACY_ROUTINE_PICKER === "true" ? (
                <div className="space-y-5 bg-[#f5f5f5] p-4 text-[#1a1a1a] shadow-sm dark:bg-black dark:text-white md:border md:border-[#d8d8d8] md:dark:border-[#252525]">
                  <div className="relative grid grid-cols-3 gap-2 pb-2">
                    <div className="absolute left-[16.66%] right-[16.66%] top-3.5 h-1 bg-[#e2e2e5] dark:bg-[#252525]" />
                    {(requiresBranchSelection
                      ? [
                          { number: 1, label: "Sucursal", state: "done" },
                          { number: 2, label: "Rutina", state: "active" },
                          { number: 3, label: "Inicio", state: "next" },
                        ]
                      : [
                          { number: 1, label: "Rutina", state: "active" },
                          { number: 2, label: "Revisión", state: "next" },
                          { number: 3, label: "Inicio", state: "next" },
                        ]
                    ).map((step) => (
                      <div
                        key={step.number}
                        className="relative z-10 flex flex-col items-center"
                      >
                        <span
                          className={`font-condensed grid h-8 w-8 place-items-center rounded-full border text-sm font-bold ${
                            step.state === "active"
                              ? "border-[#352018] bg-[#352018] text-white dark:border-[#e2ff00] dark:bg-[#e2ff00] dark:text-black"
                              : step.state === "done"
                                ? "border-[#1a1a1a] bg-[#1a1a1a] text-white dark:border-white dark:bg-white dark:text-black"
                                : "border-[#60443e] bg-[#f5f5f5] text-[#1a1a1a] dark:border-white dark:bg-black dark:text-white"
                          }`}
                        >
                          {step.state === "done" ? (
                            <Check className="h-4 w-4 stroke-[3]" />
                          ) : (
                            step.number
                          )}
                        </span>
                        <span className="font-condensed mt-2 text-xs font-bold uppercase text-[#472d28] dark:text-white">
                          {step.label}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <h2 className="font-condensed text-3xl font-bold uppercase leading-none text-[#1a1a1a] dark:text-white">
                      Selecciona tu rutina
                    </h2>
                    <p className="mt-2 text-sm font-medium text-[#6d6462] dark:text-[#a8a8a8]">
                      Elige el entrenamiento que realizarás hoy.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {routinesLoading ? (
                      <div
                        className="border border-[color:var(--accent)] bg-[color:var(--accent)] p-5 text-sm font-bold text-[color:var(--accent-contrast)]"
                        role="status"
                      >
                        Cargando rutinas...
                      </div>
                    ) : routinesError ? (
                      <div className="space-y-3 border border-red-300 bg-red-50 p-5 text-sm font-semibold text-red-800 dark:border-red-500/35 dark:bg-red-500/10 dark:text-red-200">
                        <p>No se pudieron cargar tus rutinas.</p>
                        <button
                          type="button"
                          className="h-10 border border-current px-4 font-bold uppercase"
                          onClick={() => reloadRoutines?.()}
                        >
                          Reintentar
                        </button>
                      </div>
                    ) : routineOptions.length ? (
                      <>
                        <div className="grid gap-3">
                          {visibleRoutineOptions.map((routine) => (
                            <RoutineSetupCard
                              key={routine.id}
                              routine={routine}
                              selected={routine.id === selectedRoutineId}
                              onClick={() => handleSelectRoutine(routine.id)}
                            />
                          ))}
                        </div>
                        {routineOptions.length > 3 ? (
                          <button
                            type="button"
                            className="font-condensed h-11 w-full border border-[#8e8e93] bg-transparent text-sm font-bold uppercase tracking-[0.08em] text-[#1a1a1a] hover:border-[#352018] hover:text-[#2a1711] dark:border-[#4a4a4a] dark:text-white dark:hover:border-[#e2ff00] dark:hover:text-[#e2ff00]"
                            onClick={() =>
                              setShowAllRoutineOptions((current) => !current)
                            }
                          >
                            {showAllRoutineOptions
                              ? "Mostrar menos"
                              : `Ver ${routineOptions.length - visibleRoutineOptions.length} rutinas más`}
                          </button>
                        ) : null}
                      </>
                    ) : (
                      <div className="border border-dashed border-[#8e8e93] bg-[#fbfaff] p-5 text-sm font-semibold text-[#6d6462] dark:border-[#4a4a4a] dark:bg-[#1b1b1b] dark:text-[#a8a8a8]">
                        <p>
                          {locationDisabled
                            ? "No hay rutinas disponibles."
                            : `No hay rutinas disponibles para ${getBranchTitle(effectiveBranch)}.`}
                        </p>
                        {!locationDisabled && allRoutineOptions.length ? (
                          <p className="mt-2 text-[13px] font-medium">
                            Tienes {allRoutineOptions.length} rutina(s)
                            asignadas a otra sucursal.
                          </p>
                        ) : null}
                      </div>
                    )}
                    {loadingTraining ? (
                      <div className="border border-[color:var(--accent)] bg-[color:var(--accent)] p-4 text-sm font-bold text-[color:var(--accent-contrast)]">
                        Preparando rutina e historial...
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="hidden fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 mt-auto border-t border-[#1a1a1a] bg-[#f5f5f5]/95 px-3 py-3 backdrop-blur dark:border-[#252525] dark:bg-[#121212]/95 md:static md:mt-4 md:border md:border-[#d8d8d8] md:dark:border-[#252525]">
              <div className="mx-auto w-full max-w-md md:max-w-none">
                <Button
                  className="font-condensed h-12 w-full rounded-none border-0 !bg-[#352018] text-xl font-bold uppercase tracking-[0.04em] text-white shadow-none hover:!bg-[#482b20] focus-visible:ring-[#352018] disabled:!bg-[#d6d4d4] disabled:text-[#8e8e93] dark:!bg-[#e2ff00] dark:text-black dark:hover:!bg-[#cbe600] dark:focus-visible:ring-[#e2ff00] dark:disabled:!bg-[#343434] dark:disabled:text-[#777]"
                  disabled={
                    !branchReady ||
                    !selectedRoutineId ||
                    loadingTraining ||
                    Boolean(pendingSameDayTraining)
                  }
                  onClick={handleStartSetupSession}
                >
                  {loadingTraining
                    ? "Cargando rutina"
                    : pendingSameDayTraining
                      ? "Elige cómo continuar"
                      : "Iniciar entrenamiento"}
                  <ArrowRight className="h-4 w-4 stroke-[3]" />
                </Button>
              </div>
            </div>
          </section>
        ) : null}

        {setupStarted || isEditing ? (
          <div
            data-training-session-bar
            className="hidden md:sticky md:top-2 md:z-20 md:block"
          >
            <Card
              className={`overflow-visible border bg-[color:var(--card)]/95 p-0 backdrop-blur transition-[border-color,box-shadow] ${
                sessionComplete
                  ? "border-[#352018]/60 shadow-[0_12px_32px_rgba(53,32,24,0.14)] dark:border-[#e2ff00]/55 dark:shadow-[0_12px_34px_rgba(226,255,0,0.09)]"
                  : "border-[color:var(--border)] shadow-lg"
              }`}
            >
              <div className="flex min-h-[76px] items-center gap-5 px-5 py-3">
                <div className="grid min-w-[360px] flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-5">
                  <div className="min-w-0">
                    {sessionComplete ? (
                      <div className="flex items-center gap-3">
                        <motion.span
                          aria-hidden="true"
                          initial={reduceMotion ? false : { scale: 0.6 }}
                          animate={{ scale: 1 }}
                          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#352018] text-white dark:bg-[#e2ff00] dark:text-black"
                        >
                          <Check className="h-5 w-5 stroke-[3]" />
                        </motion.span>
                        <div className="min-w-0">
                          <p className="font-condensed text-[10px] font-black uppercase text-[#352018] dark:text-[#e2ff00]">
                            Rutina completada
                          </p>
                          <div className="mt-0.5 flex min-w-0 items-center gap-2">
                            <p className="truncate font-condensed text-xl font-black uppercase leading-none">
                              {selectorRoutine?.name || "Entrenamiento"}
                            </p>
                            <Badge variant="completed">Completada</Badge>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="font-condensed text-[10px] font-black uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                          Rutina activa
                        </p>
                        <p className="mt-1 truncate font-condensed text-xl font-black uppercase leading-none text-[#352018] dark:text-[#e2ff00]">
                          {selectorRoutine?.name || "Rutina seleccionada"}
                        </p>
                      </>
                    )}
                  </div>

                  <div className="min-w-[180px] border-l border-[color:var(--border)] pl-5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                      Duración
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-mono text-2xl leading-none text-[color:var(--text)]">
                        {formatDuration(durationSeconds)}
                      </span>
                      <Badge
                        variant={
                          isHistoryReadOnly
                            ? "completed"
                            : isRunning
                              ? "active"
                              : "paused"
                        }
                      >
                        {isHistoryReadOnly
                          ? "Registrado"
                          : isRunning
                            ? "En curso"
                            : "Pausado"}
                      </Badge>
                    </div>
                    {activeExercise ? (
                      <p className="mt-1 max-w-[220px] truncate text-[11px] text-[color:var(--text-muted)]">
                        Actual: {activeExercise.name} ·{" "}
                        {formatDuration(activeExerciseDuration)}
                      </p>
                    ) : null}
                  </div>
                </div>
                {!isHistoryReadOnly ? (
                  <div className="flex shrink-0 items-center gap-2">
                    {!sessionComplete ? (
                      <>
                        <Button
                          type="button"
                          variant={restTimerRunning ? "accentSolid" : "outline"}
                          className="h-10 min-w-[112px] rounded-md px-3"
                          onClick={handleOpenRestTimer}
                        >
                          <Hourglass className="h-4 w-4" />
                          <span>
                            {restTimerStarted ? restTimerLabel : "Descanso"}
                          </span>
                        </Button>
                        <Button
                          variant="outline"
                          className="h-10 min-w-[116px] rounded-md px-4"
                          onClick={isRunning ? handlePause : handleStart}
                        >
                          {isRunning ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                          <span>{isRunning ? "Pausar" : "Reanudar"}</span>
                        </Button>
                      </>
                    ) : null}
                    {showFinishButton ? (
                      <motion.div
                        initial={false}
                        animate={
                          sessionComplete && !reduceMotion
                            ? { scale: [1, 1.035, 1] }
                            : { scale: 1 }
                        }
                        transition={{ duration: 0.7, delay: 0.2 }}
                      >
                        <Button
                          className={`h-10 rounded-md px-4 ${
                            sessionComplete ? "min-w-[190px]" : "min-w-[126px]"
                          }`}
                          onClick={handleFinish}
                          disabled={!exercises.length || isFinalizing}
                        >
                          {isFinalizing ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                          ) : (
                            <Flag className="h-4 w-4" />
                          )}
                          <span>
                            {isFinalizing
                              ? "Finalizando"
                              : sessionComplete
                                ? "Finalizar entrenamiento"
                                : "Finalizar"}
                          </span>
                        </Button>
                      </motion.div>
                    ) : null}
                    <div className="relative" ref={desktopSessionMenuRef}>
                      <Button
                        type="button"
                        variant="outline"
                        className="overflow-menu-trigger !h-10 !w-10 !p-0"
                        onClick={() =>
                          setDesktopSessionMenuOpen((current) => !current)
                        }
                        aria-expanded={desktopSessionMenuOpen}
                        aria-haspopup="menu"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                      {desktopSessionMenuOpen ? (
                        <div
                          role="menu"
                          className="overflow-menu-panel absolute right-0 top-[calc(100%+0.5rem)] z-40 w-64"
                        >
                          {isAdmin ? (
                            <div className="mb-1.5">
                              <AdminAutoFlowControl
                                enabled={autoFlowEnabled}
                                durationSeconds={restDurationSeconds}
                                onToggle={handleAutoFlowToggle}
                                onDurationChange={handleAutoFlowDurationChange}
                              />
                            </div>
                          ) : null}
                          <button
                            type="button"
                            role="menuitem"
                            className="flex h-11 w-full items-center gap-3 px-3 text-left text-sm font-bold text-[color:var(--text)] transition-colors hover:bg-[color:var(--bg)]"
                            onClick={() => {
                              setDesktopSessionMenuOpen(false);
                              handleEditRoutineFromTraining();
                            }}
                          >
                            <ClipboardList className="h-4 w-4 text-[color:var(--text-muted)]" />
                            Editar rutina
                          </button>
                          {showResetButton ? (
                            <button
                              type="button"
                              role="menuitem"
                              className="flex h-11 w-full items-center gap-3 px-3 text-left text-sm font-bold text-[color:var(--text)] transition-colors hover:bg-[color:var(--bg)]"
                              onClick={() => {
                                setDesktopSessionMenuOpen(false);
                                handleReset();
                              }}
                            >
                              <RotateCcw className="h-4 w-4 text-[color:var(--text-muted)]" />
                              Reiniciar cronometro
                            </button>
                          ) : null}
                          {showCancelButton ? (
                            <>
                              <div className="my-1 border-t border-[color:var(--border)]" />
                              <button
                                type="button"
                                role="menuitem"
                                className="flex h-11 w-full items-center gap-3 px-3 text-left text-sm font-bold text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-300"
                                onClick={handleCancel}
                              >
                                <X className="h-4 w-4" />
                                Cancelar entrenamiento
                              </button>
                            </>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="flex min-h-11 items-center justify-between gap-4 border-t border-[color:var(--border)] bg-[color:var(--bg)]/55 px-5 py-2 text-xs text-[color:var(--text-muted)]">
                <button
                  type="button"
                  onClick={() => {
                    if (sessionLocked) return;
                    if (datePickerRef.current?.showPicker) {
                      datePickerRef.current.showPicker();
                    } else if (datePickerRef.current) {
                      datePickerRef.current.focus();
                      datePickerRef.current.click();
                    }
                  }}
                  disabled={sessionLocked || isHistoryReadOnly}
                  className="relative inline-flex shrink-0 items-center gap-2 font-semibold text-[color:var(--text)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CalendarDays className="h-4 w-4 text-[color:var(--text-muted)]" />
                  {formatLongDate(sessionDate)}
                  <input
                    ref={datePickerRef}
                    type="date"
                    value={sessionDate}
                    disabled={sessionLocked || isHistoryReadOnly}
                    max={isEditing ? todayISO : undefined}
                    onChange={(e) =>
                      isEditing
                        ? handleHistoryDateChange(e.target.value)
                        : setSessionDate(
                            e.target.value
                              ? e.target.value.slice(0, 10)
                              : getLocalISODate(),
                          )
                    }
                    className="absolute inset-0 cursor-pointer opacity-0"
                    aria-label="Seleccionar fecha"
                  />
                </button>
                <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
                  <strong className="shrink-0 text-sm text-[color:var(--text)]">
                    {doneSets}/{totalSets} series
                  </strong>
                  <div
                    className="h-1.5 min-w-20 max-w-56 flex-1 overflow-hidden rounded-full bg-[color:var(--border)]"
                    role="progressbar"
                    aria-label="Progreso de series"
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-valuenow={progressPct}
                  >
                    <span
                      className="block h-full rounded-full bg-[#352018] transition-[width] duration-300 dark:bg-[#e2ff00]"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 font-bold tabular-nums text-[#352018] dark:text-[#e2ff00]">
                    {progressPct}%
                  </span>
                  <span className="shrink-0 border-l border-[color:var(--border)] pl-3 font-semibold text-[color:var(--text)]">
                    {completedExercises}/{formatExerciseCount(exercises.length)}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        ) : null}

        {(setupStarted || isEditing) && selectedRoutineId && (
          <section className="space-y-3 md:hidden">
            <article
              data-training-overview
              className={`rounded-xl border bg-[color:var(--card)] p-4 shadow-lg ${
                sessionComplete
                  ? "border-[#352018]/60 dark:border-[#e2ff00]/55"
                  : "border-[color:var(--border)]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-condensed text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                    {isHistoryReadOnly
                      ? "Sesión registrada"
                      : sessionComplete
                        ? "Rutina completada"
                        : "Rutina activa"}
                  </p>
                  <h2 className="mt-1.5 truncate font-condensed text-2xl font-black uppercase leading-none text-[#352018] dark:text-[#e2ff00]">
                    {selectorRoutine?.name || "Rutina seleccionada"}
                  </h2>
                </div>
                <strong className="shrink-0 font-condensed text-xl font-black tabular-nums text-[#352018] dark:text-[#e2ff00]">
                  {progressPct}%
                </strong>
              </div>

              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <p className="font-condensed text-[10px] font-black uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                    Series completadas
                  </p>
                  <p className="mt-1 font-condensed text-2xl font-black leading-none text-[color:var(--text)]">
                    {doneSets}/{totalSets}
                  </p>
                </div>
                <p className="pb-0.5 text-xs font-semibold text-[color:var(--text-muted)]">
                  {completedExercises}/{formatExerciseCount(exercises.length)}
                </p>
              </div>

              <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-[color:var(--border)]"
                role="progressbar"
                aria-label="Progreso de series"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={progressPct}
              >
                <span
                  className="block h-full rounded-full bg-[#352018] transition-[width] duration-300 dark:bg-[#e2ff00]"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </article>
          </section>
        )}

        <div
          className={`min-w-0 max-w-full gap-4 ${
            !sessionLocked || isEditing
              ? "md:grid-cols-[360px_minmax(0,1fr)]"
              : "md:grid-cols-1"
          } ${setupStarted || isEditing ? "grid" : "hidden"}`}
        >
          {!sessionLocked || isEditing ? (
            <div className="hidden min-w-0 max-w-full space-y-4 md:block">
              <Card className="space-y-4 border border-[color:var(--border)] bg-[color:var(--card)]/85 p-4 shadow-sm backdrop-blur">
                {requiresBranchSelection ? (
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase text-[color:var(--text-muted)] font-semibold">
                      Sucursal
                    </p>
                    <select
                      value={selectedBranch}
                      onChange={(e) => handleBranchChange(e.target.value)}
                      disabled={sessionLocked || isHistoryReadOnly}
                      className="w-full rounded-full border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-sm text-[color:var(--text)] focus:outline-none focus:ring-2 focus:ring-[#352018]/30 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-[#e2ff00]/30"
                    >
                      {branchOptions.map((b) => (
                        <option
                          key={b}
                          value={b}
                          className="bg-[color:var(--card)] text-[color:var(--text)]"
                        >
                          {getBranchTitle(b)}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <p className="text-[11px] uppercase text-[color:var(--text-muted)] font-semibold">
                    Rutina seleccionada
                  </p>
                  <RoutineSelector
                    routine={
                      selectorRoutine || {
                        id: "sin-rutina",
                        name: routinesLoading
                          ? "Cargando..."
                          : "Selecciona una rutina",
                        location: selectedBranch || DEFAULT_BRANCH,
                        exerciseCount: 0,
                        lastDate: "--",
                      }
                    }
                    routines={routineOptions}
                    onSelect={handleSelectRoutine}
                    disabled={sessionLocked || isHistoryReadOnly}
                    showLocation={requiresBranchSelection}
                  />
                </div>
              </Card>
            </div>
          ) : null}

          <section className="min-w-0 max-w-full space-y-3">
            {selectedRoutineId ? (
              <>
                <div className="min-w-0 max-w-full space-y-4">
                  {!isHistoryReadOnly ? (
                    <ExerciseOrderPanel
                      exercises={exercises}
                      historyCount={orderMatchedHistoryTrainings.length}
                      active={isOrderingExercises}
                      onToggle={() =>
                        setIsOrderingExercises((current) => !current)
                      }
                      onReorder={(nextOrder) =>
                        setExercises(applyExerciseOrder(nextOrder))
                      }
                      onMove={handleMoveExercise}
                    />
                  ) : null}

                  <div
                    className={`min-w-0 max-w-full space-y-3 ${
                      isOrderingExercises ? "hidden" : "md:hidden"
                    }`}
                  >
                    {groupedExercises.map(({ key, muscle, items }) => (
                      <div key={key} className="min-w-0 max-w-full space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                          <div>
                            <p className="text-xl font-semibold text-[color:var(--text)]">
                              {muscle}
                            </p>
                          </div>
                          <span className="training-exercise-group-count text-sm font-medium uppercase">
                            {formatExerciseCount(items.length)}
                          </span>
                        </div>
                        {items.map((ex) => {
                          const movementConfig = getRoutineMovementConfig(
                            selectedRoutine?.raw?.exercises || [],
                            ex,
                          );
                          return (
                            <ExerciseCard
                              key={ex.id}
                              readOnly={isHistoryReadOnly}
                              open={expandedExerciseId === ex.id}
                              onToggleOpen={() => handleToggleExercise(ex.id)}
                              exercise={{
                                ...ex,
                                durationSeconds:
                                  timingSummary.exerciseDurations.get(ex.id) ||
                                  0,
                                isActive: activeExerciseId === ex.id,
                                supportsUnilateral:
                                  movementConfig.supportsUnilateral,
                                movementMode:
                                  ex.movementMode ||
                                  movementConfig.movementMode,
                              }}
                              onAddSet={() => handleAddSet(ex.id)}
                              onUpdateEntry={(setId, entryId, field, value) =>
                                handleUpdateEntry(
                                  ex.id,
                                  setId,
                                  entryId,
                                  field,
                                  value,
                                )
                              }
                              onToggleEntry={(setId, entryId) =>
                                handleToggleEntry(ex.id, setId, entryId)
                              }
                              onRemoveSet={(setId) =>
                                handleRemoveSet(ex.id, setId)
                              }
                              onRemoveExercise={() =>
                                handleRemoveExercise(ex.id)
                              }
                              onSeriesTypeChange={(value) =>
                                handleSeriesTypeChange(ex.id, value)
                              }
                              onMovementModeChange={(value) =>
                                handleMovementModeChange(ex.id, value)
                              }
                              onSetupNoteChange={(value) =>
                                handleSetupNoteChange(ex.id, value)
                              }
                              onSwapVariant={(direction) =>
                                handleSwapVariant(ex.id, direction)
                              }
                              onStartNow={() => handleStartExerciseNow(ex.id)}
                              onViewTracking={() => {
                                setTrackingExerciseId(ex.id);
                                setHistoryViewScope("routine");
                                setShowTracking(true);
                              }}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  <div
                    className={`min-w-0 max-w-full space-y-4 ${
                      isOrderingExercises ? "hidden" : "hidden md:block"
                    }`}
                  >
                    {groupedExercises.map(({ key, muscle, items }) => (
                      <div key={key} className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                          <div>
                            <p className="text-xl font-semibold text-[color:var(--text)]">
                              {muscle}
                            </p>
                          </div>
                          <span className="training-exercise-group-count text-sm font-medium uppercase">
                            {formatExerciseCount(items.length)}
                          </span>
                        </div>
                        {items.map((ex) => {
                          const movementConfig = getRoutineMovementConfig(
                            selectedRoutine?.raw?.exercises || [],
                            ex,
                          );
                          return (
                            <ExerciseCard
                              key={ex.id}
                              readOnly={isHistoryReadOnly}
                              open={expandedExerciseId === ex.id}
                              onToggleOpen={() => handleToggleExercise(ex.id)}
                              exercise={{
                                ...ex,
                                durationSeconds:
                                  timingSummary.exerciseDurations.get(ex.id) ||
                                  0,
                                isActive: activeExerciseId === ex.id,
                                supportsUnilateral:
                                  movementConfig.supportsUnilateral,
                                movementMode:
                                  ex.movementMode ||
                                  movementConfig.movementMode,
                              }}
                              onAddSet={() => handleAddSet(ex.id)}
                              onUpdateEntry={(setId, entryId, field, value) =>
                                handleUpdateEntry(
                                  ex.id,
                                  setId,
                                  entryId,
                                  field,
                                  value,
                                )
                              }
                              onToggleEntry={(setId, entryId) =>
                                handleToggleEntry(ex.id, setId, entryId)
                              }
                              onRemoveSet={(setId) =>
                                handleRemoveSet(ex.id, setId)
                              }
                              onRemoveExercise={() =>
                                handleRemoveExercise(ex.id)
                              }
                              onSeriesTypeChange={(value) =>
                                handleSeriesTypeChange(ex.id, value)
                              }
                              onMovementModeChange={(value) =>
                                handleMovementModeChange(ex.id, value)
                              }
                              onSetupNoteChange={(value) =>
                                handleSetupNoteChange(ex.id, value)
                              }
                              onSwapVariant={(direction) =>
                                handleSwapVariant(ex.id, direction)
                              }
                              onStartNow={() => handleStartExerciseNow(ex.id)}
                              onViewTracking={() => {
                                setTrackingExerciseId(ex.id);
                                setHistoryViewScope("routine");
                                setShowTracking(true);
                              }}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  {!isHistoryReadOnly && extraExerciseOptions.length > 0 && (
                    <Card className="p-4 border border-[color:var(--border)] bg-[color:var(--card)]/80 backdrop-blur shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-muted)] font-semibold">
                            Ejercicios extra (opcional)
                          </p>
                          <p className="text-xs text-[color:var(--text-muted)]">
                            Agrega solo si te queda tiempo.
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-[11px]">
                          {extraExerciseOptions.length}
                        </Badge>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {extraExerciseOptions.map((ex) => {
                          const alreadyAdded = exercises.some(
                            (item) => item.id === ex.id,
                          );
                          const extraThumb = getExerciseImageUrl(ex, {
                            width: 192,
                            height: 192,
                          });
                          return (
                            <div
                              key={`extra-${ex.id}`}
                              className="flex items-center gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3"
                            >
                              <div className="h-20 w-[76px] shrink-0 overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--card)]">
                                <ExerciseThumbnail
                                  src={extraThumb}
                                  alt=""
                                  fallback={(ex.name || "?")
                                    .charAt(0)
                                    .toUpperCase()}
                                  className="h-full w-full text-xs font-black"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-[color:var(--text)] truncate">
                                  {ex.name}
                                </p>
                                <p className="text-xs text-[color:var(--text-muted)]">
                                  {ex.muscle || "Sin grupo"} •{" "}
                                  {ex.sets?.length || 0} series
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={alreadyAdded}
                                onClick={() => handleAddExtraExercise(ex)}
                              >
                                {alreadyAdded ? "Agregado" : "Agregar"}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  )}

                  {!isHistoryReadOnly ? (
                    <motion.div whileTap={{ scale: 0.97 }}>
                      <Button
                        variant="outline"
                        className="w-full rounded-2xl border-dashed border-[color:var(--border)] text-[color:var(--text)] py-3"
                        onClick={handleAddExercise}
                      >
                        + Agregar Ejercicio
                      </Button>
                    </motion.div>
                  ) : null}
                </div>
              </>
            ) : (
              <Card className="p-6 text-center text-sm text-[color:var(--text-muted)]">
                {requiresBranchSelection
                  ? "Selecciona primero la sucursal y la rutina para cargar los ejercicios."
                  : "Selecciona una rutina para cargar los ejercicios."}
              </Card>
            )}
          </section>
        </div>
      </div>

      {sessionComplete ? (
        <div className="mx-auto w-full max-w-full px-0 pb-28 md:max-w-5xl md:px-4 lg:max-w-7xl 2xl:max-w-[1500px]">
          <TrainingCompletionPanel
            routineName={selectorRoutine?.name || "Entrenamiento"}
            completedExercises={completedExercises}
            totalExercises={exercises.length}
            totalSets={totalSets}
            durationLabel={formatDuration(durationSeconds)}
            calorieEstimate={calorieEstimate}
            photoPreview={trainingPhotoPreview}
            photoError={trainingPhotoError}
            onPhotoChange={handleTrainingPhotoChange}
            onClearPhoto={clearTrainingPhoto}
            onFinish={handleFinish}
            isFinalizing={isFinalizing}
          />
        </div>
      ) : null}

      {showExercisePicker && (
        <Modal
          title="Agregar ejercicio"
          subtitle="Selecciona el grupo muscular y agrega ejercicios disponibles."
          onClose={() => setShowExercisePicker(false)}
          footer={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExercisePicker(false)}
            >
              Cerrar
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm space-y-2">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-muted)] font-semibold">
                Rutina activa
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-[color:var(--text)]">
                  {selectedRoutine?.name || "Rutina"}
                </span>
                <Badge variant="secondary" className="text-[11px]">
                  {currentBranch || DEFAULT_BRANCH}
                </Badge>
              </div>
              <p className="text-xs text-[color:var(--text-muted)]">
                Elige un grupo muscular para ver los ejercicios disponibles en
                esta sede.
              </p>
            </div>

            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm space-y-3">
              <p className="text-sm font-semibold text-[color:var(--text)]">
                Elige grupo muscular
              </p>
              <div className="flex flex-wrap gap-2">
                {muscleGroupOptions.map((muscle) => (
                  <button
                    key={muscle}
                    type="button"
                    onClick={() => setSelectedMuscleGroup(muscle)}
                    className={`px-3 py-2 rounded-full border text-sm transition ${
                      selectedMuscleGroup === muscle
                        ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--accent-contrast)] font-semibold"
                        : "border-[color:var(--border)] bg-[color:var(--bg)] text-[color:var(--text-muted)] hover:border-[#352018]/40 dark:hover:border-[#e2ff00]/40"
                    }`}
                  >
                    {muscle}
                  </button>
                ))}
                {!muscleGroupOptions.length && (
                  <span className="text-sm text-[color:var(--text-muted)]">
                    No hay grupos musculares disponibles.
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm space-y-2">
              <p className="text-sm font-semibold text-[color:var(--text)]">
                Buscar ejercicio
              </p>
              <input
                className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-sm text-[color:var(--text)] focus:outline-none focus:ring-2 focus:ring-[#352018]/25 dark:focus:ring-[#e2ff00]/25"
                placeholder="Buscar por nombre..."
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[color:var(--text)]">
                  Ejercicios disponibles
                </p>
                <Badge variant="secondary" className="text-[11px]">
                  {filteredLibraryExercises.length} resultados
                </Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {filteredLibraryExercises.map((ex) => {
                  const thumb = getExerciseImageUrl(ex, {
                    width: 400,
                    height: 225,
                  });
                  return (
                    <div
                      key={ex.id}
                      className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3 flex flex-col gap-2 shadow-sm"
                    >
                      <div className="grid aspect-video w-full place-items-center overflow-hidden rounded-xl border border-[color:var(--border)] bg-[#f0f0f0] dark:bg-[#1b1b1b]">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={ex.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="text-[color:var(--text-muted)] text-sm">
                            Sin imagen
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm leading-tight">
                            {ex.name}
                          </p>
                          <p className="text-xs text-[color:var(--text-muted)]">
                            {ex.muscle}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddExerciseFromLibrary(ex)}
                        >
                          Agregar
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {filteredLibraryExercises.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-4 text-sm text-[color:var(--text-muted)]">
                    No hay ejercicios para este grupo muscular.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-[color:var(--bg)] p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[color:var(--text)]">
                  Agregar ejercicio personalizado
                </p>
                <p className="text-xs text-[color:var(--text-muted)]">
                  Usa este modo si no encuentras el ejercicio en la biblioteca.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  addCustomExercise();
                  setShowExercisePicker(false);
                }}
              >
                Agregar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {showTracking && trackingExercise && (
        <Modal
          title={`Seguimiento: ${trackingExercise.name}`}
          subtitle="Historial de todas las series registradas por fecha."
          onClose={() => {
            setShowTracking(false);
            setTrackingExerciseId("");
          }}
          footer={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowTracking(false);
                setTrackingExerciseId("");
              }}
            >
              Cerrar
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-20 w-[76px] shrink-0 overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] sm:h-24 sm:w-[92px]">
                  <ExerciseThumbnail
                    src={getExerciseImageUrl(trackingExercise, {
                      width: 240,
                      height: 240,
                    })}
                    alt=""
                    fallback={(trackingExercise.name || "?")
                      .charAt(0)
                      .toUpperCase()}
                    className="h-full w-full text-sm font-black"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-[color:var(--text)] truncate">
                    {trackingExercise.name}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-[11px]">
                      {trackingExercise.seriesType || "serie"}
                    </Badge>
                    {trackingExercise.supportsUnilateral && (
                      <Badge variant="secondary" className="text-[11px]">
                        {trackingExercise.movementMode === "unilateral"
                          ? "unilateral"
                          : "bilateral"}
                      </Badge>
                    )}
                    {trackingExercise.equipment?.length ? (
                      <Badge variant="secondary" className="text-[11px]">
                        Equipo · {trackingExercise.equipment.join(", ")}
                      </Badge>
                    ) : null}
                    <span className="text-xs text-[color:var(--text-muted)]">
                      {historyViewScope === "general" && loadingGeneralHistory
                        ? "Cargando historial general"
                        : visibleTrackingRows.length
                          ? `${visibleTrackingRows.length} sesiones compatibles`
                          : "Sin registros previos"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="grid grid-cols-3 gap-1 rounded-xl border border-[color:var(--border)] bg-[color:var(--segmented-surface)] p-1"
              role="tablist"
              aria-label="Alcance del historial"
            >
              {[
                ["routine", "Esta rutina"],
                ["plan", "Este plan"],
                ["general", "General"],
              ].map(([scope, label]) => (
                <button
                  key={scope}
                  type="button"
                  role="tab"
                  aria-selected={historyViewScope === scope}
                  disabled={scope === "plan" && !selectedHistoryPlanId}
                  onClick={() => setHistoryViewScope(scope)}
                  className={`min-h-10 px-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    historyViewScope === scope
                      ? "theme-accent-solid"
                      : "text-[color:var(--text-muted)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {historyViewScope === "plan" ? (
              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] px-4 py-3">
                <p className="text-sm font-semibold text-[color:var(--text)]">
                  Historial en {selectedHistoryPlanName}
                </p>
                <p className="mt-1 text-xs leading-5 text-[color:var(--text-muted)]">
                  Incluye las sesiones compatibles de este ejercicio en todas
                  las rutinas de la planificación.
                </p>
              </div>
            ) : null}

            {historyViewScope === "general" && loadingGeneralHistory ? (
              <div
                role="status"
                className="flex min-h-28 items-center justify-center gap-2 rounded-2xl border border-dashed border-[color:var(--border)] text-sm font-semibold text-[color:var(--text-muted)]"
              >
                <LoaderCircle className="h-5 w-5 animate-spin" />
                Cargando todas las series del ejercicio...
              </div>
            ) : historyViewScope === "general" && generalHistoryError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300">
                <p className="font-semibold">{generalHistoryError}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() =>
                    setGeneralHistoryReloadKey((current) => current + 1)
                  }
                >
                  Reintentar
                </Button>
              </div>
            ) : visibleTrackingRows.length ? (
              <div className="overflow-x-auto rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-sm">
                <table className="min-w-full w-full text-sm">
                  <thead className="bg-[color:var(--bg)]">
                    <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                      <th className="px-3 py-2">Fecha</th>
                      {Array.from({ length: trackingSetCount || 0 }).map(
                        (_, idx) => (
                          <th key={`set-head-${idx}`} className="px-3 py-2">
                            Serie {idx + 1}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleTrackingRows.map((row, rowIdx) => (
                      <tr
                        key={row.id || `${row.date}-${rowIdx}`}
                        className="border-t border-[color:var(--border)]"
                      >
                        <td className="px-3 py-2">
                          <div className="font-semibold text-[color:var(--text)]">
                            {row.date ? formatShort(row.date) : "--"}
                          </div>
                          {getExerciseTrackingRoutineLabel(
                            row,
                            historyViewScope,
                          ) ? (
                            <div
                              className="mt-0.5 max-w-36 truncate text-[11px] text-[color:var(--text-muted)]"
                              title={getExerciseTrackingRoutineLabel(
                                row,
                                historyViewScope,
                              )}
                            >
                              {getExerciseTrackingRoutineLabel(
                                row,
                                historyViewScope,
                              )}
                            </div>
                          ) : null}
                          {!locationDisabled ? (
                            <div className="mt-0.5 text-[11px] text-[color:var(--text-muted)]">
                              {row.branch
                                ? formatBranchLabel(row.branch)
                                : "Sin sucursal"}
                            </div>
                          ) : null}
                        </td>
                        {Array.from({ length: trackingSetCount || 0 }).map(
                          (_, idx) => {
                            const entries = row.sets[idx] || [];
                            if (!entries.length) {
                              return (
                                <td
                                  key={`set-cell-${rowIdx}-${idx}`}
                                  className="px-3 py-2 text-[color:var(--text-muted)]"
                                >
                                  --
                                </td>
                              );
                            }
                            return (
                              <td
                                key={`set-cell-${rowIdx}-${idx}`}
                                className="px-3 py-2"
                              >
                                <div className="flex flex-col gap-1">
                                  {entries.length > 1 ? (
                                    entries.map((entry, entryIdx) => (
                                      <span
                                        key={`entry-${rowIdx}-${idx}-${entryIdx}`}
                                        className="text-[11px] text-[color:var(--text)]"
                                      >
                                        E{entryIdx + 1}:{" "}
                                        {formatEntryValue(entry)}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-[11px] text-[color:var(--text)]">
                                      {formatEntryValue(entries[0])}
                                    </span>
                                  )}
                                </div>
                              </td>
                            );
                          },
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-4 text-sm text-[color:var(--text-muted)]">
                No hay historial para este ejercicio aun.
              </div>
            )}
          </div>
        </Modal>
      )}

      {pendingSameDayTraining ? (
        <Modal
          title="Rutina ya registrada hoy"
          subtitle={`${formatLongDate(sessionDate)} · ${pendingSameDayTraining.routine?.name || selectedRoutine?.name || "Entrenamiento"}`}
          onClose={handleCloseSameDayWarning}
          footer={
            <div className="grid w-full gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                className="h-12 gap-2 rounded-lg border-[#352018]/40 font-black uppercase text-[#2a1711] hover:bg-[color:var(--accent)] hover:text-[color:var(--accent-contrast)] dark:rounded-[4px] dark:border-[#e2ff00]/40 dark:text-[#e2ff00]"
                onClick={() => handleSameDayTrainingChoice(false)}
              >
                <RotateCcw className="h-4 w-4" />
                Reiniciar datos
              </Button>
              <Button
                type="button"
                className="h-12 gap-2 rounded-lg !bg-[#352018] font-black uppercase text-white hover:!bg-[#482b20] dark:rounded-[4px] dark:!bg-[#e2ff00] dark:text-black dark:hover:!bg-[#cbe600]"
                onClick={() => handleSameDayTrainingChoice(true)}
              >
                <Play className="h-4 w-4" />
                Continuar sesion
              </Button>
            </div>
          }
        >
          <div className="flex gap-3 border-l-2 border-[color:var(--accent)] bg-[color:var(--accent)] p-4 text-[color:var(--accent-contrast)]">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-current bg-transparent text-current">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black uppercase">
                Encontramos una sesion de hoy
              </p>
              <p className="mt-1 text-sm font-semibold leading-5 text-current/80">
                Continuar recupera las series, pesos y tiempo registrados.
                Reiniciar comienza vacio y reemplazara esta sesion cuando
                finalices el entrenamiento.
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs font-semibold text-[color:var(--text-muted)]">
            Cierra esta ventana para volver y elegir otra rutina.
          </p>
        </Modal>
      ) : null}

      <OperationLoader
        active={loadingTraining && Boolean(selectedRoutineId)}
        delayMs={450}
        title="Preparando entrenamiento"
        description="Cargando rutina, historial de pesos y configuracion de la sesion."
      />

      <OperationLoader
        active={isFinalizing}
        delayMs={0}
        title="Finalizando entrenamiento"
        description="Guardando series, tiempos y progreso en tu historial."
      />

      <AnimatePresence>
        {finishWarningOpen ? (
          <motion.div
            className="fixed inset-0 z-[80] flex items-end bg-black/55 px-0 backdrop-blur-sm md:items-center md:justify-center md:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ y: 28, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 28, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              className="w-full rounded-t-3xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-[color:var(--text)] shadow-2xl md:max-w-md md:rounded-3xl md:pb-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#352018] dark:text-[#e2ff00]">
                    Revision pendiente
                  </p>
                  <h2 className="mt-1 text-xl font-black leading-tight">
                    Hay series sin marcar
                  </h2>
                  <p className="mt-2 text-sm font-semibold leading-5 text-[color:var(--text-muted)]">
                    Puedes volver y completar las marcas, o finalizar guardando
                    solo lo registrado.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFinishWarningOpen(false)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[color:var(--border)] bg-[color:var(--bg)] text-[color:var(--text)]"
                  aria-label="Cerrar advertencia"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 rounded-lg border border-[color:var(--accent)] bg-[color:var(--accent)] p-3 text-[color:var(--accent-contrast)] dark:rounded-[4px]">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-current">
                    {finishWarningExercises.length} ejercicio(s) pendientes
                  </p>
                  <span className="rounded border border-current px-2 py-1 text-[10px] font-black uppercase text-current">
                    Atencion
                  </span>
                </div>
                <div className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
                  {finishWarningExercises.map((exercise) => {
                    const sets = Array.isArray(exercise.sets)
                      ? exercise.sets
                      : [];
                    const pendingSets = sets.filter(
                      (set) => !isSetDone(set),
                    ).length;
                    return (
                      <div
                        key={exercise.id}
                        className="flex items-center justify-between gap-3 rounded-xl bg-[color:var(--card)] px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black">
                            {exercise.name}
                          </p>
                          <p className="text-[11px] font-semibold text-[color:var(--text-muted)]">
                            {exercise.muscle || "Sin grupo"}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-red-500/10 px-2 py-1 text-[10px] font-black text-red-600 dark:text-red-300">
                          {pendingSets} pendiente(s)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2">
                <Button
                  type="button"
                  className="h-12 rounded-2xl !bg-[#352018] text-white hover:!bg-[#482b20] dark:!bg-[#e2ff00] dark:text-black dark:hover:!bg-[#cbe600]"
                  onClick={() => setFinishWarningOpen(false)}
                >
                  Volver a completar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 rounded-lg border-[#352018]/40 text-[#2a1711] hover:bg-[color:var(--accent)] hover:text-[color:var(--accent-contrast)] dark:rounded-[4px] dark:border-[#e2ff00]/40 dark:text-[#e2ff00]"
                  onClick={confirmFinishTraining}
                >
                  Finalizar de todos modos
                </Button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {cancelConfirmOpen ? (
          <motion.div
            className="fixed inset-0 z-[85] flex items-end bg-black/55 backdrop-blur-sm md:items-center md:justify-center md:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              className="w-full rounded-t-3xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl md:max-w-md md:rounded-3xl md:pb-4"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-600">
                Descartar sesión
              </p>
              <h2 className="mt-1 text-xl font-black text-[color:var(--text)]">
                ¿Cancelar este entrenamiento?
              </h2>
              <p className="mt-2 text-sm font-semibold text-[color:var(--text-muted)]">
                Se perderán los pesos, series y cambios que todavía no hayas
                guardado.
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 rounded-xl"
                  onClick={() => setCancelConfirmOpen(false)}
                >
                  Continuar entrenando
                </Button>
                <Button
                  type="button"
                  className="h-12 rounded-xl bg-red-600 text-white hover:bg-red-700"
                  onClick={performCancel}
                >
                  Descartar sesión
                </Button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showAutoRestCountdown ? (
          <AutoRestCountdownModal
            timeLabel={restTimerLabel}
            progressPct={restProgressPct}
            reduceMotion={Boolean(reduceMotion)}
            onExit={() => setRestTimerMinimized(true)}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showAutoRestComplete ? (
          <AutoRestCompleteModal
            reduceMotion={Boolean(reduceMotion)}
            onContinue={handleConfirmAutoFlowAdvance}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {restTimerOpen &&
          !restTimerMinimized &&
          !showAutoRestCountdown &&
          !showAutoRestComplete && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              className="fixed inset-0 z-50 bg-[color:var(--bg)] text-[color:var(--text)] md:grid md:place-items-center md:bg-black/60 md:p-6"
            >
              <div className="flex min-h-dvh flex-col px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-5 md:min-h-0 md:w-full md:max-w-md md:border md:border-[color:var(--border)] md:bg-[color:var(--card)] md:p-6 md:shadow-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-muted)]">
                      Descanso
                    </p>
                    <p className="text-lg font-semibold">
                      {restTimerDone
                        ? "Tiempo completado"
                        : restTimerRunning
                          ? "Temporizador activo"
                          : "Temporizador listo"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => setRestTimerMinimized(true)}
                      aria-label="Minimizar temporizador"
                    >
                      <Minimize2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="rounded-full"
                      onClick={handleCloseRestTimer}
                      aria-label="Cerrar temporizador"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-1 flex-col items-center justify-center gap-8">
                  <div
                    className="grid h-72 w-72 place-items-center rounded-full p-4 shadow-2xl"
                    style={{
                      background: `conic-gradient(var(--accent) ${restProgressPct}%, rgba(148,163,184,0.22) ${restProgressPct}% 100%)`,
                    }}
                  >
                    <div className="grid h-full w-full place-items-center rounded-full border border-[color:var(--border)] bg-[color:var(--card)] text-center">
                      <div>
                        <p className="font-mono text-6xl font-bold tracking-normal">
                          {restTimerLabel}
                        </p>
                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--text-muted)]">
                          {restTimerDone
                            ? "Descanso terminado"
                            : `${restProgressPct}%`}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="w-full max-w-sm space-y-4">
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 2, 3, 5].map((minutes) => (
                        <Button
                          key={minutes}
                          variant={
                            restMinutesInput === minutes ? "default" : "outline"
                          }
                          className="rounded-full"
                          onClick={() => handleStartRestTimer(minutes)}
                        >
                          {minutes}m
                        </Button>
                      ))}
                    </div>

                    <label className="block space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                        Minutos
                      </span>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={restMinutesInput}
                        onChange={(event) =>
                          setRestMinutesInput(
                            Math.max(1, Number(event.target.value) || 1),
                          )
                        }
                        className="h-12 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 text-center text-lg font-semibold text-[color:var(--text)] focus:outline-none focus:ring-2 focus:ring-[#352018]/30 dark:rounded-[3px] dark:focus:ring-[#e2ff00]/30"
                      />
                    </label>

                    {restTimerDone && autoFlowTarget ? (
                      <Button
                        className="h-12 w-full rounded-full bg-[#352018] text-white hover:bg-[#482b20] dark:bg-[#e2ff00] dark:text-black dark:hover:bg-[#cbe600]"
                        onClick={handleBeginNextSeries}
                      >
                        <Play className="h-4 w-4" />
                        Empezar siguiente serie
                      </Button>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          className={`h-12 rounded-full ${
                            restTimerRunning
                              ? "bg-[#1a1a1a] text-white hover:bg-[#333] dark:bg-[#353535]"
                              : "bg-[#352018] text-white hover:bg-[#482b20] dark:bg-[#e2ff00] dark:text-black dark:hover:bg-[#cbe600]"
                          }`}
                          onClick={handleToggleRestTimer}
                        >
                          {restTimerRunning ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                          <span>
                            {restTimerRunning
                              ? "Pausar"
                              : restTimerStarted
                                ? "Continuar"
                                : "Iniciar"}
                          </span>
                        </Button>
                        <Button
                          variant="outline"
                          className="h-12 rounded-full"
                          onClick={handleResetRestTimer}
                        >
                          Reiniciar cronómetro
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
      </AnimatePresence>
    </main>
  );
}
