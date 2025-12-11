function RecentAchievements({ items }) {
  const data = (items || []).slice(0, 5)
  if (!data.length) return null
  return (
    <section className="card" id="historial">
      <h4 className="text-lg font-semibold mb-3">Notificaciones de Logros Recientes</h4>
      <div className="flex flex-col gap-2">
        {data.map((item) => (
          <div
            key={item.detail}
            className="flex items-center gap-3 rounded-xl px-3 py-2 bg-white/5 border border-border-soft"
          >
            <span
              className={`w-3 h-3 rounded-full ${
                item.type === 'pr' ? 'bg-accent-green' : 'bg-accent'
              } shadow-[0_0_10px_rgba(79,163,255,0.6)]`}
              aria-hidden="true"
            />
            <div>
              <p className="label">{item.title}</p>
              <p className="muted">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default RecentAchievements
