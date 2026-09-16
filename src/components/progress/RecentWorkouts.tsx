import { useRef, useState } from "react";
import { ArrowUpRight, X } from "lucide-react";
import {
  dateLabel,
  number,
  totals,
  type SessionRow,
} from "../../utils/progressDashboard";

export default function RecentWorkouts({
  sessions,
}: {
  sessions: SessionRow[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<SessionRow | null>(null);
  return (
    <section
      className="progress-section"
      aria-labelledby="recent-workouts-title"
    >
      <p className="progress-kicker">DEL ANÁLISIS AL REGISTRO</p>
      <h2 id="recent-workouts-title">Últimos entrenamientos</h2>
      {!sessions.length && (
        <p className="progress-empty">
          No hay sesiones que coincidan con los filtros.
        </p>
      )}
      <div className="progress-workout-list">
        {sessions
          .slice(-6)
          .reverse()
          .map((s) => {
            const t = totals([s], s.date, s.date);
            return (
              <button
                key={s._id}
                onClick={() => {
                  setSelected(s);
                  dialog.current?.showModal();
                }}
              >
                <span>
                  <strong>{s.routineName || "Entrenamiento"}</strong>
                  <small>{dateLabel(s.date)}</small>
                </span>
                <span>
                  {t.sets} series · {number(t.volume)} kg externos
                  <small>
                    {t.timed
                      ? `${number(t.minutes)} min · sesión completa`
                      : "Tiempo sin registrar"}
                  </small>
                </span>
                <ArrowUpRight size={18} aria-hidden="true" />
              </button>
            );
          })}
      </div>
      <dialog
        ref={dialog}
        className="progress-filter-dialog"
        aria-labelledby="workout-detail-title"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current.close();
        }}
      >
        <div className="progress-dialog-body">
          <header>
            <h2 id="workout-detail-title">
              {selected?.routineName || "Entrenamiento"}
            </h2>
            <button
              aria-label="Cerrar detalle"
              onClick={() => dialog.current?.close()}
            >
              <X size={20} />
            </button>
          </header>
          <p>
            {selected ? dateLabel(selected.date) : ""} · Ejercicios incluidos en
            los filtros
          </p>
          {selected?.exercises.map((e, i) => (
            <article
              className="progress-workout-detail"
              key={`${e.exerciseId}-${i}`}
            >
              <h3>{e.exerciseName || e.name || e.exerciseId}</h3>
              <p>
                {e.stats.completedSets} series completadas · {e.stats.reps}{" "}
                repeticiones
              </p>
              <p>
                {e.stats.externalKg
                  ? `${number(e.stats.externalKg)} kg externos`
                  : `${e.stats.muscle} · ${e.stats.loadType}`}
              </p>
            </article>
          ))}
        </div>
      </dialog>
    </section>
  );
}
