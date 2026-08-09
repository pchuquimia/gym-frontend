import { useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { ResponsiveBar } from '@nivo/bar'
import { ResponsiveLine } from '@nivo/line'
import { cleanSets, toIsoWeek, formatCompactWeekLabel, movingAverage } from '../../utils/trainingMetrics'
import { nivoTheme } from '../../utils/nivoTheme'
import ChartSampleState from './ChartSampleState'

const EmptyState = () => (
  <div className="grid h-full place-items-center border border-dashed border-[color:var(--border)] p-4 text-center text-sm text-[color:var(--text-muted)]">
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
      <div className="grid w-fit grid-cols-2 border border-[color:var(--border)] bg-[color:var(--bg)] p-1 text-xs">
        <button
          className={`h-8 px-3 text-[11px] font-black uppercase ${view === 'volume' ? 'theme-accent-solid' : 'text-[color:var(--text-muted)]'}`}
          onClick={() => setView('volume')}
          type="button"
        >
          Volumen
        </button>
        <button
          className={`h-8 px-3 text-[11px] font-black uppercase ${view === 'trend' ? 'theme-accent-solid' : 'text-[color:var(--text-muted)]'}`}
          onClick={() => setView('trend')}
          type="button"
        >
          Tendencia
        </button>
      </div>

      <div className="h-64 sm:h-72">
        {hasData ? (
          view === 'volume' ? (
            <ResponsiveBar
              data={bars}
              theme={nivoTheme(mode)}
              keys={['volume']}
              indexBy="week"
              margin={{ top: 16, right: 12, bottom: 38, left: 52 }}
              padding={0.35}
              colors={mode === 'dark' ? ['#e2ff00'] : ['#ff5722']}
              axisBottom={{
                tickRotation: -25,
                tickPadding: 8,
                format: (v) => (groupBy === 'week' ? formatCompactWeekLabel(v) : v),
              }}
              axisLeft={{ legend: 'Volumen (kg·reps)', legendPosition: 'middle', legendOffset: -50, tickPadding: 6 }}
              enableGridY
              tooltip={({ data }) => (
                <div className="rounded border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 text-xs shadow-lg">
                  <p className="font-semibold">{formatCompactWeekLabel(data.week)}</p>
                  <p>Volumen: {data.volume} kg·reps</p>
                  <p>Sets: {data.sets}</p>
                </div>
              )}
            />
          ) : points.length === 1 ? (
            <ChartSampleState
              value={`${Math.round(points[0].volume)} kg`}
              detail={`${points[0].sets} series en la primera observacion`}
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
              margin={{ top: 16, right: 12, bottom: 38, left: 52 }}
              xScale={{ type: 'point' }}
              yScale={{ type: 'linear', min: 0, max: 'auto', stacked: false }}
              axisBottom={{
                tickRotation: -25,
                tickPadding: 8,
                format: (v) => (groupBy === 'week' ? formatCompactWeekLabel(v) : v),
              }}
              axisLeft={{ legend: 'Volumen (kg·reps)', legendOffset: -50, legendPosition: 'middle', tickPadding: 6 }}
              enablePoints
              pointSize={6}
              curve="monotoneX"
              colors={mode === 'dark' ? ['#e2ff00'] : ['#ff5722']}
              useMesh
              tooltip={({ point }) => (
                <div className="rounded border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 text-xs shadow-lg">
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
