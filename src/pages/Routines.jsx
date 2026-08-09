import { useCallback, useEffect, useMemo, useState } from "react";
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
import { toast } from "sonner";
import {
  ArrowLeft,
  Bed,
  Check,
  Archive,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Copy,
  Dumbbell,
  GripVertical,
  Settings2,
  Layers3,
  Loader2,
  MoreVertical,
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import Modal from "../components/shared/Modal";
import SlideToConfirm from "../components/shared/SlideToConfirm";
import { getExerciseImageUrl } from "../utils/cloudinary";
import { useRoutines } from "../context/RoutineContext";
import { useTrainingData } from "../context/TrainingContext";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/button";
import Badge from "../components/ui/badge";
import { api } from "../services/api";
import CoachPlanModal from "../components/coach/CoachPlanModal";
import CoachPlanTemplates from "../components/coach/CoachPlanTemplates";

const BRANCH_OPTIONS = ["sopocachi", "miraflores"];
const DEFAULT_BRANCH = "sopocachi";
const ROUTINE_GROUPS = [
  { id: "full_body", label: "Full body" },
  { id: "upper_lower", label: "Superior / inferior" },
  { id: "ppl", label: "Empuje / jale / piernas" },
  { id: "strength", label: "Fuerza" },
  { id: "return", label: "Retorno" },
];
const ROUTINE_GROUP_LABELS = Object.fromEntries(
  ROUTINE_GROUPS.map((item) => [item.id, item.label]),
);
const ROUTINE_LEVEL_LABELS = {
  beginner: "Principiante",
  intermediate: "Intermedio",
  advanced: "Avanzado",
};
const formatPlanDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("es-BO", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : "";
const getPlanEndDate = (plan) => {
  if (plan?.endDate) return plan.endDate;
  if (!plan?.startDate) return "";
  const end = new Date(plan.startDate);
  end.setUTCDate(end.getUTCDate() + Number(plan.durationWeeks || 1) * 7 - 1);
  return end;
};
const getPlanTimeProgress = (plan, now = new Date()) => {
  if (!plan?.startDate) {
    return { percentage: 0, message: "Sin fecha de inicio" };
  }
  const start = new Date(plan.startDate);
  const end = new Date(getPlanEndDate(plan));
  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(0, 0, 0, 0);
  const endExclusive = new Date(end);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  const totalMs = Math.max(1, endExclusive.getTime() - start.getTime());
  const elapsedMs = Math.min(
    totalMs,
    Math.max(0, now.getTime() - start.getTime()),
  );
  const percentage = Math.round((elapsedMs / totalMs) * 100);

  if (now < start) {
    const days = Math.max(
      1,
      Math.ceil((start.getTime() - now.getTime()) / 86400000),
    );
    return {
      percentage,
      message: `Comienza en ${days} ${days === 1 ? "dia" : "dias"}`,
    };
  }
  if (now >= endExclusive) {
    return { percentage: 100, message: "Periodo finalizado" };
  }
  const days = Math.max(
    1,
    Math.ceil((endExclusive.getTime() - now.getTime()) / 86400000),
  );
  return {
    percentage,
    message: `${days} ${days === 1 ? "dia restante" : "dias restantes"}`,
  };
};
const PLAN_DAY_NAMES = [
  "Lunes",
  "Martes",
  "Miercoles",
  "Jueves",
  "Viernes",
  "Sabado",
  "Domingo",
];
const PLAN_STATUS_LABELS = {
  active: "Vigente",
  scheduled: "Programada",
  draft: "Borrador",
  paused: "Pausada",
  completed: "Completada",
  cancelled: "Archivada",
};
const getRoutineExerciseSummary = (routine) => {
  const exercises = routine?.exercises || [];
  const optionalCount = exercises.filter((exercise) => exercise.isExtra).length;
  const baseCount = exercises.length - optionalCount;
  return `${baseCount} ejercicios${optionalCount ? ` + ${optionalCount} ${optionalCount === 1 ? "opcional" : "opcionales"}` : ""}`;
};
const TRAINING_PLAN_ROUTINE_INTENT_KEY = "training_plan_routine_intent";
const getPlanWeekIndex = (plan) => {
  if (!plan?.startDate) return 0;
  const start = new Date(plan.startDate);
  start.setUTCHours(0, 0, 0, 0);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return Math.min(
    Math.max(0, Number(plan.durationWeeks || 1) - 1),
    Math.max(0, Math.floor((today - start) / (7 * 86400000))),
  );
};
const getPlanDayDate = (plan, weekIndex, dayIndex) => {
  const date = new Date(plan.startDate);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + weekIndex * 7 + dayIndex);
  return date;
};
const toPlanIsoDate = (date) => date.toISOString().slice(0, 10);
const formatPlanDayDate = (date) =>
  date.toLocaleDateString("es-BO", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
const GLOBAL_ORDER_GROUP = "Orden de la rutina";
const SETUP_MUSCLE_ORDER = [
  "Pecho",
  "Espalda",
  "Hombros",
  "Biceps",
  "Triceps",
  "Antebrazos",
  "Cuadriceps",
  "Isquiotibiales",
  "Femoral",
  "Gluteos",
  "Aductores",
  "Abductores",
  "Pantorrillas",
  "Tibial anterior",
  "Abdominales",
  "Oblicuos",
  "Transverso abdominal",
  "Erectores espinales",
  "Core",
  "Core global",
];
const ROUTINE_TYPES = [
  {
    id: "push",
    label: "Empuje",
    description: "Pecho, hombro y triceps",
    muscles: ["Pecho", "Hombros", "Triceps"],
    suggestedName: "Pecho · Hombro · Triceps",
  },
  {
    id: "pull",
    label: "Tracción",
    description: "Espalda y biceps",
    muscles: ["Espalda", "Biceps"],
    suggestedName: "Espalda · Biceps",
  },
  {
    id: "legs",
    label: "Piernas",
    description: "Cuadriceps, femoral y gluteos",
    muscles: ["Cuadriceps", "Femoral", "Gluteos"],
    suggestedName: "Pierna completa",
  },
  {
    id: "upper",
    label: "Tren superior",
    description: "Torso completo",
    muscles: ["Pecho", "Espalda", "Hombros", "Biceps", "Triceps"],
    suggestedName: "Tren superior",
  },
  {
    id: "lower",
    label: "Tren inferior",
    description: "Pierna completa",
    muscles: ["Cuadriceps", "Femoral", "Gluteos", "Pantorrillas"],
    suggestedName: "Tren inferior",
  },
  {
    id: "full_body",
    label: "Full body",
    description: "Cuerpo completo",
    muscles: ["Pecho", "Espalda", "Cuadriceps", "Femoral", "Hombros"],
    suggestedName: "Full body",
  },
  {
    id: "custom",
    label: "Personalizada",
    description: "Elige los grupos",
    muscles: [],
    suggestedName: "Rutina personalizada",
  },
];
const ROUTINE_LIBRARY_DRAFT_KEY = "routine_edit_library_draft";
const TRAINING_ROUTINES_RETURN_KEY = "training_routines_return";
const TRAINING_ROUTINE_EDIT_TARGET_KEY = "training_routine_edit_target";
const ROUTINE_UPDATED_DURING_TRAINING_KEY = "routine_updated_during_training";

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

const createRoutineId = (name = "rutina") => {
  const uniquePart =
    globalThis.crypto?.randomUUID?.() || Date.now().toString(36);
  return `${slugify(name) || "rutina"}-${uniquePart}`;
};

const normalizeRoutineSetInput = (value) =>
  value.replace(/\D/g, "").slice(0, 2);

const clampRoutineSetCount = (value) =>
  Math.min(30, Math.max(1, Number.parseInt(value, 10) || 1));

const normalizeTextKey = (text = "") =>
  text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/s$/, "");

const resolveMuscleOption = (target, options = []) => {
  const key = normalizeTextKey(target);
  const equivalentKeys =
    key === "femoral"
      ? new Set([key, normalizeTextKey("Isquiotibiales")])
      : key === "core"
        ? new Set([key, normalizeTextKey("Core global")])
        : new Set([key]);
  return (
    options.find((option) => equivalentKeys.has(normalizeTextKey(option))) ||
    null
  );
};

const toValidDate = (value) => {
  if (!value) return null;
  const normalized =
    typeof value === "string" && value.length <= 10
      ? `${value}T00:00:00`
      : value;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
};

const getDateTimestamp = (value) => {
  const d = toValidDate(value);
  return d ? d.getTime() : 0;
};

const branchLabel = (value) => {
  const branch = normalizeBranch(value);
  return branch.charAt(0).toUpperCase() + branch.slice(1);
};

const orderByMuscleBlocks = (items = []) => {
  const groups = new Map();
  items.forEach((item) => {
    const muscle = item.muscle || "Sin grupo";
    if (!groups.has(muscle)) groups.set(muscle, []);
    groups.get(muscle).push(item);
  });
  return Array.from(groups.values()).flat();
};

const groupByMuscle = (items = [], orderMode = "free") => {
  if (!items.length) return [];
  if (orderMode === "muscle_blocks") {
    const groups = new Map();
    items.forEach((item, idx) => {
      const muscle = item.muscle || "Sin grupo";
      if (!groups.has(muscle)) groups.set(muscle, []);
      groups.get(muscle).push({ ...item, idx });
    });
    return Array.from(groups.entries());
  }
  return [[GLOBAL_ORDER_GROUP, items.map((item, idx) => ({ ...item, idx }))]];
};

const exerciseMatchesBranch = (exercise, branch) => {
  if (!branch) return true;
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

const routineDraftSignature = ({
  name,
  branch,
  exerciseOrderMode,
  progressMode,
  sourceRoutineId,
  exercises,
}) =>
  JSON.stringify({
    name: name || "",
    branch: normalizeBranch(branch),
    exerciseOrderMode:
      exerciseOrderMode === "muscle_blocks" ? "muscle_blocks" : "free",
    progressMode: progressMode === "inherit" ? "inherit" : "fresh",
    sourceRoutineId: sourceRoutineId || "",
    exercises: (exercises || []).map((exercise) => ({
      exerciseId: exercise.exerciseId || exercise.id,
      sets: Number(exercise.sets) || 1,
      movementMode: movementModeFrom(exercise.movementMode),
      isExtra: Boolean(exercise.isExtra),
      alternatives: (exercise.alternatives || []).map(
        (item) => item.exerciseId,
      ),
    })),
  });

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

function DeleteRoutineSheet({ routine, onConfirm, onClose }) {
  if (!routine) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end bg-black/55 px-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
      <div className="w-full rounded-t-3xl border border-red-500/20 bg-[color:var(--card)] p-4 text-[color:var(--text)] shadow-2xl sm:max-w-md sm:rounded-3xl">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[color:var(--border)] sm:hidden" />
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-red-500/10 text-red-600">
            <Trash2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-600">
              Eliminar rutina
            </p>
            <h3 className="mt-1 truncate text-lg font-black">{routine.name}</h3>
            <p className="mt-1 text-sm font-semibold text-[color:var(--text-muted)]">
              {routine.plan
                ? `Esta rutina pertenece a ${routine.plan.name}. Al eliminarla, la planificación volverá a borrador hasta que asignes un reemplazo.`
                : "Esta accion no se puede deshacer. Desliza hasta el final para confirmar."}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <SlideToConfirm
            label="Desliza para eliminar"
            ariaLabel="Deslizar para confirmar eliminacion"
            onConfirm={onConfirm}
          />
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-3 h-11 w-full rounded-2xl border border-[color:var(--border)] text-sm font-black text-[color:var(--text)]"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function ExercisePickerOption({
  option,
  selected,
  branch,
  onToggle,
  showUsage,
}) {
  const thumb = getExerciseImageUrl(option, { width: 96, height: 96 });
  const usageCount =
    option.usageByBranch?.[branch]?.count || option.usageCount || 0;

  return (
    <button
      type="button"
      onClick={() => onToggle(option.id)}
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
          {showUsage && usageCount
            ? `${usageCount} ${usageCount === 1 ? "sesion" : "sesiones"}`
            : option.muscle}
        </p>
      </div>
      <span
        className={`grid h-7 w-7 place-items-center rounded-full border ${
          selected
            ? "border-blue-600 bg-blue-600 text-white"
            : "border-[color:var(--border)] text-transparent"
        }`}
      >
        <Check className="h-4 w-4" aria-hidden="true" />
      </span>
    </button>
  );
}

function RoutineModal({
  mode = "create",
  initialData,
  onSave,
  onClose,
  onOpenLibrary,
  availableExercises,
  existingRoutines = [],
  libraryLoading = false,
  libraryError = null,
  onRetryLibrary,
  locationMode = "single",
  defaultBranch = "sopocachi",
  allowedBranches = BRANCH_OPTIONS,
}) {
  const [routineId] = useState(
    () =>
      initialData?.id || initialData?._id || createRoutineId(initialData?.name),
  );
  const [name, setName] = useState(initialData?.name || "");
  const [branch, setBranch] = useState(() =>
    normalizeBranch(initialData?.branch || defaultBranch),
  );
  const exerciseFilterBranch = locationMode === "disabled" ? "" : branch;
  const selectableBranches =
    locationMode === "multiple" && allowedBranches.length
      ? allowedBranches
      : BRANCH_OPTIONS;
  const [routineType, setRoutineType] = useState("");
  const [exerciseOrderMode, setExerciseOrderMode] = useState(
    initialData?.exerciseOrderMode === "muscle_blocks"
      ? "muscle_blocks"
      : "free",
  );
  const [selectedSetupMuscles, setSelectedSetupMuscles] = useState(() => {
    const draftMuscles = (initialData?.exercises || [])
      .map((exercise) => exercise.muscle)
      .filter(Boolean);
    return draftMuscles.length ? new Set(draftMuscles) : null;
  });
  const [nameEdited, setNameEdited] = useState(Boolean(initialData?.name));
  const [selectedMuscle, setSelectedMuscle] = useState(
    availableExercises?.[0]?.muscle || "Pecho",
  );
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [setupComplete, setSetupComplete] = useState(mode !== "create");
  const [progressMode, setProgressMode] = useState(
    initialData?.progressMode === "inherit" ? "inherit" : "fresh",
  );
  const [sourceRoutineId, setSourceRoutineId] = useState(
    initialData?.sourceRoutineId || "",
  );
  const [exercises, setExercises] = useState(() =>
    (initialData?.exercises || []).map((ex) =>
      resolveExerciseFromLibrary(availableExercises, ex),
    ),
  );
  const [collapsedMuscles, setCollapsedMuscles] = useState(() => new Set());
  const [selectedExtraByMuscle, setSelectedExtraByMuscle] = useState(
    () => ({}),
  );
  const [extraPickerMuscle, setExtraPickerMuscle] = useState(null);
  const [alternativePickerExercise, setAlternativePickerExercise] =
    useState(null);
  const [selectedAlternativeIds, setSelectedAlternativeIds] = useState([]);
  const [optionsExerciseId, setOptionsExerciseId] = useState(null);
  const [exercisePickerOpen, setExercisePickerOpen] = useState(false);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [closeConfirmationOpen, setCloseConfirmationOpen] = useState(false);
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
    const preferredOrder = SETUP_MUSCLE_ORDER.map(normalizeTextKey);
    return Array.from(set).sort((a, b) => {
      const aIndex = preferredOrder.indexOf(normalizeTextKey(a));
      const bIndex = preferredOrder.indexOf(normalizeTextKey(b));
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }, [availableExercises]);

  const setupMuscleOptions = useMemo(() => {
    const allowed = new Set(SETUP_MUSCLE_ORDER.map(normalizeTextKey));
    return muscleOptions.filter((muscle) =>
      allowed.has(normalizeTextKey(muscle)),
    );
  }, [muscleOptions]);

  const selectedRoutineType = useMemo(
    () =>
      ROUTINE_TYPES.find((item) => item.id === routineType) || {
        muscles: [],
        suggestedName: "",
      },
    [routineType],
  );

  const defaultSetupMuscles = useMemo(
    () =>
      selectedRoutineType.muscles
        .map((muscle) => resolveMuscleOption(muscle, setupMuscleOptions))
        .filter(Boolean),
    [selectedRoutineType, setupMuscleOptions],
  );

  const effectiveSetupMuscles = useMemo(
    () => selectedSetupMuscles ?? new Set(defaultSetupMuscles),
    [defaultSetupMuscles, selectedSetupMuscles],
  );

  const pickerMuscleOptions = useMemo(() => {
    if (mode !== "create" || !effectiveSetupMuscles.size) return muscleOptions;
    return muscleOptions.filter((muscle) => effectiveSetupMuscles.has(muscle));
  }, [effectiveSetupMuscles, mode, muscleOptions]);

  const suggestedRoutineName = useMemo(() => {
    const selected = Array.from(effectiveSetupMuscles);
    return selected.length
      ? selected.slice(0, 3).join(" · ")
      : selectedRoutineType.suggestedName;
  }, [effectiveSetupMuscles, selectedRoutineType.suggestedName]);

  const effectiveRoutineName =
    nameEdited || name.trim() ? name : suggestedRoutineName;

  const exercisePickerOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    const currentIds = new Set(
      exercises.map((exercise) => exercise.exerciseId),
    );
    const sortedOptions = availableExercises
      .filter((ex) => exerciseMatchesBranch(ex, exerciseFilterBranch))
      .filter((ex) => !selectedMuscle || ex.muscle === selectedMuscle)
      .filter((ex) => !currentIds.has(ex.id))
      .filter(
        (ex) =>
          !query ||
          ex.name.toLowerCase().includes(query) ||
          (ex.aliases || []).some((alias) =>
            alias.toLowerCase().includes(query),
          ),
      )
      .sort(
        (a, b) =>
          (b.usageByBranch?.[exerciseFilterBranch]?.count || 0) -
            (a.usageByBranch?.[exerciseFilterBranch]?.count || 0) ||
          (b.usageCount || 0) - (a.usageCount || 0) ||
          (b.lastUsedAt || 0) - (a.lastUsedAt || 0) ||
          a.name.localeCompare(b.name),
      );
    const seenNames = new Set();
    return sortedOptions
      .filter((exercise) => {
        const key = normalizeTextKey(exercise.name);
        if (seenNames.has(key)) return false;
        seenNames.add(key);
        return true;
      })
      .slice(0, 80);
  }, [
    availableExercises,
    exerciseFilterBranch,
    exercises,
    selectedMuscle,
    search,
  ]);

  const frequentExerciseOptions = useMemo(() => {
    if (search.trim()) return [];
    return exercisePickerOptions
      .filter(
        (exercise) =>
          (exercise.usageByBranch?.[exerciseFilterBranch]?.count || 0) > 0 ||
          exercise.usageCount > 0,
      )
      .slice(0, 5);
  }, [exerciseFilterBranch, exercisePickerOptions, search]);

  const regularExerciseOptions = useMemo(() => {
    if (!frequentExerciseOptions.length) return exercisePickerOptions;
    const frequentIds = new Set(
      frequentExerciseOptions.map((exercise) => exercise.id),
    );
    return exercisePickerOptions.filter(
      (exercise) => !frequentIds.has(exercise.id),
    );
  }, [exercisePickerOptions, frequentExerciseOptions]);

  const allFrequentSelected =
    frequentExerciseOptions.length > 0 &&
    frequentExerciseOptions.every((exercise) =>
      selectedExerciseIds.includes(exercise.id),
    );
  const nextPendingMuscle = pickerMuscleOptions.find(
    (muscle) =>
      muscle !== selectedMuscle &&
      !exercises.some((exercise) => exercise.muscle === muscle),
  );

  const toggleFrequentSelection = () => {
    const frequentIds = frequentExerciseOptions.map((exercise) => exercise.id);
    setSelectedExerciseIds((current) =>
      allFrequentSelected
        ? current.filter((id) => !frequentIds.includes(id))
        : Array.from(new Set([...current, ...frequentIds])),
    );
  };

  const groupedSelected = useMemo(
    () => groupByMuscle(exercises, exerciseOrderMode),
    [exerciseOrderMode, exercises],
  );

  const progressSourceOptions = useMemo(
    () =>
      existingRoutines
        .map((routine) => {
          const routineMuscles = (routine.exercises || []).map(
            (exercise) =>
              exercise.muscle ||
              availableExercises.find(
                (option) => option.id === exercise.exerciseId,
              )?.muscle,
          );
          const matchingMuscles = new Set(
            routineMuscles.filter((muscle) =>
              effectiveSetupMuscles.has(muscle),
            ),
          );
          const matchingExercises = routineMuscles.filter((muscle) =>
            effectiveSetupMuscles.has(muscle),
          ).length;
          const compatibilityPercent = effectiveSetupMuscles.size
            ? Math.round(
                (matchingMuscles.size / effectiveSetupMuscles.size) * 100,
              )
            : 0;
          return { ...routine, matchingExercises, compatibilityPercent };
        })
        .filter(
          (routine) =>
            routine?.progressScopeId &&
            (!exerciseFilterBranch ||
              normalizeBranch(routine.branch) === exerciseFilterBranch) &&
            routine.matchingExercises > 0 &&
            (routine._id || routine.id) !==
              (initialData?._id || initialData?.id),
        )
        .sort((a, b) => b.matchingExercises - a.matchingExercises),
    [
      availableExercises,
      exerciseFilterBranch,
      effectiveSetupMuscles,
      existingRoutines,
      initialData?._id,
      initialData?.id,
    ],
  );

  const toggleMuscleGroup = (muscle) => {
    setCollapsedMuscles((prev) => {
      const next = new Set(prev);
      if (next.has(muscle)) next.delete(muscle);
      else next.add(muscle);
      return next;
    });
  };

  const handleRoutineTypeSelect = (typeId) => {
    const type =
      ROUTINE_TYPES.find((item) => item.id === typeId) || ROUTINE_TYPES[0];
    const defaults = type.muscles
      .map((muscle) => resolveMuscleOption(muscle, setupMuscleOptions))
      .filter(Boolean);
    setRoutineType(typeId);
    setSelectedSetupMuscles(new Set(defaults));
  };

  const handleExerciseOrderModeChange = (nextMode) => {
    const normalized = nextMode === "muscle_blocks" ? nextMode : "free";
    setExerciseOrderMode(normalized);
    if (normalized === "muscle_blocks") {
      setExercises((current) => orderByMuscleBlocks(current));
    }
  };

  const handleBranchChange = (nextBranch) => {
    const unavailable = exercises.filter(
      (exercise) =>
        !exerciseMatchesBranch(
          availableExercises.find(
            (option) => option.id === exercise.exerciseId,
          ) || exercise,
          nextBranch,
        ),
    );
    if (unavailable.length) {
      setError(
        `${unavailable.length} ejercicio${unavailable.length === 1 ? " no esta" : "s no estan"} disponible${unavailable.length === 1 ? "" : "s"} en ${branchLabel(nextBranch)}. Quitalo o reemplazalo antes de cambiar de sede.`,
      );
      return;
    }
    setBranch(nextBranch);
    setError("");
    if (progressMode === "inherit") {
      setProgressMode("fresh");
      setSourceRoutineId("");
    }
  };

  const toggleSetupMuscle = (muscle) => {
    setSelectedSetupMuscles((prev) => {
      const next = new Set(prev ?? effectiveSetupMuscles);
      if (next.has(muscle)) next.delete(muscle);
      else next.add(muscle);
      return next;
    });
  };

  const toRoutineExercise = (exercise, options = {}) => ({
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
  });

  const openExercisePicker = () => {
    setSelectedExerciseIds([]);
    setExercisePickerOpen(true);
  };

  const toggleExerciseSelection = (exerciseId) => {
    setSelectedExerciseIds((prev) =>
      prev.includes(exerciseId)
        ? prev.filter((id) => id !== exerciseId)
        : [...prev, exerciseId],
    );
  };

  const addSelectedExercises = () => {
    const additions = selectedExerciseIds
      .map((exerciseId) =>
        availableExercises.find((exercise) => exercise.id === exerciseId),
      )
      .filter(Boolean)
      .filter((exercise) =>
        exerciseMatchesBranch(exercise, exerciseFilterBranch),
      )
      .map((exercise) => toRoutineExercise(exercise));
    const combined = [...exercises, ...additions];
    const nextExercises =
      exerciseOrderMode === "muscle_blocks"
        ? orderByMuscleBlocks(combined)
        : combined;
    setExercises(nextExercises);
    setSelectedExerciseIds([]);
    const nextMuscle = pickerMuscleOptions.find(
      (muscle) =>
        muscle !== selectedMuscle &&
        !nextExercises.some((exercise) => exercise.muscle === muscle),
    );
    if (mode === "create" && nextMuscle) {
      setSelectedMuscle(nextMuscle);
      setSearch("");
      return;
    }
    setExercisePickerOpen(false);
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
        .map((exerciseId) =>
          availableExercises.find((item) => item.id === exerciseId),
        )
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

      const combined = [...updated, ...additions];
      return exerciseOrderMode === "muscle_blocks"
        ? orderByMuscleBlocks(combined)
        : combined;
    });
    setExtraPickerMuscle(null);
  };

  const extraPickerOptions = useMemo(() => {
    if (!extraPickerMuscle) return [];
    return availableExercises.filter(
      (option) =>
        exerciseMatchesBranch(option, exerciseFilterBranch) &&
        option.muscle === extraPickerMuscle &&
        !exercises.some((item) => item.exerciseId === option.id),
    );
  }, [availableExercises, exerciseFilterBranch, exercises, extraPickerMuscle]);

  const alternativePickerOptions = useMemo(() => {
    if (!alternativePickerExercise) return [];
    const current = exercises.find(
      (exercise) =>
        exercise.exerciseId === alternativePickerExercise.exerciseId,
    );
    const existing = new Set(
      (current?.alternatives || []).map((alt) => alt.exerciseId),
    );
    return availableExercises.filter(
      (option) =>
        exerciseMatchesBranch(option, exerciseFilterBranch) &&
        option.muscle === alternativePickerExercise.muscle &&
        option.id !== alternativePickerExercise.exerciseId &&
        !existing.has(option.id),
    );
  }, [
    alternativePickerExercise,
    availableExercises,
    exerciseFilterBranch,
    exercises,
  ]);

  const updateExercise = (idx, patch) => {
    setExercises((prev) =>
      prev.map((ex, i) => (i === idx ? { ...ex, ...patch } : ex)),
    );
  };

  const removeExercise = (idx) => {
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  };

  const moveExercise = (fromIdx, toIdx) => {
    setExercises((prev) => {
      if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return prev;
      if (fromIdx >= prev.length || toIdx >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, item);
      return next;
    });
  };

  const handleExerciseDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const fromIdx = Number(String(active.id).replace("exercise-", ""));
    const toIdx = Number(String(over.id).replace("exercise-", ""));
    if (Number.isNaN(fromIdx) || Number.isNaN(toIdx)) return;
    moveExercise(fromIdx, toIdx);
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
        const existing = new Set(
          (ex.alternatives || []).map((alt) => alt.exerciseId),
        );
        const additions = selectedAlternativeIds
          .filter(
            (exerciseId) =>
              exerciseId !== ex.exerciseId && !existing.has(exerciseId),
          )
          .map((exerciseId) =>
            availableExercises.find((option) => option.id === exerciseId),
          )
          .filter(Boolean)
          .map((option) =>
            resolveExerciseFromLibrary(availableExercises, option),
          );
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

  const handleSubmit = async () => {
    if (isSaving) return;
    const routineName = effectiveRoutineName.trim();
    if (!routineName) {
      setError("Ponle un nombre a la rutina.");
      return;
    }
    if (!exercises.length) {
      setError("Agrega al menos un ejercicio.");
      return;
    }
    setError("");
    setIsSaving(true);
    try {
      const orderedExercises =
        exerciseOrderMode === "muscle_blocks"
          ? orderByMuscleBlocks(exercises)
          : exercises;
      await onSave({
        ...initialData,
        id: routineId,
        name: routineName,
        description: `${exercises.length} ejercicios.`,
        branch: normalizeBranch(branch),
        exerciseOrderMode,
        progressScopeId: initialData?.progressScopeId || undefined,
        progressMode,
        sourceRoutineId: progressMode === "inherit" ? sourceRoutineId : null,
        exercises: orderedExercises.map((ex) => ({
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
    } catch {
      setError(
        "No se pudo guardar la rutina. Revisa tu conexion e intenta de nuevo.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleContinueSetup = () => {
    const routineName = effectiveRoutineName.trim();
    if (!routineName) {
      setError("Ponle un nombre a la rutina.");
      return;
    }
    if (!effectiveSetupMuscles.size) {
      setError("Selecciona al menos un grupo muscular.");
      return;
    }
    if (
      progressMode === "inherit" &&
      !progressSourceOptions.some(
        (routine) => (routine._id || routine.id) === sourceRoutineId,
      )
    ) {
      setError("Selecciona una rutina compatible para continuar las marcas.");
      return;
    }
    setError("");
    setName(routineName);
    setNameEdited(true);
    const firstMuscle = Array.from(effectiveSetupMuscles)[0];
    if (firstMuscle) setSelectedMuscle(firstMuscle);
    setSetupComplete(true);
    setSelectedExerciseIds([]);
    setExercisePickerOpen(!exercises.length);
  };

  const handleBackToSetup = () => {
    setExercisePickerOpen(false);
    setSelectedExerciseIds([]);
    setSetupComplete(false);
  };

  const draftName =
    effectiveRoutineName.trim() || initialData?.name || "Rutina sin nombre";

  const buildDraftRoutine = () => ({
    ...initialData,
    id: routineId,
    name: draftName,
    description: `${exercises.length} ejercicios.`,
    branch: normalizeBranch(branch),
    exerciseOrderMode,
    progressScopeId: initialData?.progressScopeId || undefined,
    progressMode,
    sourceRoutineId: progressMode === "inherit" ? sourceRoutineId : null,
    exercises: (exerciseOrderMode === "muscle_blocks"
      ? orderByMuscleBlocks(exercises)
      : exercises
    ).map((ex) => ({
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
          sourceRoutineId: initialData?.id || slugify(draftName),
          sourceRoutineName: draftName,
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
  const isSetupStep = mode === "create" && !setupComplete;
  const canReturnToSetupFromPicker =
    mode === "create" &&
    setupComplete &&
    exercisePickerOpen &&
    !exercises.length;
  const hasUnsavedChanges =
    mode === "create"
      ? Boolean(
          setupComplete ||
          exercises.length ||
          nameEdited ||
          selectedSetupMuscles !== null ||
          branch !== normalizeBranch(initialData?.branch) ||
          exerciseOrderMode !== "free" ||
          progressMode !== "fresh" ||
          sourceRoutineId,
        )
      : routineDraftSignature({
          name,
          branch,
          exerciseOrderMode,
          progressMode,
          sourceRoutineId,
          exercises,
        }) !==
        routineDraftSignature({
          name: initialData?.name,
          branch: initialData?.branch,
          exerciseOrderMode: initialData?.exerciseOrderMode,
          progressMode: initialData?.progressMode,
          sourceRoutineId: initialData?.sourceRoutineId,
          exercises: initialData?.exercises,
        });

  const requestClose = () => {
    if (isSaving) return;
    if (hasUnsavedChanges) {
      setCloseConfirmationOpen(true);
      return;
    }
    onClose();
  };

  return (
    <Modal
      title={null}
      subtitle={null}
      onClose={requestClose}
      size={isSetupStep ? "default" : "wide"}
      footer={
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-center text-xs font-semibold text-[color:var(--text-muted)] sm:text-left">
            {error ||
              (isSetupStep
                ? "Después elegirás los ejercicios y su orden."
                : `${exercises.length} ejercicios listos para guardar`)}
          </span>
          <div className="grid grid-cols-1 gap-2 sm:flex">
            <Button
              className="h-12 px-2 text-sm sm:px-4"
              disabled={
                isSaving ||
                libraryLoading ||
                (isSetupStep
                  ? !effectiveSetupMuscles.size || Boolean(libraryError)
                  : !exercises.length)
              }
              onClick={isSetupStep ? handleContinueSetup : handleSubmit}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando
                </>
              ) : isSetupStep ? (
                "Continuar"
              ) : mode === "create" ? (
                "Crear rutina"
              ) : (
                "Guardar"
              )}
            </Button>
          </div>
        </div>
      }
    >
      <div className="pb-3 text-[color:var(--text)]">
        <div className="mb-4 flex items-center gap-2 overflow-x-auto text-xs font-black text-[color:var(--text-muted)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span
            className={`shrink-0 rounded-full px-3 py-1.5 ${
              isSetupStep ? "theme-accent-solid" : "bg-[color:var(--bg)]"
            }`}
          >
            1. Enfoque
          </span>
          <span
            className={`shrink-0 rounded-full px-3 py-1.5 ${
              !isSetupStep ? "theme-accent-solid" : "bg-[color:var(--bg)]"
            }`}
          >
            2. Ejercicios
          </span>
        </div>
        {isSetupStep ? (
          <div className="mx-auto max-w-xl space-y-4">
            <div className="px-1 sm:px-2">
              <div className="mb-5">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                  Nueva rutina
                </p>
                <h2 className="mt-1 text-2xl font-black leading-tight text-[color:var(--text)]">
                  ¿Qué quieres entrenar?
                </h2>
              </div>

              <div className="block space-y-2">
                <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                  Tipo de rutina
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {ROUTINE_TYPES.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => handleRoutineTypeSelect(type.id)}
                      className={`rounded-2xl border p-3 text-left transition ${
                        routineType === type.id
                          ? "theme-accent-soft"
                          : "border-[color:var(--border)] bg-[color:var(--bg)] text-[color:var(--text)]"
                      }`}
                    >
                      <p className="text-sm font-black">{type.label}</p>
                      <p className="mt-1 min-h-[28px] text-[11px] font-semibold leading-tight text-[color:var(--text-muted)]">
                        {type.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {routineType === "custom" ? (
                <div className="mt-5 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                    Grupos musculares
                  </span>
                  {libraryLoading ? (
                    <div className="flex h-16 items-center justify-center gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] text-xs font-bold text-[color:var(--text-muted)]">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando grupos musculares
                    </div>
                  ) : libraryError ? (
                    <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-3">
                      <p className="text-xs font-bold text-red-600 dark:text-red-300">
                        No se pudo cargar la biblioteca de ejercicios.
                      </p>
                      <button
                        type="button"
                        onClick={onRetryLibrary}
                        className="mt-2 text-xs font-black text-red-700 underline dark:text-red-200"
                      >
                        Reintentar
                      </button>
                    </div>
                  ) : setupMuscleOptions.length ? (
                    <div className="flex flex-wrap gap-2">
                      {setupMuscleOptions.map((muscle) => {
                        const active = effectiveSetupMuscles.has(muscle);
                        return (
                          <button
                            key={muscle}
                            type="button"
                            onClick={() => toggleSetupMuscle(muscle)}
                            className={`rounded-full border px-3 py-2 text-xs font-black transition ${
                              active
                                ? "border-emerald-400 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                : "border-[color:var(--border)] bg-[color:var(--bg)] text-[color:var(--text-muted)]"
                            }`}
                          >
                            {muscle}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-[color:var(--border)] bg-[color:var(--bg)] p-3 text-xs font-semibold text-[color:var(--text-muted)]">
                      No hay grupos musculares disponibles en la biblioteca.
                    </div>
                  )}
                </div>
              ) : null}

              <div className="mt-5 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                  Secuencia de entrenamiento
                </span>
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Secuencia de entrenamiento">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={exerciseOrderMode === "muscle_blocks"}
                    onClick={() =>
                      handleExerciseOrderModeChange("muscle_blocks")
                    }
                    className={`min-h-20 border p-3 text-left transition ${
                      exerciseOrderMode === "muscle_blocks"
                        ? "theme-accent-soft"
                        : "border-[color:var(--border)] bg-[color:var(--bg)] text-[color:var(--text)]"
                    }`}
                  >
                    <Layers3 className="h-5 w-5" />
                    <span className="mt-2 block text-sm font-black">
                      Por bloques
                    </span>
                    <span className="mt-1 block text-[11px] font-semibold leading-tight text-[color:var(--text-muted)]">
                      Termina un grupo muscular antes del siguiente.
                    </span>
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={exerciseOrderMode === "free"}
                    onClick={() => handleExerciseOrderModeChange("free")}
                    className={`min-h-20 border p-3 text-left transition ${
                      exerciseOrderMode === "free"
                        ? "theme-accent-soft"
                        : "border-[color:var(--border)] bg-[color:var(--bg)] text-[color:var(--text)]"
                    }`}
                  >
                    <GripVertical className="h-5 w-5" />
                    <span className="mt-2 block text-sm font-black">
                      Orden libre
                    </span>
                    <span className="mt-1 block text-[11px] font-semibold leading-tight text-[color:var(--text-muted)]">
                      Permite intercalar músculos en cualquier secuencia.
                    </span>
                  </button>
                </div>
              </div>

              {locationMode === "multiple" ? (
                <div className="mt-5 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                    Sucursal
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {selectableBranches.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleBranchChange(option)}
                        className={`flex h-12 items-center justify-between rounded-xl border px-3 text-left transition ${
                          branch === option
                            ? "theme-accent-soft"
                            : "border-[color:var(--border)] bg-[color:var(--bg)] text-[color:var(--text)]"
                        }`}
                      >
                        <span className="font-black">
                          {branchLabel(option)}
                        </span>
                        <span
                          className={`h-5 w-5 rounded-full border ${
                            branch === option
                              ? "border-[color:var(--accent)] bg-[color:var(--accent)] shadow-[inset_0_0_0_4px_var(--card)]"
                              : "border-[color:var(--border)]"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {progressSourceOptions.length ? (
                <div className="mt-5 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                    Pesos anteriores
                  </span>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => {
                        setProgressMode("fresh");
                        setError("");
                      }}
                      className={`flex min-h-20 items-start gap-3 rounded-xl border p-3 text-left transition ${
                        progressMode === "fresh"
                          ? "theme-accent-soft"
                          : "border-[color:var(--border)] bg-[color:var(--bg)] text-[color:var(--text)]"
                      }`}
                    >
                      <RotateCcw className="mt-0.5 h-5 w-5 shrink-0" />
                      <span>
                        <span className="block text-sm font-black">
                          Empezar desde cero
                        </span>
                        <span className="mt-1 block text-[11px] font-semibold leading-tight text-[color:var(--text-muted)]">
                          Nuevas marcas y PR para esta rutina.
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProgressMode("inherit");
                        setSourceRoutineId(
                          sourceRoutineId ||
                            progressSourceOptions[0]?._id ||
                            progressSourceOptions[0]?.id ||
                            "",
                        );
                        setError("");
                      }}
                      className={`flex min-h-20 items-start gap-3 rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${
                        progressMode === "inherit"
                          ? "border-emerald-400 bg-emerald-500/10 text-emerald-700 shadow-sm dark:text-emerald-200"
                          : "border-[color:var(--border)] bg-[color:var(--bg)] text-[color:var(--text)]"
                      }`}
                    >
                      <Layers3 className="mt-0.5 h-5 w-5 shrink-0" />
                      <span>
                        <span className="block text-sm font-black">
                          Continuar marcas
                        </span>
                        <span className="mt-1 block text-[11px] font-semibold leading-tight text-[color:var(--text-muted)]">
                          Usa una rutina anterior compatible.
                        </span>
                      </span>
                    </button>
                  </div>

                  {progressMode === "inherit" ? (
                    <label className="block pt-1">
                      <span className="sr-only">Rutina de origen</span>
                      <select
                        value={sourceRoutineId}
                        onChange={(event) =>
                          setSourceRoutineId(event.target.value)
                        }
                        className="h-12 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-sm font-bold text-[color:var(--text)] outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option value="">Selecciona una rutina anterior</option>
                        {progressSourceOptions.map((routine) => (
                          <option
                            key={routine._id || routine.id}
                            value={routine._id || routine.id}
                          >
                            {routine.name}
                            {locationMode === "multiple"
                              ? ` · ${branchLabel(routine.branch)}`
                              : ""}{" "}
                            · {routine.compatibilityPercent}% compatible
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </div>
              ) : null}

              <label className="mt-5 block space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                  Nombre de la rutina
                </span>
                <input
                  className="theme-accent-focus h-13 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] px-4 py-3 text-base font-bold text-[color:var(--text)] outline-none placeholder:text-[color:var(--text-muted)]"
                  placeholder="Ej. Pecho · Biceps"
                  value={effectiveRoutineName}
                  onChange={(e) => {
                    setNameEdited(true);
                    setName(e.target.value);
                  }}
                />
              </label>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl">
            <div className="space-y-3">
              {mode === "create" ? (
                <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-3 shadow-sm sm:p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                        Rutina
                      </p>
                      <h2 className="mt-1 truncate text-lg font-black text-[color:var(--text)]">
                        {name.trim()}
                      </h2>
                      <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
                        {branchLabel(branch)} Â·{" "}
                        {exerciseOrderMode === "muscle_blocks"
                          ? "Por bloques"
                          : "Orden libre"}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 rounded-xl"
                      onClick={() => setSetupComplete(false)}
                    >
                      Editar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-3 shadow-sm sm:p-4">
                  <div
                    className={`grid gap-3 ${
                      locationMode === "multiple"
                        ? "sm:grid-cols-[minmax(0,1fr)_260px]"
                        : ""
                    }`}
                  >
                    <label className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                        Nombre
                      </span>
                      <input
                        className="theme-accent-focus h-12 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-base font-bold text-[color:var(--text)] outline-none placeholder:text-[color:var(--text-muted)]"
                        placeholder="Ej. Pecho - Biceps"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </label>
                    {locationMode === "multiple" ? (
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                          Sede
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          {selectableBranches.map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => handleBranchChange(option)}
                              className={`h-12 rounded-xl border px-2 text-xs font-black transition ${
                                branch === option
                                  ? "theme-accent-soft"
                                  : "border-[color:var(--border)] bg-[color:var(--bg)] text-[color:var(--text-muted)]"
                              }`}
                            >
                              {branchLabel(option)}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  {error && (
                    <p className="mt-3 text-xs font-semibold text-red-500">
                      {error}
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between gap-2 px-1 pt-1">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                    {exerciseOrderMode === "muscle_blocks"
                      ? "Bloques musculares"
                      : "Orden de ejercicios"}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-[color:var(--text-muted)]">
                    {exerciseOrderMode === "muscle_blocks"
                      ? "Los ejercicios del mismo grupo se mantienen juntos."
                      : "Arrastra para definir una secuencia intercalada."}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl px-2 sm:px-3"
                    onClick={handleOpenLibrary}
                    aria-label="Abrir biblioteca de ejercicios"
                    title="Abrir biblioteca de ejercicios"
                  >
                    <Dumbbell className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Biblioteca</span>
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-xl"
                    onClick={openExercisePicker}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Agregar
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 border border-[color:var(--border)] bg-[color:var(--bg)] p-1" role="radiogroup" aria-label="Cambiar secuencia de entrenamiento">
                <button
                  type="button"
                  role="radio"
                  aria-checked={exerciseOrderMode === "muscle_blocks"}
                  onClick={() =>
                    handleExerciseOrderModeChange("muscle_blocks")
                  }
                  className={`h-10 text-[10px] font-black uppercase ${
                    exerciseOrderMode === "muscle_blocks"
                      ? "theme-accent-solid"
                      : "text-[color:var(--text-muted)]"
                  }`}
                >
                  Por bloques
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={exerciseOrderMode === "free"}
                  onClick={() => handleExerciseOrderModeChange("free")}
                  className={`h-10 text-[10px] font-black uppercase ${
                    exerciseOrderMode === "free"
                      ? "theme-accent-solid"
                      : "text-[color:var(--text-muted)]"
                  }`}
                >
                  Orden libre
                </button>
              </div>

              <div className="space-y-2">
                {groupedSelected.map(([muscle, list]) => {
                  const extraOptions = availableExercises.filter(
                    (option) =>
                      exerciseMatchesBranch(option, exerciseFilterBranch) &&
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
                              {muscle === GLOBAL_ORDER_GROUP
                                ? "Orden global"
                                : muscle}
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
                              {list.reduce(
                                (sum, item) => sum + (Number(item.sets) || 0),
                                0,
                              )}{" "}
                              series
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
                                const alternativeOptions =
                                  availableExercises.filter(
                                    (option) =>
                                      exerciseMatchesBranch(
                                        option,
                                        exerciseFilterBranch,
                                      ) &&
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
                                          isDragging
                                            ? "shadow-xl ring-2 ring-blue-500/30"
                                            : ""
                                        }`}
                                      >
                                        <div className="grid grid-cols-[40px_minmax(0,1fr)_44px_84px] items-center gap-1.5 sm:grid-cols-[48px_minmax(0,1fr)_60px_auto] sm:gap-3">
                                          <div className="h-10 w-10 overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] sm:h-12 sm:w-12 sm:rounded-xl">
                                            {thumb ? (
                                              <img
                                                src={thumb}
                                                alt={ex.name}
                                                className="h-full w-full object-cover"
                                                loading="lazy"
                                              />
                                            ) : (
                                              <div className="grid h-full w-full place-items-center text-[10px] text-[color:var(--text-muted)]">
                                                {(ex.name || "?")
                                                  .charAt(0)
                                                  .toUpperCase()}
                                              </div>
                                            )}
                                          </div>

                                          <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                              <span className="shrink-0 rounded-md border border-[color:var(--border)] bg-[color:var(--bg)] px-1.5 py-0.5 text-[9px] font-black text-[color:var(--text-muted)] sm:rounded-lg sm:px-2 sm:py-1 sm:text-[10px]">
                                                {ex.idx + 1}
                                              </span>
                                              <p className="min-w-0 line-clamp-2 text-xs font-black leading-tight sm:text-sm">
                                                {ex.name}
                                              </p>
                                              {ex.isExtra && (
                                                <span className="shrink-0 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-black uppercase text-emerald-700 dark:text-emerald-300">
                                                  Extra
                                                </span>
                                              )}
                                            </div>
                                            {(ex.alternatives || []).length >
                                              0 && (
                                              <p className="hidden truncate text-[10px] text-[color:var(--text-muted)] sm:block">
                                                {(ex.alternatives || [])
                                                  .map((alt) => alt.name)
                                                  .join(", ")}
                                              </p>
                                            )}
                                            <p className="mt-1 truncate text-[10px] font-semibold text-[color:var(--text-muted)]">
                                              {ex.muscle || "Sin grupo"}
                                            </p>
                                          </div>

                                          <label className="space-y-0.5">
                                            <span className="block text-center text-[8px] font-black uppercase text-[color:var(--text-muted)] sm:text-[9px]">
                                              Series
                                            </span>
                                            <input
                                              type="text"
                                              inputMode="numeric"
                                              pattern="[0-9]*"
                                              enterKeyHint="done"
                                              aria-label={`Series de ${ex.name}`}
                                              className="theme-accent-focus h-11 w-11 rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-1 text-center text-sm font-black tabular-nums text-[color:var(--text)] outline-none sm:h-10 sm:w-14 sm:rounded-xl"
                                              value={ex.sets}
                                              onChange={(event) =>
                                                updateExercise(ex.idx, {
                                                  sets: normalizeRoutineSetInput(
                                                    event.target.value,
                                                  ),
                                                })
                                              }
                                              onBlur={(event) =>
                                                updateExercise(ex.idx, {
                                                  sets: clampRoutineSetCount(
                                                    event.target.value,
                                                  ),
                                                })
                                              }
                                            />
                                          </label>

                                          <div className="grid grid-cols-2 gap-1 sm:flex sm:items-center sm:justify-end sm:gap-1">
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="theme-accent-text h-11 w-10 rounded-lg p-0 sm:h-10 sm:w-10 sm:rounded-xl"
                                              onClick={() =>
                                                setOptionsExerciseId(
                                                  ex.exerciseId,
                                                )
                                              }
                                              aria-label={`Opciones de ${ex.name}`}
                                            >
                                              <Settings2 className="h-3.5 w-3.5" />
                                            </Button>
                                            <button
                                              type="button"
                                              className="grid h-11 w-10 touch-none place-items-center rounded-lg p-0 text-[color:var(--text-muted)] hover:bg-[color:var(--bg)] sm:h-10 sm:w-10 sm:rounded-xl"
                                              aria-label={`Ordenar ${ex.name}`}
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
                                                {isUnilateralMovement(ex)
                                                  ? "Unilateral"
                                                  : "Normal"}
                                                {(ex.alternatives || []).length
                                                  ? ` · ${(ex.alternatives || []).length} alt.`
                                                  : ""}
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
                                                    Activar si se trabaja un
                                                    lado a la vez.
                                                  </p>
                                                </div>
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    updateExercise(
                                                      ex.idx,
                                                      applyUnilateralMode(
                                                        !isUnilateralMovement(
                                                          ex,
                                                        ),
                                                      ),
                                                    )
                                                  }
                                                  className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                                                    isUnilateralMovement(ex)
                                                      ? "bg-blue-600"
                                                      : "bg-slate-300 dark:bg-slate-700"
                                                  }`}
                                                  aria-pressed={isUnilateralMovement(
                                                    ex,
                                                  )}
                                                >
                                                  <span
                                                    className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                                                      isUnilateralMovement(ex)
                                                        ? "left-6"
                                                        : "left-1"
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
                                                disabled={
                                                  !alternativeOptions.length
                                                }
                                                onClick={() =>
                                                  openAlternativePicker(ex)
                                                }
                                                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-blue-400/40 bg-blue-500/5 px-3 text-xs font-black text-blue-700 transition hover:bg-blue-500/10 disabled:cursor-not-allowed disabled:border-[color:var(--border)] disabled:text-[color:var(--text-muted)] disabled:opacity-60 dark:text-blue-200"
                                              >
                                                <Plus className="h-3.5 w-3.5" />
                                                {alternativeOptions.length
                                                  ? "Agregar alternativas"
                                                  : "Sin alternativas disponibles"}
                                              </button>
                                            </div>
                                          </div>

                                          {(ex.alternatives || []).length >
                                            0 && (
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
                                                        applyUnilateralMode(
                                                          !isUnilateralMovement(
                                                            alt,
                                                          ),
                                                        ),
                                                      )
                                                    }
                                                    className={`h-8 rounded-lg border px-1.5 text-[9px] font-black transition ${
                                                      isUnilateralMovement(alt)
                                                        ? "border-blue-400 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                                                        : "border-[color:var(--border)] text-[color:var(--text-muted)]"
                                                    }`}
                                                  >
                                                    {isUnilateralMovement(alt)
                                                      ? "Unilateral"
                                                      : "Normal"}
                                                  </button>
                                                  <button
                                                    type="button"
                                                    className="grid h-8 w-8 place-items-center rounded-lg text-xs text-red-500 hover:bg-red-500/10"
                                                    onClick={() =>
                                                      removeAlternative(
                                                        ex.idx,
                                                        alt.exerciseId,
                                                      )
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
                          {muscle !== GLOBAL_ORDER_GROUP ? (
                            <button
                              type="button"
                              onClick={() => openExtraPicker(muscle)}
                              disabled={!extraOptions.length}
                              className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-400/40 bg-blue-500/5 px-4 py-3 text-sm font-black text-blue-700 transition hover:bg-blue-500/10 disabled:cursor-not-allowed disabled:border-[color:var(--border)] disabled:text-[color:var(--text-muted)] disabled:opacity-60 dark:text-blue-200"
                            >
                              <Plus className="h-4 w-4" />
                              {extraOptions.length
                                ? "Agregar extras"
                                : "Sin extras disponibles"}
                            </button>
                          ) : null}
                          <div className="hidden rounded-2xl border border-dashed border-blue-400/40 bg-blue-500/5 p-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700 dark:text-blue-200">
                              Agregar ejercicio extra
                            </p>
                            <p className="mt-1 text-[11px] font-semibold text-[color:var(--text-muted)]">
                              Todo ejercicio agregado aqui se guardara como
                              extra.
                            </p>
                            {extraOptions.length ? (
                              <>
                                <div className="mt-3 grid max-h-44 gap-2 overflow-y-auto pr-1">
                                  {extraOptions.map((option) => {
                                    const selected = selectedExtraIds.includes(
                                      option.id,
                                    );
                                    const thumb = getExerciseImageUrl(option, {
                                      width: 80,
                                      height: 80,
                                    });
                                    return (
                                      <button
                                        key={option.id}
                                        type="button"
                                        onClick={() =>
                                          toggleExtraSelection(
                                            muscle,
                                            option.id,
                                          )
                                        }
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
                                              {(option.name || "?")
                                                .charAt(0)
                                                .toUpperCase()}
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
                                          <Check
                                            className="h-3.5 w-3.5"
                                            aria-hidden="true"
                                          />
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
                                  {selectedExtraIds.length
                                    ? ` (${selectedExtraIds.length})`
                                    : ""}
                                </Button>
                              </>
                            ) : (
                              <div className="mt-3 rounded-xl border border-dashed border-[color:var(--border)] bg-[color:var(--card)] p-3 text-xs font-semibold text-[color:var(--text-muted)]">
                                No hay ejercicios disponibles para agregar como
                                extra en este grupo.
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {!exercises.length && (
                  <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-[color:var(--card)] p-6 text-center">
                    <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-300">
                      <Plus className="h-5 w-5" />
                    </div>
                    <p className="mt-3 text-sm font-black text-[color:var(--text)]">
                      Elige los ejercicios
                    </p>
                    <Button
                      className="mt-4 h-11 rounded-xl"
                      onClick={openExercisePicker}
                    >
                      Abrir selector
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
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
                        onClick={() =>
                          toggleExtraSelection(extraPickerMuscle, option.id)
                        }
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
                          <Check className="h-4 w-4" aria-hidden="true" />
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
                  {pickerSelectedExtraIds.length
                    ? ` (${pickerSelectedExtraIds.length})`
                    : ""}
                </Button>
              </div>
            </div>
          </div>
        )}
        {exercisePickerOpen && (
          <div className="fixed inset-0 z-[80] flex items-end bg-black/50 px-0 sm:items-center sm:justify-center sm:p-4">
            <div className="max-h-[88vh] w-full overflow-hidden rounded-t-3xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-2xl sm:max-w-lg sm:rounded-3xl">
              <div className="flex items-start justify-between gap-3 border-b border-[color:var(--border)] px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700 dark:text-blue-200">
                    Paso 2
                  </p>
                  <h3 className="truncate text-lg font-black text-[color:var(--text)]">
                    Elige ejercicios
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
                    Marca los ejercicios que formarán parte de la rutina.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (canReturnToSetupFromPicker) {
                      handleBackToSetup();
                    } else {
                      setExercisePickerOpen(false);
                      setSelectedExerciseIds([]);
                    }
                  }}
                  className="h-9 rounded-xl border border-[color:var(--border)] px-3 text-xs font-black text-[color:var(--text)]"
                >
                  {canReturnToSetupFromPicker ? "Volver" : "Cerrar"}
                </button>
              </div>

              <div className="border-b border-[color:var(--border)] p-4">
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {pickerMuscleOptions.map((muscle) => {
                    const selectedCount = exercises.filter(
                      (exercise) => exercise.muscle === muscle,
                    ).length;
                    return (
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
                        {selectedCount ? ` ${selectedCount}` : ""}
                      </button>
                    );
                  })}
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar ejercicio"
                    className="h-11 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] pl-9 pr-3 text-sm font-semibold text-[color:var(--text)] outline-none placeholder:text-[color:var(--text-muted)] focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="max-h-[46vh] overflow-y-auto p-4">
                {exercisePickerOptions.length ? (
                  <>
                    {frequentExerciseOptions.length ? (
                      <section className="mb-4">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-black text-[color:var(--text)]">
                              Tu base más utilizada
                            </p>
                            <p className="text-[11px] font-semibold text-[color:var(--text-muted)]">
                              Según tus entrenamientos en esta sede
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={toggleFrequentSelection}
                            className="h-8 shrink-0 rounded-xl border border-blue-500/30 bg-blue-500/10 px-2.5 text-[11px] font-black text-blue-700 dark:text-blue-200"
                          >
                            {allFrequentSelected
                              ? "Quitar base"
                              : "Elegir base"}
                          </button>
                        </div>
                        <div className="grid gap-2">
                          {frequentExerciseOptions.map((option) => (
                            <ExercisePickerOption
                              key={option.id}
                              option={option}
                              selected={selectedExerciseIds.includes(option.id)}
                              branch={exerciseFilterBranch}
                              onToggle={toggleExerciseSelection}
                              showUsage
                            />
                          ))}
                        </div>
                      </section>
                    ) : null}
                    {frequentExerciseOptions.length ? (
                      <p className="mb-2 text-xs font-black text-[color:var(--text-muted)]">
                        Todos los ejercicios
                      </p>
                    ) : null}
                    <div className="grid gap-2">
                      {regularExerciseOptions.map((option) => {
                        const selected = selectedExerciseIds.includes(
                          option.id,
                        );
                        const thumb = getExerciseImageUrl(option, {
                          width: 96,
                          height: 96,
                        });
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => toggleExerciseSelection(option.id)}
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
                                {option.muscle}
                              </p>
                            </div>
                            <span
                              className={`grid h-7 w-7 place-items-center rounded-full border text-xs font-black ${
                                selected
                                  ? "border-blue-600 bg-blue-600 text-white"
                                  : "border-[color:var(--border)] text-transparent"
                              }`}
                            >
                              <Check className="h-4 w-4" aria-hidden="true" />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-4 text-sm font-semibold text-[color:var(--text-muted)]">
                    No hay ejercicios disponibles con este filtro.
                  </div>
                )}
              </div>

              <div className="grid gap-2 border-t border-[color:var(--border)] p-4">
                {exercisePickerOptions.length === 80 && !search.trim() ? (
                  <p className="text-center text-[11px] font-semibold text-[color:var(--text-muted)]">
                    Mostrando los primeros 80. Usa la búsqueda para encontrar
                    uno específico.
                  </p>
                ) : null}
                <Button
                  className="h-12 w-full rounded-lg text-sm"
                  disabled={!selectedExerciseIds.length}
                  onClick={addSelectedExercises}
                >
                  {nextPendingMuscle
                    ? "Agregar y seguir"
                    : "Agregar ejercicios"}
                  {selectedExerciseIds.length
                    ? ` (${selectedExerciseIds.length})`
                    : ""}
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
                    Selecciona ejercicios del mismo grupo para usarlos como
                    reemplazo.
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
                          <Check className="h-4 w-4" aria-hidden="true" />
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
                  {selectedAlternativeIds.length
                    ? ` (${selectedAlternativeIds.length})`
                    : ""}
                </Button>
              </div>
            </div>
          </div>
        )}
        {optionsExerciseId &&
          (() => {
            const current = exercises.find(
              (exercise) => exercise.exerciseId === optionsExerciseId,
            );
            if (!current) return null;
            const currentIndex = exercises.findIndex(
              (exercise) => exercise.exerciseId === optionsExerciseId,
            );
            const alternativeOptions = availableExercises.filter(
              (option) =>
                exerciseMatchesBranch(option, exerciseFilterBranch) &&
                option.muscle === current.muscle &&
                option.id !== current.exerciseId &&
                !(current.alternatives || []).some(
                  (alt) => alt.exerciseId === option.id,
                ),
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
                          isUnilateralMovement(current)
                            ? "bg-blue-600"
                            : "bg-slate-300 dark:bg-slate-700"
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

                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                          Ejercicio extra
                        </p>
                        <p className="mt-0.5 text-[11px] font-semibold text-[color:var(--text-muted)]">
                          Queda disponible como opcion, fuera del plan
                          principal.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          updateExercise(currentIndex, {
                            isExtra: !current.isExtra,
                          })
                        }
                        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                          current.isExtra
                            ? "bg-emerald-600"
                            : "bg-slate-300 dark:bg-slate-700"
                        }`}
                        aria-label="Marcar como ejercicio extra"
                        aria-pressed={Boolean(current.isExtra)}
                      >
                        <span
                          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                            current.isExtra ? "left-6" : "left-1"
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
                      {alternativeOptions.length
                        ? "Agregar alternativas"
                        : "Sin alternativas disponibles"}
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
                                  applyUnilateralMode(
                                    !isUnilateralMovement(alt),
                                  ),
                                )
                              }
                              className={`h-8 rounded-lg border px-1.5 text-[9px] font-black transition ${
                                isUnilateralMovement(alt)
                                  ? "border-blue-400 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                                  : "border-[color:var(--border)] text-[color:var(--text-muted)]"
                              }`}
                            >
                              {isUnilateralMovement(alt)
                                ? "Unilateral"
                                : "Normal"}
                            </button>
                            <button
                              type="button"
                              className="grid h-8 w-8 place-items-center rounded-lg text-xs text-red-500 hover:bg-red-500/10"
                              onClick={() =>
                                removeAlternative(currentIndex, alt.exerciseId)
                              }
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
        {closeConfirmationOpen ? (
          <div className="fixed inset-0 z-[100] flex items-end bg-black/55 p-0 sm:items-center sm:justify-center sm:p-4">
            <div className="w-full rounded-t-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-2xl sm:max-w-sm sm:rounded-2xl">
              <h3 className="text-lg font-black text-[color:var(--text)]">
                Descartar cambios
              </h3>
              <p className="mt-2 text-sm font-semibold text-[color:var(--text-muted)]">
                Los cambios de esta rutina todavia no se guardaron.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCloseConfirmationOpen(false)}
                >
                  Seguir editando
                </Button>
                <button
                  type="button"
                  onClick={onClose}
                  className="h-11 rounded-lg bg-red-600 px-3 text-sm font-black text-white"
                >
                  Descartar
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

function PlanRoutineChoiceModal({
  day,
  routines,
  onCreate,
  onAssign,
  onClose,
}) {
  const [query, setQuery] = useState("");
  const [assigningId, setAssigningId] = useState(null);
  const currentRoutineId = String(day?.routineId || "");
  const options = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return routines
      .filter((routine) => routine.isArchived !== true)
      .filter((routine) =>
        normalized
          ? String(routine.name || "")
              .toLowerCase()
              .includes(normalized)
          : true,
      )
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [query, routines]);

  const assign = async (routineId) => {
    setAssigningId(routineId);
    try {
      await onAssign(routineId);
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <Modal
      title={
        day?.routineId
          ? "Cambiar rutina"
          : day?.focus || "Configurar entrenamiento"
      }
      subtitle={
        day?.routineId
          ? `Selecciona el reemplazo para ${day.focus || "este bloque"}`
          : "Selecciona una rutina para este bloque"
      }
      onClose={onClose}
    >
      <div className="space-y-4 pb-2">
        <Button className="h-12 w-full gap-2" onClick={onCreate}>
          <Plus className="h-4 w-4" />
          Crear una rutina nueva
        </Button>

        {routines.length ? (
          <>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar rutina guardada"
                autoFocus
                className="theme-accent-focus h-11 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] pl-10 pr-3 text-sm font-semibold outline-none"
              />
            </div>
            <div className="divide-y divide-[color:var(--border)] border-y border-[color:var(--border)]">
              {options.length ? (
                options.map((routine) => {
                  const routineId = String(routine.id || routine._id);
                  const isCurrent = routineId === currentRoutineId;
                  const muscles = [
                    ...new Set(
                      (routine.exercises || [])
                        .map((exercise) => exercise.muscle)
                        .filter(Boolean),
                    ),
                  ].slice(0, 2);
                  return (
                    <button
                      key={routineId}
                      type="button"
                      onClick={() => assign(routineId)}
                      disabled={Boolean(assigningId) || isCurrent}
                      className="flex min-h-14 w-full items-center justify-between gap-3 py-3 text-left disabled:opacity-60"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black text-[color:var(--text)]">
                          {routine.name}
                        </span>
                        <span className="mt-0.5 block text-xs font-semibold text-[color:var(--text-muted)]">
                          {getRoutineExerciseSummary(routine)} ·{" "}
                          {branchLabel(routine.branch)}
                          {muscles.length ? ` · ${muscles.join(" + ")}` : ""}
                        </span>
                      </span>
                      <span className="theme-accent-text shrink-0 text-xs font-black">
                        {isCurrent
                          ? "Actual"
                          : assigningId === routineId
                            ? "Vinculando..."
                            : "Usar"}
                      </span>
                    </button>
                  );
                })
              ) : (
                <p className="py-8 text-center text-sm font-semibold text-[color:var(--text-muted)]">
                  No hay coincidencias
                </p>
              )}
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  );
}

function RoutineToolbar({
  showSearch,
  searchTerm,
  setSearchTerm,
  showOriginFilter,
  routineOrigin,
  setRoutineOrigin,
  originCounts,
  templateGroup,
  setTemplateGroup,
  templateGroups,
  showBranchFilter,
  activeBranch,
  setActiveBranch,
  branchCounts,
}) {
  if (!showSearch && !showOriginFilter && !showBranchFilter) return null;
  const branches = [
    { id: "all", label: "Todas", count: branchCounts.all },
    { id: "sopocachi", label: "Sopocachi", count: branchCounts.sopocachi },
    { id: "miraflores", label: "Miraflores", count: branchCounts.miraflores },
  ];
  const origins = [
    { id: "all", label: "Todas", count: originCounts.all },
    { id: "private", label: "Mis rutinas", count: originCounts.private },
    { id: "system", label: "Base", count: originCounts.system },
  ];
  return (
    <section className="mt-5 space-y-3">
      <div>
        {showSearch ? (
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[color:var(--text)]" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              type="search"
              inputMode="search"
              placeholder="Buscar rutina..."
              className="theme-accent-focus h-12 w-full rounded-none border border-[#ffb9a3] bg-[color:var(--card)] pl-12 pr-4 text-base font-semibold text-[color:var(--text)] outline-none placeholder:text-[color:var(--text-muted)] dark:border-[#3a3a3a] dark:focus:border-[#e2ff00]"
            />
          </div>
        ) : null}
      </div>
      {showOriginFilter ? (
        <div
          className="grid grid-cols-3 border border-[color:var(--border)] bg-[color:var(--bg)] p-1"
          aria-label="Filtrar por origen"
        >
          {origins.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setRoutineOrigin(item.id);
                if (item.id !== "system") setTemplateGroup("all");
              }}
              aria-pressed={routineOrigin === item.id}
              className={`h-9 min-w-0 px-2 text-[11px] font-black uppercase transition ${
                routineOrigin === item.id
                  ? "bg-[#ff5722] text-white dark:bg-[#e2ff00] dark:text-black"
                  : "text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
              }`}
            >
              <span className="truncate">{item.label}</span>{" "}
              <span className="opacity-70">{item.count}</span>
            </button>
          ))}
        </div>
      ) : null}
      {routineOrigin !== "private" && templateGroups.length > 1 ? (
        <div className="space-y-1.5">
          <p className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">
            Colecciones base
          </p>
          <div
            className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Colecciones de rutinas base"
          >
            {templateGroups.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTemplateGroup(item.id);
                  if (item.id !== "all") setRoutineOrigin("system");
                }}
                aria-pressed={templateGroup === item.id}
                className={`h-9 shrink-0 snap-start border px-3 text-[11px] font-black uppercase transition ${
                  templateGroup === item.id
                    ? "border-[#ff5722] bg-[#fff0eb] text-[#a52d0b] dark:border-[#e2ff00] dark:bg-[#e2ff00]/10 dark:text-[#e2ff00]"
                    : "border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--text-muted)]"
                }`}
              >
                {item.label} <span className="opacity-65">{item.count}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {showBranchFilter ? (
        <div className="grid grid-cols-3 gap-2" aria-label="Filtrar por sede">
          {branches.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveBranch(item.id)}
              aria-pressed={activeBranch === item.id}
              className={`h-8 min-w-0 border px-2 text-xs font-black uppercase transition ${
                activeBranch === item.id
                  ? "border-[#ff5722] bg-[#ff5722] text-white dark:border-[#e2ff00] dark:bg-[#e2ff00] dark:text-black"
                  : "border-[#1a1a1a] bg-[#1a1a1a] text-white dark:border-[#353535] dark:bg-[#202020] dark:text-[#f5f5e8]"
              }`}
            >
              <span className="truncate">{item.label}</span>{" "}
              <span className="opacity-75">({item.count})</span>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function RoutinePreviewImage({ item }) {
  const [failed, setFailed] = useState(false);

  if (!item.url || failed) {
    return (
      <div
        className="grid h-full w-full place-items-center bg-[color:var(--bg)] text-sm font-black text-[color:var(--text-muted)]"
        aria-label={item.name}
      >
        {item.name.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={item.url}
      alt={item.name}
      className="h-full w-full object-cover"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function TrainingPlanSchedule({
  plan,
  routines,
  trainings,
  selectedWeek,
  isManagedClient,
  onChooseRoutine,
  onOpenRoutine,
  onDuplicateRoutine,
  onDeleteRoutine,
  duplicatingRoutineId,
  onStartRoutine,
  onAdvanceCycle,
  advancingCycle,
}) {
  const sequential = plan.scheduleMode !== "fixed";
  const schedule = plan.weeklySchedule || [];
  const todayIso = new Date().toLocaleDateString("en-CA");
  const currentCycleIndex = Math.min(
    schedule.length - 1,
    Math.max(0, Number(plan.cycleProgress?.currentIndex || 0)),
  );
  const weekStart = getPlanDayDate(plan, selectedWeek, 0);
  const weekEnd = getPlanDayDate(plan, selectedWeek, 6);
  const routineById = new Map(
    routines.map((routine) => [String(routine.id || routine._id), routine]),
  );
  const weekTrainings = (trainings || []).filter((training) => {
    if (sequential) return false;
    const date = String(training.date || "").slice(0, 10);
    return date >= toPlanIsoDate(weekStart) && date <= toPlanIsoDate(weekEnd);
  });
  const completedTrainingDays = schedule.filter((day, index) => {
    if (day.type !== "training" || !day.routineId || sequential) return false;
    const date = toPlanIsoDate(getPlanDayDate(plan, selectedWeek, index));
    return weekTrainings.some(
      (training) =>
        String(training.date).slice(0, 10) === date &&
        ((training.trainingPlanId &&
          String(training.trainingPlanId) === String(plan._id || plan.id) &&
          training.trainingPlanSlotId === day.slotId) ||
          String(training.routineId) === String(day.routineId)),
    );
  }).length;
  const totalTrainingDays = schedule.filter(
    (day) => day.type === "training",
  ).length;

  return (
    <div className="mt-5">
      {!sequential ? (
        <>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase text-[color:var(--text-muted)]">
                Cumplimiento semanal
              </p>
              <p className="mt-1 text-xs font-bold">
                {formatPlanDayDate(weekStart)} - {formatPlanDayDate(weekEnd)}
              </p>
            </div>
            <strong className="theme-accent-text text-xs uppercase">
              {completedTrainingDays} de {totalTrainingDays} completados
            </strong>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden bg-[color:var(--border)]">
            <div
              className="theme-accent-solid h-full border-0 transition-all"
              style={{
                width: `${totalTrainingDays ? (completedTrainingDays / totalTrainingDays) * 100 : 0}%`,
              }}
            />
          </div>
        </>
      ) : (
        <div className="border-b border-[color:var(--border)] pb-4">
          <p className="text-[11px] font-black uppercase text-[color:var(--text-muted)]">
            Ciclo secuencial libre
          </p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <h3 className="text-xl font-black">Sigue el orden del patrón</h3>
            <span className="theme-accent-soft rounded px-2.5 py-1 text-xs font-black">
              Día {currentCycleIndex + 1} de {schedule.length}
            </span>
          </div>
          <p className="mt-2 text-xs font-semibold text-[color:var(--text-muted)]">
            El ciclo avanza al guardar una sesión o confirmar un descanso.
          </p>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {schedule.map((day, index) => {
          const date = sequential
            ? null
            : getPlanDayDate(plan, selectedWeek, index);
          const dateIso = date ? toPlanIsoDate(date) : "";
          const isToday = dateIso === todayIso;
          const isCurrent = sequential ? index === currentCycleIndex : isToday;
          const routine = day.routineId
            ? routineById.get(String(day.routineId))
            : null;
          const training = !sequential
            ? weekTrainings.find(
                (item) =>
                  String(item.date).slice(0, 10) === dateIso &&
                  ((item.trainingPlanId &&
                    String(item.trainingPlanId) ===
                      String(plan._id || plan.id) &&
                    item.trainingPlanSlotId === day.slotId) ||
                    String(item.routineId) === String(day.routineId)),
              )
            : null;
          const isRest = day.type !== "training";
          const dayTitle = isRest
            ? day.type === "rest"
              ? "Descanso completo"
              : "Recuperación activa"
            : day.focus || routine?.name || "Entrenamiento";
          const routineSubtitle =
            !isRest &&
            routine?.name?.trim().toLowerCase() !==
              dayTitle.trim().toLowerCase()
              ? routine?.name
              : "";
          return (
            <article
              key={day.slotId || day.dayIndex}
              onClick={(event) => {
                if (
                  isRest ||
                  !routine ||
                  event.target.closest(
                    "button, a, input, select, textarea, summary, details",
                  )
                ) {
                  return;
                }
                onOpenRoutine(routine);
              }}
              className={`routines-surface border bg-[color:var(--card)] p-4 ${
                isCurrent
                  ? "border-[#ff5722] dark:border-[#e2ff00]"
                  : "border-[color:var(--border)]"
              } ${!isRest && routine ? "cursor-pointer transition hover:border-[#ff8a66] dark:hover:border-[#e2ff00]" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4
                    className={`text-lg font-black uppercase ${isCurrent ? "theme-accent-text" : ""}`}
                  >
                    {sequential ? `Día ${index + 1}` : PLAN_DAY_NAMES[index]}
                  </h4>
                  <p className="mt-0.5 text-[11px] font-bold text-[color:var(--text-muted)]">
                    {date ? formatPlanDayDate(date) : `Bloque ${index + 1}`}
                  </p>
                </div>
                {training ? (
                  <Check className="theme-accent-text h-5 w-5" />
                ) : isCurrent ? (
                  <span className="theme-accent-solid rounded px-2 py-1 text-[10px] font-black uppercase">
                    Actual
                  </span>
                ) : null}
              </div>

              <div className="mt-4">
                {!isRest && routine ? (
                  <button
                    type="button"
                    onClick={() => onOpenRoutine(routine)}
                    className="text-left text-[13px] font-black uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5722]/35 dark:focus-visible:ring-[#e2ff00]/40"
                    aria-label={`Ver ejercicios de ${routine.name}`}
                  >
                    {dayTitle}
                  </button>
                ) : (
                  <p className="text-[13px] font-black uppercase">{dayTitle}</p>
                )}
                {isRest || routineSubtitle || !routine ? (
                  <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
                    {isRest
                      ? day.type === "rest"
                        ? "Recupera antes del siguiente bloque"
                        : "Movilidad y actividad ligera"
                      : routineSubtitle || "Rutina pendiente de configurar"}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {isRest ? (
                    <span className="border border-[color:var(--border)] px-2 py-1 text-[10px] font-black uppercase">
                      Recuperación
                    </span>
                  ) : null}
                  {!isRest && routine ? (
                    <span className="border border-[color:var(--border)] px-2 py-1 text-[10px] font-black uppercase">
                      {getRoutineExerciseSummary(routine)}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-[color:var(--border)] pt-3">
                {!isRest && routine && !isManagedClient ? (
                  <div className="flex min-w-0 flex-wrap items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onChooseRoutine(day)}
                      className="inline-flex h-11 items-center gap-2 text-xs font-black uppercase text-[color:var(--text)]"
                    >
                      <RotateCcw className="h-4 w-4" /> Cambiar rutina
                    </button>
                    <details className="relative">
                      <summary
                        className="grid h-11 w-11 cursor-pointer list-none place-items-center text-[color:var(--text-muted)] [&::-webkit-details-marker]:hidden"
                        aria-label={`Opciones de ${routine.name}`}
                      >
                        <MoreVertical className="h-5 w-5" />
                      </summary>
                      <div className="absolute bottom-11 right-0 z-30 w-44 overflow-hidden border border-[color:var(--border)] bg-[color:var(--card)] p-1 shadow-xl">
                        <button
                          type="button"
                          disabled={Boolean(duplicatingRoutineId)}
                          onClick={(event) => {
                            event.currentTarget
                              .closest("details")
                              ?.removeAttribute("open");
                            onDuplicateRoutine(routine);
                          }}
                          className="flex h-10 w-full items-center gap-2 px-3 text-left text-sm font-bold hover:bg-[color:var(--bg)] disabled:opacity-50"
                        >
                          <Copy className="h-4 w-4" />
                          {String(duplicatingRoutineId) ===
                          String(routine.id || routine._id)
                            ? "Duplicando..."
                            : "Duplicar"}
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.currentTarget
                              .closest("details")
                              ?.removeAttribute("open");
                            onDeleteRoutine(routine);
                          }}
                          className="flex h-10 w-full items-center gap-2 px-3 text-left text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" /> Eliminar
                        </button>
                      </div>
                    </details>
                  </div>
                ) : (
                  <span />
                )}
                {training ? (
                  <span className="text-xs font-black text-[color:var(--text-muted)]">
                    {Math.round(
                      Number(training.totalVolume || 0),
                    ).toLocaleString("es-BO")}{" "}
                    kg
                  </span>
                ) : null}
              </div>

              {day.type === "training" && !routine && !isManagedClient ? (
                <button
                  type="button"
                  onClick={() => onChooseRoutine(day)}
                  className="theme-accent-soft mt-3 flex h-11 w-full items-center justify-center border text-xs font-black uppercase"
                >
                  <Plus className="mr-2 h-4 w-4" /> Configurar rutina
                </button>
              ) : null}
              {isCurrent && plan.status === "active" && routine ? (
                <button
                  type="button"
                  onClick={() => onStartRoutine(day)}
                  className="theme-accent-solid mt-3 flex h-12 w-full items-center justify-center gap-2 border-0 text-xs font-black uppercase"
                >
                  <Play className="h-4 w-4" /> Iniciar sesión
                </button>
              ) : null}
              {sequential && isCurrent && plan.status === "active" && isRest ? (
                <button
                  type="button"
                  disabled={advancingCycle}
                  onClick={onAdvanceCycle}
                  className="theme-accent-soft mt-3 flex h-12 w-full items-center justify-center gap-2 border text-xs font-black uppercase disabled:opacity-50"
                >
                  <Bed className="h-4 w-4" />{" "}
                  {advancingCycle ? "Actualizando..." : "Completar y continuar"}
                </button>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function PlanTemplateDetailsModal({
  template,
  routines,
  onClose,
  onOpenRoutine,
  onEdit,
  onDuplicate,
}) {
  const routinesById = useMemo(
    () =>
      new Map(
        routines.map((routine) => [
          String(routine.id || routine._id),
          routine,
        ]),
      ),
    [routines],
  );
  const own = template.visibility !== "system";
  const trainingDays = (template.weeklySchedule || []).filter(
    (day) => day.type === "training",
  ).length;

  return (
    <Modal
      title={template.name}
      subtitle={`${ROUTINE_LEVEL_LABELS[template.level] || template.level} · ${template.goal} · ${template.durationWeeks} semanas`}
      onClose={onClose}
      footer={
        <>
          {own ? (
            <Button variant="outline" onClick={() => onEdit(template)}>
              <Pencil className="h-4 w-4" /> Editar
            </Button>
          ) : null}
          <Button onClick={() => onDuplicate(template)}>
            <Copy className="h-4 w-4" />
            {own ? "Duplicar" : "Usar como base"}
          </Button>
        </>
      }
    >
      {template.description ? (
        <p className="mb-4 text-sm font-semibold leading-relaxed text-[color:var(--text-muted)]">
          {template.description}
        </p>
      ) : null}
      <div className="mb-3 flex items-center justify-between border-b border-[color:var(--border)] pb-2">
        <h4 className="text-xs font-black uppercase">Contenido programado</h4>
        <span className="text-xs font-black text-[color:var(--text-muted)]">
          {trainingDays} entrenamientos
        </span>
      </div>
      <div className="divide-y divide-[color:var(--border)] border-y border-[color:var(--border)]">
        {(template.weeklySchedule || []).map((day, index) => {
          const routine = day.sourceRoutineId
            ? routinesById.get(String(day.sourceRoutineId))
            : null;
          const dayLabel =
            template.scheduleMode === "fixed"
              ? PLAN_DAY_NAMES[index]
              : `Dia ${index + 1}`;
          const content =
            day.type === "rest"
              ? "Descanso"
              : day.type === "recovery"
                ? "Recuperacion"
                : routine?.name || day.focus || "Rutina pendiente";
          return (
            <div
              key={day.slotId || index}
              className="flex min-h-16 items-center gap-3 py-3"
            >
              <span className="grid h-11 w-12 shrink-0 place-items-center border border-[color:var(--border)] bg-[color:var(--bg)] text-[11px] font-black uppercase">
                {dayLabel.slice(0, 3)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">
                  {day.type === "training" ? day.focus || "Entrenamiento" : dayLabel}
                </p>
                <p className="mt-1 truncate text-sm font-black uppercase">
                  {content}
                </p>
              </div>
              {routine ? (
                <button
                  type="button"
                  onClick={() => onOpenRoutine(routine)}
                  className="grid h-11 w-11 shrink-0 place-items-center text-[color:var(--text-muted)]"
                  aria-label={`Ver ejercicios de ${routine.name}`}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              ) : day.type === "rest" ? (
                <Bed className="h-4 w-4 shrink-0 text-[color:var(--text-muted)]" />
              ) : null}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

function RoutineDetailsModal({
  routine,
  onClose,
  onEdit,
  onDuplicate,
  canEdit,
}) {
  const exercises = routine.exercises || [];
  const totalSets = exercises.reduce(
    (total, exercise) => total + (Number(exercise.sets) || 0),
    0,
  );
  return (
    <Modal
      title={routine.name}
      subtitle={routine.description || `${exercises.length} ejercicios · ${totalSets} series`}
      onClose={onClose}
      footer={
        canEdit ? (
          <Button onClick={() => onEdit(routine)}>
            <Pencil className="h-4 w-4" /> Editar rutina
          </Button>
        ) : onDuplicate ? (
          <Button onClick={() => onDuplicate(routine)}>
            <Copy className="h-4 w-4" /> Duplicar para editar
          </Button>
        ) : null
      }
    >
      <div className="mb-4 grid grid-cols-3 border-y border-[color:var(--border)] py-3 text-center">
        <div>
          <p className="text-lg font-black">{exercises.length}</p>
          <p className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">
            Ejercicios
          </p>
        </div>
        <div className="border-x border-[color:var(--border)]">
          <p className="text-lg font-black">{totalSets}</p>
          <p className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">
            Series
          </p>
        </div>
        <div>
          <p className="theme-accent-text truncate px-1 text-sm font-black uppercase">
            {ROUTINE_LEVEL_LABELS[routine.level] || routine.goal || "Personal"}
          </p>
          <p className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">
            Nivel
          </p>
        </div>
      </div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h4 className="text-xs font-black uppercase">Ejercicios</h4>
        <span className="theme-accent-soft border px-2 py-1 text-[9px] font-black uppercase">
          {routine.exerciseOrderMode === "muscle_blocks"
            ? "Por bloques"
            : "Orden libre"}
        </span>
      </div>
      <div className="divide-y divide-[color:var(--border)] border-y border-[color:var(--border)]">
        {exercises.map((exercise, index) => {
          const imageUrl = getExerciseImageUrl(exercise, {
            width: 144,
            height: 144,
          });
          return (
            <div
              key={`${exercise.exerciseId || exercise.name}-${index}`}
              className="flex min-h-20 items-center gap-3 py-3"
            >
              <span className="w-5 shrink-0 text-center text-xs font-black text-[color:var(--text-muted)]">
                {index + 1}
              </span>
              <div className="h-14 w-14 shrink-0 overflow-hidden border border-[color:var(--border)] bg-[color:var(--bg)]">
                <RoutinePreviewImage
                  item={{ name: exercise.name || "Ejercicio", url: imageUrl }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-black uppercase leading-tight">
                  {exercise.name}
                </p>
                {exercise.muscle ? (
                  <p className="mt-1 truncate text-[10px] font-bold uppercase text-[color:var(--text-muted)]">
                    {exercise.muscle}
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 border border-[color:var(--border)] px-2 py-1 text-xs font-black">
                {exercise.sets || 0} series
              </span>
            </div>
          );
        })}
        {!exercises.length ? (
          <p className="py-10 text-center text-sm font-semibold text-[color:var(--text-muted)]">
            Esta rutina todavia no tiene ejercicios.
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

function Routines({ onNavigate }) {
  const { user } = useAuth();
  const isCoach = user?.role === "Entrenador";
  const isManagedClient =
    user?.role === "Cliente" && user?.trainingMode === "coach_managed";
  const {
    routines,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    duplicateRoutine,
    reloadRoutines,
  } = useRoutines();
  const {
    exercises: libraryExercises,
    trainings,
    loading: trainingDataLoading,
    error: trainingDataError,
    branch: preferredBranch,
    locationMode,
    allowedBranches,
  } = useTrainingData();

  const [libraryDraft] = useState(() =>
    isManagedClient ? null : readRoutineLibraryDraft(),
  );
  const [modalMode, setModalMode] = useState(() =>
    libraryDraft ? (libraryDraft.mode === "create" ? "create" : "edit") : null,
  );
  const [selectedRoutine, setSelectedRoutine] = useState(
    () => libraryDraft?.routine || null,
  );
  const [activeBranch, setActiveBranch] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [routineOrigin, setRoutineOrigin] = useState("private");
  const [templateGroup, setTemplateGroup] = useState("all");
  const [canReturnToTraining, setCanReturnToTraining] =
    useState(hasTrainingReturn);
  const [editTargetRoutineId, setEditTargetRoutineId] = useState(
    readTrainingRoutineEditTarget,
  );
  const [routineToDelete, setRoutineToDelete] = useState(null);
  const [duplicatingRoutineId, setDuplicatingRoutineId] = useState(null);
  const [activePlan, setActivePlan] = useState(null);
  const [workspaceView, setWorkspaceView] = useState("plans");
  const [trainingPlans, setTrainingPlans] = useState([]);
  const [planTemplates, setPlanTemplates] = useState([]);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [viewingPlanTemplate, setViewingPlanTemplate] = useState(null);
  const [viewingRoutine, setViewingRoutine] = useState(null);
  const [planDayChoice, setPlanDayChoice] = useState(null);
  const [replacementPlanDay, setReplacementPlanDay] = useState(null);
  const [archivePlanConfirmOpen, setArchivePlanConfirmOpen] = useState(false);
  const [deletePlanConfirmOpen, setDeletePlanConfirmOpen] = useState(false);
  const [selectedPlanWeek, setSelectedPlanWeek] = useState(0);
  const [advancingCycle, setAdvancingCycle] = useState(false);
  const [templateProcessingId, setTemplateProcessingId] = useState("");
  const missingPlanRoutines = useMemo(
    () =>
      (activePlan?.weeklySchedule || []).filter(
        (day) => day.type === "training" && !day.routineId,
      ).length,
    [activePlan],
  );
  const planTrainingDays = useMemo(
    () =>
      (activePlan?.weeklySchedule || []).filter(
        (day) => day.type === "training",
      ).length,
    [activePlan],
  );
  const configuredPlanRoutines = planTrainingDays - missingPlanRoutines;
  const currentActivePlan = useMemo(
    () => trainingPlans.find((plan) => plan.status === "active") || null,
    [trainingPlans],
  );
  const draftPlanCount = useMemo(
    () => trainingPlans.filter((plan) => plan.status === "draft").length,
    [trainingPlans],
  );
  const orderedTrainingPlans = useMemo(() => {
    const statusOrder = {
      active: 0,
      scheduled: 1,
      draft: 2,
      paused: 3,
      completed: 4,
      cancelled: 5,
    };
    return [...trainingPlans].sort(
      (a, b) =>
        (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9) ||
        getDateTimestamp(b.updatedAt) - getDateTimestamp(a.updatedAt),
    );
  }, [trainingPlans]);
  const routinePlanById = useMemo(() => {
    const map = new Map();
    trainingPlans
      .filter((plan) => ["active", "scheduled", "draft"].includes(plan.status))
      .forEach((plan) => {
        (plan.weeklySchedule || []).forEach((day) => {
          if (day.routineId) map.set(String(day.routineId), plan);
        });
      });
    return map;
  }, [trainingPlans]);

  const refreshPlans = useCallback(async () => {
    if (isCoach) {
      const templates = await api.getPlanTemplates();
      setPlanTemplates(templates);
      setTrainingPlans([]);
      setActivePlan(null);
      return [];
    }
    const plans = await api.getTrainingPlans();
    setTrainingPlans(plans);
    api
      .getPlanTemplates()
      .then(setPlanTemplates)
      .catch(() => setPlanTemplates([]));
    setActivePlan((current) =>
      current
        ? plans.find(
            (plan) =>
              String(plan._id || plan.id) === String(current._id || current.id),
          ) || null
        : null,
    );
    return plans;
  }, [isCoach]);

  useEffect(() => {
    if (!user?.id && !user?._id) return;
    let active = true;
    const loadPlan = () =>
      refreshPlans().catch(() => {
        if (active) {
          setTrainingPlans([]);
          setActivePlan(null);
        }
      });
    const handleVisibility = () => {
      if (document.visibilityState === "visible") loadPlan();
    };
    loadPlan();
    window.addEventListener("focus", loadPlan);
    document.addEventListener("visibilitychange", handleVisibility);
    const intervalId = window.setInterval(loadPlan, 60_000);
    return () => {
      active = false;
      window.removeEventListener("focus", loadPlan);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.clearInterval(intervalId);
    };
  }, [refreshPlans, user?.id, user?._id]);

  const availableExercises = useMemo(() => {
    const usage = new Map();
    (trainings || []).forEach((training) => {
      const trainingBranch = normalizeBranch(training.branch);
      const usedAt = getDateTimestamp(training.date || training.createdAt);
      (training.exercises || []).forEach((exercise) => {
        const idKey = exercise.exerciseId?.toString();
        const nameKey = slugify(exercise.exerciseName || exercise.name);
        if (!idKey && !nameKey) return;

        const current = usage.get(idKey) ||
          usage.get(nameKey) || {
            count: 0,
            lastUsedAt: 0,
            byBranch: {},
          };
        current.count += 1;
        current.lastUsedAt = Math.max(current.lastUsedAt, usedAt);
        const branchUsage = current.byBranch[trainingBranch] || {
          count: 0,
          lastUsedAt: 0,
        };
        current.byBranch[trainingBranch] = {
          count: branchUsage.count + 1,
          lastUsedAt: Math.max(branchUsage.lastUsedAt, usedAt),
        };
        if (idKey) usage.set(idKey, current);
        if (nameKey) usage.set(nameKey, current);
      });
    });

    const seen = new Set();
    return libraryExercises
      .filter((ex) => {
        if (seen.has(ex.id)) return false;
        seen.add(ex.id);
        return true;
      })
      .map((ex) => {
        const exerciseUsage = usage.get(ex.id) || usage.get(slugify(ex.name));
        return {
          id: ex.id,
          name: ex.name,
          aliases: ex.aliases || [],
          muscle: ex.muscle,
          image: ex.image || "",
          imagePublicId: ex.imagePublicId || "",
          branches: ex.branches || ["general"],
          supportsUnilateral: Boolean(ex.supportsUnilateral),
          usageCount: exerciseUsage?.count || 0,
          lastUsedAt: exerciseUsage?.lastUsedAt || 0,
          usageByBranch: exerciseUsage?.byBranch || {},
        };
      });
  }, [libraryExercises, trainings]);

  const exerciseMetaMap = useMemo(() => {
    const map = new Map();
    availableExercises.forEach((ex) => {
      map.set(ex.id, ex);
      if (ex.name) map.set(slugify(ex.name), ex);
    });
    return map;
  }, [availableExercises]);

  const branchCounts = useMemo(() => {
    const counts = { all: routines.length, sopocachi: 0, miraflores: 0 };
    routines.forEach((routine) => {
      if (routine.visibility === "system") return;
      const branch = normalizeBranch(routine.branch);
      counts[branch] = (counts[branch] || 0) + 1;
    });
    return counts;
  }, [routines]);
  const originCounts = useMemo(() => {
    const system = routines.filter(
      (routine) => routine.visibility === "system",
    ).length;
    return {
      all: routines.length,
      system,
      private: routines.length - system,
    };
  }, [routines]);
  const templateGroups = useMemo(() => {
    const counts = routines.reduce((result, routine) => {
      if (routine.visibility !== "system" || !routine.templateGroup) {
        return result;
      }
      result[routine.templateGroup] = (result[routine.templateGroup] || 0) + 1;
      return result;
    }, {});
    return [
      { id: "all", label: "Todas", count: originCounts.system },
      ...ROUTINE_GROUPS.filter((item) => counts[item.id]).map((item) => ({
        ...item,
        count: counts[item.id],
      })),
    ];
  }, [originCounts.system, routines]);
  useEffect(() => {
    if (originCounts.all === 0) return;
    if (routineOrigin === "private" && originCounts.private === 0) {
      setRoutineOrigin(originCounts.system ? "system" : "all");
    }
    if (routineOrigin === "system" && originCounts.system === 0) {
      setRoutineOrigin(originCounts.private ? "private" : "all");
    }
  }, [originCounts.all, originCounts.private, originCounts.system, routineOrigin]);
  const showSearch = routines.length >= 5;
  const showOriginFilter = originCounts.system > 0 && originCounts.private > 0;
  const showBranchFilter =
    routineOrigin === "private" &&
    locationMode === "multiple" &&
    branchCounts.sopocachi > 0 &&
    branchCounts.miraflores > 0;
  const hasActiveRoutineFilters =
    Boolean(searchTerm.trim()) ||
    routineOrigin !== "all" ||
    templateGroup !== "all" ||
    (showBranchFilter && activeBranch !== "all");

  const routineCards = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return routines
      .filter((routine) => {
        const isSystem = routine.visibility === "system";
        if (routineOrigin === "system" && !isSystem) return false;
        if (routineOrigin === "private" && isSystem) return false;
        if (
          isSystem &&
          templateGroup !== "all" &&
          routine.templateGroup !== templateGroup
        ) {
          return false;
        }
        return true;
      })
      .filter((routine) => {
        if (routine.visibility === "system") return true;
        if (locationMode === "disabled") return true;
        if (locationMode === "single") {
          return normalizeBranch(routine.branch) === preferredBranch;
        }
        return activeBranch === "all"
          ? true
          : normalizeBranch(routine.branch) === activeBranch;
      })
      .filter((routine) => {
        if (!query) return true;
        return (routine.name || "").toLowerCase().includes(query);
      })
      .map((routine) => {
        const exercises = routine.exercises || [];
        const muscles = new Set();
        let totalSets = 0;
        const preview = [];

        exercises.forEach((ex) => {
          totalSets += Number(ex.sets) || 0;
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
        const configuredMinutes = Number(
          routine.estimatedDuration ??
            routine.durationMinutes ??
            routine.duration ??
            0,
        );
        const estimatedMinutes =
          configuredMinutes > 0
            ? configuredMinutes
            : totalSets > 0
              ? Math.max(20, Math.round((totalSets * 2.5) / 5) * 5)
              : 20;

        return {
          ...routine,
          plan: routinePlanById.get(String(routine.id || routine._id)) || null,
          totalExerciseCount: exercises.length,
          totalSets,
          muscles: Array.from(muscles),
          preview,
          hiddenPreviewCount: Math.max(0, exercises.length - preview.length),
          estimatedMinutes,
        };
      })
      .sort(
        (a, b) =>
          Number(Boolean(b.plan)) - Number(Boolean(a.plan)) ||
          getDateTimestamp(b.updatedAt || b.createdAt) -
            getDateTimestamp(a.updatedAt || a.createdAt) ||
          (a.name || "").localeCompare(b.name || ""),
      );
  }, [
    routines,
    activeBranch,
    searchTerm,
    routineOrigin,
    templateGroup,
    exerciseMetaMap,
    locationMode,
    preferredBranch,
    routinePlanById,
  ]);
  const groupedRoutineCards = useMemo(() => {
    const systemRoutines = routineCards.filter(
      (routine) => routine.visibility === "system",
    );
    if (systemRoutines.length) {
      const personalRoutines = routineCards.filter(
        (routine) => routine.visibility !== "system",
      );
      const result = [];
      if (personalRoutines.length) {
        result.push({
          id: "__personal_heading",
          groupHeading: "Tus rutinas",
          groupCount: personalRoutines.length,
        });
        result.push(...personalRoutines);
      }
      ROUTINE_GROUPS.forEach((group) => {
        const matches = systemRoutines.filter(
          (routine) => routine.templateGroup === group.id,
        );
        if (!matches.length) return;
        result.push({
          id: `__system_${group.id}`,
          groupHeading: group.label,
          groupCount: matches.length,
          groupEyebrow: "Coleccion base",
        });
        result.push(...matches);
      });
      const ungrouped = systemRoutines.filter(
        (routine) => !ROUTINE_GROUP_LABELS[routine.templateGroup],
      );
      if (ungrouped.length) {
        result.push({
          id: "__system_other",
          groupHeading: "Otras rutinas base",
          groupCount: ungrouped.length,
          groupEyebrow: "Coleccion base",
        });
        result.push(...ungrouped);
      }
      return result;
    }
    const planRoutines = routineCards.filter((routine) => routine.plan);
    const otherRoutines = routineCards.filter((routine) => !routine.plan);
    if (!planRoutines.length) return routineCards;
    return [
      { id: "__plan_heading", groupHeading: "Rutinas de la planificación" },
      ...planRoutines,
      ...(otherRoutines.length
        ? [{ id: "__other_heading", groupHeading: "Otras rutinas" }]
        : []),
      ...otherRoutines,
    ];
  }, [routineCards]);

  const openCreate = (planDay = null, { replacing = false } = {}) => {
    if (isManagedClient) return;
    setReplacementPlanDay(replacing ? planDay : null);
    setSelectedRoutine(
      planDay
        ? {
            name: planDay.focus || `Rutina ${planDay.order}`,
            ...(replacing
              ? {}
              : {
                  trainingPlanId: activePlan?._id || activePlan?.id,
                  trainingPlanSlotId: planDay.slotId,
                  assignmentType: "plan",
                }),
          }
        : null,
    );
    setModalMode("create");
  };

  const openEdit = (routine) => {
    if (isManagedClient) return;
    setViewingRoutine(null);
    setViewingPlanTemplate(null);
    setSelectedRoutine(routine);
    setModalMode("edit");
  };

  useEffect(() => {
    if (!editTargetRoutineId || isManagedClient) return;
    const target = routines.find(
      (routine) =>
        routine.id === editTargetRoutineId ||
        routine._id === editTargetRoutineId,
    );
    if (!target) return;
    // This effect bridges a navigation intent stored before the page mounted.
    // It runs once per target and immediately clears the marker.
    setSelectedRoutine(target);
    setWorkspaceView("routines");
    setModalMode("edit");
    setEditTargetRoutineId(null);
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(TRAINING_ROUTINE_EDIT_TARGET_KEY);
    }
  }, [editTargetRoutineId, isManagedClient, routines]);

  const closeModal = () => {
    setSelectedRoutine(null);
    setModalMode(null);
    setReplacementPlanDay(null);
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(ROUTINE_LIBRARY_DRAFT_KEY);
      localStorage.removeItem(TRAINING_ROUTINE_EDIT_TARGET_KEY);
    }
  };

  const handleSave = async (routine) => {
    if (isManagedClient) return;
    if (modalMode === "create") {
      const savedRoutine = await addRoutine(routine);
      if (replacementPlanDay && activePlan) {
        let savedPlan;
        try {
          savedPlan = await api.assignRoutineToPlanSlot(
            activePlan._id || activePlan.id,
            replacementPlanDay.slotId,
            savedRoutine.id || savedRoutine._id,
          );
        } catch (error) {
          await deleteRoutine(savedRoutine.id || savedRoutine._id).catch(
            () => {},
          );
          throw error;
        }
        setActivePlan(savedPlan);
        setTrainingPlans((current) =>
          current.map((plan) =>
            String(plan._id || plan.id) ===
            String(savedPlan._id || savedPlan.id)
              ? savedPlan
              : plan,
          ),
        );
        toast.success("Rutina creada y asignada");
      } else {
        toast.success("Rutina creada");
      }
    }
    if (modalMode === "edit") {
      await updateRoutine(routine.id, routine);
      toast.success("Rutina actualizada");
    }
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
    if (routine.trainingPlanId) {
      await refreshPlans();
    }
  };

  const saveTrainingPlan = async (payload) => {
    try {
      if (isCoach) {
        if (editingPlan) {
          await api.updatePlanTemplate(
            editingPlan._id || editingPlan.id,
            payload,
          );
        } else {
          await api.createPlanTemplate(payload);
        }
        await refreshPlans();
        setPlanModalOpen(false);
        setEditingPlan(null);
        toast.success(
          editingPlan ? "Plantilla actualizada" : "Plantilla creada",
          { description: "Ya puede asignarse a cualquier atleta." },
        );
        return;
      }
      const saved = editingPlan
        ? await api.updateTrainingPlan(
            editingPlan._id || editingPlan.id,
            payload,
          )
        : await api.createTrainingPlan(payload);
      setActivePlan(saved);
      setSelectedPlanWeek(getPlanWeekIndex(saved));
      setTrainingPlans((current) => [
        saved,
        ...current.filter(
          (plan) =>
            String(plan._id || plan.id) !== String(saved._id || saved.id),
        ),
      ]);
      setPlanModalOpen(false);
      setEditingPlan(null);
      toast.success(
        editingPlan ? "Planificacion actualizada" : "Planificacion creada",
        {
          description:
            "Ahora agrega una rutina a cada bloque de entrenamiento.",
        },
      );
    } catch (error) {
      toast.error(error.message || "No se pudo guardar la planificacion");
      throw error;
    }
  };

  const duplicatePlanTemplate = async (template) => {
    const id = String(template._id || template.id);
    if (templateProcessingId) return;
    setTemplateProcessingId(id);
    try {
      await api.createPlanTemplate({
        name: `${template.name} (Copia)`,
        description: template.description || "",
        level: template.level,
        goal: template.goal,
        durationWeeks: template.durationWeeks,
        scheduleMode: template.scheduleMode,
        weeklySchedule: template.weeklySchedule,
        tags: template.tags || [],
      });
      await refreshPlans();
      toast.success("Plantilla duplicada");
    } catch (error) {
      toast.error(error.message || "No se pudo duplicar la plantilla");
    } finally {
      setTemplateProcessingId("");
    }
  };

  const archivePlanTemplate = async (template) => {
    if (!window.confirm(`¿Eliminar ${template.name} de tus plantillas?`)) return;
    const id = String(template._id || template.id);
    if (templateProcessingId) return;
    setTemplateProcessingId(id);
    try {
      await api.deletePlanTemplate(id);
      await refreshPlans();
      toast.success("Plantilla eliminada de tu biblioteca");
    } catch (error) {
      toast.error(error.message || "No se pudo eliminar la plantilla");
    } finally {
      setTemplateProcessingId("");
    }
  };

  const activateTrainingPlan = async () => {
    if (
      currentActivePlan &&
      String(currentActivePlan._id || currentActivePlan.id) !==
        String(activePlan._id || activePlan.id) &&
      !window.confirm(
        `Al activar esta planificacion se pausara ${currentActivePlan.name}. ¿Deseas continuar?`,
      )
    ) {
      return;
    }
    try {
      const saved = await api.updateTrainingPlanStatus(
        activePlan._id || activePlan.id,
        "active",
      );
      setActivePlan(saved);
      await refreshPlans();
      await reloadRoutines({ silent: true });
      toast.success(
        saved.status === "scheduled"
          ? "Planificación programada"
          : "Planificación activada",
      );
    } catch (error) {
      toast.error(error.message || "No se pudo activar la planificacion");
    }
  };

  const pauseTrainingPlan = async () => {
    try {
      const saved = await api.updateTrainingPlanStatus(
        activePlan._id || activePlan.id,
        "paused",
      );
      setActivePlan(saved);
      await refreshPlans();
      await reloadRoutines({ silent: true });
      toast.success("Planificación pausada");
    } catch (error) {
      toast.error(error.message || "No se pudo pausar la planificación");
    }
  };

  const assignExistingRoutine = async (routineId) => {
    if (!activePlan || !planDayChoice) return;
    const replacingRoutine = Boolean(planDayChoice.routineId);
    try {
      const saved = await api.assignRoutineToPlanSlot(
        activePlan._id || activePlan.id,
        planDayChoice.slotId,
        routineId,
      );
      setActivePlan(saved);
      setTrainingPlans((current) =>
        current.map((plan) =>
          String(plan._id || plan.id) === String(saved._id || saved.id)
            ? saved
            : plan,
        ),
      );
      setPlanDayChoice(null);
      toast.success(
        replacingRoutine ? "Rutina cambiada" : "Rutina vinculada al plan",
      );
    } catch (error) {
      toast.error(error.message || "No se pudo vincular la rutina");
    }
  };

  const archiveDraftPlan = async () => {
    if (!activePlan || activePlan.status !== "draft") return;
    try {
      await api.updateTrainingPlanStatus(
        activePlan._id || activePlan.id,
        "cancelled",
      );
      setArchivePlanConfirmOpen(false);
      setActivePlan(null);
      await refreshPlans();
      await reloadRoutines({ silent: true });
      toast.success("Borrador archivado");
    } catch (error) {
      toast.error(error.message || "No se pudo archivar el borrador");
    }
  };

  const deleteCurrentPlan = async () => {
    if (!activePlan || user?.role !== "Admin") return;
    try {
      await api.deleteTrainingPlan(activePlan._id || activePlan.id);
      setDeletePlanConfirmOpen(false);
      setActivePlan(null);
      await Promise.all([refreshPlans(), reloadRoutines({ silent: true })]);
      toast.success("Planificación eliminada");
    } catch (error) {
      toast.error(error.message || "No se pudo eliminar la planificación");
    }
  };

  const openTrainingPlan = (plan) => {
    setWorkspaceView("plans");
    setActivePlan(plan);
    setSelectedPlanWeek(getPlanWeekIndex(plan));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startPlanRoutine = (day) => {
    if (!day?.routineId) return;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(
        TRAINING_PLAN_ROUTINE_INTENT_KEY,
        JSON.stringify({
          routineId: String(day.routineId),
          planId: String(activePlan?._id || activePlan?.id || ""),
          slotId: day.slotId,
          createdAt: Date.now(),
        }),
      );
    }
    onNavigate?.("registrar");
  };

  const advanceCycle = async () => {
    if (!activePlan || advancingCycle) return;
    setAdvancingCycle(true);
    try {
      const saved = await api.advanceTrainingPlanCycle(
        activePlan._id || activePlan.id,
      );
      setActivePlan(saved);
      setTrainingPlans((current) =>
        current.map((plan) =>
          String(plan._id || plan.id) === String(saved._id || saved.id)
            ? saved
            : plan,
        ),
      );
      toast.success("Ciclo actualizado");
    } catch (error) {
      toast.error(error.message || "No se pudo avanzar el ciclo");
    } finally {
      setAdvancingCycle(false);
    }
  };

  const requestDeleteRoutine = (routine) => {
    if (isManagedClient) return;
    setRoutineToDelete(routine);
  };

  const closeDeleteRoutine = () => {
    setRoutineToDelete(null);
  };

  const confirmDeleteRoutine = async () => {
    if (!routineToDelete) return;
    const target = routineToDelete;
    closeDeleteRoutine();
    try {
      await deleteRoutine(target.id || target._id);
      await refreshPlans();
      toast.success("Rutina eliminada");
    } catch {
      toast.error("No se pudo eliminar la rutina");
    }
  };

  const handleDuplicateRoutine = async (routine) => {
    if (!routine || duplicatingRoutineId || isManagedClient) return;
    const routineId = routine.id || routine._id;
    setDuplicatingRoutineId(routineId);
    try {
      await duplicateRoutine(routineId);
      toast.success(`Copia de ${routine.name} creada`);
    } catch {
      toast.error("No se pudo duplicar la rutina");
    } finally {
      setDuplicatingRoutineId(null);
    }
  };

  const handleReturnToTraining = () => {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(TRAINING_ROUTINES_RETURN_KEY);
      localStorage.removeItem(TRAINING_ROUTINE_EDIT_TARGET_KEY);
    }
    setCanReturnToTraining(false);
    onNavigate?.("registrar");
  };

  const activePlanTimeProgress = activePlan
    ? getPlanTimeProgress(activePlan)
    : null;

  return (
    <div className="routines-shell">
      <section className="space-y-5">
        <div
          className={`${activePlan ? "flex" : "hidden md:flex"} items-center justify-between gap-3`}
        >
          <div className="min-w-0">
            <p className="theme-accent-text text-[11px] font-black uppercase tracking-[0.14em]">
              {activePlan
                ? "Detalle de planificación"
                : "Gestión de entrenamiento"}
            </p>
            <h1 className="mt-1 text-[26px] font-black leading-none text-[color:var(--text)] sm:text-3xl">
              {activePlan ? activePlan.name : "Rutinas y planificación"}
            </h1>
            {!activePlan ? (
              <p className="mt-1.5 text-xs font-semibold text-[color:var(--text-muted)]">
                {workspaceView === "plans"
                  ? isCoach
                    ? `${planTemplates.length} plantillas de planificación`
                    : `${trainingPlans.length} ${trainingPlans.length === 1 ? "planificación" : "planificaciones"}`
                  : `${routines.length} ${routines.length === 1 ? "rutina" : "rutinas"}`}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {canReturnToTraining ? (
              <button
                type="button"
                onClick={handleReturnToTraining}
                className="grid h-11 w-11 place-items-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--text)] shadow-sm"
                aria-label="Volver al entrenamiento"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            ) : null}
            {activePlan ? (
              <button
                type="button"
                onClick={() => setActivePlan(null)}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-3 text-xs font-black"
                aria-label="Volver a planificaciones"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Todas ({trainingPlans.length})</span>
              </button>
            ) : !isManagedClient ? (
              <button
                type="button"
                onClick={() =>
                  workspaceView === "plans"
                    ? setPlanModalOpen(true)
                    : openCreate()
                }
                className="theme-accent-solid routines-surface inline-flex h-11 items-center justify-center gap-2 border px-4 text-sm font-black shadow-sm transition active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" />
                {workspaceView === "plans"
                  ? "Nueva planificación"
                  : "Nueva rutina"}
              </button>
            ) : null}
          </div>
        </div>

        {!activePlan ? (
          <div
            className="grid grid-cols-2 gap-1 bg-[#f0eef2] p-1 dark:bg-[#1b1b1b]"
            role="tablist"
            aria-label="Gestionar rutinas y planificaciones"
          >
            <button
              type="button"
              role="tab"
              aria-selected={workspaceView === "plans"}
              onClick={() => setWorkspaceView("plans")}
              className={`inline-flex h-10 items-center justify-center border text-xs font-black uppercase transition ${
                workspaceView === "plans"
                  ? "border-[#ffc4b2] bg-white text-[#b82f05] shadow-sm dark:border-[#e2ff00] dark:bg-[#111] dark:text-[#e2ff00]"
                  : "border-transparent text-[#32262a] dark:text-[#b8b8a6]"
              }`}
            >
              {isCoach ? "Planificaciones base" : "Planificaciones"}
              {!isCoach && draftPlanCount ? (
                <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-700 dark:text-amber-300">
                  {draftPlanCount} borradores
                </span>
              ) : null}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={workspaceView === "routines"}
              onClick={() => setWorkspaceView("routines")}
              className={`inline-flex h-10 items-center justify-center border text-xs font-black uppercase transition ${
                workspaceView === "routines"
                  ? "border-[#ffc4b2] bg-white text-[#b82f05] shadow-sm dark:border-[#e2ff00] dark:bg-[#111] dark:text-[#e2ff00]"
                  : "border-transparent text-[#32262a] dark:text-[#b8b8a6]"
              }`}
            >
              {isCoach ? "Rutinas base" : "Rutinas"}
            </button>
          </div>
        ) : null}

        {!isCoach &&
        !trainingPlans.length &&
        !activePlan &&
        workspaceView === "plans" ? (
          <div className="border-y border-[color:var(--border)] py-14 text-center sm:py-20">
            <div className="theme-accent-soft mx-auto grid h-12 w-12 place-items-center rounded-lg border">
              <Layers3 className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-lg font-black text-[color:var(--text)]">
              {isManagedClient
                ? "Aún no tienes una rutina asignada"
                : "Crea tu planificacion"}
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-[color:var(--text-muted)]">
              {isManagedClient
                ? "Tu coach preparará y asignará tu planificación desde su panel."
                : "Empieza definiendo qué quieres entrenar."}
            </p>
            {!isManagedClient ? (
              <Button
                className="mt-5 h-11 gap-2"
                onClick={() => setPlanModalOpen(true)}
              >
                <CalendarDays className="h-4 w-4" />
                Crear planificacion
              </Button>
            ) : null}
          </div>
        ) : null}
      </section>

      {isCoach && !activePlan && workspaceView === "plans" ? (
        <CoachPlanTemplates
          templates={planTemplates}
          routines={routines}
          processingId={templateProcessingId}
          onCreate={() => {
            setEditingPlan(null);
            setPlanModalOpen(true);
          }}
          onOpen={setViewingPlanTemplate}
          onEdit={(template) => {
            setViewingPlanTemplate(null);
            setEditingPlan(template);
            setPlanModalOpen(true);
          }}
          onDuplicate={duplicatePlanTemplate}
          onArchive={archivePlanTemplate}
        />
      ) : null}

      {!isCoach &&
      !activePlan &&
      workspaceView === "plans" &&
      trainingPlans.length ? (
        <section className="mt-6 space-y-3 pb-24 sm:pb-0">
          <div className="flex items-end justify-between gap-3 border-b border-[color:var(--border)] pb-3">
            <div>
              <p className="text-[11px] font-black uppercase text-[color:var(--text-muted)]">
                Tus programas
              </p>
              <h2 className="mt-1 text-xl font-black">
                Elige una planificación
              </h2>
            </div>
            {currentActivePlan ? (
              <span className="theme-accent-soft rounded px-2.5 py-1 text-xs font-black">
                1 vigente
              </span>
            ) : null}
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {orderedTrainingPlans.map((plan) => {
              const trainingDays = (plan.weeklySchedule || []).filter(
                (day) => day.type === "training",
              );
              const configured = trainingDays.filter(
                (day) => day.routineId,
              ).length;
              const isCurrent = plan.status === "active";
              const isSequential = plan.scheduleMode !== "fixed";
              const timeProgress = getPlanTimeProgress(plan);
              return (
                <button
                  key={plan._id || plan.id}
                  type="button"
                  onClick={() => openTrainingPlan(plan)}
                  className={`routines-surface min-h-40 border bg-[color:var(--card)] p-4 text-left transition hover:border-[color:var(--text-muted)] ${
                    isCurrent
                      ? "border-[#ff5722] dark:border-[#e2ff00]"
                      : "border-[color:var(--border)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`rounded px-2 py-1 text-[11px] font-black uppercase ${
                        isCurrent
                          ? "theme-accent-solid"
                          : "bg-[color:var(--bg)] text-[color:var(--text-muted)]"
                      }`}
                    >
                      {PLAN_STATUS_LABELS[plan.status] || plan.status}
                    </span>
                    <ChevronRight className="h-5 w-5 text-[color:var(--text-muted)]" />
                  </div>
                  <h3 className="mt-4 text-lg font-black leading-tight">
                    {plan.name}
                  </h3>
                  <p className="mt-2 text-xs font-semibold text-[color:var(--text-muted)]">
                    {isSequential
                      ? `Ciclo libre · ${plan.weeklySchedule?.length || 0} días`
                      : "Rutina semanal fija"}
                  </p>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[11px] font-black uppercase">
                      <span className="text-[color:var(--text-muted)]">
                        Progreso
                      </span>
                      <span className={isCurrent ? "theme-accent-text" : ""}>
                        {timeProgress.percentage}%
                      </span>
                    </div>
                    <div
                      className="mt-1.5 h-1.5 overflow-hidden bg-[color:var(--border)]"
                      role="progressbar"
                      aria-label={`Progreso temporal de ${plan.name}`}
                      aria-valuemin="0"
                      aria-valuemax="100"
                      aria-valuenow={timeProgress.percentage}
                    >
                      <div
                        className={`h-full ${
                          isCurrent
                            ? "theme-accent-solid border-0"
                            : "bg-[color:var(--text-muted)]"
                        }`}
                        style={{ width: `${timeProgress.percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-[color:var(--border)] pt-3 text-xs font-black">
                    <span>{plan.durationWeeks} semanas</span>
                    <span
                      className={
                        configured === trainingDays.length
                          ? "theme-accent-text"
                          : "text-[color:var(--text-muted)]"
                      }
                    >
                      {configured}/{trainingDays.length} rutinas
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {activePlan?.status === "draft" &&
      currentActivePlan &&
      String(currentActivePlan._id || currentActivePlan.id) !==
        String(activePlan._id || activePlan.id) ? (
        <section className="routines-surface mt-5 flex items-center justify-between gap-3 border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase text-[color:var(--text-muted)]">
              Plan actualmente activo
            </p>
            <p className="mt-1 truncate text-base font-black">
              {currentActivePlan.name}
            </p>
          </div>
          <span className="theme-accent-soft shrink-0 rounded px-2.5 py-1 text-xs font-black">
            En curso
          </span>
        </section>
      ) : null}

      {activePlan ? (
        <section className="mt-5 border-y border-[color:var(--border)] py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="theme-accent-text text-[11px] font-black uppercase tracking-[0.14em]">
                {PLAN_STATUS_LABELS[activePlan.status] || "Planificación"}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs font-black uppercase">
                <span className="border border-[color:var(--border)] px-2 py-1">
                  {activePlan.goal}
                </span>
                <span className="border border-[color:var(--border)] px-2 py-1">
                  {activePlan.durationWeeks} semanas
                </span>
                <span className="border border-[color:var(--border)] px-2 py-1">
                  {activePlan.scheduleMode === "fixed"
                    ? "Semana recurrente"
                    : "Ciclo libre"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isManagedClient &&
              !["completed", "cancelled"].includes(activePlan.status) ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingPlan(activePlan);
                    setPlanModalOpen(true);
                  }}
                  className="grid h-11 w-11 place-items-center rounded-lg border border-[color:var(--border)]"
                  aria-label="Editar planificacion"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              ) : null}
              {user?.role === "Admin" ? (
                <button
                  type="button"
                  onClick={() => setDeletePlanConfirmOpen(true)}
                  className="grid h-11 w-11 place-items-center rounded-lg border border-red-500/30 text-red-600"
                  aria-label="Eliminar planificación"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
          <div className="mt-5 border border-[color:var(--border)] bg-[color:var(--card)] p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase text-[color:var(--text-muted)]">
                  Progreso del periodo
                </p>
                <p className="mt-1 text-sm font-black">
                  {activePlanTimeProgress.message}
                </p>
              </div>
              <strong className="theme-accent-text text-2xl font-black tabular-nums">
                {activePlanTimeProgress.percentage}%
              </strong>
            </div>
            <div
              className="mt-3 h-2 overflow-hidden bg-[color:var(--border)]"
              role="progressbar"
              aria-label="Progreso temporal de la planificación"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={activePlanTimeProgress.percentage}
            >
              <div
                className="theme-accent-solid h-full border-0 transition-all"
                style={{
                  width: `${activePlanTimeProgress.percentage}%`,
                }}
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="block font-bold uppercase text-[color:var(--text-muted)]">
                  Inicio
                </span>
                <strong className="mt-0.5 block font-black">
                  {formatPlanDate(activePlan.startDate)}
                </strong>
              </div>
              <div className="text-right">
                <span className="block font-bold uppercase text-[color:var(--text-muted)]">
                  Finalización
                </span>
                <strong className="mt-0.5 block font-black">
                  {formatPlanDate(getPlanEndDate(activePlan))}
                </strong>
              </div>
            </div>
          </div>
          <TrainingPlanSchedule
            plan={activePlan}
            routines={routines}
            trainings={trainings}
            selectedWeek={selectedPlanWeek}
            isManagedClient={isManagedClient}
            onChooseRoutine={setPlanDayChoice}
            onOpenRoutine={setViewingRoutine}
            onDuplicateRoutine={handleDuplicateRoutine}
            onDeleteRoutine={requestDeleteRoutine}
            duplicatingRoutineId={duplicatingRoutineId}
            onStartRoutine={startPlanRoutine}
            onAdvanceCycle={advanceCycle}
            advancingCycle={advancingCycle}
          />
          {activePlan.notes ? (
            <p className="mt-3 text-xs font-semibold text-[color:var(--text-muted)]">
              {activePlan.notes}
            </p>
          ) : null}
          {!isManagedClient && activePlan.status === "draft" ? (
            missingPlanRoutines ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex h-11 items-center gap-2 rounded-lg border border-amber-300 bg-amber-500/10 px-4 text-xs font-black text-amber-800 dark:border-amber-400/30 dark:text-amber-200">
                  <CalendarDays className="h-4 w-4" />
                  {configuredPlanRoutines} de {planTrainingDays} rutinas
                  configuradas
                </div>
                <button
                  type="button"
                  onClick={() => setArchivePlanConfirmOpen(true)}
                  className="inline-flex h-11 items-center gap-2 px-3 text-sm font-black text-[color:var(--text-muted)]"
                >
                  <Archive className="h-4 w-4" />
                  Archivar borrador
                </button>
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button className="h-11 gap-2" onClick={activateTrainingPlan}>
                  <Play className="h-4 w-4" />
                  Activar planificación
                </Button>
                <button
                  type="button"
                  onClick={() => setArchivePlanConfirmOpen(true)}
                  className="inline-flex h-11 items-center gap-2 px-3 text-sm font-black text-[color:var(--text-muted)]"
                >
                  <Archive className="h-4 w-4" />
                  Archivar
                </button>
              </div>
            )
          ) : null}
          {!isManagedClient && activePlan.status === "paused" ? (
            <Button className="mt-4 h-11 gap-2" onClick={activateTrainingPlan}>
              <Play className="h-4 w-4" /> Activar planificación
            </Button>
          ) : null}
          {!isManagedClient && activePlan.status === "scheduled" ? (
            <button
              type="button"
              onClick={pauseTrainingPlan}
              className="mt-4 inline-flex h-11 items-center gap-2 text-sm font-black text-[color:var(--text-muted)]"
            >
              <Pause className="h-4 w-4" /> Pausar programación
            </button>
          ) : null}
          {!isManagedClient && activePlan.status === "active" ? (
            <button
              type="button"
              onClick={pauseTrainingPlan}
              className="mt-4 inline-flex h-11 items-center gap-2 text-sm font-black text-[color:var(--text-muted)]"
            >
              <Pause className="h-4 w-4" /> Pausar planificación
            </button>
          ) : null}
        </section>
      ) : null}

      {!activePlan && workspaceView === "routines" ? (
        <RoutineToolbar
          showSearch={showSearch}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          showOriginFilter={showOriginFilter}
          routineOrigin={routineOrigin}
          setRoutineOrigin={setRoutineOrigin}
          originCounts={originCounts}
          templateGroup={templateGroup}
          setTemplateGroup={setTemplateGroup}
          templateGroups={templateGroups}
          showBranchFilter={showBranchFilter}
          activeBranch={activeBranch}
          setActiveBranch={setActiveBranch}
          branchCounts={branchCounts}
        />
      ) : null}

      {!activePlan && workspaceView === "routines" ? (
        <section className="mt-4 grid gap-3 pb-24 sm:mt-5 sm:gap-4 sm:pb-0 md:grid-cols-2 xl:grid-cols-3">
          {groupedRoutineCards.map((routine) => {
            if (routine.groupHeading) {
              return (
                <h2
                  key={routine.id}
                  className="col-span-full mt-3 flex items-end justify-between gap-3 border-b border-[color:var(--border)] pb-2"
                >
                  <span>
                    {routine.groupEyebrow ? (
                      <span className="mb-1 block text-[10px] font-black uppercase text-[#a93614] dark:text-[#e2ff00]">
                        {routine.groupEyebrow}
                      </span>
                    ) : null}
                    <span className="block text-base font-black uppercase text-[color:var(--text)]">
                      {routine.groupHeading}
                    </span>
                  </span>
                  {routine.groupCount ? (
                    <span className="pb-0.5 text-xs font-black text-[color:var(--text-muted)]">
                      {routine.groupCount}
                    </span>
                  ) : null}
                </h2>
              );
            }
            const isHighlighted = ["active", "scheduled"].includes(
              routine.plan?.status,
            );
            const isSystemRoutine = routine.visibility === "system";
            const focusLabel =
              routine.plan?.goal ||
              routine.goal ||
              routine.muscles.slice(0, 2).join(" · ") ||
              "Rutina personalizada";

            return (
              <article
                key={routine.id}
                className={`routines-surface relative overflow-visible border border-[color:var(--border)] border-t-[3px] bg-[color:var(--card)] shadow-sm ${
                  isHighlighted
                    ? "border-t-[#ff5722] dark:border-t-[#e2ff00]"
                    : "border-t-[#626262] dark:border-t-[#6d6d62]"
                } transition hover:border-[#ff8a66] dark:hover:border-[#e2ff00]`}
              >
                <button
                  type="button"
                  onClick={() => setViewingRoutine(routine)}
                  className="absolute inset-0 z-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ff5722]/35 dark:focus-visible:ring-[#e2ff00]/40"
                  aria-label={`Ver ejercicios de ${routine.name}`}
                />
                <div className="pointer-events-none relative z-[1] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="line-clamp-2 text-[23px] font-black uppercase leading-[0.95] text-[color:var(--text)] sm:text-[25px]">
                        {routine.name}
                      </h2>
                      <p className="mt-2 truncate text-xs font-black uppercase text-[#9f3518] dark:text-[#e2ff00]">
                        {focusLabel} · {routine.estimatedMinutes} min
                      </p>
                    </div>
                    {!isManagedClient ? (
                      <details className="pointer-events-auto relative -mr-2 -mt-2 shrink-0">
                        <summary
                          className="grid h-10 w-10 cursor-pointer list-none place-items-center text-[color:var(--text-muted)] transition hover:text-[color:var(--text)] [&::-webkit-details-marker]:hidden"
                          aria-label={`Opciones de ${routine.name}`}
                        >
                          <MoreVertical className="h-5 w-5" />
                        </summary>
                        <div className="absolute right-0 top-10 z-20 w-44 overflow-hidden border border-[color:var(--border)] bg-[color:var(--card)] p-1 shadow-xl">
                          {!isSystemRoutine ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.currentTarget
                                  .closest("details")
                                  ?.removeAttribute("open");
                                openEdit(routine);
                              }}
                              className="flex h-10 w-full items-center gap-2 px-3 text-left text-sm font-bold text-[color:var(--text)] hover:bg-[color:var(--bg)]"
                            >
                              <Pencil className="h-4 w-4" />
                              Editar
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={(event) => {
                              event.currentTarget
                                .closest("details")
                                ?.removeAttribute("open");
                              handleDuplicateRoutine(routine);
                            }}
                            disabled={Boolean(duplicatingRoutineId)}
                            className="flex h-10 w-full items-center gap-2 px-3 text-left text-sm font-bold text-[color:var(--text)] hover:bg-[color:var(--bg)] disabled:opacity-60"
                          >
                            <Copy className="h-4 w-4" />
                            {duplicatingRoutineId === routine.id
                              ? "Duplicando..."
                              : "Duplicar"}
                          </button>
                          {!isSystemRoutine ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.currentTarget
                                  .closest("details")
                                  ?.removeAttribute("open");
                                requestDeleteRoutine(routine);
                              }}
                              className="flex h-10 w-full items-center gap-2 px-3 text-left text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                            >
                              <Trash2 className="h-4 w-4" />
                              Eliminar
                            </button>
                          ) : null}
                        </div>
                      </details>
                    ) : null}
                  </div>

                  <div className="mt-5 flex min-h-14 items-stretch gap-2">
                    {routine.preview.slice(0, 3).map((item, idx) => (
                      <div
                        key={`${routine.id}-preview-${idx}`}
                        className="h-14 w-14 shrink-0 overflow-hidden rounded border border-[color:var(--border)] bg-[color:var(--bg)] sm:h-16 sm:w-16"
                      >
                        <RoutinePreviewImage item={item} />
                      </div>
                    ))}
                    {routine.hiddenPreviewCount > 0 ? (
                      <div className="grid h-14 w-14 shrink-0 place-items-center rounded border border-[#ffc4b2] bg-[#f3f1f3] text-sm font-bold text-[#38242a] dark:border-[#444] dark:bg-[#202020] dark:text-[#e2ff00] sm:h-16 sm:w-16">
                        +{routine.hiddenPreviewCount}
                      </div>
                    ) : null}
                    {routine.preview.length === 0 ? (
                      <div className="grid h-14 flex-1 place-items-center border border-dashed border-[color:var(--border)] bg-[color:var(--bg)] text-xs font-black text-[color:var(--text-muted)] sm:h-16">
                        Sin ejercicios
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-5 flex min-h-11 items-center justify-between gap-3 border-t border-[#ecd7d0] pt-3 dark:border-[#333]">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs font-black text-[color:var(--text)]">
                      <span className="inline-flex items-center gap-1.5">
                        <Dumbbell className="h-3.5 w-3.5 text-[#9f3518] dark:text-[#e2ff00]" />
                        {routine.totalExerciseCount} ejercicios
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Layers3 className="h-3.5 w-3.5 text-[#9f3518] dark:text-[#e2ff00]" />
                        {routine.totalSets} series
                      </span>
                    </div>
                    {isSystemRoutine ? (
                      <span className="theme-accent-text shrink-0 text-xs font-black uppercase">
                        {ROUTINE_LEVEL_LABELS[routine.level] || "Base"}
                      </span>
                    ) : isManagedClient ? (
                      <span className="theme-accent-text shrink-0 text-xs font-black uppercase">
                        Coach
                      </span>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}

          {!routineCards.length ? (
            <div className="border-y border-[color:var(--border)] py-12 text-center md:col-span-2 xl:col-span-3">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-lg bg-[color:var(--bg)]">
                <Layers3 className="h-5 w-5 text-[color:var(--text-muted)]" />
              </div>
              <p className="text-sm font-black text-[color:var(--text)]">
                {hasActiveRoutineFilters
                  ? "No encontramos esa rutina."
                  : "No hay rutinas para tu gimnasio actual."}
              </p>
              <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                {hasActiveRoutineFilters
                  ? "Prueba con otra búsqueda o sede."
                  : isManagedClient
                    ? "Consulta con tu coach para ajustar la planificación."
                    : "Puedes crear una nueva desde aquí."}
              </p>
              {hasActiveRoutineFilters || !isManagedClient ? (
                <Button
                  className="mt-4"
                  onClick={() => {
                    if (hasActiveRoutineFilters) {
                      setSearchTerm("");
                      setActiveBranch("all");
                    } else {
                      openCreate();
                    }
                  }}
                >
                  {hasActiveRoutineFilters ? "Limpiar filtros" : "Nueva rutina"}
                </Button>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {!activePlan && !isManagedClient ? (
        <button
          type="button"
          onClick={() =>
            workspaceView === "plans" ? setPlanModalOpen(true) : openCreate()
          }
          className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-30 grid h-14 w-14 place-items-center rounded-full bg-[#ff5722] text-white shadow-[0_8px_24px_rgba(255,87,34,0.35)] transition active:scale-95 dark:bg-[#e2ff00] dark:text-black dark:shadow-[0_8px_24px_rgba(226,255,0,0.2)] md:hidden"
          aria-label={
            workspaceView === "plans" ? "Nueva planificaciÃ³n" : "Nueva rutina"
          }
        >
          <Plus className="h-6 w-6" />
        </button>
      ) : null}

      {viewingPlanTemplate && !viewingRoutine ? (
        <PlanTemplateDetailsModal
          template={viewingPlanTemplate}
          routines={routines}
          onClose={() => setViewingPlanTemplate(null)}
          onOpenRoutine={setViewingRoutine}
          onEdit={(template) => {
            setViewingPlanTemplate(null);
            setEditingPlan(template);
            setPlanModalOpen(true);
          }}
          onDuplicate={async (template) => {
            await duplicatePlanTemplate(template);
            setViewingPlanTemplate(null);
          }}
        />
      ) : null}
      {viewingRoutine ? (
        <RoutineDetailsModal
          routine={viewingRoutine}
          onClose={() => setViewingRoutine(null)}
          canEdit={
            !isManagedClient && viewingRoutine.visibility !== "system"
          }
          onEdit={openEdit}
          onDuplicate={
            !isManagedClient && viewingRoutine.visibility === "system"
              ? async (routine) => {
                  await handleDuplicateRoutine(routine);
                  setViewingRoutine(null);
                }
              : null
          }
        />
      ) : null}

      {modalMode && !isManagedClient && (
        <RoutineModal
          mode={modalMode}
          initialData={selectedRoutine}
          availableExercises={availableExercises}
          existingRoutines={routines}
          libraryLoading={trainingDataLoading && !libraryExercises.length}
          libraryError={!libraryExercises.length ? trainingDataError : null}
          locationMode={locationMode}
          defaultBranch={preferredBranch}
          allowedBranches={allowedBranches}
          onRetryLibrary={() => window.location.reload()}
          onSave={handleSave}
          onClose={closeModal}
          onOpenLibrary={() => {
            setSelectedRoutine(null);
            setModalMode(null);
            onNavigate?.("library");
          }}
        />
      )}
      {planDayChoice && !isManagedClient ? (
        <PlanRoutineChoiceModal
          day={planDayChoice}
          routines={routines}
          onAssign={assignExistingRoutine}
          onCreate={() => {
            const day = planDayChoice;
            setPlanDayChoice(null);
            openCreate(day, { replacing: Boolean(day.routineId) });
          }}
          onClose={() => setPlanDayChoice(null)}
        />
      ) : null}
      {archivePlanConfirmOpen ? (
        <Modal
          title="Archivar borrador"
          subtitle={activePlan?.name}
          onClose={() => setArchivePlanConfirmOpen(false)}
          footer={
            <div className="flex w-full justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setArchivePlanConfirmOpen(false)}
              >
                Cancelar
              </Button>
              <Button onClick={archiveDraftPlan}>Archivar</Button>
            </div>
          }
        >
          <p className="py-2 text-sm font-semibold text-[color:var(--text-muted)]">
            Las rutinas guardadas se conservarán. La planificación dejará de
            aparecer como pendiente.
          </p>
        </Modal>
      ) : null}
      {deletePlanConfirmOpen ? (
        <Modal
          title="Eliminar planificación"
          subtitle={activePlan?.name}
          onClose={() => setDeletePlanConfirmOpen(false)}
          footer={
            <div className="flex w-full justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeletePlanConfirmOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="outline"
                className="border-red-500/30 text-red-600 hover:border-red-500"
                onClick={deleteCurrentPlan}
              >
                Eliminar
              </Button>
            </div>
          }
        >
          <p className="py-2 text-sm font-semibold text-[color:var(--text-muted)]">
            Se eliminará la planificación. Las rutinas personales utilizadas en
            ella se conservarán.
          </p>
        </Modal>
      ) : null}
      {planModalOpen && !isManagedClient ? (
        <CoachPlanModal
          athlete={{
            name: isCoach
              ? "Plantilla reutilizable"
              : user?.name || "Mi planificacion",
          }}
          templates={isCoach ? routines : []}
          planTemplates={planTemplates}
          initialData={editingPlan}
          manageRoutinesSeparately={!isCoach}
          onSave={saveTrainingPlan}
          onClose={() => {
            setPlanModalOpen(false);
            setEditingPlan(null);
          }}
        />
      ) : null}
      {!isManagedClient ? (
        <DeleteRoutineSheet
          routine={routineToDelete}
          onConfirm={confirmDeleteRoutine}
          onClose={closeDeleteRoutine}
        />
      ) : null}
    </div>
  );
}

export default Routines;
