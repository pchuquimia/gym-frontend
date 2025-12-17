// Utilidades de métricas y fechas para analítica de ejercicios

export const estimate1RM = (weightKg = 0, reps = 0) => {
  const w = Number(weightKg) || 0
  const r = Number(reps) || 0
  if (w <= 0 || r <= 0) return 0
  return w * (1 + r / 30) // Epley
}

export const toIsoWeek = (isoDate) => {
  const date = new Date(`${isoDate}T00:00:00`)
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((date - yearStart) / 86400000 + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

export const formatCompactWeekLabel = (weekKey) => {
  const [year, wk] = weekKey.split('-W')
  return `W${wk} ${year.slice(-2)}`
}

export const cleanSets = (sets = []) =>
  sets.filter((s) => Number(s?.weight) >= 0 && Number(s?.reps) > 0 && Number.isFinite(Number(s?.reps)))

export const flattenWorkouts = (workouts = []) =>
  workouts.flatMap((w) =>
    (w.sets || []).map((s) => ({
      date: w.date,
      exerciseId: s.exerciseId || w.exerciseId,
      weight: Number(s.weight) || 0,
      reps: Number(s.reps) || 0,
    })),
  )

export const movingAverage = (values, window) => {
  const res = []
  for (let i = 0; i < values.length; i += 1) {
    if (i + 1 < window) {
      res.push(null)
      continue
    }
    const slice = values.slice(i - window + 1, i + 1)
    const avg = slice.reduce((acc, v) => acc + v, 0) / window
    res.push(Number(avg.toFixed(1)))
  }
  return res
}
