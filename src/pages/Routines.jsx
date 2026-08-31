import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
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
  GripVertical,
  History,
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
import { buildRoutineExerciseOptionMap } from "../utils/routineExerciseOptions";
import { planStartsInFuture } from "../utils/trainingPlanDates";
import { useRoutines } from "../context/RoutineContext";
import { useTrainingData } from "../context/TrainingContext";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/button";
import Badge from "../components/ui/badge";
import { api } from "../services/api";
import CoachPlanModal from "../components/coach/CoachPlanModal";
import CoachPlanTemplates from "../components/coach/CoachPlanTemplates";
import ExerciseThumbnail from "../components/analytics/ExerciseThumbnail";
import OperationLoader from "../components/system/OperationLoader";
import MobilePageHeader from "../components/layout/MobilePageHeader";
import planningOverviewImage from "../assets/planning-overview.webp";
import { optionMatches, toArray } from "../constants/exerciseTaxonomy";

const BRANCH_OPTIONS = ["sopocachi", "miraflores"];
const DEFAULT_BRANCH = "sopocachi";
const ROUTINE_LEVEL_LABELS = {
  beginner: "Principiante",
  intermediate: "Intermedio",
  advanced: "Avanzado",
};
const ROUTINE_EXERCISE_FILTERS = [
  { key: "equipment", value: "Sin equipamiento", label: "Sin equipo" },
  { key: "equipment", value: "Mancuernas", label: "Mancuernas" },
  { key: "equipment", value: "Barra", label: "Barra" },
  { key: "equipment", value: "Máquina", label: "Máquinas" },
  { key: "equipment", value: "Polea", label: "Polea" },
  { key: "equipment", value: "Banda elástica", label: "Bandas" },
];

const exerciseMatchesRoutineFilter = (exercise, filter) => {
  if (!filter) return true;
  const equipment = toArray(exercise.equipment);
  if (filter.value === "Sin equipamiento") {
    return (
      !equipment.length ||
      equipment.some(
        (item) =>
          optionMatches(item, "Sin equipamiento") ||
          optionMatches(item, "Peso corporal"),
      )
    );
  }
  return equipment.some((item) => optionMatches(item, filter.value));
};
const ROUTINE_DETAIL_HERO_IMAGES = Object.freeze({
  "lower a": "/images/routine-lower-a.webp",
  upper: "/images/routine-upper.webp",
  "lower b": "/images/workout-hero-model.webp",
  push: "/images/routine-push.webp",
  pull: "/images/routine-pull.webp",
});
const getRoutineDetailHeroImage = (routine) => {
  const routineName = String(routine?.name || routine?.raw?.name || "")
    .trim()
    .toLocaleLowerCase("es")
    .replace(/\s+/g, " ");
  return (
    ROUTINE_DETAIL_HERO_IMAGES[routineName] || "/images/workout-hero-model.webp"
  );
};
const ROUTINE_EXERCISE_SEARCH_FIELDS =
  "name,localizedNames,nameSpanish,nameEnglish,slug,aliases,category,categories,bodyRegion,navigationRegion,primaryMuscleGroup,muscle,primaryMuscle,movementPattern,movementPatterns,equipment,loadType,weightConfig,exerciseType,laterality,difficulty,goals,tags,branches,type,ownerId,image,imagePublicId,media.image,media.thumbnail,thumb,supportsUnilateral,movementMode,isActive";
