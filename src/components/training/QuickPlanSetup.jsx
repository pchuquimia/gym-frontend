import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ChevronDown, Plus, Search, X } from "lucide-react";
import {
  getLocalPlanDate,
  getQuickPlanAssignments,
} from "../../utils/quickPlan";
import Modal from "../shared/Modal";
import Button from "../ui/button";
import RoutineThumbnail from "./RoutineThumbnail";
import "./quick-plan-setup.css";

const WEEKDAYS = [
  [1, "Lunes"],
  [2, "Martes"],
  [3, "Miércoles"],
  [4, "Jueves"],
  [5, "Viernes"],
  [6, "Sábado"],
  [7, "Domingo"],
];
const idOf = (item) => String(item?.id || item?._id || "");
const readDraft = (key) => {
  try {
    return key ? JSON.parse(sessionStorage.getItem(key)) || {} : {};
  } catch {
    return {};
  }
};
const clearDraft = (key) => {
  try {
    if (key) sessionStorage.removeItem(key);
  } catch {
    /* Optional persistence. */
  }
};
const initialWeek = (draft) =>
  draft.dayRoutines ||
  Object.fromEntries(
    getQuickPlanAssignments(
      draft.routineIds || [],
      draft.selectedDays || [],
      draft.overrides || {},
    )
      .filter((day) => day.routineId)
      .map((day) => [day.dayIndex, day.routineId]),
  );

