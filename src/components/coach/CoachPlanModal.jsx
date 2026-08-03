import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Bed,
  CalendarDays,
  Dumbbell,
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

const normalizeText = (value = "") =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const findTemplate = (focus, templates) => {
  const terms = {
    Empuje: ["empuje", "push"],
    Jale: ["jale", "traccion", "pull", "espalda"],
    Piernas: ["pierna", "lower"],
    "Tren superior": ["tren superior", "upper", "torso"],
    "Tren inferior": ["tren inferior", "lower", "pierna"],
    "Full body": ["full body", "cuerpo completo"],
  }[focus] || [normalizeText(focus)];
  return templates.find((routine) => {
    const name = normalizeText(routine.name);
    return terms.some((term) => name.includes(term));
  });
};

const createSchedule = (preset = PRESETS.ppl, templates = []) =>
  preset.map((focus, index) => ({
    dayIndex: index + 1,
    type:
      focus === "Descanso"
        ? "rest"
        : focus === "Recuperacion"
          ? "recovery"
          : "training",
    focus: focus === "Descanso" ? "" : focus,
    sourceRoutineId:
      focus === "Descanso" || focus === "Recuperacion"
        ? ""
        : findTemplate(focus, templates)?.id ||
          findTemplate(focus, templates)?._id ||
          "",
  }));

