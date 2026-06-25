import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ClipboardList,
  Flag,
  Minimize2,
  MoreVertical,
  Pause,
  Play,
  Timer,
  X,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import Card from "../components/ui/card";
import Button from "../components/ui/button";
import Badge from "../components/ui/badge";
import Modal from "../components/shared/Modal";
import RoutineSelector from "../components/training/RoutineSelector";
import ExerciseCard from "../components/training/ExerciseCard";
import { useRoutines } from "../context/RoutineContext";
import { useTrainingData } from "../context/TrainingContext";
import { api } from "../services/api";
import { getExerciseImageUrl } from "../utils/cloudinary";

const getLocalISODate = (value) => {
  if (value) return value.slice(0, 10);
  const d = new Date();
  const offsetMs = d.getTimezoneOffset() * 60000;
  const local = new Date(d.getTime() - offsetMs);
  return local.toISOString().slice(0, 10);
};
const todayISO = getLocalISODate();
const SNAPSHOT_KEY = "active_training_snapshot";
const TRAINING_ROUTINES_RETURN_KEY = "training_routines_return";
const TRAINING_ROUTINE_EDIT_TARGET_KEY = "training_routine_edit_target";
const ROUTINE_UPDATED_DURING_TRAINING_KEY = "routine_updated_during_training";
const MAX_TRAINING_PHOTO_BYTES = 10 * 1024 * 1024;
const BRANCH_OPTIONS = ["sopocachi", "miraflores"];
const DEFAULT_BRANCH = "sopocachi";
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

const createTimeEvent = (type, exerciseId = null, atMs = Date.now()) => ({
  type,
  exerciseId,
  at: new Date(atMs).toISOString(),
});

const getEventTime = (event) => {
  const ts = Date.parse(event?.at);
  return Number.isNaN(ts) ? null : ts;
};

const normalizeTimeEvents = (events = []) =>
  (Array.isArray(events) ? events : [])
    .filter((event) => event?.type && event?.at && getEventTime(event) != null)
    .map((event) => ({
      type: event.type,
      at: new Date(getEventTime(event)).toISOString(),
      exerciseId: event.exerciseId || null,
    }))
    .sort((a, b) => getEventTime(a) - getEventTime(b));

const calculateTimingSummary = (events = [], nowMs = Date.now()) => {
  let running = false;
  let activeExerciseId = null;
  let lastAt = null;
  let durationSeconds = 0;
  const exerciseDurations = new Map();

  const accrue = (nextAt) => {
    if (!running || lastAt == null || nextAt <= lastAt) return;
    const delta = Math.floor((nextAt - lastAt) / 1000);
    if (delta <= 0) return;
    durationSeconds += delta;
    if (activeExerciseId) {
      exerciseDurations.set(
        activeExerciseId,
        (exerciseDurations.get(activeExerciseId) || 0) + delta,
      );
    }
  };

  normalizeTimeEvents(events).forEach((event) => {
    const at = getEventTime(event);
    accrue(at);
    if (event.type === "session_start" || event.type === "session_resume") {
      running = true;
      lastAt = at;
      return;
    }
    if (event.type === "session_pause" || event.type === "session_end") {
      running = false;
      lastAt = at;
      return;
    }
    if (event.type === "exercise_start") {
      if (!running) running = true;
      activeExerciseId = event.exerciseId || null;
      lastAt = at;
    }
  });

  accrue(nowMs);

  return {
    durationSeconds,
    activeExerciseId: running ? activeExerciseId : "",
    exerciseDurations,
    exerciseDurationsPayload: Array.from(exerciseDurations.entries()).map(
      ([exerciseId, seconds]) => ({
        exerciseId,
        durationSeconds: seconds,
      }),
    ),
  };
};

const buildFallbackTimeEvents = (durationSeconds = 0, endMs = Date.now()) => {
  const seconds = Number(durationSeconds) || 0;
  if (seconds <= 0) return [];
  return [
    createTimeEvent("session_start", null, endMs - seconds * 1000),
    createTimeEvent("session_pause", null, endMs),
  ];
};

const formatCounter = (value) => String(value || 0).padStart(2, "0");

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

const pickMapKey = (map, keys = []) => {
  if (!map) return null;
  return keys.find((key) => key && map.has(key)) || null;
};

