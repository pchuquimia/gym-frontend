import PropTypes from 'prop-types'
import { ResponsiveLine } from '@nivo/line'
import { cleanSets, toIsoWeek, estimate1RM, formatCompactWeekLabel } from '../../utils/trainingMetrics'
import { nivoTheme } from '../../utils/nivoTheme'

const EmptyState = () => (
  <div className="border border-dashed border-[color:var(--border)] rounded-xl p-4 text-center text-sm text-[color:var(--text-muted)]">
    <p className="font-semibold text-[color:var(--text)] mb-1">Sin datos suficientes</p>
    <p className="text-[color:var(--text-muted)] text-xs">Registra al menos 2 semanas para ver progreso</p>
  </div>
)

const ExerciseIntensityChart = ({ workouts, exerciseId, rangeWeeks = 12, mode = 'dark', groupBy = 'week' }) => {
  const sets = workouts
    .filter((w) => w.exerciseId === exerciseId)
    .flatMap((w) => cleanSets(w.sets || []).map((s) => ({ ...s, date: w.date })))

  const points =
    groupBy === 'session'
      ? (() => {
          const byDate = new Map()
          sets.forEach((s) => {
            const oneRM = estimate1RM(s.weight, s.reps)
            if (!byDate.has(s.date) || oneRM > byDate.get(s.date).oneRM) {
              byDate.set(s.date, { label: s.date, oneRM, sets: [] })
            }
            const current = byDate.get(s.date)
            current.sets.push({ weight: s.weight, reps: s.reps })
            current.oneRM = Math.max(current.oneRM, oneRM)
            byDate.set(s.date, current)
          })
          return Array.from(byDate.values())
            .sort((a, b) => new Date(a.label) - new Date(b.label))
            .slice(-rangeWeeks)
        })()
      : (() => {
          const byWeek = new Map()
          sets.forEach((s) => {
            const week = toIsoWeek(s.date)
            const oneRM = estimate1RM(s.weight, s.reps)
            if (!byWeek.has(week) || oneRM > byWeek.get(week).oneRM) {
              byWeek.set(week, { label: week, oneRM, sets: [] })
            }
            const current = byWeek.get(week)
            current.sets.push({ weight: s.weight, reps: s.reps })
            current.oneRM = Math.max(current.oneRM, oneRM)
            byWeek.set(week, current)
          })
          return Array.from(byWeek.values())
            .sort((a, b) => (a.label > b.label ? 1 : -1))
            .slice(-rangeWeeks)
        })()

  const series = (() => {
    const avg = points.map((w) => {
      const vals = w.sets.map((s) => (Number(s.weight) || 0) / (w.oneRM || 1) * 100).filter((v) => Number.isFinite(v))
      const value = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
      return { x: w.label, y: Number(value.toFixed(1)), oneRM: w.oneRM }
    })
    const max = points.map((w) => {
      const vals = w.sets.map((s) => (Number(s.weight) || 0) / (w.oneRM || 1) * 100).filter((v) => Number.isFinite(v))
      const value = vals.length ? Math.max(...vals) : 0
      return { x: w.label, y: Number(value.toFixed(1)), oneRM: w.oneRM }
    })
    return [
      { id: '%1RM promedio', data: avg },
      { id: '%1RM máximo', data: max },
    ]
  })()

  const hasData = points.length >= 1

  return (
    <div className="space-y-2">
      <div className="h-80">
        {hasData ? (
          <ResponsiveLine
            data={series}
            theme={nivoTheme(mode)}
            margin={{ top: 20, right: 20, bottom: 40, left: 50 }}
            xScale={{ type: 'point' }}
            yScale={{ type: 'linear', min: 0, max: 100, stacked: false }}
            axisBottom={{
              tickPadding: 8,
              tickRotation: -25,
              format: (v) => (groupBy === 'week' ? formatCompactWeekLabel(v) : v),
            }}
            axisLeft={{ legend: '%1RM', legendOffset: -40, legendPosition: 'middle', tickPadding: 6, format: (v) => `${v}%` }}
            colors={['#22c55e', '#f97316']}
            enablePoints
            pointSize={8}
            curve="monotoneX"
            useMesh
            tooltip={({ point }) => (
              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 text-xs shadow-lg">
                <p className="font-semibold">{point.serieId}</p>
                <p className="text-[color:var(--text-muted)]">{formatCompactWeekLabel(point.data.x)}</p>
                <p>Valor: {Number(point.data.y).toFixed(1)}%</p>
                {point.data.oneRM && <p className="text-[color:var(--text-muted)]">1RM semana: {Number(point.data.oneRM).toFixed(1)} kg</p>}
              </div>
            )}
          />
        ) : (
          <EmptyState />
        )}
      </div>
      <p className="text-xs text-[color:var(--text-muted)]">
        65–80%: hipertrofia · 85%+: fuerza. Ajusta según tu fase y fatiga.
      </p>
    </div>
  )
}

ExerciseIntensityChart.propTypes = {
  workouts: PropTypes.arrayOf(PropTypes.object),
  exerciseId: PropTypes.string.isRequired,
  rangeWeeks: PropTypes.number,
  mode: PropTypes.oneOf(['light', 'dark']),
  groupBy: PropTypes.oneOf(['week', 'session']),
}

export default ExerciseIntensityChart
