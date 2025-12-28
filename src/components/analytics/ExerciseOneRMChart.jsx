import PropTypes from 'prop-types'
import { ResponsiveLine } from '@nivo/line'
import { estimate1RM, toIsoWeek, cleanSets, formatCompactWeekLabel, movingAverage } from '../../utils/trainingMetrics'
import { nivoTheme } from '../../utils/nivoTheme'

const EmptyState = ({ title, description }) => (
  <div className="border border-dashed border-[color:var(--border)] rounded-xl p-4 text-center text-sm text-[color:var(--text-muted)]">
    <p className="font-semibold text-[color:var(--text)] mb-1">{title}</p>
    <p className="text-[color:var(--text-muted)] text-xs">{description}</p>
  </div>
)

const KPI = ({ label, value }) => (
  <div className="flex-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2">
    <p className="text-xs text-[color:var(--text-muted)]">{label}</p>
    <p className="text-lg font-semibold">{value}</p>
  </div>
)

const calcKPIs = (weeks, fullWeeks) => {
  if (!weeks.length) return { pr: '—', delta: '—' }
  const pr = Math.max(...fullWeeks.map((w) => w.oneRM))
  const last4 = weeks.slice(-4).map((w) => w.oneRM)
  const prev4 = weeks.slice(-8, -4).map((w) => w.oneRM)
  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null)
  const avgLast4 = avg(last4)
  const avgPrev4 = avg(prev4)
  let delta = '—'
  if (avgLast4 && avgPrev4) {
    const pct = ((avgLast4 - avgPrev4) / avgPrev4) * 100
    delta = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`
  }
  return { pr: `${pr.toFixed(1)} kg`, delta }
}

const buildData = ({ workouts = [], exerciseId, rangeWeeks = 12, groupBy = 'week' }) => {
  const sets = workouts
    .filter((w) => w.exerciseId === exerciseId)
    .flatMap((w) => cleanSets(w.sets || []).map((s) => ({ ...s, date: w.date })))

  if (!sets.length) return { series: [], points: [], full: [] }

  if (groupBy === 'session') {
    const byDate = new Map()
    sets.forEach((s) => {
      const oneRM = estimate1RM(s.weight, s.reps)
      if (!byDate.has(s.date) || oneRM > byDate.get(s.date).oneRM) {
        byDate.set(s.date, { label: s.date, oneRM, topSet: { weight: s.weight, reps: s.reps } })
      }
    })
    const sorted = Array.from(byDate.values()).sort((a, b) => new Date(a.label) - new Date(b.label))
    const trimmed = sorted.slice(-rangeWeeks)
    const ma3 = movingAverage(trimmed.map((p) => p.oneRM), 3)
    const series = [
      { id: '1RM por sesión', data: trimmed.map((p) => ({ x: p.label, y: Number(p.oneRM.toFixed(1)), topSet: p.topSet })) },
      { id: 'Tendencia (MA 3)', data: trimmed.map((p, idx) => ({ x: p.label, y: ma3[idx], topSet: p.topSet })) },
    ]
    return { series, points: trimmed, full: sorted, isSession: true }
  }

  const byWeek = new Map()
  sets.forEach((s) => {
    const week = toIsoWeek(s.date)
    const oneRM = estimate1RM(s.weight, s.reps)
    if (!byWeek.has(week) || oneRM > byWeek.get(week).oneRM) {
      byWeek.set(week, { label: week, oneRM, topSet: { weight: s.weight, reps: s.reps }, date: s.date })
    }
  })

  const weeksSorted = Array.from(byWeek.values()).sort((a, b) => (a.label > b.label ? 1 : -1))
  const trimmed = weeksSorted.slice(-rangeWeeks)
  const ma3 = movingAverage(trimmed.map((w) => w.oneRM), 3)

  const series = [
    {
      id: '1RM semanal',
      data: trimmed.map((w) => ({ x: w.label, y: Number(w.oneRM.toFixed(1)), topSet: w.topSet })),
    },
    {
      id: 'Tendencia (MA 3)',
      data: trimmed.map((w, idx) => ({
        x: w.label,
        y: ma3[idx],
        topSet: w.topSet,
      })),
    },
  ]

  return { series, points: trimmed, full: weeksSorted, isSession: false }
}

const ExerciseOneRMChart = ({ workouts, exerciseId, rangeWeeks = 12, mode = 'dark', groupBy = 'week' }) => {
  const { series, points, full } = buildData({ workouts, exerciseId, rangeWeeks, groupBy })
  const kpis = calcKPIs(points, full)

  const hasData = points.length >= 1
  const hasTrend = points.length >= 2

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <KPI label="PR histórico (1RM)" value={kpis.pr} />
        <KPI label="Cambio vs 4 semanas previas" value={kpis.delta} />
      </div>
      <div className="h-80">
        {hasData ? (
          <ResponsiveLine
            data={series}
            theme={nivoTheme(mode)}
            margin={{ top: 20, right: 20, bottom: 40, left: 50 }}
            xScale={{ type: 'point' }}
            yScale={{ type: 'linear', stacked: false, min: 'auto', max: 'auto' }}
            axisBottom={{
              tickPadding: 8,
              tickRotation: -25,
              format: (v) => (groupBy === 'week' ? formatCompactWeekLabel(v) : v),
            }}
            axisLeft={{ legend: '1RM (kg)', legendOffset: -40, legendPosition: 'middle', tickPadding: 6 }}
            colors={['#4fa3ff', '#c084fc']}
            enablePoints
            pointSize={8}
            curve="monotoneX"
            enableGridX={false}
            useMesh
            layers={[
              'grid',
              'markers',
              'axes',
              'areas',
              'lines',
              hasTrend ? 'points' : () => null,
              'slices',
              'mesh',
              'legends',
            ]}
            tooltip={({ point }) => {
              const { data: d } = point
              return (
                <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 text-xs shadow-lg">
                  <p className="font-semibold">{point.serieId}</p>
                  <p className="text-[color:var(--text-muted)]">{d.xFormatted || d.x}</p>
                  <p>1RM: {d.y ? `${Number(d.y).toFixed(1)} kg` : '—'}</p>
                  {d.topSet && (
                    <p className="text-[color:var(--text-muted)]">Top set: {d.topSet.weight} kg x {d.topSet.reps}</p>
                  )}
                </div>
              )
            }}
          />
        ) : (
          <EmptyState title="Sin datos" description="Registra al menos 1 sesión para ver la curva." />
        )}
      </div>
    </div>
  )
}

ExerciseOneRMChart.propTypes = {
  workouts: PropTypes.arrayOf(PropTypes.object),
  exerciseId: PropTypes.string.isRequired,
  rangeWeeks: PropTypes.number,
  mode: PropTypes.oneOf(['light', 'dark']),
  groupBy: PropTypes.oneOf(['week', 'session']),
}

export default ExerciseOneRMChart
