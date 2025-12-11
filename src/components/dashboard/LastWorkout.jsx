function LastWorkout({ session }) {
  if (!session) {
    return (
      <section className="card" id="registrar">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="label">Último Entrenamiento Detallado</p>
            <h4 className="text-lg font-semibold">Sin sesiones registradas</h4>
          </div>
        </div>
      </section>
    )
  }

  const duration =
    session.trainingDurationSeconds && session.trainingDurationSeconds > 0
      ? `${Math.round(session.trainingDurationSeconds / 60)} min`
      : '—'

  return (
    <section className="card" id="registrar">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="label">Último Entrenamiento Detallado</p>
          <h4 className="text-lg font-semibold">
            {session.exerciseName} · {new Date(session.date).toLocaleDateString('es-ES')} · {duration}
          </h4>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {session.sets.map((set, idx) => (
          <div key={idx} className="rounded-lg border border-border-soft bg-white/5 px-3 py-2">
            <p className="label">Set {idx + 1}</p>
            <p className="muted">
              {set.weight} kg x {set.reps} reps
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default LastWorkout
