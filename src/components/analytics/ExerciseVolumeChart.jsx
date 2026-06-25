import { useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { ResponsiveBar } from '@nivo/bar'
import { ResponsiveLine } from '@nivo/line'
import { cleanSets, toIsoWeek, formatCompactWeekLabel, movingAverage } from '../../utils/trainingMetrics'
import { nivoTheme } from '../../utils/nivoTheme'

const EmptyState = () => (
  <div className="border border-dashed border-[color:var(--border)] rounded-xl p-4 text-center text-sm text-[color:var(--text-muted)]">
    <p className="font-semibold text-[color:var(--text)] mb-1">Sin datos suficientes</p>
    <p className="text-[color:var(--text-muted)] text-xs">Registra al menos 2 semanas para ver progreso</p>
  </div>
)

const buildData = ({ workouts = [], exerciseId, rangeWeeks = 12, groupBy = 'week' }) => {
  const sets = workouts
    .filter((w) => w.exerciseId === exerciseId)
    .flatMap((w) => cleanSets(w.sets || []).map((s) => ({ ...s, date: w.date })))
  if (!sets.length) return { points: [], line: [], bars: [] }

  if (groupBy === 'session') {
    const byDate = new Map()
    sets.forEach((s) => {
      const volume = (Number(s.weight) || 0) * (Number(s.reps) || 0)
      if (!byDate.has(s.date)) byDate.set(s.date, { label: s.date, volume: 0, sets: 0 })
      const curr = byDate.get(s.date)
      curr.volume += volume
      curr.sets += 1
      byDate.set(s.date, curr)
    })
    const sorted = Array.from(byDate.values()).sort((a, b) => new Date(a.label) - new Date(b.label))
    const trimmed = sorted.slice(-rangeWeeks)
    const ma3 = movingAverage(trimmed.map((w) => w.volume), 3)
    const bars = trimmed.map((w) => ({ week: w.label, volume: Math.round(w.volume), sets: w.sets }))
    const line = trimmed.map((w, idx) => ({ x: w.label, y: ma3[idx] }))
    return { points: trimmed, bars, line, isSession: true }
  }

  const byWeek = new Map()
  sets.forEach((s) => {
    const week = toIsoWeek(s.date)
    const volume = (Number(s.weight) || 0) * (Number(s.reps) || 0)
    if (!byWeek.has(week)) byWeek.set(week, { label: week, volume: 0, sets: 0 })
    const current = byWeek.get(week)
    current.volume += volume
    current.sets += 1
    byWeek.set(week, current)
  })

  const weeks = Array.from(byWeek.values())
    .sort((a, b) => (a.label > b.label ? 1 : -1))
    .slice(-rangeWeeks)

  const ma3 = movingAverage(weeks.map((w) => w.volume), 3)

  const bars = weeks.map((w) => ({ week: w.label, volume: Math.round(w.volume), sets: w.sets }))
  const line = weeks.map((w, idx) => ({ x: w.label, y: ma3[idx] }))

  return { points: weeks, bars, line, isSession: false }
}

const ExerciseVolumeChart = ({
  workouts = [],
  exerciseId,
  rangeWeeks = 12,
  mode = 'dark',
  groupBy = 'week',
}) => {
  const [view, setView] = useState('volume')
  const { points, bars, line } = useMemo(
    () => buildData({ workouts, exerciseId, rangeWeeks, groupBy }),
    [workouts, exerciseId, rangeWeeks, groupBy],
  )
  const hasData = points.length >= 1

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs">
        <button
          className={`px-3 py-1 rounded-full border ${view === 'volume' ? 'border-blue-500/40 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' : 'border-[color:var(--border)] text-[color:var(--text-muted)] hover:bg-[color:var(--bg)]'}`}
          onClick={() => setView('volume')}
          type="button"
        >
          Volumen
        </button>
        <button
          className={`px-3 py-1 rounded-full border ${view === 'trend' ? 'border-blue-500/40 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' : 'border-[color:var(--border)] text-[color:var(--text-muted)] hover:bg-[color:var(--bg)]'}`}
          onClick={() => setView('trend')}
          type="button"
        >
          Tendencia
        </button>
      </div>

      <div className="h-80">
        {hasData ? (
          view === 'volume' ? (
            <ResponsiveBar
              data={bars}
              theme={nivoTheme(mode)}
              keys={['volume']}
              indexBy="week"
              margin={{ top: 20, right: 20, bottom: 40, left: 60 }}
              padding={0.35}
              colors={['#4fa3ff']}
              axisBottom={{
                tickRotation: -25,
                tickPadding: 8,
                format: (v) => (groupBy === 'week' ? formatCompactWeekLabel(v) : v),
              }}
              axisLeft={{ legend: 'Volumen (kg·reps)', legendPosition: 'middle', legendOffset: -50, tickPadding: 6 }}
              enableGridY
              tooltip={({ data }) => (
                <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 text-xs shadow-lg">
                  <p className="font-semibold">{formatCompactWeekLabel(data.week)}</p>
                  <p>Volumen: {data.volume} kg·reps</p>
                  <p>Sets: {data.sets}</p>
                </div>
              )}
            />
          ) : (
            <ResponsiveLine
              data={[
                {
                  id: 'MA3 volumen',
                  data: line.filter((p) => p.y !== null).map((p) => ({ x: p.x, y: Number(p.y?.toFixed(1)) })),
                },
              ]}
              theme={nivoTheme(mode)}
              margin={{ top: 20, right: 20, bottom: 40, left: 60 }}
              xScale={{ type: 'point' }}
              yScale={{ type: 'linear', min: 0, max: 'auto', stacked: false }}
              axisBottom={{
                tickRotation: -25,
                tickPadding: 8,
                format: (v) => (groupBy === 'week' ? formatCompactWeekLabel(v) : v),
              }}
              axisLeft={{ legend: 'Volumen (kg·reps)', legendOffset: -50, legendPosition: 'middle', tickPadding: 6 }}
              enablePoints
              pointSize={8}
              curve="monotoneX"
              colors={['#c084fc']}
              useMesh
              tooltip={({ point }) => (
                <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 text-xs shadow-lg">
                  <p className="font-semibold">{formatCompactWeekLabel(point.data.x)}</p>
                  <p>MA3: {Number(point.data.y).toFixed(1)} kg·reps</p>
                </div>
              )}
            />
          )
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  )
}

ExerciseVolumeChart.propTypes = {
  workouts: PropTypes.arrayOf(PropTypes.object),
  exerciseId: PropTypes.string.isRequired,
  rangeWeeks: PropTypes.number,
  mode: PropTypes.oneOf(['light', 'dark']),
  groupBy: PropTypes.oneOf(['week', 'session']),
}

export default ExerciseVolumeChart
