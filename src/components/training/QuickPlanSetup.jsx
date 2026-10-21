import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Moon,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import {
  getLocalPlanDate,
  getQuickPlanAssignments,
} from "../../utils/quickPlan";
import Modal from "../shared/Modal";
import ChoiceCard from "../shared/ChoiceCard";
import Button from "../ui/button";
import "./quick-plan-setup.css";

const WEEKDAYS = [
  [1, "Lun", "Lunes"],
  [2, "Mar", "Martes"],
  [3, "Mié", "Miércoles"],
  [4, "Jue", "Jueves"],
  [5, "Vie", "Viernes"],
  [6, "Sáb", "Sábado"],
  [7, "Dom", "Domingo"],
];
const COLORS = [
  "#608b78",
  "#8085b4",
  "#b88857",
  "#b77885",
  "#5d92aa",
  "#96934e",
  "#9d7fa7",
];
const REST = "__rest__";
const idOf = (item) => String(item?.id || item?._id || "");
const tone = (id) => ({
  "--routine-color":
    COLORS[
      [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % COLORS.length
    ],
});
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
  const [initial] = useState(() => readDraft(storageKey));
  const [dayRoutines, setDayRoutines] = useState(() => initialWeek(initial));
  const [paintRoutineId, setPaintRoutineId] = useState(
    initial.paintRoutineId ?? null,
  );
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
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [createdPlan, setCreatedPlan] = useState(null);
  const [createdRoutines, setCreatedRoutines] = useState([]);
  const [partialPlan, setPartialPlan] = useState(initial.partialPlan || null);
  const submitting = useRef(false);
  const consumedRoutine = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const displayRoutines = createdPlan ? createdRoutines : routines;
  const activeRoutine =
    routines.find((item) => idOf(item) === paintRoutineId) || routines[0];
  const resting = paintRoutineId === REST;
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
  const valid =
    selectedDays.length > 0 &&
    !missingRoutines &&
    startDate >= getLocalPlanDate() &&
    Number.isInteger(durationWeeks) &&
    durationWeeks >= 1 &&
    durationWeeks <= 52;
  const matches = routines.filter((item) =>
    item.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );
  const visibleRoutines = expanded || query ? matches : matches.slice(0, 4);
  if (
    !expanded &&
    !query &&
    !resting &&
    activeRoutine &&
    !visibleRoutines.includes(activeRoutine)
  ) {
    visibleRoutines.splice(3, 1, activeRoutine);
  }

  useEffect(() => {
    if (
      !addedRoutineId ||
      consumedRoutine.current === addedRoutineId ||
      !routines.some((item) => idOf(item) === addedRoutineId)
    )
      return;
    consumedRoutine.current = addedRoutineId;
    setPaintRoutineId(addedRoutineId);
    setQuery("");
    setAnnouncement("Rutina lista. Toca los días donde quieres colocarla.");
  }, [addedRoutineId, routines]);

  useEffect(() => {
    if (!storageKey || createdPlan) return;
    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          dayRoutines,
          paintRoutineId,
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
    paintRoutineId,
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

  const close = () => {
    if (!saving) {
      clearDraft(storageKey);
      onClose();
    }
  };
  const placeRoutine = (index, full) => {
    if (!resting && !activeRoutine) return;
    const id = resting ? null : idOf(activeRoutine);
    const remove = !id || dayRoutines[index] === id;
    setDayRoutines((current) => {
      const next = { ...current };
      if (remove) delete next[index];
      else next[index] = id;
      return next;
    });
    setAnnouncement(`${full}: ${remove ? "descanso" : activeRoutine.name}.`);
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
  const week = (editable) => (
    <div className="quick-plan__calendar" aria-label="Tu semana">
      {WEEKDAYS.map(([index, short, full]) => {
        const routineId = dayRoutines[index];
        const routine = displayRoutines.find(
          (item) => idOf(item) === routineId,
        );
        const label = routine
          ? routine.name
          : routineId
            ? "Rutina no disponible"
            : "Descanso";
        const content = (
          <>
            <span className="quick-plan__day-top">
              <span>{short}</span>
              {routineId ? (
                <span className="quick-plan__dot" />
              ) : (
                <Moon size={13} aria-hidden="true" />
              )}
            </span>
            <strong>{label}</strong>
            {routine && (
              <small>
                {
                  (routine.exercises || []).filter((item) => !item.isExtra)
                    .length
                }{" "}
                ejercicios
              </small>
            )}
          </>
        );
        return editable ? (
          <button
            key={index}
            type="button"
            className={`quick-plan__day ${routineId ? "is-training" : "is-rest"}`}
            style={tone(routineId || "rest")}
            aria-label={`${full}: ${label}`}
            aria-pressed={Boolean(routineId)}
            title={`${full}: ${label}`}
            onClick={() => placeRoutine(index, full)}
          >
            {content}
          </button>
        ) : (
          <div
            key={index}
            className={`quick-plan__day ${routineId ? "is-training" : "is-rest"}`}
            style={tone(routineId || "rest")}
          >
            {content}
          </div>
        );
      })}
    </div>
  );

  if (suspended) return null;
  return (
    <Modal
      mobilePage
      title={createdPlan ? "Planificación creada" : "Nueva planificación"}
      onClose={close}
      dialogClassName="quick-plan"
      size="default"
      footer={
        !createdPlan ? (
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="quick-plan__replacement text-center sm:text-left">
              {activePlan
                ? future
                  ? "Se activará en la fecha elegida y pausará el plan que esté activo."
                  : `«${activePlan.name}» quedará en pausa. Su historial se conserva.`
                : selectedDays.length
                  ? `${selectedDays.length} días de entrenamiento · ${7 - selectedDays.length} de descanso`
                  : "Selecciona una rutina y toca un día."}
            </span>
            <Button
              className="h-12 shrink-0 px-4 text-sm"
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
      <div
        className={`quick-plan__content ${createdPlan ? "quick-plan__success" : ""}`}
      >
        {createdPlan ? (
          <>
            <span className="quick-plan__success-icon">
              <Check aria-hidden="true" />
            </span>
            <h1 ref={titleRef} tabIndex={-1}>
              Tu plan está listo.
            </h1>
            <p>
              {createdPlan.status === "scheduled"
                ? `Comienza el ${startDate.split("-").reverse().join("/")}.`
                : "Ya puedes empezar a entrenar."}
            </p>
            <h2 className="quick-plan__created-name">
              {createdPlan.name || name || suggestedName}
            </h2>
            <p className="quick-plan__hint">
              {durationWeeks} semanas · {selectedDays.length} días por semana
            </p>
            {week(false)}
            <Button className="h-12 w-full" onClick={() => onView(createdPlan)}>
              Ver mi plan <ArrowRight aria-hidden="true" />
            </Button>
          </>
        ) : (
          <>
            <div className="quick-plan__intro">
              <h1 id="quick-plan-title">Dale forma a tu semana.</h1>
              <p>Elige una rutina y toca los días donde la entrenarás.</p>
            </div>
            <fieldset
              disabled={saving || Boolean(partialPlan)}
              className="quick-plan__fields"
            >
              <section
                className="quick-plan__palette"
                aria-label="Rutinas para colocar"
              >
                <div className="quick-plan__palette-heading">
                  <h2>Tus rutinas</h2>
                  <div>
                    {routines.length > 4 && (
                      <button
                        type="button"
                        className="quick-plan__icon-button"
                        aria-label={
                          searching
                            ? "Cerrar búsqueda de rutinas"
                            : "Buscar rutina"
                        }
                        onClick={() => {
                          setSearching(!searching);
                          setQuery("");
                        }}
                      >
                        <Search size={18} aria-hidden="true" />
                      </button>
                    )}
                    {onCreateRoutine && (
                      <button
                        type="button"
                        className="quick-plan__icon-button"
                        aria-label="Crear una rutina"
                        onClick={onCreateRoutine}
                      >
                        <Plus size={19} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
                {searching && (
                  <input
                    type="search"
                    className="quick-plan__search"
                    aria-label="Buscar por nombre de rutina"
                    placeholder="Buscar rutina…"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                )}
                <div
                  className="quick-plan__routine-strip"
                  role="group"
                  aria-label="Rutina para colocar"
                >
                  {visibleRoutines.map((routine) => (
                    <ChoiceCard
                      key={idOf(routine)}
                      title={routine.name}
                      description={`${(routine.exercises || []).filter((item) => !item.isExtra).length} ejercicios`}
                      selected={
                        !resting && idOf(activeRoutine) === idOf(routine)
                      }
                      aria-label={`Colocar ${routine.name}`}
                      aria-pressed={
                        !resting && idOf(activeRoutine) === idOf(routine)
                      }
                      onClick={() => {
                        setPaintRoutineId(idOf(routine));
                        setAnnouncement(
                          `Colocando ${routine.name}. Toca un día.`,
                        );
                      }}
                    />
                  ))}
                </div>
                {!query && routines.length > 4 && (
                  <button
                    type="button"
                    className="quick-plan__text-button"
                    onClick={() => setExpanded(!expanded)}
                  >
                    {expanded ? "Ver menos" : `Ver todas (${routines.length})`}
                  </button>
                )}
                {!routines.length && (
                  <p className="quick-plan__empty">
                    Crea una rutina con tus ejercicios para colocarla en la
                    semana.
                  </p>
                )}
                {query && !matches.length && (
                  <p className="quick-plan__hint">
                    No hay rutinas con ese nombre.
                  </p>
                )}
              </section>
              <section
                className="quick-plan__board"
                aria-label="Distribución semanal"
              >
                <div className="quick-plan__board-heading">
                  <h2>Tu semana</h2>
                  <span>
                    {selectedDays.length
                      ? `${selectedDays.length} entrenos · ${7 - selectedDays.length} descansos`
                      : "Toca un día para empezar"}
                  </span>
                </div>
                <button
                  type="button"
                  className={`quick-plan__rest-tool ${resting ? "is-active" : ""}`}
                  aria-label="Colocar descanso"
                  aria-pressed={resting}
                  onClick={() => setPaintRoutineId(REST)}
                >
                  <Moon size={19} aria-hidden="true" />
                  <strong>Descanso</strong>
                </button>
                {week(true)}
                <p className="quick-plan__hint quick-plan__board-hint">
                  {resting
                    ? "Toca un día para dejarlo como descanso."
                    : `Colocando: ${activeRoutine?.name || "elige una rutina"}. Toca de nuevo para quitarla.`}
                </p>
              </section>
              <details className="quick-plan__options">
                <summary>
                  <SlidersHorizontal size={16} aria-hidden="true" />
                  <span>
                    {startDate === getLocalPlanDate()
                      ? "Desde hoy"
                      : startDate
                        ? startDate.split("-").reverse().join("/")
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
                  {startDate < getLocalPlanDate() && (
                    <p className="quick-plan__error">
                      Elige hoy o una fecha futura.
                    </p>
                  )}
                </div>
              </details>
            </fieldset>
            {missingRoutines && (
              <p className="quick-plan__notice">
                Hay rutinas que ya no están disponibles. Sustitúyelas tocando
                sus días.
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
                  className="quick-plan__text-button"
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
