import { useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { ResponsiveLine } from '@nivo/line'
import { estimate1RM, toIsoWeek, cleanSets, movingAverage, formatCompactWeekLabel } from '../../utils/trainingMetrics'
import { nivoTheme } from '../../utils/nivoTheme'

const muscleGroups = {
  chest: {
    label: 'Pecho',
    exercises: ['bench_press', 'incline_bench_press', 'dumbbell_press', 'chest_press_machine'],
    weights: { bench_press: 1.2, incline_bench_press: 1.1, dumbbell_press: 0.9, chest_press_machine: 0.8 },
  },
  back: {
    label: 'Espalda',
    exercises: ['barbell_row', 'lat_pulldown', 'seated_row', 'deadlift'],
    weights: { deadlift: 1.3, barbell_row: 1.1, lat_pulldown: 0.9, seated_row: 0.9 },
  },
  legs: {
    label: 'Pierna',
    exercises: ['squat', 'leg_press', 'romanian_deadlift', 'lunges'],
    weights: { squat: 1.3, leg_press: 1.0, romanian_deadlift: 1.1, lunges: 0.8 },
  },
  shoulders: {
    label: 'Hombro',
    exercises: ['ohp', 'shoulder_press_machine', 'lateral_raise', 'arnold_press'],
    weights: { ohp: 1.1, shoulder_press_machine: 0.9, lateral_raise: 0.6, arnold_press: 0.9 },
  },
  arms: {
    label: 'Brazos',
    exercises: ['bicep_curl', 'tricep_pushdown', 'dips', 'hammer_curl'],
    weights: { dips: 1.0, bicep_curl: 0.7, tricep_pushdown: 0.7, hammer_curl: 0.7 },
  },
}

const EmptyState = () => (
  <div className="border border-dashed border-[color:var(--border)] rounded-xl p-4 text-center text-sm text-[color:var(--text-muted)]">
    <p className="font-semibold text-[color:var(--text)] mb-1">Sin datos suficientes</p>
    <p className="text-[color:var(--text-muted)] text-xs">Registra al menos 2 semanas para ver progreso</p>
  </div>
)

const statusFromDelta = (delta) => {
  if (delta === null) return { label: 'Insuficiente data', color: 'text-[color:var(--text-muted)]', bg: 'bg-[color:var(--bg)]' }
  if (delta >= 1) return { label: `Mejorando ${delta.toFixed(1)}%`, color: 'text-emerald-300', bg: 'bg-emerald-400/10' }
  if (delta <= -1) return { label: `Retroceso ${delta.toFixed(1)}%`, color: 'text-rose-300', bg: 'bg-rose-400/10' }
  return { label: `Estable ${delta.toFixed(1)}%`, color: 'text-amber-300', bg: 'bg-amber-400/10' }
}

const buildSeries = ({ workouts = [], muscleKey, rangeWeeks }) => {
  const group = muscleGroups[muscleKey]
  if (!group) return { series: [], weeks: [], delta: null }
  const weightMap = group.weights || {}

  const sets = workouts
    .filter((w) => group.exercises.includes(w.exerciseId))
    .flatMap((w) => cleanSets(w.sets || []).map((s) => ({ ...s, date: w.date, exerciseId: w.exerciseId })))

  if (!sets.length) return { series: [], weeks: [], delta: null }

  const exerciseWeekMax = new Map()
  sets.forEach((s) => {
    const wk = toIsoWeek(s.date)
    const key = `${s.exerciseId}-${wk}`
    const oneRM = estimate1RM(s.weight, s.reps)
    if (!exerciseWeekMax.has(key) || oneRM > exerciseWeekMax.get(key).oneRM) {
      exerciseWeekMax.set(key, { week: wk, exerciseId: s.exerciseId, oneRM })
    }
  })

  const muscleWeekIndex = new Map()
  Array.from(exerciseWeekMax.values()).forEach((item) => {
    const factor = weightMap[item.exerciseId] || 1
    if (!muscleWeekIndex.has(item.week)) muscleWeekIndex.set(item.week, { weighted: 0, factorSum: 0 })
    const current = muscleWeekIndex.get(item.week)
    current.weighted += item.oneRM * factor
    current.factorSum += factor
    muscleWeekIndex.set(item.week, current)
  })

  const weeks = Array.from(muscleWeekIndex.entries())
    .map(([week, data]) => ({
      week,
      index: data.factorSum ? data.weighted / data.factorSum : 0,
    }))
    .sort((a, b) => (a.week > b.week ? 1 : -1))

  const trimmed = weeks.slice(-rangeWeeks)
  const ma3 = movingAverage(trimmed.map((w) => w.index), 3)

  const series = [
    {
      id: 'Índice de fuerza',
      data: trimmed.map((w) => ({ x: w.week, y: Number(w.index.toFixed(1)) })),
    },
    {
      id: 'Tendencia (MA3)',
      data: trimmed.map((w, idx) => ({ x: w.week, y: ma3[idx] })),
    },
  ]

  const last4 = trimmed.slice(-4).map((w) => w.index)
  const prev4 = trimmed.slice(-8, -4).map((w) => w.index)
  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null)
  const avgLast4 = avg(last4)
  const avgPrev4 = avg(prev4)
  const delta = avgLast4 !== null && avgPrev4 ? ((avgLast4 - avgPrev4) / avgPrev4) * 100 : null

  return { series, weeks: trimmed, delta }
}