const getEntityId = (value) => String(value?._id || value?.id || value || "");
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
const PLAN_DAY_NAMES = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];
const PLAN_DAY_INITIALS = ["L", "M", "X", "J", "V", "S", "D"];
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
const getPlanWeekIndex = (plan, now = new Date()) => {
  if (!plan?.startDate) return 0;
  const start = new Date(plan.startDate);
  start.setUTCHours(0, 0, 0, 0);
  const today = new Date(now);
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

// Exported for deterministic date-state coverage alongside this page.
// eslint-disable-next-line react-refresh/only-export-components
export const getPlanTodayState = ({
  plan,
  routines = [],
  trainings = [],
  now = new Date(),
}) => {
  if (!plan) return null;
  const schedule = Array.isArray(plan.weeklySchedule)
    ? plan.weeklySchedule
    : [];
  if (!schedule.length) return null;

  const sequential = plan.scheduleMode !== "fixed";
  const index = sequential
    ? Math.min(
        schedule.length - 1,
        Math.max(0, Number(plan.cycleProgress?.currentIndex || 0)),
      )
    : schedule.findIndex((_, dayIndex) => {
        const date = getPlanDayDate(
          plan,
          getPlanWeekIndex(plan, now),
          dayIndex,
        );
        return toPlanIsoDate(date) === now.toLocaleDateString("en-CA");
      });
  const day = schedule[index];
  if (!day) return null;

  const routine = day.routineId
    ? routines.find((item) => getEntityId(item) === String(day.routineId)) ||
      null
    : null;
  const todayIso = now.toLocaleDateString("en-CA");
  const isCompleted = !sequential
    ? trainings.some((training) => {
        if (String(training.date || "").slice(0, 10) !== todayIso) {
          return false;
        }
        return (
          (training.trainingPlanId &&
            String(training.trainingPlanId) === getEntityId(plan) &&
            training.trainingPlanSlotId === day.slotId) ||
          (day.routineId &&
            String(training.routineId) === String(day.routineId))
        );
      })
    : false;

  return {
    day,
    index,
    isCompleted,
    isRest: day.type !== "training",
    routine,
    sequential,
  };
};
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
  const browserCrypto = typeof window !== "undefined" ? window.crypto : null;
  const uniquePart =
    browserCrypto && typeof browserCrypto.randomUUID === "function"
      ? browserCrypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
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

const normalizeSearchText = (text = "") =>
  text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const toSearchArray = (value) =>
  Array.isArray(value) ? value : value ? [value] : [];

const getExerciseSearchRank = (exercise, query) => {
  if (!query) return 0;
  const name = normalizeSearchText(exercise.name);
  const localizedNames = [
    exercise.localizedNames?.es,
    exercise.localizedNames?.en,
    exercise.nameSpanish,
    exercise.nameEnglish,
  ]
    .map(normalizeSearchText)
    .filter(Boolean);
  const aliases = toSearchArray(exercise.aliases)
    .map(normalizeSearchText)
    .filter(Boolean);
  if (name === query || localizedNames.includes(query)) return 0;
  if (
    name.startsWith(query) ||
    localizedNames.some((value) => value.startsWith(query))
  ) {
    return 1;
  }
  if (aliases.includes(query)) return 2;
  if (
    name.includes(query) ||
    localizedNames.some((value) => value.includes(query)) ||
    aliases.some((value) => value.includes(query))
  ) {
    return 3;
  }
  return 4;
};

const useDebouncedValue = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timeout);
  }, [delay, value]);
  return debounced;
};

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
            <Archive className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-600">
              Archivar rutina
            </p>
            <h3 className="mt-1 truncate text-lg font-black">{routine.name}</h3>
            <p className="mt-1 text-sm font-semibold text-[color:var(--text-muted)]">
              {routine.plan
                ? `Esta rutina se usa en ${routine.plan.name}. Primero debes reemplazarla en esa planificación.`
                : "Dejará de aparecer en tu biblioteca, pero podrás recuperarla posteriormente."}
            </p>
          </div>
        </div>

        {routine.plan ? (
          <div className="mt-5 border border-amber-300 bg-amber-50 p-3 text-xs font-bold text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            El archivado está bloqueado mientras la rutina figure en una
            planificación. Usa “Cambiar rutina” en ese día y vuelve a
            intentarlo.
          </div>
        ) : (
          <div className="mt-5">
            <SlideToConfirm
              label="Desliza para archivar"
              ariaLabel="Deslizar para confirmar archivado"
              onConfirm={onConfirm}
            />
          </div>
        )}

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
  const thumb = getExerciseImageUrl(option, { width: 192, height: 192 });
  const usageCount =
    option.usageByBranch?.[branch]?.count || option.usageCount || 0;

  return (
    <button
      type="button"
      onClick={() => onToggle(option.id)}
      aria-pressed={selected}
      className={`grid min-h-[108px] w-full grid-cols-[80px_minmax(0,1fr)_28px] items-center gap-4 px-0 py-3 text-left transition ${selected ? "theme-accent-solid" : "bg-[color:var(--card)]"}`}
    >
      <div className="h-20 w-20 overflow-hidden rounded-[18px] bg-[color:var(--surface-subtle)]">
        <ExerciseThumbnail
          src={thumb}
          alt=""
          fallback={(option.name || "?").charAt(0).toUpperCase()}
          className="h-full w-full text-xs font-semibold"
        />
      </div>
      <div className="min-w-0">
        <p
          className={`line-clamp-2 text-[18px] font-medium leading-[1.2] tracking-[-0.015em] ${selected ? "text-[color:var(--accent-contrast)]" : "text-[color:var(--text)]"}`}
        >
          {option.name}
        </p>
        <p
          className={`mt-2 truncate text-base leading-5 ${selected ? "text-[color:var(--accent-contrast)] opacity-75" : "text-[color:var(--text-muted)]"}`}
        >
          {showUsage && usageCount
            ? `${usageCount} ${usageCount === 1 ? "sesión" : "sesiones"}`
            : option.muscle}
        </p>
      </div>
      <span
        className={`grid h-7 w-7 place-items-center rounded-full border transition ${
          selected
            ? "border-[color:var(--accent-contrast)] bg-[color:var(--accent-contrast)] text-[color:var(--accent)]"
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
  searchScopeKey = "self",
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
  const debouncedExerciseSearch = useDebouncedValue(search.trim());
  const remoteExerciseSearch = useQuery({
    queryKey: [
      "routine-exercise-search",
      searchScopeKey,
      debouncedExerciseSearch,
    ],
    queryFn: () =>
      api.getExercises({
        fields: ROUTINE_EXERCISE_SEARCH_FIELDS,
        limit: 200,
        page: 1,
        meta: true,
        q: debouncedExerciseSearch,
      }),
    enabled: Boolean(debouncedExerciseSearch),
    staleTime: 30 * 1000,
  });
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
  const [alternativePickerFilter, setAlternativePickerFilter] = useState(null);
  const alternativePickerFilterStripRef = useRef(null);
  const [optionsExerciseId, setOptionsExerciseId] = useState(null);
  const [exercisePickerOpen, setExercisePickerOpen] = useState(false);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState([]);
  const [exercisePickerFilter, setExercisePickerFilter] = useState(null);
  const exercisePickerFilterStripRef = useRef(null);
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

  const availableExerciseById = useMemo(
    () =>
      new Map(
        availableExercises.map((exercise) => [String(exercise.id), exercise]),
      ),
    [availableExercises],
  );

  const remoteExerciseOptions = useMemo(() => {
    const items = Array.isArray(remoteExerciseSearch.data)
      ? remoteExerciseSearch.data
      : remoteExerciseSearch.data?.items || [];
    return items.map((exercise) => {
      const id = exercise._id || exercise.id;
      const existing = availableExerciseById.get(String(id));
      return {
        ...exercise,
        ...existing,
        id,
        name: exercise.name || existing?.name || "Ejercicio",
        localizedNames:
          exercise.localizedNames || existing?.localizedNames || {},
        aliases: Array.from(
          new Set([
            ...toSearchArray(exercise.aliases),
            ...toSearchArray(existing?.aliases),
          ]),
        ),
        muscle:
          exercise.primaryMuscleGroup ||
          exercise.primaryMuscle ||
          exercise.muscle ||
          existing?.muscle ||
          "Sin grupo",
        image:
          exercise.media?.image?.url || exercise.image || existing?.image || "",
        imagePublicId:
          exercise.media?.image?.publicId ||
          exercise.imagePublicId ||
          existing?.imagePublicId ||
          "",
        branches: exercise.branches?.length
          ? exercise.branches
          : existing?.branches || ["general"],
        supportsUnilateral: Boolean(
          exercise.supportsUnilateral || existing?.supportsUnilateral,
        ),
      };
    });
  }, [availableExerciseById, remoteExerciseSearch.data]);

  const selectableExerciseById = useMemo(
    () =>
      buildRoutineExerciseOptionMap(availableExercises, remoteExerciseOptions),
    [availableExercises, remoteExerciseOptions],
  );

  const orderedExercisePickerFilters = useMemo(() => {
    if (!exercisePickerFilter) return ROUTINE_EXERCISE_FILTERS;
    return [
      exercisePickerFilter,
      ...ROUTINE_EXERCISE_FILTERS.filter(
        (option) =>
          option.key !== exercisePickerFilter.key ||
          option.value !== exercisePickerFilter.value,
      ),
    ];
  }, [exercisePickerFilter]);

  const orderedAlternativePickerFilters = useMemo(() => {
    if (!alternativePickerFilter) return ROUTINE_EXERCISE_FILTERS;
    return [
      alternativePickerFilter,
      ...ROUTINE_EXERCISE_FILTERS.filter(
        (option) =>
          option.key !== alternativePickerFilter.key ||
          option.value !== alternativePickerFilter.value,
      ),
    ];
  }, [alternativePickerFilter]);

  useEffect(() => {
    if (!exercisePickerOpen) return;
    const frame = window.requestAnimationFrame(() => {
      exercisePickerFilterStripRef.current?.scrollTo({
        left: 0,
        behavior: "smooth",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [exercisePickerFilter, exercisePickerOpen]);

  useEffect(() => {
    if (!alternativePickerExercise) return;
    const frame = window.requestAnimationFrame(() => {
      alternativePickerFilterStripRef.current?.scrollTo({
        left: 0,
        behavior: "smooth",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [alternativePickerExercise, alternativePickerFilter]);

  const exercisePickerOptions = useMemo(() => {
    const query = normalizeSearchText(search);
    const debouncedQuery = normalizeSearchText(debouncedExerciseSearch);
    const sourceExercises = query
      ? query === debouncedQuery
        ? remoteExerciseOptions
        : []
      : availableExercises;
    const currentIds = new Set(
      exercises.map((exercise) => exercise.exerciseId),
    );
    const sortedOptions = sourceExercises
      .filter((ex) => exerciseMatchesBranch(ex, exerciseFilterBranch))
      .filter((ex) => query || !selectedMuscle || ex.muscle === selectedMuscle)
      .filter((ex) => exerciseMatchesRoutineFilter(ex, exercisePickerFilter))
      .filter((ex) => !currentIds.has(ex.id))
      .sort(
        (a, b) =>
          getExerciseSearchRank(a, query) - getExerciseSearchRank(b, query) ||
          (b.usageByBranch?.[exerciseFilterBranch]?.count || 0) -
            (a.usageByBranch?.[exerciseFilterBranch]?.count || 0) ||
          (b.usageCount || 0) - (a.usageCount || 0) ||
          (b.lastUsedAt || 0) - (a.lastUsedAt || 0) ||
          a.name.localeCompare(b.name),
      );
    if (query) return sortedOptions.slice(0, 200);
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
    debouncedExerciseSearch,
    exerciseFilterBranch,
    exercises,
    exercisePickerFilter,
    remoteExerciseOptions,
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

  const isExerciseSearchActive = Boolean(normalizeSearchText(search));
  const isExerciseSearchPending = Boolean(
    isExerciseSearchActive &&
    (normalizeSearchText(search) !==
      normalizeSearchText(debouncedExerciseSearch) ||
      remoteExerciseSearch.isFetching),
  );

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
    setExercisePickerFilter(null);
    setSearch("");
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
      .map((exerciseId) => selectableExerciseById.get(String(exerciseId)))
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
      setExercisePickerFilter(null);
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
        !existing.has(option.id) &&
        exerciseMatchesRoutineFilter(option, alternativePickerFilter),
    );
  }, [
    alternativePickerExercise,
    alternativePickerFilter,
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
    setAlternativePickerFilter(null);
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
    setAlternativePickerFilter(null);
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
      mobilePage
      title={mode === "create" ? "Nueva rutina" : "Editar rutina"}
      subtitle={null}
      onClose={requestClose}
      size={isSetupStep ? "default" : "wide"}
      footer={
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-center text-xs font-semibold text-[color:var(--text-muted)] sm:text-left">
            {error || (isSetupStep ? "Luego añadirás los ejercicios." : "")}
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
                "Guardar cambios"
              )}
            </Button>
          </div>
        </div>
      }
    >
      <div className="pb-3 text-[color:var(--text)]">
        {mode === "create" ? (
          <div className="mb-5 flex items-center justify-between px-1 text-xs font-semibold text-[color:var(--text-muted)] sm:px-2">
            <span>Paso {isSetupStep ? "1" : "2"} de 2</span>
            <span>{isSetupStep ? "Datos básicos" : "Ejercicios"}</span>
          </div>
        ) : null}
        {isSetupStep ? (
          <div className="mx-auto max-w-xl space-y-4">
            <div className="px-1 sm:px-2">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold leading-tight text-[color:var(--text)]">
                  Crea tu rutina
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-[color:var(--text-muted)]">
                  Ponle un nombre y elige qué vas a entrenar.
                </p>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-[color:var(--text)]">
                  Nombre
                </span>
                <input
                  className="theme-accent-focus h-14 w-full rounded-2xl border-0 bg-[color:var(--card)] px-4 text-base font-medium text-[color:var(--text)] outline-none placeholder:text-[color:var(--text-muted)]"
                  placeholder="Ej. Empuje"
                  value={effectiveRoutineName}
                  onChange={(e) => {
                    setNameEdited(true);
                    setName(e.target.value);
                  }}
                />
              </label>

              <div className="mt-6 space-y-2.5">
                <div>
                  <p className="text-sm font-medium text-[color:var(--text)]">
                    ¿Qué vas a entrenar?
                  </p>
                  <p className="mt-0.5 text-xs text-[color:var(--text-muted)]">
                    Elige una base. Podrás cambiar los ejercicios después.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {ROUTINE_TYPES.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => handleRoutineTypeSelect(type.id)}
                      className={`h-12 rounded-xl border px-3 text-left text-sm font-semibold transition ${
                        routineType === type.id
                          ? "theme-accent-solid border-transparent"
                          : "border-transparent bg-[color:var(--card)] text-[color:var(--text)]"
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
                <p className="px-1 text-xs text-[color:var(--text-muted)]">
                  {selectedRoutineType.description}
                </p>
              </div>

              {routineType === "custom" ? (
                <div className="mt-6 space-y-2.5">
                  <div>
                    <p className="text-sm font-medium text-[color:var(--text)]">
                      Grupos musculares
                    </p>
                    <p className="mt-0.5 text-xs text-[color:var(--text-muted)]">
                      Selecciona uno o varios.
                    </p>
                  </div>
                  <span className="sr-only">Grupos musculares</span>
                  {libraryLoading ? (
                    <div className="flex h-16 items-center justify-center gap-2 rounded-2xl bg-[color:var(--card)] text-xs font-medium text-[color:var(--text-muted)]">
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
                            className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                              active
                                ? "theme-accent-solid border-transparent"
                                : "border-transparent bg-[color:var(--card)] text-[color:var(--text-muted)]"
                            }`}
                          >
                            {muscle}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-[color:var(--card)] p-4 text-xs text-[color:var(--text-muted)]">
                      No hay grupos musculares disponibles en la biblioteca.
                    </div>
                  )}
                </div>
              ) : null}

              {locationMode === "multiple" || progressSourceOptions.length ? (
                <details className="group mt-6 rounded-2xl bg-[color:var(--card)] px-4 py-1">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-[color:var(--text)] [&::-webkit-details-marker]:hidden">
                    <span>
                      Opciones avanzadas
                      <span className="ml-2 text-xs font-normal text-[color:var(--text-muted)]">
                        Sede e historial
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-[color:var(--text-muted)] transition-transform group-open:rotate-90" />
                  </summary>
                  <div className="space-y-5 border-t border-[color:var(--border)] py-4">
                    {locationMode === "multiple" ? (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-[color:var(--text-muted)]">
                          Sucursal
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {selectableBranches.map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => handleBranchChange(option)}
                              className={`flex h-11 items-center justify-between rounded-xl border px-3 text-left text-sm transition ${
                                branch === option
                                  ? "theme-accent-solid border-transparent"
                                  : "border-[color:var(--border)] text-[color:var(--text)]"
                              }`}
                            >
                              <span className="font-medium">
                                {branchLabel(option)}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {progressSourceOptions.length ? (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-[color:var(--text-muted)]">
                          Historial de progreso
                        </p>
                        <div className="grid grid-cols-2 gap-1 rounded-xl bg-[color:var(--bg)] p-1">
                          <button
                            type="button"
                            onClick={() => {
                              setProgressMode("fresh");
                              setSourceRoutineId("");
                              setError("");
                            }}
                            className={`h-10 rounded-lg px-2 text-xs font-semibold transition ${
                              progressMode === "fresh"
                                ? "theme-accent-solid"
                                : "text-[color:var(--text-muted)]"
                            }`}
                          >
                            Nuevo ciclo
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
                            className={`h-10 rounded-lg px-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
                              progressMode === "inherit"
                                ? "theme-accent-solid"
                                : "text-[color:var(--text-muted)]"
                            }`}
                          >
                            Continuar historial
                          </button>
                        </div>

                        <p className="text-xs text-[color:var(--text-muted)]">
                          {progressMode === "fresh"
                            ? "Empieza las marcas desde cero."
                            : "Conserva los pesos y mejoras de otra rutina."}
                        </p>

                        {progressMode === "inherit" ? (
                          <label className="block pt-1">
                            <span className="sr-only">Rutina de origen</span>
                            <select
                              value={sourceRoutineId}
                              onChange={(event) =>
                                setSourceRoutineId(event.target.value)
                              }
                              className="theme-accent-focus h-12 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-sm font-medium text-[color:var(--text)] outline-none"
                            >
                              <option value="">
                                Selecciona una rutina anterior
                              </option>
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
                  </div>
                </details>
              ) : null}
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
                        {branchLabel(branch)}
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
                <div className="space-y-4">
                  <label className="block">
                    <span className="text-sm font-medium">
                      Nombre de la rutina
                    </span>
                    <input
                      className="theme-accent-focus mt-2 h-14 w-full rounded-2xl border-0 bg-[color:var(--card)] px-4 text-base font-medium text-[color:var(--text)] outline-none placeholder:text-[color:var(--text-muted)]"
                      placeholder="Ej. Pecho · Bíceps"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </label>
                  {locationMode === "multiple" ? (
                    <div>
                      <span className="text-sm font-medium">Sede</span>
                      <div className="mt-2 grid grid-cols-2 gap-2 rounded-2xl bg-[color:var(--card)] p-2">
                        {selectableBranches.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => handleBranchChange(option)}
                            className={`h-11 rounded-xl px-2 text-xs font-medium transition ${
                              branch === option
                                ? "theme-accent-solid"
                                : "text-[color:var(--text-muted)]"
                            }`}
                          >
                            {branchLabel(option)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              <div className="flex items-end justify-between gap-3 pt-2">
                <div>
                  <h2 className="text-xl font-medium tracking-[-0.025em]">
                    Ejercicios
                  </h2>
                  <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                    {exercises.length}{" "}
                    {exercises.length === 1 ? "ejercicio" : "ejercicios"} ·{" "}
                    {exercises.reduce(
                      (sum, exercise) => sum + (Number(exercise.sets) || 0),
                      0,
                    )}{" "}
                    series
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 rounded-full px-3 text-xs"
                    onClick={handleOpenLibrary}
                    aria-label="Abrir biblioteca de ejercicios"
                    title="Abrir biblioteca de ejercicios"
                  >
                    Biblioteca
                  </Button>
                  <Button
                    size="sm"
                    className="h-10 rounded-full px-3 text-xs"
                    onClick={openExercisePicker}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Agregar
                  </Button>
                </div>
              </div>

              {exercises.length ? (
                <section aria-labelledby="routine-order-title">
                  <div className="mb-2 flex items-baseline justify-between gap-3">
                    <h3
                      id="routine-order-title"
                      className="text-sm font-medium"
                    >
                      Organización
                    </h3>
                    <span className="text-xs text-[color:var(--text-muted)]">
                      Al entrenar
                    </span>
                  </div>
                  <div
                    className="grid grid-cols-2 gap-2"
                    role="radiogroup"
                    aria-label="Organización de la rutina"
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={exerciseOrderMode === "muscle_blocks"}
                      onClick={() =>
                        handleExerciseOrderModeChange("muscle_blocks")
                      }
                      className={`min-h-[68px] rounded-2xl px-3 py-2 text-left transition ${
                        exerciseOrderMode === "muscle_blocks"
                          ? "theme-accent-solid"
                          : "bg-[color:var(--card)] text-[color:var(--text)]"
                      }`}
                    >
                      <span className="block text-sm font-semibold">
                        Por grupos
                      </span>
                      <span className="mt-0.5 block text-[11px] font-normal leading-tight opacity-75">
                        Agrupa músculos
                      </span>
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={exerciseOrderMode === "free"}
                      onClick={() => handleExerciseOrderModeChange("free")}
                      className={`min-h-[68px] rounded-2xl px-3 py-2 text-left transition ${
                        exerciseOrderMode === "free"
                          ? "theme-accent-solid"
                          : "bg-[color:var(--card)] text-[color:var(--text)]"
                      }`}
                    >
                      <span className="block text-sm font-semibold">
                        Orden libre
                      </span>
                      <span className="mt-0.5 block text-[11px] font-normal leading-tight opacity-75">
                        Mezcla y arrastra
                      </span>
                    </button>
                  </div>
                </section>
              ) : null}

              <div className="space-y-2">
                {groupedSelected.map(([muscle, list]) => {
                  const extraOptions = availableExercises.filter(
                    (option) =>
                      exerciseMatchesBranch(option, exerciseFilterBranch) &&
                      option.muscle === muscle,
                  );
                  const selectedExtraIds = selectedExtraByMuscle[muscle] || [];
                  const isGlobalOrderGroup = muscle === GLOBAL_ORDER_GROUP;

                  return (
                    <div
                      key={muscle}
                      className="overflow-hidden rounded-2xl bg-[color:var(--card)]"
                    >
                      {!isGlobalOrderGroup ? (
                        <div className="flex min-h-[62px] items-center gap-1.5 px-3 py-2">
                          <button
                            type="button"
                            onClick={() => toggleMuscleGroup(muscle)}
                            className="min-w-0 flex-1 px-1 py-1 text-left"
                            aria-expanded={!collapsedMuscles.has(muscle)}
                          >
                            <p className="truncate text-sm font-semibold leading-tight text-[color:var(--text)]">
                              {muscle}
                            </p>
                            <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                              {list.length}{" "}
                              {list.length === 1 ? "ejercicio" : "ejercicios"} ·{" "}
                              {list.reduce(
                                (sum, item) => sum + (Number(item.sets) || 0),
                                0,
                              )}{" "}
                              series
                            </p>
                          </button>
                          {extraOptions.length ? (
                            <button
                              type="button"
                              onClick={() => openExtraPicker(muscle)}
                              className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-[color:var(--surface-subtle)] px-3 text-xs font-semibold text-[color:var(--text)] transition hover:text-[color:var(--accent)]"
                              aria-label={`Añadir ejercicio extra a ${muscle}`}
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Extra
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => toggleMuscleGroup(muscle)}
                            className="grid h-9 w-8 shrink-0 place-items-center rounded-full text-[color:var(--text-muted)]"
                            aria-label={`${
                              collapsedMuscles.has(muscle)
                                ? "Mostrar"
                                : "Ocultar"
                            } ejercicios de ${muscle}`}
                            aria-expanded={!collapsedMuscles.has(muscle)}
                          >
                            <ChevronDown
                              className={`h-5 w-5 transition-transform ${
                                collapsedMuscles.has(muscle) ? "" : "rotate-180"
                              }`}
                            />
                          </button>
                        </div>
                      ) : null}

                      {(isGlobalOrderGroup ||
                        !collapsedMuscles.has(muscle)) && (
                        <div
                          className={`divide-y divide-[color:var(--detail-row-divider)] ${
                            isGlobalOrderGroup
                              ? ""
                              : "border-t border-[color:var(--detail-row-divider)]"
                          }`}
                        >
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
                                  width: 192,
                                  height: 192,
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
                                        className={`min-h-[108px] px-3 py-3 ${
                                          isDragging
                                            ? "relative z-10 rounded-xl bg-[color:var(--card)] shadow-xl ring-2 ring-[color:var(--accent)]/20"
                                            : ""
                                        }`}
                                      >
                                        <div className="grid grid-cols-[20px_80px_minmax(0,1fr)_44px_32px] items-center gap-2 sm:grid-cols-[24px_80px_minmax(0,1fr)_52px_36px] sm:gap-3">
                                          <span className="text-center text-xs font-medium tabular-nums text-[color:var(--text-muted)]">
                                            {ex.idx + 1}
                                          </span>
                                          <div className="h-20 w-20 overflow-hidden rounded-[18px] bg-[color:var(--surface-subtle)]">
                                            <ExerciseThumbnail
                                              src={thumb}
                                              alt=""
                                              fallback={(ex.name || "?")
                                                .charAt(0)
                                                .toUpperCase()}
                                              className="h-full w-full text-xs font-black"
                                            />
                                          </div>

                                          <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                              <p className="min-w-0 line-clamp-2 text-sm font-semibold leading-tight">
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
                                            <div className="mt-1.5 flex items-center gap-2">
                                              <p className="min-w-0 truncate text-xs font-normal text-[color:var(--text-muted)]">
                                                {ex.muscle || "Sin grupo"}
                                              </p>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setOptionsExerciseId(
                                                    ex.exerciseId,
                                                  )
                                                }
                                                className="h-7 shrink-0 rounded-full bg-[color:var(--surface-subtle)] px-2.5 text-[11px] font-semibold text-[color:var(--text)] transition hover:text-[color:var(--accent)]"
                                                aria-label={`Configurar ${ex.name}`}
                                              >
                                                Configurar
                                              </button>
                                            </div>
                                          </div>

                                          <label className="space-y-0.5">
                                            <span className="block text-center text-[8px] font-medium uppercase text-[color:var(--text-muted)] sm:text-[9px]">
                                              Series
                                            </span>
                                            <input
                                              type="text"
                                              inputMode="numeric"
                                              pattern="[0-9]*"
                                              enterKeyHint="done"
                                              aria-label={`Series de ${ex.name}`}
                                              className="theme-accent-focus h-10 w-11 rounded-xl border-0 bg-[color:var(--surface-subtle)] px-1 text-center text-sm font-semibold tabular-nums text-[color:var(--text)] outline-none sm:w-14"
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

                                          <div className="flex items-center justify-end">
                                            <button
                                              type="button"
                                              className="grid h-10 w-8 touch-none place-items-center rounded-full p-0 text-[color:var(--text-muted)] sm:w-9"
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
                                      width: 160,
                                      height: 160,
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
                                        className={`grid grid-cols-[64px_minmax(0,1fr)_22px] items-center gap-2 rounded-xl border p-2 text-left transition ${
                                          selected
                                            ? "border-blue-400 bg-blue-500/10"
                                            : "border-[color:var(--border)] bg-[color:var(--card)]"
                                        }`}
                                      >
                                        <div className="h-16 w-16 overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)]">
                                          <ExerciseThumbnail
                                            src={thumb}
                                            alt=""
                                            fallback={(option.name || "?")
                                              .charAt(0)
                                              .toUpperCase()}
                                            className="h-full w-full text-xs font-black"
                                          />
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
          <div className="fixed inset-0 z-[90] flex items-end bg-black/45 px-0 sm:items-center sm:justify-center sm:p-4">
            <div className="flex max-h-[86vh] w-full flex-col overflow-hidden rounded-t-[1.75rem] bg-[color:var(--bg)] shadow-2xl sm:max-w-lg sm:rounded-[1.75rem]">
              <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[color:var(--border)] sm:hidden" />
              <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-3 pt-4">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[color:var(--text-muted)]">
                    Añadir extras
                  </p>
                  <h3 className="mt-0.5 truncate text-xl font-semibold tracking-[-0.02em] text-[color:var(--text)]">
                    {extraPickerMuscle}
                  </h3>
                  <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                    Quedarán disponibles fuera del recorrido principal.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setExtraPickerMuscle(null)}
                  className="h-9 shrink-0 px-1 text-sm font-semibold text-[color:var(--accent)]"
                >
                  Cancelar
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
                {extraPickerOptions.length ? (
                  <div className="divide-y divide-[color:var(--border)] overflow-hidden rounded-2xl bg-[color:var(--card)]">
                    {extraPickerOptions.map((option) => {
                      const selected = pickerSelectedExtraIds.includes(
                        option.id,
                      );
                      const thumb = getExerciseImageUrl(option, {
                        width: 160,
                        height: 160,
                      });
                      return (
                        <button
                          key={option.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() =>
                            toggleExtraSelection(extraPickerMuscle, option.id)
                          }
                          className={`grid min-h-[108px] w-full grid-cols-[80px_minmax(0,1fr)_28px] items-center gap-4 px-0 py-3 text-left transition ${
                            selected
                              ? "bg-[color:var(--surface-subtle)]"
                              : "hover:bg-[color:var(--surface-subtle)]"
                          }`}
                        >
                          <div className="h-20 w-20 overflow-hidden rounded-[18px] bg-[color:var(--surface-subtle)]">
                            <ExerciseThumbnail
                              src={thumb}
                              alt=""
                              fallback={(option.name || "?")
                                .charAt(0)
                                .toUpperCase()}
                              className="h-full w-full text-xs font-semibold"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="line-clamp-2 text-[18px] font-medium leading-[1.2] tracking-[-0.015em] text-[color:var(--text)]">
                              {option.name}
                            </p>
                            <p className="mt-2 truncate text-base leading-5 text-[color:var(--text-muted)]">
                              {option.muscle || extraPickerMuscle}
                            </p>
                          </div>
                          <span
                            className={`grid h-7 w-7 place-items-center rounded-full border transition ${
                              selected
                                ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-white"
                                : "border-[color:var(--border)] text-transparent"
                            }`}
                          >
                            <Check className="h-4 w-4" aria-hidden="true" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-[color:var(--card)] p-5 text-center text-sm text-[color:var(--text-muted)]">
                    No hay ejercicios disponibles para este grupo.
                  </div>
                )}
              </div>

              <div className="shrink-0 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-2">
                <Button
                  className="h-12 w-full rounded-2xl text-sm"
                  disabled={!pickerSelectedExtraIds.length}
                  onClick={() => confirmExtraSelection(extraPickerMuscle)}
                >
                  {pickerSelectedExtraIds.length
                    ? `Añadir ${pickerSelectedExtraIds.length} extra${pickerSelectedExtraIds.length === 1 ? "" : "s"}`
                    : "Selecciona un ejercicio"}
                </Button>
              </div>
            </div>
          </div>
        )}
        {exercisePickerOpen && (
          <div className="fixed inset-0 z-[80] flex justify-center bg-[color:var(--bg)]">
            <div className="flex h-[100dvh] w-full max-w-2xl flex-col overflow-hidden bg-[color:var(--bg)]">
              <div className="grid h-16 shrink-0 grid-cols-[44px_minmax(0,1fr)_44px] items-center border-b border-[color:var(--border)] px-3">
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
                  className="grid h-11 w-11 place-items-center rounded-full text-[color:var(--text)] transition hover:bg-[color:var(--card)]"
                  aria-label="Volver"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <h3 className="truncate text-center text-base font-medium text-[color:var(--text)]">
                  Elegir ejercicios
                </h3>
                <span aria-hidden="true" />
              </div>

              <div className="shrink-0 px-4 pb-3 pt-4">
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-lg font-medium text-[color:var(--text)]">
                      Añade tus ejercicios
                    </p>
                    <p className="mt-0.5 text-xs text-[color:var(--text-muted)]">
                      Toca un ejercicio para seleccionarlo.
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-[color:var(--text-muted)]">
                    {selectedExerciseIds.length
                      ? `${selectedExerciseIds.length} elegido${selectedExerciseIds.length === 1 ? "" : "s"}`
                      : "Ninguno elegido"}
                  </span>
                </div>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
                  <input
                    type="search"
                    autoComplete="off"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar ejercicio"
                    className="theme-accent-focus h-12 w-full rounded-2xl border-0 bg-[color:var(--card)] pl-11 pr-4 text-sm text-[color:var(--text)] outline-none placeholder:text-[color:var(--text-muted)]"
                  />
                </div>
                <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {pickerMuscleOptions.map((muscle) => {
                    const selectedCount =
                      exercises.filter((exercise) => exercise.muscle === muscle)
                        .length +
                      selectedExerciseIds.filter(
                        (exerciseId) =>
                          selectableExerciseById.get(String(exerciseId))
                            ?.muscle === muscle,
                      ).length;
                    const isActive =
                      !isExerciseSearchActive && selectedMuscle === muscle;
                    return (
                      <button
                        key={muscle}
                        type="button"
                        onClick={() => {
                          setSelectedMuscle(muscle);
                          setExercisePickerFilter(null);
                          setSearch("");
                        }}
                        className={`h-9 shrink-0 rounded-full border px-3 text-xs font-medium transition ${
                          isActive
                            ? "theme-accent-solid border-transparent"
                            : "border-transparent bg-[color:var(--card)] text-[color:var(--text-muted)]"
                        }`}
                      >
                        {muscle}
                        {selectedCount ? ` ${selectedCount}` : ""}
                      </button>
                    );
                  })}
                </div>
                <motion.div
                  layout
                  ref={exercisePickerFilterStripRef}
                  className="-mx-4 mt-2 flex gap-2.5 overflow-x-auto border-t border-[color:var(--detail-row-divider)] px-4 pb-1 pt-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  role="group"
                  aria-label="Filtrar ejercicios por equipamiento"
                >
                  <AnimatePresence initial={false}>
                    {exercisePickerFilter ? (
                      <motion.button
                        layout
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        type="button"
                        onClick={() => setExercisePickerFilter(null)}
                        className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-[color:var(--border-strong)] px-4 text-sm font-medium text-[color:var(--text)]"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restablecer
                      </motion.button>
                    ) : null}
                  </AnimatePresence>
                  {orderedExercisePickerFilters.map((option) => {
                    const active =
                      exercisePickerFilter?.key === option.key &&
                      exercisePickerFilter?.value === option.value;
                    const locked = Boolean(exercisePickerFilter && !active);
                    return (
                      <motion.button
                        layout
                        key={`${option.key}-${option.value}`}
                        type="button"
                        aria-pressed={active}
                        aria-disabled={locked}
                        tabIndex={locked ? -1 : 0}
                        onClick={() => {
                          if (!locked) setExercisePickerFilter(option);
                        }}
                        className={`h-11 shrink-0 rounded-full px-3 text-sm font-medium transition-[opacity,transform,background-color,color] duration-300 ${
                          active
                            ? "scale-[1.02] bg-[#251a12] text-[#fffdf8] dark:bg-[#e2ff00] dark:text-black"
                            : locked
                              ? "cursor-default bg-[#ece8e0] text-[#c8c2b8] dark:bg-[#20201e] dark:text-[#666661]"
                              : "bg-[color:var(--surface-subtle)] text-[color:var(--text)]"
                        }`}
                      >
                        {option.label}
                      </motion.button>
                    );
                  })}
                </motion.div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
                {isExerciseSearchActive || exercisePickerFilter ? (
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-xs font-medium text-[color:var(--text-muted)]">
                      {exercisePickerFilter
                        ? exercisePickerFilter.label
                        : "Resultados"}
                    </p>
                    <span className="text-xs tabular-nums text-[color:var(--text-muted)]">
                      {isExerciseSearchPending
                        ? "..."
                        : exercisePickerOptions.length}
                    </span>
                  </div>
                ) : null}
                {isExerciseSearchPending ? (
                  <div className="grid min-h-32 place-items-center rounded-2xl bg-[color:var(--card)] text-center text-[color:var(--text-muted)]">
                    <span>
                      <Loader2 className="theme-accent-text mx-auto h-5 w-5 animate-spin" />
                      <span className="mt-2 block text-xs font-medium">
                        Buscando ejercicios
                      </span>
                    </span>
                  </div>
                ) : isExerciseSearchActive && remoteExerciseSearch.isError ? (
                  <div className="rounded-2xl bg-[color:var(--card)] p-4 text-center">
                    <p className="text-sm text-[color:var(--text-muted)]">
                      No se pudo consultar el catálogo.
                    </p>
                    <button
                      type="button"
                      onClick={() => remoteExerciseSearch.refetch()}
                      className="theme-accent-text mt-3 text-xs font-semibold"
                    >
                      Reintentar
                    </button>
                  </div>
                ) : exercisePickerOptions.length ? (
                  <>
                    {frequentExerciseOptions.length ? (
                      <section className="mb-5">
                        <div className="mb-2 flex items-end justify-between gap-3 px-1">
                          <div>
                            <p className="text-sm font-medium text-[color:var(--text)]">
                              Usados recientemente
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={toggleFrequentSelection}
                            className="theme-accent-text h-8 shrink-0 px-1 text-xs font-medium"
                          >
                            {allFrequentSelected
                              ? "Quitar selección"
                              : "Seleccionar todos"}
                          </button>
                        </div>
                        <div className="divide-y divide-[color:var(--border)] overflow-hidden rounded-2xl bg-[color:var(--card)]">
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
                      <p className="mb-2 px-1 text-sm font-medium text-[color:var(--text)]">
                        Todos los ejercicios
                      </p>
                    ) : null}
                    <div className="divide-y divide-[color:var(--border)] overflow-hidden rounded-2xl bg-[color:var(--card)]">
                      {regularExerciseOptions.map((option) => (
                        <ExercisePickerOption
                          key={option.id}
                          option={option}
                          selected={selectedExerciseIds.includes(option.id)}
                          branch={exerciseFilterBranch}
                          onToggle={toggleExerciseSelection}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl bg-[color:var(--card)] p-5 text-center text-sm text-[color:var(--text-muted)]">
                    {isExerciseSearchActive
                      ? `No encontramos “${search.trim()}”. Prueba con otro nombre, alias o grupo muscular.`
                      : exercisePickerFilter
                        ? "No hay ejercicios disponibles. Restablece el filtro para ver todas las opciones."
                        : "No hay ejercicios disponibles con este filtro."}
                  </div>
                )}
              </div>

              <div className="shrink-0 border-t border-[color:var(--border)] bg-[color:var(--card)] px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
                <Button
                  className="h-12 w-full rounded-2xl text-sm"
                  disabled={!selectedExerciseIds.length}
                  onClick={addSelectedExercises}
                >
                  {selectedExerciseIds.length
                    ? nextPendingMuscle
                      ? `Añadir ${selectedExerciseIds.length} y seguir con ${nextPendingMuscle}`
                      : `Añadir ${selectedExerciseIds.length} ejercicio${selectedExerciseIds.length === 1 ? "" : "s"}`
                    : "Selecciona ejercicios"}
                </Button>
              </div>
            </div>
          </div>
        )}
        {alternativePickerExercise && (
          <div className="fixed inset-0 z-[90] flex items-end bg-black/45 px-0 sm:items-center sm:justify-center sm:p-4">
            <div className="flex max-h-[86vh] w-full flex-col overflow-hidden rounded-t-[1.75rem] bg-[color:var(--bg)] shadow-2xl sm:max-w-lg sm:rounded-[1.75rem]">
              <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[color:var(--border)] sm:hidden" />
              <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-3 pt-4">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[color:var(--text-muted)]">
                    Elegir alternativas
                  </p>
                  <h3 className="mt-0.5 truncate text-xl font-semibold tracking-[-0.02em] text-[color:var(--text)]">
                    {alternativePickerExercise.name}
                  </h3>
                  <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                    Se usarán como reemplazo cuando lo necesites.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAlternativePickerExercise(null);
                    setSelectedAlternativeIds([]);
                    setAlternativePickerFilter(null);
                  }}
                  className="h-9 shrink-0 px-1 text-sm font-semibold text-[color:var(--accent)]"
                >
                  Cancelar
                </button>
              </div>

              <motion.div
                layout
                ref={alternativePickerFilterStripRef}
                className="flex shrink-0 gap-2.5 overflow-x-auto border-y border-[color:var(--detail-row-divider)] px-4 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="group"
                aria-label="Filtrar alternativas por equipamiento"
              >
                <AnimatePresence initial={false}>
                  {alternativePickerFilter ? (
                    <motion.button
                      layout
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      type="button"
                      onClick={() => setAlternativePickerFilter(null)}
                      className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-[color:var(--border-strong)] px-4 text-sm font-medium text-[color:var(--text)]"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Restablecer
                    </motion.button>
                  ) : null}
                </AnimatePresence>
                {orderedAlternativePickerFilters.map((option) => {
                  const active =
                    alternativePickerFilter?.key === option.key &&
                    alternativePickerFilter?.value === option.value;
                  const locked = Boolean(alternativePickerFilter && !active);
                  return (
                    <motion.button
                      layout
                      key={`${option.key}-${option.value}`}
                      type="button"
                      aria-pressed={active}
                      aria-disabled={locked}
                      tabIndex={locked ? -1 : 0}
                      onClick={() => {
                        if (!locked) setAlternativePickerFilter(option);
                      }}
                      className={`h-11 shrink-0 rounded-full px-3 text-sm font-medium transition-[opacity,transform,background-color,color] duration-300 ${
                        active
                          ? "scale-[1.02] bg-[#251a12] text-[#fffdf8] dark:bg-[#e2ff00] dark:text-black"
                          : locked
                            ? "cursor-default bg-[#ece8e0] text-[#c8c2b8] dark:bg-[#20201e] dark:text-[#666661]"
                            : "bg-[color:var(--surface-subtle)] text-[color:var(--text)]"
                      }`}
                    >
                      {option.label}
                    </motion.button>
                  );
                })}
              </motion.div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3 pt-3">
                {alternativePickerFilter ? (
                  <div className="mb-2 flex items-center justify-between gap-3 px-1 text-xs text-[color:var(--text-muted)]">
                    <span>{alternativePickerFilter.label}</span>
                    <span className="tabular-nums">
                      {alternativePickerOptions.length}
                    </span>
                  </div>
                ) : null}
                {alternativePickerOptions.length ? (
                  <div className="divide-y divide-[color:var(--border)] overflow-hidden rounded-2xl bg-[color:var(--card)]">
                    {alternativePickerOptions.map((option) => {
                      const selected = selectedAlternativeIds.includes(
                        option.id,
                      );
                      const thumb = getExerciseImageUrl(option, {
                        width: 160,
                        height: 160,
                      });
                      return (
                        <button
                          key={option.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => toggleAlternativeSelection(option.id)}
                          className={`grid min-h-[108px] w-full grid-cols-[80px_minmax(0,1fr)_28px] items-center gap-4 px-0 py-3 text-left transition ${
                            selected
                              ? "bg-[color:var(--surface-subtle)]"
                              : "hover:bg-[color:var(--surface-subtle)]"
                          }`}
                        >
                          <div className="h-20 w-20 overflow-hidden rounded-[18px] bg-[color:var(--surface-subtle)]">
                            <ExerciseThumbnail
                              src={thumb}
                              alt=""
                              fallback={(option.name || "?")
                                .charAt(0)
                                .toUpperCase()}
                              className="h-full w-full text-xs font-semibold"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="line-clamp-2 text-[18px] font-medium leading-[1.2] tracking-[-0.015em] text-[color:var(--text)]">
                              {option.name}
                            </p>
                            <p className="mt-2 truncate text-base leading-5 text-[color:var(--text-muted)]">
                              {option.muscle || "Mismo grupo muscular"}
                            </p>
                          </div>
                          <span
                            className={`grid h-7 w-7 place-items-center rounded-full border transition ${
                              selected
                                ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-white"
                                : "border-[color:var(--border)] text-transparent"
                            }`}
                          >
                            <Check className="h-4 w-4" aria-hidden="true" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-[color:var(--card)] p-5 text-center text-sm text-[color:var(--text-muted)]">
                    {alternativePickerFilter
                      ? "No hay alternativas con este equipo. Restablece el filtro para ver todas las opciones."
                      : "No hay alternativas disponibles para este ejercicio."}
                  </div>
                )}
              </div>

              <div className="shrink-0 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-2">
                <Button
                  className="h-12 w-full rounded-2xl text-sm"
                  disabled={!selectedAlternativeIds.length}
                  onClick={confirmAlternativeSelection}
                >
                  {selectedAlternativeIds.length
                    ? `Añadir ${selectedAlternativeIds.length} alternativa${selectedAlternativeIds.length === 1 ? "" : "s"}`
                    : "Selecciona una alternativa"}
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
              <div className="fixed inset-0 z-[80] flex items-end bg-black/45 px-0 sm:items-center sm:justify-center sm:p-4">
                <div className="max-h-[82vh] w-full overflow-hidden rounded-t-[1.75rem] bg-[color:var(--bg)] shadow-2xl sm:max-w-lg sm:rounded-[1.75rem]">
                  <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-[color:var(--border)] sm:hidden" />
                  <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-4">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[color:var(--text-muted)]">
                        Ajustar ejercicio
                      </p>
                      <h3 className="mt-0.5 truncate text-xl font-semibold tracking-[-0.02em] text-[color:var(--text)]">
                        {current.name}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOptionsExerciseId(null)}
                      className="h-9 shrink-0 px-1 text-sm font-semibold text-[color:var(--accent)]"
                    >
                      Listo
                    </button>
                  </div>

                  <div className="grid gap-4 overflow-y-auto px-4 pb-[max(20px,env(safe-area-inset-bottom))]">
                    <div className="divide-y divide-[color:var(--border)] overflow-hidden rounded-2xl bg-[color:var(--card)]">
                      <div className="flex min-h-[76px] items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[color:var(--text)]">
                            Un lado a la vez
                          </p>
                          <p className="mt-0.5 text-xs text-[color:var(--text-muted)]">
                            Actívalo para movimientos unilaterales.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            updateExercise(
                              currentIndex,
                              applyUnilateralMode(
                                !isUnilateralMovement(current),
                              ),
                            )
                          }
                          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                            isUnilateralMovement(current)
                              ? "bg-[color:var(--accent)]"
                              : "bg-[color:var(--surface-subtle)]"
                          }`}
                          aria-label="Trabajar un lado a la vez"
                          aria-pressed={isUnilateralMovement(current)}
                        >
                          <span
                            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                              isUnilateralMovement(current)
                                ? "left-6"
                                : "left-1"
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex min-h-[76px] items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[color:var(--text)]">
                            Ejercicio opcional
                          </p>
                          <p className="mt-0.5 text-xs text-[color:var(--text-muted)]">
                            No se incluye en el recorrido principal.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            updateExercise(currentIndex, {
                              isExtra: !current.isExtra,
                            })
                          }
                          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                            current.isExtra
                              ? "bg-[color:var(--accent)]"
                              : "bg-[color:var(--surface-subtle)]"
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
                    </div>

                    <button
                      type="button"
                      disabled={!alternativeOptions.length}
                      onClick={() => openAlternativePicker(current)}
                      className="flex min-h-[64px] items-center justify-between gap-3 rounded-2xl bg-[color:var(--card)] px-4 py-3 text-left transition hover:bg-[color:var(--surface-subtle)] disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      <span>
                        <span className="block text-sm font-medium text-[color:var(--text)]">
                          Alternativas
                        </span>
                        <span className="mt-0.5 block text-xs text-[color:var(--text-muted)]">
                          {alternativeOptions.length
                            ? (current.alternatives || []).length
                              ? `${(current.alternatives || []).length} configurada${(current.alternatives || []).length === 1 ? "" : "s"}`
                              : "Añade un reemplazo"
                            : "No hay reemplazos disponibles"}
                        </span>
                      </span>
                      <ChevronRight className="h-5 w-5 shrink-0 text-[color:var(--text-muted)]" />
                    </button>

                    {(current.alternatives || []).length > 0 && (
                      <div className="divide-y divide-[color:var(--border)] overflow-hidden rounded-2xl bg-[color:var(--card)]">
                        {(current.alternatives || []).map((alt) => (
                          <div
                            key={alt.exerciseId}
                            className="grid min-h-[58px] grid-cols-[minmax(0,1fr)_78px_36px] items-center gap-2 px-4 py-2"
                          >
                            <p className="truncate text-sm font-medium leading-tight text-[color:var(--text)]">
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
                              className={`h-8 rounded-full px-2 text-[10px] font-medium transition ${
                                isUnilateralMovement(alt)
                                  ? "bg-[color:var(--surface-subtle)] text-[color:var(--accent)]"
                                  : "bg-[color:var(--surface-subtle)] text-[color:var(--text-muted)]"
                              }`}
                            >
                              {isUnilateralMovement(alt)
                                ? "Unilateral"
                                : "Normal"}
                            </button>
                            <button
                              type="button"
                              className="grid h-9 w-9 place-items-center rounded-full text-xs text-red-500 transition hover:bg-red-500/10"
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
                      className="h-11 text-sm font-medium text-red-600 transition hover:text-red-700"
                    >
                      Eliminar ejercicio
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        {closeConfirmationOpen ? (
          <div className="fixed inset-0 z-[100] flex items-end bg-black/45 p-0 sm:items-center sm:justify-center sm:p-4">
            <div className="w-full rounded-t-[1.75rem] bg-[color:var(--bg)] px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-2 shadow-2xl sm:max-w-sm sm:rounded-[1.75rem]">
              <div className="mx-auto h-1 w-10 rounded-full bg-[color:var(--border)] sm:hidden" />
              <div className="px-1 pb-2 pt-5">
                <p className="text-xs font-medium text-[color:var(--text-muted)]">
                  Cambios sin guardar
                </p>
                <h3 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-[color:var(--text)]">
                  ¿Salir de la edición?
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--text-muted)]">
                  Si sales ahora, perderás los cambios realizados en esta
                  rutina.
                </p>
              </div>
              <div className="mt-3 grid gap-2">
                <Button
                  className="h-12 rounded-2xl text-sm"
                  onClick={() => setCloseConfirmationOpen(false)}
                >
                  Seguir editando
                </Button>
                <button
                  type="button"
                  onClick={onClose}
                  className="h-12 rounded-2xl bg-[color:var(--card)] px-3 text-sm font-medium text-red-600 transition hover:bg-red-500/10"
                >
                  Descartar cambios
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
  scheduleMode,
  routines,
  plan,
  onCreate,
  onAssign,
  onClose,
}) {
  const [query, setQuery] = useState("");
  const [assigningId, setAssigningId] = useState(null);
  const currentRoutineId = String(day?.routineId || "");
  const [selectedRoutineId, setSelectedRoutineId] = useState(currentRoutineId);
  const dayLabel =
    scheduleMode === "fixed"
      ? PLAN_DAY_NAMES[Number(day?.dayIndex || 1) - 1] || "Día"
      : `Día ${day?.dayIndex || 1}`;
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

  const usageDays = useMemo(() => {
    const result = new Map();
    (plan?.weeklySchedule || []).forEach((slot) => {
      if (slot.type !== "training" || !slot.routineId) return;
      if (String(slot.slotId) === String(day?.slotId)) return;
      const label =
        scheduleMode === "fixed"
          ? PLAN_DAY_NAMES[Number(slot.dayIndex || 1) - 1] || "Otro día"
          : `Día ${slot.dayIndex || 1}`;
      const key = String(slot.routineId);
      result.set(key, [...(result.get(key) || []), label]);
    });
    return result;
  }, [day?.slotId, plan?.weeklySchedule, scheduleMode]);

  const selectedRoutine = routines.find(
    (routine) =>
      String(routine.id || routine._id) === String(selectedRoutineId),
  );
  const selectedUsageDays = usageDays.get(selectedRoutineId) || [];

  const assign = async () => {
    if (!selectedRoutineId || selectedRoutineId === currentRoutineId) return;
    setAssigningId(selectedRoutineId);
    try {
      await onAssign(selectedRoutineId);
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <Modal
      mobilePage
      title={day?.routineId ? "Cambiar rutina" : "Asignar rutina"}
      subtitle={null}
      onClose={onClose}
      footer={
        <div className="w-full">
          {selectedRoutine ? (
            <p className="mb-2 truncate text-center text-xs text-[color:var(--text-muted)]">
              {selectedRoutineId === currentRoutineId
                ? "Esta rutina ya está asignada"
                : selectedUsageDays.length
                  ? `También se usa en ${selectedUsageDays.join(", ")}`
                  : selectedRoutine.name}
            </p>
          ) : null}
          <Button
            className="h-12 w-full rounded-2xl text-sm"
            disabled={
              !selectedRoutineId ||
              selectedRoutineId === currentRoutineId ||
              Boolean(assigningId)
            }
            onClick={assign}
          >
            {assigningId ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Asignando
              </>
            ) : day?.routineId ? (
              "Cambiar rutina"
            ) : (
              "Asignar rutina"
            )}
          </Button>
        </div>
      }
    >
      <div className="mx-auto max-w-xl space-y-5 pb-2">
        <div className="flex items-end justify-between gap-3 px-1">
          <div className="min-w-0">
            <p className="text-xs text-[color:var(--text-muted)]">
              Entrenamiento para
            </p>
            <h2 className="mt-0.5 truncate text-2xl font-medium tracking-[-0.025em] text-[color:var(--text)]">
              {dayLabel}
            </h2>
          </div>
          {day?.focus ? (
            <span className="shrink-0 rounded-full bg-[color:var(--card)] px-3 py-2 text-xs font-medium text-[color:var(--text-muted)]">
              {day.focus}
            </span>
          ) : null}
        </div>
        {routines.length ? (
          <>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar rutina"
                className="theme-accent-focus h-12 w-full rounded-2xl border-0 bg-[color:var(--card)] pl-11 pr-4 text-sm outline-none placeholder:text-[color:var(--text-muted)]"
              />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-sm font-medium text-[color:var(--text)]">
                  Tus rutinas
                </p>
                <span className="text-xs text-[color:var(--text-muted)]">
                  {options.length}
                </span>
              </div>
              <div className="divide-y divide-[color:var(--border)] overflow-hidden rounded-2xl bg-[color:var(--card)]">
                {options.length ? (
                  options.map((routine) => {
                    const routineId = String(routine.id || routine._id);
                    const isSelected = routineId === selectedRoutineId;
                    const usedIn = usageDays.get(routineId) || [];
                    const muscles = [
                      ...new Set(
                        (routine.exercises || [])
                          .map((exercise) => exercise.muscle)
                          .filter(Boolean),
                      ),
                    ].slice(0, 2);
                    const firstExercise = routine.exercises?.[0];
                    const thumb = getExerciseImageUrl(firstExercise, {
                      width: 160,
                      height: 160,
                    });
                    return (
                      <button
                        key={routineId}
                        type="button"
                        onClick={() => setSelectedRoutineId(routineId)}
                        disabled={Boolean(assigningId)}
                        aria-pressed={isSelected}
                        className={`grid min-h-[76px] w-full grid-cols-[56px_minmax(0,1fr)_28px] items-center gap-3 px-3 py-2.5 text-left transition disabled:opacity-60 ${isSelected ? "theme-accent-solid" : "bg-[color:var(--card)]"}`}
                      >
                        <div className="h-14 w-14 overflow-hidden rounded-xl bg-[color:var(--bg)]">
                          <ExerciseThumbnail
                            src={thumb}
                            alt=""
                            fallback={(routine.name || "?")
                              .charAt(0)
                              .toUpperCase()}
                            className="h-full w-full text-xs font-semibold"
                          />
                        </div>
                        <span className="min-w-0">
                          <span
                            className={`block truncate text-sm font-medium ${isSelected ? "text-[color:var(--accent-contrast)]" : "text-[color:var(--text)]"}`}
                          >
                            {routine.name}
                          </span>
                          <span
                            className={`mt-1 block truncate text-xs ${isSelected ? "text-[color:var(--accent-contrast)] opacity-75" : "text-[color:var(--text-muted)]"}`}
                          >
                            {getRoutineExerciseSummary(routine)}
                            {muscles.length ? ` · ${muscles.join(" + ")}` : ""}
                          </span>
                          {usedIn.length ? (
                            <span
                              className={`mt-1 block truncate text-[11px] ${isSelected ? "text-[color:var(--accent-contrast)] opacity-75" : "text-[color:var(--text-muted)]"}`}
                            >
                              También en {usedIn.join(", ")}
                            </span>
                          ) : null}
                        </span>
                        <span
                          className={`grid h-7 w-7 place-items-center rounded-full border transition ${isSelected ? "border-[color:var(--accent-contrast)] bg-[color:var(--accent-contrast)] text-[color:var(--accent)]" : "border-[color:var(--border)] text-transparent"}`}
                        >
                          <Check className="h-4 w-4" aria-hidden="true" />
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
            </div>
          </>
        ) : (
          <div className="rounded-2xl bg-[color:var(--card)] px-4 py-8 text-center">
            <p className="text-sm font-medium">No tienes rutinas disponibles</p>
            <p className="mt-1 text-xs text-[color:var(--text-muted)]">
              Crea una para poder asignarla a este día.
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={onCreate}
          className="theme-accent-text flex h-11 w-full items-center justify-center gap-2 text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Crear rutina nueva
        </button>
      </div>
    </Modal>
  );
}

function RoutineToolbar({
  showSearch,
  searchTerm,
  setSearchTerm,
  showBranchFilter,
  activeBranch,
  setActiveBranch,
  branchCounts,
  showArchivedControl,
  archivedCount,
  showArchived,
  onToggleArchived,
}) {
  const branches = [
    { id: "all", label: "Todas", count: branchCounts.all },
    { id: "sopocachi", label: "Sopocachi", count: branchCounts.sopocachi },
    { id: "miraflores", label: "Miraflores", count: branchCounts.miraflores },
  ];
  return (
    <section className="routine-toolbar mt-5 space-y-3">
      {showSearch ? (
        <div className="relative min-w-0">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            type="search"
            inputMode="search"
            placeholder="Buscar rutina..."
            className="theme-accent-focus h-11 w-full rounded-none border border-[color:var(--border)] bg-[color:var(--card)] pl-10 pr-3 text-sm font-semibold text-[color:var(--text)] outline-none placeholder:text-[color:var(--text-muted)] dark:focus:border-[#e2ff00]"
          />
        </div>
      ) : null}
      {showArchivedControl && archivedCount > 0 ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onToggleArchived}
            aria-pressed={showArchived}
            className="min-h-9 px-1 text-xs font-medium text-[color:var(--text-muted)] transition hover:text-[color:var(--text)]"
          >
            {showArchived
              ? "Volver a rutinas"
              : `Archivadas · ${archivedCount}`}
          </button>
        </div>
      ) : null}
      {showBranchFilter ? (
        <div
          className="routine-toolbar__branches grid grid-cols-3 gap-2"
          aria-label="Filtrar por sede"
        >
          {branches.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveBranch(item.id)}
              aria-pressed={activeBranch === item.id}
              className={`h-8 min-w-0 border px-2 text-xs font-black uppercase transition ${
                activeBranch === item.id
                  ? "border-[#352018] bg-[#352018] text-white dark:border-[#e2ff00] dark:bg-[#e2ff00] dark:text-black"
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

function CurrentPlanOverview({ plan, state, onOpen, onStart }) {
  if (!plan) return null;
  const schedule = Array.isArray(plan.weeklySchedule)
    ? plan.weeklySchedule
    : [];
  const day = state?.day;
  const isCompleted = Boolean(state?.isCompleted);
  const isRest = Boolean(state?.isRest);
  const routine = state?.routine;
  const title = !state
    ? "Consulta la agenda del plan"
    : isRest
      ? day.type === "recovery"
        ? "Recuperación activa"
        : "Descanso programado"
      : routine?.name || "Rutina pendiente de asignar";
  const currentWeek = Math.min(
    Math.max(1, getPlanWeekIndex(plan) + 1),
    Math.max(1, Number(plan.durationWeeks || 1)),
  );
  const planContext =
    plan.scheduleMode === "fixed"
      ? `Semana ${currentWeek} de ${Math.max(1, Number(plan.durationWeeks || 1))}`
      : `${plan.weeklySchedule?.length || 0} días en orden`;
  const todayContext = !state
    ? "Revisa qué toca esta semana"
    : isCompleted
      ? "Entrenamiento completado"
      : isRest
        ? day.type === "recovery"
          ? "Movilidad o actividad ligera"
          : "Día sin entrenamiento"
        : routine
          ? getRoutineExerciseSummary(routine)
          : "Falta asignar una rutina";
  const canStart =
    plan.status === "active" && !isCompleted && !isRest && Boolean(routine);
  const currentDayIndex = Number.isInteger(state?.index) ? state.index : -1;
  let nextTrainingDay = null;
  let nextTrainingIndex = -1;
  if (currentDayIndex >= 0 && schedule.length) {
    for (let offset = 1; offset <= schedule.length; offset += 1) {
      const index = (currentDayIndex + offset) % schedule.length;
      if (schedule[index]?.type === "training") {
        nextTrainingDay = schedule[index];
        nextTrainingIndex = index;
        break;
      }
    }
  }
  const nextTrainingContext = nextTrainingDay
    ? `Próximo: ${nextTrainingDay.focus || "Entrenamiento"} · ${
        plan.scheduleMode === "fixed"
          ? PLAN_DAY_NAMES[nextTrainingIndex] || `Día ${nextTrainingIndex + 1}`
          : `Día ${nextTrainingIndex + 1}`
      }`
    : "Consulta la agenda del plan";
  return (
    <section className="current-plan-overview overflow-hidden rounded-3xl bg-[color:var(--card)]">
      <div className="relative h-32 overflow-hidden">
        <img
          src={planningOverviewImage}
          alt=""
          className="h-full w-full object-cover object-[center_62%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/10" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 px-4 py-3 text-white">
          <div className="min-w-0">
            <p className="text-xs text-white/75">Plan actual</p>
            <h2 className="mt-0.5 truncate text-xl font-medium leading-tight">
              {plan.name}
            </h2>
          </div>
          <span className="shrink-0 rounded-full bg-white/90 px-3 py-2 text-xs font-medium text-[#251a12] backdrop-blur-sm">
            {planContext}
          </span>
        </div>
      </div>

      <div className="border-t border-[color:var(--detail-row-divider)] px-4 py-4">
        <p className="text-xs font-medium text-[color:var(--text-muted)]">
          Hoy
        </p>
        <h3 className="mt-1 text-xl font-medium leading-tight text-[color:var(--text)]">
          {title}
        </h3>
        <p className="mt-1 truncate text-sm text-[color:var(--text-muted)]">
          {isRest ? nextTrainingContext : todayContext}
        </p>
        <div className="mt-4 flex items-center gap-2">
          {canStart ? (
            <button
              type="button"
              onClick={() => onStart(day, plan)}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl bg-[color:var(--accent)] px-4 text-sm font-medium text-[color:var(--accent-contrast)] transition hover:bg-[color:var(--accent-hover)]"
            >
              Iniciar entrenamiento
            </button>
          ) : null}
          <button
            type="button"
            onClick={onOpen}
            className={`inline-flex h-11 items-center justify-center rounded-2xl border border-[color:var(--border)] px-4 text-sm font-medium text-[color:var(--text)] transition hover:border-[color:var(--border-strong)] ${canStart ? "shrink-0" : "w-full"}`}
          >
            Ver planificación
          </button>
        </div>
      </div>
    </section>
  );
}

function SecondaryPlanRow({ plan, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(plan)}
      className="secondary-plan-row flex min-h-[76px] w-full items-center gap-3 bg-[color:var(--card)] px-4 py-3 text-left transition hover:bg-[color:var(--surface-subtle)]"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-[color:var(--text)] sm:text-base">
          {plan.name}
        </span>
        <span className="mt-1 block text-xs text-[color:var(--text-muted)]">
          {PLAN_STATUS_LABELS[plan.status] || plan.status}
        </span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-[color:var(--text-muted)]" />
    </button>
  );
}

export function TrainingPlanSchedule({
  plan,
  routines,
  trainings,
  selectedWeek,
  onSelectWeek,
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
  const isConfiguring = plan.status === "draft";
  const isEditable = ["draft", "scheduled", "active", "paused"].includes(
    plan.status,
  );
  const planId = getEntityId(plan);
  const [editingSchedulePlanId, setEditingSchedulePlanId] = useState("");
  const editingSchedule = editingSchedulePlanId === planId;
  const todayIso = new Date().toLocaleDateString("en-CA");
  const currentWeekIndex = getPlanWeekIndex(plan);
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
  const configuredTrainingDays = schedule.filter(
    (day) => day.type === "training" && day.routineId,
  ).length;
  const showEditingControls =
    isConfiguring || (editingSchedule && isEditable && !isManagedClient);
  const progressValue = isConfiguring
    ? configuredTrainingDays
    : completedTrainingDays;
  const progressTotal = Math.max(1, totalTrainingDays);

  return (
    <div className="plan-schedule mt-5">
      <div className="plan-schedule__header flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-medium text-[color:var(--text)]">
            {isConfiguring
              ? "Rutinas del plan"
              : sequential
                ? "Próxima sesión"
                : `Semana ${selectedWeek + 1} de ${Math.max(1, Number(plan.durationWeeks || 1))}`}
          </p>
          <p className="mt-1 text-xs font-normal text-[color:var(--text-muted)]">
            {isConfiguring
              ? sequential
                ? `${schedule.length} días`
                : `${configuredTrainingDays} de ${totalTrainingDays} asignadas`
              : sequential
                ? `Día ${currentCycleIndex + 1} de ${schedule.length}`
                : `${formatPlanDayDate(weekStart)} - ${formatPlanDayDate(weekEnd)}`}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {isConfiguring || !sequential ? (
            <strong className="text-sm font-medium text-[color:var(--text)]">
              {isConfiguring
                ? `${configuredTrainingDays}/${totalTrainingDays}`
                : `${completedTrainingDays} de ${totalTrainingDays} realizados`}
            </strong>
          ) : null}
          {!isConfiguring && isEditable && !isManagedClient ? (
            <button
              type="button"
              onClick={() =>
                setEditingSchedulePlanId((current) =>
                  current === planId ? "" : planId,
                )
              }
              className={`h-8 rounded-full border px-3 text-xs font-medium transition ${
                editingSchedule
                  ? "border-[color:var(--accent)] text-[color:var(--accent-strong)]"
                  : "border-[color:var(--border)] text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
              }`}
            >
              {editingSchedule ? "Listo" : "Editar"}
            </button>
          ) : null}
        </div>
      </div>
      {(!sequential || isConfiguring) && totalTrainingDays ? (
        <div className="mt-3 h-1.5 overflow-hidden bg-[color:var(--border)]">
          <div
            className="theme-accent-solid h-full border-0 transition-all"
            style={{ width: `${(progressValue / progressTotal) * 100}%` }}
          />
        </div>
      ) : null}

      {!sequential && Number(plan.durationWeeks || 1) > 1 ? (
        <div
          className="plan-schedule__weeks mt-4 flex gap-2 overflow-x-auto pb-1"
          aria-label="Seleccionar semana de la planificación"
        >
          {Array.from(
            { length: Math.max(1, Number(plan.durationWeeks || 1)) },
            (_, weekIndex) => (
              <button
                key={weekIndex}
                type="button"
                onClick={() => onSelectWeek?.(weekIndex)}
                aria-pressed={selectedWeek === weekIndex}
                className={`h-9 shrink-0 rounded-full border px-3 text-xs font-medium transition ${
                  selectedWeek === weekIndex
                    ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--accent-contrast)]"
                    : "border-[color:var(--border)] text-[color:var(--text-muted)] hover:border-[color:var(--border-strong)]"
                }`}
              >
                Semana {weekIndex + 1}
                {weekIndex === currentWeekIndex ? " · Actual" : ""}
              </button>
            ),
          )}
        </div>
      ) : null}

      <div className="plan-schedule__list mt-4 divide-y divide-[color:var(--border)] border-y border-[color:var(--border)]">
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
          const primaryLabel = isRest
            ? day.type === "rest"
              ? "Descanso"
              : "Recuperación"
            : routine?.name || day.focus || "Rutina sin asignar";
          const focusDiffers =
            routine &&
            day.focus?.trim().toLowerCase() !==
              routine.name?.trim().toLowerCase();
          const secondaryLabel = isRest
            ? day.type === "recovery"
              ? "Actividad ligera"
              : "Sin entrenamiento"
            : routine
              ? [
                  focusDiffers ? day.focus : "",
                  getRoutineExerciseSummary(routine),
                ]
                  .filter(Boolean)
                  .join(" · ")
              : "Selecciona una rutina";
          const canStart =
            isCurrent &&
            plan.status === "active" &&
            Boolean(routine) &&
            !training;
          const dayStateLabel = training
            ? "Completada"
            : isCurrent
              ? sequential
                ? "Actual"
                : "Hoy"
              : !sequential && !isRest && dateIso < todayIso
                ? "Pendiente"
                : !sequential && !isRest && dateIso > todayIso
                  ? "Programada"
                  : "";
          const dayStateClass =
            training || isCurrent
              ? "bg-[color:var(--accent)] text-[color:var(--accent-contrast)]"
              : "border border-[color:var(--border)] text-[color:var(--text-muted)]";
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
              className={`plan-schedule__day relative flex min-h-[72px] items-center gap-3 px-2 py-3 sm:px-3 ${
                isCurrent
                  ? "bg-[color:var(--card)] ring-1 ring-inset ring-[color:var(--accent)]"
                  : "bg-[color:var(--card)]"
              } ${!isRest && routine ? "cursor-pointer transition hover:bg-[color:var(--bg)]" : ""}`}
            >
              {isCurrent ? (
                <span className="absolute inset-y-0 left-0 w-1 bg-[color:var(--accent)]" />
              ) : null}
              <div className="w-12 shrink-0 border-r border-[color:var(--border)] pr-3 text-center sm:w-16">
                <p
                  className={`text-xs font-medium uppercase ${isCurrent ? "text-[color:var(--accent-strong)]" : ""}`}
                >
                  {sequential
                    ? `Día ${index + 1}`
                    : PLAN_DAY_NAMES[index].slice(0, 3)}
                </p>
                {date ? (
                  <p className="mt-1 text-[10px] font-bold text-[color:var(--text-muted)]">
                    {formatPlanDayDate(date)}
                  </p>
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="min-w-0 flex-1">
                    {!isRest && routine ? (
                      <button
                        type="button"
                        onClick={() => onOpenRoutine(routine)}
                        className="block max-w-full truncate text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#352018]/35 dark:focus-visible:ring-[#e2ff00]/40"
                        aria-label={`Ver ejercicios de ${routine.name}`}
                      >
                        {primaryLabel}
                      </button>
                    ) : (
                      <p
                        className={`truncate text-sm font-medium ${!routine && !isRest ? "text-[color:var(--text-muted)]" : ""}`}
                      >
                        {primaryLabel}
                      </p>
                    )}
                  </div>
                  {dayStateLabel ? (
                    <span
                      className={`shrink-0 rounded-sm px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide ${dayStateClass}`}
                    >
                      {dayStateLabel}
                    </span>
                  ) : null}
                </div>
                {secondaryLabel ? (
                  <p className="mt-1 truncate text-xs font-normal text-[color:var(--text-muted)]">
                    {secondaryLabel}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {training ? (
                  <Check
                    className="theme-accent-text h-4 w-4"
                    aria-label="Completada"
                  />
                ) : null}
                {day.type === "training" &&
                !routine &&
                !isManagedClient &&
                showEditingControls ? (
                  <button
                    type="button"
                    onClick={() => onChooseRoutine(day)}
                    className="theme-accent-soft inline-flex h-10 items-center gap-1.5 border px-2.5 text-xs font-black"
                  >
                    <Plus className="h-4 w-4" /> Asignar
                  </button>
                ) : null}
                {canStart ? (
                  <button
                    type="button"
                    onClick={() => onStartRoutine(day)}
                    className="theme-accent-solid inline-flex h-10 items-center gap-1.5 border-0 px-3 text-xs font-black"
                  >
                    <Play className="h-4 w-4" /> Iniciar
                  </button>
                ) : null}
                {!isRest &&
                routine &&
                !isManagedClient &&
                showEditingControls ? (
                  <details className="overflow-menu relative">
                    <summary
                      className="overflow-menu-trigger cursor-pointer list-none [&::-webkit-details-marker]:hidden"
                      aria-label={`Opciones de ${routine.name}`}
                    >
                      <MoreVertical className="h-5 w-5" />
                    </summary>
                    <div className="overflow-menu-panel overflow-menu-panel--up absolute bottom-12 right-0 z-30 w-48">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.currentTarget
                            .closest("details")
                            ?.removeAttribute("open");
                          onChooseRoutine(day);
                        }}
                        className="flex h-10 w-full items-center gap-2 px-3 text-left text-sm font-bold hover:bg-[color:var(--bg)]"
                      >
                        <RotateCcw className="h-4 w-4" /> Cambiar
                      </button>
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
                ) : null}
                {sequential &&
                isCurrent &&
                plan.status === "active" &&
                isRest ? (
                  <button
                    type="button"
                    disabled={advancingCycle}
                    onClick={onAdvanceCycle}
                    className="theme-accent-soft inline-flex h-10 items-center gap-1.5 border px-2.5 text-xs font-black disabled:opacity-50"
                  >
                    <Bed className="h-4 w-4" />
                    {advancingCycle ? "..." : "Continuar"}
                  </button>
                ) : null}
              </div>
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
        routines.map((routine) => [String(routine.id || routine._id), routine]),
      ),
    [routines],
  );
  const trainingDays = (template.weeklySchedule || []).filter(
    (day) => day.type === "training",
  ).length;

  return (
    <Modal
      mobilePage
      title={template.name}
      subtitle={`${ROUTINE_LEVEL_LABELS[template.level] || template.level} · ${template.goal} · ${template.durationWeeks} semanas`}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={() => onEdit(template)}>
            <Pencil className="h-4 w-4" /> Editar
          </Button>
          <Button onClick={() => onDuplicate(template)}>
            <Copy className="h-4 w-4" />
            Duplicar
          </Button>
        </>
      }
    >
      {template.description ? (
        <p className="mb-4 text-sm font-semibold leading-relaxed text-[color:var(--text-muted)]">
          {template.description}
        </p>
      ) : null}
      <div className="plan-template-detail-heading mb-3 flex items-center justify-between border-b border-[color:var(--border)] pb-2">
        <h4 className="text-xs font-black uppercase">Contenido programado</h4>
        <span className="text-xs font-black text-[color:var(--text-muted)]">
          {trainingDays} entrenamientos
        </span>
      </div>
      <div className="plan-template-detail-list divide-y divide-[color:var(--border)] border-y border-[color:var(--border)]">
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
              className="plan-template-detail-row flex min-h-16 items-center gap-3 py-3"
            >
              <span className="grid h-11 w-12 shrink-0 place-items-center border border-[color:var(--border)] bg-[color:var(--bg)] text-[11px] font-black uppercase">
                {dayLabel.slice(0, 3)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">
                  {day.type === "training"
                    ? day.focus || "Entrenamiento"
                    : dayLabel}
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
  const estimatedMinutes =
    Number(routine.estimatedMinutes) ||
    (totalSets > 0 ? Math.max(20, Math.round((totalSets * 2.5) / 5) * 5) : 20);
  return (
    <Modal
      mobilePage
      title={routine.name}
      onClose={onClose}
      hideHeader
      dialogClassName="routine-detail-dialog"
      contentClassName="routine-detail-page !p-0 sm:!p-0"
      footerClassName="routine-detail-footer"
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
      <section className="routine-detail-hero relative h-[19rem] overflow-hidden bg-[#17130f] text-white sm:h-[22rem]">
        <img
          src={getRoutineDetailHeroImage(routine)}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/35" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Volver a rutinas"
          className="absolute left-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur-md transition hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
        >
          <ArrowLeft className="h-6 w-6" strokeWidth={2.1} />
        </button>
        <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-10 pt-16 sm:px-6 sm:pb-10">
          <p className="text-xs font-medium text-white/75">Rutina</p>
          <h1 className="mt-1 line-clamp-2 text-3xl font-medium leading-none tracking-[-0.035em] text-white sm:text-4xl">
            {routine.name}
          </h1>
          <p className="mt-2 line-clamp-1 text-sm font-normal text-white/80">
            {routine.description ||
              (routine.level
                ? ROUTINE_LEVEL_LABELS[routine.level] || routine.level
                : "Rutina personalizada")}
          </p>
        </div>
      </section>
      <div className="routine-detail-body relative z-10 -mt-6 rounded-t-[1.75rem] bg-[color:var(--bg)] px-4 pb-5 pt-6 sm:px-5">
        <div className="routine-detail-stats mb-4 grid grid-cols-3 border-y border-[color:var(--border)] py-3 text-center">
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
            <p className="text-lg font-black">{estimatedMinutes}</p>
            <p className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">
              Minutos
            </p>
          </div>
        </div>
        <div className="routine-detail-heading mb-2 flex items-center justify-between gap-3">
          <h4 className="text-xs font-black uppercase">Ejercicios</h4>
          <div className="flex items-center gap-1.5">
            {routine.level ? (
              <span className="border border-[color:var(--border)] px-2 py-1 text-[9px] font-black uppercase text-[color:var(--text-muted)]">
                {ROUTINE_LEVEL_LABELS[routine.level] || routine.level}
              </span>
            ) : null}
            <span className="theme-accent-soft border px-2 py-1 text-[9px] font-black uppercase">
              {routine.exerciseOrderMode === "muscle_blocks"
                ? "Por bloques"
                : "Orden libre"}
            </span>
          </div>
        </div>
        <div className="routine-detail-list divide-y divide-[color:var(--border)] border-y border-[color:var(--border)]">
          {exercises.map((exercise, index) => {
            const imageUrl = getExerciseImageUrl(exercise, {
              width: 240,
              height: 240,
            });
            return (
              <div
                key={`${exercise.exerciseId || exercise.name}-${index}`}
                className="routine-detail-row flex min-h-[108px] items-center gap-4 py-3"
              >
                <span className="w-5 shrink-0 text-center text-xs font-black text-[color:var(--text-muted)]">
                  {index + 1}
                </span>
                <div className="routine-detail-image h-20 w-20 shrink-0 overflow-hidden rounded-[18px] bg-[color:var(--surface-subtle)]">
                  <RoutinePreviewImage
                    item={{ name: exercise.name || "Ejercicio", url: imageUrl }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[18px] font-medium leading-[1.2] tracking-[-0.015em]">
                    {exercise.name}
                  </p>
                  {exercise.muscle ? (
                    <p className="mt-2 truncate text-base font-normal leading-5 text-[color:var(--text-muted)]">
                      {exercise.muscle}
                    </p>
                  ) : null}
                </div>
                <span className="routine-detail-sets shrink-0 border border-[color:var(--border)] px-2 py-1 text-xs font-medium">
                  {exercise.sets || 0}{" "}
                  {Number(exercise.sets) === 1 ? "serie" : "series"}
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
      </div>
    </Modal>
  );
}

function Routines({ onNavigate, onMobileNavVisibilityChange }) {
  const { user } = useAuth();
  const isCoach = user?.role === "Entrenador";
  const isManagedClient =
    user?.role === "Cliente" && user?.trainingMode === "coach_managed";
  const {
    routines,
    loading: routinesLoading,
    error: routinesError,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    restoreRoutine,
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
  const [canReturnToTraining, setCanReturnToTraining] =
    useState(hasTrainingReturn);
  const [editTargetRoutineId, setEditTargetRoutineId] = useState(
    readTrainingRoutineEditTarget,
  );
  const [routineToDelete, setRoutineToDelete] = useState(null);
  const [routineToDuplicate, setRoutineToDuplicate] = useState(null);
  const [duplicateProgressMode, setDuplicateProgressMode] = useState("fresh");
  const [duplicatingRoutineId, setDuplicatingRoutineId] = useState(null);
  const [activePlan, setActivePlan] = useState(null);
  const [workspaceView, setWorkspaceView] = useState(() =>
    isCoach ? "routines" : "plans",
  );
  const [trainingPlans, setTrainingPlans] = useState([]);
  const [planTemplates, setPlanTemplates] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState("");
  const planRequestInFlightRef = useRef(null);
  const hadRoutinesOnEntryRef = useRef(Boolean(routines.length));
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [viewingPlanTemplate, setViewingPlanTemplate] = useState(null);
  const [viewingRoutine, setViewingRoutine] = useState(null);
  const [planDayChoice, setPlanDayChoice] = useState(null);
  const [replacementPlanDay, setReplacementPlanDay] = useState(null);
  const [deletePlanConfirmOpen, setDeletePlanConfirmOpen] = useState(false);
  const [selectedPlanWeek, setSelectedPlanWeek] = useState(0);
  const [advancingCycle, setAdvancingCycle] = useState(false);
  const [templateProcessingId, setTemplateProcessingId] = useState("");
  const [showArchivedRoutines, setShowArchivedRoutines] = useState(false);
  const hasOpenSubpage = Boolean(
    activePlan ||
    modalMode ||
    viewingPlanTemplate ||
    viewingRoutine ||
    planDayChoice ||
    planModalOpen ||
    routineToDuplicate ||
    routineToDelete,
  );

  useEffect(() => {
    onMobileNavVisibilityChange?.(hasOpenSubpage);
  }, [hasOpenSubpage, onMobileNavVisibilityChange]);

  useEffect(
    () => () => onMobileNavVisibilityChange?.(false),
    [onMobileNavVisibilityChange],
  );
  const { data: archivedRoutineData = [], refetch: refreshArchivedRoutines } =
    useQuery({
      queryKey: ["archived-routines", user?.id || user?._id || "self"],
      queryFn: () => api.getRoutines({ includeArchived: true }),
      enabled: showArchivedRoutines && !isManagedClient,
      staleTime: 30 * 1000,
    });
  const archivedRoutines = useMemo(
    () =>
      archivedRoutineData.filter(
        (routine) =>
          routine.isArchived === true && routine.archiveReason === "user",
      ),
    [archivedRoutineData],
  );
  const { data: routineTrainingCounts = [] } = useQuery({
    queryKey: ["routine-training-counts", user?.id || user?._id || "self"],
    queryFn: () => api.getRoutineTrainingCounts(),
    enabled: Boolean(user?.id || user?._id),
    staleTime: 30 * 1000,
  });
  const missingPlanRoutines = useMemo(() => {
    if (activePlan?.integrity) {
      return activePlan.integrity.missingSlots?.length || 0;
    }
    return (activePlan?.weeklySchedule || []).filter(
      (day) => day.type === "training" && !day.routineId,
    ).length;
  }, [activePlan]);
  const currentActivePlan = useMemo(
    () => trainingPlans.find((plan) => plan.status === "active") || null,
    [trainingPlans],
  );
  const currentPlanToday = useMemo(
    () =>
      getPlanTodayState({
        plan: currentActivePlan,
        routines,
        trainings,
      }),
    [currentActivePlan, routines, trainings],
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
  const secondaryTrainingPlans = useMemo(
    () =>
      orderedTrainingPlans.filter(
        (plan) => getEntityId(plan) !== getEntityId(currentActivePlan),
      ),
    [currentActivePlan, orderedTrainingPlans],
  );
  const routineAssignmentById = useMemo(() => {
    const map = new Map();
    const planningSources = isCoach
      ? planTemplates
      : orderedTrainingPlans.filter((plan) =>
          ["active", "scheduled", "draft", "paused"].includes(plan.status),
        );
    planningSources.forEach((plan) => {
      (plan.weeklySchedule || []).forEach((day, dayIndex) => {
        const routineId = getEntityId(
          (isCoach ? day.sourceRoutineId : day.routineId) ||
            day.sourceRoutineId ||
            "",
        );
        if (!routineId) return;
        const current = map.get(routineId);
        if (current) {
          if (
            getEntityId(current.plan) === getEntityId(plan) &&
            !current.dayIndexes.includes(dayIndex)
          ) {
            current.dayIndexes.push(dayIndex);
          }
          return;
        }
        map.set(routineId, { plan, dayIndexes: [dayIndex] });
      });
    });
    return map;
  }, [isCoach, orderedTrainingPlans, planTemplates]);

  const refreshPlans = useCallback(
    ({ silent = false } = {}) => {
      if (planRequestInFlightRef.current) {
        return planRequestInFlightRef.current;
      }

      if (!silent) setPlansLoading(true);

      const operation = (async () => {
        if (isCoach) {
          setPlanTemplates([]);
          setTrainingPlans([]);
          setActivePlan(null);
          return [];
        }

        const [plans, templates] = await Promise.all([
          api.getTrainingPlans(),
          api.getPlanTemplates().catch(() => []),
        ]);
        setTrainingPlans(plans);
        setPlanTemplates(templates);
        setActivePlan((current) =>
          current
            ? plans.find(
                (plan) =>
                  String(plan._id || plan.id) ===
                  String(current._id || current.id),
              ) || null
            : null,
        );
        return plans;
      })()
        .then((plans) => {
          setPlansError("");
          return plans;
        })
        .catch((error) => {
          setPlansError(
            error?.message || "No se pudieron cargar las planificaciones.",
          );
          throw error;
        })
        .finally(() => {
          if (planRequestInFlightRef.current === operation) {
            planRequestInFlightRef.current = null;
          }
          if (!silent) setPlansLoading(false);
        });

      planRequestInFlightRef.current = operation;
      return operation;
    },
    [isCoach],
  );

  useEffect(() => {
    if (!user?.id && !user?._id) return;
    const loadPlan = () => refreshPlans().catch(() => {});
    const revalidatePlan = () => refreshPlans({ silent: true }).catch(() => {});
    const handleVisibility = () => {
      if (document.visibilityState === "visible") revalidatePlan();
    };
    const handlePageShow = () => revalidatePlan();

    loadPlan();
    window.addEventListener("focus", revalidatePlan);
    window.addEventListener("online", revalidatePlan);
    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", handleVisibility);
    const intervalId = window.setInterval(revalidatePlan, 120_000);
    return () => {
      window.removeEventListener("focus", revalidatePlan);
      window.removeEventListener("online", revalidatePlan);
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.clearInterval(intervalId);
    };
  }, [refreshPlans, user?.id, user?._id]);

  useEffect(() => {
    if (isCoach && workspaceView !== "routines") {
      setWorkspaceView("routines");
    }
  }, [isCoach, workspaceView]);

  useEffect(() => {
    reloadRoutines({ silent: hadRoutinesOnEntryRef.current });
  }, [reloadRoutines]);

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
          difficulty: ex.difficulty || "",
          equipment: ex.equipment || [],
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

  const routineTrainingCountMap = useMemo(
    () =>
      new Map(
        routineTrainingCounts.map((item) => [
          String(item.routineId),
          Number(item.count) || 0,
        ]),
      ),
    [routineTrainingCounts],
  );

  const branchCounts = useMemo(() => {
    const counts = { all: routines.length, sopocachi: 0, miraflores: 0 };
    routines.forEach((routine) => {
      const branch = normalizeBranch(routine.branch);
      counts[branch] = (counts[branch] || 0) + 1;
    });
    return counts;
  }, [routines]);
  const showSearch = routines.length >= 5;
  const showBranchFilter =
    locationMode === "multiple" &&
    branchCounts.sopocachi > 0 &&
    branchCounts.miraflores > 0;
  const hasActiveRoutineFilters =
    Boolean(searchTerm.trim()) || (showBranchFilter && activeBranch !== "all");

  const routineCards = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return routines
      .filter((routine) => {
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
                width: 240,
                height: 240,
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
          assignment:
            routineAssignmentById.get(String(routine.id || routine._id)) ||
            null,
          plan:
            routineAssignmentById.get(String(routine.id || routine._id))
              ?.plan || null,
          trainingCount:
            routineTrainingCountMap.get(String(routine.id || routine._id)) || 0,
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
    exerciseMetaMap,
    locationMode,
    preferredBranch,
    routineAssignmentById,
    routineTrainingCountMap,
  ]);
  const visibleRoutineCards = routineCards;
  const routineGroups = useMemo(() => {
    const assigned = visibleRoutineCards.filter(
      (routine) => routine.assignment,
    );
    const available = visibleRoutineCards.filter(
      (routine) => !routine.assignment,
    );
    const groupsByPlan = new Map();
    assigned.forEach((routine) => {
      const plan = routine.plan;
      const planId = getEntityId(plan) || "assigned";
      const existing = groupsByPlan.get(planId);
      if (existing) {
        existing.routines.push(routine);
        return;
      }
      groupsByPlan.set(planId, {
        id: `plan-${planId}`,
        eyebrow: isCoach
          ? "Plantilla"
          : plan?.status === "active"
            ? "Plan vigente"
            : PLAN_STATUS_LABELS[plan?.status] || "Planificación",
        title: plan?.name || (isCoach ? "En plantilla" : "En planificación"),
        description: "",
        status: plan?.status || "draft",
        routines: [routine],
      });
    });
    const planStatusOrder = {
      active: 0,
      scheduled: 1,
      draft: 2,
      paused: 3,
      completed: 4,
      cancelled: 5,
    };
    const assignedGroups = Array.from(groupsByPlan.values())
      .sort(
        (a, b) =>
          (planStatusOrder[a.status] ?? 9) - (planStatusOrder[b.status] ?? 9) ||
          a.title.localeCompare(b.title),
      )
      .map((group) => ({
        ...group,
        routines: [...group.routines].sort((a, b) => {
          const firstDayA = Math.min(
            ...(a.assignment?.dayIndexes?.length
              ? a.assignment.dayIndexes
              : [Number.MAX_SAFE_INTEGER]),
          );
          const firstDayB = Math.min(
            ...(b.assignment?.dayIndexes?.length
              ? b.assignment.dayIndexes
              : [Number.MAX_SAFE_INTEGER]),
          );
          return firstDayA - firstDayB || a.name.localeCompare(b.name);
        }),
        description: `${group.routines.length} ${group.routines.length === 1 ? "rutina" : "rutinas"}`,
      }));
    const availableGroup = {
      id: "available",
      eyebrow: "Biblioteca personal",
      title: "Rutinas disponibles",
      description: `${available.length} ${available.length === 1 ? "rutina" : "rutinas"} sin planificación`,
      routines: available,
    };

    return [...assignedGroups, availableGroup].filter(
      (group) => group.routines.length,
    );
  }, [isCoach, visibleRoutineCards]);

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
    if (!window.confirm(`¿Eliminar ${template.name} de tus plantillas?`))
      return;
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
    const startsInFuture = planStartsInFuture(activePlan?.startDate);
    if (
      currentActivePlan &&
      !startsInFuture &&
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

  const deactivateTrainingPlan = async () => {
    try {
      const saved = await api.updateTrainingPlanStatus(
        activePlan._id || activePlan.id,
        "paused",
      );
      setActivePlan(saved);
      await refreshPlans();
      await reloadRoutines({ silent: true });
      toast.success("Planificación desactivada");
    } catch (error) {
      toast.error(error.message || "No se pudo desactivar la planificación");
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

  const deleteCurrentPlan = async () => {
    if (!activePlan || isManagedClient) return;
    try {
      const result = await api.deleteTrainingPlan(
        activePlan._id || activePlan.id,
      );
      setDeletePlanConfirmOpen(false);
      setActivePlan(null);
      await Promise.all([refreshPlans(), reloadRoutines({ silent: true })]);
      toast.success(
        result?.disposition === "deleted"
          ? "Planificación eliminada"
          : "Planificación archivada para conservar su historial",
      );
    } catch (error) {
      toast.error(error.message || "No se pudo eliminar el borrador");
    }
  };

  const openTrainingPlan = (plan) => {
    setWorkspaceView("plans");
    setActivePlan(plan);
    setSelectedPlanWeek(getPlanWeekIndex(plan));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startPlanRoutine = (day, sourcePlan = activePlan) => {
    if (!day?.routineId) return;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(
        TRAINING_PLAN_ROUTINE_INTENT_KEY,
        JSON.stringify({
          routineId: String(day.routineId),
          planId: String(sourcePlan?._id || sourcePlan?.id || ""),
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
      await refreshArchivedRoutines();
      toast.success("Rutina archivada; podrás recuperarla desde la biblioteca");
    } catch (error) {
      toast.error(error?.message || "No se pudo archivar la rutina");
    }
  };

  const handleRestoreRoutine = async (routine) => {
    try {
      await restoreRoutine(routine._id || routine.id);
      await refreshArchivedRoutines();
      toast.success("Rutina restaurada");
    } catch (error) {
      toast.error(error?.message || "No se pudo restaurar la rutina");
    }
  };

  const handleDuplicateRoutine = (routine) => {
    if (!routine || duplicatingRoutineId || isManagedClient) return;
    setDuplicateProgressMode("fresh");
    setRoutineToDuplicate(routine);
  };

  const confirmDuplicateRoutine = async () => {
    if (!routineToDuplicate || duplicatingRoutineId || isManagedClient) return;
    const routine = routineToDuplicate;
    const routineId = routine.id || routine._id;
    setDuplicatingRoutineId(routineId);
    try {
      await duplicateRoutine(routineId, {
        progressMode: duplicateProgressMode,
      });
      setRoutineToDuplicate(null);
      toast.success(
        duplicateProgressMode === "inherit"
          ? `Copia de ${routine.name} creada con su historial`
          : `Copia de ${routine.name} creada como nuevo ciclo`,
      );
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

  const activePlanStartsInFuture = planStartsInFuture(activePlan?.startDate);
  const visiblePlans = isCoach ? planTemplates : trainingPlans;
  const workspaceLoading =
    !activePlan &&
    (workspaceView === "plans"
      ? plansLoading && visiblePlans.length === 0
      : routinesLoading && routines.length === 0);
  const workspaceError =
    !activePlan &&
    (workspaceView === "plans"
      ? visiblePlans.length === 0
        ? plansError
        : ""
      : routines.length === 0
        ? routinesError
        : "");
  const workspaceReady = !workspaceLoading && !workspaceError;

  const retryWorkspace = () => {
    if (workspaceView === "plans") {
      refreshPlans().catch(() => {});
      return;
    }
    reloadRoutines();
  };

  return (
    <div
      className={`routines-shell w-full max-w-none ${activePlan ? "routines-shell--plan-detail" : ""}`}
    >
      <section className="space-y-5">
        {!activePlan ? (
          <MobilePageHeader
            title="Rutinas"
            variant="main"
            className="routines-page-header"
            onBack={() => setActivePlan(null)}
            actions={
              <>
                {canReturnToTraining ? (
                  <button
                    type="button"
                    onClick={handleReturnToTraining}
                    className="grid h-11 w-11 place-items-center rounded-full bg-[color:var(--surface-subtle)] text-[color:var(--text)]"
                    aria-label="Volver al entrenamiento"
                  >
                    <RotateCcw className="h-5 w-5" strokeWidth={1.8} />
                  </button>
                ) : null}
                {!isManagedClient ? (
                  <button
                    type="button"
                    onClick={() =>
                      workspaceView === "plans"
                        ? setPlanModalOpen(true)
                        : openCreate()
                    }
                    className="grid h-11 w-11 place-items-center rounded-full bg-[#251a12] text-[#fffdf8] dark:bg-[#e2ff00] dark:text-black"
                    aria-label={
                      workspaceView === "plans"
                        ? "Nueva planificación"
                        : "Nueva rutina"
                    }
                  >
                    <Plus className="h-5 w-5" strokeWidth={1.8} />
                  </button>
                ) : null}
              </>
            }
          />
        ) : null}
        <div className="hidden items-start justify-between gap-2 md:flex md:items-center md:gap-3">
          <div className="min-w-0">
            <p className="theme-accent-text text-[11px] font-black uppercase tracking-[0.14em]">
              {activePlan
                ? "Detalle de planificación"
                : "Gestión de entrenamiento"}
            </p>
            <h1 className="mt-1 text-[24px] font-black leading-[0.95] text-[color:var(--text)] sm:text-3xl">
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
                className="theme-accent-solid routines-surface inline-flex h-10 items-center justify-center gap-1.5 border px-3 text-xs font-black shadow-sm transition active:scale-[0.98] sm:h-11 sm:gap-2 sm:px-4 sm:text-sm"
                aria-label={
                  workspaceView === "plans"
                    ? "Nueva planificación"
                    : "Nueva rutina"
                }
              >
                <Plus className="h-4 w-4" />
                <span className="sm:hidden">Nueva</span>
                <span className="hidden sm:inline">
                  {workspaceView === "plans"
                    ? "Nueva planificación"
                    : "Nueva rutina"}
                </span>
              </button>
            ) : null}
          </div>
        </div>

        {!activePlan && !isCoach ? (
          <div
            className="routines-workspace-tabs grid grid-cols-2 gap-1 bg-[#f0eef2] p-1 dark:bg-[#1b1b1b]"
            role="tablist"
            aria-label="Gestionar rutinas y planificaciones"
          >
            <button
              type="button"
              role="tab"
              aria-selected={workspaceView === "plans"}
              onClick={() => setWorkspaceView("plans")}
              className={`inline-flex h-11 items-center justify-center border text-xs font-black uppercase transition ${
                workspaceView === "plans"
                  ? "border-[#d8c8c0] bg-white text-[#352018] shadow-sm dark:border-[#e2ff00] dark:bg-[#111] dark:text-[#e2ff00]"
                  : "border-transparent text-[#32262a] dark:text-[#b8b8a6]"
              }`}
            >
              Planificaciones
              {!isCoach && draftPlanCount ? (
                <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-700 dark:text-amber-300">
                  {draftPlanCount}{" "}
                  {draftPlanCount === 1 ? "borrador" : "borradores"}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={workspaceView === "routines"}
              onClick={() => setWorkspaceView("routines")}
              className={`inline-flex h-11 items-center justify-center border text-xs font-black uppercase transition ${
                workspaceView === "routines"
                  ? "border-[#d8c8c0] bg-white text-[#352018] shadow-sm dark:border-[#e2ff00] dark:bg-[#111] dark:text-[#e2ff00]"
                  : "border-transparent text-[#32262a] dark:text-[#b8b8a6]"
              }`}
            >
              Rutinas
            </button>
          </div>
        ) : null}

        {!activePlan && workspaceLoading ? (
          <div className="min-h-52 border-y border-[color:var(--border)]">
            <OperationLoader
              active
              delayMs={0}
              mode="inline"
              title={
                workspaceView === "plans"
                  ? "Cargando planificaciones"
                  : "Cargando rutinas"
              }
              description="Sincronizando tus datos con el servidor."
            />
          </div>
        ) : null}

        {!activePlan && !workspaceLoading && workspaceError ? (
          <div
            className="border-y border-[color:var(--border)] py-12 text-center"
            role="alert"
          >
            <RotateCcw className="theme-accent-text mx-auto h-6 w-6" />
            <h2 className="mt-3 text-base font-black text-[color:var(--text)]">
              No pudimos cargar esta seccion
            </h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-[color:var(--text-muted)]">
              Revisa tu conexion e intenta nuevamente.
            </p>
            <Button className="mt-4 h-11" onClick={retryWorkspace}>
              Reintentar
            </Button>
          </div>
        ) : null}

        {!isCoach &&
        workspaceReady &&
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

      {isCoach && workspaceReady && !activePlan && workspaceView === "plans" ? (
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
      workspaceReady &&
      !activePlan &&
      workspaceView === "plans" &&
      trainingPlans.length ? (
        <section className="mt-5 space-y-5">
          {currentActivePlan ? (
            <CurrentPlanOverview
              plan={currentActivePlan}
              state={currentPlanToday}
              onOpen={() => openTrainingPlan(currentActivePlan)}
              onStart={startPlanRoutine}
            />
          ) : (
            <section className="rounded-3xl bg-[color:var(--card)] px-4 py-5">
              <p className="text-xs text-[color:var(--text-muted)]">
                Estado actual
              </p>
              <h2 className="mt-1 text-xl font-medium text-[color:var(--text)]">
                Sin plan activo
              </h2>
              <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                Abre una planificación para completarla, programarla o
                activarla.
              </p>
            </section>
          )}
          {secondaryTrainingPlans.length ? (
            <div>
              <div className="mb-2 flex items-center justify-between gap-3 px-1">
                <h2 className="text-base font-medium">
                  {currentActivePlan
                    ? "Otras planificaciones"
                    : "Tus planificaciones"}
                </h2>
                <span className="shrink-0 text-xs text-[color:var(--text-muted)]">
                  {secondaryTrainingPlans.length}
                </span>
              </div>
              <div className="divide-y divide-[color:var(--border)] overflow-hidden rounded-3xl bg-[color:var(--card)] md:grid md:grid-cols-2 md:divide-x md:divide-y-0">
                {secondaryTrainingPlans.map((plan) => (
                  <SecondaryPlanRow
                    key={plan._id || plan.id}
                    plan={plan}
                    onOpen={openTrainingPlan}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {activePlan?.status === "draft" &&
      currentActivePlan &&
      String(currentActivePlan._id || currentActivePlan.id) !==
        String(activePlan._id || activePlan.id) ? (
        <section className="plan-detail-current routines-surface mt-5 flex items-center justify-between gap-3 border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase text-[color:var(--text-muted)]">
              Plan actualmente activo
            </p>
            <p className="mt-1 truncate text-base font-black">
              {currentActivePlan.name}
            </p>
          </div>
          <Badge variant="active">En curso</Badge>
        </section>
      ) : null}

      {activePlan ? (
        <section className="plan-detail-summary pb-4">
          <div className="plan-detail-hero relative h-[19rem] overflow-hidden bg-[#17130f] text-white sm:h-[22rem] md:h-[24rem] md:rounded-3xl">
            <img
              src={planningOverviewImage}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/35" />
            <button
              type="button"
              onClick={() => setActivePlan(null)}
              aria-label="Volver a planificaciones"
              className="absolute left-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full bg-black/45 text-white backdrop-blur-md transition hover:bg-black/60 md:hidden"
            >
              <ArrowLeft className="h-6 w-6" strokeWidth={2.1} />
            </button>
            <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
              <Badge
                variant={activePlan.status}
                className="!min-h-9 !rounded-full !border-white/20 !bg-white/90 !px-3 !text-[#251a12] backdrop-blur-md"
              >
                {PLAN_STATUS_LABELS[activePlan.status] || "Planificación"}
              </Badge>
              {!isManagedClient || user?.role === "Admin" ? (
                <details className="overflow-menu relative shrink-0">
                  <summary
                    className="overflow-menu-trigger overflow-menu-trigger--overlay touch-manipulation cursor-pointer list-none [&::-webkit-details-marker]:hidden"
                    aria-label="Opciones de la planificación"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </summary>
                  <div className="overflow-menu-panel absolute right-0 top-12 z-50 w-52 max-w-[calc(100vw-2rem)]">
                    {!isManagedClient &&
                    !["completed", "cancelled"].includes(activePlan.status) ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.currentTarget
                            .closest("details")
                            ?.removeAttribute("open");
                          setEditingPlan(activePlan);
                          setPlanModalOpen(true);
                        }}
                        className="flex h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-medium transition hover:bg-[color:var(--surface-subtle)]"
                      >
                        <Pencil className="h-4 w-4" /> Editar planificación
                      </button>
                    ) : null}
                    {!isManagedClient &&
                    ["draft", "paused"].includes(activePlan.status) ? (
                      <button
                        type="button"
                        disabled={missingPlanRoutines > 0}
                        onClick={(event) => {
                          event.currentTarget
                            .closest("details")
                            ?.removeAttribute("open");
                          activateTrainingPlan();
                        }}
                        className="flex h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-medium transition hover:bg-[color:var(--surface-subtle)] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Play className="h-4 w-4" />
                        {missingPlanRoutines
                          ? "Completa las rutinas"
                          : activePlanStartsInFuture
                            ? "Programar planificación"
                            : "Activar planificación"}
                      </button>
                    ) : null}
                    {!isManagedClient &&
                    ["active", "scheduled"].includes(activePlan.status) ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.currentTarget
                            .closest("details")
                            ?.removeAttribute("open");
                          deactivateTrainingPlan();
                        }}
                        className="flex h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-medium transition hover:bg-[color:var(--surface-subtle)]"
                      >
                        <Pause className="h-4 w-4" /> Desactivar planificación
                      </button>
                    ) : null}
                    {!isManagedClient &&
                    ["draft", "cancelled"].includes(activePlan.status) ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.currentTarget
                            .closest("details")
                            ?.removeAttribute("open");
                          setDeletePlanConfirmOpen(true);
                        }}
                        className="flex h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                        {activePlan.status === "draft"
                          ? "Eliminar borrador"
                          : "Eliminar planificación"}
                      </button>
                    ) : null}
                  </div>
                </details>
              ) : null}
            </div>
            <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-10 pt-16 sm:px-6 sm:pb-10 md:pb-7">
              <p className="text-xs font-medium text-white/75">Planificación</p>
              <h1 className="mt-1 truncate text-3xl font-medium leading-none tracking-[-0.035em] text-white sm:text-4xl">
                {activePlan.name}
              </h1>
              <p className="mt-2 text-sm font-normal text-white/80">
                {activePlan.goal || "Objetivo general"} ·{" "}
                {activePlan.durationWeeks}{" "}
                {Number(activePlan.durationWeeks) === 1 ? "semana" : "semanas"}
              </p>
            </div>
          </div>
          <TrainingPlanSchedule
            plan={activePlan}
            routines={routines}
            trainings={trainings}
            selectedWeek={selectedPlanWeek}
            onSelectWeek={setSelectedPlanWeek}
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
          <details className="plan-detail-info group mt-3 border-y border-[color:var(--detail-row-divider)]">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
              Detalles
              <ChevronDown className="h-4 w-4 text-[color:var(--text-muted)] transition-transform group-open:rotate-180" />
            </summary>
            <dl className="grid gap-3 border-t border-[color:var(--border)] py-3 text-xs sm:grid-cols-2">
              <div>
                <dt className="font-black uppercase text-[color:var(--text-muted)]">
                  Objetivo
                </dt>
                <dd className="mt-1 font-semibold text-[color:var(--text)]">
                  {activePlan.goal || "Objetivo general"}
                </dd>
              </div>
              <div>
                <dt className="font-black uppercase text-[color:var(--text-muted)]">
                  Duración
                </dt>
                <dd className="mt-1 font-semibold text-[color:var(--text)]">
                  {activePlan.durationWeeks} semanas ·{" "}
                  {activePlan.scheduleMode === "fixed"
                    ? "Semana recurrente"
                    : "Ciclo libre"}
                </dd>
              </div>
              <div>
                <dt className="font-black uppercase text-[color:var(--text-muted)]">
                  Fechas
                </dt>
                <dd className="mt-1 font-semibold text-[color:var(--text)]">
                  {formatPlanDate(activePlan.startDate)} -{" "}
                  {formatPlanDate(getPlanEndDate(activePlan))}
                </dd>
              </div>
              {activePlan.notes ? (
                <div>
                  <dt className="font-black uppercase text-[color:var(--text-muted)]">
                    Notas
                  </dt>
                  <dd className="mt-1 font-semibold text-[color:var(--text)]">
                    {activePlan.notes}
                  </dd>
                </div>
              ) : null}
            </dl>
          </details>
        </section>
      ) : null}

      {!activePlan && workspaceReady && workspaceView === "routines" ? (
        <RoutineToolbar
          showSearch={showSearch}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          showBranchFilter={showBranchFilter}
          activeBranch={activeBranch}
          setActiveBranch={setActiveBranch}
          branchCounts={branchCounts}
          showArchivedControl={!isManagedClient}
          archivedCount={archivedRoutines.length}
          showArchived={showArchivedRoutines}
          onToggleArchived={() =>
            setShowArchivedRoutines((current) => !current)
          }
        />
      ) : null}

      {!activePlan &&
      workspaceReady &&
      workspaceView === "routines" &&
      !isManagedClient ? (
        <div>
          {showArchivedRoutines ? (
            <div className="mt-3 divide-y divide-[color:var(--border)] border-y border-[color:var(--border)]">
              {archivedRoutines.length ? (
                archivedRoutines.map((routine) => (
                  <div
                    key={routine._id || routine.id}
                    className="flex min-h-14 items-center justify-between gap-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">
                        {routine.name}
                      </p>
                      <p className="text-xs font-semibold text-[color:var(--text-muted)]">
                        {getRoutineExerciseSummary(routine)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRestoreRoutine(routine)}
                      className="theme-accent-soft h-11 shrink-0 border px-3 text-xs font-black"
                    >
                      Restaurar
                    </button>
                  </div>
                ))
              ) : (
                <p className="py-3 text-sm font-semibold text-[color:var(--text-muted)]">
                  No tienes rutinas archivadas.
                </p>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {!activePlan &&
      workspaceReady &&
      workspaceView === "routines" &&
      !showArchivedRoutines ? (
        <section className="routine-library-list mt-4 space-y-7 sm:mt-5">
          {routineGroups.map((group) => (
            <section key={group.id} className="routine-library-group">
              <header className="routine-library-group__header mb-3 px-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                  {group.eyebrow}
                </p>
                <h2 className="mt-1 text-xl font-medium leading-tight tracking-[-0.02em] text-[color:var(--text)]">
                  {group.title}
                </h2>
                <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                  {group.description}
                </p>
              </header>
              <div className="routine-library-group__cards grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
                <AnimatePresence initial={false} mode="popLayout">
                  {group.routines.map((routine) => {
                    const isHighlighted = ["active", "scheduled"].includes(
                      routine.plan?.status,
                    );
                    const assignmentDays = (
                      routine.assignment?.dayIndexes || []
                    )
                      .map((dayIndex) =>
                        routine.plan?.scheduleMode === "fixed"
                          ? PLAN_DAY_NAMES[dayIndex]?.slice(0, 3)
                          : `Día ${dayIndex + 1}`,
                      )
                      .filter(Boolean)
                      .join(" / ");
                    const assignmentLabel = routine.plan
                      ? assignmentDays || "Asignada"
                      : "";

                    return (
                      <motion.article
                        key={routine.id || routine._id}
                        layout
                        initial={{ opacity: 0, y: 8, scale: 0.99 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.99 }}
                        transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
                        className={`routine-library-card routines-surface relative overflow-visible border border-[color:var(--border)] border-t-[3px] bg-[color:var(--card)] shadow-sm ${
                          isHighlighted
                            ? "border-t-[#352018] dark:border-t-[#e2ff00]"
                            : "border-t-[#626262] dark:border-t-[#6d6d62]"
                        } transition hover:border-[#ff8a66] dark:hover:border-[#e2ff00]`}
                      >
                        <button
                          type="button"
                          onClick={() => setViewingRoutine(routine)}
                          className="absolute inset-0 z-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#352018]/35 dark:focus-visible:ring-[#e2ff00]/40"
                          aria-label={`Ver ejercicios de ${routine.name}`}
                        />
                        <div className="routine-library-card__content pointer-events-none relative z-[1] p-3 sm:p-4">
                          <div className="routine-library-card__header flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              {assignmentLabel ? (
                                <p className="mb-1.5 truncate text-[9px] font-black uppercase tracking-[0.08em] text-[color:var(--accent-strong)]">
                                  {assignmentLabel}
                                </p>
                              ) : null}
                              <h2 className="line-clamp-2 text-xl font-black uppercase leading-[0.98] text-[color:var(--text)] sm:text-[25px]">
                                {routine.name}
                              </h2>
                              <p className="mt-2 truncate text-xs font-black uppercase text-[#352018] dark:text-[#e2ff00]">
                                {routine.totalExerciseCount}{" "}
                                {routine.totalExerciseCount === 1
                                  ? "ejercicio"
                                  : "ejercicios"}{" "}
                                · {routine.estimatedMinutes} min
                              </p>
                            </div>
                            {!isManagedClient ? (
                              <details className="overflow-menu pointer-events-auto relative -mr-2 -mt-2 shrink-0">
                                <summary
                                  className="overflow-menu-trigger cursor-pointer list-none [&::-webkit-details-marker]:hidden"
                                  aria-label={`Opciones de ${routine.name}`}
                                >
                                  <MoreVertical className="h-5 w-5" />
                                </summary>
                                <div className="overflow-menu-panel absolute right-0 top-12 z-20 w-48">
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
                                </div>
                              </details>
                            ) : null}
                          </div>

                          <div className="routine-library-card__previews mt-3 flex min-h-14 items-stretch gap-2 sm:mt-5">
                            {routine.preview.slice(0, 3).map((item, idx) => (
                              <div
                                key={`${routine.id}-preview-${idx}`}
                                className="h-16 w-[60px] shrink-0 overflow-hidden rounded border border-[color:var(--border)] bg-[color:var(--bg)] sm:h-24 sm:w-[92px]"
                              >
                                <RoutinePreviewImage item={item} />
                              </div>
                            ))}
                            {routine.hiddenPreviewCount > 0 ? (
                              <div className="grid h-16 w-[60px] shrink-0 place-items-center rounded border border-[#d8c8c0] bg-[#f3f1f3] text-sm font-bold text-[#38242a] dark:border-[#444] dark:bg-[#202020] dark:text-[#e2ff00] sm:h-24 sm:w-[92px]">
                                +{routine.hiddenPreviewCount}
                              </div>
                            ) : null}
                            {routine.preview.length === 0 ? (
                              <div className="grid h-14 flex-1 place-items-center border border-dashed border-[color:var(--border)] bg-[color:var(--bg)] text-xs font-black text-[color:var(--text-muted)] sm:h-16">
                                Sin ejercicios
                              </div>
                            ) : null}
                          </div>

                          <div className="routine-library-card__footer mt-3 flex min-h-10 items-center justify-between gap-3 border-t border-[#ecd7d0] pt-3 text-xs dark:border-[#333] sm:mt-5">
                            <div className="flex min-w-0 items-center gap-2 text-[color:var(--text-muted)]">
                              <span className="shrink-0 font-medium">
                                {routine.totalSets}{" "}
                                {routine.totalSets === 1 ? "serie" : "series"}
                              </span>
                              {routine.muscles.length ? (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="truncate">
                                    {routine.muscles.slice(0, 2).join(" y ")}
                                  </span>
                                </>
                              ) : null}
                            </div>
                            <span className="shrink-0 font-medium text-[color:var(--text)]">
                              {routine.trainingCount
                                ? `${routine.trainingCount} ${routine.trainingCount === 1 ? "sesión" : "sesiones"}`
                                : "Sin iniciar"}
                            </span>
                            {isManagedClient ? (
                              <span className="theme-accent-text shrink-0 text-xs font-black uppercase">
                                Coach
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </motion.article>
                    );
                  })}
                </AnimatePresence>
              </div>
            </section>
          ))}

          {!visibleRoutineCards.length ? (
            <div className="border-y border-[color:var(--border)] py-12 text-center">
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
                  ? "Prueba con otro filtro, búsqueda o sede."
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
          canEdit={!isManagedClient}
          onEdit={openEdit}
          onDuplicate={null}
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
          searchScopeKey={user?.id || user?._id || "self"}
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
          scheduleMode={activePlan?.scheduleMode}
          plan={activePlan}
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
      {deletePlanConfirmOpen ? (
        <Modal
          title={
            activePlan?.status === "draft"
              ? "Eliminar borrador"
              : "Eliminar planificación"
          }
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
                {activePlan?.status === "draft"
                  ? "Eliminar borrador"
                  : "Eliminar planificación"}
              </Button>
            </div>
          }
        >
          <p className="py-2 text-sm text-[color:var(--text-muted)]">
            Si no tiene entrenamientos, se eliminará definitivamente junto con
            las rutinas creadas solo para este plan. Si contiene historial, se
            conservará archivada.
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
      {routineToDuplicate && !isManagedClient ? (
        <Modal
          title="Duplicar rutina"
          subtitle={routineToDuplicate.name}
          onClose={() => !duplicatingRoutineId && setRoutineToDuplicate(null)}
          footer={
            <div className="flex w-full justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setRoutineToDuplicate(null)}
                disabled={Boolean(duplicatingRoutineId)}
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmDuplicateRoutine}
                disabled={Boolean(duplicatingRoutineId)}
              >
                {duplicatingRoutineId ? "Duplicando..." : "Crear copia"}
              </Button>
            </div>
          }
        >
          <div className="grid gap-2 py-2 sm:grid-cols-2" role="radiogroup">
            <button
              type="button"
              role="radio"
              aria-checked={duplicateProgressMode === "fresh"}
              onClick={() => setDuplicateProgressMode("fresh")}
              className={`min-h-28 border p-4 text-left transition ${
                duplicateProgressMode === "fresh"
                  ? "theme-accent-soft"
                  : "border-[color:var(--border)] bg-[color:var(--bg)] text-[color:var(--text)]"
              }`}
            >
              <RotateCcw className="h-5 w-5" />
              <span className="mt-3 block text-sm font-black uppercase">
                Nuevo ciclo
              </span>
              <span className="mt-1 block text-xs font-semibold leading-snug text-[color:var(--text-muted)]">
                Empieza pesos, comparaciones y PR desde cero.
              </span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={duplicateProgressMode === "inherit"}
              onClick={() => setDuplicateProgressMode("inherit")}
              className={`min-h-28 border p-4 text-left transition ${
                duplicateProgressMode === "inherit"
                  ? "theme-accent-soft"
                  : "border-[color:var(--border)] bg-[color:var(--bg)] text-[color:var(--text)]"
              }`}
            >
              <History className="h-5 w-5" />
              <span className="mt-3 block text-sm font-black uppercase">
                Continuar historial
              </span>
              <span className="mt-1 block text-xs font-semibold leading-snug text-[color:var(--text-muted)]">
                Conserva pesos, comparaciones y PR de la rutina original.
              </span>
            </button>
          </div>
        </Modal>
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
