function statusColor(status) {
  if (status === 'improving') return 'bg-accent-green'
  if (status === 'decline') return 'bg-accent-red'
  return 'bg-accent-yellow'
}

function statusLabel(status) {
  if (status === 'improving') return 'Mejorando'
  if (status === 'decline') return 'Retroceso'
  return 'Estable'
}

function formatChange(changePct) {
  if (!Number.isFinite(changePct) || changePct === 0) return 'sin cambio'
  const value = Math.abs(changePct).toFixed(1)
  return changePct > 0 ? `+${value}% vs último` : `-${value}% vs último`
}

function ExerciseTrends({ trends }) {
  const data = trends || []
  if (!data.length) return null
  return (
    <section className="card" id="graficos">
      <h4 className="text-lg font-semibold mb-3">Tendencias Destacadas por Rutina/Ejercicio</h4>
      <div className="flex flex-col gap-2">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-3 rounded-lg border border-border-soft bg-white/5 px-3 py-2">
            <span className={`w-3 h-3 rounded-full ${statusColor(item.status)}`} aria-hidden="true" />
            <div>
              <p className="label">{item.name}</p>
              <p className="muted">
                {statusLabel(item.status)} · {formatChange(item.changePct)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default ExerciseTrends
