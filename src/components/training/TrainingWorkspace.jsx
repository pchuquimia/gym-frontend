import {
  ArrowRight,
  ChevronRight,
  Copy,
  MoreVertical,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import RoutineThumbnail from "./RoutineThumbnail";
import "./training-workspace.css";

const planningImage = "/images/dashboard-workout-completed-color.jpg";

const DAYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];
const INITIALS = ["L", "M", "X", "J", "V", "S", "D"];

export function TrainingWorkspaceHeader({ onReturn }) {
  return (
    <header className="training-workspace__header">
      <div>
        <h1>Tu entrenamiento</h1>
        <p>Organiza tus semanas y sesiones.</p>
      </div>
      {onReturn && (
        <button
          type="button"
          onClick={onReturn}
          aria-label="Volver al entrenamiento"
        >
          <RotateCcw size={20} />
        </button>
      )}
    </header>
  );
}

export function TrainingWorkspaceSection({
  view,
  hasActivePlan,
  canCreate,
  onCreate,
}) {
  const plans = view === "plans";
  return (
    <div className="training-workspace__context">
      <p>
        {plans
          ? "Tus rutinas, organizadas por semanas."
          : "Las sesiones que usas en tus planes."}
      </p>
      <div className="training-workspace__section-heading">
        <h2>
          {plans
            ? hasActivePlan
              ? "Plan actual"
              : "Tus planificaciones"
            : "Tus rutinas"}
        </h2>
        {canCreate && (
          <button type="button" onClick={onCreate}>
            <Plus size={16} aria-hidden="true" />
            {plans ? "Nuevo plan" : "Nueva rutina"}
          </button>
        )}
      </div>
    </div>
  );
}

export function TrainingPlanOverview({ plan, currentWeek, onOpen }) {
  const schedule = plan.weeklySchedule || [];
  const fixed = plan.scheduleMode === "fixed";
  const weeks = Math.max(1, Number(plan.durationWeeks) || 1);
  const week = Math.min(weeks, Math.max(1, Number(currentWeek) || 1));
  const progress = Math.round((week / weeks) * 100);
  const count = schedule.filter((day) => day.type === "training").length;
  return (
    <section className="training-plan-overview" aria-label="Plan actual">
      <div className="training-plan-overview__summary">
        <img src={planningImage} width="80" height="80" alt="" />
        <div>
          <span className="training-plan-overview__status">Activo</span>
          <h3>{plan.name}</h3>
          <p>
            {[
              plan.goal,
              `${count} ${count === 1 ? "día" : "días"} ${fixed ? "por semana" : "por ciclo"}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>
      {plan.startDate && (
        <div className="training-plan-overview__progress">
          <div>
            <span>
              Semana {week} de {weeks}
            </span>
            <span aria-hidden="true">{progress} %</span>
          </div>
          <div
            role="progressbar"
            aria-label="Avance de las semanas del plan"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            aria-valuetext={`Semana ${week} de ${weeks}`}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
      {!plan.startDate && (
        <p className="training-plan-overview__notice">
          Fecha de inicio pendiente
        </p>
      )}
      <ul
        className={`training-plan-overview__schedule ${fixed ? "" : "is-cycle"}`}
        aria-label={fixed ? "Días programados de la semana" : "Orden del ciclo"}
      >
        {(fixed
          ? Array.from({ length: 7 }, (_, index) => schedule[index])
          : schedule
        ).map((day, index) => (
          <li
            key={day?.slotId || index}
            className={day?.type === "training" ? "is-training" : ""}
            aria-label={`${fixed ? DAYS[index] : `Día ${index + 1}`}: ${!day ? "Sin configurar" : day.type === "training" ? day.focus || "Entrenamiento" : day.type === "recovery" ? "Recuperación activa" : "Descanso"}`}
          >
            <span aria-hidden="true">
              {fixed ? INITIALS[index] : index + 1}
            </span>
            <i aria-hidden="true" />
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="training-plan-overview__open"
        onClick={onOpen}
      >
        Ver planificación
        <ArrowRight size={19} aria-hidden="true" />
      </button>
    </section>
  );
}

export function RoutineLibraryGroups({
  groups,
  canEdit,
  onOpen,
  onEdit,
  onDuplicate,
  onDelete,
  onOptionsToggle,
  duplicatingRoutineId,
}) {
  const menuAction = (event, action, routine) => {
    event.currentTarget.closest("details")?.removeAttribute("open");
    action(routine);
  };
  return (
    <div className="training-routine-groups">
      {groups.map((group) => (
        <section key={group.id} className="training-routine-group">
          <header>
            <div>
              <h3>
                {group.id === "available"
                  ? "Sin planificación"
                  : group.status === "active"
                    ? "En tu plan"
                    : group.eyebrow}
              </h3>
              {group.id !== "available" && <p>{group.title}</p>}
            </div>
            <span>{group.routines.length}</span>
          </header>
          <div className="training-routine-list">
            {group.routines.map((routine) => {
              const id = routine.id || routine._id;
              const exerciseCount =
                routine.totalExerciseCount ?? routine.exercises?.length ?? 0;
              return (
                <article key={id} className="training-routine-row">
                  <button
                    type="button"
                    className="training-routine-row__open"
                    aria-label={`Ver ejercicios de ${routine.name}`}
                    onClick={() => onOpen(routine)}
                  >
                    <RoutineThumbnail
                      routine={routine}
                      image={routine.preview?.[0]?.url}
                    />
                    <span className="training-routine-row__copy">
                      <strong>{routine.name}</strong>
                      <small>
                        {exerciseCount}{" "}
                        {exerciseCount === 1 ? "ejercicio" : "ejercicios"}
                        {routine.estimatedMinutes > 0
                          ? ` · ${routine.estimatedMinutes} min aprox.`
                          : ""}
                      </small>
                    </span>
                    {!canEdit && <ChevronRight size={18} aria-hidden="true" />}
                  </button>
                  {canEdit && (
                    <details
                      name="routine-options"
                      data-routine-options
                      onToggle={onOptionsToggle}
                      className="overflow-menu training-routine-row__menu"
                    >
                      <summary
                        aria-label={`Opciones de ${routine.name}`}
                        className="overflow-menu-trigger"
                      >
                        <MoreVertical size={19} />
                      </summary>
                      <div className="overflow-menu-panel">
                        <button
                          type="button"
                          onClick={(event) =>
                            menuAction(event, onEdit, routine)
                          }
                        >
                          <Pencil size={16} />
                          Editar
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(duplicatingRoutineId)}
                          onClick={(event) =>
                            menuAction(event, onDuplicate, routine)
                          }
                        >
                          <Copy size={16} />
                          {duplicatingRoutineId === id
                            ? "Duplicando..."
                            : "Duplicar"}
                        </button>
                        <button
                          type="button"
                          className="training-routine-row__delete"
                          onClick={(event) =>
                            menuAction(event, onDelete, routine)
                          }
                        >
                          <Trash2 size={16} />
                          Eliminar
                        </button>
                      </div>
                    </details>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