export default function CoachPlanModal({
  athlete,
  templates,
  initialData,
  replacingPlan,
  onSave,
  onClose,
}) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(initialData?._id || initialData?.id);
  const [name, setName] = useState(
    initialData?.name || "Plan inicial de 8 semanas",
  );
  const [level, setLevel] = useState(initialData?.level || "beginner");
  const [goal, setGoal] = useState(initialData?.goal || "Hipertrofia");
  const [durationWeeks, setDurationWeeks] = useState(
    initialData?.durationWeeks || 8,
  );
  const [startDate, setStartDate] = useState(
    initialData?.startDate ? String(initialData.startDate).slice(0, 10) : "",
  );
  const [strategy, setStrategy] = useState(
    initialData?.progression?.strategy || "double_progression",
  );
  const [deloadEveryWeeks, setDeloadEveryWeeks] = useState(
    initialData?.progression?.deloadEveryWeeks ?? 4,
  );
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [schedule, setSchedule] = useState(() =>
    initialData?.weeklySchedule?.length === 7
      ? initialData.weeklySchedule.map((day, index) => ({
          dayIndex: index + 1,
          type: day.type || "training",
          focus: day.focus || "",
          sourceRoutineId: day.sourceRoutineId || "",
        }))
      : createSchedule(PRESETS.ppl, templates),
  );

  const trainingDays = useMemo(
    () => schedule.filter((day) => day.type === "training").length,
    [schedule],
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

  const applyPreset = (preset) =>
    setSchedule(createSchedule(PRESETS[preset], templates));

  const submit = async () => {
    if (
      !name.trim() ||
      !validDuration ||
      !trainingDays ||
      missingRoutines ||
      saving
    )
      return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        level,
        goal,
        durationWeeks: Number(durationWeeks),
        startDate: startDate || null,
        weeklySchedule: schedule,
        progression: {
          strategy,
          deloadEveryWeeks: Number(deloadEveryWeeks),
        },
        notes: notes.trim(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end bg-black/55 sm:items-center sm:justify-center sm:p-4">
      <div className="flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-2xl sm:max-w-3xl sm:rounded-lg">
        <header className="flex items-start justify-between gap-3 border-b border-[color:var(--border)] p-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
              Paso {step} de 2 · {athlete.name}
            </p>
            <h2 className="mt-1 truncate text-xl font-black">
              {step === 1 ? "Estructura del plan" : "Semana de entrenamiento"}
            </h2>
            {!isEditing && replacingPlan ? (
              <p className="mt-1 truncate text-xs font-semibold text-[color:var(--text-muted)]">
                Al activarlo, {replacingPlan.name} quedara pausado.
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-[color:var(--border)]"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="overflow-y-auto p-4 sm:p-6">
          {step === 1 ? (
            <div className="space-y-5">
              <label className="block">
                <span className="text-xs font-black">Nombre del plan</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={100}
                  className="mt-2 h-11 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-sm font-semibold outline-none focus:border-blue-500"
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
                </label>
              </div>

              <div className="grid gap-4 border-y border-[color:var(--border)] py-5 sm:grid-cols-2">
                <label>
                  <span className="text-xs font-black">Progresion</span>
                  <select
                    value={strategy}
                    onChange={(event) => setStrategy(event.target.value)}
                    className="mt-2 h-11 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-sm font-semibold"
                  >
                    <option value="double_progression">Doble progresion</option>
                    <option value="linear">Carga lineal</option>
                    <option value="rpe">Autorregulacion por RPE</option>
                    <option value="custom">Personalizada</option>
                  </select>
                </label>
                <label>
                  <span className="text-xs font-black">Semana de descarga</span>
                  <select
                    value={deloadEveryWeeks}
                    onChange={(event) =>
                      setDeloadEveryWeeks(event.target.value)
                    }
                    className="mt-2 h-11 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-sm font-semibold"
                  >
                    <option value="0">Sin descarga programada</option>
                    <option value="3">Cada 3 semanas</option>
                    <option value="4">Cada 4 semanas</option>
                    <option value="6">Cada 6 semanas</option>
                    <option value="8">Cada 8 semanas</option>
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-black">Notas para el atleta</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  maxLength={1000}
                  rows={3}
                  placeholder="Indicaciones generales, restricciones o criterios para progresar"
                  className="mt-2 w-full resize-none rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] p-3 text-sm font-semibold outline-none focus:border-blue-500"
                />
              </label>
            </div>
          ) : (
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-xs font-black text-[color:var(--text-muted)]">
                  Empezar con
                </span>
                <button
                  type="button"
                  onClick={() => applyPreset("ppl")}
                  className="h-9 rounded-lg border border-blue-500 px-3 text-xs font-black text-blue-700 dark:text-blue-300"
                >
                  Empuje / Jale / Piernas
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("balanced")}
                  className="h-9 rounded-lg border border-[color:var(--border)] px-3 text-xs font-black"
                >
                  Equilibrado
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("beginner")}
                  className="h-9 rounded-lg border border-[color:var(--border)] px-3 text-xs font-black"
                >
                  Principiante 3 dias
                </button>
              </div>

              <div className="mt-4 divide-y divide-[color:var(--border)] border-y border-[color:var(--border)]">
                {schedule.map((day, index) => (
                  <div
                    key={day.dayIndex}
                    className="grid gap-2 py-3 sm:grid-cols-[92px_130px_minmax(0,1fr)_minmax(0,1fr)] sm:items-center"
                  >
                    <span className="text-sm font-black">
                      {DAY_NAMES[index]}
                    </span>
                    <select
                      value={day.type}
                      onChange={(event) =>
                        updateDay(index, { type: event.target.value })
                      }
                      aria-label={`Tipo de ${DAY_NAMES[index]}`}
                      className="h-10 rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-2 text-xs font-bold"
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
                          aria-label={`Enfoque de ${DAY_NAMES[index]}`}
                          className="h-10 min-w-0 rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-xs font-semibold"
                        />
                        <select
                          value={day.sourceRoutineId}
                          onChange={(event) =>
                            updateDay(index, {
                              sourceRoutineId: event.target.value,
                            })
                          }
                          aria-label={`Rutina de ${DAY_NAMES[index]}`}
                          className="h-10 min-w-0 rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-2 text-xs font-semibold"
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

              {missingRoutines ? (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p className="text-xs font-bold">
                    {templates.length
                      ? `Selecciona una rutina para ${missingRoutines} ${missingRoutines === 1 ? "dia" : "dias"}.`
                      : "Primero crea plantillas de rutina. Un plan activo no puede contener dias sin ejercicios definidos."}
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
          {step === 1 ? (
            <button
              type="button"
              onClick={onClose}
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
          {step === 1 ? (
            <Button
              className="h-11 rounded-lg"
              disabled={!name.trim() || !validDuration}
              onClick={() => setStep(2)}
            >
              Configurar semana <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              className="h-11 rounded-lg"
              disabled={!trainingDays || Boolean(missingRoutines) || saving}
              onClick={submit}
            >
              {saving
                ? "Guardando..."
                : isEditing
                  ? "Guardar cambios"
                  : "Crear y activar plan"}
            </Button>
          )}
        </footer>
      </div>
    </div>
  );
}
