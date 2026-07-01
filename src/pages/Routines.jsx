import { useEffect, useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CalendarDays,
  ChevronDown,
  Copy,
  Dumbbell,
  GripVertical,
  Settings2,
  Layers3,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import Modal from "../components/shared/Modal";
import { getExerciseImageUrl } from "../utils/cloudinary";
import { useRoutines } from "../context/RoutineContext";
import { useTrainingData } from "../context/TrainingContext";
import Card from "../components/ui/card";
import Button from "../components/ui/button";
import Badge from "../components/ui/badge";

const BRANCH_OPTIONS = ["sopocachi", "miraflores"];
const DEFAULT_BRANCH = "sopocachi";
const ROUTINE_LIBRARY_DRAFT_KEY = "routine_edit_library_draft";
const TRAINING_ROUTINES_RETURN_KEY = "training_routines_return";
const TRAINING_ROUTINE_EDIT_TARGET_KEY = "training_routine_edit_target";
const ROUTINE_UPDATED_DURING_TRAINING_KEY =
  "routine_updated_during_training";

const normalizeBranch = (value) =>
  BRANCH_OPTIONS.includes(value) ? value : DEFAULT_BRANCH;

const slugify = (text) =>
  text
    ?.toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const toValidDate = (value) => {
  if (!value) return null;
  const normalized =
    typeof value === "string" && value.length <= 10
      ? `${value}T00:00:00`
      : value;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatShortDate = (value) => {
  const d = toValidDate(value);
  if (!d) return "Sin registros";
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
};

const getDateTimestamp = (value) => {
  const d = toValidDate(value);
  return d ? d.getTime() : 0;
};

const getISODateKey = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  const d = toValidDate(value);
  if (!d) return null;
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 10);
};

const branchLabel = (value) => {
  const branch = normalizeBranch(value);
  return branch.charAt(0).toUpperCase() + branch.slice(1);
};

const groupByMuscle = (items = []) => {
  const map = new Map();
  items.forEach((item, idx) => {
    const key = item.muscle || "Sin grupo";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push({ ...item, idx });
  });
  return Array.from(map.entries());
};

const exerciseMatchesBranch = (exercise, branch) => {
  const branches = exercise.branches || [];
  return branches.includes(branch) || branches.includes("general");
};

const readRoutineLibraryDraft = () => {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(ROUTINE_LIBRARY_DRAFT_KEY);
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw);
    return draft?.routine ? draft : null;
  } catch {
    return null;
  }
};

const hasTrainingReturn = () => {
  if (typeof localStorage === "undefined") return false;
  return Boolean(localStorage.getItem(TRAINING_ROUTINES_RETURN_KEY));
};

const readTrainingRoutineEditTarget = () => {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(TRAINING_ROUTINE_EDIT_TARGET_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed?.routineId || null;
  } catch {
    return null;
  }
};

const resolveExerciseFromLibrary = (availableExercises, entry = {}) => {
  const meta = availableExercises.find(
    (item) =>
      item.id === entry.exerciseId ||
      item.id === entry.id ||
      item.name === entry.name,
  );
  return {
    exerciseId:
      entry.exerciseId || entry.id || meta?.id || slugify(entry.name || ""),
    name: meta?.name || entry.name || "Ejercicio",
    muscle: meta?.muscle || entry.muscle || "Sin grupo",
    sets: Number(entry.sets) || 3,
    image: meta?.image || entry.image || "",
    imagePublicId: meta?.imagePublicId || entry.imagePublicId || "",
    supportsUnilateral: Boolean(
      entry.supportsUnilateral || meta?.supportsUnilateral,
    ),
    movementMode:
      entry.movementMode === "unilateral" ? "unilateral" : "bilateral",
    isExtra: Boolean(entry.isExtra),
    alternatives: (entry.alternatives || []).map((alt) =>
      resolveExerciseFromLibrary(availableExercises, alt),
    ),
  };
};

const movementModeFrom = (value) =>
  value === "unilateral" ? "unilateral" : "bilateral";

const isUnilateralMovement = (exercise = {}) =>
  movementModeFrom(exercise.movementMode) === "unilateral";

const applyUnilateralMode = (enabled) => ({
  supportsUnilateral: Boolean(enabled),
  movementMode: enabled ? "unilateral" : "bilateral",
});

const serializeMovement = (exercise = {}) => {
  const movementMode = movementModeFrom(exercise.movementMode);
  return {
    supportsUnilateral: Boolean(
      exercise.supportsUnilateral || movementMode === "unilateral",
    ),
    movementMode,
  };
};

