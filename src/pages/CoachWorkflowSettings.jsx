import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Camera,
  Check,
  ClipboardCheck,
  Plus,
  Ruler,
  Save,
  Scale,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import OperationLoader from "../components/system/OperationLoader";
import { api } from "../services/api";

const TYPE_OPTIONS = [
  ["short_text", "Respuesta corta"],
  ["long_text", "Texto largo"],
  ["number", "Número"],
  ["single_choice", "Una opción"],
  ["multiple_choice", "Varias opciones"],
  ["yes_no", "Sí / No"],
];
const CADENCES = [
  ["workout_days", "Días de entrenamiento"],
  ["daily", "Todos los días"],
  ["weekly", "Una vez por semana"],
];
const DAY_OPTIONS = [
  [1, "Lunes"],
  [2, "Martes"],
  [3, "Miércoles"],
  [4, "Jueves"],
  [5, "Viernes"],
  [6, "Sábado"],
  [7, "Domingo"],
];
const FREQUENCY_UNITS = [
  ["day", "Días"],
  ["week", "Semanas"],
  ["month", "Meses"],
];
const METRIC_OPTIONS = [
  ["waist", "Cintura"],
  ["chest", "Pecho"],
  ["hips", "Cadera"],
  ["arm", "Brazo"],
  ["thigh", "Muslo"],
  ["calf", "Pantorrilla"],
];
const PHOTO_VIEW_OPTIONS = [
  ["front", "Frontal"],
  ["side", "Lateral"],
  ["back", "Posterior"],
  ["other", "Otra"],
];

const toggleListValue = (list, value) =>
  list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 rounded-full transition ${checked ? "bg-[#181918] dark:bg-[#e2ff00]" : "bg-[color:var(--surface-subtle)]"}`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${checked ? "left-6 dark:bg-black" : "left-1"}`}
      />
    </button>
  );
}

function CadenceCard({
  icon: Icon,
  title,
  description,
  enabled,
  onEnabled,
  children,
}) {
  return (
    <section className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--card)] p-5">
      <header className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[color:var(--surface-subtle)]">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-sans text-base font-semibold">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-[color:var(--text-muted)]">
            {description}
          </p>
        </div>
        <Toggle
          checked={enabled}
          onChange={onEnabled}
          label={`Activar ${title}`}
        />
      </header>
      {enabled ? (
        <div className="mt-4 border-t border-[color:var(--detail-row-divider)] pt-4">
          {children}
        </div>
      ) : null}
    </section>
  );
}

function RequiredControl({ checked, onChange }) {
  return (
    <label className="mt-4 flex items-center justify-between gap-4 rounded-xl bg-[color:var(--surface-subtle)] px-3 py-2.5 text-xs font-medium">
      Contar como tarea obligatoria
      <Toggle
        checked={checked}
        onChange={onChange}
        label="Marcar como obligatoria"
      />
    </label>
  );
}

