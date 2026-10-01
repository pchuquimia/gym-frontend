import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CalendarRange,
  Dumbbell,
} from "lucide-react";
import {
  getLocalPlanDate,
  getMondayFirstDayIndex,
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

export default function QuickPlanSetup({
  routines,
  onCreate,
  onClose,
  onStart,
  onView,
}) {
  const dialogRef = useRef(null);
  const [selectedRoutineId, setSelectedRoutineId] = useState(
    String(routines[0]?.id || routines[0]?._id || ""),
  );
  const [selectedDays, setSelectedDays] = useState(() => [
    getMondayFirstDayIndex(),
  ]);
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createdPlan, setCreatedPlan] = useState(null);
  const [partialPlan, setPartialPlan] = useState(null);

  const selectedRoutine = useMemo(
    () =>
      routines.find(
        (routine) => String(routine.id || routine._id) === selectedRoutineId,
      ),
    [routines, selectedRoutineId],
  );
  const trainsToday = selectedDays.includes(getMondayFirstDayIndex());

  useEffect(() => {
    if (!selectedRoutine && routines.length) {
      setSelectedRoutineId(String(routines[0].id || routines[0]._id));
    }
  }, [routines, selectedRoutine]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const toggleDay = (dayIndex) => {
    setSelectedDays((current) =>
      current.includes(dayIndex)
        ? current.filter((day) => day !== dayIndex)
        : [...current, dayIndex].sort((a, b) => a - b),
    );
    setError("");
  };

  const submit = async () => {
    if (!selectedRoutine || !selectedDays.length || saving) return;
    setSaving(true);
    setError("");
    try {
      const plan = await onCreate({
        routineId: selectedRoutineId,
        selectedDays,
        durationWeeks,
        startDate: getLocalPlanDate(),
      });
      setCreatedPlan(plan);
    } catch (failure) {
      if (failure?.draftPlan) setPartialPlan(failure.draftPlan);
      setError(
        failure?.message ||
          "No pudimos crear la planificación. Inténtalo de nuevo.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="quick-plan" role="presentation">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-plan-title"
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !saving) onClose();
        }}
        className="quick-plan__dialog"
      >
        <header className="quick-plan__header">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar creación de planificación"
            className="quick-plan__back"
          >
            <ArrowLeft aria-hidden="true" />
          </button>
          <span>Tu planificación</span>
          <span className="quick-plan__header-spacer" />
        </header>

        {createdPlan ? (
          <div className="quick-plan__success">
            <span className="quick-plan__success-icon">
              <Check aria-hidden="true" />
            </span>
            <p className="quick-plan__eyebrow">Plan listo</p>
            <h1 id="quick-plan-title">Tu plan está listo.</h1>
            <p>
              {selectedRoutine?.name} está programada {selectedDays.length}{" "}
              {selectedDays.length === 1 ? "día" : "días"} por semana durante{" "}
              {durationWeeks} semanas.
            </p>
            <button
              type="button"
              className="quick-plan__primary"
              onClick={() =>
                trainsToday ? onStart(createdPlan) : onView(createdPlan)
              }
            >
              {trainsToday ? "Ir a entrenar" : "Ver mi planificación"}{" "}
              <ArrowRight aria-hidden="true" />
            </button>
            {trainsToday ? (
              <button
                type="button"
                className="quick-plan__secondary"
                onClick={() => onView(createdPlan)}
              >
                Ver mi planificación
              </button>
            ) : null}
          </div>
        ) : partialPlan ? (
          <div className="quick-plan__success">
            <p className="quick-plan__eyebrow">Borrador guardado</p>
            <h1 id="quick-plan-title">Falta terminar tu planificación.</h1>
            <p>
              {error} El borrador está guardado para que puedas completarlo.
            </p>
            <button
              type="button"
              className="quick-plan__primary"
              onClick={() => onView(partialPlan)}
            >
              Abrir borrador <ArrowRight aria-hidden="true" />
            </button>
          </div>
        ) : (
          <>
            <main className="quick-plan__content">
              <div className="quick-plan__intro">
                <span className="quick-plan__intro-icon">
                  <CalendarRange aria-hidden="true" />
                </span>
                <p className="quick-plan__eyebrow">En menos de un minuto</p>
                <h1 id="quick-plan-title">Organiza tu semana.</h1>
                <p>
                  Elige una rutina y los días en que quieres repetirla. Podrás
                  ajustar tu plan después.
                </p>
              </div>

              <section
                className="quick-plan__section"
                aria-labelledby="quick-plan-routine-title"
              >
                <div className="quick-plan__section-heading">
                  <span>01</span>
                  <h2 id="quick-plan-routine-title">¿Qué rutina entrenarás?</h2>
                </div>
                <div className="quick-plan__routines">
                  {routines.map((routine) => {
                    const routineId = String(routine.id || routine._id);
                    const selected = routineId === selectedRoutineId;
                    const count = (routine.exercises || []).filter(
                      (exercise) => !exercise.isExtra,
                    ).length;
                    return (
                      <button
                        key={routineId}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setSelectedRoutineId(routineId)}
                        className={`quick-plan__routine ${selected ? "is-selected" : ""}`}
                      >
                        <span className="quick-plan__routine-icon">
                          <Dumbbell aria-hidden="true" />
                        </span>
                        <span className="quick-plan__routine-name">
                          <strong>{routine.name}</strong>
                          <small>
                            {count} {count === 1 ? "ejercicio" : "ejercicios"}
                          </small>
                        </span>
                        <span className="quick-plan__routine-check">
                          {selected ? <Check aria-hidden="true" /> : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section
                className="quick-plan__section"
                aria-labelledby="quick-plan-days-title"
              >
                <div className="quick-plan__section-heading">
                  <span>02</span>
                  <h2 id="quick-plan-days-title">¿Qué días entrenarás?</h2>
                </div>
                <p className="quick-plan__hint">
                  Marcamos hoy para que puedas empezar. Selecciona otros días si
                  quieres.
                </p>
                <div className="quick-plan__days">
                  {WEEKDAYS.map(([index, short, full]) => (
                    <button
                      key={index}
                      type="button"
                      aria-label={full}
                      aria-pressed={selectedDays.includes(index)}
                      onClick={() => toggleDay(index)}
                    >
                      {short}
                    </button>
                  ))}
                </div>
                {!selectedDays.length ? (
                  <p className="quick-plan__validation">
                    Selecciona al menos un día.
                  </p>
                ) : null}
              </section>

              <div className="quick-plan__duration">
                <label htmlFor="quick-plan-duration">Duración del plan</label>
                <select
                  id="quick-plan-duration"
                  value={durationWeeks}
                  onChange={(event) =>
                    setDurationWeeks(Number(event.target.value))
                  }
                >
                  <option value={2}>2 semanas</option>
                  <option value={4}>4 semanas</option>
                  <option value={8}>8 semanas</option>
                </select>
              </div>
            </main>

            <footer className="quick-plan__footer">
              <div>
                <strong>
                  {selectedDays.length}{" "}
                  {selectedDays.length === 1 ? "día" : "días"} por semana
                </strong>
                <span>
                  {trainsToday ? "Puedes empezar hoy" : "Plan desde hoy"} ·{" "}
                  {durationWeeks} semanas
                </span>
              </div>
              {error ? <p role="alert">{error}</p> : null}
              <button
                type="button"
                className="quick-plan__primary"
                disabled={saving || !selectedRoutine || !selectedDays.length}
                onClick={submit}
              >
                {saving ? "Creando tu plan..." : "Crear planificación"}
                {!saving ? <ArrowRight aria-hidden="true" /> : null}
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
