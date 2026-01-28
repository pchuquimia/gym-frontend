import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Flag, MoreVertical } from "lucide-react";
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
const MAX_TRAINING_PHOTO_BYTES = 10 * 1024 * 1024;

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
    const normalized =
      trimmed.length <= 10 ? `${trimmed}T00:00:00` : trimmed;
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
    const repsLabel =
      meta.reps != null && meta.reps !== "" ? meta.reps : "--";
    const dateLabel = meta.date ? formatShort(meta.date) : "--";
    return `${weightLabel} x ${repsLabel} | ${dateLabel}`;
  }
  return fallback || "Sin referencia";
};

const formatDuration = (sec) => {
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;
  return [hours, minutes, seconds]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
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
        ? prevMeta.weight ?? null
        : entry.previousWeight ?? null;
      const previousReps = hasPrevMeta
        ? prevMeta.reps ?? null
        : entry.previousReps ?? null;
      const previousDate = hasPrevMeta
        ? prevMeta.date ?? null
        : entry.previousDate ?? null;
      const previousCompareWeight = hasCompareMeta
        ? compareMeta.weight ?? null
        : entry.previousCompareWeight ?? null;
      const previousCompareReps = hasCompareMeta
        ? compareMeta.reps ?? null
        : entry.previousCompareReps ?? null;
      const previousCompareDate = hasCompareMeta
        ? compareMeta.date ?? null
        : entry.previousCompareDate ?? null;
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
        fallbackPrev || normalized[0]?.previousText
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

const pickMapKey = (map, keys = []) => {
  if (!map) return null;
  return keys.find((key) => key && map.has(key)) || null;
};

const getDateTimestamp = (value) => {
  if (!value) return 0;
  const normalized = value.length <= 10 ? `${value}T00:00:00` : value;
  const ts = Date.parse(normalized);
  return Number.isNaN(ts) ? 0 : ts;
};

const computeLatestSeriesTypeFromHistory = (
  trainings = [],
  routineId = null
) => {
  const map = new Map();
  trainings.forEach((tr) => {
    if (routineId && tr?.routineId && tr.routineId !== routineId) return;
    const ts = getDateTimestamp(tr?.date || tr?.createdAt);
    (tr?.exercises || []).forEach((ex) => {
      const rawType =
        ex?.seriesType ||
        ex?.sets?.[0]?.seriesType ||
        inferSeriesTypeFromSets(ex?.sets);
      if (!rawType) return;
      const type = normalizeSeriesType(rawType);
      const keys = getExerciseKeys(ex);
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

const computeBestFromHistory = (trainings = []) => {
  const map = new Map();
  trainings.forEach((tr) => {
    const date = tr.date || tr.createdAt;
    const ts = getDateTimestamp(date) || Number.POSITIVE_INFINITY;
    (tr.exercises || []).forEach((ex) => {
      const keys = getExerciseKeys(ex);
      if (!keys.length) return;
      const sets = ex.sets || [];
      sets.forEach((s) => {
        const entries =
          Array.isArray(s.entries) && s.entries.length ? s.entries : [s];
        entries.forEach((entry) => {
          const w = Number(
            entry.weightKg ?? entry.weight ?? entry.kg ?? 0
          );
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
              map.set(key, { weight: w, reps: r, date, ts });
            }
          });
        });
      });
    });
  });
  return map;
};

const computeBestBySetFromHistory = (trainings = []) => {
  const map = new Map();
  trainings.forEach((tr) => {
    const date = tr.date || tr.createdAt;
    const ts = getDateTimestamp(date) || Number.POSITIVE_INFINITY;
    (tr.exercises || []).forEach((ex) => {
      const keys = getExerciseKeys(ex);
      if (!keys.length) return;
      const sets = ex.sets || [];
      const existingKey = keys.find((key) => map.has(key));
      const arr = existingKey ? map.get(existingKey) : [];
      sets.forEach((s, idx) => {
        const entries =
          Array.isArray(s.entries) && s.entries.length ? s.entries : [s];
        entries.forEach((entry) => {
          const w = Number(
            entry.weightKg ?? entry.weight ?? entry.kg ?? 0
          );
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
            arr[idx] = { weight: w, reps: r, date, ts };
          }
        });
      });
      keys.forEach((key) => map.set(key, arr));
    });
  });
  return map;
};

const computeRecentBySetFromHistory = (trainings = [], cutoffDate = null) => {
  const map = new Map();
  const cutoffTs = cutoffDate ? getDateTimestamp(cutoffDate) : null;
  trainings.forEach((tr) => {
    const date = tr.date || tr.createdAt;
    const ts = getDateTimestamp(date);
    if (cutoffTs && ts > cutoffTs) return;
    (tr.exercises || []).forEach((ex) => {
      const keys = getExerciseKeys(ex);
      if (!keys.length) return;
      const sets = ex.sets || [];
      const existingKey = keys.find((key) => map.has(key));
      const arr = existingKey ? map.get(existingKey) : [];
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
          const record = { weight, reps, date, ts };
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
      keys.forEach((key) => map.set(key, arr));
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
  const [selectedRoutineId, setSelectedRoutineId] = useState(null);
  const [selectedRoutine, setSelectedRoutine] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState("");
  const [trackingExerciseId, setTrackingExerciseId] = useState("");
  const [showTracking, setShowTracking] = useState(false);
  const [sessionDate, setSessionDate] = useState(todayISO);
  const [trainingPhotoFile, setTrainingPhotoFile] = useState(null);
  const [trainingPhotoPreview, setTrainingPhotoPreview] = useState("");
  const [trainingPhotoError, setTrainingPhotoError] = useState("");
  const [loadingTraining, setLoadingTraining] = useState(false);
  const [historyTrainings, setHistoryTrainings] = useState([]);
  const [editingId, setEditingId] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(userBranch || "general");
  const branchChangeReason = useRef("user"); // "user" | "routine"
  const restoredFromSnapshot = useRef(false);
  const historyLoadAttempted = useRef(false);
  const lastUpdateRef = useRef(Date.now());
  const [branchLocked, setBranchLocked] = useState(false);
  const timerRef = useRef(null);
  const datePickerRef = useRef(null);

  const branchOptions = useMemo(() => {
    const set = new Set();
    (routines || []).forEach((r) => set.add(r.branch || "general"));
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

  const routineOptions = useMemo(() => {
    const filtered =
      (routines || []).filter((r) =>
        selectedBranch ? (r.branch || "general") === selectedBranch : true
      ) || [];
    if (filtered.length) {
      return filtered.map((r) => ({
        id: r.id,
        name: r.name,
        location: r.branch || "general",
        exerciseCount: (r.exercises || []).length,
        lastDate:
          formatShort(
            latestRoutineDates.get(r.id)?.date || r.updatedAt || r.createdAt
          ) || "--",
        raw: r,
      }));
    }
    // si no hay rutinas de esa sucursal, devolver todas para no dejar vacÃ­o
    return (routines || []).map((r) => ({
      id: r.id,
      name: r.name,
      location: r.branch || "general",
      exerciseCount: (r.exercises || []).length,
      lastDate:
        formatShort(
          latestRoutineDates.get(r.id)?.date || r.updatedAt || r.createdAt
        ) || "--",
      raw: r,
    }));
  }, [routines, selectedBranch, latestRoutineDates]);

  const currentBranch =
    selectedBranch || selectedRoutine?.location || "general";
  const libraryExerciseOptions = useMemo(() => {
    const seen = new Set();
    return (libraryExercises || [])
      .filter((ex) => {
        if (seen.has(ex.id)) return false;
        seen.add(ex.id);
        return true;
      })
      .filter((ex) => {
        if (!currentBranch || currentBranch === "general") return true;
        const branches = ex.branches || [];
        return (
          branches.includes(currentBranch) || branches.includes("general")
        );
      })
      .map((ex) => ({
        id: ex.id,
        name: ex.name,
        muscle: ex.muscle || ex.muscleGroup || "Sin grupo",
        image: ex.image || "",
        imagePublicId: ex.imagePublicId || "",
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
        (!search || ex.name.toLowerCase().includes(search))
    );
  }, [libraryExerciseOptions, exerciseSearch, selectedMuscleGroup]);

  const historyBest = useMemo(
    () => computeBestFromHistory(historyTrainings),
    [historyTrainings]
  );
  const historyBestBySet = useMemo(
    () => computeBestBySetFromHistory(historyTrainings),
    [historyTrainings]
  );
  const historyRecentBySet = useMemo(
    () => computeRecentBySetFromHistory(historyTrainings),
    [historyTrainings]
  );
  const historySeriesTypeMap = useMemo(
    () =>
      computeLatestSeriesTypeFromHistory(
        historyTrainings,
        selectedRoutineId
      ),
    [historyTrainings, selectedRoutineId]
  );

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
    includeExtras = false
  ) => {
    const trainingList =
      training?.exercises?.length &&
      training.exercises.map((ex) => ({
        exerciseId: ex.exerciseId,
        name: ex.exerciseName,
        muscle: ex.muscleGroup,
        sets: ex.sets?.length || 3,
      }));
    const routineList =
      (routine?.exercises || []).length
        ? routine.exercises
        : (training?.exercises || []).map((ex) => ({
            exerciseId: ex.exerciseId,
            name: ex.exerciseName,
            muscle: ex.muscleGroup,
            sets: ex.sets?.length || 3,
          }));
    const list = trainingList?.length
      ? trainingList
      : includeExtras
      ? routineList
      : routineList.filter((ex) => !ex.isExtra);
    const trainingById = new Map();
    (training?.exercises || []).forEach((ex) => {
      getExerciseKeys(ex).forEach((key) => {
        trainingById.set(key, ex);
      });
    });

    const safeSeriesTypeMap = seriesTypeMap || new Map();
    return list.map((ex, idx) => {
      const meta =
        libraryExercises.find(
          (m) =>
            m.id === ex.exerciseId ||
            m.id === ex.id ||
            m.name?.toLowerCase() === ex.name?.toLowerCase()
        ) || {};
      const id = ex.exerciseId || ex.id || slugify(ex.name || `ex-${idx}`);
      const nameKey = slugify(
        ex.name || meta.name || ex.exerciseName || ex.exerciseId || ""
      );
      const setsCount = Number(ex.sets) || 3;
      const trainingEx =
        trainingById.get(id) || (nameKey ? trainingById.get(nameKey) : null);
      const historySeriesType =
        safeSeriesTypeMap.get(id) ||
        (nameKey ? safeSeriesTypeMap.get(nameKey) : null);
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
          ex.seriesType
      );
      const best =
        bestMap.get(id) || (nameKey ? bestMap.get(nameKey) : null);
      const bestBySet =
        bestBySetMap.get(id) ||
        (nameKey ? bestBySetMap.get(nameKey) : null) ||
        [];
      const recentBySet =
        recentBySetMap.get(id) ||
        (nameKey ? recentBySetMap.get(nameKey) : null) ||
        [];
      const prSummary = best
        ? `${best.weight}kg x ${best.reps} | ${formatShort(best.date)}`
        : "";
      const sets =
        (trainingEx?.sets || []).length > 0
          ? (trainingEx.sets || []).map((s, sIdx) => {
              const setId = s.id || `${id}-set-${sIdx}`;
              const perSet = bestBySet[sIdx];
              const perSetSummary = perSet
                ? `${perSet.weight}kg x ${perSet.reps} | ${formatShort(
                    perSet.date
                  )}`
                : s.prSummary || "";
              const fallbackPrev = `${s.weightKg ?? "--"}kg x ${
                s.reps ?? "--"
              } | ${formatShort(training?.date)}`;
              const recentEntries = recentBySet[sIdx] || [];
              const previousByIndex = recentEntries.map(
                (slot) => slot?.latest
              );
              const compareByIndex = recentEntries.map(
                (slot) => slot?.previous
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
              const perSetSummary = perSet
                ? `${perSet.weight}kg x ${perSet.reps} | ${formatShort(
                    perSet.date
                  )}`
                : "";
              const recentEntries = recentBySet[sIdx] || [];
              const previousByIndex = recentEntries.map(
                (slot) => slot?.latest
              );
              const compareByIndex = recentEntries.map(
                (slot) => slot?.previous
              );
              const fallbackPrev = perSet
                ? `${perSet.weight}kg x ${perSet.reps} | ${formatShort(
                    perSet.date
                  )}`
                : best
                ? `${best.weight}kg x ${best.reps} | ${formatShort(best.date)}`
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
                entries: normalizeEntries({
                  entries: [
                    {
                      previousText: buildPrevText(
                        previousByIndex[0],
                        fallbackPrev
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
        ? `PR: ${best.weight}kg x ${best.reps} | ${formatShort(best.date)}`
        : "Sin referencia";
      return {
        id,
        name: ex.name || meta.name || "Ejercicio",
        prText: headerText,
        image: ex.image || meta.image || "",
        imagePublicId: ex.imagePublicId || meta.imagePublicId || "",
        muscle:
          ex.muscle ||
          ex.muscleGroup ||
          meta.muscle ||
          meta.muscleGroup ||
          "Sin grupo",
        isExtra: Boolean(ex.isExtra),
        seriesType,
        prSummary,
        prWeight: best?.weight ?? null,
        sets,
      };
    });
  };

  const applyHistoryToExercises = (
    list,
    bestMap = historyBest,
    bestBySetMap = historyBestBySet,
    recentBySetMap = historyRecentBySet,
    seriesTypeMap = historySeriesTypeMap
  ) =>
    (list || []).map((ex, idx) => {
      const id = ex.id || ex.exerciseId || slugify(ex.name || `ex-${idx}`);
      const keys = getExerciseKeys({
        ...ex,
        id,
        exerciseId: ex.exerciseId || ex.id,
      });
      const findKey = (map) => keys.find((key) => map.has(key)) || id;
      const bestKey = findKey(bestMap);
      const bestBySetKey = findKey(bestBySetMap);
      const recentBySetKey = findKey(recentBySetMap);
      const best = bestMap.get(bestKey);
      const bestBySet = bestBySetMap.get(bestBySetKey) || [];
      const recentBySet = recentBySetMap.get(recentBySetKey) || [];
      const seriesTypeEntry = keys
        .map((key) => seriesTypeMap?.get(key))
        .find(Boolean);
      const historySeriesType = seriesTypeEntry?.type || null;
      const inferredSeriesType = inferSeriesTypeFromSets(ex.sets);
      const seriesType = normalizeSeriesType(
        ex.seriesType ||
          (inferredSeriesType && inferredSeriesType !== "serie"
            ? inferredSeriesType
            : null) ||
          historySeriesType ||
          inferredSeriesType
      );
      const prSummary = best
        ? `${best.weight}kg x ${best.reps} | ${formatShort(best.date)}`
        : ex.prSummary || "";
      const prText = best
        ? `PR: ${best.weight}kg x ${best.reps} | ${formatShort(best.date)}`
        : ex.prText || "Sin referencia";
      const sets = (ex.sets || []).map((set, sIdx) => {
        const setId = set.id || `${id}-set-${sIdx}`;
        const perSet = bestBySet[sIdx];
        const perSetSummary = perSet
          ? `${perSet.weight}kg x ${perSet.reps} | ${formatShort(perSet.date)}`
          : set.prSummary || "";
        const recentEntries = recentBySet[sIdx] || [];
        const previousByIndex = recentEntries.map((slot) => slot?.latest);
        const compareByIndex = recentEntries.map((slot) => slot?.previous);
        const fallbackPrev = perSet
          ? `${perSet.weight}kg x ${perSet.reps} | ${formatShort(perSet.date)}`
          : best
          ? `${best.weight}kg x ${best.reps} | ${formatShort(best.date)}`
          : "Sin referencia";
        const seedEntries =
          Array.isArray(set.entries) && set.entries.length
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
          prSummary: perSetSummary,
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
        seriesType,
        prSummary,
        prWeight: best?.weight ?? ex.prWeight ?? null,
        prText,
        sets,
      };
    });

  const loadTrainingForDate = async (
    date,
    routineId,
    bestMap = historyBest,
    bestBySetMap = historyBestBySet,
    recentBySetMap = historyRecentBySet,
    seriesTypeMap = historySeriesTypeMap
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
          "date,routineId,routineName,branch,durationSeconds,exercises.exerciseId,exercises.exerciseName,exercises.muscleGroup,exercises.seriesType,exercises.sets.seriesType,exercises.sets.weightKg,exercises.sets.reps,exercises.sets.done,exercises.sets.entries,exercises.sets.entries.weightKg,exercises.sets.entries.reps,exercises.sets.entries.done",
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
        setSelectedBranch(trainingMatch.branch);
      }
      setExercises(
        buildExercisesForRoutine(
          routine.raw,
          trainingMatch,
          bestMap,
          bestBySetMap,
          recentBySetMap,
          seriesTypeMap
        )
      );
      if (trainingMatch?.durationSeconds)
        setDurationSeconds(trainingMatch.durationSeconds);
    } catch (e) {
      console.warn("No se pudo cargar entrenamiento previo", e);
      setExercises(
        buildExercisesForRoutine(
          routine.raw,
          null,
          bestMap,
          bestBySetMap,
          recentBySetMap,
          seriesTypeMap
        )
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
      const branch = training.branch || routine.location || "general";
      branchChangeReason.current = "routine";
      setSelectedBranch(branch);
      setSessionDate(training.date);
      setSelectedRoutineId(routine.id);
      setSelectedRoutine(routine);
      setIsEditing(true);
      const hist = await loadHistoryForRoutine(routine.id);
      const bestMap = computeBestFromHistory(hist);
      const bestBySetMap = computeBestBySetFromHistory(hist);
      const recentBySetMap = computeRecentBySetFromHistory(hist);
      const seriesTypeMap = computeLatestSeriesTypeFromHistory(
        hist,
        routine.id
      );
      setExercises(
        buildExercisesForRoutine(
          routine.raw,
          training,
          bestMap,
          bestBySetMap,
          recentBySetMap,
          seriesTypeMap
        )
      );
      if (training.durationSeconds)
        setDurationSeconds(training.durationSeconds);
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
      const resp = await api.getTrainings({
        limit: 200,
        fields:
          "date,routineId,exercises.exerciseId,exercises.exerciseName,exercises.seriesType,exercises.sets.seriesType,exercises.sets.weightKg,exercises.sets.reps,exercises.sets.entries,exercises.sets.entries.weightKg,exercises.sets.entries.reps,exercises.sets.entries.done",
        meta: false,
      });
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
    if (!routineOptions.length) return;
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
  }, [routineOptions]);

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
    if (historyTrainings.length) return;
    if (trainings.length) setHistoryTrainings(trainings);
  }, [trainings, historyTrainings.length]);

  // Restaurar entrenamiento activo desde snapshot local
  useEffect(() => {
    if (!routineOptions.length) return;
    if (isEditing) return;
    if (selectedRoutineId) return;
    if (typeof localStorage === "undefined") return;
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return;
    try {
      const snap = JSON.parse(raw);
      if (!snap?.selectedRoutineId) return;
      const routine = routineOptions.find(
        (r) => r.id === snap.selectedRoutineId
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
      restoredFromSnapshot.current = true;
      branchChangeReason.current = "routine";
      setSelectedBranch(snap.selectedBranch || routine.location || "general");
      setSelectedRoutineId(snap.selectedRoutineId);
      setSelectedRoutine(routine);
      setSessionDate(snap.sessionDate || todayISO);
      lastUpdateRef.current = now;
      setDurationSeconds(totalSeconds);
      setIsRunning(Boolean(snap.isRunning));
      setHasStarted(
        Boolean(snap.hasStarted) ||
          Boolean(snap.isRunning) ||
          totalSeconds > 0
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
            return { ...ex, seriesType, sets };
          })
        );
    } catch (e) {
      console.warn("No se pudo restaurar el entrenamiento activo", e);
    }
  }, [routineOptions, isEditing, selectedRoutineId]);

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
        historyRecentBySet
      )
    );
  }, [
    historyTrainings,
    historyBest,
    historyBestBySet,
    historyRecentBySet,
    historySeriesTypeMap,
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
    }
    if (typeof setBranch === "function") setBranch(selectedBranch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch, routineOptions.length]);

  // Guardar snapshot local del entrenamiento en curso
  useEffect(() => {
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
    exercises,
  ]);

  useEffect(() => {
    if (!isRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      return undefined;
    }
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const delta = Math.floor((now - lastUpdateRef.current) / 1000);
      if (delta > 0) {
        setDurationSeconds((sec) => sec + delta);
        lastUpdateRef.current = now;
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [isRunning]);

  useEffect(() => {
    const handleVisibility = () => {
      if (!isRunning) return;
      const now = Date.now();
      const delta = Math.floor((now - lastUpdateRef.current) / 1000);
      if (delta > 0) {
        setDurationSeconds((sec) => sec + delta);
        lastUpdateRef.current = now;
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [isRunning]);

  const handleStart = () => {
    lastUpdateRef.current = Date.now();
    setIsRunning(true);
    setHasStarted(true);
    toast.success("Entrenamiento iniciado");
  };

  const handlePause = () => {
    lastUpdateRef.current = Date.now();
    setIsRunning(false);
  };

  const handleReset = () => {
    lastUpdateRef.current = Date.now();
    setIsRunning(false);
    setDurationSeconds(0);
    setHasStarted(false);
  };

  const resetState = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRunning(false);
    setDurationSeconds(0);
    setHasStarted(false);
    setSelectedBranch("");
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
      localStorage.removeItem("edit_training_id");
      localStorage.removeItem("edit_training_date");
    }
  };

  const handleSelectRoutine = (id) => {
    if (!id || id === "sin-rutina") return;
    const found = routineOptions.find((r) => r.id === id);
    const branch = found?.location || "general";
    branchChangeReason.current = "routine";
    setSelectedBranch(branch);
    setSelectedRoutineId(id);
    setSelectedRoutine(found || null);
    (async () => {
      const hist = await loadHistoryForRoutine(id);
      const bestMap = computeBestFromHistory(hist);
      const bestBySetMap = computeBestBySetFromHistory(hist);
      const recentBySetMap = computeRecentBySetFromHistory(hist);
      const seriesTypeMap = computeLatestSeriesTypeFromHistory(hist, id);
      await loadTrainingForDate(
        sessionDate,
        id,
        bestMap,
        bestBySetMap,
        recentBySetMap,
        seriesTypeMap
      );
    })();
  };

  const handleExitEdit = async () => {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("edit_training_id");
      localStorage.removeItem("edit_training_date");
      localStorage.removeItem(SNAPSHOT_KEY);
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
          : ex
      )
    );
  };

  const handleAddSet = (exerciseId) => {
    const newSetId = `${exerciseId}-set-${Date.now()}`;
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              sets: [
                ...ex.sets,
                {
                  id: newSetId,
                  prSummary: (() => {
                    const keys = getExerciseKeys({
                      ...ex,
                      id: ex.id || exerciseId,
                      exerciseId: ex.exerciseId || ex.id || exerciseId,
                    });
                    const bestKey = keys.find((key) =>
                      historyBestBySet.has(key)
                    );
                    const bestBySet = bestKey
                      ? historyBestBySet.get(bestKey) || []
                      : [];
                    const perSet = bestBySet[ex.sets.length];
                    return perSet
                      ? `${perSet.weight}kg x ${perSet.reps} | ${formatShort(
                          perSet.date
                        )}`
                      : "";
                  })(),
                  entries: normalizeEntries({
                    entries: [
                      {
                        previousText: "Sin referencia",
                        kg: "",
                        reps: "",
                        done: false,
                      },
                    ],
                    seriesType: normalizeSeriesType(ex.seriesType),
                    setId: newSetId,
                    fallbackPrev: "Sin referencia",
                  }),
                },
              ],
            }
          : ex
      )
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
                          : entry
                      ),
                    }
                  : s
              ),
            }
          : ex
      )
    );
  };

  const handleToggleEntry = (exerciseId, setId, entryId) => {
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
                          : entry
                      ),
                    }
                  : s
              ),
            }
          : ex
      )
    );
  };

  const handleRemoveSet = (exerciseId, setId) => {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId
          ? { ...ex, sets: ex.sets.filter((s) => s.id !== setId) }
          : ex
      )
    );
  };

  const handleRemoveExercise = (exerciseId) => {
    setExercises((prev) => prev.filter((ex) => ex.id !== exerciseId));
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
    setExercises((prev) => [...prev, { ...clone, isExtra: true }]);
    toast.success("Ejercicio extra agregado.");
  };

  const addCustomExercise = () => {
    const newExerciseId = `extra-${Date.now()}`;
    const newSetId = `${newExerciseId}-set-1`;
    setExercises((prev) => [
      ...prev,
      {
        id: newExerciseId,
        name: "Nuevo ejercicio",
        prText: "Sin referencia previa",
        muscle: "Sin grupo",
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
    ]);
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
    const keys = [exerciseId, nameKey].filter(Boolean);
    const bestKey = pickMapKey(historyBest, keys);
    const bestBySetKey = pickMapKey(historyBestBySet, keys);
    const recentBySetKey = pickMapKey(historyRecentBySet, keys);
    const seriesKey = pickMapKey(historySeriesTypeMap, keys);
    const best = bestKey ? historyBest.get(bestKey) : null;
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
      seriesFromHistory || exercise.seriesType || "serie"
    );
    const prText = best
      ? `PR: ${best.weight}kg x ${best.reps} | ${formatShort(best.date)}`
      : "Sin referencia";
    const prSummary = best
      ? `${best.weight}kg x ${best.reps} | ${formatShort(best.date)}`
      : "";
    const perSet = bestBySet[0];
    const perSetSummary = perSet
      ? `${perSet.weight}kg x ${perSet.reps} | ${formatShort(perSet.date)}`
      : "";
    const recentEntries = recentBySet[0] || [];
    const previousByIndex = recentEntries.map((slot) => slot?.latest);
    const compareByIndex = recentEntries.map((slot) => slot?.previous);
    const fallbackPrev = perSet
      ? `${perSet.weight}kg x ${perSet.reps} | ${formatShort(perSet.date)}`
      : prSummary || "Sin referencia";
    const newSetId = `${exerciseId}-set-${Date.now()}`;

    setExercises((prev) => [
      ...prev,
      {
        id: exerciseId,
        name: exercise.name || "Ejercicio",
        prText,
        prSummary,
        prWeight: best?.weight ?? null,
        image: exercise.image || "",
        imagePublicId: exercise.imagePublicId || "",
        muscle: exercise.muscle || exercise.muscleGroup || "Sin grupo",
        seriesType,
        sets: [
          {
            id: newSetId,
            prSummary: perSetSummary,
            entries: normalizeEntries({
              entries: [
                {
                  previousText: buildPrevText(
                    previousByIndex[0],
                    fallbackPrev
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
    ]);
    toast.success("Ejercicio agregado a la sesion.");
  };

  const handleAddExercise = () => {
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
    setIsRunning(false);
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
        branch: selectedBranch || selectedRoutine?.location || "general",
        durationSeconds,
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
                    entry.weightKg !== null || entry.reps !== null || entry.done
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
              order: exIdx + 1,
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
          (t) => (t._id || t.id) !== editingId
        );
        if (dup) {
          const proceed = window.confirm(
            "Ya existe un entrenamiento para esta rutina en esa fecha. Â¿Deseas sobrescribirlo?"
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
        "No se pudo guardar el entrenamiento. Revisa tu conexiÃ³n o intenta de nuevo."
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
    [exercises]
  );
  const doneSets = useMemo(
    () =>
      exercises.reduce(
        (acc, ex) => acc + ex.sets.filter((set) => isSetDone(set)).length,
        0
      ),
    [exercises]
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
        0
      ),
    [exercises]
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
    [exercises, trackingExerciseId]
  );

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
      true
    );
  }, [
    selectedRoutine,
    historyBest,
    historyBestBySet,
    historyRecentBySet,
    historySeriesTypeMap,
  ]);

  const trackingRows = useMemo(() => {
    if (!trackingExercise) return [];
    const keys = getExerciseKeys(trackingExercise);
    if (!keys.length) return [];
    const keySet = new Set(keys);
    const rows = [];
    (historyTrainings || []).forEach((tr) => {
      const date = tr.date || tr.createdAt;
      const exMatch = (tr.exercises || []).find((ex) =>
        getExerciseKeys(ex).some((key) => keySet.has(key))
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
        sets,
      });
    });
    return rows
      .filter((row) => row.sets.length > 0)
      .sort((a, b) => a.ts - b.ts);
  }, [trackingExercise, historyTrainings]);

  const trackingSetCount = useMemo(() => {
    if (!trackingRows.length) return 0;
    return trackingRows.reduce(
      (acc, row) => Math.max(acc, row.sets.length),
      0
    );
  }, [trackingRows]);

  return (
    <main className="relative min-h-screen bg-[color:var(--bg)] text-[color:var(--text)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70 dark:opacity-100 bg-[radial-gradient(120%_80%_at_20%_10%,rgba(59,130,246,0.18),transparent_55%),radial-gradient(80%_60%_at_85%_0%,rgba(14,165,233,0.16),transparent_60%)]"
      />
      <Toaster position="top-center" richColors />
      <div
        className={`relative mx-auto max-w-md md:max-w-4xl lg:max-w-6xl px-3 sm:px-4 pb-28 space-y-4 ${
          showMobileTrainingBar ? "pt-24 md:pt-4" : "pt-4"
        }`}
      >
        {showMobileTrainingBar && (
          <div className="fixed top-14 left-0 right-0 z-30 md:hidden px-3 sm:px-4">
            <div className="pt-3 pb-2 bg-[color:var(--bg)]/92 backdrop-blur">
              <div className="flex items-center justify-between gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)]/90 px-3 py-2 shadow-lg">
                <div className="flex items-baseline gap-2">
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
                <div className="flex items-center gap-2">
                  {showFinishButton && (
                    <Button
                      size="sm"
                      className="rounded-full px-3"
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
                      className="rounded-full px-3"
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
              </div>
              <div className="flex flex-1 items-center justify-end gap-2 min-w-[200px]">
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

        <div className="grid gap-4 md:grid-cols-[360px,1fr]">
          <div className="space-y-4">
            <Card className="p-4 space-y-4 border border-[color:var(--border)] bg-[color:var(--card)]/85 backdrop-blur shadow-sm">
              <div className="space-y-2">
                <p className="text-[11px] uppercase text-[color:var(--text-muted)] font-semibold">
                  Sucursal
                </p>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
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
                      location: selectedBranch || "general",
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

          <section className="space-y-3">
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
                    <Badge variant="secondary" className="text-[11px]">
                      Total sets: {totalSets}
                    </Badge>
                    <Badge className="text-[11px]">
                      {progressPct}% completado
                    </Badge>
                  </div>
                </div>

                <div className="space-y-4">
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
                        <Badge variant="secondary" className="text-[11px]">
                          {items.length} ejercicios
                        </Badge>
                      </div>
                      <AnimatePresence>
                        {items.map((ex) => (
                          <ExerciseCard
                            key={ex.id}
                            exercise={ex}
                            onAddSet={() => handleAddSet(ex.id)}
                            onUpdateEntry={(setId, entryId, field, value) =>
                              handleUpdateEntry(
                                ex.id,
                                setId,
                                entryId,
                                field,
                                value
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
                            onViewTracking={() => {
                              setTrackingExerciseId(ex.id);
                              setShowTracking(true);
                            }}
                            onViewHistory={() => {
                              if (typeof localStorage !== "undefined")
                                localStorage.setItem(
                                  "last_exercise_id",
                                  ex.id
                                );
                              if (typeof onNavigate === "function")
                                onNavigate("ejercicio_analitica");
                            }}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  ))}

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
                            (item) => item.id === ex.id
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
                                  {ex.muscle || "Sin grupo"} • {ex.sets?.length || 0} sets
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
                  {currentBranch || "general"}
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
                <table className="min-w-[360px] w-full text-xs sm:text-sm">
                  <thead className="bg-[color:var(--bg)]">
                    <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                      <th className="px-3 py-2">Fecha</th>
                      {Array.from({ length: trackingSetCount || 0 }).map(
                        (_, idx) => (
                          <th key={`set-head-${idx}`} className="px-3 py-2">
                            Serie {idx + 1}
                          </th>
                        )
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
                                  {entries.length > 1
                                    ? entries.map((entry, entryIdx) => (
                                        <span
                                          key={`entry-${rowIdx}-${idx}-${entryIdx}`}
                                          className="text-[11px] text-[color:var(--text)]"
                                        >
                                          E{entryIdx + 1}:{" "}
                                          {formatEntryValue(entry)}
                                        </span>
                                      ))
                                    : (
                                      <span className="text-[11px] text-[color:var(--text)]">
                                        {formatEntryValue(entries[0])}
                                      </span>
                                    )}
                                </div>
                              </td>
                            );
                          }
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
    </main>
  );
}