function FrequencyControls({ value, onChange, withWeekday = false }) {
  const unit = value.frequencyUnit || "week";
  const interval = value.frequencyInterval || value.intervalWeeks || 1;
  return (
    <div
      className={`grid gap-3 ${withWeekday && unit === "week" ? "grid-cols-3" : "grid-cols-2"}`}
    >
      <label className="text-xs text-[color:var(--text-muted)]">
        Cada
        <input
          type="number"
          min="1"
          max="90"
          value={interval}
          onChange={(event) => {
            const frequencyInterval = Number(event.target.value);
            onChange({
              frequencyInterval,
              ...(unit === "week" ? { intervalWeeks: frequencyInterval } : {}),
            });
          }}
          className="mt-1 h-11 w-full rounded-xl bg-[color:var(--surface-subtle)] px-3 text-sm text-[color:var(--text)]"
        />
      </label>
      <label className="text-xs text-[color:var(--text-muted)]">
        Periodo
        <select
          value={unit}
          onChange={(event) => {
            const frequencyUnit = event.target.value;
            onChange({
              frequencyUnit,
              ...(frequencyUnit === "week"
                ? { intervalWeeks: Math.min(12, Number(interval)) }
                : {}),
            });
          }}
          className="mt-1 h-11 w-full rounded-xl bg-[color:var(--surface-subtle)] px-3 text-sm text-[color:var(--text)]"
        >
          {FREQUENCY_UNITS.map(([itemValue, label]) => (
            <option key={itemValue} value={itemValue}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {withWeekday && unit === "week" ? (
        <label className="text-xs text-[color:var(--text-muted)]">
          Día
          <select
            value={value.weekday || 1}
            onChange={(event) =>
              onChange({ weekday: Number(event.target.value) })
            }
            className="mt-1 h-11 w-full rounded-xl bg-[color:var(--surface-subtle)] px-2 text-sm text-[color:var(--text)]"
          >
            {DAY_OPTIONS.map(([itemValue, label]) => (
              <option key={itemValue} value={itemValue}>
                {label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}

export default function CoachWorkflowSettings({ onBack, onNavigate }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("evaluation");

  useEffect(() => {
    let active = true;
    api
      .getCoachWorkflowSettings()
      .then((data) => active && setSettings(data))
      .catch((error) =>
        toast.error(error.message || "No se pudo cargar la configuración"),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const enabledQuestions = useMemo(
    () =>
      settings?.intakeQuestions?.filter((question) => question.enabled)
        .length || 0,
    [settings],
  );

  const updateQuestion = (index, changes) =>
    setSettings((current) => ({
      ...current,
      intakeQuestions: current.intakeQuestions.map((question, questionIndex) =>
        questionIndex === index ? { ...question, ...changes } : question,
      ),
    }));

  const moveQuestion = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= settings.intakeQuestions.length) return;
    setSettings((current) => {
      const questions = [...current.intakeQuestions];
      [questions[index], questions[nextIndex]] = [
        questions[nextIndex],
        questions[index],
      ];
      return { ...current, intakeQuestions: questions };
    });
  };

  const addQuestion = () =>
    setSettings((current) => ({
      ...current,
      intakeQuestions: [
        ...current.intakeQuestions,
        {
          key: `custom_${Date.now().toString(36)}`,
          label: "",
          type: "long_text",
          required: false,
          enabled: true,
          options: [],
        },
      ],
    }));

  const updateFollowUp = (section, changes) =>
    setSettings((current) => ({
      ...current,
      followUp: {
        ...current.followUp,
        [section]: { ...current.followUp[section], ...changes },
      },
    }));

  const save = async () => {
    if (saving) return;
    const empty = settings.intakeQuestions.find(
      (question) => !question.label.trim(),
    );
    if (empty) {
      toast.error("Completa el texto de todas las preguntas");
      setTab("evaluation");
      return;
    }
    try {
      setSaving(true);
      const saved = await api.updateCoachWorkflowSettings({
        intakeQuestions: settings.intakeQuestions,
        followUp: settings.followUp,
      });
      setSettings(saved);
      toast.success("Protocolo de seguimiento guardado");
    } catch (error) {
      toast.error(error.message || "No se pudo guardar la configuración");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <OperationLoader
        active
        delayMs={0}
        mode="inline"
        title="Cargando protocolo"
      />
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl pb-28 text-[color:var(--text)]">
      <header className="sticky top-0 z-20 flex min-h-16 items-center border-b border-[color:var(--border)] bg-[color:var(--bg)]/95 px-2 backdrop-blur md:px-0">
        <button
          type="button"
          onClick={() => (onBack ? onBack() : onNavigate?.("perfil"))}
          className="grid h-11 w-11 place-items-center rounded-full"
          aria-label="Volver"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <h1 className="font-sans text-lg font-semibold">
            Evaluaciones y seguimiento
          </h1>
          <p className="text-[11px] text-[color:var(--text-muted)]">
            Configuración predeterminada
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="grid h-11 w-11 place-items-center rounded-full disabled:opacity-40"
          aria-label="Guardar"
        >
          <Save className="h-5 w-5" />
        </button>
      </header>

      <div className="px-3 pt-5 md:px-0">
        <div className="grid grid-cols-2 rounded-full bg-[color:var(--surface-subtle)] p-1">
          {[
            ["evaluation", `Evaluación · ${enabledQuestions}`],
            ["follow_up", "Seguimiento"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`h-11 rounded-full text-sm font-semibold ${tab === id ? "bg-[#181918] text-white shadow-sm dark:bg-[#e2ff00] dark:text-black" : "text-[color:var(--text-muted)]"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "evaluation" ? (
          <div className="mt-6 space-y-4">
            <header>
              <h2 className="text-2xl font-semibold tracking-[-0.04em]">
                Formulario inicial
              </h2>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                Se mostrará al alumno después de aceptar tu invitación.
                Objetivo, experiencia, frecuencia, peso y altura permanecen como
                datos base.
              </p>
            </header>
            {settings.intakeQuestions.map((question, index) => (
              <article
                key={question.key}
                className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--card)] p-4"
              >
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-[color:var(--surface-subtle)] text-xs font-semibold">
                    {index + 1}
                  </span>
                  <input
                    value={question.label}
                    onChange={(event) =>
                      updateQuestion(index, { label: event.target.value })
                    }
                    maxLength={180}
                    placeholder="Escribe la pregunta"
                    className="min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold outline-none"
                  />
                  <Toggle
                    checked={question.enabled}
                    onChange={(enabled) => updateQuestion(index, { enabled })}
                    label="Mostrar pregunta"
                  />
                </div>
                <div className="mt-4 grid grid-cols-[1fr_auto_auto] items-center gap-2 border-t border-[color:var(--detail-row-divider)] pt-3">
                  <select
                    value={question.type}
                    onChange={(event) =>
                      updateQuestion(index, {
                        type: event.target.value,
                        options: ["single_choice", "multiple_choice"].includes(
                          event.target.value,
                        )
                          ? question.options
                          : [],
                      })
                    }
                    className="h-10 min-w-0 rounded-xl bg-[color:var(--surface-subtle)] px-3 text-xs font-medium outline-none"
                  >
                    {TYPE_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={question.required}
                      onChange={(event) =>
                        updateQuestion(index, {
                          required: event.target.checked,
                        })
                      }
                    />{" "}
                    Obligatoria
                  </label>
                  <div className="flex">
                    <button
                      type="button"
                      onClick={() => moveQuestion(index, -1)}
                      disabled={!index}
                      className="grid h-9 w-8 place-items-center disabled:opacity-25"
                      aria-label="Subir pregunta"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveQuestion(index, 1)}
                      disabled={index === settings.intakeQuestions.length - 1}
                      className="grid h-9 w-8 place-items-center disabled:opacity-25"
                      aria-label="Bajar pregunta"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSettings((current) => ({
                          ...current,
                          intakeQuestions: current.intakeQuestions.filter(
                            (_, itemIndex) => itemIndex !== index,
                          ),
                        }))
                      }
                      className="grid h-9 w-8 place-items-center text-red-500"
                      aria-label="Eliminar pregunta"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {["single_choice", "multiple_choice"].includes(
                  question.type,
                ) ? (
                  <label className="mt-3 block text-xs font-medium text-[color:var(--text-muted)]">
                    Opciones separadas por coma
                    <input
                      value={(question.options || []).join(", ")}
                      onChange={(event) =>
                        updateQuestion(index, {
                          options: event.target.value
                            .split(",")
                            .map((option) => option.trim())
                            .filter(Boolean),
                        })
                      }
                      className="mt-2 h-10 w-full rounded-xl bg-[color:var(--surface-subtle)] px-3 text-[color:var(--text)] outline-none"
                    />
                  </label>
                ) : null}
              </article>
            ))}
            <button
              type="button"
              onClick={addQuestion}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-[20px] border border-dashed border-[color:var(--border)] text-sm font-semibold"
            >
              <Plus className="h-5 w-5" /> Añadir pregunta
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <header>
              <h2 className="text-2xl font-semibold tracking-[-0.04em]">
                Protocolo recurrente
              </h2>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                Estas reglas crearán las misiones del alumno. Podrás
                reemplazarlas al crear cada plan.
              </p>
            </header>
            <CadenceCard
              icon={ClipboardCheck}
              title="Check-in de bienestar"
              description="Sueño, energía, estrés, motivación y dolor."
              enabled={settings.followUp.checkIn.enabled}
              onEnabled={(enabled) => updateFollowUp("checkIn", { enabled })}
            >
              <select
                value={settings.followUp.checkIn.cadence}
                onChange={(event) =>
                  updateFollowUp("checkIn", { cadence: event.target.value })
                }
                className="h-11 w-full rounded-xl bg-[color:var(--surface-subtle)] px-3 text-sm outline-none"
              >
                {CADENCES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {settings.followUp.checkIn.cadence === "weekly" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {DAY_OPTIONS.map(([value, label]) => {
                    const selected =
                      settings.followUp.checkIn.weekdays?.includes(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          updateFollowUp("checkIn", {
                            weekdays: [value],
                          })
                        }
                        className={`rounded-full px-3 py-2 text-xs font-semibold ${selected ? "bg-[#181918] text-white dark:bg-[#e2ff00] dark:text-black" : "bg-[color:var(--surface-subtle)]"}`}
                      >
                        {label.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </CadenceCard>
            <CadenceCard
              icon={Scale}
              title="Peso"
              description="Registro periódico del peso corporal."
              enabled={settings.followUp.weight.enabled}
              onEnabled={(enabled) => updateFollowUp("weight", { enabled })}
            >
              <FrequencyControls
                value={settings.followUp.weight}
                withWeekday
                onChange={(changes) => updateFollowUp("weight", changes)}
              />
              <RequiredControl
                checked={settings.followUp.weight.required}
                onChange={(required) => updateFollowUp("weight", { required })}
              />
            </CadenceCard>
            <CadenceCard
              icon={Camera}
              title="Fotos de progreso"
              description="Vistas frontal, lateral y posterior con consentimiento."
              enabled={settings.followUp.photos.enabled}
              onEnabled={(enabled) => updateFollowUp("photos", { enabled })}
            >
              <FrequencyControls
                value={settings.followUp.photos}
                onChange={(changes) => updateFollowUp("photos", changes)}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {PHOTO_VIEW_OPTIONS.map(([value, label]) => {
                  const selected =
                    settings.followUp.photos.views.includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        updateFollowUp("photos", {
                          views: toggleListValue(
                            settings.followUp.photos.views,
                            value,
                          ),
                        })
                      }
                      className={`rounded-full px-3 py-2 text-xs font-semibold ${selected ? "bg-[#181918] text-white dark:bg-[#e2ff00] dark:text-black" : "bg-[color:var(--surface-subtle)]"}`}
                    >
                      {selected ? (
                        <Check className="mr-1 inline h-3 w-3" />
                      ) : null}
                      {label}
                    </button>
                  );
                })}
              </div>
              <RequiredControl
                checked={settings.followUp.photos.required}
                onChange={(required) => updateFollowUp("photos", { required })}
              />
            </CadenceCard>
            <CadenceCard
              icon={Ruler}
              title="Medidas corporales"
              description="Elige las métricas necesarias para el objetivo."
              enabled={settings.followUp.measurements.enabled}
              onEnabled={(enabled) =>
                updateFollowUp("measurements", { enabled })
              }
            >
              <div className="flex flex-wrap gap-2">
                {METRIC_OPTIONS.map(([value, label]) => {
                  const selected =
                    settings.followUp.measurements.fields.includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        updateFollowUp("measurements", {
                          fields: toggleListValue(
                            settings.followUp.measurements.fields,
                            value,
                          ),
                        })
                      }
                      className={`rounded-full px-3 py-2 text-xs font-semibold ${selected ? "bg-[#181918] text-white dark:bg-[#e2ff00] dark:text-black" : "bg-[color:var(--surface-subtle)]"}`}
                    >
                      {selected ? (
                        <Check className="mr-1 inline h-3 w-3" />
                      ) : null}
                      {label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3">
                <FrequencyControls
                  value={settings.followUp.measurements}
                  onChange={(changes) =>
                    updateFollowUp("measurements", changes)
                  }
                />
              </div>
              <RequiredControl
                checked={settings.followUp.measurements.required}
                onChange={(required) =>
                  updateFollowUp("measurements", { required })
                }
              />
            </CadenceCard>
            <CadenceCard
              icon={ClipboardCheck}
              title="Revisión del plan"
              description="Aviso para revisar resultados antes de programar el siguiente bloque."
              enabled={settings.followUp.review.enabled}
              onEnabled={(enabled) => updateFollowUp("review", { enabled })}
            >
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-[color:var(--text-muted)]">
                  Cada semanas
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={settings.followUp.review.intervalWeeks}
                    onChange={(event) =>
                      updateFollowUp("review", {
                        intervalWeeks: Number(event.target.value),
                      })
                    }
                    className="mt-1 h-11 w-full rounded-xl bg-[color:var(--surface-subtle)] px-3 text-sm text-[color:var(--text)]"
                  />
                </label>
                <label className="text-xs text-[color:var(--text-muted)]">
                  Avisar antes
                  <input
                    type="number"
                    min="0"
                    max="14"
                    value={settings.followUp.review.leadDays}
                    onChange={(event) =>
                      updateFollowUp("review", {
                        leadDays: Number(event.target.value),
                      })
                    }
                    className="mt-1 h-11 w-full rounded-xl bg-[color:var(--surface-subtle)] px-3 text-sm text-[color:var(--text)]"
                  />
                </label>
              </div>
            </CadenceCard>
            <CadenceCard
              icon={ClipboardCheck}
              title="Evaluación final"
              description="Se solicita al terminar el bloque, antes de activar el siguiente."
              enabled={settings.followUp.finalEvaluation.enabled}
              onEnabled={(enabled) =>
                updateFollowUp("finalEvaluation", { enabled })
              }
            >
              <p className="text-xs leading-5 text-[color:var(--text-muted)]">
                El plan no se reemplazará automáticamente. Recibirás el aviso y
                decidirás cuándo activar el siguiente.
              </p>
            </CadenceCard>
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[color:var(--border)] bg-[color:var(--bg)]/95 p-3 backdrop-blur md:sticky md:mt-8 md:rounded-[24px] md:border">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="mx-auto flex h-12 w-full max-w-3xl items-center justify-center gap-2 rounded-full bg-[#181918] text-sm font-semibold text-white disabled:opacity-50 dark:bg-[#e2ff00] dark:text-black"
        >
          <Save className="h-4 w-4" />
          {saving ? "Guardando..." : "Guardar configuración"}
        </button>
      </div>
    </main>
  );
}
