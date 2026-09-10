import { useEffect, useMemo, useRef, useState } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  ChevronDown,
  ClipboardCheck,
  FileText,
  GripVertical,
  HeartPulse,
  Info,
  MoreVertical,
  Eye,
  Plus,
  Ruler,
  Save,
  Scale,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import Modal from "../components/shared/Modal";
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
  ["workout_days", "En días de entrenamiento"],
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
  ["day", "días"],
  ["week", "semanas"],
  ["month", "meses"],
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

const fieldClass =
  "mt-2 h-12 w-full rounded-xl border border-[color:var(--detail-module-border)] bg-[color:var(--bg)] px-3.5 text-sm text-[color:var(--text)] outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--focus-ring)]";

const toggleListValue = (list = [], value) =>
  list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];

const frequencySummary = (value, withWeekday = false) => {
  const unit = value.frequencyUnit || "week";
  const interval = Number(value.frequencyInterval || value.intervalWeeks || 1);
  const labels = {
    day: interval === 1 ? "día" : "días",
    week: interval === 1 ? "semana" : "semanas",
    month: interval === 1 ? "mes" : "meses",
  };
  const weekday = DAY_OPTIONS.find(([id]) => id === Number(value.weekday))?.[1];
  const base =
    interval === 1
      ? `Cada ${labels[unit]}`
      : `Cada ${interval} ${labels[unit]}`;
  return withWeekday && unit === "week" && weekday
    ? `${base} · ${weekday}`
    : base;
};

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] ${checked ? "border-[color:var(--accent)] bg-[color:var(--accent)]" : "border-[color:var(--border-strong)] bg-[color:var(--surface-subtle)]"}`}
    >
      <span
        className={`absolute top-[3px] h-5 w-5 rounded-full shadow-sm transition-all ${checked ? "left-[23px] bg-[color:var(--accent-contrast)]" : "left-[3px] bg-[color:var(--text-subtle)]"}`}
      />
    </button>
  );
}

function OptionChip({ selected, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] ${selected ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--accent-contrast)]" : "border-[color:var(--detail-module-border)] bg-[color:var(--bg)] text-[color:var(--text-muted)] hover:border-[color:var(--border-strong)]"}`}
    >
      {selected ? <Check className="h-3.5 w-3.5" /> : null}
      {children}
    </button>
  );
}

