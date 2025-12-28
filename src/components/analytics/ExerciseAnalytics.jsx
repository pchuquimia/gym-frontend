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

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-xs text-[color:var(--text-muted)]">Exercise Analytics</p>
          <h3 className="text-lg font-semibold">{exerciseName}</h3>
        </div>
        <div className="flex items-center gap-2">
          {ranges.map((r) => (
            <button
              key={r}
              className={`px-3 py-1 rounded-full border text-xs ${range === r ? 'border-blue-500/40 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' : 'border-[color:var(--border)] text-[color:var(--text-muted)] hover:bg-[color:var(--bg)]'}`}
              onClick={() => setRange(r)}
              type="button"
            >
              {r} sem
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`px-3 py-1 rounded-full border ${tab === t.key ? 'border-blue-500/40 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' : 'border-[color:var(--border)] text-[color:var(--text-muted)] hover:bg-[color:var(--bg)]'}`}
            onClick={() => setTab(t.key)}
            type="button"
          >
            {t.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 text-xs">
          <span className="text-[color:var(--text-muted)]">Agrupar por:</span>
          <button
            type="button"
            className={`px-3 py-1 rounded-full border ${groupBy === 'week' ? 'border-blue-500/40 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' : 'border-[color:var(--border)] text-[color:var(--text-muted)] hover:bg-[color:var(--bg)]'}`}
            onClick={() => setGroupBy('week')}
          >
            Semana
          </button>
          <button
            type="button"
            className={`px-3 py-1 rounded-full border ${groupBy === 'session' ? 'border-blue-500/40 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' : 'border-[color:var(--border)] text-[color:var(--text-muted)] hover:bg-[color:var(--bg)]'}`}
            onClick={() => setGroupBy('session')}
          >
            Sesión
          </button>
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
