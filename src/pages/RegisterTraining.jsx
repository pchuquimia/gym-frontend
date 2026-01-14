import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Flag, MoreVertical } from "lucide-react";
import { Toaster, toast } from "sonner";
import Card from "../components/ui/card";
import Button from "../components/ui/button";
import Badge from "../components/ui/badge";
import RoutineSelector from "../components/training/RoutineSelector";
import ExerciseCard from "../components/training/ExerciseCard";
import { useRoutines } from "../context/RoutineContext";
import { useTrainingData } from "../context/TrainingContext";
import { api } from "../services/api";

const getLocalISODate = (value) => {
  if (value) return value.slice(0, 10);
  const d = new Date();
  const offsetMs = d.getTimezoneOffset() * 60000;
  const local = new Date(d.getTime() - offsetMs);
  return local.toISOString().slice(0, 10);
};
const todayISO = getLocalISODate();
const SNAPSHOT_KEY = "active_training_snapshot";

const formatLongDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

const formatShort = (iso) => {
  if (!iso) return "--";
  const d = new Date(`${iso}T00:00:00`);
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

const getDateTimestamp = (value) => {
  if (!value) return 0;
  const normalized = value.length <= 10 ? `${value}T00:00:00` : value;
  const ts = Date.parse(normalized);
  return Number.isNaN(ts) ? 0 : ts;
};

const computeBestFromHistory = (trainings = []) => {
  const map = new Map();
  trainings.forEach((tr) => {
    const date = tr.date || tr.createdAt;
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
              (w === current.weight && r > current.reps) ||
              (w === current.weight &&
                r === current.reps &&
                date > (current.date || ""));
            if (isBetter) {
              map.set(key, { weight: w, reps: r, date });
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
            (w === current.weight && r > current.reps) ||
            (w === current.weight &&
              r === current.reps &&
              date > (current.date || ""));
          if (isBetter) {
            arr[idx] = { weight: w, reps: r, date };
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
    trainings,
    branch: userBranch,
    setBranch,
  } = useTrainingData();

  const [durationSeconds, setDurationSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedRoutineId, setSelectedRoutineId] = useState(null);
  const [selectedRoutine, setSelectedRoutine] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [sessionDate, setSessionDate] = useState(todayISO);
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
        lastDate: formatShort(r.updatedAt || r.createdAt) || "--",
        raw: r,
      }));
    }
    // si no hay rutinas de esa sucursal, devolver todas para no dejar vacÃ­o
    return (routines || []).map((r) => ({
      id: r.id,
      name: r.name,
      location: r.branch || "general",
      exerciseCount: (r.exercises || []).length,
      lastDate: formatShort(r.updatedAt || r.createdAt) || "--",
      raw: r,
    }));
  }, [routines, selectedBranch]);

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

  const buildExercisesForRoutine = (
    routine,
    training,
    bestMap = historyBest,
    bestBySetMap = historyBestBySet,
    recentBySetMap = historyRecentBySet
  ) => {
    const list = (routine?.exercises || []).length
      ? routine.exercises
      : (training?.exercises || []).map((ex) => ({
          exerciseId: ex.exerciseId,
          name: ex.exerciseName,
          muscle: ex.muscleGroup,
          sets: ex.sets?.length || 3,
        }));
    const trainingById = new Map();
    (training?.exercises || []).forEach((ex) => {
      getExerciseKeys(ex).forEach((key) => {
        trainingById.set(key, ex);
      });
    });

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
      const seriesType = normalizeSeriesType(
        trainingEx?.seriesType || ex.seriesType
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
    recentBySetMap = historyRecentBySet
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
      const seriesType = normalizeSeriesType(ex.seriesType);
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
    recentBySetMap = historyRecentBySet
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
          "date,routineId,routineName,branch,durationSeconds,exercises.exerciseId,exercises.exerciseName,exercises.muscleGroup,exercises.seriesType,exercises.sets.weightKg,exercises.sets.reps,exercises.sets.done,exercises.sets.entries,exercises.sets.entries.weightKg,exercises.sets.entries.reps,exercises.sets.entries.done",
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
          recentBySetMap
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
          recentBySetMap
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
      setExercises(
        buildExercisesForRoutine(
          routine.raw,
          training,
          bestMap,
          bestBySetMap,
          recentBySetMap
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
          "date,exercises.exerciseId,exercises.exerciseName,exercises.seriesType,exercises.sets.weightKg,exercises.sets.reps,exercises.sets.entries,exercises.sets.entries.weightKg,exercises.sets.entries.reps,exercises.sets.entries.done",
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
  };

  const resetState = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRunning(false);
    setDurationSeconds(0);
    setSelectedBranch("");
    setSelectedRoutineId("");
    setSelectedRoutine(null);
    setExercises([]);
    setSessionDate(todayISO);
    setEditingId("");
    setIsEditing(false);
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
      await loadTrainingForDate(
        sessionDate,
        id,
        bestMap,
        bestBySetMap,
        recentBySetMap
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
    setBranchLocked(false);
    setSelectedRoutineId(null);
    setSelectedRoutine(null);
    setExercises([]);
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
  };

  const handleAddExercise = () => {
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

  return (
    <main className="relative min-h-screen bg-[color:var(--bg)] text-[color:var(--text)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70 dark:opacity-100 bg-[radial-gradient(120%_80%_at_20%_10%,rgba(59,130,246,0.18),transparent_55%),radial-gradient(80%_60%_at_85%_0%,rgba(14,165,233,0.16),transparent_60%)]"
      />
      <Toaster position="top-center" richColors />
      <div className="relative mx-auto max-w-md md:max-w-4xl lg:max-w-6xl px-3 sm:px-4 pb-28 space-y-4 pt-4">
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

        <div className="sticky top-2 z-20">
          <Card className="p-3 md:p-4 border border-[color:var(--border)] bg-[color:var(--card)]/85 backdrop-blur shadow-lg space-y-3">
            <div className="flex flex-wrap items-center gap-3">
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
                <Button
                  className="h-11 px-4 inline-flex items-center justify-center gap-2 rounded-full font-semibold text-white"
                  onClick={handleFinish}
                  disabled={!exercises.length}
                >
                  <Flag className="h-4 w-4" />
                  <span>Finalizar</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-11 px-4 rounded-full font-semibold text-[color:var(--text)]"
                  onClick={handleCancel}
                >
                  Cancelar
                </Button>
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
                  className="rounded-full px-3"
                  onClick={isRunning ? handlePause : handleStart}
                >
                  {isRunning ? "Pausar" : "Iniciar"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full px-3"
                  onClick={handleReset}
                >
                  Reset
                </Button>
              </div>
            </div>
          </Card>
        </div>

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
          <p className="text-xs text-[color:var(--text-muted)]">
            Fecha: {formatLongDate(sessionDate)}
          </p>
        </Card>

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
                <p className="text-xs text-[color:var(--text-muted)]">
                  Fecha: {formatLongDate(sessionDate)}
                </p>
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
    </main>
  );
}