function OptionPicker({ value, options, onChange, label, compact = false }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const selectedLabel =
    options.find(([optionValue]) => optionValue === value)?.[1] ||
    "Seleccionar";

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={`relative ${compact ? "w-fit" : ""}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex items-center justify-between text-left text-xs outline-none transition hover:border-[color:var(--border-strong)] focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] ${compact ? "h-7 max-w-[148px] gap-1.5 rounded-md border-0 bg-[color:var(--surface-subtle)] px-2 text-[color:var(--text-muted)]" : "h-10 w-full gap-3 rounded-xl border border-[color:var(--detail-module-border)] bg-[color:var(--bg)] px-3 text-[color:var(--text)]"}`}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[color:var(--text-muted)] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label={label}
          className="overflow-menu-panel absolute left-0 top-[calc(100%+0.4rem)] z-50 max-h-72 w-[220px] overflow-y-auto"
        >
          {options.map(([optionValue, optionLabel]) => {
            const selected = optionValue === value;
            return (
              <button
                key={optionValue}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  onChange(optionValue);
                  setOpen(false);
                }}
                className={`flex min-h-10 w-full items-center justify-between gap-3 px-3 text-left ${selected ? "bg-[color:var(--surface-subtle)] text-[color:var(--text)]" : "text-[color:var(--text-muted)]"}`}
              >
                <span>{optionLabel}</span>
                {selected ? <Check className="h-4 w-4" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function QuestionActions({ enabled, onEnabled, onDelete, index }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={`Opciones de la pregunta ${index + 1}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="grid h-10 w-8 place-items-center rounded-lg text-[color:var(--text-muted)] hover:bg-[color:var(--surface-subtle)]"
      >
        <MoreVertical className="h-[18px] w-[18px]" />
      </button>
      {open ? (
        <div
          role="menu"
          className="overflow-menu-panel absolute right-0 top-10 z-50 w-52"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onEnabled(!enabled);
              setOpen(false);
            }}
            className="flex w-full items-center justify-between gap-3 px-3 text-sm"
          >
            {enabled ? "Ocultar pregunta" : "Mostrar pregunta"}
            <span className="text-xs text-[color:var(--text-subtle)]">
              {enabled ? "Activa" : "Oculta"}
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onDelete();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-3 text-sm text-[color:var(--danger)]"
          >
            <Trash2 className="h-4 w-4" /> Eliminar
          </button>
        </div>
      ) : null}
    </div>
  );
}

function RequiredControl({ checked, onChange }) {
  return (
    <div className="mt-3 flex items-center justify-between gap-4 border-t border-[color:var(--detail-row-divider)] pt-3">
      <div>
        <p className="text-sm font-semibold text-[color:var(--text)]">
          Tarea obligatoria
        </p>
        <p className="mt-0.5 text-xs text-[color:var(--text-muted)]">
          El alumno deberá completarla para cerrar el día.
        </p>
      </div>
      <Toggle
        checked={checked}
        onChange={onChange}
        label="Marcar como tarea obligatoria"
      />
    </div>
  );
}

function FrequencyControls({ value, onChange, withWeekday = false }) {
  const unit = value.frequencyUnit || "week";
  const interval = value.frequencyInterval || value.intervalWeeks || 1;
  return (
    <div
      className={`grid gap-2 ${withWeekday && unit === "week" ? "grid-cols-[0.65fr_0.9fr_1.15fr]" : "grid-cols-2"}`}
    >
      <label className="text-xs font-medium text-[color:var(--text-muted)]">
        Repetir cada
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
          className={fieldClass}
        />
      </label>
      <label className="text-xs font-medium text-[color:var(--text-muted)]">
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
          className={fieldClass}
        >
          {FREQUENCY_UNITS.map(([itemValue, label]) => (
            <option key={itemValue} value={itemValue}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {withWeekday && unit === "week" ? (
        <label className="text-xs font-medium text-[color:var(--text-muted)]">
          Día de registro
          <select
            value={value.weekday || 1}
            onChange={(event) =>
              onChange({ weekday: Number(event.target.value) })
            }
            className={fieldClass}
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

function FollowUpCard({
  icon: Icon,
  title,
  description,
  summary,
  enabled,
  onEnabled,
  children,
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section
      className={`border-b border-[color:var(--detail-row-divider)] py-1 transition-colors last:border-b-0 ${enabled ? "" : "opacity-60"}`}
    >
      <header className="flex items-center gap-2 py-2.5">
        <button
          type="button"
          onClick={() => enabled && setExpanded((current) => !current)}
          disabled={!enabled}
          aria-expanded={enabled ? expanded : false}
          className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default"
        >
          <span
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${enabled ? "bg-[color:var(--accent)] text-[color:var(--accent-contrast)]" : "bg-[color:var(--surface-subtle)] text-[color:var(--text-muted)]"}`}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold tracking-[-0.015em]">
              {title}
            </span>
            <span className="mt-0.5 block truncate text-xs leading-4 text-[color:var(--text-muted)]">
              {enabled ? summary : description}
            </span>
          </span>
          {enabled ? (
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-[color:var(--text-muted)] transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          ) : null}
        </button>
        <Toggle
          checked={enabled}
          onChange={onEnabled}
          label={`Activar ${title}`}
        />
      </header>
      {enabled && expanded ? (
        <div className="mb-3 ml-12 pr-1">{children}</div>
      ) : null}
    </section>
  );
}

function QuestionCard({ question, index, onChange, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.key });
  const choiceQuestion = ["single_choice", "multiple_choice"].includes(
    question.type,
  );
  const typeLabel =
    TYPE_OPTIONS.find(([value]) => value === question.type)?.[1] ||
    "Seleccionar";

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 20 : undefined,
      }}
      className={`relative rounded-[1.75rem] border border-[color:var(--detail-module-border)] bg-[color:var(--card)] shadow-sm transition ${isDragging ? "z-20 opacity-90 shadow-lg" : ""}`}
    >
      <div className="flex items-start gap-2 p-4">
        <button
          type="button"
          {...attributes}
          {...listeners}
          title="Arrastrar para ordenar"
          className="grid h-10 w-8 shrink-0 touch-none cursor-grab place-items-center rounded-lg text-[color:var(--text-muted)] hover:bg-[color:var(--surface-subtle)] active:cursor-grabbing"
          aria-label={`Arrastrar pregunta ${index + 1} para ordenar`}
        >
          <GripVertical className="h-[18px] w-[18px]" />
        </button>
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[color:var(--accent)] bg-[color:var(--accent)] text-sm font-bold text-[color:var(--accent-contrast)]">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold leading-5 text-[color:var(--text)]">
              {question.label || "Pregunta sin título"}
            </span>
            <span className="mt-1.5 block text-xs text-[color:var(--text-muted)]">
              {question.required ? "Obligatoria" : "Opcional"}
              <span className="mx-2 text-[color:var(--text-subtle)]">·</span>
              {typeLabel}
            </span>
          </span>
          <ChevronDown
            className={`mt-2 h-5 w-5 shrink-0 text-[color:var(--text-muted)] transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {expanded ? (
        <div className="border-t border-[color:var(--detail-row-divider)] p-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
              Pregunta
            </span>
            <textarea
              value={question.label}
              onChange={(event) => onChange({ label: event.target.value })}
              maxLength={180}
              rows={3}
              placeholder="Escribe la pregunta"
              aria-label={`Texto de la pregunta ${index + 1}`}
              className="mt-2 w-full resize-none rounded-2xl border border-[color:var(--detail-module-border)] bg-[color:var(--surface-subtle)] p-3 text-sm leading-5 text-[color:var(--text)] outline-none focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--focus-ring)]"
            />
          </label>

          <fieldset className="mt-5">
            <legend className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
              Tipo de respuesta
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {TYPE_OPTIONS.map(([value, label]) => {
                const selected = question.type === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      onChange({
                        type: value,
                        options: ["single_choice", "multiple_choice"].includes(
                          value,
                        )
                          ? question.options
                          : [],
                      })
                    }
                    className={`min-h-10 rounded-full border px-4 text-sm font-medium transition ${selected ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--accent-contrast)]" : "border-[color:var(--detail-module-border)] bg-[color:var(--bg)] text-[color:var(--text-muted)]"}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {choiceQuestion ? (
            <label className="mt-4 block">
              <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                Opciones
              </span>
              <input
                value={(question.options || []).join(", ")}
                onChange={(event) =>
                  onChange({
                    options: event.target.value
                      .split(",")
                      .map((option) => option.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="Ej. Sí, No, A veces"
                className="mt-2 h-11 w-full rounded-xl border border-[color:var(--detail-module-border)] bg-[color:var(--bg)] px-3 text-sm text-[color:var(--text)] outline-none"
              />
            </label>
          ) : null}

          <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl bg-[color:var(--surface-subtle)] p-4">
            <div>
              <p className="text-sm font-semibold text-[color:var(--text)]">
                Obligatoria
              </p>
              <p className="mt-0.5 text-xs text-[color:var(--text-muted)]">
                El atleta no puede saltársela
              </p>
            </div>
            <Toggle
              checked={question.required}
              onChange={(required) => onChange({ required })}
              label={`Marcar pregunta ${index + 1} como obligatoria`}
            />
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onDelete}
              className="flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-[color:var(--danger)] hover:bg-[color:var(--danger-soft)]"
            >
              <Trash2 className="h-4 w-4" /> Eliminar
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function PreviewQuestion({ question, answer, onAnswer }) {
  const options = question.options?.length
    ? question.options
    : ["Opción 1", "Opción 2"];
  const typeLabels = {
    short_text: "Respuesta abierta",
    long_text: "Respuesta abierta de varias líneas",
    number: "Respuesta numérica",
    single_choice: "Elige una opción",
    multiple_choice: "Elige una o varias",
    yes_no: "Decisión binaria",
  };
  const fieldClass =
    "w-full rounded-[1.5rem] border border-[color:var(--detail-module-border)] bg-[color:var(--card)] px-4 text-base text-[color:var(--text)] outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--focus-ring)]";

  return (
    <fieldset>
      <legend className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
        {typeLabels[question.type] || "Respuesta"}
      </legend>
      <h4 className="mt-4 font-serif text-[clamp(1.8rem,7vw,2.35rem)] font-semibold leading-[1.08] tracking-[-0.025em] text-[color:var(--text)]">
        {question.label}
      </h4>

      {question.type === "long_text" ? (
        <textarea
          value={answer || ""}
          onChange={(event) => onAnswer(event.target.value)}
          rows={6}
          placeholder="Escribe tu respuesta..."
          className={`${fieldClass} mt-7 resize-none py-4`}
        />
      ) : null}
      {question.type === "short_text" ? (
        <input
          type="text"
          value={answer || ""}
          onChange={(event) => onAnswer(event.target.value)}
          placeholder="Escribe tu respuesta..."
          className={`${fieldClass} mt-7 h-16`}
        />
      ) : null}
      {question.type === "number" ? (
        <input
          type="number"
          value={answer || ""}
          onChange={(event) => onAnswer(event.target.value)}
          placeholder="Ingresa un número"
          className={`${fieldClass} mt-7 h-20 text-center font-serif text-3xl`}
        />
      ) : null}
      {question.type === "yes_no" ? (
        <div className="mt-7">
          <div className="grid grid-cols-2 gap-3">
            {["Sí", "No"].map((option) => {
              const selected = answer?.value === option;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onAnswer({ value: option, detail: "" })}
                  className={`h-20 rounded-[1.5rem] border text-lg font-semibold transition ${selected ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--accent-contrast)]" : "border-[color:var(--detail-module-border)] bg-[color:var(--card)] text-[color:var(--text)]"}`}
                >
                  {option}
                </button>
              );
            })}
          </div>
          {answer?.value === "Sí" ? (
            <label className="mt-5 block">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                ¿Cuál? <span className="normal-case">(opcional)</span>
              </span>
              <input
                type="text"
                value={answer.detail || ""}
                onChange={(event) =>
                  onAnswer({ ...answer, detail: event.target.value })
                }
                placeholder="Cuéntanos cuál..."
                className={`${fieldClass} mt-2 h-14`}
              />
            </label>
          ) : null}
        </div>
      ) : null}
      {question.type === "single_choice" ? (
        <div className="mt-7 grid gap-3">
          {options.map((option) => {
            const selected = answer === option;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={selected}
                onClick={() => onAnswer(option)}
                className={`min-h-14 rounded-[1.5rem] border px-5 text-left text-base font-medium transition ${selected ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--accent-contrast)]" : "border-[color:var(--detail-module-border)] bg-[color:var(--card)] text-[color:var(--text)]"}`}
              >
                {option}
              </button>
            );
          })}
        </div>
      ) : null}
      {question.type === "multiple_choice" ? (
        <div className="mt-7 grid gap-3">
          {options.map((option) => {
            const selected = Array.isArray(answer) && answer.includes(option);
            return (
              <button
                key={option}
                type="button"
                aria-pressed={selected}
                onClick={() =>
                  onAnswer(
                    selected
                      ? answer.filter((item) => item !== option)
                      : [...(Array.isArray(answer) ? answer : []), option],
                  )
                }
                className={`flex min-h-14 items-center justify-between rounded-[1.5rem] border px-5 text-left text-base font-medium transition ${selected ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--accent-contrast)]" : "border-[color:var(--detail-module-border)] bg-[color:var(--card)] text-[color:var(--text)]"}`}
              >
                {option}
                {selected ? <Check className="h-5 w-5" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </fieldset>
  );
}

function WorkflowPreview({ questions, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const question = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const goBack = () => {
    if (currentIndex === 0) onClose();
    else setCurrentIndex((current) => current - 1);
  };

  const goForward = () => {
    if (currentIndex === questions.length - 1) onClose();
    else setCurrentIndex((current) => current + 1);
  };

  if (!question) return null;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        goForward();
      }}
      className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col bg-[color:var(--surface-subtle)] sm:min-h-[680px]"
    >
      <div className="px-5 pt-5">
        <div className="flex items-center justify-between gap-4 text-xs font-medium uppercase tracking-wide">
          <span className="text-[color:var(--text-muted)]">
            Pregunta {currentIndex + 1} de {questions.length}
          </span>
          <span className="normal-case tracking-normal text-[color:var(--text)]">
            {question.required ? "Obligatoria" : "Opcional"}
          </span>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-[color:var(--detail-row-divider)]">
          <div
            className="h-full rounded-full bg-[color:var(--accent)] transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex-1 px-5 pb-8 pt-8">
        <PreviewQuestion
          question={question}
          answer={answers[question.key]}
          onAnswer={(answer) =>
            setAnswers((current) => ({
              ...current,
              [question.key]: answer,
            }))
          }
        />
      </div>

      <div className="sticky bottom-0 border-t border-[color:var(--detail-row-divider)] bg-[color:var(--surface-subtle)]/95 px-5 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-[color:var(--detail-module-border)] bg-[color:var(--card)]"
            aria-label={currentIndex === 0 ? "Cerrar vista previa" : "Anterior"}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            type="submit"
            className="theme-accent-solid flex h-14 flex-1 items-center justify-center gap-3 rounded-full text-base font-semibold"
          >
            {currentIndex === questions.length - 1 ? "Finalizar" : "Continuar"}
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
        {!question.required ? (
          <button
            type="button"
            onClick={goForward}
            className="mt-3 w-full text-center text-sm text-[color:var(--text-muted)]"
          >
            Saltar
          </button>
        ) : null}
      </div>
    </form>
  );
}

export default function CoachWorkflowSettings({ onBack, onNavigate }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("evaluation");
  const [previewOpen, setPreviewOpen] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 120, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    let active = true;
    api
      .getCoachWorkflowSettings()
      .then(
        (data) =>
          active &&
          setSettings({
            ...data,
            intakeQuestions: data.intakeQuestions.map((question) => ({
              ...question,
              enabled: true,
            })),
          }),
      )
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
  const enabledFollowUps = useMemo(
    () =>
      settings?.followUp
        ? Object.values(settings.followUp).filter((item) => item.enabled).length
        : 0,
    [settings],
  );

  const updateQuestion = (index, changes) =>
    setSettings((current) => ({
      ...current,
      intakeQuestions: current.intakeQuestions.map((question, questionIndex) =>
        questionIndex === index ? { ...question, ...changes } : question,
      ),
    }));

  const handleQuestionDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    setSettings((current) => {
      const oldIndex = current.intakeQuestions.findIndex(
        (question) => question.key === active.id,
      );
      const newIndex = current.intakeQuestions.findIndex(
        (question) => question.key === over.id,
      );
      if (oldIndex < 0 || newIndex < 0) return current;
      return {
        ...current,
        intakeQuestions: arrayMove(current.intakeQuestions, oldIndex, newIndex),
      };
    });
  };

  const addQuestion = () => {
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
    window.requestAnimationFrame(() =>
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }),
    );
  };

  const removeQuestion = (index) => {
    if (settings.intakeQuestions.length === 1) {
      toast.error("El formulario debe conservar al menos una pregunta");
      return;
    }
    setSettings((current) => ({
      ...current,
      intakeQuestions: current.intakeQuestions.filter(
        (_, questionIndex) => questionIndex !== index,
      ),
    }));
  };

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
      toast.error("Escribe el texto de todas las preguntas");
      setTab("evaluation");
      return;
    }
    const incompleteChoice = settings.intakeQuestions.find(
      (question) =>
        question.enabled &&
        ["single_choice", "multiple_choice"].includes(question.type) &&
        (question.options || []).length < 2,
    );
    if (incompleteChoice) {
      toast.error(`Añade al menos dos opciones en “${incompleteChoice.label}”`);
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
      toast.success("Evaluación y seguimiento guardados");
    } catch (error) {
      toast.error(error.message || "No se pudo guardar la configuración");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings)
    return (
      <OperationLoader
        active
        delayMs={0}
        mode="inline"
        title="Preparando evaluaciones"
      />
    );

  const checkInSummary =
    settings.followUp.checkIn.cadence === "weekly"
      ? `Una vez por semana · ${DAY_OPTIONS.find(([id]) => id === Number(settings.followUp.checkIn.weekdays?.[0]))?.[1] || "elige un día"}`
      : CADENCES.find(
          ([value]) => value === settings.followUp.checkIn.cadence,
        )?.[1];

  return (
    <>
      <main className="settings-shell profile-reference-shell mx-auto w-full max-w-[760px] pb-28 text-[color:var(--text)] sm:pb-10">
        <header className="sticky top-0 z-30 -mx-3 flex min-h-16 items-center gap-3 border-b border-[color:var(--detail-row-divider)] bg-[color:var(--bg)]/95 px-3 backdrop-blur sm:-mx-4 sm:px-4 lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:backdrop-blur-none">
          <button
            type="button"
            onClick={() => (onBack ? onBack() : onNavigate?.("perfil"))}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full transition hover:bg-[color:var(--surface-subtle)]"
            aria-label="Volver al perfil"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[17px] font-semibold lg:text-[28px] lg:tracking-[-0.04em]">
              Evaluaciones y seguimiento
            </h1>
            <p className="hidden text-xs text-[color:var(--text-muted)] lg:mt-1 lg:block">
              Configura el formulario inicial y las tareas periódicas de tus
              alumnos.
            </p>
          </div>
        </header>

        <nav
          aria-label="Secciones de configuración"
          className="mt-4 flex border-b border-[color:var(--detail-row-divider)]"
        >
          {[
            {
              id: "evaluation",
              icon: FileText,
              label: "Evaluación inicial",
            },
            {
              id: "follow_up",
              icon: HeartPulse,
              label: "Seguimiento",
            },
          ].map(({ id, icon: Icon, label }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-12 flex-1 items-center justify-center gap-2 px-2 text-center text-sm font-semibold transition after:absolute after:inset-x-2 after:bottom-[-1px] after:h-0.5 ${active ? "text-[color:var(--text)] after:bg-[color:var(--accent)]" : "text-[color:var(--text-muted)] after:bg-transparent hover:text-[color:var(--text)]"}`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
                <span className="rounded-full bg-[color:var(--surface-subtle)] px-2 py-0.5 text-[10px] text-[color:var(--text-muted)]">
                  {id === "evaluation" ? enabledQuestions : enabledFollowUps}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="min-w-0 pt-5">
          {tab === "evaluation" ? (
            <section aria-labelledby="evaluation-title">
              <div className="flex items-center justify-between gap-3 px-0.5">
                <div className="min-w-0">
                  <h2
                    id="evaluation-title"
                    className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]"
                  >
                    Preguntas
                  </h2>
                  <p className="mt-0.5 text-[10px] text-[color:var(--text-subtle)]">
                    Arrastra desde el icono izquierdo para reordenar
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-[color:var(--detail-module-border)] bg-[color:var(--card)] px-3 text-xs font-semibold text-[color:var(--text)] transition hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-subtle)]"
                >
                  <Eye className="h-4 w-4" /> Vista previa
                </button>
              </div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleQuestionDragEnd}
              >
                <SortableContext
                  items={settings.intakeQuestions.map(
                    (question) => question.key,
                  )}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="mt-3 grid gap-2.5">
                    {settings.intakeQuestions.map((question, index) => (
                      <QuestionCard
                        key={question.key}
                        question={question}
                        index={index}
                        onChange={(changes) => updateQuestion(index, changes)}
                        onDelete={() => removeQuestion(index)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              <button
                type="button"
                onClick={addQuestion}
                disabled={settings.intakeQuestions.length >= 30}
                className="mt-3 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[color:var(--border-strong)] text-sm font-semibold text-[color:var(--text)] transition hover:bg-[color:var(--surface-subtle)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-5 w-5" /> Añadir pregunta
              </button>
            </section>
          ) : (
            <section aria-labelledby="follow-up-title">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2
                    id="follow-up-title"
                    className="text-xl font-semibold tracking-[-0.03em]"
                  >
                    Seguimiento recurrente
                  </h2>
                  <p className="mt-1 max-w-xl text-xs leading-5 text-[color:var(--text-muted)]">
                    Activa las tareas y define cada cuánto debe completarlas el
                    alumno.
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-[color:var(--text-muted)]">
                  {enabledFollowUps} activas
                </span>
              </div>
              <SectionTitle title="Tareas" description="" />
              <div className="mt-2 border-y border-[color:var(--detail-row-divider)]">
                <FollowUpCard
                  icon={HeartPulse}
                  title="Check-in de bienestar"
                  description="Sueño, energía, estrés, motivación y dolor."
                  summary={checkInSummary}
                  enabled={settings.followUp.checkIn.enabled}
                  onEnabled={(enabled) =>
                    updateFollowUp("checkIn", { enabled })
                  }
                >
                  <label className="block text-xs font-medium text-[color:var(--text-muted)]">
                    ¿Cuándo debe completarlo?
                    <select
                      value={settings.followUp.checkIn.cadence}
                      onChange={(event) =>
                        updateFollowUp("checkIn", {
                          cadence: event.target.value,
                        })
                      }
                      className={fieldClass}
                    >
                      {CADENCES.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {settings.followUp.checkIn.cadence === "weekly" ? (
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-medium text-[color:var(--text-muted)]">
                        Día de envío
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {DAY_OPTIONS.map(([value, label]) => (
                          <OptionChip
                            key={value}
                            selected={settings.followUp.checkIn.weekdays?.includes(
                              value,
                            )}
                            onClick={() =>
                              updateFollowUp("checkIn", { weekdays: [value] })
                            }
                          >
                            {label.slice(0, 3)}
                          </OptionChip>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </FollowUpCard>

                <FollowUpCard
                  icon={Scale}
                  title="Registro de peso"
                  description="Registro periódico del peso corporal."
                  summary={frequencySummary(settings.followUp.weight, true)}
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
                    onChange={(required) =>
                      updateFollowUp("weight", { required })
                    }
                  />
                </FollowUpCard>

                <FollowUpCard
                  icon={Camera}
                  title="Fotos de progreso"
                  description="Vistas corporales con consentimiento del alumno."
                  summary={`${frequencySummary(settings.followUp.photos)} · ${settings.followUp.photos.views.length} vistas`}
                  enabled={settings.followUp.photos.enabled}
                  onEnabled={(enabled) => updateFollowUp("photos", { enabled })}
                >
                  <FrequencyControls
                    value={settings.followUp.photos}
                    onChange={(changes) => updateFollowUp("photos", changes)}
                  />
                  <ChoiceGroup
                    label="Fotos solicitadas"
                    options={PHOTO_VIEW_OPTIONS}
                    selected={settings.followUp.photos.views}
                    onToggle={(value) =>
                      updateFollowUp("photos", {
                        views: toggleListValue(
                          settings.followUp.photos.views,
                          value,
                        ),
                      })
                    }
                  />
                  <RequiredControl
                    checked={settings.followUp.photos.required}
                    onChange={(required) =>
                      updateFollowUp("photos", { required })
                    }
                  />
                </FollowUpCard>

                <FollowUpCard
                  icon={Ruler}
                  title="Medidas corporales"
                  description="Elige solo las métricas útiles para el objetivo."
                  summary={`${frequencySummary(settings.followUp.measurements)} · ${settings.followUp.measurements.fields.length} medidas`}
                  enabled={settings.followUp.measurements.enabled}
                  onEnabled={(enabled) =>
                    updateFollowUp("measurements", { enabled })
                  }
                >
                  <ChoiceGroup
                    label="Medidas solicitadas"
                    options={METRIC_OPTIONS}
                    selected={settings.followUp.measurements.fields}
                    onToggle={(value) =>
                      updateFollowUp("measurements", {
                        fields: toggleListValue(
                          settings.followUp.measurements.fields,
                          value,
                        ),
                      })
                    }
                    first
                  />
                  <div className="mt-4">
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
                </FollowUpCard>

                <FollowUpCard
                  icon={ClipboardCheck}
                  title="Revisión del plan"
                  description="Recibe un aviso antes de preparar el siguiente bloque."
                  summary={`Cada ${settings.followUp.review.intervalWeeks} ${settings.followUp.review.intervalWeeks === 1 ? "semana" : "semanas"} · aviso ${settings.followUp.review.leadDays} ${settings.followUp.review.leadDays === 1 ? "día" : "días"} antes`}
                  enabled={settings.followUp.review.enabled}
                  onEnabled={(enabled) => updateFollowUp("review", { enabled })}
                >
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs font-medium text-[color:var(--text-muted)]">
                      Revisar cada (semanas)
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
                        className={fieldClass}
                      />
                    </label>
                    <label className="text-xs font-medium text-[color:var(--text-muted)]">
                      Avisarme antes (días)
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
                        className={fieldClass}
                      />
                    </label>
                  </div>
                </FollowUpCard>

                <FollowUpCard
                  icon={FileText}
                  title="Evaluación final"
                  description="Se solicita cuando termina el bloque actual."
                  summary="Al finalizar cada bloque"
                  enabled={settings.followUp.finalEvaluation.enabled}
                  onEnabled={(enabled) =>
                    updateFollowUp("finalEvaluation", { enabled })
                  }
                >
                  <div className="flex gap-3 rounded-xl bg-[color:var(--surface-subtle)] p-4">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--text-muted)]" />
                    <p className="text-xs leading-5 text-[color:var(--text-muted)]">
                      Recibirás las respuestas antes de preparar el siguiente
                      plan. Ningún plan se reemplaza automáticamente.
                    </p>
                  </div>
                </FollowUpCard>
              </div>
            </section>
          )}

          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[color:var(--detail-row-divider)] bg-[color:var(--bg)]/95 p-3 backdrop-blur sm:sticky sm:bottom-0 sm:mt-4 sm:px-0">
            <div className="mx-auto flex max-w-[720px] items-center gap-3">
              <div className="hidden min-w-0 flex-1 sm:block" />
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="theme-accent-solid flex h-12 w-full items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold transition active:scale-[0.99] disabled:opacity-50 sm:w-auto"
              >
                <Save className="h-4 w-4" />
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      </main>
      {previewOpen ? (
        <Modal
          mobilePage
          size="small"
          hideHeader
          title="Vista previa del formulario"
          onClose={() => setPreviewOpen(false)}
          contentClassName="!p-0 bg-[color:var(--surface-subtle)]"
        >
          <WorkflowPreview
            questions={settings.intakeQuestions}
            onClose={() => setPreviewOpen(false)}
          />
        </Modal>
      ) : null}
    </>
  );
}

function SectionTitle({ title, description, meta }) {
  return (
    <div className="mt-6 flex items-end justify-between gap-4 px-1">
      <div>
        <h3 className="text-[16px] font-semibold">{title}</h3>
        {description ? (
          <p className="mt-1 text-xs text-[color:var(--text-muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {meta ? (
        <span className="text-xs font-medium text-[color:var(--text-subtle)]">
          {meta}
        </span>
      ) : null}
    </div>
  );
}

function ChoiceGroup({ label, options, selected, onToggle, first = false }) {
  return (
    <div className={first ? "" : "mt-4"}>
      <p className="mb-2 text-xs font-medium text-[color:var(--text-muted)]">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map(([value, optionLabel]) => (
          <OptionChip
            key={value}
            selected={selected.includes(value)}
            onClick={() => onToggle(value)}
          >
            {optionLabel}
          </OptionChip>
        ))}
      </div>
    </div>
  );
}
