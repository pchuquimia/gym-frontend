import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Flag, MoreVertical } from "lucide-react";
import { Toaster, toast } from "sonner";
import Card from "../components/ui/card";
import Button from "../components/ui/button";
import Badge from "../components/ui/badge";
import SessionHeader from "../components/training/SessionHeader";
import RoutineSelector from "../components/training/RoutineSelector";
import ExerciseCard from "../components/training/ExerciseCard";
import BottomActionBar from "../components/training/BottomActionBar";
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

const formatDuration = (sec) => {
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, "0")).join(":");
};

const slugify = (text) =>
  text
    ?.toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const computeBestFromHistory = (trainings = []) => {
  const map = new Map();
  trainings.forEach((tr) => {
    const date = tr.date || tr.createdAt;
    (tr.exercises || []).forEach((ex) => {
      const sets = ex.sets || [];
      sets.forEach((s) => {
        const key = ex.exerciseId || slugify(ex.exerciseName || ex.name || "");
        if (!key) return;
        const w = Number(s.weightKg ?? s.weight ?? 0);
        const r = Number(s.reps ?? 0);
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
  return map;
};

const computeBestBySetFromHistory = (trainings = []) => {
  const map = new Map();
  trainings.forEach((tr) => {
    const date = tr.date || tr.createdAt;
    (tr.exercises || []).forEach((ex) => {
      const key = ex.exerciseId || slugify(ex.exerciseName || ex.name || "");
      if (!key) return;
      const sets = ex.sets || [];
      const arr = map.get(key) || [];
      sets.forEach((s, idx) => {
        const w = Number(s.weightKg ?? s.weight ?? 0);
        const r = Number(s.reps ?? 0);
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
      map.set(key, arr);
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
  const lastUpdateRef = useRef(Date.now());
  const [branchLocked, setBranchLocked] = useState(false);
  const timerRef = useRef(null);

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

  const buildExercisesForRoutine = (
    routine,
    training,
    bestMap = historyBest,
    bestBySetMap = historyBestBySet
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
      const key = ex.exerciseId || slugify(ex.exerciseName || ex.name || "");
      trainingById.set(key, ex);
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
      const setsCount = Number(ex.sets) || 3;
      const trainingEx = trainingById.get(id);
      const best = bestMap.get(id);
      const bestBySet = bestBySetMap.get(id) || [];
      const sets =
        (trainingEx?.sets || []).length > 0
          ? (trainingEx.sets || []).map((s, sIdx) => ({
              id: `${id}-set-${sIdx}`,
              previousText: `${s.weightKg ?? "--"}kg x ${
                s.reps ?? "--"
              } | ${formatShort(training?.date)}`,
              kg: s.weightKg ?? "",
              reps: s.reps ?? "",
              done: Boolean(s.done),
            }))
          : Array.from({ length: setsCount }).map((_, sIdx) => {
              const perSet = bestBySet[sIdx];
              return {
                id: `${id}-set-${sIdx}`,
                previousText: perSet
                  ? `${perSet.weight}kg x ${perSet.reps} | ${formatShort(
                      perSet.date
                    )}`
                  : best
                  ? `${best.weight}kg x ${best.reps} | ${formatShort(
                      best.date
                    )}`
                  : "Sin referencia",
                kg: perSet ? perSet.weight : best ? best.weight : "",
                reps: perSet ? perSet.reps : best ? best.reps : "",
                done: false,
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
        sets,
      };
    });
  };

  const loadTrainingForDate = async (
    date,
    routineId,
    bestMap = historyBest,
    bestBySetMap = historyBestBySet
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
          "date,routineId,routineName,branch,durationSeconds,exercises.exerciseId,exercises.exerciseName,exercises.muscleGroup,exercises.sets.weightKg,exercises.sets.reps,exercises.sets.done",
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
          bestBySetMap
        )
      );
      if (trainingMatch?.durationSeconds)
        setDurationSeconds(trainingMatch.durationSeconds);
    } catch (e) {
      console.warn("No se pudo cargar entrenamiento previo", e);
      setExercises(
        buildExercisesForRoutine(routine.raw, null, bestMap, bestBySetMap)
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
      setExercises(
        buildExercisesForRoutine(routine.raw, training, bestMap, bestBySetMap)
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
    if (Array.isArray(trainings) && trainings.length) {
      setHistoryTrainings(trainings);
      return trainings;
    }
    try {
      const resp = await api.getTrainings({
        limit: 200,
        fields:
          "date,exercises.exerciseId,exercises.exerciseName,exercises.sets.weightKg,exercises.sets.reps",
        meta: false,
      });
      const list = Array.isArray(resp) ? resp : resp?.items || [];
      setHistoryTrainings(list);
      return list;
    } catch (e) {
      console.warn("No se pudo cargar historial general", e);
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
      if (Array.isArray(snap.exercises)) setExercises(snap.exercises);
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
      await loadTrainingForDate(sessionDate, id, bestMap, bestBySetMap);
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

  const handleAddSet = (exerciseId) => {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              sets: [
                ...ex.sets,
                {
                  id: `${exerciseId}-set-${Date.now()}`,
                  previousText: "Sin referencia",
                  kg: "",
                  reps: "",
                  done: false,
                },
              ],
            }
          : ex
      )
    );
  };

  const handleUpdateSet = (exerciseId, setId, field, value) => {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              sets: ex.sets.map((s) =>
                s.id === setId ? { ...s, [field]: value } : s
              ),
            }
          : ex
      )
    );
  };

  const handleToggleDone = (exerciseId, setId) => {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              sets: ex.sets.map((s) =>
                s.id === setId ? { ...s, done: !s.done } : s
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
    setExercises((prev) => [
      ...prev,
      {
        id: `extra-${Date.now()}`,
        name: "Nuevo ejercicio",
        prText: "Sin referencia previa",
        muscle: "Sin grupo",
        sets: [
          {
            id: `extra-${Date.now()}-1`,
            previousText: "Sin referencia",
            kg: "",
            reps: "",
            done: false,
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
          .map((ex, exIdx) => ({
            exerciseId: ex.id,
            exerciseName: ex.name,
            muscleGroup: ex.muscle,
            order: exIdx + 1,
            sets: (ex.sets || [])
              .map((s, idx) => ({
                weightKg:
                  s.kg === "" ? null : Number(String(s.kg).replace(",", ".")),
                reps:
                  s.reps === ""
                    ? null
                    : Number(String(s.reps).replace(",", ".")),
                done: Boolean(s.done),
                order: idx + 1,
              }))
              .filter((s) => s.weightKg !== null || s.reps !== null || s.done),
          }))
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

  const totalSets = useMemo(
    () => exercises.reduce((acc, ex) => acc + ex.sets.length, 0),
    [exercises]
  );
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
    <main className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text)]">
      <Toaster position="top-center" richColors />
      <div className="mx-auto max-w-md md:max-w-4xl lg:max-w-6xl px-4 pb-28 space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full border border-[color:var(--border)] h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5 text-[color:var(--text)]" />
          </Button>
          <h1 className="text-3xl font-bold">Registrar Entrenamiento</h1>
          <div className="flex items-center gap-2">
            {isEditing && (
              <Button variant="outline" size="sm" onClick={handleExitEdit}>
                Salir de ediciÃ³n
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

        <div className="md:hidden sticky top-0 z-20 bg-[color:var(--bg)] pb-3">
          <div className="flex items-center gap-2">
            <Card className="flex-1 px-3 py-2 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase text-[color:var(--text-muted)] font-semibold">
                  Duracion
                </p>
                <p className="text-base font-semibold text-[color:var(--text)]">
                  {formatDuration(durationSeconds)}
                </p>
              </div>
              <div className="text-[11px] text-[color:var(--text-muted)]">
                LIVE
              </div>
            </Card>
            <div className="flex-1 flex gap-2">
              <Button
                className="flex-1 h-[52px] inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-white"
                onClick={handleFinish}
                disabled={!exercises.length}
              >
                <Flag className="h-4 w-4" />
                <span>Finalizar</span>
              </Button>
              <Button
                variant="outline"
                className="h-[52px] px-3 rounded-xl font-semibold text-[color:var(--text)]"
                onClick={() => {
                  resetState();
                  toast.message("Entrenamiento cancelado");
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[360px,1fr]">
          <div className="space-y-4">
            <Card className="p-4 space-y-3">
              <p className="text-[11px] uppercase text-[color:var(--text-muted)] font-semibold">
                Sucursal
              </p>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full rounded-md border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm"
              >
                {branchOptions.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[color:var(--text-muted)]">
                Rutinas disponibles para: {selectedBranch}
              </p>
            </Card>

            <SessionHeader
              title="HOY"
              dateISO={sessionDate}
              durationSeconds={durationSeconds}
              isRunning={isRunning}
              onStart={handleStart}
              onPause={handlePause}
              onReset={handleReset}
              onChangeDate={(value) => {
                const nextDate = value ? value.slice(0, 10) : getLocalISODate();
                setSessionDate(nextDate);
              }}
            />

            <Card className="p-4 space-y-3">
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
            </Card>

            <Card className="p-4 space-y-1">
              <p className="text-sm font-semibold text-[color:var(--text)]">
                Resumen rapido
              </p>
              <p className="text-sm text-[color:var(--text-muted)]">
                Fecha: {formatLongDate(sessionDate)}
              </p>
              <p className="text-sm text-[color:var(--text-muted)]">
                Ejercicios: {exercises.length}
              </p>
              <p className="text-sm text-[color:var(--text-muted)]">
                Sets totales: {totalSets}
              </p>
            </Card>
          </div>

          <section className="space-y-3">
            {selectedRoutineId ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-[color:var(--text-muted)] font-semibold">
                      EJERCICIOS ({exercises.length})
                    </p>
                    <p className="text-xs text-[color:var(--text-muted)]">
                      {loadingTraining ? "Cargando..." : "En progreso"}
                    </p>
                  </div>
                  <Badge className="text-[11px] bg-blue-50 text-blue-700 border border-blue-100">
                    Total sets: {totalSets}
                  </Badge>
                </div>

                <div className="space-y-4">
                  {groupedExercises.map(([muscle, items]) => (
                    <div key={muscle} className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <p className="text-sm font-semibold text-[color:var(--text)]">
                          {muscle}
                        </p>
                        <span className="text-[11px] text-[color:var(--text-muted)]">
                          {items.length} ejercicios
                        </span>
                      </div>
                      <AnimatePresence>
                        {items.map((ex) => (
                          <ExerciseCard
                            key={ex.id}
                            exercise={ex}
                            onAddSet={() => handleAddSet(ex.id)}
                            onUpdateSet={(setId, field, value) =>
                              handleUpdateSet(ex.id, setId, field, value)
                            }
                            onToggleDone={(setId) =>
                              handleToggleDone(ex.id, setId)
                            }
                            onRemoveSet={(setId) =>
                              handleRemoveSet(ex.id, setId)
                            }
                            onRemoveExercise={() => handleRemoveExercise(ex.id)}
                            onViewHistory={() => {
                              if (typeof localStorage !== "undefined")
                                localStorage.setItem("last_exercise_id", ex.id);
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

      <div className="hidden md:block">
        <BottomActionBar
          onFinish={handleFinish}
          onCancel={handleExitEdit}
          disabled={!exercises.length}
          durationSeconds={durationSeconds}
        />
      </div>
    </main>
  );
}
