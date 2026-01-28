import { useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import ExerciseOneRMChart from './ExerciseOneRMChart'
import ExerciseVolumeChart from './ExerciseVolumeChart'
import ExerciseIntensityChart from './ExerciseIntensityChart'
import { workoutsMock } from './workoutsMock'

const tabs = [
  { key: 'fuerza', label: 'Fuerza' },
  { key: 'volumen', label: 'Volumen' },
  { key: 'intensidad', label: 'Intensidad' },
]

const ranges = [4, 8, 12, 24]

const ExerciseAnalytics = ({ exerciseId = 'bench_press', exerciseName = 'Bench Press', workouts = [], mode = 'dark' }) => {
  const [tab, setTab] = useState('fuerza')
  const [range, setRange] = useState(12)
  const [groupBy, setGroupBy] = useState('week') // week | session
  const data = useMemo(() => (workouts.length ? workouts : workoutsMock), [workouts])
  const hasRealData = workouts.length > 0

  const pillGroup =
    'inline-flex items-center gap-1 rounded-full border border-[color:var(--border)] bg-[color:var(--bg)] p-1'
  const pillButton = (active) =>
    `px-3 py-1 rounded-full text-xs font-semibold transition ${
      active
        ? 'bg-[color:var(--card)] text-[color:var(--text)] shadow-sm'
        : 'text-[color:var(--text-muted)] hover:text-[color:var(--text)]'
    }`

  return (
    <div className="card p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-muted)] font-semibold">
            Evolucion del ejercicio
          </p>
          <h3 className="text-lg font-semibold text-[color:var(--text)]">{exerciseName}</h3>
          {!hasRealData && (
            <p className="text-xs text-[color:var(--text-muted)]">Mostrando datos de ejemplo.</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs text-[color:var(--text-muted)]">Rango</span>
          <div className={pillGroup}>
            {ranges.map((r) => (
              <button key={r} className={pillButton(range === r)} onClick={() => setRange(r)} type="button">
                {r} sem
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className={pillGroup}>
          {tabs.map((t) => (
            <button key={t.key} className={pillButton(tab === t.key)} onClick={() => setTab(t.key)} type="button">
              {t.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs">
          <span className="text-[color:var(--text-muted)]">Agrupar por</span>
          <div className={pillGroup}>
            <button type="button" className={pillButton(groupBy === 'week')} onClick={() => setGroupBy('week')}>
              Semana
            </button>
            <button type="button" className={pillButton(groupBy === 'session')} onClick={() => setGroupBy('session')}>
              Sesion
            </button>
          </div>
        </div>
      </div>

      <div className="border border-[color:var(--border)] rounded-2xl bg-[color:var(--bg)] p-3">
        {tab === 'fuerza' && (
          <ExerciseOneRMChart workouts={data} exerciseId={exerciseId} rangeWeeks={range} mode={mode} groupBy={groupBy} />
        )}
        {tab === 'volumen' && (
          <ExerciseVolumeChart workouts={data} exerciseId={exerciseId} rangeWeeks={range} mode={mode} groupBy={groupBy} />
        )}
        {tab === 'intensidad' && (
          <ExerciseIntensityChart workouts={data} exerciseId={exerciseId} rangeWeeks={range} mode={mode} groupBy={groupBy} />
        )}
      </div>
    </div>
  )
}

ExerciseAnalytics.propTypes = {
  exerciseId: PropTypes.string,
  exerciseName: PropTypes.string,
  workouts: PropTypes.arrayOf(PropTypes.object),
  mode: PropTypes.oneOf(['light', 'dark']),
}

export default ExerciseAnalytics
