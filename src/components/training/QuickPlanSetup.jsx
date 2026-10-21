import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CalendarDays,
  Dumbbell,
  Plus,
  Search,
  X,
} from "lucide-react";
import {
  getLocalPlanDate,
  getQuickPlanAssignments,
} from "../../utils/quickPlan";
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
const idOf = (routine) => String(routine?.id || routine?._id || "");
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
  const dialogRef = useRef(null);
  const [initial] = useState(() => readDraft(storageKey));
  const [routineIds, setRoutineIds] = useState(initial.routineIds || []);
  const [selectedDays, setSelectedDays] = useState(initial.selectedDays || []);
  const [overrides, setOverrides] = useState(initial.overrides || {});
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
  const [expanded, setExpanded] = useState(false);
  const [routinePickerOpen, setRoutinePickerOpen] = useState(
    !(initial.routineIds?.length && initial.selectedDays?.length),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createdPlan, setCreatedPlan] = useState(null);
  const [partialPlan, setPartialPlan] = useState(initial.partialPlan || null);
  const submitting = useRef(false);
  const consumedRoutine = useRef(null);
  const selected = routineIds
    .map((id) => routines.find((item) => idOf(item) === id))
    .filter(Boolean);
  const suggestedName = selected.length
    ? `Plan de ${selected.map((item) => item.name).join(" + ")}`.slice(0, 100)
    : "Mi planificación";
  const assignments = useMemo(
    () => getQuickPlanAssignments(routineIds, selectedDays, overrides),
    [routineIds, selectedDays, overrides],
  );
  const matches = routines.filter((item) =>
    item.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );
  const visibleRoutines = query || expanded ? matches : matches.slice(0, 4);
  const future = startDate > getLocalPlanDate();
  const valid =
    selected.length === routineIds.length &&
    selected.length > 0 &&
    selectedDays.length > 0 &&
    startDate >= getLocalPlanDate() &&
    Number.isInteger(durationWeeks) &&
    durationWeeks >= 1 &&
    durationWeeks <= 52;
  const unused = selected.filter(
    (item) => !assignments.some((day) => day.routineId === idOf(item)),
  );

  useEffect(() => {
    if (
      !addedRoutineId ||
      consumedRoutine.current === addedRoutineId ||
      !routines.some((item) => idOf(item) === addedRoutineId)
    )
      return;
    consumedRoutine.current = addedRoutineId;
    setRoutineIds((current) =>
      current.includes(addedRoutineId) ? current : [...current, addedRoutineId],
    );
    setRoutinePickerOpen(true);
  }, [addedRoutineId, routines]);

  useEffect(() => {
    if (!storageKey || createdPlan) return;
    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          routineIds,
          selectedDays,
          overrides,
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
    routineIds,
    selectedDays,
    overrides,
    durationWeeks,
    startDate,
    name,
    goal,
    level,
    notes,
    partialPlan,
  ]);

  useEffect(() => {
    if (suspended) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [suspended]);

  const close = () => {
    if (saving) return;
    // A partial server draft remains recoverable from the plans list.
    clearDraft(storageKey);
    onClose();
  };
  const toggleRoutine = (id) => {
    setRoutineIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
    setOverrides({});
    setError("");
  };
  const submit = async () => {
    if ((!valid && !partialPlan) || submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setError("");
    try {
      const plan = await onCreate({
        routineIds,
        selectedDays,
        overrides,
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
      dialogRef.current?.focus();
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
    <div className="quick-plan__week">
      {WEEKDAYS.map(([index, short, full]) => {
        const day = assignments.find((item) => item.dayIndex === index);
        return (
          <div
            key={index}
            className={`quick-plan__week-day ${day.type === "rest" ? "is-rest" : ""}`}
          >
            <span>{short}</span>
            {day.type === "training" ? (
              editable ? (
                <select
                  aria-label={`Rutina del ${full.toLowerCase()}`}
                  value={day.routineId}
                  onChange={(event) =>
                    setOverrides((current) => ({
                      ...current,
                      [index]: event.target.value,
                    }))
                  }
                >
                  {selected.map((item) => (
                    <option key={idOf(item)} value={idOf(item)}>
                      {item.name}
                    </option>
                  ))}
                </select>
              ) : (
                <strong>
                  {selected.find((item) => idOf(item) === day.routineId)
                    ?.name || "Entrenamiento"}
                </strong>
              )
            ) : (
              <span>Descanso</span>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="quick-plan" hidden={suspended}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-plan-title"
        tabIndex={-1}
        className="quick-plan__dialog"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            close();
          }
          if (event.key !== "Tab") return;
          const controls = [
            ...event.currentTarget.querySelectorAll(
              'button, input, select, textarea, summary, [tabindex="0"]',
            ),
          ].filter(
            (item) => !item.disabled && item.getClientRects().length > 0,
          );
          const first = controls[0];
          const last = controls.at(-1);
          if (
            event.shiftKey &&
            (document.activeElement === first ||
              document.activeElement === dialogRef.current)
          ) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        <header className="quick-plan__header">
          <button
            type="button"
            onClick={close}
            disabled={saving}
            aria-label="Cerrar creación de planificación"
            className="quick-plan__back"
          >
            <ArrowLeft aria-hidden="true" />
          </button>
          <span>
            {createdPlan ? "Planificación creada" : "Nueva planificación"}
          </span>
          <span />
        </header>
        {createdPlan ? (
          <main className="quick-plan__content quick-plan__success">
            <span className="quick-plan__success-icon">
              <Check aria-hidden="true" />
            </span>
            <h1 id="quick-plan-title">Tu plan está listo.</h1>
            <p>
              {createdPlan.status === "scheduled"
                ? `Comienza el ${startDate.split("-").reverse().join("/")}.`
                : "Ya puedes empezar a entrenar."}
            </p>
            <section className="quick-plan__card">
              <span className="quick-plan__eyebrow">
                {createdPlan.status === "scheduled" ? "Programado" : "Activo"}
              </span>
              <h2>{createdPlan.name || name || suggestedName}</h2>
              <p>
                {durationWeeks} semanas · {selectedDays.length} días por semana
              </p>
              {week(false)}
            </section>
            <button
              type="button"
              className="quick-plan__primary"
              onClick={() => onView(createdPlan)}
            >
              Ver mi plan <ArrowRight aria-hidden="true" />
            </button>
          </main>
        ) : (
          <>
            <main className="quick-plan__content">
              <div className="quick-plan__intro">
                <p className="quick-plan__eyebrow">A tu ritmo</p>
                <h1 id="quick-plan-title">Organiza tu semana.</h1>
                <p>
                  Elige tus rutinas y los días. Nosotros las distribuimos por
                  ti.
                </p>
              </div>
              <fieldset
                disabled={saving || Boolean(partialPlan)}
                className="quick-plan__fields"
              >
                <section
                  className="quick-plan__card"
                  aria-labelledby="quick-plan-routines-title"
                >
                  <div className="quick-plan__section-heading">
                    <span>1</span>
                    <h2 id="quick-plan-routines-title">Elige tus rutinas</h2>
                    {routineIds.length > 0 && (
                      <small>{routineIds.length} elegidas</small>
                    )}
                  </div>
                  <div hidden={!routinePickerOpen && selected.length > 0}>
                    <p className="quick-plan__hint">
                      Selecciona en el orden en que quieres alternarlas.
                    </p>
                    {routines.length > 4 && (
                      <label className="quick-plan__search">
                        <Search size={18} aria-hidden="true" />
                        <input
                          type="search"
                          placeholder="Buscar rutina"
                          aria-label="Buscar rutina"
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                        />
                      </label>
                    )}
                    <div className="quick-plan__routines">
                      {visibleRoutines.map((item) => {
                        const id = idOf(item);
                        const position = routineIds.indexOf(id);
                        const count = (item.exercises || []).filter(
                          (exercise) => !exercise.isExtra,
                        ).length;
                        return (
                          <button
                            key={id}
                            type="button"
                            aria-label={`${item.name}, ${count} ${count === 1 ? "ejercicio" : "ejercicios"}`}
                            aria-pressed={position >= 0}
                            onClick={() => toggleRoutine(id)}
                            className={`quick-plan__routine ${position >= 0 ? "is-selected" : ""}`}
                          >
                            <span className="quick-plan__routine-icon">
                              <Dumbbell aria-hidden="true" />
                            </span>
                            <span className="quick-plan__routine-name">
                              <strong>{item.name}</strong>
                              <small>
                                {count}{" "}
                                {count === 1 ? "ejercicio" : "ejercicios"}
                              </small>
                            </span>
                            <span className="quick-plan__routine-check">
                              {position >= 0 ? (
                                position + 1
                              ) : (
                                <Plus size={16} aria-hidden="true" />
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {!routines.length && (
                      <p className="quick-plan__empty">
                        Primero guarda una rutina con tus ejercicios. Después
                        podrás organizarla aquí.
                      </p>
                    )}
                    {routines.length > 0 && !matches.length && (
                      <p className="quick-plan__hint">
                        No hay rutinas con ese nombre.
                      </p>
                    )}
                    {!query && routines.length > 4 && (
                      <button
                        type="button"
                        className="quick-plan__text-button"
                        onClick={() => setExpanded(!expanded)}
                      >
                        {expanded
                          ? "Mostrar menos"
                          : `Ver las ${routines.length} rutinas`}
                      </button>
                    )}
                  </div>
                  {selected.length !== routineIds.length && (
                    <p className="quick-plan__notice">
                      Una rutina elegida ya no está disponible.{" "}
                      <button
                        type="button"
                        className="quick-plan__text-button"
                        onClick={() => {
                          setRoutineIds(selected.map(idOf));
                          setOverrides({});
                        }}
                      >
                        Quitar rutinas no disponibles
                      </button>
                    </p>
                  )}
                  {routineIds.length > 0 && (
                    <div
                      className="quick-plan__selected"
                      aria-label="Orden de las rutinas"
                    >
                      {selected.map((item, index) => (
                        <button
                          type="button"
                          key={idOf(item)}
                          onClick={() => toggleRoutine(idOf(item))}
                          aria-label={`Quitar ${item.name}`}
                        >
                          <span>{index + 1}</span>
                          {item.name}
                          <X size={13} aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  )}
                  {!routinePickerOpen && selected.length > 0 && (
                    <button
                      type="button"
                      className="quick-plan__text-button"
                      onClick={() => setRoutinePickerOpen(true)}
                    >
                      Cambiar rutinas
                    </button>
                  )}
                  {onCreateRoutine &&
                    (routinePickerOpen || !selected.length) && (
                      <button
                        type="button"
                        className="quick-plan__text-button"
                        onClick={onCreateRoutine}
                      >
                        <Plus size={16} aria-hidden="true" /> Crear una rutina
                      </button>
                    )}
                  {routinePickerOpen && selected.length > 0 && (
                    <button
                      type="button"
                      className="quick-plan__text-button quick-plan__done"
                      onClick={() => setRoutinePickerOpen(false)}
                    >
                      Listo, elegir días{" "}
                      <ArrowRight size={15} aria-hidden="true" />
                    </button>
                  )}
                </section>
                <section
                  className="quick-plan__card"
                  aria-labelledby="quick-plan-days-title"
                >
                  <div className="quick-plan__section-heading">
                    <span>2</span>
                    <h2 id="quick-plan-days-title">¿Qué días entrenarás?</h2>
                  </div>
                  <div className="quick-plan__days">
                    {WEEKDAYS.map(([index, short, full]) => (
                      <button
                        type="button"
                        key={index}
                        aria-label={full}
                        aria-pressed={selectedDays.includes(index)}
                        onClick={() => {
                          setSelectedDays((current) =>
                            current.includes(index)
                              ? current.filter((day) => day !== index)
                              : [...current, index].sort((a, b) => a - b),
                          );
                          setError("");
                        }}
                      >
                        {short}
                      </button>
                    ))}
                  </div>
                  <p className="quick-plan__hint">
                    Los demás días quedan como descanso.
                  </p>
                  {selected.length > 0 && selectedDays.length > 0 && (
                    <div className="quick-plan__preview">
                      <h3>Así queda tu semana</h3>
                      <p className="quick-plan__hint">
                        Puedes cambiar la rutina de cada día.
                      </p>
                      {week(true)}
                      {unused.length > 0 && (
                        <p className="quick-plan__notice">
                          Sin día asignado:{" "}
                          {unused.map((item) => item.name).join(", ")}. Elige
                          más días o cambia la distribución.
                        </p>
                      )}
                      <p className="quick-plan__hint">
                        Esta distribución se repite cada semana.
                      </p>
                    </div>
                  )}
                </section>
                <section
                  className="quick-plan__card quick-plan__settings"
                  aria-label="Configuración del plan"
                >
                  <label className="quick-plan__name">
                    Nombre del plan
                    <input
                      maxLength={100}
                      value={name}
                      placeholder={suggestedName}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </label>
                  <label>
                    <span>
                      <CalendarDays size={15} aria-hidden="true" /> Empieza
                    </span>
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
                      {[2, 4, 6, 8, 12, 16, 24, 52].map((value) => (
                        <option key={value} value={value}>
                          {value} semanas
                        </option>
                      ))}
                    </select>
                  </label>
                  {startDate && startDate < getLocalPlanDate() && (
                    <p className="quick-plan__notice">
                      Elige hoy o una fecha futura.
                    </p>
                  )}
                  <details>
                    <summary>
                      Más opciones <span>Opcional</span>
                    </summary>
                    <div className="quick-plan__extras">
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
                      <label>
                        Notas
                        <textarea
                          maxLength={2000}
                          rows={2}
                          value={notes}
                          onChange={(event) => setNotes(event.target.value)}
                        />
                      </label>
                    </div>
                  </details>
                </section>
              </fieldset>
              {activePlan && (
                <p className="quick-plan__notice">
                  {future
                    ? `«${activePlan.name}» seguirá su calendario actual. Este plan se activará en la fecha elegida y pausará cualquier otro plan activo.`
                    : `Al crear este plan, «${activePlan.name}» quedará en pausa. Su historial se conserva.`}
                </p>
              )}
              {future && scheduledPlan && (
                <p className="quick-plan__notice">
                  Reemplazará al plan programado «{scheduledPlan.name}», que
                  quedará en pausa.
                </p>
              )}
              {!future && scheduledPlan && (
                <p className="quick-plan__notice">
                  «{scheduledPlan.name}» sigue programado y se activará según su
                  fecha de inicio.
                </p>
              )}
              {partialPlan && (
                <div className="quick-plan__notice">
                  <strong>Tu borrador está guardado.</strong>
                  <p>
                    Reintenta para completar las asignaciones pendientes sin
                    crear otro plan.
                  </p>
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
            </main>
            <footer className="quick-plan__footer">
              <div>
                <strong>
                  {selectedDays.length
                    ? `${selectedDays.length} días por semana`
                    : "Tu semana, a tu medida"}
                </strong>
                <span>
                  {startDate === getLocalPlanDate()
                    ? "Empieza hoy"
                    : startDate
                      ? `Desde ${startDate.split("-").reverse().join("/")}`
                      : "Elige el inicio"}{" "}
                  · {durationWeeks} semanas
                </span>
              </div>
              <button
                type="button"
                className="quick-plan__primary"
                disabled={
                  saving || (!partialPlan && (!valid || unused.length > 0))
                }
                onClick={submit}
              >
                {saving
                  ? "Preparando tu plan…"
                  : partialPlan
                    ? "Reintentar creación"
                    : "Crear planificación"}
                {!saving && <ArrowRight aria-hidden="true" />}
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
