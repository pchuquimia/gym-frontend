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
  Play,
  Plus,
  Ruler,
  Scale,
  Settings2,
  Sparkles,
  Target,
} from "lucide-react";
import Button from "../ui/button";
import ProfileAvatar from "../profile/ProfileAvatar";

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
  }));
};

const createCycleSchedule = (length = 4) =>
  Array.from({ length }, (_, index) => ({
    dayIndex: index + 1,
    type: index ? "training" : "rest",
    focus: "",
    slotId: `slot_cycle_${index + 1}`,
    order: index + 1,
    sourceRoutineId: "",
  }));

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

const routinePreview = (name = "", index = 0) => {
  const normalized = String(name).toLowerCase();
  if (normalized.includes("lower") || normalized.includes("pierna")) {
    return "/images/routine-lower-a.webp";
  }
  if (normalized.includes("upper")) return "/images/routine-upper.webp";
  if (normalized.includes("pull") || normalized.includes("espalda")) {
    return "/images/routine-pull.webp";
  }
  return index % 2 ? "/images/routine-push.webp" : "/images/routine-upper.webp";
};

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? "bg-[#181918] dark:bg-[#e2ff00]" : "bg-[color:var(--surface-subtle)]"}`}
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
                  ? "bg-[#43ad65] text-white"
                  : active
                    ? "bg-[#181918] text-white dark:bg-[#e2ff00] dark:text-black"
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
      className={`flex items-center gap-3 rounded-[20px] border border-[color:var(--border)] bg-[color:var(--card)] ${compact ? "p-3" : "p-4"}`}
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
          <span className="h-2.5 w-2.5 rounded-full bg-[#43ad65]" />
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
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
      <label className="text-[11px] text-[color:var(--text-muted)]">
        Cada
        <input
          type="number"
          min="1"
          max="90"
          value={value.frequencyInterval || value.intervalWeeks || 1}
          onChange={(event) => {
            const frequencyInterval = Number(event.target.value);
            onChange({
              frequencyInterval,
              ...(value.frequencyUnit === "week"
                ? { intervalWeeks: frequencyInterval }
                : {}),
            });
          }}
          className="mt-1 h-10 w-full rounded-xl bg-[color:var(--surface-subtle)] px-3 text-sm text-[color:var(--text)] outline-none"
        />
      </label>
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
          className="mt-1 h-10 w-full rounded-xl bg-[color:var(--surface-subtle)] px-3 text-sm text-[color:var(--text)] outline-none"
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
            className="mt-1 h-10 w-full rounded-xl bg-[color:var(--surface-subtle)] px-3 text-sm text-[color:var(--text)] outline-none"
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
  children,
}) {
  return (
    <section className="rounded-[18px] border border-[color:var(--border)] bg-[color:var(--card)] p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--surface-subtle)]">
          <Icon className="h-5 w-5" strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <strong className="block text-sm font-semibold">{title}</strong>
          <span className="mt-0.5 block truncate text-xs text-[color:var(--text-muted)]">
            {subtitle}
          </span>
        </span>
        <Toggle
          checked={enabled}
          onChange={onEnabled}
          label={`Activar ${title}`}
        />
      </div>
      {enabled ? (
        <div className="mt-3 border-t border-[color:var(--detail-row-divider)] pt-3">
          {children}
          {typeof required === "boolean" ? (
            <label className="mt-3 flex items-center justify-between rounded-xl bg-[color:var(--surface-subtle)] px-3 py-2 text-xs font-medium">
              Tarea obligatoria
              <input
                type="checkbox"
                checked={required}
                onChange={(event) => onRequired(event.target.checked)}
              />
            </label>
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
  onSave,
  onClose,
}) {
  const dialogRef = useRef(null);
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
  const [followUpEditorKey, setFollowUpEditorKey] = useState("");
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
    Number(durationWeeks) >= 1 && Number(durationWeeks) <= 52;
  const endDate = useMemo(() => {
    if (!startDate || !validDuration) return "";
    const date = new Date(`${startDate}T12:00:00`);
    date.setDate(date.getDate() + Number(durationWeeks) * 7 - 1);
    return date.toISOString().slice(0, 10);
  }, [durationWeeks, startDate, validDuration]);
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
                ? { sourceRoutineId: "" }
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
    }));

  const changeScheduleMode = (mode) => {
    if (mode === scheduleMode) return;
    setScheduleMode(mode);
    setSelectedScheduleIndex(0);
    setSchedule(
      resetSchedule(
        mode === "fixed"
          ? createFixedSchedule(initialFrequency)
          : createCycleSchedule(),
        mode,
      ),
    );
  };

  const resizeCycle = (delta) => {
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
    if (!name.trim() || !validDuration || !trainingDays.length || saving)
      return;
    setSaving(true);
    try {
      await onSave(payload(), { activate });
    } finally {
      setSaving(false);
    }
  };

  const currentScheduleDay =
    schedule[Math.min(selectedScheduleIndex, schedule.length - 1)];
  const scheduleDayNumber = (index) => {
    const date = new Date(`${startDate}T12:00:00`);
    if (Number.isNaN(date.getTime())) return index + 1;
    if (scheduleMode === "fixed") {
      date.setDate(date.getDate() - ((date.getDay() + 6) % 7) + index);
    } else {
      date.setDate(date.getDate() + index);
    }
    return date.getDate();
  };
  const dayEditorPanel = currentScheduleDay ? (
    <div className="fixed inset-0 z-[105] flex items-end justify-center bg-black/45 backdrop-blur-[2px]">
      <button
        type="button"
        aria-label="Cerrar edición del día"
        className="absolute inset-0"
        onClick={() => setDayEditorOpen(false)}
      />
      <section className="relative w-full max-w-lg rounded-t-[28px] bg-[color:var(--bg)] p-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-2xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[color:var(--border-strong)]" />
        <h2 className="text-2xl font-semibold tracking-[-0.04em]">
          {scheduleMode === "fixed"
            ? DAY_NAMES[selectedScheduleIndex]
            : `Día ${selectedScheduleIndex + 1}`}
        </h2>
        <p className="mt-1 text-sm text-[color:var(--text-muted)]">
          Define la actividad y la rutina de este día.
        </p>
        <div className="mt-4 grid grid-cols-3 rounded-[12px] bg-[color:var(--surface-subtle)] p-1">
          {[
            ["training", "Entrenar"],
            ["recovery", "Recuperar"],
            ["rest", "Descansar"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => updateDay(selectedScheduleIndex, { type: value })}
              className={`h-10 rounded-[10px] text-[11px] font-semibold ${currentScheduleDay.type === value ? "bg-[color:var(--card)] shadow-sm" : "text-[color:var(--text-muted)]"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {currentScheduleDay.type === "training" ? (
          <div className="mt-4 space-y-3">
            {!manageRoutinesSeparately ? (
              <label className="block text-xs font-medium text-[color:var(--text-muted)]">
                Rutina
                <select
                  value={currentScheduleDay.sourceRoutineId}
                  onChange={(event) => {
                    const sourceRoutineId = event.target.value;
                    const routine = templates.find(
                      (item) =>
                        String(item.id || item._id) === String(sourceRoutineId),
                    );
                    updateDay(selectedScheduleIndex, {
                      sourceRoutineId,
                      focus: routine?.name || currentScheduleDay.focus,
                    });
                  }}
                  aria-label={`Rutina de ${scheduleMode === "fixed" ? DAY_NAMES[selectedScheduleIndex] : `día ${selectedScheduleIndex + 1}`}`}
                  className="mt-1 h-12 w-full rounded-[12px] bg-[color:var(--surface-subtle)] px-3 text-sm text-[color:var(--text)] outline-none"
                >
                  <option value="">Selecciona una rutina</option>
                  {templates.map((routine) => (
                    <option
                      key={routine.id || routine._id}
                      value={routine.id || routine._id}
                    >
                      {routine.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="block text-xs font-medium text-[color:var(--text-muted)]">
              {manageRoutinesSeparately
                ? "Nombre de la sesión"
                : "Enfoque opcional"}
              <input
                aria-label={`Enfoque de ${scheduleMode === "fixed" ? DAY_NAMES[selectedScheduleIndex] : `día ${selectedScheduleIndex + 1}`}`}
                value={currentScheduleDay.focus}
                onChange={(event) =>
                  updateDay(selectedScheduleIndex, {
                    focus: event.target.value,
                  })
                }
                className="mt-1 h-12 w-full rounded-[12px] bg-[color:var(--surface-subtle)] px-3 text-sm text-[color:var(--text)] outline-none"
              />
            </label>
          </div>
        ) : null}
        <Button
          className="mt-5 h-12 w-full rounded-[14px]"
          onClick={() => setDayEditorOpen(false)}
        >
          Guardar día
        </Button>
      </section>
    </div>
  ) : null;
  const renderHeader = () => (
    <header className="shrink-0 border-b border-[color:var(--border)] bg-[color:var(--bg)]">
      <div className="mx-auto grid min-h-16 w-full max-w-lg grid-cols-[96px_minmax(0,1fr)_96px] items-center gap-1 px-5 sm:min-h-20">
        <button
          type="button"
          onClick={() => {
            if (templatePickerOpen) setTemplatePickerOpen(false);
            else if (customizingFollowUp) setCustomizingFollowUp(false);
            else if (step === 0 || (isEditing && step === 1)) requestClose();
            else setStep((current) => Math.max(0, current - 1));
          }}
          aria-label={
            step === 0 || (isEditing && step === 1) ? "Cerrar" : "Volver"
          }
          className="grid h-11 w-11 place-items-center rounded-full"
        >
          <ArrowLeft className="h-6 w-6" strokeWidth={1.8} />
        </button>
        <h2 className="truncate text-center text-lg font-semibold tracking-[-0.03em]">
          {templatePickerOpen
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
        {step > 0 && step < 3 && !templatePickerOpen ? (
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
      {step >= 1 && step <= 3 && !templatePickerOpen && !customizingFollowUp ? (
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
            <span className="h-2.5 w-2.5 rounded-full bg-[#43ad65]" />
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
        <h1 className="text-3xl font-semibold tracking-[-0.05em]">
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
    <div className="space-y-5">
      <AthleteContext athlete={athlete} compact />
      {source === "evaluation" ? (
        <div className="flex items-center gap-3 rounded-[16px] bg-[#edf8ef] p-3 text-[#246f39] dark:bg-emerald-950/30 dark:text-emerald-200">
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
        <h1 className="text-3xl font-semibold tracking-[-0.05em]">
          Define la base del plan
        </h1>
        <p className="mt-1 text-sm text-[color:var(--text-muted)]">
          Solo lo esencial. Podrás ajustarlo después.
        </p>
      </header>
      <fieldset>
        <legend className="text-sm font-semibold">Objetivo principal</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {GOALS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={goal === value}
              onClick={() => {
                setGoal(value);
                if (!isEditing && ["evaluation", "zero"].includes(source))
                  setName(suggestedPlanName(value));
              }}
              className={`min-h-12 rounded-[14px] border px-3 text-sm font-medium ${goal === value ? "border-[#181918] bg-[#181918] text-white dark:border-[#e2ff00] dark:bg-[#e2ff00] dark:text-black" : "border-[color:var(--border)] bg-[color:var(--card)]"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="block text-sm font-semibold">
        Nombre del plan
        <input
          aria-label="Nombre del plan"
          value={name}
          maxLength={100}
          onChange={(event) => setName(event.target.value)}
          className="theme-accent-focus mt-2 h-14 w-full rounded-[16px] border border-[color:var(--border)] bg-[color:var(--card)] px-4 text-base font-medium outline-none"
        />
        <span className="mt-1 block text-[11px] font-normal text-[color:var(--text-muted)]">
          Sugerido según el objetivo
        </span>
      </label>
      <fieldset>
        <legend className="text-sm font-semibold">Nivel</legend>
        <div className="mt-2 grid grid-cols-3 rounded-[14px] bg-[color:var(--surface-subtle)] p-1">
          {LEVELS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={level === value}
              onClick={() => setLevel(value)}
              className={`h-11 rounded-[11px] text-xs font-semibold ${level === value ? "bg-[#181918] text-white dark:bg-[#e2ff00] dark:text-black" : "text-[color:var(--text-muted)]"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <section className="rounded-[20px] border border-[color:var(--border)] bg-[color:var(--card)] p-4">
        <h2 className="text-base font-semibold">Fechas y duración</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="rounded-[14px] bg-[color:var(--surface-subtle)] p-3 text-[11px] text-[color:var(--text-muted)]">
            Inicia
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
        {endDate ? (
          <p className="mt-2 rounded-[12px] bg-[#edf8ef] px-3 py-2 text-center text-xs font-medium text-[#26723d]">
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
    <div className="space-y-5">
      <AthleteContext athlete={athlete} compact />
      <div className="grid grid-cols-2 rounded-[14px] bg-[color:var(--surface-subtle)] p-1">
        <button
          type="button"
          aria-label="Semana fija"
          aria-pressed={scheduleMode === "fixed"}
          onClick={() => changeScheduleMode("fixed")}
          className={`h-11 rounded-[11px] text-sm font-semibold ${scheduleMode === "fixed" ? "bg-[#181918] text-white dark:bg-[#e2ff00] dark:text-black" : "text-[color:var(--text-muted)]"}`}
        >
          Días fijos
        </button>
        <button
          type="button"
          aria-label="Ciclo flexible"
          aria-pressed={scheduleMode === "sequential_cycle"}
          onClick={() => changeScheduleMode("sequential_cycle")}
          className={`h-11 rounded-[11px] text-sm font-semibold ${scheduleMode === "sequential_cycle" ? "bg-[#181918] text-white dark:bg-[#e2ff00] dark:text-black" : "text-[color:var(--text-muted)]"}`}
        >
          Ciclo libre
        </button>
      </div>
      <header>
        <h1 className="text-3xl font-semibold tracking-[-0.05em]">
          {trainingDays.length} días por semana
        </h1>
        <p className="mt-1 text-sm text-[color:var(--text-muted)]">
          {source === "evaluation"
            ? `Según la disponibilidad de ${athlete?.name?.split(" ")[0]}.`
            : "Organiza las sesiones del bloque."}
        </p>
      </header>
      {scheduleMode === "fixed" ? (
        <div className="flex items-center justify-between gap-2">
          {schedule.map((day, index) => (
            <button
              key={day.slotId}
              type="button"
              aria-label={`Editar ${DAY_NAMES[index]}: ${day.type === "training" ? "Entrenar" : day.type === "recovery" ? "Recuperar" : "Descansar"}`}
              aria-pressed={day.type === "training"}
              onClick={() => {
                setSelectedScheduleIndex(index);
                setDayEditorOpen(true);
              }}
              className={`grid h-11 w-11 place-items-center rounded-full text-sm font-semibold ${day.type === "training" ? "bg-[#43ad65] text-white" : "bg-[color:var(--surface-subtle)] text-[color:var(--text-muted)]"}`}
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
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-[-0.03em]">
            {scheduleMode === "fixed" ? "Semana base" : "Ciclo base"}
          </h2>
          <span className="text-xs text-[color:var(--text-muted)]">
            {trainingDays.length} entrenamientos
          </span>
        </div>
        <div className="mt-3 space-y-2">
          {schedule.map((day, index) => {
            const routine = templates.find(
              (item) =>
                String(item.id || item._id) === String(day.sourceRoutineId),
            );
            if (day.type !== "training") return null;
            return (
              <button
                key={day.slotId}
                type="button"
                onClick={() => {
                  setSelectedScheduleIndex(index);
                  setDayEditorOpen(true);
                }}
                className="flex min-h-16 w-full items-center gap-3 rounded-[16px] border border-[color:var(--border)] bg-[color:var(--card)] p-3 text-left"
              >
                <img
                  src={routinePreview(routine?.name || day.focus, index)}
                  alt=""
                  className="h-12 w-14 shrink-0 rounded-[10px] object-cover"
                />
                <span className="w-12 shrink-0 border-r border-[color:var(--border)] pr-2 text-center">
                  <span className="block text-[10px] font-medium text-[color:var(--text-muted)]">
                    {scheduleMode === "fixed"
                      ? DAY_NAMES[index].slice(0, 3).toUpperCase()
                      : "DÍA"}
                  </span>
                  <strong className="block text-lg">
                    {scheduleDayNumber(index)}
                  </strong>
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm font-semibold">
                    {routine?.name ||
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
                        ? "Pendiente"
                        : "Sin entrenamiento"}
                  </span>
                </span>
                <ChevronRight className="h-5 w-5" />
              </button>
            );
          })}
        </div>
      </section>
      {scheduleMode === "fixed" && trainingDays.length < 7 ? (
        <button
          type="button"
          onClick={() => {
            const nextIndex = schedule.findIndex(
              (day) => day.type !== "training",
            );
            if (nextIndex < 0) return;
            setSelectedScheduleIndex(nextIndex);
            updateDay(nextIndex, { type: "training" });
            setDayEditorOpen(true);
          }}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] border border-[color:var(--border-strong)] text-sm font-semibold"
        >
          <Plus className="h-4 w-4" /> Añadir otro día
        </button>
      ) : null}
      {missingRoutines ? (
        <p className="flex items-start gap-2 text-xs font-medium text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" /> Faltan{" "}
          {missingRoutines} {missingRoutines === 1 ? "rutina" : "rutinas"}.
          Puedes guardar el plan como borrador.
        </p>
      ) : null}
      <p className="rounded-[14px] bg-[color:var(--surface-subtle)] px-3 py-2.5 text-center text-xs text-[color:var(--text-muted)]">
        {trainingDays.length * Number(durationWeeks)} entrenamientos en{" "}
        {durationWeeks} semanas
      </p>
    </div>
  );

  const followUpScreen = () => (
    <div className="space-y-4">
      <AthleteContext athlete={athlete} compact />
      <section className="flex items-center gap-3 rounded-[18px] border border-[color:var(--border)] bg-[color:var(--card)] p-4">
        <span className="min-w-0 flex-1">
          <strong className="block text-sm font-semibold">
            Usar configuración del coach
          </strong>
          <span className="mt-1 block text-xs text-[color:var(--text-muted)]">
            {followUp.useCoachDefaults
              ? "Se mantendrá sincronizada con tus reglas generales"
              : `Personalizado para ${athlete?.name?.split(" ")[0]}`}
          </span>
        </span>
        <Toggle
          checked={followUp.useCoachDefaults}
          onChange={(useCoachDefaults) =>
            setFollowUp((current) => ({ ...current, useCoachDefaults }))
          }
          label="Usar configuración del coach"
        />
      </section>
      <header>
        <h1 className="text-3xl font-semibold tracking-[-0.05em]">
          Tareas de seguimiento
        </h1>
        <p className="mt-1 text-sm text-[color:var(--text-muted)]">
          Define qué deberá registrar y con qué frecuencia.
        </p>
      </header>
      <div className="overflow-hidden rounded-[18px] border border-[color:var(--border)] bg-[color:var(--card)]">
        {[
          [
            "checkIn",
            ClipboardCheck,
            "Check-in",
            followUp.checkIn.cadence === "workout_days"
              ? "Cada día de entrenamiento"
              : followUp.checkIn.cadence === "daily"
                ? "Todos los días"
                : `Cada semana, ${DAY_NAMES[(followUp.checkIn.weekdays?.[0] || 1) - 1]}`,
            true,
          ],
          [
            "weight",
            Scale,
            "Peso",
            cadenceText(followUp.weight),
            followUp.weight.required,
          ],
          [
            "photos",
            Camera,
            "Fotos de progreso",
            cadenceText(followUp.photos),
            followUp.photos.required,
          ],
          [
            "measurements",
            Ruler,
            "Medidas",
            cadenceText(followUp.measurements),
            followUp.measurements.required,
          ],
          [
            "review",
            Target,
            "Revisión del plan",
            `Cada ${followUp.review.intervalWeeks} semanas`,
            true,
          ],
          [
            "finalEvaluation",
            FileText,
            "Evaluación final",
            "Al finalizar el bloque",
            false,
          ],
        ].map(([key, Icon, title, subtitle, required]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFollowUpEditorKey(key)}
            className="flex min-h-[68px] w-full items-center gap-3 border-b border-[color:var(--detail-row-divider)] px-3 text-left last:border-b-0"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--surface-subtle)]">
              <Icon className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block text-sm font-semibold">{title}</strong>
              <span className="mt-0.5 block truncate text-xs text-[color:var(--text-muted)]">
                {followUp.useCoachDefaults
                  ? `Según protocolo · ${subtitle}`
                  : subtitle}
              </span>
            </span>
            <span
              className={`rounded-full px-2 py-1 text-[10px] font-semibold ${required ? "bg-[#e7f7ea] text-[#27743d]" : "bg-[color:var(--surface-subtle)] text-[color:var(--text-muted)]"}`}
            >
              {required ? "Obligatorio" : "Opcional"}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0" />
          </button>
        ))}
      </div>
      {followUp.useCoachDefaults ? null : (
        <div className="hidden space-y-3" aria-hidden="true">
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
            onEnabled={(enabled) => updateFollowUp("checkIn", { enabled })}
          >
            <select
              value={followUp.checkIn.cadence}
              onChange={(event) =>
                updateFollowUp("checkIn", { cadence: event.target.value })
              }
              className="h-10 w-full rounded-xl bg-[color:var(--surface-subtle)] px-3 text-sm outline-none"
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
                className="mt-2 h-10 w-full rounded-xl bg-[color:var(--surface-subtle)] px-3 text-sm outline-none"
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
            subtitle={cadenceText(followUp.weight)}
            enabled={followUp.weight.enabled}
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
                          ? followUp.photos.views.filter(
                              (item) => item !== value,
                            )
                          : [...followUp.photos.views, value],
                      })
                    }
                    className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${selected ? "bg-[#181918] text-white dark:bg-[#e2ff00] dark:text-black" : "bg-[color:var(--surface-subtle)]"}`}
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
                    className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${selected ? "bg-[#181918] text-white dark:bg-[#e2ff00] dark:text-black" : "bg-[color:var(--surface-subtle)]"}`}
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
            onEnabled={(enabled) => updateFollowUp("review", { enabled })}
          >
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] text-[color:var(--text-muted)]">
                Cada semanas
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
                  className="mt-1 h-10 w-full rounded-xl bg-[color:var(--surface-subtle)] px-3 text-sm text-[color:var(--text)]"
                />
              </label>
              <label className="text-[11px] text-[color:var(--text-muted)]">
                Avisar antes
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
                  className="mt-1 h-10 w-full rounded-xl bg-[color:var(--surface-subtle)] px-3 text-sm text-[color:var(--text)]"
                />
              </label>
            </div>
          </FollowUpCard>
          <FollowUpCard
            icon={FileText}
            title="Evaluación final"
            subtitle="Al finalizar el bloque"
            enabled={followUp.finalEvaluation.enabled}
            onEnabled={(enabled) =>
              updateFollowUp("finalEvaluation", { enabled })
            }
          >
            <p className="text-xs leading-5 text-[color:var(--text-muted)]">
              Se solicitará antes de preparar el siguiente bloque.
            </p>
          </FollowUpCard>
        </div>
      )}
      <p className="rounded-[14px] bg-[#edf8ef] px-3 py-2.5 text-center text-xs font-medium text-[#26723d]">
        {athlete?.name?.split(" ")[0]} verá cada tarea en Misiones de hoy.
      </p>
    </div>
  );

  const followUpEditorPanel = followUpEditorKey ? (
    <div className="fixed inset-0 z-[105] flex items-end justify-center bg-black/45 backdrop-blur-[2px]">
      <button
        type="button"
        aria-label="Cerrar edición de seguimiento"
        className="absolute inset-0"
        onClick={() => setFollowUpEditorKey("")}
      />
      <section className="relative w-full max-w-lg rounded-t-[28px] bg-[color:var(--bg)] p-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-2xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[color:var(--border-strong)]" />
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-semibold tracking-[-0.04em]">
              {followUpEditorKey === "checkIn"
                ? "Check-in"
                : followUpEditorKey === "weight"
                  ? "Registro de peso"
                  : followUpEditorKey === "photos"
                    ? "Fotos de progreso"
                    : followUpEditorKey === "measurements"
                      ? "Medidas"
                      : followUpEditorKey === "review"
                        ? "Revisión del plan"
                        : "Evaluación final"}
            </h2>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              Personaliza esta tarea solo para {athlete?.name?.split(" ")[0]}.
            </p>
          </div>
          <Toggle
            checked={Boolean(followUp[followUpEditorKey]?.enabled)}
            onChange={(enabled) => {
              setFollowUp((current) => ({
                ...current,
                useCoachDefaults: false,
                [followUpEditorKey]: {
                  ...current[followUpEditorKey],
                  enabled,
                },
              }));
            }}
            label="Activar tarea"
          />
        </div>
        <div className="mt-5">
          {followUpEditorKey === "checkIn" ? (
            <div className="space-y-3">
              <label className="block text-xs font-medium text-[color:var(--text-muted)]">
                Frecuencia
                <select
                  value={followUp.checkIn.cadence}
                  onChange={(event) =>
                    updateFollowUp("checkIn", { cadence: event.target.value })
                  }
                  className="mt-1 h-12 w-full rounded-[12px] bg-[color:var(--surface-subtle)] px-3 text-sm outline-none"
                >
                  <option value="workout_days">Días de entrenamiento</option>
                  <option value="daily">Todos los días</option>
                  <option value="weekly">Una vez por semana</option>
                </select>
              </label>
              {followUp.checkIn.cadence === "weekly" ? (
                <label className="block text-xs font-medium text-[color:var(--text-muted)]">
                  Día
                  <select
                    value={followUp.checkIn.weekdays?.[0] || 1}
                    onChange={(event) =>
                      updateFollowUp("checkIn", {
                        weekdays: [Number(event.target.value)],
                      })
                    }
                    className="mt-1 h-12 w-full rounded-[12px] bg-[color:var(--surface-subtle)] px-3 text-sm outline-none"
                  >
                    {WEEKDAY_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
          ) : ["weight", "photos", "measurements"].includes(
              followUpEditorKey,
            ) ? (
            <>
              <FrequencyEditor
                value={followUp[followUpEditorKey]}
                onChange={(changes) =>
                  updateFollowUp(followUpEditorKey, changes)
                }
                showWeekday={followUpEditorKey === "weight"}
              />
              {followUpEditorKey === "photos" ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {PHOTO_VIEWS.map(([value, label]) => {
                    const selected = followUp.photos.views.includes(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          updateFollowUp("photos", {
                            views: selected
                              ? followUp.photos.views.filter(
                                  (item) => item !== value,
                                )
                              : [...followUp.photos.views, value],
                          })
                        }
                        className={`rounded-full px-3 py-2 text-xs font-semibold ${selected ? "bg-[#181918] text-white" : "bg-[color:var(--surface-subtle)]"}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
              {followUpEditorKey === "measurements" ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {MEASUREMENT_FIELDS.map(([value, label]) => {
                    const selected =
                      followUp.measurements.fields.includes(value);
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
                        className={`rounded-full px-3 py-2 text-xs font-semibold ${selected ? "bg-[#181918] text-white" : "bg-[color:var(--surface-subtle)]"}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
              <label className="mt-4 flex items-center justify-between rounded-[12px] bg-[color:var(--surface-subtle)] px-3 py-3 text-sm font-medium">
                Tarea obligatoria
                <input
                  type="checkbox"
                  checked={Boolean(followUp[followUpEditorKey].required)}
                  onChange={(event) =>
                    updateFollowUp(followUpEditorKey, {
                      required: event.target.checked,
                    })
                  }
                />
              </label>
            </>
          ) : followUpEditorKey === "review" ? (
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-[color:var(--text-muted)]">
                Cada semanas
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
                  className="mt-1 h-12 w-full rounded-xl bg-[color:var(--surface-subtle)] px-3 text-sm text-[color:var(--text)]"
                />
              </label>
              <label className="text-xs text-[color:var(--text-muted)]">
                Avisar antes
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
                  className="mt-1 h-12 w-full rounded-xl bg-[color:var(--surface-subtle)] px-3 text-sm text-[color:var(--text)]"
                />
              </label>
            </div>
          ) : (
            <p className="rounded-[14px] bg-[color:var(--surface-subtle)] p-4 text-sm leading-6 text-[color:var(--text-muted)]">
              Se solicitará al alumno antes de preparar el siguiente bloque.
            </p>
          )}
        </div>
        <Button
          className="mt-5 h-12 w-full rounded-[14px]"
          onClick={() => setFollowUpEditorKey("")}
        >
          Guardar seguimiento
        </Button>
      </section>
    </div>
  ) : null;

  const reviewScreen = () => (
    <div className="space-y-4">
      <section className="rounded-[20px] bg-[#1b1c1b] p-5 text-white shadow-[0_14px_36px_rgba(0,0,0,0.14)]">
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
            <span className="mt-7 inline-flex shrink-0 items-center gap-1 rounded-full bg-[#77df91] px-2.5 py-1 text-[10px] font-semibold text-[#12351d]">
              <CheckCircle2 className="h-3.5 w-3.5" /> Listo para asignar
            </span>
          ) : null}
        </div>
      </section>
      <section>
        <h2 className="text-xl font-semibold tracking-[-0.03em]">
          Seguimiento de {athlete?.name?.split(" ")[0] || "alumno"}
        </h2>
        <div className="mt-2 overflow-hidden rounded-[16px] border border-[color:var(--border)] bg-[color:var(--card)]">
          {[
            [
              ClipboardCheck,
              "Check-in",
              followUp.checkIn.cadence === "workout_days"
                ? "Entrenamientos"
                : followUp.checkIn.cadence === "daily"
                  ? "Diario"
                  : "Semanal",
            ],
            [Scale, "Peso", cadenceText(followUp.weight)],
            [Camera, "Fotos", cadenceText(followUp.photos)],
            [Ruler, "Medidas", cadenceText(followUp.measurements)],
            [
              Target,
              "Revisión",
              `Cada ${followUp.review.intervalWeeks} semanas`,
            ],
          ].map(([Icon, title, subtitle], index) => {
            const editorKeys = [
              "checkIn",
              "weight",
              "photos",
              "measurements",
              "review",
            ];
            return (
              <button
                key={title}
                type="button"
                onClick={() => setFollowUpEditorKey(editorKeys[index])}
                className="flex min-h-14 w-full items-center gap-3 border-b border-[color:var(--detail-row-divider)] px-3 text-left last:border-b-0"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-[color:var(--surface-subtle)]">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-sm">{title}</strong>
                  <span className="block truncate text-[11px] text-[color:var(--text-muted)]">
                    {subtitle}
                    {[1, 2, 3].includes(index)
                      ? ` · ${index === 1 ? (followUp.weight.required ? "Obligatorio" : "Opcional") : index === 2 ? (followUp.photos.required ? "Obligatorio" : "Opcional") : followUp.measurements.required ? "Obligatorio" : "Opcional"}`
                      : ""}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0" />
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setCustomizingFollowUp(true)}
          className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-[12px] border border-[color:var(--border-strong)] text-xs font-semibold"
        >
          <Settings2 className="h-4 w-4" /> Personalizar seguimiento
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
    <div className="coach-plan-page routines-shell fixed inset-0 z-[90] bg-[color:var(--bg)]">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? "Editar planificación" : "Crear planificación"}
        tabIndex={-1}
        className="flex h-dvh w-full flex-col overflow-hidden bg-[color:var(--bg)] outline-none"
      >
        {renderHeader()}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-lg px-5 py-5">
            {templatePickerOpen
              ? templateScreen()
              : step === 0
                ? sourceScreen()
                : step === 1
                  ? generalScreen()
                  : step === 2
                    ? weekScreen()
                    : customizingFollowUp
                      ? followUpScreen()
                      : reviewScreen()}
          </div>
        </div>
        {!templatePickerOpen ? (
          <footer className="shrink-0 border-t border-[color:var(--border)] bg-[color:var(--bg)] px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
            <div className="mx-auto flex w-full max-w-lg gap-2">
              {step === 0 ? (
                <Button
                  className="h-12 min-w-0 flex-1 rounded-[8px]"
                  onClick={beginFromZero}
                >
                  Continuar
                </Button>
              ) : null}
              {step === 1 ? (
                <Button
                  className="h-12 min-w-0 flex-1 rounded-[14px]"
                  disabled={!name.trim() || !validDuration || !startDate}
                  onClick={() => setStep(2)}
                >
                  Continuar: organizar semana <ArrowRight className="h-4 w-4" />
                </Button>
              ) : null}
              {step === 2 ? (
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
              {step === 3 && customizingFollowUp ? (
                <Button
                  className="h-12 min-w-0 flex-1 rounded-[14px]"
                  onClick={() => setCustomizingFollowUp(false)}
                >
                  Volver a revisión <ArrowRight className="h-4 w-4" />
                </Button>
              ) : null}
              {step === 3 && !customizingFollowUp ? (
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
      {followUpEditorPanel}

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