const MuscleProgressWidget = ({ workouts, rangeWeeks = 12, mode = 'dark', onViewDetails }) => {
  const [muscle, setMuscle] = useState('chest')

  const { series, weeks, delta } = useMemo(
    () => buildSeries({ workouts: workouts || [], muscleKey: muscle, rangeWeeks }),
    [workouts, muscle, rangeWeeks],
  )

  const status = statusFromDelta(delta)

  if (weeks.length < 2) {
    return (
      <div className="card space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Progreso por músculo</h3>
          <select
            className="rounded-full border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-1 text-sm text-[color:var(--text)]"
            value={muscle}
            onChange={(e) => setMuscle(e.target.value)}
          >
            {Object.entries(muscleGroups).map(([key, val]) => (
              <option key={key} value={key}>
                {val.label}
              </option>
            ))}
          </select>
        </div>
        <EmptyState />
      </div>
    )
  }

  return (
    <div className="card space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold">Progreso por músculo</h3>
          <p className="text-xs text-[color:var(--text-muted)]">Índice de fuerza (1RM ponderado) + MA3</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="rounded-full border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-1 text-sm text-[color:var(--text)]"
            value={muscle}
            onChange={(e) => setMuscle(e.target.value)}
          >
            {Object.entries(muscleGroups).map(([key, val]) => (
              <option key={key} value={key}>
                {val.label}
              </option>
            ))}
          </select>
          <span className={`text-xs px-3 py-1 rounded-full border ${status.bg} ${status.color}`}>
            {status.label}
          </span>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveLine
          data={series}
          theme={nivoTheme(mode)}
          margin={{ top: 16, right: 16, bottom: 36, left: 50 }}
          xScale={{ type: 'point' }}
          yScale={{ type: 'linear', min: 'auto', max: 'auto', stacked: false }}
          axisBottom={{ tickPadding: 8, tickRotation: -25, format: (v) => formatCompactWeekLabel(v) }}
          axisLeft={{ legend: 'Índice de fuerza (kg)', legendOffset: -42, legendPosition: 'middle', tickPadding: 6 }}
          colors={['#4fa3ff', '#c084fc']}
          curve="monotoneX"
          enablePoints
          pointSize={7}
          useMesh
          enableGridX={false}
          tooltip={({ point }) => {
            const { data: d } = point
            return (
              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 text-xs shadow-lg">
                <p className="font-semibold">{point.serieId}</p>
                <p className="text-[color:var(--text-muted)]">{formatCompactWeekLabel(d.x)}</p>
                <p>Valor: {d.y ? `${Number(d.y).toFixed(1)} kg` : '—'}</p>
              </div>
            )
          }}
        />
      </div>

      <div className="flex justify-end">
        <button className="ghost-btn text-xs" type="button" onClick={() => onViewDetails?.()}>
          Ver detalles
        </button>
      </div>
    </div>
  )
}

MuscleProgressWidget.propTypes = {
  workouts: PropTypes.arrayOf(PropTypes.object),
  rangeWeeks: PropTypes.number,
  mode: PropTypes.oneOf(['light', 'dark']),
  onViewDetails: PropTypes.func,
}

MuscleProgressWidget.defaultProps = {
  workouts: [],
  rangeWeeks: 12,
  mode: 'dark',
  onViewDetails: null,
}

export default MuscleProgressWidget
