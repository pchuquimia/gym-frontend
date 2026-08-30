import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Check,
  Minus,
  Plus,
} from "lucide-react";
import Button from "../ui/button";

const DAY_NAMES = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
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
  const [name, setName] = useState(initialData?.name || "Plan de hipertrofia");
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
    setName(template.name || "Nueva planificación");
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
    <div className="coach-plan-page routines-shell fixed inset-0 z-[90] bg-[color:var(--bg)]">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? "Editar planificación" : "Crear planificación"}
        tabIndex={-1}
        className="coach-plan-page__dialog flex h-dvh w-full flex-col overflow-hidden bg-[color:var(--bg)] outline-none"
      >
        <header className="coach-plan-page__header shrink-0 border-b border-[color:var(--border)] bg-[color:var(--bg)]">
          <div className="mx-auto grid min-h-16 w-full max-w-2xl grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-3 px-2 sm:min-h-20 sm:px-4">
            <button
              type="button"
              onClick={() =>
                templatePickerOpen
                  ? setTemplatePickerOpen(false)
                  : onCloseRef.current?.()
              }
              aria-label={templatePickerOpen ? "Volver" : "Cerrar"}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full"
            >
              <ArrowLeft className="h-6 w-6" strokeWidth={2} />
            </button>
            <h2 className="truncate text-center text-lg font-medium tracking-[-0.02em] sm:text-xl">
              {templatePickerOpen
                ? "Elegir estructura"
                : isEditing
                  ? "Editar planificación"
                  : "Crear planificación"}
            </h2>
            <span className="text-center text-xs font-medium text-[color:var(--text-muted)]">
              {templatePickerOpen ? "" : `${step}/2`}
            </span>
          </div>
        </header>

        <div className="coach-plan-page__content min-h-0 flex-1 overflow-y-auto bg-[color:var(--bg)]">
          <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
            {templatePickerOpen ? (
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-medium tracking-[-0.035em] text-[color:var(--text)] sm:text-4xl">
                    Elige una estructura
                  </h1>
                  <p className="mt-2 text-sm text-[color:var(--text-muted)]">
                    Usa una plantilla o comienza un plan desde cero.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={continueWithoutTemplate}
                  className="flex min-h-20 w-full items-center gap-3 rounded-2xl bg-[color:var(--card)] p-4 text-left transition"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--surface-subtle)] text-[color:var(--text)]">
                    <Plus className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">
                      Crear desde cero
                    </span>
                    <span className="mt-0.5 block text-xs text-[color:var(--text-muted)]">
                      Define cada dato y día manualmente.
                    </span>
                  </span>
                  {!selectedPlanTemplateId ? (
                    <Check className="h-5 w-5 shrink-0 text-[#352018] dark:text-[#e2ff00]" />
                  ) : null}
                </button>

                <section aria-labelledby="saved-plan-structures">
                  <h2
                    id="saved-plan-structures"
                    className="text-sm font-medium"
                  >
                    Plantillas disponibles
                  </h2>
                  <div className="mt-2 divide-y divide-[color:var(--detail-row-divider)] overflow-hidden rounded-2xl bg-[color:var(--card)]">
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
                          className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">
                              {template.name}
                            </span>
                            <span className="mt-0.5 block text-[11px] text-[color:var(--text-muted)]">
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
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-medium tracking-[-0.035em] text-[color:var(--text)] sm:text-4xl">
                    Información básica
                  </h1>
                  <p className="mt-2 text-sm text-[color:var(--text-muted)]">
                    Define el objetivo y cuánto durará tu plan.
                  </p>
                  {!isEditing && replacingPlan ? (
                    <p className="mt-2 text-xs font-medium text-[color:var(--text-muted)]">
                      Al activarlo, {replacingPlan.name} quedará pausado.
                    </p>
                  ) : null}
                </div>

                {!isEditing && planTemplates.length ? (
                  <div className="flex min-h-16 items-center justify-between gap-3 rounded-2xl bg-[color:var(--card)] px-4">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[color:var(--text-muted)]">
                        {selectedPlanTemplate
                          ? "Estructura seleccionada"
                          : "Empezar desde una plantilla"}
                      </p>
                      {selectedPlanTemplate ? (
                        <p className="mt-0.5 truncate text-sm font-semibold">
                          {selectedPlanTemplate.name}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => setTemplatePickerOpen(true)}
                      className="h-10 shrink-0 rounded-full px-3 text-xs font-semibold text-[color:var(--accent-strong)]"
                    >
                      {selectedPlanTemplate ? "Cambiar" : "Elegir"}
                    </button>
                  </div>
                ) : null}

                <label className="block">
                  <span className="text-sm font-medium">Nombre del plan</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={100}
                    className="theme-accent-focus mt-2 h-14 w-full rounded-2xl border-0 bg-[color:var(--card)] px-4 text-base font-medium outline-none"
                  />
                </label>

                <section>
                  <h2 className="mb-2 text-sm font-medium">Configuración</h2>
                  <div className="divide-y divide-[color:var(--detail-row-divider)] overflow-hidden rounded-2xl bg-[color:var(--card)]">
                    <label className="grid min-h-16 grid-cols-[112px_minmax(0,1fr)] items-center gap-3 px-4 sm:grid-cols-[160px_minmax(0,1fr)]">
                      <span className="text-sm font-medium">Objetivo</span>
                      <select
                        value={goal}
                        onChange={(event) => setGoal(event.target.value)}
                        className="h-12 min-w-0 bg-transparent text-right text-sm font-medium outline-none"
                      >
                        <option>Hipertrofia</option>
                        <option>Fuerza</option>
                        <option value="Perdida de grasa">
                          Pérdida de grasa
                        </option>
                        <option>Acondicionamiento</option>
                        <option>Movilidad</option>
                        <option>Retorno al entrenamiento</option>
                      </select>
                    </label>
                    <label className="grid min-h-16 grid-cols-[112px_minmax(0,1fr)] items-center gap-3 px-4 sm:grid-cols-[160px_minmax(0,1fr)]">
                      <span className="text-sm font-medium">Nivel</span>
                      <select
                        value={level}
                        onChange={(event) => setLevel(event.target.value)}
                        className="h-12 min-w-0 bg-transparent text-right text-sm font-medium outline-none"
                      >
                        <option value="beginner">Principiante</option>
                        <option value="intermediate">Intermedio</option>
                        <option value="advanced">Avanzado</option>
                      </select>
                    </label>
                    <label className="grid min-h-16 grid-cols-[112px_minmax(0,1fr)] items-center gap-3 px-4 sm:grid-cols-[160px_minmax(0,1fr)]">
                      <span className="text-sm font-medium">Duración</span>
                      <div className="flex items-center justify-end gap-2">
                        <input
                          type="number"
                          inputMode="numeric"
                          min="1"
                          max="52"
                          value={durationWeeks}
                          onChange={(event) =>
                            setDurationWeeks(event.target.value)
                          }
                          className="h-12 w-16 bg-transparent text-right text-sm font-medium outline-none"
                        />
                        <span className="text-sm text-[color:var(--text-muted)]">
                          semanas
                        </span>
                      </div>
                    </label>
                    <label className="grid min-h-[72px] grid-cols-[112px_minmax(0,1fr)] items-center gap-3 px-4 sm:grid-cols-[160px_minmax(0,1fr)]">
                      <span className="text-sm font-medium">Inicio</span>
                      <span className="min-w-0 text-right">
                        <input
                          type="date"
                          value={startDate}
                          onChange={(event) => setStartDate(event.target.value)}
                          className="h-10 max-w-full bg-transparent text-right text-sm font-medium outline-none"
                        />
                        {endDate ? (
                          <span className="block text-[11px] text-[color:var(--text-muted)]">
                            Termina el {endDate}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  </div>
                </section>

                <details
                  className="overflow-hidden rounded-2xl bg-[color:var(--card)] px-4"
                  defaultOpen={Boolean(notes)}
                >
                  <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between text-sm font-medium">
                    <span>Notas</span>
                    <span className="text-xs font-normal text-[color:var(--text-muted)]">
                      Opcional
                    </span>
                  </summary>
                  <label className="block border-t border-[color:var(--detail-row-divider)] pb-4">
                    <span className="sr-only">Notas opcionales</span>
                    <textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      maxLength={1000}
                      rows={3}
                      placeholder="Indicaciones o restricciones"
                      className="theme-accent-focus mt-3 w-full resize-none rounded-xl border-0 bg-[color:var(--surface-subtle)] p-3 text-sm font-medium outline-none"
                    />
                  </label>
                </details>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-medium tracking-[-0.035em] text-[color:var(--text)] sm:text-4xl">
                    Organiza tus días
                  </h1>
                  <p className="mt-2 text-sm text-[color:var(--text-muted)]">
                    Elige cuándo entrenas y el enfoque de cada sesión.
                  </p>
                </div>

                <div className="grid gap-4 rounded-2xl bg-[color:var(--card)] p-4 sm:grid-cols-2">
                  <fieldset
                    className={scheduleMode === "fixed" ? "sm:col-span-2" : ""}
                  >
                    <legend className="text-sm font-medium">
                      Tipo de calendario
                    </legend>
                    <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-[color:var(--surface-subtle)] p-1">
                      {[
                        { id: "fixed", label: "Semana fija" },
                        { id: "sequential_cycle", label: "Ciclo libre" },
                      ].map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => changeScheduleMode(option.id)}
                          className={`h-11 rounded-lg px-2 text-sm font-medium transition ${
                            scheduleMode === option.id
                              ? "theme-accent-solid"
                              : "text-[color:var(--text-muted)]"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-[color:var(--text-muted)]">
                      {scheduleMode === "fixed"
                        ? "La misma distribución se repite cada semana."
                        : "Las sesiones avanzan en orden, sin depender del día."}
                    </p>
                  </fieldset>
                  {scheduleMode !== "fixed" ? (
                    <fieldset>
                      <legend className="text-sm font-medium">
                        Duración del ciclo
                      </legend>
                      <div className="mt-3 flex h-[52px] items-center justify-between rounded-xl bg-[color:var(--surface-subtle)] px-1">
                        <button
                          type="button"
                          onClick={() => resizeCycle(-1)}
                          disabled={schedule.length <= 2}
                          className="grid h-11 w-11 place-items-center disabled:opacity-30"
                          aria-label="Quitar un día del ciclo"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <strong className="text-sm">
                          {schedule.length} días
                        </strong>
                        <button
                          type="button"
                          onClick={() => resizeCycle(1)}
                          disabled={schedule.length >= 28}
                          className="grid h-11 w-11 place-items-center disabled:opacity-30"
                          aria-label="Agregar un día al ciclo"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </fieldset>
                  ) : null}
                </div>

                {scheduleMode === "fixed" ? (
                  <fieldset>
                    <legend className="text-sm font-medium">
                      Entrenamientos por semana
                    </legend>
                    <div className="mt-3 grid grid-cols-4 gap-2 rounded-2xl bg-[color:var(--card)] p-2">
                      {[3, 4, 5, 6].map((frequency) => (
                        <button
                          key={frequency}
                          type="button"
                          onClick={() => applyFrequencyPreset(frequency)}
                          className={`h-11 rounded-xl text-sm font-medium ${
                            trainingDays === frequency
                              ? "theme-accent-solid"
                              : "text-[color:var(--text-muted)]"
                          }`}
                        >
                          {frequency} días
                        </button>
                      ))}
                    </div>
                  </fieldset>
                ) : null}

                <div className="flex items-end justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-medium">Días del plan</h2>
                    <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                      {trainingDays} entrenamientos ·{" "}
                      {schedule.length - trainingDays}{" "}
                      {schedule.length - trainingDays === 1
                        ? "día libre"
                        : "días libres"}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-[color:var(--text-muted)]">
                    {durationWeeks} semanas
                  </span>
                </div>

                <div className="divide-y divide-[color:var(--detail-row-divider)] overflow-hidden rounded-2xl bg-[color:var(--card)]">
                  {schedule.map((day, index) => (
                    <div
                      key={day.dayIndex}
                      className={`grid grid-cols-[88px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 px-4 py-3 ${
                        manageRoutinesSeparately
                          ? "sm:grid-cols-[92px_138px_minmax(0,1fr)]"
                          : "sm:grid-cols-[92px_138px_minmax(0,1fr)_minmax(0,1fr)]"
                      }`}
                    >
                      <span className="text-sm font-semibold">
                        {scheduleMode === "fixed"
                          ? DAY_NAMES[index]
                          : `Día ${index + 1}`}
                      </span>
                      <select
                        value={day.type}
                        onChange={(event) =>
                          updateDay(index, { type: event.target.value })
                        }
                        aria-label={`Tipo de ${scheduleMode === "fixed" ? DAY_NAMES[index] : `día ${index + 1}`}`}
                        className="h-10 rounded-xl border-0 bg-[color:var(--surface-subtle)] px-3 text-sm font-medium outline-none"
                      >
                        <option value="training">Entrenamiento</option>
                        <option value="recovery">Recuperación</option>
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
                            placeholder="Ej. Empuje"
                            aria-label={`Enfoque de ${scheduleMode === "fixed" ? DAY_NAMES[index] : `día ${index + 1}`}`}
                            className="col-span-2 h-10 min-w-0 rounded-xl border-0 bg-[color:var(--surface-subtle)] px-3 text-sm font-medium outline-none sm:col-span-1"
                          />
                          {!manageRoutinesSeparately ? (
                            <select
                              value={day.sourceRoutineId}
                              onChange={(event) =>
                                updateDay(index, {
                                  sourceRoutineId: event.target.value,
                                })
                              }
                              aria-label={`Rutina de ${scheduleMode === "fixed" ? DAY_NAMES[index] : `día ${index + 1}`}`}
                              className="col-span-2 h-10 min-w-0 rounded-xl border-0 bg-[color:var(--surface-subtle)] px-3 text-sm font-medium outline-none sm:col-span-1"
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
                        <p className="col-span-2 -mt-1 pl-[100px] text-xs font-medium text-[color:var(--text-muted)] sm:col-span-2 sm:mt-0 sm:pl-0">
                          {day.type === "rest"
                            ? "Día libre"
                            : "Movilidad o actividad ligera"}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {!manageRoutinesSeparately && missingRoutines ? (
                  <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p className="text-xs font-bold">
                      {templates.length
                        ? `Selecciona una rutina para ${missingRoutines} ${missingRoutines === 1 ? "día" : "días"}.`
                        : "Crea primero las rutinas que formarán parte de esta planificación."}
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <footer
          className={`shrink-0 border-t border-[color:var(--border)] bg-[color:var(--bg)] ${
            templatePickerOpen ? "hidden" : ""
          }`}
        >
          <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 p-4 sm:px-6">
            {templatePickerOpen ? (
              <Button
                variant="outline"
                className="h-12 rounded-full px-5"
                onClick={() => setTemplatePickerOpen(false)}
              >
                <ArrowLeft className="h-4 w-4" /> Volver
              </Button>
            ) : step === 1 ? (
              <button
                type="button"
                onClick={() => onCloseRef.current?.()}
                className="h-12 px-3 text-sm font-medium text-[color:var(--text-muted)]"
              >
                Cancelar
              </button>
            ) : (
              <Button
                variant="outline"
                className="h-12 rounded-full px-5"
                onClick={() => setStep(1)}
              >
                <ArrowLeft className="h-4 w-4" /> Anterior
              </Button>
            )}
            {templatePickerOpen ? (
              <span />
            ) : step === 1 ? (
              <Button
                className="h-12 min-w-40 rounded-full px-6"
                disabled={!name.trim() || !validDuration || !startDate}
                onClick={() => setStep(2)}
              >
                Continuar <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                className="h-12 min-w-40 rounded-full px-6"
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
          </div>
        </footer>
      </div>
    </div>
  );
}
