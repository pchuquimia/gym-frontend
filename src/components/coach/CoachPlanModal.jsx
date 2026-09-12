import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Copy,
  Dumbbell,
  FilePlus2,
  FileText,
  Info,
  Minus,
  Moon,
  Flame,
  ChartNoAxesColumnIncreasing,
  Activity,
  Save,
  Play,
  Plus,
  Ruler,
  Scale,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import Button from "../ui/button";
import ProfileAvatar from "../profile/ProfileAvatar";
import "./CoachPlanModal.css";

const DAY_NAMES = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];
const DAY_SHORT = ["L", "M", "X", "J", "V", "S", "D"];
const LEVELS = [
  ["beginner", "Principiante"],
  ["intermediate", "Intermedio"],
  ["advanced", "Avanzado"],
];
const GOALS = [
  ["Fuerza", "Ganar fuerza"],
  ["Hipertrofia", "Hipertrofia"],
  ["Perdida de grasa", "Perder grasa"],
  ["Acondicionamiento", "Mejorar condición"],
];
const UNIT_OPTIONS = [
  ["day", "días"],
  ["week", "semanas"],
  ["month", "meses"],
];
const WEEKDAY_OPTIONS = DAY_NAMES.map((label, index) => [index + 1, label]);
const PHOTO_VIEWS = [
  ["front", "Frontal"],
  ["side", "Lateral"],
  ["back", "Posterior"],
];
const MEASUREMENT_FIELDS = [
  ["waist", "Cintura"],
  ["chest", "Pecho"],
  ["hips", "Cadera"],
  ["arm", "Brazo"],
  ["thigh", "Muslo"],
];

const DEFAULT_FOLLOW_UP = {
  useCoachDefaults: true,
  checkIn: { enabled: true, cadence: "workout_days", weekdays: [] },
  weight: {
    enabled: true,
    intervalWeeks: 1,
    frequencyInterval: 1,
    frequencyUnit: "week",
    weekday: 1,
    required: true,
  },
  photos: {
    enabled: true,
    intervalWeeks: 4,
    frequencyInterval: 4,
    frequencyUnit: "week",
    views: ["front", "side", "back"],
    required: false,
  },
  measurements: {
    enabled: true,
    intervalWeeks: 4,
    frequencyInterval: 4,
    frequencyUnit: "week",
    fields: ["waist", "chest", "hips"],
    required: false,
  },
  review: { enabled: true, intervalWeeks: 4, leadDays: 2 },
  finalEvaluation: { enabled: true },
};

const profileGoal = (value) => {
  const normalized = String(value || "").toLowerCase();
  if (["strength", "fuerza"].includes(normalized)) return "Fuerza";
  if (["muscle_gain", "hypertrophy", "hipertrofia"].includes(normalized)) {
    return "Hipertrofia";
  }
  if (
    ["fat_loss", "perdida de grasa", "pérdida de grasa"].includes(normalized)
  ) {
    return "Perdida de grasa";
  }
  if (
    ["endurance", "general_fitness", "acondicionamiento"].includes(normalized)
  ) {
    return "Acondicionamiento";
  }
  return "Fuerza";
};

const suggestedPlanName = (goal) => {
  const names = {
    Fuerza: "Fuerza · Bloque inicial",
    Hipertrofia: "Hipertrofia · Bloque inicial",
    "Perdida de grasa": "Recomposición · Bloque inicial",
    Acondicionamiento: "Condición · Bloque inicial",
  };
  return names[goal] || "Plan personalizado";
};

const trainingIndexesFor = (frequency) => {
  const presets = {
    1: [0],
    2: [0, 3],
    3: [0, 2, 4],
    4: [0, 1, 3, 4],
    5: [0, 1, 2, 3, 4],
    6: [0, 1, 2, 3, 4, 5],
    7: [0, 1, 2, 3, 4, 5, 6],
  };
  return (
    presets[Math.min(7, Math.max(1, Number(frequency) || 3))] || presets[3]
  );
};

const createFixedSchedule = (frequency = 3) => {
  const selected = new Set(trainingIndexesFor(frequency));
  return DAY_NAMES.map((_, index) => ({
    dayIndex: index + 1,
    type: selected.has(index) ? "training" : "rest",
    focus: "",
    slotId: `slot_fixed_${index + 1}`,
    order: index + 1,
    sourceRoutineId: "",
    routineId: "",
  }));
};

const mergeFollowUp = (value = {}) => {
  const mergeFrequency = (key) => {
    const section = { ...DEFAULT_FOLLOW_UP[key], ...(value[key] || {}) };
    if (!section.frequencyInterval)
      section.frequencyInterval = section.intervalWeeks || 1;
    if (!section.frequencyUnit) section.frequencyUnit = "week";
    return section;
  };
  return {
    ...DEFAULT_FOLLOW_UP,
    ...value,
    checkIn: { ...DEFAULT_FOLLOW_UP.checkIn, ...(value.checkIn || {}) },
    weight: mergeFrequency("weight"),
    photos: mergeFrequency("photos"),
    measurements: mergeFrequency("measurements"),
    review: { ...DEFAULT_FOLLOW_UP.review, ...(value.review || {}) },
    finalEvaluation: {
      ...DEFAULT_FOLLOW_UP.finalEvaluation,
      ...(value.finalEvaluation || {}),
    },
  };
};

const dateLabel = (value) => {
  if (!value) return "Sin fecha";
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return date
    .toLocaleDateString("es-BO", { day: "numeric", month: "short" })
    .replace(".", "");
};

const localDateInputValue = (date = new Date()) => {
  const local = new Date(date);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 10);
};

const answerValue = (answer) =>
  Array.isArray(answer?.value)
    ? answer.value.join(", ")
    : String(answer?.value || "").trim();

const intakeWarning = (athlete) => {
  const answers = athlete?.coachIntake?.answers || [];
  const specific = answers
    .filter((answer) =>
      /injur|medical|lesi|dolor|condici/i.test(`${answer.key} ${answer.label}`),
    )
    .map(answerValue)
    .filter((value) => value && !/^(no|ningun|ninguna|ninguno)$/i.test(value));
  return specific[0] || athlete?.profile?.healthNotes || "";
};

const cadenceText = (section) => {
  const interval = Number(
    section?.frequencyInterval || section?.intervalWeeks || 1,
  );
  const unit = section?.frequencyUnit || "week";
  const labels = {
    day: interval === 1 ? "Cada día" : `Cada ${interval} días`,
    week: interval === 1 ? "Cada semana" : `Cada ${interval} semanas`,
    month: interval === 1 ? "Cada mes" : `Cada ${interval} meses`,
  };
  return labels[unit];
};

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? "bg-[#181918] dark:bg-[#eeeae2]" : "bg-[color:var(--surface-subtle)]"}`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${checked ? "left-6 dark:bg-black" : "left-1"}`}
      />
    </button>
  );
}