export default function QuickPlanSetup({
  routines,
  onCreate,
  onClose,
  onView,
  onCreateRoutine,
  activePlan,
  scheduledPlan,
  storageKey,
  addedRoutineId,
  suspended = false,
}) {
  const titleRef = useRef(null);
  const dayButtons = useRef(new Map());
  const returnFocusDay = useRef(null);
  const [editingDay, setEditingDay] = useState(null);
  const [query, setQuery] = useState("");
  const [initial] = useState(() => readDraft(storageKey));
  const [dayRoutines, setDayRoutines] = useState(() => initialWeek(initial));
  const [durationWeeks, setDurationWeeks] = useState(
    initial.durationWeeks || 4,
  );
  const [startDate, setStartDate] = useState(
    initial.startDate || getLocalPlanDate(),
  );
  const [name, setName] = useState(initial.name || "");
  const [goal, setGoal] = useState(initial.goal || "General");
  const [level, setLevel] = useState(initial.level || "beginner");
  const [notes, setNotes] = useState(initial.notes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [createdPlan, setCreatedPlan] = useState(null);
  const [createdRoutines, setCreatedRoutines] = useState([]);
  const [partialPlan, setPartialPlan] = useState(initial.partialPlan || null);
  const submitting = useRef(false);
  const consumedRoutine = useRef(null);
  const displayRoutines = createdPlan ? createdRoutines : routines;
  const personalRoutines = routines.filter(
    (routine) => !routine.trainingPlanId,
  );
  const planRoutines = routines.filter((routine) => routine.trainingPlanId);
  const selectedDays = WEEKDAYS.filter(([index]) => dayRoutines[index]).map(
    ([index]) => index,
  );
  const routineIds = [
    ...new Set(selectedDays.map((index) => dayRoutines[index])),
  ];
  const selected = routineIds
    .map((id) => displayRoutines.find((item) => idOf(item) === id))
    .filter(Boolean);
  const suggestedName = selected.length
    ? `Plan de ${selected.map((item) => item.name).join(" + ")}`.slice(0, 100)
    : "Mi planificación";
  const future = startDate > getLocalPlanDate();
  const missingRoutines = selected.length !== routineIds.length;
  const invalidDate = !startDate || startDate < getLocalPlanDate();
  const valid =
    selectedDays.length > 0 &&
    !missingRoutines &&
    !invalidDate &&
    Number.isInteger(durationWeeks) &&
    durationWeeks >= 1 &&
    durationWeeks <= 52;

  useEffect(() => {
    const added = routines.find((item) => idOf(item) === addedRoutineId);
    if (!added || consumedRoutine.current === addedRoutineId) return;
    consumedRoutine.current = addedRoutineId;
    if (editingDay !== null) setQuery(added.name);
    setAnnouncement(
      `${added.name} ya está disponible para elegirla en cualquier día.`,
    );
  }, [addedRoutineId, routines, editingDay]);

  useEffect(() => {
    if (!storageKey || createdPlan) return;
    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          dayRoutines,
          durationWeeks,
          startDate,
          name,
          goal,
          level,
          notes,
          partialPlan,
        }),
      );
    } catch {
      /* Optional persistence. */
    }
  }, [
    storageKey,
    createdPlan,
    dayRoutines,
    durationWeeks,
    startDate,
    name,
    goal,
    level,
    notes,
    partialPlan,
  ]);

  useEffect(() => {
    if (createdPlan) titleRef.current?.focus();
  }, [createdPlan]);

  const closePicker = () => {
    returnFocusDay.current = editingDay;
    setEditingDay(null);
    setQuery("");
  };
  const close = () => {
    if (saving) return;
    if (editingDay !== null) {
      closePicker();
      return;
    }
    clearDraft(storageKey);
    onClose();
  };
  const assignDay = (index, routineId) => {
    setDayRoutines((current) => {
      const next = { ...current };
      if (routineId) next[index] = routineId;
      else delete next[index];
      return next;
    });
    setError("");
  };
  const submit = async () => {
    if ((!valid && !partialPlan) || submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setError("");
    setCreatedRoutines(routines);
    try {
      const plan = await onCreate({
        routineIds,
        selectedDays,
        overrides: dayRoutines,
        durationWeeks,
        startDate,
        name: name.trim() || suggestedName,
        goal,
        level,
        notes,
        existingDraft: partialPlan,
      });
      setCreatedPlan(plan);
      clearDraft(storageKey);
    } catch (failure) {
      if (failure?.draftPlan) setPartialPlan(failure.draftPlan);
      setError(
        failure?.message ||
          "No pudimos crear la planificación. Inténtalo de nuevo.",
      );
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };
  const chooseRoutine = (routineId) => {
    assignDay(editingDay, routineId);
    const full = WEEKDAYS.find(([index]) => index === editingDay)?.[1];
    const routine = routines.find((item) => idOf(item) === routineId);
    setAnnouncement(`${full}: ${routine?.name || "descanso"}.`);
    closePicker();
  };
  const week = (editable) => (
    <ul className="quick-plan__week" aria-label="Tu semana">
      {WEEKDAYS.map(([index, full]) => {
        const routineId = dayRoutines[index] || "";
        const routine = displayRoutines.find(
          (item) => idOf(item) === routineId,
        );
        const label =
          routine?.name || (routineId ? "Rutina no disponible" : "Descanso");
        const content = (
          <>
            <span className="quick-plan__weekday">{full}</span>
            <RoutineThumbnail key={routineId || "rest"} routine={routine} />
            <span className="quick-plan__day-name">{label}</span>
            {editable && <ChevronDown size={15} aria-hidden="true" />}
          </>
        );
        return (
          <li key={index}>
            {editable ? (
              <button
                type="button"
                ref={(element) => {
                  if (element) dayButtons.current.set(index, element);
                  else dayButtons.current.delete(index);
                }}
                className={`quick-plan__row ${routineId ? "is-training" : ""}`}
                aria-label={`${full}: ${label}`}
                aria-haspopup="dialog"
                onClick={() => {
                  setEditingDay(index);
                  setQuery("");
                }}
              >
                {content}
              </button>
            ) : (
              <div
                className={`quick-plan__row ${routineId ? "is-training" : ""}`}
              >
                {content}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
  const normalize = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es")
      .trim();
  const matches = (item) => normalize(item.name).includes(normalize(query));
  const pickerGroups = [
    { label: "Mis rutinas", items: personalRoutines.filter(matches) },
    { label: "De mi planificación", items: planRoutines.filter(matches) },
  ];
  if (planRoutines.some((item) => idOf(item) === dayRoutines[editingDay]))
    pickerGroups.reverse();
  const pickerOpen = editingDay !== null;
  const pickerDayName = WEEKDAYS.find(([index]) => index === editingDay)?.[1];
  const pickerOption = (routine) => {
    const id = routine ? idOf(routine) : "";
    const isSelected = (dayRoutines[editingDay] || "") === id;
    const count = (routine?.exercises || []).filter(
      (item) => !item.isExtra,
    ).length;
    return (
      <button
        key={id || "rest"}
        type="button"
        className={`quick-plan__choice ${isSelected ? "is-selected" : ""}`}
        aria-label={routine?.name || "Descanso"}
        aria-pressed={isSelected}
        onClick={() => chooseRoutine(id)}
      >
        <RoutineThumbnail routine={routine} />
        <span className="quick-plan__choice-name">
          <strong>{routine?.name || "Descanso"}</strong>
          <small>
            {routine
              ? `${count} ${count === 1 ? "ejercicio" : "ejercicios"}`
              : "Día sin entrenamiento"}
          </small>
        </span>
        <span className="quick-plan__choice-check" aria-hidden="true">
          {isSelected && <Check size={16} strokeWidth={2.5} />}
        </span>
      </button>
    );
  };

  if (suspended) return null;
  return (
    <Modal
      key={pickerOpen ? `day-${editingDay}` : "week"}
      mobilePage
      title={
        pickerOpen
          ? pickerDayName
          : createdPlan
            ? "Planificación creada"
            : "Nueva planificación"
      }
      onClose={close}
      initialFocus={() =>
        !pickerOpen && dayButtons.current.get(returnFocusDay.current)
      }
      size="small"
      dialogClassName={`quick-plan ${pickerOpen ? "quick-plan--picker" : ""}`}
      contentClassName={pickerOpen ? "quick-plan__picker-scroll" : ""}
      footer={
        pickerOpen ? (
          onCreateRoutine ? (
            <div className="quick-plan__footer">
              <Button
                variant="outline"
                className="h-11 w-full"
                onClick={onCreateRoutine}
              >
                <Plus size={16} aria-hidden="true" />
                Crear una rutina
              </Button>
            </div>
          ) : null
        ) : !createdPlan ? (
          <div className="quick-plan__footer">
            {activePlan && (
              <p>
                {future
                  ? "Al empezar, se pausará el plan que esté activo."
                  : `«${activePlan.name}» quedará en pausa. Su historial se conserva.`}
              </p>
            )}
            <Button
              className="quick-plan__primary h-12 w-full text-sm"
              disabled={saving || (!partialPlan && !valid)}
              onClick={submit}
            >
              {saving
                ? "Preparando tu plan…"
                : partialPlan
                  ? "Reintentar creación"
                  : "Crear planificación"}
            </Button>
          </div>
        ) : null
      }
    >
      <div className="quick-plan__content">
        {pickerOpen ? (
          <div className="quick-plan__picker">
            <div className="quick-plan__picker-heading">
              <h1>Elige una rutina</h1>
              <p>Puedes cambiarla después.</p>
              <div className="quick-plan__search">
                <Search size={18} aria-hidden="true" />
                <input
                  type="search"
                  aria-label="Buscar rutina"
                  placeholder="Buscar rutina"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                {query && (
                  <button
                    type="button"
                    aria-label="Limpiar búsqueda"
                    onClick={() => setQuery("")}
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
            {pickerOption(null)}
            {pickerGroups
              .filter((group) => group.items.length)
              .map((group) => (
                <section
                  key={group.label}
                  className="quick-plan__choices"
                  aria-label={group.label}
                >
                  <h2>{group.label}</h2>
                  {group.items.map(pickerOption)}
                </section>
              ))}
            {!pickerGroups.some((group) => group.items.length) && (
              <div className="quick-plan__no-results">
                <p>
                  {routines.length
                    ? "No hay rutinas con ese nombre."
                    : "Todavía no tienes rutinas guardadas."}
                </p>
                {query && (
                  <button type="button" onClick={() => setQuery("")}>
                    Ver todas las rutinas
                  </button>
                )}
              </div>
            )}
          </div>
        ) : createdPlan ? (
          <>
            <span className="quick-plan__success-icon">
              <Check aria-hidden="true" />
            </span>
            <h1 ref={titleRef} tabIndex={-1}>
              Tu semana está lista.
            </h1>
            <p className="quick-plan__intro-text">
              {createdPlan.status === "scheduled"
                ? `Comienza el ${startDate.split("-").reverse().join("/")}.`
                : "Ya puedes empezar a entrenar."}
            </p>
            <h2 className="quick-plan__created-name">
              {createdPlan.name || name || suggestedName}
            </h2>
            <p className="quick-plan__summary">
              {selectedDays.length} {selectedDays.length === 1 ? "día" : "días"}{" "}
              de entrenamiento · {durationWeeks} semanas
            </p>
            {week(false)}
            <Button
              className="mt-5 h-12 w-full"
              onClick={() => onView(createdPlan)}
            >
              Ver mi plan <ArrowRight size={18} aria-hidden="true" />
            </Button>
          </>
        ) : (
          <>
            <div className="quick-plan__intro">
              <h1>¿Qué entrenas cada día?</h1>
              <p>Elige una rutina o deja el día para descansar.</p>
            </div>
            {!routines.length && (
              <div className="quick-plan__empty">
                <p>Primero crea una rutina con tus ejercicios.</p>
                {onCreateRoutine && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={onCreateRoutine}
                    disabled={saving || Boolean(partialPlan)}
                  >
                    <Plus size={16} aria-hidden="true" />
                    Crear una rutina
                  </Button>
                )}
              </div>
            )}
            <fieldset
              disabled={saving || Boolean(partialPlan)}
              className="quick-plan__fields"
            >
              {week(true)}
              <div className="quick-plan__week-footer">
                <span>
                  {selectedDays.length
                    ? `${selectedDays.length} ${selectedDays.length === 1 ? "día" : "días"} de entrenamiento`
                    : "Elige al menos un día"}
                </span>
                {routines.length > 0 && onCreateRoutine && (
                  <button type="button" onClick={onCreateRoutine}>
                    Crear rutina <Plus size={14} aria-hidden="true" />
                  </button>
                )}
              </div>
              <details className="quick-plan__options">
                <summary>
                  <span>
                    {startDate === getLocalPlanDate()
                      ? "Empieza hoy"
                      : startDate
                        ? `Desde ${startDate.split("-").reverse().join("/")}`
                        : "Elige inicio"}{" "}
                    · {durationWeeks} semanas
                  </span>
                  <strong>Ajustar</strong>
                </summary>
                <div className="quick-plan__settings">
                  <label className="quick-plan__name">
                    Nombre del plan
                    <input
                      maxLength={100}
                      placeholder={suggestedName}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </label>
                  <label>
                    Empieza
                    <input
                      type="date"
                      min={getLocalPlanDate()}
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                    />
                  </label>
                  <label>
                    Duración
                    <select
                      value={durationWeeks}
                      onChange={(event) =>
                        setDurationWeeks(Number(event.target.value))
                      }
                    >
                      {[1, 2, 4, 6, 8, 12, 16, 24, 52].map((value) => (
                        <option key={value} value={value}>
                          {value} semanas
                        </option>
                      ))}
                    </select>
                  </label>
                  <details className="quick-plan__extras">
                    <summary>Más opciones</summary>
                    <div className="quick-plan__settings">
                      <label>
                        Objetivo
                        <select
                          value={goal}
                          onChange={(event) => setGoal(event.target.value)}
                        >
                          <option>General</option>
                          <option>Hipertrofia</option>
                          <option>Fuerza</option>
                          <option>Salud y bienestar</option>
                        </select>
                      </label>
                      <label>
                        Nivel
                        <select
                          value={level}
                          onChange={(event) => setLevel(event.target.value)}
                        >
                          <option value="beginner">Principiante</option>
                          <option value="intermediate">Intermedio</option>
                          <option value="advanced">Avanzado</option>
                        </select>
                      </label>
                      <label className="quick-plan__name">
                        Notas
                        <textarea
                          rows={2}
                          maxLength={2000}
                          value={notes}
                          onChange={(event) => setNotes(event.target.value)}
                        />
                      </label>
                    </div>
                  </details>
                </div>
              </details>
            </fieldset>
            {invalidDate && (
              <p className="quick-plan__error">
                Elige hoy o una fecha futura en «Ajustar».
              </p>
            )}
            {missingRoutines && (
              <p className="quick-plan__notice">
                Reemplaza las rutinas que ya no están disponibles o deja esos
                días como descanso.
              </p>
            )}
            {scheduledPlan && (
              <p className="quick-plan__notice">
                {future
                  ? `«${scheduledPlan.name}» quedará en pausa al programar este plan.`
                  : `«${scheduledPlan.name}» sigue programado para su fecha de inicio.`}
              </p>
            )}
            {partialPlan && (
              <div className="quick-plan__notice">
                <strong>Tu borrador está guardado.</strong>
                <p>Reintenta para terminarlo sin crear otro plan.</p>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => onView(partialPlan)}
                >
                  Abrir borrador
                </button>
              </div>
            )}
            {error && (
              <p role="alert" className="quick-plan__error">
                {error}
              </p>
            )}
          </>
        )}
        <span className="quick-plan__sr-only" role="status" aria-live="polite">
          {announcement}
        </span>
      </div>
    </Modal>
  );
}