function SortableExerciseShell({ id, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return children({
    attributes,
    listeners,
    setNodeRef,
    style: {
      transform: CSS.Transform.toString(transform),
      transition,
      zIndex: isDragging ? 20 : undefined,
      opacity: isDragging ? 0.72 : 1,
    },
    isDragging,
  });
}

function RoutineModal({
  mode = "create",
  initialData,
  onSave,
  onClose,
  onOpenLibrary,
  availableExercises,
}) {
  const [name, setName] = useState(initialData?.name || "");
  const [branch, setBranch] = useState(() =>
    normalizeBranch(initialData?.branch),
  );
  const [selectedMuscle, setSelectedMuscle] = useState(
    availableExercises?.[0]?.muscle || "Pecho",
  );
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [exercises, setExercises] = useState(() =>
    (initialData?.exercises || []).map((ex) =>
      resolveExerciseFromLibrary(availableExercises, ex),
    ),
  );
  const [collapsedMuscles, setCollapsedMuscles] = useState(() => new Set());
  const [selectedExtraByMuscle, setSelectedExtraByMuscle] = useState(() => ({}));
  const [extraPickerMuscle, setExtraPickerMuscle] = useState(null);
  const [alternativePickerExercise, setAlternativePickerExercise] = useState(null);
  const [selectedAlternativeIds, setSelectedAlternativeIds] = useState([]);
  const [optionsExerciseId, setOptionsExerciseId] = useState(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 120, tolerance: 8 },
    }),
  );

  const muscleOptions = useMemo(() => {
    const set = new Set();
    availableExercises.forEach((ex) => {
      if (ex.muscle) set.add(ex.muscle);
    });
    return Array.from(set);
  }, [availableExercises]);

  const filteredExercises = useMemo(() => {
    const query = search.trim().toLowerCase();
    return availableExercises
      .filter((ex) => exerciseMatchesBranch(ex, branch))
      .filter((ex) => !selectedMuscle || ex.muscle === selectedMuscle)
      .filter((ex) => !query || ex.name.toLowerCase().includes(query))
      .slice(0, 24);
  }, [availableExercises, branch, selectedMuscle, search]);

  const groupedSelected = useMemo(() => groupByMuscle(exercises), [exercises]);

  const toggleMuscleGroup = (muscle) => {
    setCollapsedMuscles((prev) => {
      const next = new Set(prev);
      if (next.has(muscle)) next.delete(muscle);
      else next.add(muscle);
      return next;
    });
  };

  const addExercise = (exercise, options = {}) => {
    if (!exercise || !exerciseMatchesBranch(exercise, branch)) {
      setError("Este ejercicio no esta disponible en la sede seleccionada.");
      return;
    }
    setError("");
    setExercises((prev) => [
      ...prev,
      {
        name: exercise.name,
        exerciseId: exercise.id,
        sets: 3,
        muscle: exercise.muscle,
        image: exercise.image || "",
        imagePublicId: exercise.imagePublicId || "",
        supportsUnilateral: Boolean(exercise.supportsUnilateral),
        movementMode: "bilateral",
        isExtra: Boolean(options.isExtra),
        alternatives: [],
      },
    ]);
  };

  const toggleExtraSelection = (muscle, exerciseId) => {
    setSelectedExtraByMuscle((prev) => {
      const current = new Set(prev[muscle] || []);
      if (current.has(exerciseId)) current.delete(exerciseId);
      else current.add(exerciseId);
      return { ...prev, [muscle]: Array.from(current) };
    });
  };

  const openExtraPicker = (muscle) => {
    const selected = exercises
      .filter((exercise) => exercise.muscle === muscle && exercise.isExtra)
      .map((exercise) => exercise.exerciseId);
    setSelectedExtraByMuscle((prev) => ({ ...prev, [muscle]: selected }));
    setExtraPickerMuscle(muscle);
  };

  const confirmExtraSelection = (muscle) => {
    const selected = selectedExtraByMuscle[muscle] || [];
    setExercises((prev) => {
      const currentIds = new Set(prev.map((exercise) => exercise.exerciseId));
      const updated = prev.map((exercise) =>
        exercise.muscle === muscle
          ? { ...exercise, isExtra: selected.includes(exercise.exerciseId) }
          : exercise,
      );

      const additions = selected
        .filter((exerciseId) => !currentIds.has(exerciseId))
        .map((exerciseId) => availableExercises.find((item) => item.id === exerciseId))
        .filter(Boolean)
        .map((exercise) => ({
          name: exercise.name,
          exerciseId: exercise.id,
          sets: 3,
          muscle: exercise.muscle,
          image: exercise.image || "",
          imagePublicId: exercise.imagePublicId || "",
          supportsUnilateral: Boolean(exercise.supportsUnilateral),
          movementMode: "bilateral",
          isExtra: true,
          alternatives: [],
        }));

      return [...updated, ...additions];
    });
    setExtraPickerMuscle(null);
  };

  const extraPickerOptions = useMemo(() => {
    if (!extraPickerMuscle) return [];
    return availableExercises.filter(
      (option) =>
        exerciseMatchesBranch(option, branch) &&
        option.muscle === extraPickerMuscle &&
        !exercises.some((item) => item.exerciseId === option.id),
    );
  }, [availableExercises, branch, exercises, extraPickerMuscle]);

  const alternativePickerOptions = useMemo(() => {
    if (!alternativePickerExercise) return [];
    const current = exercises.find(
      (exercise) => exercise.exerciseId === alternativePickerExercise.exerciseId,
    );
    const existing = new Set((current?.alternatives || []).map((alt) => alt.exerciseId));
    return availableExercises.filter(
      (option) =>
        exerciseMatchesBranch(option, branch) &&
        option.muscle === alternativePickerExercise.muscle &&
        option.id !== alternativePickerExercise.exerciseId &&
        !existing.has(option.id),
    );
  }, [alternativePickerExercise, availableExercises, branch, exercises]);

  const updateExercise = (idx, patch) => {
    setExercises((prev) =>
      prev.map((ex, i) => (i === idx ? { ...ex, ...patch } : ex)),
    );
  };

  const removeExercise = (idx) => {
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  };

  const moveExerciseWithinGroup = (fromIdx, toIdx) => {
    setExercises((prev) => {
      if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return prev;
      if (fromIdx >= prev.length || toIdx >= prev.length) return prev;
      const muscle = prev[fromIdx]?.muscle;
      if (!muscle || prev[toIdx]?.muscle !== muscle) return prev;
      const groupPositions = prev
        .map((exercise, index) => (exercise.muscle === muscle ? index : -1))
        .filter((index) => index >= 0);
      const fromPosition = groupPositions.indexOf(fromIdx);
      const toPosition = groupPositions.indexOf(toIdx);
      if (fromPosition < 0 || toPosition < 0) return prev;

      const next = [...prev];
      const groupItems = groupPositions.map((index) => next[index]);
      const [item] = groupItems.splice(fromPosition, 1);
      groupItems.splice(toPosition, 0, item);
      groupPositions.forEach((index, position) => {
        next[index] = groupItems[position];
      });
      return next;
    });
  };

  const handleExerciseDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const fromIdx = Number(String(active.id).replace("exercise-", ""));
    const toIdx = Number(String(over.id).replace("exercise-", ""));
    if (Number.isNaN(fromIdx) || Number.isNaN(toIdx)) return;
    moveExerciseWithinGroup(fromIdx, toIdx);
  };

  const openAlternativePicker = (exercise) => {
    setOptionsExerciseId(null);
    setAlternativePickerExercise({
      exerciseId: exercise.exerciseId,
      name: exercise.name,
      muscle: exercise.muscle,
    });
    setSelectedAlternativeIds([]);
  };

  const toggleAlternativeSelection = (exerciseId) => {
    setSelectedAlternativeIds((prev) =>
      prev.includes(exerciseId)
        ? prev.filter((id) => id !== exerciseId)
        : [...prev, exerciseId],
    );
  };

  const confirmAlternativeSelection = () => {
    if (!alternativePickerExercise || !selectedAlternativeIds.length) return;
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.exerciseId !== alternativePickerExercise.exerciseId) return ex;
        const existing = new Set((ex.alternatives || []).map((alt) => alt.exerciseId));
        const additions = selectedAlternativeIds
          .filter((exerciseId) => exerciseId !== ex.exerciseId && !existing.has(exerciseId))
          .map((exerciseId) => availableExercises.find((option) => option.id === exerciseId))
          .filter(Boolean)
          .map((option) => resolveExerciseFromLibrary(availableExercises, option));
        return {
          ...ex,
          alternatives: [...(ex.alternatives || []), ...additions],
        };
      }),
    );
    setSelectedAlternativeIds([]);
    setAlternativePickerExercise(null);
  };

  const updateAlternative = (idx, alternativeId, patch) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === idx
          ? {
              ...ex,
              alternatives: (ex.alternatives || []).map((alt) =>
                alt.exerciseId === alternativeId ? { ...alt, ...patch } : alt,
              ),
            }
          : ex,
      ),
    );
  };

  const removeAlternative = (idx, alternativeId) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === idx
          ? {
              ...ex,
              alternatives: (ex.alternatives || []).filter(
                (alt) => alt.exerciseId !== alternativeId,
              ),
            }
          : ex,
      ),
    );
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      setError("Ponle un nombre a la rutina.");
      return;
    }
    if (!exercises.length) {
      setError("Agrega al menos un ejercicio.");
      return;
    }
    setError("");
    onSave({
      ...initialData,
      id: initialData?.id || slugify(name),
      name: name.trim(),
      description: `${exercises.length} ejercicios.`,
      branch: normalizeBranch(branch),
      exercises: exercises.map((ex) => ({
        ...ex,
        exerciseId: ex.exerciseId || slugify(ex.name),
        sets: Number(ex.sets) || 1,
        ...serializeMovement(ex),
        isExtra: Boolean(ex.isExtra),
        alternatives: (ex.alternatives || []).map((alt) => ({
          exerciseId: alt.exerciseId || slugify(alt.name),
          name: alt.name,
          muscle: alt.muscle,
          image: alt.image || "",
          imagePublicId: alt.imagePublicId || "",
          ...serializeMovement(alt),
        })),
      })),
    });
  };

  const buildDraftRoutine = () => ({
    ...initialData,
    id: initialData?.id || slugify(name),
    name: name.trim() || initialData?.name || "Rutina sin nombre",
    description: `${exercises.length} ejercicios.`,
    branch: normalizeBranch(branch),
    exercises: exercises.map((ex) => ({
      ...ex,
      exerciseId: ex.exerciseId || slugify(ex.name),
      sets: Number(ex.sets) || 1,
      ...serializeMovement(ex),
      isExtra: Boolean(ex.isExtra),
      alternatives: (ex.alternatives || []).map((alt) => ({
        exerciseId: alt.exerciseId || slugify(alt.name),
        name: alt.name,
        muscle: alt.muscle,
        image: alt.image || "",
        imagePublicId: alt.imagePublicId || "",
        ...serializeMovement(alt),
      })),
    })),
  });

  const handleOpenLibrary = () => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(
        ROUTINE_LIBRARY_DRAFT_KEY,
        JSON.stringify({
          mode,
          sourceRoutineId: initialData?.id || slugify(name),
          sourceRoutineName:
            name.trim() || initialData?.name || "Rutina sin nombre",
          routine: buildDraftRoutine(),
          savedAt: Date.now(),
        }),
      );
    }
    onOpenLibrary?.();
  };

  const pickerSelectedExtraIds = extraPickerMuscle
    ? selectedExtraByMuscle[extraPickerMuscle] || []
    : [];

  return (
    <Modal
      title={null}
      subtitle={null}
      onClose={onClose}
      size="wide"
      floatingAction={
        <button
          type="button"
          onClick={handleOpenLibrary}
          className="grid h-14 w-14 place-items-center rounded-full bg-blue-600 text-white shadow-xl shadow-blue-600/30 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/25"
          aria-label="Agregar ejercicios"
        >
          <Plus className="h-6 w-6" />
        </button>
      }
      footer={
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-center text-xs font-semibold text-[color:var(--text-muted)] sm:text-left">
            {error || `${exercises.length} ejercicios listos para guardar`}
          </span>
          <div className="grid grid-cols-1 gap-2 sm:flex">
            <Button
              variant="outline"
              className="hidden h-11 px-2 text-xs sm:inline-flex sm:px-4 sm:text-sm"
              onClick={handleOpenLibrary}
            >
              <Dumbbell className="h-4 w-4" />
              Biblioteca
            </Button>
            <Button
              className="h-12 px-2 text-sm sm:px-4"
              onClick={handleSubmit}
            >
              {mode === "create" ? "Crear rutina" : "Guardar"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="pb-3 text-[color:var(--text)]">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <div className="space-y-3">
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-3 shadow-sm sm:p-4">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_260px]">
                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                    Nombre
                  </span>
                  <input
                    className="h-12 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-base font-bold text-[color:var(--text)] outline-none transition placeholder:text-[color:var(--text-muted)] focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Ej. Pecho - Biceps"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                    Sede
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {BRANCH_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setBranch(option)}
                        className={`h-12 rounded-xl border px-2 text-xs font-black transition ${
                          branch === option
                            ? "border-blue-400 bg-blue-500/10 text-blue-700 shadow-sm dark:text-blue-200"
                            : "border-[color:var(--border)] bg-[color:var(--bg)] text-[color:var(--text-muted)]"
                        }`}
                      >
                        {branchLabel(option)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {error && <p className="mt-3 text-xs font-semibold text-red-500">{error}</p>}
            </div>

            <div className="flex items-center justify-between px-1 pt-1">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                Ejercicios
              </p>
              <Badge variant="secondary" className="shrink-0 text-[10px]">
                {exercises.reduce((sum, ex) => sum + (Number(ex.sets) || 0), 0)} series
              </Badge>
            </div>

            <div className="space-y-2">
              {groupedSelected.map(([muscle, list]) => {
                const extraOptions = availableExercises.filter(
                  (option) =>
                    exerciseMatchesBranch(option, branch) &&
                    option.muscle === muscle,
                );
                const selectedExtraIds = selectedExtraByMuscle[muscle] || [];

                return (
                <div
                  key={muscle}
                  className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => toggleMuscleGroup(muscle)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[color:var(--bg)]"
                    aria-expanded={!collapsedMuscles.has(muscle)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate text-sm font-black leading-tight text-[color:var(--text)]">
                          {muscle}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="uppercase tracking-wide text-[10px]"
                        >
                          {list.length} ejercicios
                        </Badge>
                        <Badge className="text-[10px]">
                          {list.reduce((sum, item) => sum + (Number(item.sets) || 0), 0)} series
                        </Badge>
                      </div>
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-[color:var(--text-muted)] transition-transform ${
                        collapsedMuscles.has(muscle) ? "" : "rotate-180"
                      }`}
                    />
                  </button>

                  {!collapsedMuscles.has(muscle) && (
                    <div className="grid gap-3 border-t border-[color:var(--border)] bg-[color:var(--bg)]/70 p-3">
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleExerciseDragEnd}
                      >
                        <SortableContext
                          items={list.map((ex) => `exercise-${ex.idx}`)}
                          strategy={verticalListSortingStrategy}
                        >
                      {list.map((ex) => {
                      const thumb = getExerciseImageUrl(ex, {
                        width: 96,
                        height: 96,
                      });
                      const alternativeOptions = availableExercises.filter(
                        (option) =>
                          exerciseMatchesBranch(option, branch) &&
                          option.muscle === ex.muscle &&
                          option.id !== ex.exerciseId &&
                          !(ex.alternatives || []).some(
                            (alt) => alt.exerciseId === option.id,
                          ),
                      );

                        return (
                        <SortableExerciseShell
                          key={`${ex.exerciseId}-${ex.idx}`}
                          id={`exercise-${ex.idx}`}
                        >
                          {({
                            attributes,
                            listeners,
                            setNodeRef,
                            style,
                            isDragging,
                          }) => (
                        <div
                          ref={setNodeRef}
                          style={style}
                          className={`rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-3 shadow-sm ${
                            isDragging ? "shadow-xl ring-2 ring-blue-500/30" : ""
                          }`}
                        >
                          <div className="grid grid-cols-[36px_minmax(0,1fr)_42px_62px] items-center gap-2 sm:grid-cols-[48px_minmax(0,1fr)_60px_auto] sm:gap-3">
                            <div className="h-9 w-9 overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] sm:h-12 sm:w-12 sm:rounded-xl">
                              {thumb ? (
                                <img
                                  src={thumb}
                                  alt={ex.name}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="grid h-full w-full place-items-center text-[10px] text-[color:var(--text-muted)]">
                                  {(ex.name || "?").charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="shrink-0 rounded-md border border-[color:var(--border)] bg-[color:var(--bg)] px-1.5 py-0.5 text-[9px] font-black text-[color:var(--text-muted)] sm:rounded-lg sm:px-2 sm:py-1 sm:text-[10px]">
                                  {ex.idx + 1}
                                </span>
                                <p className="min-w-0 truncate text-xs font-black leading-tight sm:text-sm">
                                  {ex.name}
                                </p>
                                {ex.isExtra && (
                                  <span className="shrink-0 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-black uppercase text-emerald-700 dark:text-emerald-300">
                                    Extra
                                  </span>
                                )}
                              </div>
                              {(ex.alternatives || []).length > 0 && (
                                <p className="hidden truncate text-[10px] text-[color:var(--text-muted)] sm:block">
                                  {(ex.alternatives || [])
                                    .map((alt) => alt.name)
                                    .join(", ")}
                                </p>
                              )}
                            </div>

                            <label className="space-y-0.5">
                              <span className="hidden text-center text-[9px] font-black uppercase text-[color:var(--text-muted)] sm:block">
                                Sets
                              </span>
                              <input
                                type="number"
                                min="1"
                                aria-label="Series"
                                className="h-9 w-10 rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-1 text-center text-xs font-black text-[color:var(--text)] sm:w-14 sm:rounded-xl sm:text-sm"
                                value={ex.sets}
                                onChange={(event) =>
                                  updateExercise(ex.idx, {
                                    sets: event.target.value,
                                  })
                                }
                              />
                            </label>

                            <div className="grid grid-cols-2 gap-1 sm:flex sm:items-center sm:justify-end sm:gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-9 w-7 rounded-lg p-0 text-blue-700 dark:text-blue-300 sm:h-10 sm:w-10 sm:rounded-xl"
                                onClick={() => setOptionsExerciseId(ex.exerciseId)}
                                aria-label="Opciones del ejercicio"
                              >
                                <Settings2 className="h-3.5 w-3.5" />
                              </Button>
                              <button
                                type="button"
                                className="grid h-9 w-7 touch-none place-items-center rounded-lg p-0 text-[color:var(--text-muted)] hover:bg-[color:var(--bg)] sm:h-10 sm:w-10 sm:rounded-xl"
                                aria-label="Arrastrar para ordenar"
                                {...attributes}
                                {...listeners}
                              >
                                <GripVertical className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          <details className="hidden mt-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)]">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5">
                              <span className="min-w-0">
                                <span className="block text-[11px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
                                  Opciones
                                </span>
                                <span className="mt-0.5 block truncate text-[10px] font-semibold text-[color:var(--text-muted)]">
                                  {isUnilateralMovement(ex) ? "Unilateral" : "Normal"}
                                  {(ex.alternatives || []).length ? ` · ${(ex.alternatives || []).length} alt.` : ""}
                                </span>
                              </span>
                              <ChevronDown className="h-4 w-4 shrink-0 text-[color:var(--text-muted)]" />
                            </summary>
                            <div className="grid gap-3 border-t border-[color:var(--border)] p-3">
                              <div className="grid gap-2">
                                <div className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2">
                                  <div className="min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                                      Unilateral
                                    </p>
                                    <p className="mt-0.5 text-[11px] font-semibold text-[color:var(--text-muted)]">
                                      Activar si se trabaja un lado a la vez.
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateExercise(
                                        ex.idx,
                                        applyUnilateralMode(!isUnilateralMovement(ex)),
                                      )
                                    }
                                    className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                                      isUnilateralMovement(ex) ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
                                    }`}
                                    aria-pressed={isUnilateralMovement(ex)}
                                  >
                                    <span
                                      className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                                        isUnilateralMovement(ex) ? "left-6" : "left-1"
                                      }`}
                                    />
                                  </button>
                                </div>
                              </div>

                              <div className="grid gap-2">
                                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                                  Alternativas
                                </p>
                                <button
                                  type="button"
                                  disabled={!alternativeOptions.length}
                                  onClick={() => openAlternativePicker(ex)}
                                  className="flex h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-blue-400/40 bg-blue-500/5 px-3 text-xs font-black text-blue-700 transition hover:bg-blue-500/10 disabled:cursor-not-allowed disabled:border-[color:var(--border)] disabled:text-[color:var(--text-muted)] disabled:opacity-60 dark:text-blue-200"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  {alternativeOptions.length ? "Agregar alternativas" : "Sin alternativas disponibles"}
                                </button>
                              </div>
                            </div>

                            {(ex.alternatives || []).length > 0 && (
                              <div className="grid gap-1.5 border-t border-[color:var(--border)] p-3">
                              {ex.alternatives.map((alt) => (
                                <div
                                  key={alt.exerciseId}
                                  className="grid grid-cols-[minmax(0,1fr)_74px_34px] items-center gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-2.5 py-2"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate text-xs font-black leading-tight text-[color:var(--text)]">
                                      {alt.name}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateAlternative(
                                        ex.idx,
                                        alt.exerciseId,
                                        applyUnilateralMode(!isUnilateralMovement(alt)),
                                      )
                                    }
                                    className={`h-8 rounded-lg border px-1.5 text-[9px] font-black transition ${
                                      isUnilateralMovement(alt)
                                        ? "border-blue-400 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                                        : "border-[color:var(--border)] text-[color:var(--text-muted)]"
                                    }`}
                                  >
                                    {isUnilateralMovement(alt) ? "Unilateral" : "Normal"}
                                  </button>
                                  <button
                                    type="button"
                                    className="grid h-8 w-8 place-items-center rounded-lg text-xs text-red-500 hover:bg-red-500/10"
                                    onClick={() =>
                                      removeAlternative(ex.idx, alt.exerciseId)
                                    }
                                    aria-label={`Quitar ${alt.name}`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                              </div>
                            )}
                          </details>
                        </div>
                          )}
                        </SortableExerciseShell>
                        );
                      })}
                        </SortableContext>
                      </DndContext>
                      <button
                        type="button"
                        onClick={() => openExtraPicker(muscle)}
                        disabled={!extraOptions.length}
                        className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-400/40 bg-blue-500/5 px-4 py-3 text-sm font-black text-blue-700 transition hover:bg-blue-500/10 disabled:cursor-not-allowed disabled:border-[color:var(--border)] disabled:text-[color:var(--text-muted)] disabled:opacity-60 dark:text-blue-200"
                      >
                        <Plus className="h-4 w-4" />
                        {extraOptions.length ? "Agregar extras" : "Sin extras disponibles"}
                      </button>
                      <div className="hidden rounded-2xl border border-dashed border-blue-400/40 bg-blue-500/5 p-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700 dark:text-blue-200">
                          Agregar ejercicio extra
                        </p>
                        <p className="mt-1 text-[11px] font-semibold text-[color:var(--text-muted)]">
                          Todo ejercicio agregado aqui se guardara como extra.
                        </p>
                        {extraOptions.length ? (
                          <>
                            <div className="mt-3 grid max-h-44 gap-2 overflow-y-auto pr-1">
                              {extraOptions.map((option) => {
                                const selected = selectedExtraIds.includes(option.id);
                                const thumb = getExerciseImageUrl(option, {
                                  width: 80,
                                  height: 80,
                                });
                                return (
                                  <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => toggleExtraSelection(muscle, option.id)}
                                    className={`grid grid-cols-[34px_minmax(0,1fr)_22px] items-center gap-2 rounded-xl border p-2 text-left transition ${
                                      selected
                                        ? "border-blue-400 bg-blue-500/10"
                                        : "border-[color:var(--border)] bg-[color:var(--card)]"
                                    }`}
                                  >
                                    <div className="h-8 w-8 overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)]">
                                      {thumb ? (
                                        <img
                                          src={thumb}
                                          alt={option.name}
                                          className="h-full w-full object-cover"
                                          loading="lazy"
                                        />
                                      ) : (
                                        <div className="grid h-full w-full place-items-center text-[10px] font-black text-[color:var(--text-muted)]">
                                          {(option.name || "?").charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                    </div>
                                    <span className="truncate text-xs font-black text-[color:var(--text)]">
                                      {option.name}
                                    </span>
                                    <span
                                      className={`grid h-5 w-5 place-items-center rounded-full border text-[10px] font-black ${
                                        selected
                                          ? "border-blue-500 bg-blue-600 text-white"
                                          : "border-[color:var(--border)] text-transparent"
                                      }`}
                                    >
                                      ✓
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                            <Button
                              className="mt-3 h-11 w-full rounded-xl text-sm"
                              disabled={!selectedExtraIds.length}
                              onClick={() => confirmExtraSelection(muscle)}
                            >
                              Agregar seleccionados
                              {selectedExtraIds.length ? ` (${selectedExtraIds.length})` : ""}
                            </Button>
                          </>
                        ) : (
                          <div className="mt-3 rounded-xl border border-dashed border-[color:var(--border)] bg-[color:var(--card)] p-3 text-xs font-semibold text-[color:var(--text-muted)]">
                            No hay ejercicios disponibles para agregar como extra en este grupo.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                );
              })}

              {!exercises.length && (
                <div className="rounded-lg border border-dashed border-[color:var(--border)] p-4 text-center text-sm text-[color:var(--text-muted)]">
                  Agrega ejercicios para construir la rutina.
                </div>
              )}
            </div>
          </div>

          <div className="hidden space-y-3 lg:sticky lg:top-4 lg:block lg:self-start">
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                    Agregar ejercicio
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-[color:var(--text-muted)]">
                    Filtra por grupo o abre la biblioteca.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0 rounded-xl px-3 text-xs"
                  onClick={handleOpenLibrary}
                >
                  <Dumbbell className="h-3.5 w-3.5" />
                  Biblioteca
                </Button>
              </div>

              <div className="mt-4 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {muscleOptions.map((muscle) => (
                  <button
                    key={muscle}
                    type="button"
                    onClick={() => setSelectedMuscle(muscle)}
                    className={`h-9 shrink-0 rounded-full border px-3 text-[11px] font-black transition ${
                      selectedMuscle === muscle
                        ? "border-blue-400 bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                        : "border-[color:var(--border)] bg-[color:var(--bg)] text-[color:var(--text-muted)]"
                    }`}
                  >
                    {muscle}
                  </button>
                ))}
              </div>

              <div className="relative mt-3">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--text-muted)]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar ejercicio"
                  className="h-11 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] pl-9 pr-3 text-sm font-semibold text-[color:var(--text)] outline-none placeholder:text-[color:var(--text-muted)] focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="mt-3 grid gap-2 sm:max-h-[430px] sm:overflow-y-auto sm:pr-1">
                {filteredExercises.map((exercise) => {
                  const thumb = getExerciseImageUrl(exercise, {
                    width: 100,
                    height: 100,
                  });
                  return (
                    <button
                      key={exercise.id}
                      type="button"
                      onClick={() => addExercise(exercise)}
                      className="grid w-full grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-2.5 text-left transition hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                    >
                      <div className="h-11 w-11 overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--card)]">
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
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">
                          {exercise.name}
                        </p>
                        <p className="truncate text-[11px] font-semibold text-[color:var(--text-muted)]">
                          {exercise.muscle}
                        </p>
                      </div>
                      <span className="grid h-9 w-9 place-items-center rounded-xl border border-blue-400/30 bg-blue-500/10">
                        <Plus className="h-3.5 w-3.5 text-blue-500" />
                      </span>
                    </button>
                  );
                })}
                {!filteredExercises.length && (
                  <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-4 text-sm font-semibold text-[color:var(--text-muted)]">
                    No hay ejercicios disponibles con este filtro.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {extraPickerMuscle && (
          <div className="fixed inset-0 z-[80] flex items-end bg-black/50 px-0 sm:items-center sm:justify-center sm:p-4">
            <div className="max-h-[82vh] w-full overflow-hidden rounded-t-3xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-2xl sm:max-w-lg sm:rounded-3xl">
              <div className="flex items-start justify-between gap-3 border-b border-[color:var(--border)] px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700 dark:text-blue-200">
                    Extras
                  </p>
                  <h3 className="truncate text-lg font-black text-[color:var(--text)]">
                    {extraPickerMuscle}
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
                    Marca cuales ejercicios de este grupo seran extras.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setExtraPickerMuscle(null)}
                  className="h-9 rounded-xl border border-[color:var(--border)] px-3 text-xs font-black text-[color:var(--text)]"
                >
                  Cerrar
                </button>
              </div>

              <div className="grid max-h-[52vh] gap-2 overflow-y-auto p-4">
                {extraPickerOptions.length ? (
                  extraPickerOptions.map((option) => {
                    const selected = pickerSelectedExtraIds.includes(option.id);
                    const thumb = getExerciseImageUrl(option, {
                      width: 96,
                      height: 96,
                    });
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => toggleExtraSelection(extraPickerMuscle, option.id)}
                        className={`grid grid-cols-[44px_minmax(0,1fr)_28px] items-center gap-3 rounded-2xl border p-2.5 text-left transition ${
                          selected
                            ? "border-blue-400 bg-blue-500/10"
                            : "border-[color:var(--border)] bg-[color:var(--bg)]"
                        }`}
                      >
                        <div className="h-11 w-11 overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--card)]">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={option.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-xs font-black text-[color:var(--text-muted)]">
                              {(option.name || "?").charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-[color:var(--text)]">
                            {option.name}
                          </p>
                          <p className="text-[11px] font-semibold text-[color:var(--text-muted)]">
                            Se agregara como extra
                          </p>
                        </div>
                        <span
                          className={`grid h-7 w-7 place-items-center rounded-full border text-xs font-black ${
                            selected
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-[color:var(--border)] text-transparent"
                          }`}
                        >
                          ✓
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-4 text-sm font-semibold text-[color:var(--text-muted)]">
                    No hay ejercicios disponibles para este grupo.
                  </div>
                )}
              </div>

              <div className="border-t border-[color:var(--border)] p-4">
                <Button
                  className="h-12 w-full rounded-2xl text-sm"
                  disabled={!pickerSelectedExtraIds.length}
                  onClick={() => confirmExtraSelection(extraPickerMuscle)}
                >
                  Guardar extras
                  {pickerSelectedExtraIds.length ? ` (${pickerSelectedExtraIds.length})` : ""}
                </Button>
              </div>
            </div>
          </div>
        )}
        {alternativePickerExercise && (
          <div className="fixed inset-0 z-[80] flex items-end bg-black/50 px-0 sm:items-center sm:justify-center sm:p-4">
            <div className="max-h-[82vh] w-full overflow-hidden rounded-t-3xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-2xl sm:max-w-lg sm:rounded-3xl">
              <div className="flex items-start justify-between gap-3 border-b border-[color:var(--border)] px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700 dark:text-blue-200">
                    Alternativas
                  </p>
                  <h3 className="truncate text-lg font-black text-[color:var(--text)]">
                    {alternativePickerExercise.name}
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
                    Selecciona ejercicios del mismo grupo para usarlos como reemplazo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAlternativePickerExercise(null);
                    setSelectedAlternativeIds([]);
                  }}
                  className="h-9 rounded-xl border border-[color:var(--border)] px-3 text-xs font-black text-[color:var(--text)]"
                >
                  Cerrar
                </button>
              </div>

              <div className="grid max-h-[52vh] gap-2 overflow-y-auto p-4">
                {alternativePickerOptions.length ? (
                  alternativePickerOptions.map((option) => {
                    const selected = selectedAlternativeIds.includes(option.id);
                    const thumb = getExerciseImageUrl(option, {
                      width: 96,
                      height: 96,
                    });
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => toggleAlternativeSelection(option.id)}
                        className={`grid grid-cols-[44px_minmax(0,1fr)_28px] items-center gap-3 rounded-2xl border p-2.5 text-left transition ${
                          selected
                            ? "border-blue-400 bg-blue-500/10"
                            : "border-[color:var(--border)] bg-[color:var(--bg)]"
                        }`}
                      >
                        <div className="h-11 w-11 overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--card)]">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={option.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-xs font-black text-[color:var(--text-muted)]">
                              {(option.name || "?").charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-[color:var(--text)]">
                            {option.name}
                          </p>
                          <p className="text-[11px] font-semibold text-[color:var(--text-muted)]">
                            Se agregara como alternativa
                          </p>
                        </div>
                        <span
                          className={`grid h-7 w-7 place-items-center rounded-full border text-xs font-black ${
                            selected
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-[color:var(--border)] text-transparent"
                          }`}
                        >
                          ✓
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-4 text-sm font-semibold text-[color:var(--text-muted)]">
                    No hay alternativas disponibles para este ejercicio.
                  </div>
                )}
              </div>

              <div className="border-t border-[color:var(--border)] p-4">
                <Button
                  className="h-12 w-full rounded-2xl text-sm"
                  disabled={!selectedAlternativeIds.length}
                  onClick={confirmAlternativeSelection}
                >
                  Agregar alternativas
                  {selectedAlternativeIds.length ? ` (${selectedAlternativeIds.length})` : ""}
                </Button>
              </div>
            </div>
          </div>
        )}
        {optionsExerciseId && (() => {
          const current = exercises.find((exercise) => exercise.exerciseId === optionsExerciseId);
          if (!current) return null;
          const currentIndex = exercises.findIndex((exercise) => exercise.exerciseId === optionsExerciseId);
          const alternativeOptions = availableExercises.filter(
            (option) =>
              exerciseMatchesBranch(option, branch) &&
              option.muscle === current.muscle &&
              option.id !== current.exerciseId &&
              !(current.alternatives || []).some((alt) => alt.exerciseId === option.id),
          );

          return (
            <div className="fixed inset-0 z-[80] flex items-end bg-black/50 px-0 sm:items-center sm:justify-center sm:p-4">
              <div className="max-h-[82vh] w-full overflow-hidden rounded-t-3xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-2xl sm:max-w-lg sm:rounded-3xl">
                <div className="flex items-start justify-between gap-3 border-b border-[color:var(--border)] px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700 dark:text-blue-200">
                      Opciones
                    </p>
                    <h3 className="truncate text-lg font-black text-[color:var(--text)]">
                      {current.name}
                    </h3>
                    <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
                      Movimiento y alternativas del ejercicio.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOptionsExerciseId(null)}
                    className="h-9 rounded-xl border border-[color:var(--border)] px-3 text-xs font-black text-[color:var(--text)]"
                  >
                    Cerrar
                  </button>
                </div>

                <div className="grid gap-3 overflow-y-auto p-4">
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                        Unilateral
                      </p>
                      <p className="mt-0.5 text-[11px] font-semibold text-[color:var(--text-muted)]">
                        Activar si se trabaja un lado a la vez.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateExercise(
                          currentIndex,
                          applyUnilateralMode(!isUnilateralMovement(current)),
                        )
                      }
                      className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                        isUnilateralMovement(current) ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
                      }`}
                      aria-pressed={isUnilateralMovement(current)}
                    >
                      <span
                        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                          isUnilateralMovement(current) ? "left-6" : "left-1"
                        }`}
                      />
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={!alternativeOptions.length}
                    onClick={() => openAlternativePicker(current)}
                    className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-400/40 bg-blue-500/5 px-3 text-xs font-black text-blue-700 transition hover:bg-blue-500/10 disabled:cursor-not-allowed disabled:border-[color:var(--border)] disabled:text-[color:var(--text-muted)] disabled:opacity-60 dark:text-blue-200"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {alternativeOptions.length ? "Agregar alternativas" : "Sin alternativas disponibles"}
                  </button>

                  {(current.alternatives || []).length > 0 && (
                    <div className="grid gap-1.5">
                      {(current.alternatives || []).map((alt) => (
                        <div
                          key={alt.exerciseId}
                          className="grid grid-cols-[minmax(0,1fr)_74px_34px] items-center gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] px-2.5 py-2"
                        >
                          <p className="truncate text-xs font-black leading-tight text-[color:var(--text)]">
                            {alt.name}
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              updateAlternative(
                                currentIndex,
                                alt.exerciseId,
                                applyUnilateralMode(!isUnilateralMovement(alt)),
                              )
                            }
                            className={`h-8 rounded-lg border px-1.5 text-[9px] font-black transition ${
                              isUnilateralMovement(alt)
                                ? "border-blue-400 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                                : "border-[color:var(--border)] text-[color:var(--text-muted)]"
                            }`}
                          >
                            {isUnilateralMovement(alt) ? "Unilateral" : "Normal"}
                          </button>
                          <button
                            type="button"
                            className="grid h-8 w-8 place-items-center rounded-lg text-xs text-red-500 hover:bg-red-500/10"
                            onClick={() => removeAlternative(currentIndex, alt.exerciseId)}
                            aria-label={`Quitar ${alt.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      removeExercise(currentIndex);
                      setOptionsExerciseId(null);
                    }}
                    className="mt-1 flex h-11 items-center justify-center gap-2 rounded-2xl border border-red-500/25 bg-red-500/10 text-sm font-black text-red-600 transition hover:bg-red-500/15"
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar ejercicio
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </Modal>
  );
}

function Routines({ onNavigate }) {
  const {
    routines,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    duplicateRoutine,
  } = useRoutines();
  const { exercises: libraryExercises, trainings } = useTrainingData();

  const [libraryDraft] = useState(readRoutineLibraryDraft);
  const [modalMode, setModalMode] = useState(() =>
    libraryDraft ? (libraryDraft.mode === "create" ? "create" : "edit") : null,
  );
  const [selectedRoutine, setSelectedRoutine] = useState(
    () => libraryDraft?.routine || null,
  );
  const [activeBranch, setActiveBranch] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [canReturnToTraining, setCanReturnToTraining] =
    useState(hasTrainingReturn);
  const [editTargetRoutineId, setEditTargetRoutineId] = useState(
    readTrainingRoutineEditTarget,
  );

  const availableExercises = useMemo(() => {
    const seen = new Set();
    return libraryExercises
      .filter((ex) => {
        if (seen.has(ex.id)) return false;
        seen.add(ex.id);
        return true;
      })
      .map((ex) => ({
        id: ex.id,
        name: ex.name,
        muscle: ex.muscle,
        image: ex.image || "",
        imagePublicId: ex.imagePublicId || "",
        branches: ex.branches || ["general"],
        supportsUnilateral: Boolean(ex.supportsUnilateral),
      }));
  }, [libraryExercises]);

  const exerciseMetaMap = useMemo(() => {
    const map = new Map();
    availableExercises.forEach((ex) => {
      map.set(ex.id, ex);
      if (ex.name) map.set(slugify(ex.name), ex);
    });
    return map;
  }, [availableExercises]);

  const routineHistoryMap = useMemo(() => {
    const map = new Map();
    (trainings || []).forEach((training) => {
      if (!training?.routineId) return;
      const ts = getDateTimestamp(training.date || training.createdAt);
      const current = map.get(training.routineId) || {
        count: 0,
        lastDate: null,
        lastTs: 0,
      };
      const next = { ...current, count: current.count + 1 };
      if (ts > next.lastTs) {
        next.lastTs = ts;
        next.lastDate = training.date || training.createdAt;
      }
      map.set(training.routineId, next);
    });
    return map;
  }, [trainings]);

  const weekSummary = useMemo(() => {
    const activeDays = new Set();
    (trainings || []).forEach((training) => {
      const key = getISODateKey(training.date || training.createdAt);
      if (key) activeDays.add(key);
    });
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const key = getISODateKey(date);
      const label = date
        .toLocaleDateString("es-ES", { weekday: "short" })
        .replace(".", "");
      days.push({
        key,
        label: label.charAt(0).toUpperCase() + label.slice(1, 3),
        active: activeDays.has(key),
      });
    }
    return days;
  }, [trainings]);

  const branchCounts = useMemo(() => {
    const counts = { all: routines.length, sopocachi: 0, miraflores: 0 };
    routines.forEach((routine) => {
      const branch = normalizeBranch(routine.branch);
      counts[branch] = (counts[branch] || 0) + 1;
    });
    return counts;
  }, [routines]);

  const routineCards = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return routines
      .filter((routine) =>
        activeBranch === "all"
          ? true
          : normalizeBranch(routine.branch) === activeBranch,
      )
      .filter((routine) => {
        if (!query) return true;
        return (routine.name || "").toLowerCase().includes(query);
      })
      .map((routine) => {
        const exercises = routine.exercises || [];
        const muscles = new Set();
        let totalSets = 0;
        let extras = 0;
        const preview = [];

        exercises.forEach((ex) => {
          totalSets += Number(ex.sets) || 0;
          if (ex.isExtra) extras += 1;
          const meta =
            exerciseMetaMap.get(ex.exerciseId) ||
            exerciseMetaMap.get(slugify(ex.name));
          const muscle = ex.muscle || meta?.muscle;
          if (muscle) muscles.add(muscle);
          if (preview.length < 3) {
            preview.push({
              name: ex.name || meta?.name || "Ejercicio",
              url: getExerciseImageUrl(meta || ex, {
                width: 120,
                height: 120,
              }),
            });
          }
        });

        const history = routineHistoryMap.get(routine.id) || {
          count: 0,
          lastDate: null,
        };

        return {
          ...routine,
          exerciseCount: exercises.length,
          totalSets,
          extras,
          muscles: Array.from(muscles),
          preview,
          sessionsCount: history.count,
          lastDate: history.lastDate,
        };
      });
  }, [routines, activeBranch, searchTerm, exerciseMetaMap, routineHistoryMap]);

  const totals = useMemo(() => {
    const exerciseCount = routines.reduce(
      (sum, routine) => sum + (routine.exercises || []).length,
      0,
    );
    return {
      routines: routines.length,
      exercises: exerciseCount,
      sessions: trainings?.length || 0,
    };
  }, [routines, trainings]);

  const openCreate = () => {
    setSelectedRoutine(null);
    setModalMode("create");
  };

  const openEdit = (routine) => {
    setSelectedRoutine(routine);
    setModalMode("edit");
  };

  useEffect(() => {
    if (!editTargetRoutineId) return;
    const target = routines.find(
      (routine) =>
        routine.id === editTargetRoutineId ||
        routine._id === editTargetRoutineId,
    );
    if (!target) return;
    // This effect bridges a navigation intent stored before the page mounted.
    // It runs once per target and immediately clears the marker.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedRoutine(target);
    setModalMode("edit");
    setEditTargetRoutineId(null);
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(TRAINING_ROUTINE_EDIT_TARGET_KEY);
    }
  }, [editTargetRoutineId, routines]);

  const closeModal = () => {
    setSelectedRoutine(null);
    setModalMode(null);
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(ROUTINE_LIBRARY_DRAFT_KEY);
      localStorage.removeItem(TRAINING_ROUTINE_EDIT_TARGET_KEY);
    }
  };

  const handleSave = async (routine) => {
    if (modalMode === "create") await addRoutine(routine);
    if (modalMode === "edit") await updateRoutine(routine.id, routine);
    if (
      typeof localStorage !== "undefined" &&
      hasTrainingReturn() &&
      routine?.id
    ) {
      localStorage.setItem(
        ROUTINE_UPDATED_DURING_TRAINING_KEY,
        JSON.stringify({
          routineId: routine.id,
          savedAt: Date.now(),
        }),
      );
    }
    closeModal();
  };

  const handleReturnToTraining = () => {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(TRAINING_ROUTINES_RETURN_KEY);
      localStorage.removeItem(TRAINING_ROUTINE_EDIT_TARGET_KEY);
    }
    setCanReturnToTraining(false);
    onNavigate?.("registrar");
  };

  return (
    <>
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700 dark:text-blue-200">
              Planificación
            </p>
            <h1 className="mt-1 text-3xl font-black leading-none text-[color:var(--text)]">
              Rutinas
            </h1>
            <p className="mt-2 hidden max-w-2xl text-sm leading-5 text-[color:var(--text-muted)] sm:block">
              Organiza rutinas por sede, orden real de ejercicios y grupos
              musculares.
            </p>
          </div>
          <div className="grid shrink-0 gap-2">
            {canReturnToTraining && (
              <Button
                variant="outline"
                onClick={handleReturnToTraining}
                className="h-12 gap-2 rounded-xl px-3"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Volver</span>
              </Button>
            )}
            <Button
              onClick={openCreate}
              className="h-14 gap-2 rounded-xl px-4 text-sm"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nueva rutina</span>
              <span className="sm:hidden">Nueva</span>
            </Button>
          </div>
        </div>

        <div className="hidden grid-cols-3 gap-3 sm:grid">
          <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                Rutinas
              </p>
              <p className="mt-2 text-3xl font-black text-blue-700 dark:text-blue-100">
                {totals.routines}
              </p>
          </div>
          <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                Ejercicios
              </p>
              <p className="mt-2 text-3xl font-black text-blue-700 dark:text-blue-100">
                {totals.exercises}
              </p>
          </div>
          <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                Sesiones
              </p>
              <p className="mt-2 text-3xl font-black text-blue-700 dark:text-blue-100">
                {totals.sessions}
              </p>
          </div>
        </div>

        <div className="hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-3 sm:block">
          <div className="grid grid-cols-7 gap-1">
            {weekSummary.map((day) => (
              <div key={day.key} className="text-center">
                <div className="text-[10px] font-black text-[color:var(--text-muted)]">
                  {day.label}
                </div>
                <div
                  className={`mx-auto mt-2 h-2.5 w-2.5 rounded-full shadow-sm ${
                    day.active
                      ? "bg-blue-400 shadow-blue-400/40"
                      : "bg-[color:var(--border)]"
                  }`}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="sticky top-2 z-10 space-y-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)]/95 p-3 shadow-sm backdrop-blur sm:static">
          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[
              { id: "all", label: "Todas", count: branchCounts.all },
              {
                id: "sopocachi",
                label: "Sopocachi",
                count: branchCounts.sopocachi,
              },
              {
                id: "miraflores",
                label: "Miraflores",
                count: branchCounts.miraflores,
              },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveBranch(item.id)}
                className={`h-9 shrink-0 rounded-full px-4 text-xs font-black transition ${
                  activeBranch === item.id
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                    : "bg-[color:var(--card)] text-[color:var(--text-muted)]"
                }`}
              >
                {item.label} {item.count}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar rutina"
              className="h-12 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] pl-10 pr-3 text-sm text-[color:var(--text)] outline-none transition placeholder:text-[color:var(--text-muted)] focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-3 pb-24 sm:mt-5 sm:pb-0 md:grid-cols-2 xl:grid-cols-3">
        {routineCards.map((routine) => (
          <article
            key={routine.id}
            role="button"
            tabIndex={0}
            onClick={() => openEdit(routine)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openEdit(routine);
              }
            }}
            className="relative cursor-pointer overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <span
              className={`absolute left-0 top-0 h-full w-1 ${
                normalizeBranch(routine.branch) === "sopocachi"
                  ? "bg-emerald-400"
                  : "bg-blue-400"
              }`}
            />

            <div className="flex items-start gap-3 pl-1">
              <div className="min-w-0 flex-1 pr-1">
                <h2 className="break-words text-lg font-black leading-tight text-[color:var(--text)] sm:text-xl">
                    {routine.name}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {branchLabel(routine.branch)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {formatShortDate(routine.lastDate)}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    openEdit(routine);
                  }}
                  className="grid h-9 w-9 place-items-center rounded-xl bg-[color:var(--bg)] text-blue-700 transition hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-500/10"
                  aria-label="Editar rutina"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    deleteRoutine(routine.id);
                  }}
                  className="grid h-9 w-9 place-items-center rounded-xl bg-[color:var(--bg)] text-[color:var(--text-muted)] transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                  aria-label="Eliminar rutina"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 pl-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:gap-4">
              <div className="col-span-2 grid grid-cols-2 gap-2 sm:col-span-1 sm:gap-5">
                <div className="rounded-xl bg-[color:var(--bg)] p-3 sm:bg-transparent sm:p-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                    Ejercicios
                  </p>
                  <p
                    className={`mt-1 inline-flex items-center gap-1 text-lg font-black ${
                      normalizeBranch(routine.branch) === "sopocachi"
                        ? "text-emerald-400"
                        : "text-blue-300"
                    }`}
                  >
                    <Dumbbell className="h-3.5 w-3.5" />
                    {routine.exerciseCount}
                  </p>
                </div>
                <div className="rounded-xl bg-[color:var(--bg)] p-3 sm:bg-transparent sm:p-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                    Series
                  </p>
                  <p
                    className={`mt-1 inline-flex items-center gap-1 text-lg font-black ${
                      normalizeBranch(routine.branch) === "sopocachi"
                        ? "text-emerald-400"
                        : "text-blue-300"
                    }`}
                  >
                    <Layers3 className="h-3.5 w-3.5" />
                    {routine.totalSets}
                  </p>
                </div>
              </div>

              <div className="hidden items-center sm:flex">
                <div className="-space-x-2 flex rounded-full bg-[color:var(--bg)] px-2 py-1">
                  {routine.preview.map((item, idx) => (
                    <div
                      key={`${routine.id}-${idx}`}
                      className="h-8 w-8 overflow-hidden rounded-full border-2 border-[color:var(--card)] bg-[color:var(--bg)]"
                    >
                      {item.url ? (
                        <img
                          src={item.url}
                          alt={item.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-xs text-[color:var(--text-muted)]">
                          {item.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  ))}
                  {routine.exerciseCount > routine.preview.length ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openEdit(routine);
                      }}
                      className="grid h-8 min-w-8 place-items-center rounded-full border-2 border-[color:var(--card)] bg-[color:var(--bg)] px-2 text-[10px] font-black text-blue-700 dark:text-blue-300"
                      aria-label="Ver ejercicios restantes"
                    >
                      +{routine.exerciseCount - routine.preview.length}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-4 hidden items-center justify-between gap-2 pl-1 sm:flex">
              <div className="flex min-w-0 gap-1.5 overflow-hidden">
                {routine.muscles.slice(0, 3).map((muscle) => (
                  <span
                    key={muscle}
                    className="truncate rounded-full bg-[color:var(--bg)] px-2 py-1 text-[9px] font-black text-[color:var(--text-muted)]"
                  >
                    {muscle}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  duplicateRoutine(routine.id);
                }}
                className="shrink-0 rounded-lg bg-[color:var(--bg)] px-3 py-2 text-[11px] font-black text-[color:var(--text-muted)] transition hover:text-[color:var(--text)]"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </article>
        ))}

        {!routineCards.length && (
          <Card className="p-8 text-center md:col-span-2 xl:col-span-3">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full border border-[color:var(--border)] bg-[color:var(--bg)]">
              <Layers3 className="h-5 w-5 text-[color:var(--text-muted)]" />
            </div>
            <p className="text-sm font-semibold text-[color:var(--text)]">
              No hay rutinas para mostrar.
            </p>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              Crea una rutina o ajusta los filtros.
            </p>
            <Button className="mt-4" onClick={openCreate}>
              Crear rutina
            </Button>
          </Card>
        )}
      </section>

      {modalMode && (
        <RoutineModal
          mode={modalMode}
          initialData={selectedRoutine}
          availableExercises={availableExercises}
          onSave={handleSave}
          onClose={closeModal}
          onOpenLibrary={() => {
            setSelectedRoutine(null);
            setModalMode(null);
            onNavigate?.("library");
          }}
        />
      )}
    </>
  );
}

export default Routines;