function ProgressSteps({ step }) {
  return (
    <div
      className="grid grid-cols-3 px-2 pb-4 pt-3"
      aria-label="Progreso de la planificación"
    >
      {["General", "Semana", "Seguimiento"].map((label, index) => {
        const value = index + 1;
        const complete = value < step;
        const active = value === step;
        return (
          <div
            key={label}
            className="relative flex flex-col items-center gap-1.5"
          >
            {index ? (
              <span className="absolute right-1/2 top-3 h-px w-full bg-[color:var(--border)]" />
            ) : null}
            <span
              className={`relative z-10 grid h-7 w-7 place-items-center rounded-full text-xs font-semibold ${
                complete
                  ? "bg-[#181918] text-white"
                  : active
                    ? "bg-[#181918] text-white dark:bg-[#eeeae2] dark:text-black"
                    : "bg-[color:var(--surface-subtle)] text-[color:var(--text-muted)]"
              }`}
            >
              {complete ? (
                <Check className="h-4 w-4" strokeWidth={2.8} />
              ) : (
                value
              )}
            </span>
            <span
              className={`relative z-10 bg-[color:var(--bg)] px-1 text-[11px] ${active ? "font-semibold" : "text-[color:var(--text-muted)]"}`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function AthleteContext({ athlete, compact = false }) {
  return (
    <section
      className={`plan-editor__athlete flex items-center gap-3 rounded-[20px] border border-[color:var(--border)] bg-[color:var(--card)] ${compact ? "p-3" : "p-4"}`}
    >
      {athlete?.profile?.avatarPhotoId ? (
        <ProfileAvatar
          photoId={athlete.profile.avatarPhotoId}
          name={athlete?.name}
          className={`${compact ? "h-12 w-12" : "h-14 w-14"} rounded-full bg-[color:var(--surface-subtle)] text-sm font-semibold`}
        />
      ) : (
        <span
          className={`grid ${compact ? "h-12 w-12" : "h-14 w-14"} shrink-0 place-items-center rounded-full bg-[color:var(--surface-subtle)] text-sm font-semibold`}
        >
          {String(athlete?.name || "A")
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join("")}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-lg font-semibold tracking-[-0.03em]">
          {athlete?.name || "Alumno"}
        </h3>
        <p className="mt-0.5 flex items-center gap-2 text-xs text-[color:var(--text-muted)]">
          <span className="h-2.5 w-2.5 rounded-full bg-[#181918]" />
          Objetivo ·{" "}
          {GOALS.find(
            ([value]) => value === profileGoal(athlete?.profile?.goal),
          )?.[1] || "Por definir"}
        </p>
      </div>
    </section>
  );
}

function FrequencyEditor({ value, onChange, showWeekday = false }) {
  return (
    <div
      className={`mt-3 grid grid-cols-2 gap-2 ${showWeekday && (value.frequencyUnit || "week") === "week" ? "sm:grid-cols-3" : ""}`}
    >
      <label className="text-[11px] text-[color:var(--text-muted)]">
        Cada
        <input
          type="number"
          min="1"
          max="90"
          inputMode="numeric"
          aria-invalid={
            !Number.isInteger(
              Number(value.frequencyInterval ?? value.intervalWeeks ?? 1),
            ) ||
            Number(value.frequencyInterval ?? value.intervalWeeks ?? 1) < 1 ||
            Number(value.frequencyInterval ?? value.intervalWeeks ?? 1) > 90
          }
          value={value.frequencyInterval ?? value.intervalWeeks ?? 1}
          onChange={(event) => {
            const frequencyInterval =
              event.target.value === "" ? "" : Number(event.target.value);
            onChange({
              frequencyInterval,
              ...(value.frequencyUnit === "week"
                ? { intervalWeeks: frequencyInterval }
                : {}),
            });
          }}
          className="mt-1 min-h-11 w-full rounded-xl bg-[color:var(--surface-subtle)] px-3 text-base text-[color:var(--text)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
        />
      </label>
      {!Number.isInteger(
        Number(value.frequencyInterval ?? value.intervalWeeks ?? 1),
      ) ||
      Number(value.frequencyInterval ?? value.intervalWeeks ?? 1) < 1 ||
      Number(value.frequencyInterval ?? value.intervalWeeks ?? 1) > 90 ? (
        <p
          role="alert"
          className="col-span-full order-last text-xs text-red-700 dark:text-red-300"
        >
          Introduce una frecuencia entre 1 y 90, sin decimales.
        </p>
      ) : null}
      <label className="text-[11px] text-[color:var(--text-muted)]">
        Periodo
        <select
          value={value.frequencyUnit || "week"}
          onChange={(event) => {
            const frequencyUnit = event.target.value;
            const frequencyInterval = Number(
              value.frequencyInterval || value.intervalWeeks || 1,
            );
            onChange({
              frequencyUnit,
              ...(frequencyUnit === "week"
                ? { intervalWeeks: frequencyInterval }
                : {}),
            });
          }}
          className="mt-1 min-h-11 w-full rounded-xl bg-[color:var(--surface-subtle)] px-3 text-base text-[color:var(--text)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
        >
          {UNIT_OPTIONS.map(([unit, label]) => (
            <option key={unit} value={unit}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {showWeekday && (value.frequencyUnit || "week") === "week" ? (
        <label className="col-span-2 text-[11px] text-[color:var(--text-muted)] sm:col-span-1">
          Día
          <select
            value={value.weekday || 1}
            onChange={(event) =>
              onChange({ weekday: Number(event.target.value) })
            }
            className="mt-1 min-h-11 w-full rounded-xl bg-[color:var(--surface-subtle)] px-3 text-base text-[color:var(--text)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
          >
            {WEEKDAY_OPTIONS.map(([number, label]) => (
              <option key={number} value={number}>
                {label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}

function FollowUpCard({
  icon: Icon,
  title,
  subtitle,
  enabled,
  onEnabled,
  required,
  onRequired,
  readOnly = false,
  children,
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section
      className={`plan-editor__task overflow-hidden rounded-[20px] border border-[color:var(--border)] bg-[color:var(--card)] shadow-sm ${enabled ? "" : "opacity-70"}`}
    >
      <div className="plan-editor__task-header flex items-center gap-2 p-3.5">
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          disabled={readOnly || !enabled}
          aria-expanded={!readOnly && enabled ? expanded : false}
          className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default"
        >
          <span
            className={`plan-editor__task-icon grid h-10 w-10 shrink-0 place-items-center rounded-[12px] ${enabled ? "bg-[#181918] text-white dark:bg-[#eeeae2] dark:text-black" : "bg-[color:var(--surface-subtle)] text-[color:var(--text-muted)]"}`}
          >
            <Icon className="h-5 w-5" strokeWidth={1.8} />
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block text-sm font-semibold">{title}</strong>
            <span className="mt-0.5 block text-xs text-[color:var(--text-muted)]">
              {enabled ? subtitle : "Desactivado"}
            </span>
          </span>
          {!readOnly && enabled ? (
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-[color:var(--text-muted)] transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          ) : null}
        </button>
        {readOnly ? (
          <span className="rounded-full bg-[color:var(--surface-subtle)] px-2 py-1 text-[10px] font-semibold text-[color:var(--text-muted)]">
            General
          </span>
        ) : (
          <Toggle
            checked={enabled}
            onChange={(next) => {
              onEnabled(next);
              if (next) setExpanded(true);
            }}
            label={`Activar ${title}`}
          />
        )}
      </div>
      {!readOnly && enabled && expanded ? (
        <div className="border-t border-[color:var(--detail-row-divider)] px-4 pb-4 pt-3">
          {children}
          {typeof required === "boolean" ? (
            <div className="plan-editor__required mt-4 flex min-h-11 items-center justify-between rounded-xl bg-[color:var(--surface-subtle)] px-3 text-sm font-medium">
              Obligatorio para el alumno
              <Toggle
                checked={required}
                onChange={onRequired}
                label={`Marcar ${title} como obligatorio`}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export default function CoachPlanModal({
  athlete,
  templates = [],
  planTemplates = [],
  initialPlanTemplateId = "",
  initialSource = "",
  initialData,
  replacingPlan,
  manageRoutinesSeparately = false,
  assignedRoutines = [],
  onEditRoutine,
  onSave,
  onClose,
}) {
  const dialogRef = useRef(null);
  const contentScrollRef = useRef(null);
  const slotSequenceRef = useRef(0);
  const isEditing = Boolean(initialData?._id || initialData?.id);
  const intakeSubmitted = Boolean(
    athlete?.coachIntake?.status === "submitted" &&
    athlete?.coachIntake?.submittedAt,
  );
  const initialGoal = initialData?.goal || profileGoal(athlete?.profile?.goal);
  const initialFrequency = Number(athlete?.profile?.weeklyFrequency || 3);
  const requestedTemplate = !isEditing
    ? planTemplates.find(
        (item) => String(item._id || item.id) === String(initialPlanTemplateId),
      )
    : null;
  const startsFromEvaluation =
    !isEditing && initialSource === "evaluation" && intakeSubmitted;

  const [step, setStep] = useState(
    isEditing || requestedTemplate || startsFromEvaluation ? 1 : 0,
  );
  const [source, setSource] = useState(
    requestedTemplate
      ? "template"
      : isEditing
        ? "existing"
        : startsFromEvaluation
          ? "evaluation"
          : "zero",
  );
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(
    Boolean(requestedTemplate),
  );
  const [closeConfirmationOpen, setCloseConfirmationOpen] = useState(false);
  const [selectedScheduleIndex, setSelectedScheduleIndex] = useState(0);
  const [dayEditorOpen, setDayEditorOpen] = useState(false);
  const [dayDraft, setDayDraft] = useState(null);
  const [routinePickerOpen, setRoutinePickerOpen] = useState(false);
  const [routineSearch, setRoutineSearch] = useState("");
  const [pendingMode, setPendingMode] = useState("");
  const [confirmCycleRemoval, setConfirmCycleRemoval] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [customizingFollowUp, setCustomizingFollowUp] = useState(false);
  const [notifyAthlete, setNotifyAthlete] = useState(true);
  const [activationMode, setActivationMode] = useState(() => {
    const initialStart = String(initialData?.startDate || "").slice(0, 10);
    return initialStart && initialStart > localDateInputValue()
      ? "scheduled"
      : "now";
  });
  const [selectedPlanTemplateId, setSelectedPlanTemplateId] = useState(
    initialData?.sourcePlanId ||
      initialData?.planTemplateId ||
      String(requestedTemplate?._id || requestedTemplate?.id || ""),
  );
  const [name, setName] = useState(
    initialData?.name ||
      requestedTemplate?.name ||
      suggestedPlanName(initialGoal),
  );
  const [level, setLevel] = useState(
    initialData?.level ||
      requestedTemplate?.level ||
      athlete?.profile?.experienceLevel ||
      "beginner",
  );
  const [goal, setGoal] = useState(initialGoal);
  const [durationWeeks, setDurationWeeks] = useState(
    initialData?.durationWeeks || requestedTemplate?.durationWeeks || 5,
  );
  const [startDate, setStartDate] = useState(
    initialData?.startDate
      ? String(initialData.startDate).slice(0, 10)
      : localDateInputValue(),
  );
  const [scheduleMode, setScheduleMode] = useState(
    initialData?.scheduleMode === "flexible_guided"
      ? "sequential_cycle"
      : initialData?.scheduleMode || requestedTemplate?.scheduleMode || "fixed",
  );
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [followUp, setFollowUp] = useState(() =>
    mergeFollowUp(initialData?.followUp),
  );
  const [schedule, setSchedule] = useState(() => {
    const value = initialData?.weeklySchedule?.length
      ? initialData.weeklySchedule
      : requestedTemplate?.weeklySchedule?.length
        ? requestedTemplate.weeklySchedule
        : createFixedSchedule(initialFrequency);
    return value.map((day, index) => ({
      dayIndex: index + 1,
      slotId: day.slotId || `slot_${index + 1}`,
      order: day.order || index + 1,
      type: day.type || "training",
      focus: day.focus || "",
      sourceRoutineId: day.sourceRoutineId || "",
      routineId: day.routineId || "",
    }));
  });

  const initialSignatureRef = useRef("");
  const warning = intakeWarning(athlete);
  const selectedPlanTemplate = planTemplates.find(
    (item) => String(item._id || item.id) === String(selectedPlanTemplateId),
  );
  const trainingDays = schedule.filter((day) => day.type === "training");
  const missingRoutines = manageRoutinesSeparately
    ? 0
    : trainingDays.filter((day) => !day.sourceRoutineId).length;
  const validDuration =
    Number.isInteger(Number(durationWeeks)) &&
    Number(durationWeeks) >= 1 &&
    Number(durationWeeks) <= 52;
  const validStartDate = Boolean(
    startDate && !Number.isNaN(new Date(`${startDate}T12:00:00`).getTime()),
  );
  const endDate = useMemo(() => {
    if (!validStartDate || !validDuration) return "";
    const date = new Date(`${startDate}T12:00:00`);
    date.setDate(date.getDate() + Number(durationWeeks) * 7 - 1);
    return date.toISOString().slice(0, 10);
  }, [durationWeeks, startDate, validDuration, validStartDate]);
  const todayDateKey = localDateInputValue();
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowDateKey = localDateInputValue(tomorrowDate);
  const signature = JSON.stringify({
    source,
    selectedPlanTemplateId,
    name,
    level,
    goal,
    durationWeeks,
    startDate,
    scheduleMode,
    notes,
    followUp,
    schedule,
  });
  if (!initialSignatureRef.current) initialSignatureRef.current = signature;
  const dirty = signature !== initialSignatureRef.current;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (routinePickerOpen && contentScrollRef.current) {
      contentScrollRef.current.scrollTop = 0;
    }
  }, [routinePickerOpen]);

  useEffect(() => {
    if (!requestedTemplate) return;
    const templateId = String(requestedTemplate._id || requestedTemplate.id);
    setSelectedPlanTemplateId(templateId);
    setName(requestedTemplate.name || suggestedPlanName(initialGoal));
    setLevel(requestedTemplate.level || level);
    setGoal(requestedTemplate.goal || initialGoal);
    setDurationWeeks(requestedTemplate.durationWeeks || 5);
    setScheduleMode(requestedTemplate.scheduleMode || "fixed");
    setSchedule(
      (requestedTemplate.weeklySchedule || []).map((day, index) => ({
        dayIndex: index + 1,
        slotId: day.slotId || `slot_${index + 1}`,
        order: day.order || index + 1,
        type: day.type || "training",
        focus: day.focus || "",
        sourceRoutineId: day.sourceRoutineId || day.routineId || "",
        routineId: "",
      })),
    );
    setTemplatePickerOpen(false);
    // The requested catalog item is an initial navigation intent only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedTemplate]);

  const requestClose = () => {
    if (saving) return;
    if (dirty) setCloseConfirmationOpen(true);
    else onClose();
  };

  const updateFollowUp = (key, changes) =>
    setFollowUp((current) => ({
      ...current,
      [key]: { ...current[key], ...changes },
    }));

  const updateDay = (index, changes) =>
    setSchedule((current) =>
      current.map((day, itemIndex) =>
        itemIndex === index
          ? {
              ...day,
              ...changes,
              ...(changes.type && changes.type !== "training"
                ? { sourceRoutineId: "", routineId: "" }
                : {}),
            }
          : day,
      ),
    );

  const freshSlotId = (mode) => {
    slotSequenceRef.current += 1;
    return `slot_${mode}_${Date.now().toString(36)}_${slotSequenceRef.current}`;
  };

  const resetSchedule = (items, mode) =>
    items.map((day, index) => ({
      ...day,
      dayIndex: index + 1,
      order: index + 1,
      slotId: freshSlotId(mode),
      sourceRoutineId: "",
      routineId: "",
    }));

  const applyScheduleMode = (mode) => {
    setScheduleMode(mode);
    setSelectedScheduleIndex(0);
    setSchedule((current) =>
      Array.from(
        { length: mode === "fixed" ? 7 : current.length },
        (_, index) => ({
          ...(current[index] || {
            slotId: freshSlotId(mode),
            type: "rest",
            focus: "",
            sourceRoutineId: "",
            routineId: "",
          }),
          dayIndex: index + 1,
          order: index + 1,
        }),
      ),
    );
    setPendingMode("");
  };
  const changeScheduleMode = (mode) => {
    if (mode !== scheduleMode) setPendingMode(mode);
  };
  const openDayEditor = (index, changes = {}) => {
    setSelectedScheduleIndex(index);
    setDayDraft({ ...schedule[index], ...changes });
    setRoutineSearch("");
    setDayEditorOpen(true);
  };

  const openRoutinePicker = (index, changes = {}) => {
    setSelectedScheduleIndex(index);
    setDayDraft({ ...schedule[index], ...changes, type: "training" });
    setRoutineSearch("");
    setDayEditorOpen(false);
    setRoutinePickerOpen(true);
  };

  const selectRoutine = (routine) => {
    const sourceRoutineId = String(routine.id || routine._id);
    updateDay(selectedScheduleIndex, {
      ...(dayDraft || {}),
      type: "training",
      sourceRoutineId,
      routineId: "",
      focus: routine.name || dayDraft?.focus || "",
    });
    setDayDraft(null);
    setRoutinePickerOpen(false);
    setStep(2);
  };

  const resizeCycle = (delta, confirmed = false) => {
    if (
      delta < 0 &&
      !confirmed &&
      (schedule.at(-1)?.type === "training" ||
        schedule.at(-1)?.focus ||
        schedule.at(-1)?.sourceRoutineId)
    ) {
      setConfirmCycleRemoval(true);
      return;
    }
    setConfirmCycleRemoval(false);
    const nextLength = Math.min(28, Math.max(2, schedule.length + delta));
    if (nextLength < schedule.length) {
      setSchedule((current) => current.slice(0, nextLength));
      setSelectedScheduleIndex((current) => Math.min(current, nextLength - 1));
      return;
    }
    if (nextLength > schedule.length) {
      setSchedule((current) => [
        ...current,
        ...Array.from({ length: nextLength - current.length }, (_, index) => ({
          dayIndex: current.length + index + 1,
          type: "training",
          focus: "",
          slotId: freshSlotId("cycle"),
          order: current.length + index + 1,
          sourceRoutineId: "",
          routineId: "",
        })),
      ]);
    }
  };

  const applyTemplate = (template) => {
    const templateId = String(template._id || template.id);
    setSource("template");
    setSelectedPlanTemplateId(templateId);
    setName(template.name || suggestedPlanName(initialGoal));
    setLevel(template.level || level);
    setGoal(template.goal || initialGoal);
    setDurationWeeks(template.durationWeeks || 5);
    setScheduleMode(template.scheduleMode || "fixed");
    setSchedule(
      (template.weeklySchedule || []).map((day, index) => ({
        dayIndex: index + 1,
        slotId: freshSlotId(template.scheduleMode || "fixed"),
        order: index + 1,
        type: day.type || "training",
        focus: day.focus || "",
        sourceRoutineId: day.sourceRoutineId || day.routineId || "",
        routineId: "",
      })),
    );
    setTemplatePickerOpen(false);
    setStep(1);
  };

  const beginFromZero = () => {
    setSource("zero");
    setSelectedPlanTemplateId("");
    setName("Nueva planificación");
    setGoal("Hipertrofia");
    setLevel("beginner");
    setScheduleMode("fixed");
    setSchedule(resetSchedule(createFixedSchedule(3), "fixed"));
    setStep(1);
  };

  const beginQuickPlan = () => {
    const nextGoal = profileGoal(athlete?.profile?.goal);
    setSource("quick");
    setSelectedPlanTemplateId("");
    setName(suggestedPlanName(nextGoal));
    setGoal(nextGoal);
    setLevel(athlete?.profile?.experienceLevel || "beginner");
    setScheduleMode("fixed");
    setSchedule(resetSchedule(createFixedSchedule(initialFrequency), "fixed"));
    setStep(1);
  };

  const duplicatePrevious = () => {
    if (!replacingPlan) return;
    setSource("previous");
    setSelectedPlanTemplateId("");
    setName(`${replacingPlan.name} · Continuación`);
    setGoal(replacingPlan.goal || initialGoal);
    setLevel(replacingPlan.level || level);
    setDurationWeeks(replacingPlan.durationWeeks || 5);
    setScheduleMode(replacingPlan.scheduleMode || "fixed");
    setSchedule(
      (replacingPlan.weeklySchedule || []).map((day, index) => ({
        dayIndex: index + 1,
        slotId: freshSlotId(replacingPlan.scheduleMode || "fixed"),
        order: index + 1,
        type: day.type || "training",
        focus: day.focus || "",
        sourceRoutineId: day.sourceRoutineId || "",
        routineId: "",
      })),
    );
    setStep(1);
  };

  const payload = () => {
    const usesCatalogPlan =
      selectedPlanTemplate?.catalogSource === "training_plan";
    return {
      planTemplateId:
        selectedPlanTemplateId && !usesCatalogPlan
          ? selectedPlanTemplateId
          : null,
      sourcePlanId:
        selectedPlanTemplateId && usesCatalogPlan
          ? selectedPlanTemplateId
          : null,
      name: name.trim(),
      level,
      goal,
      durationWeeks: Number(durationWeeks),
      startDate: startDate || null,
      scheduleMode,
      weeklySchedule: schedule,
      notes: notes.trim(),
      followUp,
    };
  };

  const submit = async ({ activate = false } = {}) => {
    if (saving) return;
    if (!name.trim() || !validDuration || !validStartDate) {
      setStep(1);
      setSaveError(
        "Revisa el nombre, la fecha de inicio y la duración del plan.",
      );
      return;
    }
    if (!trainingDays.length) {
      setStep(2);
      setSaveError("Añade al menos una sesión de entrenamiento.");
      return;
    }
    if (!followUp.useCoachDefaults) {
      const invalid = ["weight", "photos", "measurements"].some((key) => {
        const rule = followUp[key];
        const count = Number(rule.frequencyInterval ?? rule.intervalWeeks);
        return (
          rule.enabled && (!Number.isInteger(count) || count < 1 || count > 90)
        );
      });
      const reviewInvalid =
        followUp.review.enabled &&
        (!Number.isInteger(Number(followUp.review.intervalWeeks)) ||
          Number(followUp.review.intervalWeeks) < 1 ||
          Number(followUp.review.intervalWeeks) > 12 ||
          !Number.isInteger(Number(followUp.review.leadDays)) ||
          Number(followUp.review.leadDays) < 0 ||
          Number(followUp.review.leadDays) > 14);
      if (
        invalid ||
        reviewInvalid ||
        (followUp.photos.enabled && !followUp.photos.views.length) ||
        (followUp.measurements.enabled && !followUp.measurements.fields.length)
      ) {
        setStep(3);
        if (!isEditing) setCustomizingFollowUp(true);
        setSaveError(
          "Revisa las frecuencias y selecciona al menos una vista de fotos o medida en las tareas activas.",
        );
        return;
      }
    }
    setSaveError("");
    setSaving(true);
    try {
      await onSave(payload(), { activate, notifyAthlete });
    } catch (error) {
      setSaveError(
        error?.response?.data?.message ||
          "No se pudo guardar el plan. Inténtalo de nuevo.",
      );
    } finally {
      setSaving(false);
    }
  };

  const currentScheduleDay = dayDraft;
  const chooseDayActivity = (type) => {
    if (type === "training" && !manageRoutinesSeparately) {
      openRoutinePicker(selectedScheduleIndex, {
        ...(dayDraft || {}),
        type: "training",
      });
      return;
    }

    updateDay(selectedScheduleIndex, {
      ...(dayDraft || {}),
      type,
      ...(type !== "training"
        ? { focus: "", sourceRoutineId: "", routineId: "" }
        : {}),
    });
    setDayDraft(null);
    setDayEditorOpen(false);
  };

  const dayEditorPanel = currentScheduleDay ? (
    <div
      data-testid="day-activity-backdrop"
      className="plan-editor__day-activity-backdrop fixed inset-0 z-[105] grid place-items-center bg-black/45 p-5 backdrop-blur-[2px]"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Elegir actividad del día"
        className="plan-editor__day-activity relative w-full max-w-sm rounded-[24px] bg-[color:var(--bg)] p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
              {scheduleMode === "fixed"
                ? DAY_NAMES[selectedScheduleIndex]
                : `Día ${selectedScheduleIndex + 1}`}
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.035em]">
              ¿Qué actividad tendrá?
            </h2>
          </div>
          <button
            type="button"
            aria-label="Cerrar selección de actividad"
            onClick={() => {
              setDayDraft(null);
              setDayEditorOpen(false);
            }}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--surface-subtle)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-1 text-sm text-[color:var(--text-muted)]">
          Elige una opción para continuar.
        </p>
        <div className="mt-5 space-y-2.5">
          {[
            {
              value: "training",
              title: "Entrenamiento",
              detail: "Seleccionar o cambiar la rutina",
              Icon: Dumbbell,
            },
            {
              value: "recovery",
              title: "Recuperación activa",
              detail: "Movilidad o actividad ligera",
              Icon: Activity,
            },
            {
              value: "rest",
              title: "Descanso",
              detail: "Día sin entrenamiento",
              Icon: Moon,
            },
          ].map(({ value, title, detail, Icon }) => {
            const selected = currentScheduleDay.type === value;
            return (
              <button
                key={value}
                type="button"
                aria-label={`Elegir ${title}`}
                aria-pressed={selected}
                onClick={() => chooseDayActivity(value)}
                className="plan-editor__day-activity-option flex min-h-[72px] w-full items-center gap-3 rounded-[16px] border border-[color:var(--border)] bg-[color:var(--card)] p-3 text-left"
              >
                <span className="plan-editor__day-activity-icon grid h-11 w-11 shrink-0 place-items-center rounded-[12px]">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-sm font-semibold">
                    {title}
                  </strong>
                  <span className="mt-0.5 block text-xs text-[color:var(--text-muted)]">
                    {detail}
                  </span>
                </span>
                {selected ? (
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[color:var(--plan-accent)] text-[color:var(--plan-on-accent)]">
                    <Check className="h-4 w-4" />
                  </span>
                ) : (
                  <ChevronRight className="h-5 w-5 shrink-0 text-[color:var(--text-muted)]" />
                )}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  ) : null;

  const routinePickerScreen = () => {
    const normalizedSearch = routineSearch.trim().toLocaleLowerCase();
    const filteredRoutines = templates.filter((routine) =>
      String(routine.name || "")
        .toLocaleLowerCase()
        .includes(normalizedSearch),
    );
    const dayLabel =
      scheduleMode === "fixed"
        ? DAY_NAMES[selectedScheduleIndex]
        : `Día ${selectedScheduleIndex + 1}`;

    return (
      <div className="plan-editor__routine-picker space-y-4">
        <header className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
              {dayLabel}
            </p>
            <h1 className="mt-1 text-xl font-semibold">Elige una rutina</h1>
          </div>
          <span className="plan-editor__count shrink-0">
            {templates.length} {templates.length === 1 ? "rutina" : "rutinas"}
          </span>
        </header>

        <label className="plan-editor__routine-search flex h-12 items-center gap-2 rounded-[14px] border border-[color:var(--border)] bg-[color:var(--card)] px-3">
          <span className="sr-only">Buscar rutina</span>
          <Dumbbell className="h-4 w-4 shrink-0 text-[color:var(--text-muted)]" />
          <input
            type="search"
            aria-label="Buscar rutina"
            placeholder="Buscar por nombre"
            value={routineSearch}
            onChange={(event) => setRoutineSearch(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[color:var(--text-muted)]"
          />
        </label>

        {filteredRoutines.length ? (
          <div className="space-y-2" aria-label="Rutinas disponibles">
            {filteredRoutines.map((routine) => {
              const routineId = String(routine.id || routine._id);
              const selected =
                routineId === String(dayDraft?.sourceRoutineId || "");
              const exerciseCount = routine.exercises?.length || 0;
              return (
                <button
                  key={routineId}
                  type="button"
                  aria-label={`Elegir rutina ${routine.name}`}
                  aria-pressed={selected}
                  onClick={() => selectRoutine(routine)}
                  className="plan-editor__routine-option flex min-h-[76px] w-full items-center gap-3 rounded-[16px] border border-[color:var(--border)] bg-[color:var(--card)] p-3 text-left"
                >
                  <span className="plan-editor__routine-icon grid h-12 w-12 shrink-0 place-items-center rounded-[12px]">
                    <Dumbbell className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-base font-semibold">
                      {routine.name || "Rutina sin nombre"}
                    </strong>
                    <span className="mt-1 block truncate text-xs text-[color:var(--text-muted)]">
                      {exerciseCount}{" "}
                      {exerciseCount === 1 ? "ejercicio" : "ejercicios"}
                      {routine.exerciseOrderMode
                        ? ` · ${routine.exerciseOrderMode === "groups" ? "Por grupos" : "Orden libre"}`
                        : ""}
                    </span>
                  </span>
                  {selected ? (
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[color:var(--plan-accent)] text-[color:var(--plan-on-accent)]">
                      <Check className="h-4 w-4" />
                    </span>
                  ) : (
                    <ChevronRight className="h-5 w-5 shrink-0 text-[color:var(--text-muted)]" />
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <section className="rounded-[18px] border border-dashed border-[color:var(--border-strong)] px-5 py-10 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[color:var(--surface-subtle)]">
              <Dumbbell className="h-5 w-5" />
            </span>
            <h2 className="mt-3 text-base font-semibold">
              {templates.length
                ? "No encontramos esa rutina"
                : "Aún no tienes rutinas"}
            </h2>
            <p className="mx-auto mt-1 max-w-[260px] text-sm leading-5 text-[color:var(--text-muted)]">
              {templates.length
                ? "Prueba con otro nombre."
                : "Crea una rutina en tu biblioteca para poder asignarla a este día."}
            </p>
          </section>
        )}
      </div>
    );
  };

  const renderHeader = () => (
    <header className="plan-editor__header shrink-0 border-b border-[color:var(--border)] bg-[color:var(--bg)]">
      <div className="mx-auto grid min-h-16 w-full max-w-lg grid-cols-[44px_minmax(0,1fr)_44px] sm:grid-cols-[96px_minmax(0,1fr)_96px] items-center gap-1 px-5 sm:min-h-20">
        <button
          type="button"
          onClick={() => {
            if (routinePickerOpen) setRoutinePickerOpen(false);
            else if (isEditing) requestClose();
            else if (templatePickerOpen) setTemplatePickerOpen(false);
            else if (customizingFollowUp) setCustomizingFollowUp(false);
            else if (step === 0 || (isEditing && step === 1)) requestClose();
            else setStep((current) => Math.max(0, current - 1));
          }}
          aria-label={
            routinePickerOpen
              ? "Volver a Semana"
              : step === 0 || isEditing
                ? "Cerrar"
                : "Volver"
          }
          className="grid h-11 w-11 place-items-center rounded-full"
        >
          <ArrowLeft className="h-6 w-6" strokeWidth={1.8} />
        </button>
        <h2 className="truncate text-center text-lg font-semibold tracking-[-0.03em]">
          {routinePickerOpen
            ? "Seleccionar rutina"
            : isEditing
              ? "Editar planificación"
              : templatePickerOpen
                ? "Elegir plantilla"
                : customizingFollowUp
                  ? "Personalizar seguimiento"
                  : step === 0
                    ? "Nueva planificación"
                    : step === 3
                      ? "Revisar planificación"
                      : isEditing
                        ? "Editar planificación"
                        : "Crear planificación"}
        </h2>
        {!isEditing && step > 0 && step < 3 && !templatePickerOpen ? (
          <button
            type="button"
            onClick={() => submit()}
            className="h-11 whitespace-nowrap text-xs font-medium disabled:opacity-40"
            disabled={saving}
          >
            {isEditing ? "Guardar cambios" : "Guardar"}
          </button>
        ) : (
          <span />
        )}
      </div>
      {isEditing && !routinePickerOpen ? (
        <div
          role="tablist"
          aria-label="Secciones del plan"
          className="plan-editor__tabs mx-auto grid max-w-lg grid-cols-3 gap-1 px-5 pb-3"
        >
          {["General", "Semana", "Seguimiento"].map((label, index) => (
            <button
              key={label}
              type="button"
              role="tab"
              id={`plan-tab-${index + 1}`}
              aria-controls="plan-tab-content"
              tabIndex={step === index + 1 ? 0 : -1}
              aria-selected={step === index + 1}
              onKeyDown={(event) => {
                const next =
                  event.key === "ArrowRight"
                    ? (index + 1) % 3
                    : event.key === "ArrowLeft"
                      ? (index + 2) % 3
                      : event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? 2
                          : null;
                if (next === null) return;
                event.preventDefault();
                setStep(next + 1);
                event.currentTarget.parentElement.children[next].focus();
              }}
              onClick={() => {
                setStep(index + 1);
                setSaveError("");
              }}
              className={`min-h-11 rounded-xl px-2 text-sm font-semibold ${step === index + 1 ? "bg-[color:var(--text)] text-[color:var(--bg)]" : "bg-[color:var(--surface-subtle)] text-[color:var(--text-muted)]"}`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : step >= 1 &&
        step <= 3 &&
        !templatePickerOpen &&
        !routinePickerOpen &&
        !customizingFollowUp ? (
        <div className="mx-auto max-w-lg px-5">
          <ProgressSteps step={step} />
        </div>
      ) : null}
    </header>
  );

  const sourceScreen = () => (
    <div className="space-y-5">
      <section className="flex min-h-[102px] items-center gap-4 rounded-[14px] border border-[color:var(--border)] bg-[color:var(--card)] p-3 shadow-[0_5px_18px_rgba(0,0,0,0.035)]">
        {athlete?.profile?.avatarPhotoId ? (
          <ProfileAvatar
            photoId={athlete.profile.avatarPhotoId}
            name={athlete?.name}
            className="h-[76px] w-[76px] shrink-0 rounded-full bg-[color:var(--surface-subtle)] text-base font-semibold"
          />
        ) : (
          <span className="grid h-[76px] w-[76px] shrink-0 place-items-center rounded-full bg-[color:var(--surface-subtle)] text-base font-semibold">
            {String(athlete?.name || "A")
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase())
              .join("")}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold tracking-[-0.035em]">
            {athlete?.name || "Alumno"}
          </h3>
          <p className="mt-1 flex items-center gap-2 text-sm text-[color:var(--text-muted)]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#181918]" />
            Activa hoy
          </p>
          <p className="mt-1 truncate text-sm text-[color:var(--text-muted)]">
            Objetivo ·{" "}
            {GOALS.find(
              ([value]) => value === profileGoal(athlete?.profile?.goal),
            )?.[1] || "Por definir"}
          </p>
        </div>
      </section>

      <header>
        <h1 className="text-[28px] font-semibold leading-[1.05] tracking-[-0.055em]">
          ¿Cómo quieres empezar?
        </h1>
        <p className="mt-1.5 text-sm leading-5 text-[color:var(--text-muted)]">
          Elige una base y personalízala antes de asignar.
        </p>
      </header>

      <div className="space-y-3">
        <button
          type="button"
          aria-pressed={source === "zero"}
          onClick={() => setSource("zero")}
          className="flex min-h-[92px] w-full items-center gap-4 rounded-[13px] bg-[#191a19] p-4 text-left text-white shadow-[0_10px_28px_rgba(0,0,0,0.13)]"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center">
            <FilePlus2 className="h-9 w-9" strokeWidth={1.8} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-2">
              <strong className="block text-base font-semibold">
                Desde cero
              </strong>
              <span className="shrink-0 rounded-full bg-[#7cde94] px-2.5 py-1 text-[10px] font-semibold text-[#153c20]">
                Recomendado
              </span>
            </span>
            <span className="mt-1 block max-w-[220px] text-sm leading-5 text-white/75">
              Control total de semanas, rutinas y seguimiento
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTemplatePickerOpen(true)}
          className="flex min-h-[90px] w-full items-center gap-4 rounded-[13px] border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-left shadow-[0_5px_18px_rgba(0,0,0,0.035)]"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[color:var(--surface-subtle)]">
            <FileText className="h-7 w-7" strokeWidth={1.8} />
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block text-base font-semibold">
              Usar plantilla
            </strong>
            <span className="mt-1 block text-sm leading-5 text-[color:var(--text-muted)]">
              Parte de una estructura reutilizable
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-[color:var(--text-muted)]" />
        </button>

        <button
          type="button"
          onClick={duplicatePrevious}
          disabled={!replacingPlan}
          className="flex min-h-[90px] w-full items-center gap-4 rounded-[13px] border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-left shadow-[0_5px_18px_rgba(0,0,0,0.035)]"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[color:var(--surface-subtle)]">
            <Copy className="h-7 w-7" strokeWidth={1.8} />
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block text-base font-semibold">
              Duplicar plan anterior
            </strong>
            <span className="mt-1 block text-sm leading-5 text-[color:var(--text-muted)]">
              Conserva la estructura y luego ajusta
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-[color:var(--text-muted)]" />
        </button>

        <button
          type="button"
          onClick={beginQuickPlan}
          className="flex min-h-[90px] w-full items-center gap-4 rounded-[13px] border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-left shadow-[0_5px_18px_rgba(0,0,0,0.035)]"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[color:var(--surface-subtle)]">
            <Sparkles className="h-7 w-7" strokeWidth={1.8} />
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block text-base font-semibold">
              Plan rápido
            </strong>
            <span className="mt-1 block text-sm leading-5 text-[color:var(--text-muted)]">
              Configura lo esencial en pocos pasos
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-[color:var(--text-muted)]" />
        </button>
      </div>

      <p className="flex items-center justify-center gap-2 pb-1 pt-1 text-xs text-[color:var(--text-muted)]">
        <Info className="h-4 w-4 shrink-0" /> Nada se asignará hasta que
        confirmes.
      </p>
    </div>
  );

  const templateScreen = () => (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold tracking-[-0.03em]">
          Plantillas disponibles
        </h1>
        <p className="mt-2 text-sm text-[color:var(--text-muted)]">
          Se copiarán para que puedas personalizarlas para{" "}
          {athlete?.name?.split(" ")[0]}.
        </p>
      </header>
      {planTemplates.length ? (
        <div className="space-y-2">
          {planTemplates.map((template) => (
            <button
              key={template._id || template.id}
              type="button"
              onClick={() => applyTemplate(template)}
              className="flex min-h-20 w-full items-center gap-3 rounded-[18px] border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-left"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-[color:var(--surface-subtle)]">
                <Dumbbell className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-sm font-semibold">
                  {template.name}
                </strong>
                <span className="mt-1 block text-xs text-[color:var(--text-muted)]">
                  {template.durationWeeks} semanas ·{" "}
                  {
                    (template.weeklySchedule || []).filter(
                      (day) => day.type === "training",
                    ).length
                  }{" "}
                  días
                </span>
              </span>
              <ChevronRight className="h-5 w-5" />
            </button>
          ))}
        </div>
      ) : (
        <p className="rounded-[18px] bg-[color:var(--card)] p-6 text-center text-sm text-[color:var(--text-muted)]">
          Todavía no tienes plantillas de planes.
        </p>
      )}
      <button
        type="button"
        onClick={beginFromZero}
        className="h-12 w-full rounded-[16px] border border-[color:var(--border-strong)] text-sm font-semibold"
      >
        Continuar desde cero
      </button>
    </div>
  );

  const generalScreen = () => (
    <div className="plan-editor__general space-y-5">
      <AthleteContext athlete={athlete} compact />
      {source === "evaluation" ? (
        <div className="flex items-center gap-3 rounded-[16px] bg-[#eeebe5] p-3 text-[#514d46] dark:bg-stone-800 dark:text-stone-200">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>
            <strong className="block text-xs font-semibold">
              Sugerido desde su evaluación
            </strong>
            <span className="block text-[11px] opacity-75">
              Puedes modificar cualquier dato.
            </span>
          </span>
        </div>
      ) : null}
      <header>
        <h1 className="text-xl font-semibold tracking-[-0.03em]">
          Datos del plan
        </h1>
        <p className="mt-1 text-sm text-[color:var(--text-muted)]">
          Personaliza el bloque de entrenamiento
        </p>
      </header>
      <label className="block text-sm font-semibold">
        Nombre del plan
        <input
          aria-label="Nombre del plan"
          value={name}
          maxLength={100}
          onChange={(event) => setName(event.target.value)}
          className="theme-accent-focus mt-2 h-14 w-full rounded-[16px] border border-[color:var(--border)] bg-[color:var(--card)] px-4 text-base font-medium outline-none"
        />
        {!name.trim() ? (
          <span
            role="alert"
            className="mt-1 block text-sm font-normal text-red-700 dark:text-red-300"
          >
            Escribe un nombre para el plan.
          </span>
        ) : null}
        <span className="plan-editor__name-hint mt-1 block text-[11px] font-normal text-[color:var(--text-muted)]">
          {isEditing
            ? "Nombre visible para el alumno"
            : "Sugerido según el objetivo"}
        </span>
      </label>
      <fieldset>
        <legend className="text-sm font-semibold">Objetivo</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {GOALS.map(([value, label], index) => {
            const GoalIcon = [
              Dumbbell,
              ChartNoAxesColumnIncreasing,
              Flame,
              Activity,
            ][index];
            return (
              <button
                key={value}
                type="button"
                aria-pressed={goal === value}
                onClick={() => {
                  setGoal(value);
                  if (!isEditing && ["evaluation", "zero"].includes(source))
                    setName(suggestedPlanName(value));
                }}
                className={`flex items-center gap-2 min-h-12 rounded-[14px] border px-3 text-sm font-medium ${goal === value ? "border-[#181918] bg-[#181918] text-white dark:border-[#eeeae2] dark:bg-[#eeeae2] dark:text-black" : "border-[color:var(--border)] bg-[color:var(--card)]"}`}
              >
                <GoalIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="flex-1">{label}</span>
                {goal === value ? (
                  <CheckCircle2
                    className="h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-semibold">Nivel</legend>
        <div className="plan-editor__segmented mt-2 grid grid-cols-3 rounded-[14px] bg-[color:var(--surface-subtle)] p-1">
          {LEVELS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={level === value}
              onClick={() => setLevel(value)}
              className={`h-11 rounded-[11px] text-xs font-semibold ${level === value ? "bg-[#181918] text-white dark:bg-[#eeeae2] dark:text-black" : "text-[color:var(--text-muted)]"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <section className="plan-editor__dates rounded-[20px] border border-[color:var(--border)] bg-[color:var(--card)] p-4">
        <h2 className="sr-only">Fechas y duración</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="rounded-[14px] bg-[color:var(--surface-subtle)] p-3 text-[11px] text-[color:var(--text-muted)]">
            Inicio
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="mt-1 block w-full bg-transparent text-sm font-medium text-[color:var(--text)] outline-none"
            />
          </label>
          <label className="rounded-[14px] bg-[color:var(--surface-subtle)] p-3 text-[11px] text-[color:var(--text-muted)]">
            Duración
            <span className="mt-1 flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="52"
                value={durationWeeks}
                onChange={(event) => setDurationWeeks(event.target.value)}
                className="w-12 bg-transparent text-sm font-medium text-[color:var(--text)] outline-none"
              />
              <span className="text-sm text-[color:var(--text)]">semanas</span>
            </span>
          </label>
        </div>
        {!validStartDate ? (
          <p
            role="alert"
            className="mt-2 text-sm text-red-700 dark:text-red-300"
          >
            Elige una fecha de inicio válida.
          </p>
        ) : null}
        {!validDuration ? (
          <p
            role="alert"
            className="mt-2 text-sm text-red-700 dark:text-red-300"
          >
            La duración debe ser un número entero entre 1 y 52 semanas.
          </p>
        ) : null}
        {endDate ? (
          <p className="mt-2 text-sm text-[color:var(--text-muted)]">
            Finaliza el {dateLabel(endDate)} · {durationWeeks} semanas
          </p>
        ) : null}
      </section>
      {warning ? (
        <div className="flex items-start gap-2 rounded-[14px] border border-red-200 bg-red-50 p-3 text-red-700 dark:bg-red-950/30 dark:text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="text-xs">
            <strong className="block font-semibold">
              Considerar antes de programar
            </strong>
            <span className="mt-1 block line-clamp-2">{warning}</span>
          </span>
        </div>
      ) : null}
      <details
        className="rounded-[18px] border border-[color:var(--border)] bg-[color:var(--card)] px-4"
        defaultOpen={Boolean(notes)}
      >
        <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 text-sm font-semibold">
          <FileText className="h-5 w-5" />
          <span className="flex-1">Notas del plan</span>
          <span className="text-xs font-normal text-[color:var(--text-muted)]">
            Opcional
          </span>
          <ChevronDown className="h-4 w-4" />
        </summary>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Indicaciones para el alumno"
          className="mb-4 w-full resize-none rounded-[12px] bg-[color:var(--surface-subtle)] p-3 text-sm outline-none"
        />
      </details>
    </div>
  );

  const weekScreen = () => (
    <div className="plan-editor__week space-y-5">
      <AthleteContext athlete={athlete} compact />
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">
          {scheduleMode === "fixed" ? "Tu semana" : "Tu ciclo"}
        </h1>
        <span className="plan-editor__count">
          {trainingDays.length}{" "}
          {trainingDays.length === 1 ? "sesión" : "sesiones"}
        </span>
      </header>
      <div className="plan-editor__segmented grid grid-cols-2 rounded-[14px] bg-[color:var(--surface-subtle)] p-1">
        <button
          type="button"
          aria-label="Semana fija"
          aria-pressed={scheduleMode === "fixed"}
          onClick={() => changeScheduleMode("fixed")}
          className={`h-11 rounded-[11px] text-sm font-semibold ${scheduleMode === "fixed" ? "bg-[#181918] text-white dark:bg-[#eeeae2] dark:text-black" : "text-[color:var(--text-muted)]"}`}
        >
          Días fijos
        </button>
        <button
          type="button"
          aria-label="Ciclo flexible"
          aria-pressed={scheduleMode === "sequential_cycle"}
          onClick={() => changeScheduleMode("sequential_cycle")}
          className={`h-11 rounded-[11px] text-sm font-semibold ${scheduleMode === "sequential_cycle" ? "bg-[#181918] text-white dark:bg-[#eeeae2] dark:text-black" : "text-[color:var(--text-muted)]"}`}
        >
          Ciclo libre
        </button>
      </div>

      {scheduleMode === "fixed" ? (
        <div className="flex items-center justify-between gap-2">
          {schedule.map((day, index) => (
            <button
              key={day.slotId}
              type="button"
              aria-label={`Editar ${DAY_NAMES[index]}: ${day.type === "training" ? "Entrenar" : day.type === "recovery" ? "Recuperar" : "Descansar"}`}
              aria-pressed={day.type === "training"}
              onClick={() => {
                openDayEditor(index);
              }}
              className={`grid h-11 w-11 place-items-center rounded-full text-sm font-semibold ${day.type === "training" ? "bg-[#181918] text-white" : "bg-[color:var(--surface-subtle)] text-[color:var(--text-muted)]"}`}
            >
              {DAY_SHORT[index]}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-[18px] bg-[color:var(--card)] p-3">
          <span>
            <strong className="block text-sm">Tamaño del ciclo</strong>
            <span className="text-xs text-[color:var(--text-muted)]">
              Las sesiones avanzan en orden
            </span>
          </span>
          <span className="flex items-center">
            <button
              type="button"
              aria-label="Quitar un día del ciclo"
              onClick={() => resizeCycle(-1)}
              className="grid h-10 w-10 place-items-center"
            >
              <Minus className="h-4 w-4" />
            </button>
            <strong className="w-8 text-center">{schedule.length}</strong>
            <button
              type="button"
              aria-label="Agregar un día al ciclo"
              onClick={() => resizeCycle(1)}
              className="grid h-10 w-10 place-items-center"
            >
              <Plus className="h-4 w-4" />
            </button>
          </span>
        </div>
      )}
      <section>
        <div className="space-y-2">
          {schedule.map((day, index) => {
            const sourceRoutine = templates.find(
              (item) =>
                String(item.id || item._id) === String(day.sourceRoutineId),
            );
            const assignedRoutine = assignedRoutines.find(
              (item) => String(item.id || item._id) === String(day.routineId),
            );
            const routine = assignedRoutine || sourceRoutine;
            if (scheduleMode === "fixed" && day.type !== "training")
              return null;
            return (
              <button
                key={day.slotId}
                type="button"
                onClick={() => {
                  if (day.routineId && onEditRoutine) {
                    onEditRoutine(assignedRoutine || routine, day);
                    return;
                  }
                  if (
                    day.type === "training" &&
                    !day.sourceRoutineId &&
                    !manageRoutinesSeparately
                  ) {
                    openRoutinePicker(index);
                  } else {
                    openDayEditor(index);
                  }
                }}
                aria-label={
                  day.type === "training" &&
                  !day.sourceRoutineId &&
                  !manageRoutinesSeparately
                    ? `Seleccionar rutina para ${scheduleMode === "fixed" ? DAY_NAMES[index] : `día ${index + 1}`}`
                    : `Editar sesión de ${scheduleMode === "fixed" ? DAY_NAMES[index] : `día ${index + 1}`}`
                }
                className="plan-editor__session flex min-h-16 w-full items-center gap-3 rounded-[16px] border border-[color:var(--border)] bg-[color:var(--card)] p-3 text-left"
              >
                <span className="plan-editor__day-badge">
                  <span>
                    {scheduleMode === "fixed"
                      ? DAY_NAMES[index].slice(0, 3).toUpperCase()
                      : "DÍA"}
                  </span>
                  <strong>
                    {String(
                      scheduleMode === "fixed"
                        ? schedule
                            .slice(0, index + 1)
                            .filter((item) => item.type === "training").length
                        : index + 1,
                    ).padStart(2, "0")}
                  </strong>
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm font-semibold">
                    {day.type !== "training"
                      ? day.type === "recovery"
                        ? "Recuperación"
                        : "Descanso"
                      : routine?.name ||
                        day.focus ||
                        (day.type === "training"
                          ? "Seleccionar rutina"
                          : day.type === "recovery"
                            ? "Recuperación"
                            : "Descanso")}
                  </strong>
                  <span className="mt-1 block truncate text-xs text-[color:var(--text-muted)]">
                    {routine
                      ? `${routine.exercises?.length || 0} ejercicios · ${routine.exerciseOrderMode === "groups" ? "Por grupos" : "Orden libre"}`
                      : day.type === "training"
                        ? manageRoutinesSeparately
                          ? "Sesión del plan"
                          : "Rutina pendiente"
                        : "Sin entrenamiento"}
                  </span>
                </span>
                <ChevronRight className="h-5 w-5" />
              </button>
            );
          })}
        </div>
      </section>
      {scheduleMode === "fixed" &&
      schedule.some((day) => day.type !== "training") ? (
        <p className="plan-editor__rest flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs text-[color:var(--text-muted)]">
          <Moon className="h-4 w-4 shrink-0" />
          <span>
            {schedule
              .map((day, index) =>
                day.type === "rest"
                  ? DAY_NAMES[index].slice(0, 3).toLowerCase()
                  : null,
              )
              .filter(Boolean)
              .join(", ")}
            {schedule.some((day) => day.type === "rest") ? " · Descanso" : ""}
            {schedule.some((day) => day.type === "recovery")
              ? " · Incluye recuperación"
              : ""}
          </span>
        </p>
      ) : null}
      {scheduleMode === "fixed" && trainingDays.length < 7 ? (
        <button
          type="button"
          onClick={() => {
            const nextIndex = schedule.findIndex(
              (day) => day.type !== "training",
            );
            if (nextIndex < 0) return;
            if (manageRoutinesSeparately) {
              openDayEditor(nextIndex, { type: "training" });
            } else {
              openRoutinePicker(nextIndex, { type: "training" });
            }
          }}
          className="plan-editor__add flex h-12 w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-[color:var(--border-strong)] text-sm font-semibold"
        >
          <Plus className="h-4 w-4" /> Añadir sesión
        </button>
      ) : null}
      {missingRoutines ? (
        <p className="flex items-start gap-2 text-xs font-medium text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" /> Faltan{" "}
          {missingRoutines} {missingRoutines === 1 ? "rutina" : "rutinas"}.
          Puedes guardar el plan como borrador.
        </p>
      ) : null}
      <p className="flex items-center justify-center gap-2 text-xs text-[color:var(--text-muted)]">
        <Info className="h-4 w-4" />
        Toca una sesión para editarla
      </p>
    </div>
  );

  const enabledFollowUpCount = [
    followUp.checkIn,
    followUp.weight,
    followUp.photos,
    followUp.measurements,
    followUp.review,
    followUp.finalEvaluation,
  ].filter((item) => item.enabled).length;

  const activeFollowUpLabels = [
    ["Check-in", followUp.checkIn.enabled],
    ["Peso", followUp.weight.enabled],
    ["Fotos", followUp.photos.enabled],
    ["Medidas", followUp.measurements.enabled],
    ["Revisión", followUp.review.enabled],
    ["Evaluación final", followUp.finalEvaluation.enabled],
  ]
    .filter(([, enabled]) => enabled)
    .map(([label]) => label);

  const followUpScreen = () => (
    <div className="plan-editor__followup space-y-4">
      <AthleteContext athlete={athlete} compact />
      <section className="plan-editor__source rounded-[20px] border border-[color:var(--border)] bg-[color:var(--card)] p-3.5 shadow-sm">
        <div
          className="grid grid-cols-2 gap-1 rounded-xl bg-[color:var(--surface-subtle)] p-1"
          role="group"
          aria-label="Origen del seguimiento"
        >
          {[
            [true, "General del coach"],
            [false, "Personalizado"],
          ].map(([value, label]) => (
            <button
              key={label}
              type="button"
              aria-pressed={followUp.useCoachDefaults === value}
              onClick={() =>
                setFollowUp((current) => ({
                  ...current,
                  useCoachDefaults: value,
                }))
              }
              className={`min-h-11 rounded-lg px-2 text-sm font-semibold ${followUp.useCoachDefaults === value ? "bg-[color:var(--card)] shadow-sm" : "text-[color:var(--text-muted)]"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-[color:var(--text-muted)]">
          {followUp.useCoachDefaults
            ? "Hereda tus reglas generales y se mantiene actualizado"
            : `Configuración exclusiva para ${athlete?.name?.split(" ")[0]}`}
        </p>
      </section>
      <header className="plan-editor__followup-heading flex items-end justify-between gap-3 px-0.5">
        <div className="min-w-0">
          <h1 className="text-xs font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
            Tareas de seguimiento
          </h1>
          <p className="plan-editor__followup-hint mt-0.5 text-[11px] leading-4 text-[color:var(--text-muted)]">
            {followUp.useCoachDefaults
              ? "Consulta las tareas incluidas en el seguimiento general."
              : "Activa una tarea y tócala para configurar su frecuencia."}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[color:var(--surface-subtle)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--text-muted)]">
          {enabledFollowUpCount} activas
        </span>
      </header>
      <div className="space-y-2.5">
        <FollowUpCard
          icon={ClipboardCheck}
          title="Check-in"
          subtitle={
            followUp.checkIn.cadence === "workout_days"
              ? "Cada día de entrenamiento"
              : followUp.checkIn.cadence === "daily"
                ? "Todos los días"
                : `Cada semana, ${DAY_NAMES[(followUp.checkIn.weekdays?.[0] || 1) - 1]}`
          }
          enabled={followUp.checkIn.enabled}
          readOnly={followUp.useCoachDefaults}
          onEnabled={(enabled) => updateFollowUp("checkIn", { enabled })}
        >
          <select
            value={followUp.checkIn.cadence}
            onChange={(event) =>
              updateFollowUp("checkIn", { cadence: event.target.value })
            }
            className="min-h-11 w-full rounded-xl bg-[color:var(--surface-subtle)] px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
          >
            <option value="workout_days">Días de entrenamiento</option>
            <option value="daily">Todos los días</option>
            <option value="weekly">Una vez por semana</option>
          </select>
          {followUp.checkIn.cadence === "weekly" ? (
            <select
              value={followUp.checkIn.weekdays?.[0] || 1}
              onChange={(event) =>
                updateFollowUp("checkIn", {
                  weekdays: [Number(event.target.value)],
                })
              }
              className="mt-2 min-h-11 w-full rounded-xl bg-[color:var(--surface-subtle)] px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
            >
              {WEEKDAY_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          ) : null}
        </FollowUpCard>
        <FollowUpCard
          icon={Scale}
          title="Peso"
          subtitle={`${cadenceText(followUp.weight)}${(followUp.weight.frequencyUnit || "week") === "week" ? ` · ${DAY_NAMES[(followUp.weight.weekday || 1) - 1]}` : ""}`}
          enabled={followUp.weight.enabled}
          readOnly={followUp.useCoachDefaults}
          onEnabled={(enabled) => updateFollowUp("weight", { enabled })}
          required={followUp.weight.required}
          onRequired={(required) => updateFollowUp("weight", { required })}
        >
          <FrequencyEditor
            value={followUp.weight}
            onChange={(changes) => updateFollowUp("weight", changes)}
            showWeekday
          />
        </FollowUpCard>
        <FollowUpCard
          icon={Camera}
          title="Fotos de progreso"
          subtitle={cadenceText(followUp.photos)}
          enabled={followUp.photos.enabled}
          readOnly={followUp.useCoachDefaults}
          onEnabled={(enabled) => updateFollowUp("photos", { enabled })}
          required={followUp.photos.required}
          onRequired={(required) => updateFollowUp("photos", { required })}
        >
          <FrequencyEditor
            value={followUp.photos}
            onChange={(changes) => updateFollowUp("photos", changes)}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {PHOTO_VIEWS.map(([value, label]) => {
              const selected = followUp.photos.views.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    updateFollowUp("photos", {
                      views: selected
                        ? followUp.photos.views.filter((item) => item !== value)
                        : [...followUp.photos.views, value],
                    })
                  }
                  className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${selected ? "bg-[#181918] text-white dark:bg-[#eeeae2] dark:text-black" : "bg-[color:var(--surface-subtle)]"}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </FollowUpCard>
        <FollowUpCard
          icon={Ruler}
          title="Medidas"
          subtitle={cadenceText(followUp.measurements)}
          enabled={followUp.measurements.enabled}
          readOnly={followUp.useCoachDefaults}
          onEnabled={(enabled) => updateFollowUp("measurements", { enabled })}
          required={followUp.measurements.required}
          onRequired={(required) =>
            updateFollowUp("measurements", { required })
          }
        >
          <FrequencyEditor
            value={followUp.measurements}
            onChange={(changes) => updateFollowUp("measurements", changes)}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {MEASUREMENT_FIELDS.map(([value, label]) => {
              const selected = followUp.measurements.fields.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    updateFollowUp("measurements", {
                      fields: selected
                        ? followUp.measurements.fields.filter(
                            (item) => item !== value,
                          )
                        : [...followUp.measurements.fields, value],
                    })
                  }
                  className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${selected ? "bg-[#181918] text-white dark:bg-[#eeeae2] dark:text-black" : "bg-[color:var(--surface-subtle)]"}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </FollowUpCard>
        <FollowUpCard
          icon={Target}
          title="Revisión del plan"
          subtitle={`Cada ${followUp.review.intervalWeeks} semanas`}
          enabled={followUp.review.enabled}
          readOnly={followUp.useCoachDefaults}
          onEnabled={(enabled) => updateFollowUp("review", { enabled })}
        >
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] text-[color:var(--text-muted)]">
              Revisar cada (semanas)
              <input
                type="number"
                min="1"
                max="12"
                value={followUp.review.intervalWeeks}
                onChange={(event) =>
                  updateFollowUp("review", {
                    intervalWeeks: Number(event.target.value),
                  })
                }
                className="mt-1 min-h-11 w-full rounded-xl bg-[color:var(--surface-subtle)] px-3 text-sm text-[color:var(--text)]"
              />
            </label>
            <label className="text-[11px] text-[color:var(--text-muted)]">
              Avisarme antes (días)
              <input
                type="number"
                min="0"
                max="14"
                value={followUp.review.leadDays}
                onChange={(event) =>
                  updateFollowUp("review", {
                    leadDays: Number(event.target.value),
                  })
                }
                className="mt-1 min-h-11 w-full rounded-xl bg-[color:var(--surface-subtle)] px-3 text-sm text-[color:var(--text)]"
              />
            </label>
          </div>
        </FollowUpCard>
        <FollowUpCard
          icon={FileText}
          title="Evaluación final"
          subtitle="Al finalizar el bloque"
          enabled={followUp.finalEvaluation.enabled}
          readOnly={followUp.useCoachDefaults}
          onEnabled={(enabled) =>
            updateFollowUp("finalEvaluation", { enabled })
          }
        >
          <p className="text-xs leading-5 text-[color:var(--text-muted)]">
            Se solicitará antes de preparar el siguiente bloque.
          </p>
        </FollowUpCard>
      </div>
      <p className="plan-editor__mission-hint rounded-[14px] bg-[#eeebe5] px-3 py-2.5 text-center text-xs font-medium text-[#514d46]">
        Check-in, peso, fotos, medidas y evaluación aparecerán en las misiones
        de {athlete?.name?.split(" ")[0]}. La revisión del plan es un
        recordatorio privado para ti.
      </p>
    </div>
  );

  const reviewScreen = () => (
    <div className="space-y-4">
      <section className="rounded-[20px] bg-[#242321] p-5 text-white shadow-[0_14px_36px_rgba(35,33,29,0.2)] dark:bg-[#242321]">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-white/10">
            <CalendarDays className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-xl font-semibold">
              {name}
            </strong>
            <span className="mt-1 block text-sm text-white/70">
              {dateLabel(startDate)} — {dateLabel(endDate)}
            </span>
            <span className="mt-1 block text-sm text-white/70">
              {trainingDays.length} días por semana
            </span>
          </span>
          {!missingRoutines ? (
            <span className="mt-7 inline-flex shrink-0 items-center gap-1 rounded-full bg-[#f1eee7] px-2.5 py-1 text-[10px] font-semibold text-[#34312c]">
              <CheckCircle2 className="h-3.5 w-3.5" /> Listo para asignar
            </span>
          ) : null}
        </div>
      </section>
      <section>
        <h2 className="px-0.5 text-xs font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
          Seguimiento
        </h2>
        <button
          type="button"
          onClick={() => setCustomizingFollowUp(true)}
          className="mt-2 w-full rounded-[20px] border border-[color:var(--border)] bg-[color:var(--card)] p-3.5 text-left shadow-sm transition active:scale-[0.99]"
        >
          <span className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[#181918] text-white dark:bg-[#eeeae2] dark:text-black">
              <ClipboardCheck className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block text-sm font-semibold">
                {enabledFollowUpCount} de 6 tareas activas
              </strong>
              <span className="mt-0.5 block text-xs text-[color:var(--text-muted)]">
                {followUp.useCoachDefaults
                  ? "Usa el seguimiento general del coach"
                  : `Personalizado para ${athlete?.name?.split(" ")[0] || "el alumno"}`}
              </span>
            </span>
            <span className="shrink-0 text-xs font-semibold">Editar</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-[color:var(--text-muted)]" />
          </span>
          {activeFollowUpLabels.length ? (
            <span className="mt-3 flex flex-wrap gap-1.5 border-t border-[color:var(--detail-row-divider)] pt-3">
              {activeFollowUpLabels.map((label) => (
                <span
                  key={label}
                  className="rounded-full bg-[color:var(--surface-subtle)] px-2.5 py-1 text-[10px] font-semibold text-[color:var(--text-muted)]"
                >
                  {label}
                </span>
              ))}
            </span>
          ) : (
            <span className="mt-3 block border-t border-[color:var(--detail-row-divider)] pt-3 text-xs text-[color:var(--text-muted)]">
              No hay tareas activas para este plan.
            </span>
          )}
        </button>
      </section>
      {!isEditing ? (
        <section>
          <h2 className="text-xl font-semibold tracking-[-0.03em]">
            Inicio del plan
          </h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              aria-pressed={activationMode === "now"}
              onClick={() => {
                setActivationMode("now");
                setStartDate(todayDateKey);
              }}
              className={`flex min-h-14 items-center justify-center gap-2 rounded-[14px] border text-sm font-semibold ${activationMode === "now" ? "border-[#181918] bg-[color:var(--card)] text-[color:var(--text)]" : "border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--text-muted)]"}`}
            >
              <span
                className={`grid h-8 w-8 place-items-center rounded-full ${activationMode === "now" ? "bg-[#181918] text-white" : "bg-[color:var(--surface-subtle)]"}`}
              >
                <Play className="h-4 w-4 fill-current" />
              </span>
              Activar ahora
            </button>
            <button
              type="button"
              aria-pressed={activationMode === "scheduled"}
              onClick={() => {
                setActivationMode("scheduled");
                if (!startDate || startDate <= todayDateKey) {
                  setStartDate(tomorrowDateKey);
                }
              }}
              className={`flex min-h-14 items-center justify-center gap-2 rounded-[14px] border text-sm font-medium ${activationMode === "scheduled" ? "border-[#181918] bg-[color:var(--card)] text-[color:var(--text)]" : "border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--text-muted)]"}`}
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[color:var(--surface-subtle)]">
                <CalendarDays className="h-4 w-4" />
              </span>
              Programar fecha
            </button>
          </div>
          {activationMode === "scheduled" ? (
            <label className="mt-2 block rounded-[14px] border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 text-xs text-[color:var(--text-muted)]">
              Fecha de activación
              <input
                type="date"
                min={tomorrowDateKey}
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="mt-1 h-10 w-full bg-transparent text-sm font-medium text-[color:var(--text)] outline-none"
              />
            </label>
          ) : null}
          <label className="mt-2 flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={notifyAthlete}
              onChange={(event) => setNotifyAthlete(event.target.checked)}
              className="h-5 w-5 rounded accent-[#181918]"
            />
            Notificar a {athlete?.name?.split(" ")[0] || "alumno"} al activar
          </label>
        </section>
      ) : null}
      {warning ? (
        <p className="flex items-center gap-2 rounded-[14px] border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:bg-red-950/30 dark:text-red-200">
          <AlertTriangle className="h-4 w-4 shrink-0" /> Adaptado considerando:{" "}
          {warning}
        </p>
      ) : null}
      {missingRoutines ? (
        <p className="rounded-[14px] bg-amber-50 p-3 text-xs font-medium text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          Completa {missingRoutines}{" "}
          {missingRoutines === 1 ? "rutina" : "rutinas"} antes de asignar.
          Puedes conservar el borrador.
        </p>
      ) : null}
    </div>
  );

  return (
    <div
      className={`coach-plan-page routines-shell ${isEditing ? "plan-editor" : ""} fixed inset-0 z-[90] bg-[color:var(--bg)]`}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? "Editar planificación" : "Crear planificación"}
        tabIndex={-1}
        className="flex h-dvh w-full flex-col overflow-hidden bg-[color:var(--bg)] outline-none"
      >
        {renderHeader()}
        <div ref={contentScrollRef} className="min-h-0 flex-1 overflow-y-auto">
          <div
            id="plan-tab-content"
            role={isEditing ? "tabpanel" : undefined}
            aria-labelledby={isEditing ? `plan-tab-${step}` : undefined}
            className="mx-auto w-full max-w-lg px-5 py-5"
          >
            {routinePickerOpen
              ? routinePickerScreen()
              : templatePickerOpen
                ? templateScreen()
                : step === 0
                  ? sourceScreen()
                  : step === 1
                    ? generalScreen()
                    : step === 2
                      ? weekScreen()
                      : isEditing || customizingFollowUp
                        ? followUpScreen()
                        : reviewScreen()}
          </div>
        </div>
        {!templatePickerOpen && !routinePickerOpen ? (
          <footer className="plan-editor__footer shrink-0 border-t border-[color:var(--border)] bg-[color:var(--bg)] px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
            {saveError ? (
              <p
                role="alert"
                className="mx-auto mb-2 max-w-lg text-sm text-red-700 dark:text-red-300"
              >
                {saveError}
              </p>
            ) : null}
            {isEditing && ["draft", "paused"].includes(initialData?.status) ? (
              <label className="mx-auto mb-2 flex w-full max-w-lg items-center gap-2 text-xs text-[color:var(--text-muted)]">
                <input
                  type="checkbox"
                  checked={notifyAthlete}
                  onChange={(event) => setNotifyAthlete(event.target.checked)}
                  className="h-4 w-4 rounded accent-[#181918]"
                />
                Notificar a {athlete?.name?.split(" ")[0] || "alumno"} al
                asignar
              </label>
            ) : null}
            <div className="mx-auto flex w-full max-w-lg gap-2">
              {isEditing ? (
                <div
                  className={`grid min-w-0 flex-1 gap-2 ${["draft", "paused"].includes(initialData?.status) ? "grid-cols-2" : "grid-cols-1"}`}
                >
                  <Button
                    variant={["draft", "paused"].includes(initialData?.status) ? "outline" : "default"}
                    disabled={saving}
                    className="h-12 rounded-[14px]"
                    onClick={() => submit()}
                  >
                    <Save className="h-4 w-4" aria-hidden="true" />
                    {saving
                      ? "Guardando…"
                      : initialData?.status === "draft"
                        ? "Guardar borrador"
                        : "Guardar cambios"}
                  </Button>
                  {["draft", "paused"].includes(initialData?.status) ? (
                    <Button
                      disabled={saving || Boolean(missingRoutines)}
                      className="h-12 rounded-[14px]"
                      onClick={() => submit({ activate: true })}
                    >
                      {initialData?.status === "paused"
                        ? "Guardar y reactivar"
                        : "Guardar y asignar"}
                    </Button>
                  ) : null}
                </div>
              ) : null}
              {step === 0 ? (
                <Button
                  className="h-12 min-w-0 flex-1 rounded-[8px]"
                  onClick={beginFromZero}
                >
                  Continuar
                </Button>
              ) : null}
              {!isEditing && step === 1 ? (
                <Button
                  className="h-12 min-w-0 flex-1 rounded-[14px]"
                  disabled={!name.trim() || !validDuration || !startDate}
                  onClick={() => setStep(2)}
                >
                  Continuar: organizar semana <ArrowRight className="h-4 w-4" />
                </Button>
              ) : null}
              {!isEditing && step === 2 ? (
                <Button
                  className="h-12 min-w-0 flex-1 rounded-[14px]"
                  disabled={!trainingDays.length}
                  onClick={() => {
                    setActivationMode(
                      startDate > todayDateKey ? "scheduled" : "now",
                    );
                    setStep(3);
                  }}
                >
                  Revisar planificación <ArrowRight className="h-4 w-4" />
                </Button>
              ) : null}
              {!isEditing && step === 3 && customizingFollowUp ? (
                <Button
                  className="h-12 min-w-0 flex-1 rounded-[14px]"
                  onClick={() => setCustomizingFollowUp(false)}
                >
                  Volver a revisión <ArrowRight className="h-4 w-4" />
                </Button>
              ) : null}
              {!isEditing && step === 3 && !customizingFollowUp ? (
                <div
                  className={`grid min-w-0 flex-1 gap-2 ${isEditing ? "grid-cols-1" : "grid-cols-2"}`}
                >
                  <Button
                    variant={isEditing ? "default" : "outline"}
                    className="h-12 rounded-[14px]"
                    disabled={saving}
                    onClick={() => submit()}
                  >
                    {saving
                      ? "Guardando..."
                      : isEditing
                        ? "Guardar cambios"
                        : "Guardar borrador"}
                  </Button>
                  {!isEditing ? (
                    <Button
                      className="h-12 rounded-[14px]"
                      disabled={saving || Boolean(missingRoutines)}
                      onClick={() => setConfirming(true)}
                    >
                      Crear planificación
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </footer>
        ) : null}
      </div>

      {dayEditorOpen ? dayEditorPanel : null}
      {confirmCycleRemoval ? (
        <div className="fixed inset-0 z-[110] grid place-items-center bg-black/45 p-5">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-label="Quitar último día"
            className="w-full max-w-sm rounded-[20px] bg-[color:var(--card)] p-5"
          >
            <h2 className="text-lg font-semibold">Quitar último día</h2>
            <p className="mt-2 text-sm">
              Se quitará el día {schedule.length} y su sesión del ciclo.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => setConfirmCycleRemoval(false)}
              >
                Cancelar
              </Button>
              <Button onClick={() => resizeCycle(-1, true)}>Quitar día</Button>
            </div>
          </section>
        </div>
      ) : null}
      {pendingMode ? (
        <div className="fixed inset-0 z-[110] grid place-items-center bg-black/45 p-5">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-label="Cambiar calendario"
            className="w-full max-w-sm rounded-[20px] bg-[color:var(--card)] p-5 shadow-xl"
          >
            <h2 className="text-lg font-semibold">Cambiar calendario</h2>
            <p className="mt-2 text-sm text-[color:var(--text-muted)]">
              {pendingMode === "fixed"
                ? "Las primeras siete posiciones pasarán a lunes–domingo, conservando sus sesiones y rutinas."
                : "Los días actuales pasarán a un ciclo en el mismo orden, conservando sus sesiones y rutinas."}
            </p>
            {pendingMode === "fixed" && schedule.length > 7 ? (
              <p className="mt-2 text-sm text-red-700 dark:text-red-300">
                Se eliminarán las {schedule.length - 7} posiciones posteriores
                al séptimo día.
              </p>
            ) : null}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setPendingMode("")}>
                Cancelar
              </Button>
              <Button onClick={() => applyScheduleMode(pendingMode)}>
                Aplicar cambio
              </Button>
            </div>
          </section>
        </div>
      ) : null}

      {confirming ? (
        <div className="fixed inset-0 z-[110] flex items-end bg-black/50 p-0 backdrop-blur-[2px] sm:items-center sm:justify-center sm:p-4">
          <button
            type="button"
            aria-label="Cerrar confirmación"
            className="absolute inset-0"
            onClick={() => setConfirming(false)}
          />
          <section
            role="alertdialog"
            aria-modal="true"
            className="relative w-full rounded-t-[28px] bg-[color:var(--bg)] p-5 pb-[max(20px,env(safe-area-inset-bottom))] text-center shadow-2xl sm:max-w-sm sm:rounded-[28px]"
          >
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#e7f7ea] text-[#2e914b]">
              <ClipboardCheck className="h-8 w-8" />
            </span>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">
              ¿Crear esta planificación?
            </h2>
            <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
              {activationMode === "now"
                ? `${athlete?.name?.split(" ")[0]} podrá verla y comenzar hoy.`
                : `Quedará programada para el ${dateLabel(startDate)}.`}
            </p>
            <div className="mt-4 rounded-[16px] border border-[color:var(--border)] bg-[color:var(--card)] p-3 text-left">
              <strong className="block truncate text-sm">{name}</strong>
              <span className="mt-1 block text-xs text-[color:var(--text-muted)]">
                {trainingDays.length * Number(durationWeeks)} entrenamientos ·{" "}
                {durationWeeks} semanas
              </span>
            </div>
            <Button
              className="mt-4 h-12 w-full rounded-[14px]"
              disabled={saving}
              onClick={() => submit({ activate: true })}
            >
              {saving
                ? "Creando..."
                : activationMode === "now"
                  ? "Confirmar y activar"
                  : "Confirmar programación"}
            </Button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={saving}
              className="mt-2 h-11 w-full text-sm font-medium"
            >
              Volver
            </button>
            <p className="mt-2 text-[11px] text-[color:var(--text-muted)]">
              La planificación podrá editarse después.
            </p>
          </section>
        </div>
      ) : null}

      {closeConfirmationOpen ? (
        <div className="fixed inset-0 z-[120] flex items-end bg-black/45 p-0 backdrop-blur-[2px] sm:items-center sm:justify-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => setCloseConfirmationOpen(false)}
            aria-label="Cerrar aviso"
          />
          <section
            role="alertdialog"
            aria-modal="true"
            className="relative w-full rounded-t-[28px] bg-[color:var(--bg)] p-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-sm sm:rounded-[28px]"
          >
            <p className="text-xs text-[color:var(--text-muted)]">
              Cambios sin guardar
            </p>
            <h2 className="mt-1 text-xl font-semibold">
              ¿Salir de la planificación?
            </h2>
            <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
              Si sales ahora, perderás los cambios realizados.
            </p>
            <Button
              className="mt-4 h-12 w-full rounded-[14px]"
              onClick={() => setCloseConfirmationOpen(false)}
            >
              Seguir editando
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 h-12 w-full rounded-[14px] text-sm font-medium text-red-600"
            >
              Descartar cambios
            </button>
          </section>
        </div>
      ) : null}
    </div>
  );
}
