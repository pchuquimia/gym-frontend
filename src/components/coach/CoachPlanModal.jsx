import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Bed,
  CalendarDays,
  Check,
  Dumbbell,
  Minus,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import Button from "../ui/button";

const DAY_NAMES = [
  "Lunes",
  "Martes",
  "Miercoles",
  "Jueves",
  "Viernes",
  "Sabado",
  "Domingo",
];

const PRESETS = {
  ppl: ["Empuje", "Jale", "Piernas", "Empuje", "Jale", "Piernas", "Descanso"],
  balanced: [
    "Tren superior",
    "Tren inferior",
    "Descanso",
    "Empuje",
    "Jale",
    "Piernas",
    "Descanso",
  ],
  beginner: [
    "Full body",
    "Descanso",
    "Full body",
    "Descanso",
    "Full body",
    "Recuperacion",
    "Descanso",
  ],
};

const FREQUENCY_PRESETS = {
  3: ["Full body", "", "Full body", "", "Full body", "", ""],
  4: [
    "Tren superior",
    "Tren inferior",
    "",
    "Tren superior",
    "Tren inferior",
    "",
    "",
  ],
  5: ["Empuje", "Jale", "Piernas", "", "Torso", "Piernas", ""],
  6: PRESETS.ppl.map((focus) => (focus === "Descanso" ? "" : focus)),
};

const createSchedule = (preset = PRESETS.ppl) =>
  preset.map((focus, index) => ({
    dayIndex: index + 1,
    type:
      focus === "Descanso"
        ? "rest"
        : focus === "Recuperacion"
          ? "recovery"
          : "training",
    focus: focus === "Descanso" ? "" : focus,
    slotId: `slot_${index + 1}`,
    order: index + 1,
    sourceRoutineId: "",
  }));

const createCycleSchedule = (length = 4) =>
  Array.from({ length }, (_, index) => ({
    dayIndex: index + 1,
    type: index === 0 ? "rest" : "training",
    focus:
      index === 0
        ? ""
        : ["Piernas", "Pecho", "Espalda"][index - 1] || "Entrenamiento",
    slotId: `slot_${index + 1}`,
    order: index + 1,
    sourceRoutineId: "",
  }));

const planDraftSignature = ({
  selectedPlanTemplateId,
  name,
  level,
  goal,
  durationWeeks,
  startDate,
  scheduleMode,
  notes,
  schedule,
}) =>
  JSON.stringify({
    selectedPlanTemplateId: String(selectedPlanTemplateId || ""),
    name: String(name || ""),
    level,
    goal,
    durationWeeks: String(durationWeeks || ""),
    startDate,
    scheduleMode,
    notes: String(notes || ""),
    schedule: (schedule || []).map((day) => ({
      dayIndex: day.dayIndex,
      slotId: day.slotId,
      order: day.order,
      type: day.type,
      focus: day.focus,
      sourceRoutineId: day.sourceRoutineId || "",
    })),
  });

