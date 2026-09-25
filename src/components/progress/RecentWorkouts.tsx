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
  const recent = sessions
    .slice(-6)
    .reverse()
    .map((session) => ({
      session,
      summary: totals([session], session.date, session.date),
    }));
  const maximumSets = Math.max(1, ...recent.map(({ summary }) => summary.sets));
  return (
    <section
      className="progress-section"
      aria-labelledby="recent-workouts-title"
    >
      <p className="progress-kicker">SESIONES RECIENTES</p>
      <h2 id="recent-workouts-title">Tus últimos entrenamientos</h2>
      {!sessions.length && (
        <p className="progress-empty">
          No hay sesiones que coincidan con los filtros.
        </p>
      )}
      <div className="progress-workout-list">
        {recent.map(({ session: s, summary: t }) => {
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
                <span className="progress-workout-bar" aria-hidden="true">
                  <i style={{ width: `${(t.sets / maximumSets) * 100}%` }} />
                </span>
                <small>
                  {t.sets} series
                  {t.timed ? ` · ${number(t.minutes)} min` : ""}
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