const getHistoryLookupKeys = (exercise = {}, fallbackIndex = null) =>
  Array.from(
    new Set([
      ...getPositionHistoryKeys(exercise, fallbackIndex),
      ...getMovementHistoryKeys(exercise),
    ]),
  );

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
      const matches = getHistoryLookupKeys(ex, exIdx).some((key) =>
        targetKeys.has(key),
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
      const keys = getHistoryLookupKeys(ex, exIdx);
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
      const keys = getHistoryLookupKeys(ex, exIdx);
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
      const keys = getHistoryLookupKeys(ex, exIdx);
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
      const keys = getHistoryLookupKeys(ex, exIdx);
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

export default function RegisterTraining({ onNavigate = () => {} }) {
  const { routines, loading: routinesLoading } = useRoutines();
  const {
    exercises: libraryExercises,
    addTraining,
    updateTraining,
    addPhoto,
    trainings,
    branch: userBranch,
    setBranch,
  } = useTrainingData();

  const [durationSeconds, setDurationSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [timeEvents, setTimeEvents] = useState([]);
  const [activeExerciseId, setActiveExerciseId] = useState("");
  const [nowMs, setNowMs] = useState(Date.now());
  const [selectedRoutineId, setSelectedRoutineId] = useState(null);
  const [selectedRoutine, setSelectedRoutine] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState("");
  const [trackingExerciseId, setTrackingExerciseId] = useState("");
  const [showTracking, setShowTracking] = useState(false);
  const [isOrderingExercises, setIsOrderingExercises] = useState(false);
  const [sessionDate, setSessionDate] = useState(todayISO);
  const [trainingPhotoFile, setTrainingPhotoFile] = useState(null);
  const [trainingPhotoPreview, setTrainingPhotoPreview] = useState("");
  const [trainingPhotoError, setTrainingPhotoError] = useState("");
  const [loadingTraining, setLoadingTraining] = useState(false);
  const [historyTrainings, setHistoryTrainings] = useState([]);
  const [editingId, setEditingId] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(() =>
    normalizeBranch(userBranch),
  );
  const branchChangeReason = useRef("user"); // "user" | "routine"
  const restoredFromSnapshot = useRef(false);
  const historyLoadAttempted = useRef(false);
  const initializedTrainingScreen = useRef(false);
  const lastUpdateRef = useRef(Date.now());
  const [branchLocked, setBranchLocked] = useState(false);
  const timerRef = useRef(null);
  const datePickerRef = useRef(null);
  const restTimerRef = useRef(null);
  const [restTimerOpen, setRestTimerOpen] = useState(false);
  const [restTimerMinimized, setRestTimerMinimized] = useState(true);
  const [restMinutesInput, setRestMinutesInput] = useState(2);
  const [restDurationSeconds, setRestDurationSeconds] = useState(120);
  const [restRemainingSeconds, setRestRemainingSeconds] = useState(120);
  const [restTimerRunning, setRestTimerRunning] = useState(false);
  const [restTimerStarted, setRestTimerStarted] = useState(false);

  const branchOptions = useMemo(() => {
    const set = new Set(BRANCH_OPTIONS);
    (routines || []).forEach((r) => {
      const branch = normalizeBranch(r.branch);
      if (branch) set.add(branch);
    });
    return Array.from(set);
  }, [routines]);

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
    (r) => ({
      id: r.id,
      name: r.name,
      location: normalizeBranch(r.branch),
      exerciseCount: (r.exercises || []).length,
      lastDate:
        formatShort(
          latestRoutineDates.get(r.id)?.date || r.updatedAt || r.createdAt,
        ) || "--",
      raw: r,
    }),
    [latestRoutineDates],
  );

  const allRoutineOptions = useMemo(
    () => (routines || []).map((r) => toRoutineOption(r)),
    [routines, toRoutineOption],
  );

  const routineOptions = useMemo(() => {
    const filtered =
      (routines || []).filter((r) =>
        selectedBranch ? normalizeBranch(r.branch) === selectedBranch : true,
      ) || [];
    return filtered.map((r) => toRoutineOption(r));
  }, [routines, selectedBranch, toRoutineOption]);

  const currentBranch =
    selectedBranch || selectedRoutine?.location || DEFAULT_BRANCH;
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

  const historyBest = useMemo(
    () => computeBestFromHistory(historyTrainings, selectedBranch),
    [historyTrainings, selectedBranch],
  );
  const historyGlobalBest = useMemo(
    () => computeBestFromHistory(historyTrainings),
    [historyTrainings],
  );
  const historyBestBySet = useMemo(
    () => computeBestBySetFromHistory(historyTrainings),
    [historyTrainings],
  );
  const historyRecentBySet = useMemo(
    () => computeRecentBySetFromHistory(historyTrainings),
    [historyTrainings],
  );
  const historySeriesTypeMap = useMemo(
    () =>
      computeLatestSeriesTypeFromHistory(
        historyTrainings,
        selectedRoutineId,
        selectedBranch,
      ),
    [historyTrainings, selectedRoutineId, selectedBranch],
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
      const baseHistoryKeys = [id, nameKey]
        .filter(Boolean)
        .map((key) => getMovementHistoryKey(key, movementMode));
      const positionHistoryKeys = [id, nameKey]
        .filter(Boolean)
        .map((key) => getPositionHistoryKey(key, movementMode, currentOrder))
        .filter(Boolean);
      const historyKeys = [...positionHistoryKeys, ...baseHistoryKeys];
      const historySeriesType =
        safeSeriesTypeMap.get(historyKeys[0]) ||
        historyKeys.map((key) => safeSeriesTypeMap.get(key)).find(Boolean);
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
        historyKeys.map((key) => bestMap.get(key)).find(Boolean) || null;
      const globalBest =
        historyKeys.map((key) => historyGlobalBest.get(key)).find(Boolean) ||
        null;
      const bestBySet =
        baseHistoryKeys.map((key) => bestBySetMap.get(key)).find(Boolean) || [];
      const recentBySet =
        baseHistoryKeys.map((key) => recentBySetMap.get(key)).find(Boolean) ||
        [];
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
              const recentEntries = recentBySet[sIdx] || [];
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
                  ? getRemoteBranchLabel(perSet.branch, selectedBranch)
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
              const recentEntries = recentBySet[sIdx] || [];
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
                  ? perSet
                    ? perSet.weight
                    : best
                      ? best.weight
                      : ""
                  : "";
              const defaultReps =
                seriesType === "serie"
                  ? perSet
                    ? perSet.reps
                    : best
                      ? best.reps
                      : ""
                  : "";
              return {
                id: setId,
                prSummary: perSetSummary,
                prBranchLabel: perSet
                  ? getRemoteBranchLabel(perSet.branch, selectedBranch)
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
            normalizeBranch(selectedBranch))
          ? `Mejor global: ${globalBest.weight}kg x ${globalBest.reps} · ${formatBranchLabel(
              globalBest.branch,
            )}`
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
        isExtra: Boolean(ex.isExtra ?? routineSlot?.isExtra),
        supportsUnilateral,
        movementMode,
        seriesType,
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
      const positionHistoryKeys = keys
        .map((key) => getPositionHistoryKey(key, movementMode, currentOrder))
        .filter(Boolean);
      const baseHistoryKeys = keys.map((key) =>
        getMovementHistoryKey(key, movementMode),
      );
      const historyKeys = [...positionHistoryKeys, ...baseHistoryKeys];
      const findKey = (map) =>
        historyKeys.find((key) => map.has(key)) ||
        getMovementHistoryKey(id, movementMode);
      const findBaseKey = (map) =>
        baseHistoryKeys.find((key) => map.has(key)) ||
        getMovementHistoryKey(id, movementMode);
      const bestKey = findKey(bestMap);
      const globalBestKey = findKey(historyGlobalBest);
      const bestBySetKey = findBaseKey(bestBySetMap);
      const recentBySetKey = findBaseKey(recentBySetMap);
      const best = bestMap.get(bestKey);
      const globalBest = historyGlobalBest.get(globalBestKey);
      const bestBySet = bestBySetMap.get(bestBySetKey) || [];
      const recentBySet = recentBySetMap.get(recentBySetKey) || [];
      const seriesTypeEntry = historyKeys
        .map((key) => seriesTypeMap?.get(key))
        .find(Boolean);
      const historySeriesType = seriesTypeEntry?.type || null;
      const inferredSeriesType = inferSeriesTypeFromSets(ex.sets);
      const shouldReloadInputs = Boolean(ex.reloadMovementHistory);
      const latestHistory = shouldReloadInputs
        ? findLatestHistoryExerciseSnapshot(
            historyTrainings,
            historyKeys,
            movementMode,
            selectedBranch,
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
      const prSummary = best ? formatHistoryLift(best) : ex.prSummary || "";
      const prText = best
        ? `Aquí: ${best.weight}kg x ${best.reps} | ${formatShort(best.date)}`
        : ex.prText?.startsWith("Aquí:")
          ? ex.prText
          : "Sin referencia aquí";
      const globalPrText =
        globalBest &&
        (!best ||
          globalBest.weight > best.weight ||
          (globalBest.weight === best.weight &&
            globalBest.reps > (best.reps ?? 0)) ||
          normalizeBranch(globalBest.branch) !==
            normalizeBranch(selectedBranch))
          ? `Mejor global: ${globalBest.weight}kg x ${globalBest.reps} · ${formatBranchLabel(
              globalBest.branch,
            )}`
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
        const sourceEntries = Array.isArray(set.entries)
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
            ? getRemoteBranchLabel(perSet.branch, selectedBranch)
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
        prSummary,
        prWeight: best?.weight ?? ex.prWeight ?? null,
        prText,
        globalPrText,
        sets,
      };
    });

  const applyExerciseOrder = (nextOrder) =>
    applyHistoryToExercises(
      (nextOrder || []).map((ex, idx) => ({
        ...ex,
        order: idx + 1,
        actualOrder: idx + 1,
        plannedOrder: getPlannedExerciseOrder(ex, idx),
        orderContext: getOrderContext(
          getPlannedExerciseOrder(ex, idx),
          idx + 1,
          Boolean(ex.isExtra),
        ),
        reloadMovementHistory: !exerciseHasInput(ex),
      })),
    );

  const mergeRoutineIntoActiveExercises = (currentList = [], routine) => {
    const routineTemplate = buildExercisesForRoutine(
      routine,
      null,
      historyBest,
      historyBestBySet,
      historyRecentBySet,
      historySeriesTypeMap,
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
      const groups = [];
      const groupIndexByName = new Map();
      prev.forEach((ex) => {
        const groupName = ex.muscle || "Sin grupo";
        if (!groupIndexByName.has(groupName)) {
          groupIndexByName.set(groupName, groups.length);
          groups.push({ name: groupName, items: [] });
        }
        groups[groupIndexByName.get(groupName)].items.push(ex);
      });

      const group = groups.find((entry) =>
        entry.items.some((ex) => ex.id === exerciseId),
      );
      if (!group) return prev;

      const currentIndex = group.items.findIndex((ex) => ex.id === exerciseId);
      const nextIndex = currentIndex + direction;
      if (
        currentIndex < 0 ||
        nextIndex < 0 ||
        nextIndex >= group.items.length
      ) {
        return prev;
      }

      const nextGroups = groups.map((entry) => ({
        ...entry,
        items: [...entry.items],
      }));
      const editableGroup = nextGroups.find(
        (entry) => entry.name === group.name,
      );
      const [item] = editableGroup.items.splice(currentIndex, 1);
      editableGroup.items.splice(nextIndex, 0, item);

      return applyExerciseOrder(nextGroups.flatMap((entry) => entry.items));
    });
  };

  const handleStartExerciseNow = (exerciseId, { silent = false } = {}) => {
    const now = Date.now();
    if (activeExerciseId === exerciseId && isRunning) {
      if (!silent) toast.message("Este ejercicio ya esta en curso.");
      return;
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
      return applyHistoryToExercises(
        prev.map((ex) =>
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
        ),
        historyBest,
        historyBestBySet,
        historyRecentBySet,
        historySeriesTypeMap,
      );
    });
    setTimeEvents((prev) => [
      ...prev,
      ...(!isRunning
        ? [
            createTimeEvent(
              prev.length ? "session_resume" : "session_start",
              null,
              now,
            ),
          ]
        : []),
      createTimeEvent("exercise_start", exerciseId, now),
    ]);
    lastUpdateRef.current = now;
    setNowMs(now);
    setIsRunning(true);
    setHasStarted(true);
    if (!silent) toast.message("Ejercicio iniciado.");
  };

  const loadTrainingForDate = async (
    date,
    routineId,
    bestMap = historyBest,
    bestBySetMap = historyBestBySet,
    recentBySetMap = historyRecentBySet,
    seriesTypeMap = historySeriesTypeMap,
  ) => {
    if (!routineOptions.length || !routineId) {
      setExercises([]);
      return;
    }
    const routine = routineOptions.find((r) => r.id === routineId);
    if (!routine) {
      setExercises([]);
      return;
    }
    setSelectedRoutineId(routine.id);
    setSelectedRoutine(routine);
    setLoadingTraining(true);
    try {
      const resp = await api.getTrainings({
        from: date,
        to: date,
        limit: 1,
        fields:
          "date,routineId,routineName,branch,durationSeconds,timeEvents,exerciseDurations,exercises.exerciseId,exercises.exerciseName,exercises.muscleGroup,exercises.order,exercises.plannedOrder,exercises.actualOrder,exercises.orderContext,exercises.movementMode,exercises.seriesType,exercises.sets.seriesType,exercises.sets.weightKg,exercises.sets.reps,exercises.sets.done,exercises.sets.entries.weightKg,exercises.sets.entries.reps,exercises.sets.entries.done,exercises.sets.entries.previousText",
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
      if (trainingMatch?.branch && !branchLocked) {
        branchChangeReason.current = "routine";
        setSelectedBranch(normalizeBranch(trainingMatch.branch));
      }
      setExercises(
        buildExercisesForRoutine(
          routine.raw,
          trainingMatch,
          bestMap,
          bestBySetMap,
          recentBySetMap,
          seriesTypeMap,
        ),
      );
      if (trainingMatch?.durationSeconds)
        setDurationSeconds(trainingMatch.durationSeconds);
      const loadedEvents = normalizeTimeEvents(trainingMatch?.timeEvents);
      setTimeEvents(
        loadedEvents.length
          ? loadedEvents
          : buildFallbackTimeEvents(trainingMatch?.durationSeconds),
      );
    } catch (e) {
      console.warn("No se pudo cargar entrenamiento previo", e);
      setExercises(
        buildExercisesForRoutine(
          routine.raw,
          null,
          bestMap,
          bestBySetMap,
          recentBySetMap,
          seriesTypeMap,
        ),
      );
    } finally {
      setLoadingTraining(false);
    }
  };

  const loadTrainingById = async (id) => {
    if (!id) return;
    setLoadingTraining(true);
    try {
      const training = await api.getTraining(id);
      const routineId = training.routineId || routineOptions[0]?.id;
      const routine =
        routineOptions.find((r) => r.id === routineId) || routineOptions[0];
      const branch = normalizeBranch(training.branch || routine.location);
      branchChangeReason.current = "routine";
      setSelectedBranch(branch);
      setSessionDate(training.date);
      setSelectedRoutineId(routine.id);
      setSelectedRoutine(routine);
      setIsEditing(true);
      const hist = await loadHistoryForRoutine(routine.id);
      const bestMap = computeBestFromHistory(hist, branch);
      const bestBySetMap = computeBestBySetFromHistory(hist);
      const recentBySetMap = computeRecentBySetFromHistory(hist);
      const seriesTypeMap = computeLatestSeriesTypeFromHistory(
        hist,
        routine.id,
        branch,
      );
      setExercises(
        buildExercisesForRoutine(
          routine.raw,
          training,
          bestMap,
          bestBySetMap,
          recentBySetMap,
          seriesTypeMap,
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
      console.warn("No se pudo cargar el entrenamiento a editar", e);
      if (typeof localStorage !== "undefined")
        localStorage.removeItem("edit_training_id");
      setEditingId("");
      setIsEditing(false);
      // fallback: cargar rutina inicial en la fecha actual
      const routine =
        routineOptions.find((r) => r.id === selectedRoutineId) ||
        routineOptions[0];
      await loadHistoryForRoutine(routine.id);
      await loadTrainingForDate(sessionDate, routine.id);
    } finally {
      setLoadingTraining(false);
    }
  };
  const loadHistoryForRoutine = async (_routineId) => {
    try {
      let resp;
      try {
        resp = await api.getTrainings({
          limit: 200,
          fields:
            "date,routineId,branch,exercises.exerciseId,exercises.exerciseName,exercises.order,exercises.plannedOrder,exercises.actualOrder,exercises.orderContext,exercises.movementMode,exercises.seriesType,exercises.sets.seriesType,exercises.sets.weightKg,exercises.sets.reps,exercises.sets.entries.weightKg,exercises.sets.entries.reps,exercises.sets.entries.done,exercises.sets.entries.previousText",
          meta: false,
        });
      } catch (projectionError) {
        console.warn(
          "No se pudo cargar historial optimizado, intentando historial completo",
          projectionError,
        );
        resp = await api.getTrainings({
          limit: 200,
          fields: "date,routineId,branch,exercises",
          meta: false,
        });
      }
      const list = Array.isArray(resp) ? resp : resp?.items || [];
      setHistoryTrainings(list);
      return list;
    } catch (e) {
      console.warn("No se pudo cargar historial general", e);
      if (Array.isArray(trainings) && trainings.length) {
        setHistoryTrainings(trainings);
        return trainings;
      }
      setHistoryTrainings([]);
      return [];
    }
  };

  useEffect(() => {
    if (!allRoutineOptions.length) return;
    if (initializedTrainingScreen.current) return;
    initializedTrainingScreen.current = true;
    const editId =
      typeof localStorage !== "undefined"
        ? localStorage.getItem("edit_training_id")
        : "";
    const editDate =
      typeof localStorage !== "undefined"
        ? localStorage.getItem("edit_training_date")
        : "";
    if (editId) {
      setEditingId(editId);
      (async () => {
        await loadTrainingById(editId);
        if (editDate) setSessionDate(editDate);
      })();
    } else {
      setIsEditing(false);
      setBranchLocked(false);
      // esperar a que el usuario seleccione rutina
      setSelectedRoutineId(null);
      setSelectedRoutine(null);
      setExercises([]);
      setHistoryTrainings([]);
      setDurationSeconds(0);
      setIsRunning(false);
    }
  }, [allRoutineOptions]);

  useEffect(() => {
    historyLoadAttempted.current = false;
  }, [selectedRoutineId]);

  useEffect(() => {
    if (!selectedRoutineId) return;
    if (historyTrainings.length) return;
    if (historyLoadAttempted.current) return;
    historyLoadAttempted.current = true;
    loadHistoryForRoutine(selectedRoutineId);
  }, [selectedRoutineId, historyTrainings.length]);

  useEffect(() => {
    if (!selectedRoutineId || !routineOptions.length) return;
    const latestRoutine = routineOptions.find(
      (r) => r.id === selectedRoutineId,
    );
    if (!latestRoutine) return;
    const previousRaw = selectedRoutine?.raw;
    setSelectedRoutine((current) =>
      current?.raw === latestRoutine.raw ? current : latestRoutine,
    );
    const routineExercises = latestRoutine.raw?.exercises || [];
    if (!routineExercises.length) return;
    if (!exercises.length) return;
    if (previousRaw === latestRoutine.raw) return;

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
      const result = mergeRoutineIntoActiveExercises(prev, latestRoutine.raw);
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
  }, [selectedRoutineId, routineOptions, exercises.length, selectedRoutine]);

  useEffect(() => {
    if (historyTrainings.length) return;
    if (trainings.length) setHistoryTrainings(trainings);
  }, [trainings, historyTrainings.length]);

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
      const routine = allRoutineOptions.find(
        (r) => r.id === snap.selectedRoutineId,
      );
      if (!routine) return;
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
      restoredFromSnapshot.current = true;
      branchChangeReason.current = "routine";
      setSelectedBranch(
        normalizeBranch(snap.selectedBranch || routine.location),
      );
      setSelectedRoutineId(snap.selectedRoutineId);
      setSelectedRoutine(routine);
      setSessionDate(snap.sessionDate || todayISO);
      lastUpdateRef.current = now;
      setDurationSeconds(totalSeconds);
      setTimeEvents(fallbackEvents);
      setIsRunning(Boolean(snap.isRunning));
      setHasStarted(
        Boolean(snap.hasStarted) || Boolean(snap.isRunning) || totalSeconds > 0,
      );
      if (Array.isArray(snap.exercises))
        setExercises(
          snap.exercises.map((ex) => {
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
          }),
        );
    } catch (e) {
      console.warn("No se pudo restaurar el entrenamiento activo", e);
    }
  }, [allRoutineOptions, isEditing, selectedRoutineId]);

  useEffect(() => {
    if (!selectedRoutineId || !sessionDate) return;
    if (isEditing) return;
    if (restoredFromSnapshot.current) {
      restoredFromSnapshot.current = false;
      return;
    }
    loadTrainingForDate(sessionDate, selectedRoutineId);
  }, [sessionDate, isEditing]);

  useEffect(() => {
    if (!historyTrainings.length) return;
    if (!exercises.length) return;
    setExercises((prev) =>
      applyHistoryToExercises(
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
    selectedBranch,
    exercises.length,
  ]);

  // Mantener rutinas al cambiar sucursal (solo limpiar cuando el cambio es iniciado por el usuario)
  useEffect(() => {
    if (branchChangeReason.current === "routine") {
      branchChangeReason.current = "user";
    } else {
      setSelectedRoutineId(null);
      setSelectedRoutine(null);
      setExercises([]);
      setHistoryTrainings([]);
      setIsRunning(false);
      setHasStarted(false);
      setTimeEvents([]);
      setActiveExerciseId("");
      setNowMs(Date.now());
    }
    if (typeof setBranch === "function") setBranch(selectedBranch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch]);

  const persistTrainingSnapshot = useCallback(() => {
    if (typeof localStorage === "undefined") return;
    if (!selectedRoutineId) return;
    try {
      const snapshot = {
        selectedRoutineId,
        selectedRoutine,
        selectedBranch,
        sessionDate,
        durationSeconds,
        elapsed: durationSeconds,
        isRunning,
        hasStarted,
        lastUpdate: lastUpdateRef.current,
        timeEvents,
        exercises,
      };
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
    } catch (e) {
      console.warn("No se pudo guardar el estado del entrenamiento", e);
    }
  }, [
    selectedRoutineId,
    selectedRoutine,
    selectedBranch,
    sessionDate,
    durationSeconds,
    isRunning,
    hasStarted,
    timeEvents,
    exercises,
  ]);

  // Guardar snapshot local del entrenamiento en curso
  useEffect(() => {
    persistTrainingSnapshot();
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

  useEffect(() => {
    if (!restTimerRunning) {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
      return undefined;
    }
    restTimerRef.current = setInterval(() => {
      setRestRemainingSeconds((current) => {
        if (current <= 1) {
          clearInterval(restTimerRef.current);
          setRestTimerRunning(false);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => clearInterval(restTimerRef.current);
  }, [restTimerRunning]);

  const handleOpenRestTimer = () => {
    setRestTimerOpen(true);
    setRestTimerMinimized(false);
  };

  const handleStartRestTimer = (minutes = restMinutesInput) => {
    const parsedMinutes = Math.max(1, Number(minutes) || 1);
    const seconds = parsedMinutes * 60;
    setRestMinutesInput(parsedMinutes);
    setRestDurationSeconds(seconds);
    setRestRemainingSeconds(seconds);
    setRestTimerStarted(true);
    setRestTimerRunning(true);
    setRestTimerOpen(true);
    setRestTimerMinimized(false);
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
    setRestTimerRunning((value) => !value);
  };

  const handleResetRestTimer = () => {
    const seconds = Math.max(1, Number(restMinutesInput) || 1) * 60;
    setRestDurationSeconds(seconds);
    setRestRemainingSeconds(seconds);
    setRestTimerRunning(false);
    setRestTimerStarted(false);
  };

  const handleCloseRestTimer = () => {
    setRestTimerOpen(false);
    setRestTimerMinimized(true);
    setRestTimerRunning(false);
    setRestTimerStarted(false);
    setRestRemainingSeconds(restDurationSeconds);
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
    toast.success("Entrenamiento iniciado");
  };

  const handlePause = () => {
    const now = Date.now();
    lastUpdateRef.current = now;
    setNowMs(now);
    if (isRunning) {
      setTimeEvents((prev) => [
        ...prev,
        createTimeEvent("session_pause", null, now),
      ]);
    }
    setIsRunning(false);
  };

  const handleReset = () => {
    const now = Date.now();
    lastUpdateRef.current = now;
    setNowMs(now);
    setIsRunning(false);
    setTimeEvents([]);
    setActiveExerciseId("");
    setHasStarted(false);
  };

  const resetState = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRunning(false);
    setTimeEvents([]);
    setActiveExerciseId("");
    setNowMs(Date.now());
    setDurationSeconds(0);
    setHasStarted(false);
    setSelectedBranch(DEFAULT_BRANCH);
    setSelectedRoutineId("");
    setSelectedRoutine(null);
    setExercises([]);
    setShowExercisePicker(false);
    setExerciseSearch("");
    setSelectedMuscleGroup("");
    setShowTracking(false);
    setTrackingExerciseId("");
    setTrainingPhotoFile(null);
    setTrainingPhotoPreview("");
    setTrainingPhotoError("");
    setSessionDate(todayISO);
    setEditingId("");
    setIsEditing(false);
    setHasStarted(false);
    setBranchLocked(false);
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(SNAPSHOT_KEY);
      localStorage.removeItem(TRAINING_ROUTINES_RETURN_KEY);
      localStorage.removeItem("edit_training_id");
      localStorage.removeItem("edit_training_date");
    }
  };

  const handleSelectRoutine = (id) => {
    if (!id || id === "sin-rutina") return;
    const found = routineOptions.find((r) => r.id === id);
    const branch = normalizeBranch(found?.location);
    branchChangeReason.current = "routine";
    setSelectedBranch(branch);
    setSelectedRoutineId(id);
    setSelectedRoutine(found || null);
    setIsRunning(false);
    setHasStarted(false);
    setTimeEvents([]);
    setActiveExerciseId("");
    setNowMs(Date.now());
    (async () => {
      const hist = await loadHistoryForRoutine(id);
      const bestMap = computeBestFromHistory(hist, branch);
      const bestBySetMap = computeBestBySetFromHistory(hist);
      const recentBySetMap = computeRecentBySetFromHistory(hist);
      const seriesTypeMap = computeLatestSeriesTypeFromHistory(
        hist,
        id,
        branch,
      );
      await loadTrainingForDate(
        sessionDate,
        id,
        bestMap,
        bestBySetMap,
        recentBySetMap,
        seriesTypeMap,
      );
    })();
  };

  const handleBranchChange = (value) => {
    branchChangeReason.current = "user";
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(SNAPSHOT_KEY);
      localStorage.removeItem(TRAINING_ROUTINES_RETURN_KEY);
    }
    setSelectedBranch(normalizeBranch(value));
  };

  const handleExitEdit = async () => {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("edit_training_id");
      localStorage.removeItem("edit_training_date");
      localStorage.removeItem(SNAPSHOT_KEY);
      localStorage.removeItem(TRAINING_ROUTINES_RETURN_KEY);
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setEditingId("");
    setIsEditing(false);
    setHasStarted(false);
    setBranchLocked(false);
    setSelectedRoutineId(null);
    setSelectedRoutine(null);
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
    setDurationSeconds(0);
    setIsRunning(false);
    setTimeEvents([]);
    setActiveExerciseId("");
    setNowMs(Date.now());
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

  const handleMovementModeChange = (exerciseId, value) => {
    const nextMode = normalizeMovementMode(value);
    setExercises((prev) => {
      const nextList = prev.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              movementMode: nextMode,
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
                      ? getRemoteBranchLabel(perSet.branch, selectedBranch)
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
                          ? { ...entry, [field]: value }
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
    if (targetEntry && !targetEntry.done) {
      handleStartExerciseNow(exerciseId, { silent: true });
    }
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
                          ? { ...entry, done: !entry.done }
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
    setExercises((prev) =>
      applyExerciseOrder(prev.filter((ex) => ex.id !== exerciseId)),
    );
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
        normalizeBranch(globalBest.branch) !== normalizeBranch(selectedBranch))
        ? `Mejor global: ${globalBest.weight}kg x ${globalBest.reps} · ${formatBranchLabel(
            globalBest.branch,
          )}`
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
          supportsUnilateral,
          movementMode,
          seriesType,
          sets: [
            {
              id: newSetId,
              prSummary: perSetSummary,
              prBranchLabel: perSet
                ? getRemoteBranchLabel(perSet.branch, selectedBranch)
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

  const handleAddExerciseForMuscle = (muscle) => {
    setSelectedMuscleGroup(muscle || "");
    setExerciseSearch("");
    setShowExercisePicker(true);
  };

  const handleTrainingPhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_TRAINING_PHOTO_BYTES) {
      setTrainingPhotoError("Max 10MB");
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

  const handleFinish = async () => {
    const finishAt = Date.now();
    const finalTimeEvents = normalizeTimeEvents([
      ...timeEvents,
      ...(timeEvents.length
        ? [createTimeEvent("session_end", null, finishAt)]
        : []),
    ]);
    const finalTimingSummary = calculateTimingSummary(
      finalTimeEvents,
      finishAt,
    );
    setIsRunning(false);
    setTimeEvents(finalTimeEvents);
    setNowMs(finishAt);
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      if (!selectedRoutineId || !selectedRoutine) {
        toast.error("Selecciona sucursal y rutina antes de guardar.");
        return;
      }
      const dateStr = sessionDate || getLocalISODate();
      const payload = {
        date: dateStr,
        routineId: selectedRoutine?.id,
        routineName: selectedRoutine?.name,
        branch: normalizeBranch(selectedBranch || selectedRoutine?.location),
        durationSeconds: finalTimingSummary.durationSeconds || durationSeconds,
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
                const entriesPayload = entries.map((entry, entryIdx) => ({
                  weightKg: parseDecimal(entry.kg),
                  reps: parseDecimal(entry.reps),
                  done: Boolean(entry.done),
                  order: entryIdx + 1,
                  previousText: entry.previousText,
                }));
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
              sets,
            };
          })
          .filter((ex) => ex.sets.length > 0),
      };
      // verificar duplicados en misma fecha + rutina
      if (selectedRoutine?.id) {
        const existing = await api.getTrainings({
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
            "Ya existe un entrenamiento para esta rutina en esa fecha. Â¿Deseas sobrescribirlo?",
          );
          if (!proceed) return;
        }
      }

      let savedTraining = null;
      if (editingId) {
        savedTraining = await updateTraining(editingId, payload);
        setEditingId("");
        setIsEditing(false);
      } else {
        savedTraining = await addTraining(payload);
      }
      if (savedTraining && trainingPhotoFile) {
        const trainingId = savedTraining.id || savedTraining._id;
        const routineLabel = selectedRoutine?.name
          ? `Entrenamiento - ${selectedRoutine.name}`
          : "Foto en entrenamiento";
        try {
          await addPhoto({
            file: trainingPhotoFile,
            date: dateStr,
            label: routineLabel,
            type: "gym",
            sessionId: trainingId || "",
          });
        } catch (err) {
          console.error("No se pudo subir la foto", err);
          toast.error("No se pudo subir la foto del entrenamiento.");
        }
      }
      if (savedTraining && typeof localStorage !== "undefined") {
        const lastId = savedTraining.id || savedTraining._id;
        if (lastId) localStorage.setItem("last_training_id", lastId);
      }
      toast.success("Entrenamiento guardado correctamente.");
      resetState();
      await loadTrainingForDate(todayISO, null);
      if (typeof onNavigate === "function") onNavigate("resumen_sesion");
    } catch (err) {
      console.error("No se pudo guardar el entrenamiento", err);
      toast.error(
        "No se pudo guardar el entrenamiento. Revisa tu conexiÃ³n o intenta de nuevo.",
      );
    }
  };

  const handleCancel = () => {
    if (isEditing) {
      handleExitEdit();
      toast.message("Edicion cancelada");
      return;
    }
    resetState();
    toast.message("Entrenamiento cancelado");
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
  const showFinishButton =
    isEditing || hasStarted || isRunning || durationSeconds > 0;
  const showCancelButton = hasStarted || isRunning || durationSeconds > 0;
  const showResetButton = hasStarted || durationSeconds > 0;
  const showMobileTrainingBar = hasStarted || isRunning || durationSeconds > 0;
  const progressPct = totalSets
    ? Math.min(100, Math.round((doneSets / totalSets) * 100))
    : 0;
  const selectorRoutine = selectedRoutine || null;
  const groupedExercises = useMemo(() => {
    const groups = new Map();
    exercises.forEach((ex) => {
      const key = ex.muscle || "Sin grupo";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(ex);
    });
    return Array.from(groups.entries());
  }, [exercises]);

  const trackingExercise = useMemo(
    () => exercises.find((ex) => ex.id === trackingExerciseId) || null,
    [exercises, trackingExerciseId],
  );
  const activeExercise = useMemo(
    () => exercises.find((ex) => ex.id === activeExerciseId) || null,
    [exercises, activeExerciseId],
  );
  const activeExerciseDuration = activeExerciseId
    ? timingSummary.exerciseDurations.get(activeExerciseId) || 0
    : 0;

  const extraExerciseOptions = useMemo(() => {
    const routineExtras = selectedRoutine?.raw?.exercises || [];
    const extras = routineExtras.filter((ex) => ex.isExtra);
    if (!extras.length) return [];
    return buildExercisesForRoutine(
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
    historyGlobalBest,
    historyBestBySet,
    historyRecentBySet,
    historySeriesTypeMap,
    selectedBranch,
  ]);

  const trackingRows = useMemo(() => {
    if (!trackingExercise) return [];
    const keys = getMovementHistoryKeys(trackingExercise);
    if (!keys.length) return [];
    const keySet = new Set(keys);
    const rows = [];
    (historyTrainings || []).forEach((tr) => {
      const date = tr.date || tr.createdAt;
      const exMatch = (tr.exercises || []).find((ex) =>
        getMovementHistoryKeys(ex).some((key) => keySet.has(key)),
      );
      if (!exMatch) return;
      const sets = (exMatch.sets || []).map((set) => {
        if (Array.isArray(set.entries) && set.entries.length) {
          return set.entries;
        }
        return [set];
      });
      rows.push({
        date: date ? String(date).slice(0, 10) : "",
        ts: getDateTimestamp(date),
        routineName: tr.routineName || "",
        branch: tr.branch || "",
        sets,
      });
    });
    return rows
      .filter((row) => row.sets.length > 0)
      .sort((a, b) => a.ts - b.ts);
  }, [trackingExercise, historyTrainings]);

  const trackingSetCount = useMemo(() => {
    if (!trackingRows.length) return 0;
    return trackingRows.reduce((acc, row) => Math.max(acc, row.sets.length), 0);
  }, [trackingRows]);
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

  return (
    <main className="relative min-h-screen w-full max-w-full overflow-x-hidden bg-[color:var(--bg)] text-[color:var(--text)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70 dark:opacity-100 bg-[radial-gradient(120%_80%_at_20%_10%,rgba(59,130,246,0.18),transparent_55%),radial-gradient(80%_60%_at_85%_0%,rgba(14,165,233,0.16),transparent_60%)]"
      />
      <Toaster position="top-center" richColors />
      <div
        className={`relative mx-auto w-full max-w-full min-w-0 overflow-x-hidden pb-28 md:max-w-4xl md:px-4 lg:max-w-6xl space-y-4 ${
          showMobileTrainingBar ? "pt-24 md:pt-4" : "pt-4"
        }`}
      >
        {showMobileTrainingBar && (
          <div className="fixed top-14 left-0 right-0 z-30 md:hidden px-3 sm:px-4">
            <div className="pt-3 pb-2 bg-[color:var(--bg)]/92 backdrop-blur">
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)]/90 px-3 py-2 shadow-lg">
                <div className="flex shrink-0 items-baseline gap-2">
                  <span className="font-mono text-lg text-[color:var(--text)]">
                    {formatDuration(durationSeconds)}
                  </span>
                  <span
                    className={`text-[10px] font-semibold uppercase ${
                      isRunning
                        ? "text-red-400"
                        : "text-[color:var(--text-muted)]"
                    }`}
                  >
                    Live
                  </span>
                </div>
                {activeExercise && (
                  <p className="min-w-0 flex-1 truncate text-[11px] text-[color:var(--text-muted)]">
                    {activeExercise.name} ·{" "}
                    {formatDuration(activeExerciseDuration)}
                  </p>
                )}
                <div className="flex shrink-0 items-center gap-1.5">
                  {showFinishButton && (
                    <Button
                      size="sm"
                      className="rounded-full px-2.5"
                      onClick={handleFinish}
                      disabled={!exercises.length}
                    >
                      Finalizar
                    </Button>
                  )}
                  {showCancelButton && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full px-2.5"
                      onClick={handleCancel}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="hidden md:flex items-center justify-between">
          <h1 className="text-3xl font-bold">Registrar Entrenamiento</h1>
          <div className="flex items-center gap-2">
            {isEditing && (
              <Button variant="outline" size="sm" onClick={handleExitEdit}>
                Salir de edicion
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-10 w-10 text-[color:var(--text-muted)]"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="md:sticky md:top-2 z-20">
          <Card className="p-3 md:p-4 border border-[color:var(--border)] bg-[color:var(--card)]/85 backdrop-blur shadow-lg space-y-3">
            <div className="hidden md:flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[160px]">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-muted)] font-semibold">
                  Duracion
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-xl md:text-2xl text-[color:var(--text)]">
                    {formatDuration(durationSeconds)}
                  </span>
                  <span
                    className={`text-[11px] font-semibold uppercase ${
                      isRunning
                        ? "text-red-400"
                        : "text-[color:var(--text-muted)]"
                    }`}
                  >
                    Live
                  </span>
                </div>
                {activeExercise && (
                  <p className="mt-1 truncate text-xs text-[color:var(--text-muted)]">
                    Actual: {activeExercise.name} ·{" "}
                    {formatDuration(activeExerciseDuration)}
                  </p>
                )}
              </div>
              <div className="flex flex-1 items-center justify-end gap-2 min-w-[200px]">
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={handleEditRoutineFromTraining}
                >
                  <ClipboardList className="h-4 w-4" />
                  <span>Editar rutina</span>
                </Button>
                {showFinishButton && (
                  <Button
                    className="rounded-full"
                    onClick={handleFinish}
                    disabled={!exercises.length}
                  >
                    <Flag className="h-4 w-4" />
                    <span>Finalizar</span>
                  </Button>
                )}
                {showCancelButton && (
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={handleCancel}
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[color:var(--text-muted)]">
              <button
                type="button"
                onClick={() => {
                  if (datePickerRef.current?.showPicker) {
                    datePickerRef.current.showPicker();
                  } else if (datePickerRef.current) {
                    datePickerRef.current.focus();
                    datePickerRef.current.click();
                  }
                }}
                className="relative inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-1.5 text-[color:var(--text)]"
              >
                Fecha: {formatLongDate(sessionDate)}
                <input
                  ref={datePickerRef}
                  type="date"
                  value={sessionDate}
                  onChange={(e) => {
                    const nextDate = e.target.value
                      ? e.target.value.slice(0, 10)
                      : getLocalISODate();
                    setSessionDate(nextDate);
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  aria-label="Seleccionar fecha"
                />
              </button>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full px-3 md:hidden"
                  onClick={handleEditRoutineFromTraining}
                >
                  <ClipboardList className="h-4 w-4" />
                  <span>Editar</span>
                </Button>
                <Button
                  size="sm"
                  className="rounded-full px-4"
                  onClick={isRunning ? handlePause : handleStart}
                >
                  {isRunning ? "Pausar" : "Iniciar"}
                </Button>
                {showResetButton && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full px-3"
                    onClick={handleReset}
                  >
                    Reiniciar
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>

        {selectedRoutineId && (
          <Card className="p-4 md:p-5 border border-[color:var(--border)] bg-[color:var(--card)]/80 backdrop-blur shadow-lg space-y-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-muted)] font-semibold">
              Resumen rapido
            </p>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-[color:var(--text-muted)]">
                  Ejercicios realizados:
                </p>
                <p className="text-sm text-[color:var(--text-muted)]">
                  Sets totales:
                </p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-lg font-semibold text-[color:var(--text)]">
                  {formatCounter(completedExercises)} /{" "}
                  {formatCounter(exercises.length)}
                </p>
                <p className="text-lg font-semibold text-[color:var(--text)]">
                  {totalSets}
                </p>
              </div>
            </div>
            <div className="h-2 rounded-full bg-[color:var(--border)]/60 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </Card>
        )}

        <div className="grid min-w-0 max-w-full gap-4 md:grid-cols-[360px_minmax(0,1fr)]">
          <div className="min-w-0 max-w-full space-y-4">
            <Card className="p-4 space-y-4 border border-[color:var(--border)] bg-[color:var(--card)]/85 backdrop-blur shadow-sm">
              <div className="space-y-2">
                <p className="text-[11px] uppercase text-[color:var(--text-muted)] font-semibold">
                  Sucursal
                </p>
                <select
                  value={selectedBranch}
                  onChange={(e) => handleBranchChange(e.target.value)}
                  className="w-full rounded-full border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-sm text-[color:var(--text)] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  {branchOptions.map((b) => (
                    <option
                      key={b}
                      value={b}
                      className="bg-[color:var(--card)] text-[color:var(--text)]"
                    >
                      {b}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-[color:var(--text-muted)]">
                  Rutinas disponibles para: {selectedBranch}
                </p>
              </div>

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
                />
              </div>
            </Card>
          </div>

          <section className="min-w-0 max-w-full space-y-3">
            {selectedRoutineId ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-muted)] font-semibold">
                      EJERCICIOS ({exercises.length})
                    </p>
                    <p className="text-xs text-[color:var(--text-muted)]">
                      {loadingTraining ? "Cargando..." : "En progreso"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {exercises.length > 1 && (
                      <Button
                        size="sm"
                        variant={isOrderingExercises ? "default" : "outline"}
                        className="md:hidden rounded-full"
                        onClick={() =>
                          setIsOrderingExercises((value) => !value)
                        }
                      >
                        {isOrderingExercises ? (
                          <>
                            <Check className="h-4 w-4" />
                            <span>Listo</span>
                          </>
                        ) : (
                          "Ordenar"
                        )}
                      </Button>
                    )}
                    <Badge variant="secondary" className="text-[11px]">
                      Total sets: {totalSets}
                    </Badge>
                    <Badge className="text-[11px]">
                      {progressPct}% completado
                    </Badge>
                  </div>
                </div>

                <div className="min-w-0 max-w-full space-y-4">
                  <div className="min-w-0 max-w-full space-y-3 md:hidden">
                    {isOrderingExercises ? (
                      <div className="space-y-4">
                        {groupedExercises.map(([muscle, items]) => (
                          <div key={muscle} className="space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                              <div>
                                <p className="text-lg font-semibold text-[color:var(--text)]">
                                  {muscle}
                                </p>
                                <p className="text-xs text-[color:var(--text-muted)]">
                                  {selectorRoutine?.name || "Rutina sin nombre"}
                                </p>
                              </div>
                              <Badge
                                variant="secondary"
                                className="text-[11px]"
                              >
                                {items.length} ejercicios
                              </Badge>
                            </div>

                            <div className="space-y-2">
                              {items.map((ex, groupIndex) => {
                                const canMoveUp = groupIndex > 0;
                                const canMoveDown =
                                  groupIndex < items.length - 1;
                                return (
                                  <div
                                    key={ex.id}
                                    className="grid w-full max-w-full grid-cols-[36px_minmax(0,1fr)_76px] items-center gap-2 overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)]/90 p-3 shadow-sm"
                                  >
                                    <div className="grid h-9 w-9 place-items-center rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] text-sm font-semibold text-[color:var(--text)]">
                                      {groupIndex + 1}
                                    </div>
                                    <div className="min-w-0 max-w-full overflow-hidden">
                                      <p className="block max-w-full truncate whitespace-nowrap text-sm font-semibold text-[color:var(--text)]">
                                        {ex.name}
                                      </p>
                                      <p className="block max-w-full truncate whitespace-nowrap text-xs text-[color:var(--text-muted)]">
                                        {ex.sets?.length || 0} sets
                                      </p>
                                    </div>
                                    <div className="flex w-[76px] items-center justify-end gap-1">
                                      <Button
                                        size="icon"
                                        variant="outline"
                                        className="h-9 w-9 min-w-9 rounded-full p-0"
                                        disabled={!canMoveUp}
                                        onClick={() =>
                                          handleMoveExercise(ex.id, -1)
                                        }
                                        aria-label={`Subir ${ex.name}`}
                                      >
                                        <ArrowUp className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="outline"
                                        className="h-9 w-9 min-w-9 rounded-full p-0"
                                        disabled={!canMoveDown}
                                        onClick={() =>
                                          handleMoveExercise(ex.id, 1)
                                        }
                                        aria-label={`Bajar ${ex.name}`}
                                      >
                                        <ArrowDown className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      groupedExercises.map(([muscle, items]) => (
                        <div
                          key={muscle}
                          className="min-w-0 max-w-full space-y-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                            <div>
                              <p className="text-xl font-semibold text-[color:var(--text)]">
                                {muscle}
                              </p>
                              <p className="text-xs text-[color:var(--text-muted)]">
                                {selectorRoutine?.name || "Rutina sin nombre"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="secondary"
                                className="text-[11px]"
                              >
                                {items.length} ejercicios
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-full px-3"
                                onClick={() =>
                                  handleAddExerciseForMuscle(muscle)
                                }
                              >
                                Agregar
                              </Button>
                            </div>
                          </div>
                          <AnimatePresence>
                            {items.map((ex) => {
                              const movementConfig = getRoutineMovementConfig(
                                selectedRoutine?.raw?.exercises || [],
                                ex,
                              );
                              return (
                                <ExerciseCard
                                  key={ex.id}
                                  exercise={{
                                    ...ex,
                                    durationSeconds:
                                      timingSummary.exerciseDurations.get(
                                        ex.id,
                                      ) || 0,
                                    isActive: activeExerciseId === ex.id,
                                    supportsUnilateral:
                                      movementConfig.supportsUnilateral,
                                    movementMode:
                                      ex.movementMode ||
                                      movementConfig.movementMode,
                                  }}
                                  onAddSet={() => handleAddSet(ex.id)}
                                  onUpdateEntry={(
                                    setId,
                                    entryId,
                                    field,
                                    value,
                                  ) =>
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
                                  onSwapVariant={(direction) =>
                                    handleSwapVariant(ex.id, direction)
                                  }
                                  onStartNow={() =>
                                    handleStartExerciseNow(ex.id)
                                  }
                                  onViewTracking={() => {
                                    setTrackingExerciseId(ex.id);
                                    setShowTracking(true);
                                  }}
                                  onViewHistory={() => {
                                    if (typeof localStorage !== "undefined")
                                      localStorage.setItem(
                                        "last_exercise_id",
                                        ex.id,
                                      );
                                    if (typeof onNavigate === "function")
                                      onNavigate("ejercicio_analitica");
                                  }}
                                />
                              );
                            })}
                          </AnimatePresence>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="hidden min-w-0 max-w-full space-y-4 md:block">
                    {groupedExercises.map(([muscle, items]) => (
                      <div key={muscle} className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                          <div>
                            <p className="text-xl font-semibold text-[color:var(--text)]">
                              {muscle}
                            </p>
                            <p className="text-xs text-[color:var(--text-muted)]">
                              {selectorRoutine?.name || "Rutina sin nombre"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-[11px]">
                              {items.length} ejercicios
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-full px-3"
                              onClick={() => handleAddExerciseForMuscle(muscle)}
                            >
                              Agregar
                            </Button>
                          </div>
                        </div>
                        <AnimatePresence>
                          {items.map((ex) => {
                            const movementConfig = getRoutineMovementConfig(
                              selectedRoutine?.raw?.exercises || [],
                              ex,
                            );
                            return (
                              <ExerciseCard
                                key={ex.id}
                                exercise={{
                                  ...ex,
                                  durationSeconds:
                                    timingSummary.exerciseDurations.get(
                                      ex.id,
                                    ) || 0,
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
                                onSwapVariant={(direction) =>
                                  handleSwapVariant(ex.id, direction)
                                }
                                onStartNow={() => handleStartExerciseNow(ex.id)}
                                onViewTracking={() => {
                                  setTrackingExerciseId(ex.id);
                                  setShowTracking(true);
                                }}
                                onViewHistory={() => {
                                  if (typeof localStorage !== "undefined")
                                    localStorage.setItem(
                                      "last_exercise_id",
                                      ex.id,
                                    );
                                  if (typeof onNavigate === "function")
                                    onNavigate("ejercicio_analitica");
                                }}
                              />
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>

                  {extraExerciseOptions.length > 0 && (
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
                            width: 120,
                            height: 120,
                          });
                          return (
                            <div
                              key={`extra-${ex.id}`}
                              className="flex items-center gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3"
                            >
                              <div className="h-10 w-10 rounded-lg overflow-hidden border border-[color:var(--border)] bg-[color:var(--card)]">
                                {extraThumb ? (
                                  <img
                                    src={extraThumb}
                                    alt={ex.name}
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="h-full w-full grid place-items-center text-xs text-[color:var(--text-muted)]">
                                    {(ex.name || "?").charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-[color:var(--text)] truncate">
                                  {ex.name}
                                </p>
                                <p className="text-xs text-[color:var(--text-muted)]">
                                  {ex.muscle || "Sin grupo"} •{" "}
                                  {ex.sets?.length || 0} sets
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

                  <motion.div whileTap={{ scale: 0.97 }}>
                    <Button
                      variant="outline"
                      className="w-full rounded-2xl border-dashed border-[color:var(--border)] text-[color:var(--text)] py-3"
                      onClick={handleAddExercise}
                    >
                      + Agregar Ejercicio
                    </Button>
                  </motion.div>
                </div>
              </>
            ) : (
              <Card className="p-6 text-center text-sm text-[color:var(--text-muted)]">
                Selecciona primero la sucursal y la rutina para cargar los
                ejercicios.
              </Card>
            )}
          </section>
        </div>
      </div>

      {selectedRoutineId && allSetsDone && (
        <Card className="p-4 md:p-6 border border-[color:var(--border)] bg-[color:var(--card)]/90 backdrop-blur shadow-lg space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-muted)] font-semibold">
                Cierre del entrenamiento
              </p>
              <h3 className="text-lg font-semibold text-[color:var(--text)]">
                Foto final de la sesion
              </h3>
              <p className="text-xs text-[color:var(--text-muted)]">
                Se guardara en tu biblioteca al finalizar.
              </p>
            </div>
            <Badge variant="secondary" className="text-[11px]">
              Opcional
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr,200px] items-start">
            <div className="space-y-3">
              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3 text-xs text-[color:var(--text-muted)]">
                Consejo: toma la foto con buena luz y la misma distancia para
                comparar tu progreso.
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    asChild
                  >
                    <span>
                      {trainingPhotoFile ? "Cambiar foto" : "Tomar foto"}
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleTrainingPhotoChange}
                  />
                </label>
                {trainingPhotoFile && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-full"
                    onClick={clearTrainingPhoto}
                  >
                    Quitar
                  </Button>
                )}
              </div>
              {trainingPhotoError && (
                <p className="text-xs text-red-500">{trainingPhotoError}</p>
              )}
            </div>

            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] overflow-hidden">
              <div className="aspect-[4/5] w-full">
                {trainingPhotoPreview ? (
                  <img
                    src={trainingPhotoPreview}
                    alt="Vista previa"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full grid place-items-center text-xs text-[color:var(--text-muted)]">
                    Sin foto
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

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
                        ? "border-blue-400/50 bg-blue-500/10 text-[color:var(--text)] font-semibold"
                        : "border-[color:var(--border)] bg-[color:var(--bg)] text-[color:var(--text-muted)] hover:border-blue-400/40"
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
                className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-sm text-[color:var(--text)] focus:outline-none focus:ring-2 focus:ring-blue-500/25"
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
                      <div className="aspect-video w-full rounded-xl overflow-hidden border border-[color:var(--border)] bg-slate-100 grid place-items-center">
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
          subtitle="Historial de pesos por serie (por fecha)."
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
                <div className="h-14 w-14 rounded-xl overflow-hidden border border-[color:var(--border)] bg-[color:var(--bg)]">
                  {getExerciseImageUrl(trackingExercise, {
                    width: 160,
                    height: 160,
                  }) ? (
                    <img
                      src={getExerciseImageUrl(trackingExercise, {
                        width: 160,
                        height: 160,
                      })}
                      alt={trackingExercise.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-xs text-[color:var(--text-muted)]">
                      Sin imagen
                    </div>
                  )}
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
                    <span className="text-xs text-[color:var(--text-muted)]">
                      {trackingRows.length
                        ? `${trackingRows.length} sesiones registradas`
                        : "Sin registros previos"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {trackingRows.length ? (
              <div className="overflow-x-auto rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-sm">
                <table className="min-w-full w-full text-xs sm:text-sm">
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
                    {trackingRows.map((row, rowIdx) => (
                      <tr
                        key={`${row.date}-${rowIdx}`}
                        className="border-t border-[color:var(--border)]"
                      >
                        <td className="px-3 py-2">
                          <div className="font-semibold text-[color:var(--text)]">
                            {row.date ? formatShort(row.date) : "--"}
                          </div>
                          <div className="mt-0.5 text-[11px] text-[color:var(--text-muted)]">
                            {row.branch
                              ? formatBranchLabel(row.branch)
                              : "Sin sucursal"}
                          </div>
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

      <button
        type="button"
        onClick={handleOpenRestTimer}
        className={`fixed bottom-24 right-4 z-40 md:hidden grid h-14 w-14 place-items-center rounded-full border border-[color:var(--border)] shadow-2xl transition ${
          restTimerRunning
            ? "bg-emerald-600 text-white"
            : restTimerDone
              ? "bg-blue-600 text-white"
              : "bg-[color:var(--card)] text-[color:var(--text)]"
        }`}
        aria-label="Abrir temporizador de descanso"
      >
        <Timer className="h-6 w-6" />
        {restTimerStarted && (
          <span className="absolute -top-2 -left-2 rounded-full border border-[color:var(--border)] bg-[color:var(--bg)] px-2 py-0.5 font-mono text-[10px] text-[color:var(--text)] shadow">
            {restTimerLabel}
          </span>
        )}
      </button>

      <AnimatePresence>
        {restTimerOpen && !restTimerMinimized && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className="fixed inset-0 z-50 md:hidden bg-[color:var(--bg)] text-[color:var(--text)]"
          >
            <div className="flex min-h-screen flex-col px-5 pb-8 pt-5">
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
                    background: `conic-gradient(rgb(16 185 129) ${restProgressPct}%, rgba(148,163,184,0.22) ${restProgressPct}% 100%)`,
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
                      className="h-12 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 text-center text-lg font-semibold text-[color:var(--text)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      className={`h-12 rounded-full ${
                        restTimerRunning
                          ? "bg-amber-500 text-white hover:bg-amber-600"
                          : "bg-emerald-600 text-white hover:bg-emerald-700"
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
                      Reiniciar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