export default function CoachPlanModal({
  athlete,
  templates = [],
  planTemplates = [],
  initialData,
  replacingPlan,
  manageRoutinesSeparately = false,
  onSave,
  onClose,
}) {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const hasUnsavedChangesRef = useRef(false);
  const initialDraftSignatureRef = useRef("");
  const slotSequenceRef = useRef(0);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const isEditing = Boolean(initialData?._id || initialData?.id);
  const [selectedPlanTemplateId, setSelectedPlanTemplateId] = useState(
    initialData?.sourcePlanId || initialData?.planTemplateId || "",
  );
  const [name, setName] = useState(
    initialData?.name || "Plan de hipertrofia",
  );
  const [level, setLevel] = useState(initialData?.level || "beginner");
  const [goal, setGoal] = useState(initialData?.goal || "Hipertrofia");
  const [durationWeeks, setDurationWeeks] = useState(
    initialData?.durationWeeks || 8,
  );
  const [startDate, setStartDate] = useState(
    initialData?.startDate
      ? String(initialData.startDate).slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  );
  const [scheduleMode, setScheduleMode] = useState(
    initialData?.scheduleMode === "flexible_guided"
      ? "sequential_cycle"
      : initialData?.scheduleMode || "fixed",
  );
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [schedule, setSchedule] = useState(() =>
    initialData?.weeklySchedule?.length
      ? initialData.weeklySchedule.map((day, index) => ({
          dayIndex: index + 1,
          slotId: day.slotId || `slot_${index + 1}`,
          order: day.order || index + 1,
          type: day.type || "training",
          focus: day.focus || "",
          sourceRoutineId: day.sourceRoutineId || "",
        }))
      : createSchedule(PRESETS.ppl),
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onCloseRef.current?.();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus?.();
    };
  }, []);

  const trainingDays = useMemo(
    () => schedule.filter((day) => day.type === "training").length,
    [schedule],
  );
  const selectedPlanTemplate = useMemo(
    () =>
      planTemplates.find(
        (item) =>
          String(item._id || item.id) === String(selectedPlanTemplateId),
      ) || null,
    [planTemplates, selectedPlanTemplateId],
  );
  const missingRoutines = useMemo(() => {
    const templateIds = new Set(
      templates.map((routine) => String(routine.id || routine._id)),
    );
    return schedule.filter(
      (day) =>
        day.type === "training" &&
        (!day.sourceRoutineId || !templateIds.has(String(day.sourceRoutineId))),
    ).length;
  }, [schedule, templates]);
  const validDuration =
    Number(durationWeeks) >= 1 && Number(durationWeeks) <= 52;
  const endDate = useMemo(() => {
    if (!startDate || !validDuration) return "";
    const value = new Date(`${startDate}T00:00:00Z`);
    value.setUTCDate(value.getUTCDate() + Number(durationWeeks) * 7 - 1);
    return value.toLocaleDateString("es-BO", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  }, [durationWeeks, startDate, validDuration]);

  const draftSignature = planDraftSignature({
    selectedPlanTemplateId,
    name,
    level,
    goal,
    durationWeeks,
    startDate,
    scheduleMode,
    notes,
    schedule,
  });
  if (!initialDraftSignatureRef.current) {
    initialDraftSignatureRef.current = draftSignature;
  }
  hasUnsavedChangesRef.current =
    draftSignature !== initialDraftSignatureRef.current;

  useEffect(() => {
    onCloseRef.current = () => {
      if (saving) return;
      if (
        hasUnsavedChangesRef.current &&
        !window.confirm(
          "Tienes cambios sin guardar. ¿Deseas cerrar la planificación?",
        )
      ) {
        return;
      }
      onClose();
    };
  }, [onClose, saving]);

  const createEditorSlotId = (mode) => {
    slotSequenceRef.current += 1;
    return `slot_${mode}_${Date.now().toString(36)}_${slotSequenceRef.current}`;
  };

  const resetScheduleSlots = (items, mode) =>
    items.map((day, index) => ({
      ...day,
      dayIndex: index + 1,
      order: index + 1,
      slotId: createEditorSlotId(mode),
      sourceRoutineId: "",
    }));

  const updateDay = (index, changes) => {
    setSchedule((current) =>
      current.map((day, dayIndex) =>
        dayIndex === index
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
  };

  const changeScheduleMode = (mode) => {
    if (mode === scheduleMode) return;
    setScheduleMode(mode);
    setSchedule(() => {
      if (mode === "fixed") {
        return resetScheduleSlots(createSchedule(PRESETS.ppl), mode);
      }
      return resetScheduleSlots(createCycleSchedule(), mode);
    });
  };

  const applyFrequencyPreset = (frequency) => {
    const focuses = FREQUENCY_PRESETS[frequency];
    if (!focuses) return;
    setSchedule(
      resetScheduleSlots(
        focuses.map((focus, index) => ({
          dayIndex: index + 1,
          type: focus ? "training" : "rest",
          focus,
          slotId: `slot_${index + 1}`,
          order: index + 1,
          sourceRoutineId: "",
        })),
        "fixed",
      ),
    );
  };

  const resizeCycle = (delta) => {
    setSchedule((current) => {
      const nextLength = Math.min(28, Math.max(2, current.length + delta));
      if (nextLength === current.length) return current;
      if (nextLength < current.length) return current.slice(0, nextLength);
      return [
        ...current,
        ...Array.from({ length: nextLength - current.length }, (_, index) => ({
          dayIndex: current.length + index + 1,
          type: "training",
          focus: "Entrenamiento",
          slotId: createEditorSlotId(scheduleMode),
          order: current.length + index + 1,
          sourceRoutineId: "",
        })),
      ];
    });
  };

  const applyPlanTemplate = (templateId) => {
    setSelectedPlanTemplateId(templateId);
    const template = planTemplates.find(
      (item) => String(item._id || item.id) === String(templateId),
    );
    if (!template) return;
    setName(template.name || "Nueva planificacion");
    setLevel(template.level || "beginner");
    setGoal(template.goal || "General");
    setDurationWeeks(template.durationWeeks || 8);
    setScheduleMode(template.scheduleMode || "fixed");
    setSchedule(
      (template.weeklySchedule || []).map((day, index) => ({
        dayIndex: index + 1,
        slotId: `slot_${index + 1}`,
        order: index + 1,
        type: day.type || "training",
        focus: day.focus || "",
        sourceRoutineId: day.sourceRoutineId || day.routineId || "",
      })),
    );
    setTemplatePickerOpen(false);
  };

  const continueWithoutTemplate = () => {
    setSelectedPlanTemplateId("");
    setTemplatePickerOpen(false);
  };

  const submit = async () => {
    if (!name.trim() || !validDuration || !trainingDays || !startDate || saving)
      return;
    setSaving(true);
    try {
      const usesCatalogPlan =
        selectedPlanTemplate?.catalogSource === "training_plan";
      await onSave({
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
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="coach-plan-page routines-shell fixed inset-0 z-[90] flex items-end bg-[color:var(--bg)] sm:items-center sm:justify-center sm:bg-black/55 sm:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? "Editar planificación" : "Crear planificación"}
        tabIndex={-1}
        className="coach-plan-page__dialog flex h-dvh max-h-dvh w-full flex-col overflow-hidden bg-[color:var(--card)] shadow-none outline-none sm:h-auto sm:max-h-[94dvh] sm:max-w-3xl sm:rounded-lg sm:border sm:border-[color:var(--border)] sm:shadow-2xl dark:sm:rounded-[4px]"
      >
        <header className="coach-plan-page__header grid min-h-16 grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-3 p-0 sm:flex sm:min-h-0 sm:items-start sm:justify-between sm:border-b sm:border-[color:var(--border)] sm:p-4 sm:px-6">
          <div className="col-start-2 row-start-1 min-w-0 text-center sm:text-left">
            <p className="coach-plan-page__eyebrow theme-accent-text text-[11px] font-black uppercase tracking-[0.14em]">
              {templatePickerOpen
                ? `Nueva planificación · ${athlete.name}`
                : `Paso ${step} de 2 · ${athlete.name}`}
            </p>
            <h2 className="coach-plan-page__title mt-1 truncate text-xl font-black">
              {templatePickerOpen
                ? "Elegir estructura"
                : step === 1
                  ? "Datos del plan"
                  : "Organizar días"}
            </h2>
            {!templatePickerOpen && !isEditing && replacingPlan ? (
              <p className="mt-1 truncate text-xs font-semibold text-[color:var(--text-muted)]">
                Al activarlo, {replacingPlan.name} quedara pausado.
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onCloseRef.current?.()}
              aria-label="Cerrar"
            className="col-start-1 row-start-1 grid h-11 w-11 shrink-0 place-items-center rounded-full sm:order-last sm:rounded-lg sm:border sm:border-[color:var(--border)]"
          >
            <ArrowLeft className="h-7 w-7 sm:hidden" strokeWidth={2.25} />
            <X className="hidden h-5 w-5 sm:block" />
          </button>
        </header>

        <div className="coach-plan-page__content overflow-y-auto bg-[color:var(--bg)] p-4 sm:bg-transparent sm:p-6">
          {templatePickerOpen ? (
            <div className="space-y-5">
              <button
                type="button"
                onClick={continueWithoutTemplate}
                className="flex min-h-16 w-full items-center gap-3 border border-[color:var(--border)] bg-[color:var(--bg)] p-3 text-left transition hover:border-[#352018] dark:hover:border-[#e2ff00]"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center bg-[#352018] text-white dark:bg-[#e2ff00] dark:text-black">
                  <Plus className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black">
                    Continuar sin estructura
                  </span>
                  <span className="mt-0.5 block text-xs font-semibold text-[color:var(--text-muted)]">
                    Configura el plan manualmente.
                  </span>
                </span>
                {!selectedPlanTemplateId ? (
                  <Check className="h-5 w-5 shrink-0 text-[#352018] dark:text-[#e2ff00]" />
                ) : null}
              </button>

              <section aria-labelledby="saved-plan-structures">
                <p
                  id="saved-plan-structures"
                  className="text-[10px] font-black uppercase tracking-[0.14em] text-[color:var(--text-muted)]"
                >
                  Catálogo de planificaciones
                </p>
                <div className="mt-2 divide-y divide-[color:var(--border)] border-y border-[color:var(--border)]">
                  {planTemplates.map((template) => {
                    const templateId = String(template._id || template.id);
                    const selected =
                      String(selectedPlanTemplateId) === templateId;
                    return (
                      <button
                        key={templateId}
                        type="button"
                        onClick={() => applyPlanTemplate(templateId)}
                        aria-pressed={selected}
                        className="flex min-h-16 w-full items-center gap-3 px-1 py-3 text-left transition hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-black">
                            {template.name}
                          </span>
                          <span className="mt-0.5 block text-[11px] font-semibold text-[color:var(--text-muted)]">
                            {template.durationWeeks} semanas ·{" "}
                            {template.catalogSource === "training_plan"
                              ? "Plan del administrador"
                              : "Estructura editable"}
                          </span>
                        </span>
                        {selected ? (
                          <Check className="h-5 w-5 shrink-0 text-[#352018] dark:text-[#e2ff00]" />
                        ) : (
                          <ArrowRight className="h-4 w-4 shrink-0 text-[color:var(--text-muted)]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          ) : step === 1 ? (
            <div className="space-y-5">
              {!isEditing && planTemplates.length ? (
                <div className="flex min-h-14 items-center justify-between gap-3 border-b border-[color:var(--border)] pb-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                      {selectedPlanTemplate
                        ? "Planificación aplicada"
                        : "Configuración manual"}
                    </p>
                    <p className="mt-1 truncate text-sm font-black">
                      {selectedPlanTemplate?.name || "Plan nuevo"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTemplatePickerOpen(true)}
                    className="h-10 shrink-0 border border-[#352018] px-3 text-xs font-black text-[#352018] dark:border-[#e2ff00] dark:text-[#e2ff00]"
                  >
                    {selectedPlanTemplate ? "Cambiar" : "Usar planificación"}
                  </button>
                </div>
              ) : null}
              <label className="block">
                <span className="text-xs font-black">Nombre del plan</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={100}
                  className="theme-accent-focus mt-2 h-11 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-sm font-semibold outline-none"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="text-xs font-black">Nivel</span>
                  <select
                    value={level}
                    onChange={(event) => setLevel(event.target.value)}
                    className="mt-2 h-11 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-sm font-semibold"
                  >
                    <option value="beginner">Principiante</option>
                    <option value="intermediate">Intermedio</option>
                    <option value="advanced">Avanzado</option>
                  </select>
                </label>
                <label>
                  <span className="text-xs font-black">Objetivo principal</span>
                  <select
                    value={goal}
                    onChange={(event) => setGoal(event.target.value)}
                    className="mt-2 h-11 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-sm font-semibold"
                  >
                    <option>Hipertrofia</option>
                    <option>Fuerza</option>
                    <option>Perdida de grasa</option>
                    <option>Acondicionamiento</option>
                    <option>Movilidad</option>
                    <option>Retorno al entrenamiento</option>
                  </select>
                </label>
                <label>
                  <span className="text-xs font-black">Duracion</span>
                  <div className="relative mt-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="52"
                      value={durationWeeks}
                      onChange={(event) => setDurationWeeks(event.target.value)}
                      className="h-11 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3 pr-20 text-sm font-semibold"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[color:var(--text-muted)]">
                      semanas
                    </span>
                  </div>
                </label>
                <label>
                  <span className="text-xs font-black">Fecha de inicio</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="mt-2 h-11 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-sm font-semibold"
                  />
                  {endDate ? (
                    <span className="mt-1.5 block text-[11px] font-semibold text-[color:var(--text-muted)]">
                      Finaliza el {endDate}
                    </span>
                  ) : null}
                </label>
              </div>

              <label className="block border-t border-[color:var(--border)] pt-4">
                <span className="text-xs font-black">Notas opcionales</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  maxLength={1000}
                  rows={3}
                  placeholder="Indicaciones generales o restricciones"
                  className="theme-accent-focus mt-2 w-full resize-none rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] p-3 text-sm font-semibold outline-none"
                />
              </label>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <fieldset
                  className={scheduleMode === "fixed" ? "sm:col-span-2" : ""}
                >
                  <legend className="text-xs font-black">
                    Orden de entrenamiento
                  </legend>
                  <div className="mt-2 grid grid-cols-2 gap-1 rounded-lg border border-[color:var(--border)] p-1">
                    {[
                      { id: "fixed", label: "Semana fija" },
                      { id: "sequential_cycle", label: "Ciclo libre" },
                    ].map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => changeScheduleMode(option.id)}
                        className={`h-11 rounded-md px-2 text-xs font-black transition ${
                          scheduleMode === option.id
                            ? "theme-accent-solid"
                            : "text-[color:var(--text-muted)]"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
                {scheduleMode !== "fixed" ? (
                  <fieldset>
                    <legend className="text-xs font-black">
                      Duracion del ciclo
                    </legend>
                    <div className="mt-2 flex h-[54px] items-center justify-between rounded-lg border border-[color:var(--border)] px-1">
                      <button
                        type="button"
                        onClick={() => resizeCycle(-1)}
                        disabled={schedule.length <= 2}
                        className="grid h-11 w-11 place-items-center disabled:opacity-30"
                        aria-label="Quitar un dia del ciclo"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <strong className="text-sm">
                        {schedule.length} dias
                      </strong>
                      <button
                        type="button"
                        onClick={() => resizeCycle(1)}
                        disabled={schedule.length >= 28}
                        className="grid h-11 w-11 place-items-center disabled:opacity-30"
                        aria-label="Agregar un dia al ciclo"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </fieldset>
                ) : null}
              </div>

              {scheduleMode === "fixed" ? (
                <fieldset>
                  <legend className="text-xs font-black">
                    Frecuencia semanal rápida
                  </legend>
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {[3, 4, 5, 6].map((frequency) => (
                      <button
                        key={frequency}
                        type="button"
                        onClick={() => applyFrequencyPreset(frequency)}
                        className={`h-11 rounded-lg border text-xs font-black ${
                          trainingDays === frequency
                            ? "theme-accent-soft"
                            : "border-[color:var(--border)] text-[color:var(--text-muted)]"
                        }`}
                      >
                        {frequency} días
                      </button>
                    ))}
                  </div>
                </fieldset>
              ) : null}

              {manageRoutinesSeparately ? (
                <p className="rounded-lg border border-dashed border-[color:var(--border)] p-3 text-xs font-semibold text-[color:var(--text-muted)]">
                  Guarda la estructura ahora. Podrás crear o asignar cada rutina
                  desde el detalle de la planificación.
                </p>
              ) : null}

              <div className="mt-4 divide-y divide-[color:var(--border)] border-y border-[color:var(--border)]">
                {schedule.map((day, index) => (
                  <div
                    key={day.dayIndex}
                    className={`grid gap-2 py-3 sm:items-center ${
                      manageRoutinesSeparately
                        ? "sm:grid-cols-[92px_130px_minmax(0,1fr)]"
                        : "sm:grid-cols-[92px_130px_minmax(0,1fr)_minmax(0,1fr)]"
                    }`}
                  >
                    <span className="text-sm font-black">
                      {scheduleMode === "fixed"
                        ? DAY_NAMES[index]
                        : `Dia ${index + 1}`}
                    </span>
                    <select
                      value={day.type}
                      onChange={(event) =>
                        updateDay(index, { type: event.target.value })
                      }
                      aria-label={`Tipo de ${scheduleMode === "fixed" ? DAY_NAMES[index] : `dia ${index + 1}`}`}
                      className="h-11 rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-2 text-sm font-bold"
                    >
                      <option value="training">Entrenamiento</option>
                      <option value="recovery">Recuperacion</option>
                      <option value="rest">Descanso</option>
                    </select>
                    {day.type === "training" ? (
                      <>
                        <input
                          value={day.focus}
                          onChange={(event) =>
                            updateDay(index, { focus: event.target.value })
                          }
                          maxLength={80}
                          placeholder="Enfoque: Empuje"
                          aria-label={`Enfoque de ${scheduleMode === "fixed" ? DAY_NAMES[index] : `dia ${index + 1}`}`}
                          className="h-11 min-w-0 rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-sm font-semibold"
                        />
                        {!manageRoutinesSeparately ? (
                          <select
                            value={day.sourceRoutineId}
                            onChange={(event) =>
                              updateDay(index, {
                                sourceRoutineId: event.target.value,
                              })
                            }
                            aria-label={`Rutina de ${scheduleMode === "fixed" ? DAY_NAMES[index] : `dia ${index + 1}`}`}
                            className="h-11 min-w-0 rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-2 text-sm font-semibold"
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
                        ) : null}
                      </>
                    ) : (
                      <div className="flex h-10 items-center gap-2 text-xs font-bold text-[color:var(--text-muted)] sm:col-span-2">
                        {day.type === "rest" ? (
                          <Bed className="h-4 w-4" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        {day.type === "rest"
                          ? "Sin entrenamiento"
                          : "Actividad ligera y movilidad"}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {!manageRoutinesSeparately && missingRoutines ? (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p className="text-xs font-bold">
                    {templates.length
                      ? `Selecciona una rutina para ${missingRoutines} ${missingRoutines === 1 ? "dia" : "dias"}.`
                      : "Crea primero las rutinas que formaran parte de esta planificacion."}
                  </p>
                </div>
              ) : null}

              <div className="mt-4 flex items-center gap-4 text-xs font-black text-[color:var(--text-muted)]">
                <span className="inline-flex items-center gap-1.5">
                  <Dumbbell className="h-4 w-4" />
                  {trainingDays} dias activos
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  {durationWeeks} semanas
                </span>
              </div>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-[color:var(--border)] p-4 sm:px-6">
          {templatePickerOpen ? (
            <Button
              variant="outline"
              className="h-11 rounded-lg"
              onClick={() => setTemplatePickerOpen(false)}
            >
              <ArrowLeft className="h-4 w-4" /> Volver
            </Button>
          ) : step === 1 ? (
            <button
              type="button"
              onClick={() => onCloseRef.current?.()}
              className="h-11 px-3 text-sm font-black text-[color:var(--text-muted)]"
            >
              Cancelar
            </button>
          ) : (
            <Button
              variant="outline"
              className="h-11 rounded-lg"
              onClick={() => setStep(1)}
            >
              <ArrowLeft className="h-4 w-4" /> Anterior
            </Button>
          )}
          {templatePickerOpen ? (
            <span />
          ) : step === 1 ? (
            <Button
              className="h-11 rounded-lg"
              disabled={!name.trim() || !validDuration || !startDate}
              onClick={() => setStep(2)}
            >
              Continuar <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              className="h-11 rounded-lg"
              disabled={!trainingDays || saving}
              onClick={submit}
            >
              {saving
                ? "Guardando..."
                : isEditing
                  ? "Guardar cambios"
                  : "Guardar planificación"}
            </Button>
          )}
        </footer>
      </div>
    </div>
  );
}
