function GoalsProgress({ goals }) {
  const data = goals || []
  if (!data.length) return null
  return (
    <section className="card" id="rutinas">
      <h4 className="text-lg font-semibold mb-3">Progreso hacia Objetivos</h4>
      <div className="flex flex-col gap-3">
        {data.map((goal) => {
          const percent = Math.min(100, Math.round((goal.current / goal.target) * 100))
          return (
            <div key={goal.name} className="rounded-lg border border-border-soft bg-white/5 px-3 py-2">
              <div className="flex items-center justify-between">
                <p className="label">{goal.name}</p>
                <span className="muted">
                  {goal.current} / {goal.target}
                </span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full mt-2 overflow-hidden">
                <span
                  className="block h-full rounded-full bg-gradient-to-r from-accent-green to-accent"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default GoalsProgress
