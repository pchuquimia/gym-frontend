function MetricCards({ metrics }) {
  const data = metrics || []
  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {data.map((metric) => (
        <article key={metric.label} className="card flex flex-col gap-1">
          <p className="label">{metric.label}</p>
          <div className="text-2xl font-bold">{metric.value}</div>
          <span
            className={`text-sm ${
              metric.trend === 'up'
                ? 'text-accent-green'
                : metric.trend === 'down'
                  ? 'text-accent-red'
                  : 'text-muted'
            }`}
          >
            {metric.trend === 'up' ? '↑' : metric.trend === 'down' ? '↓' : '•'} {metric.delta}
          </span>
        </article>
      ))}
    </section>
  )
}

export default MetricCards
