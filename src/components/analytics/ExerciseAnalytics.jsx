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

const ExerciseAnalytics = ({
  exerciseId = 'bench_press',
  workouts = [],
  mode = 'dark',
  summary = {},
}) => {
  const [tab, setTab] = useState('fuerza')
  const [range, setRange] = useState(12)
  const [groupBy, setGroupBy] = useState('week') // week | session
  const data = useMemo(() => (workouts.length ? workouts : workoutsMock), [workouts])
  const hasRealData = workouts.length > 0

  const pillGroup =
    'inline-flex items-center gap-1 rounded-full bg-[color:var(--bg)] p-1'
  const pillButton = (active) =>
    `px-3 py-1.5 rounded-full text-xs font-bold transition ${
      active
        ? 'bg-blue-100 text-blue-800 dark:bg-blue-200 dark:text-blue-950'
        : 'text-[color:var(--text-muted)] hover:text-[color:var(--text)]'
    }`

  return (
    <section className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--card)]">
      <div className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
            Evolución del ejercicio
          </p>
          <h3 className="line-clamp-2 text-lg font-bold leading-5 text-[color:var(--text)]">
            {tab === 'fuerza'
              ? 'Fuerza Máxima'
              : tab === 'volumen'
                ? 'Volumen Total'
                : 'Intensidad'}
          </h3>
          {!hasRealData && (
            <p className="text-xs text-[color:var(--text-muted)]">Mostrando datos de ejemplo.</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            className="h-8 rounded-lg border border-transparent bg-transparent text-xs font-bold text-[color:var(--text)] outline-none"
            value={range}
            onChange={(event) => setRange(Number(event.target.value))}
            aria-label="Rango"
          >
            {ranges.map((r) => (
              <option key={r} value={r}>
                {r} sem
              </option>
            ))}
          </select>
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
        <div className="ml-auto hidden items-center gap-2 text-xs sm:flex">
          <span className="text-[color:var(--text-muted)]">Agrupar</span>
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
      </div>

      <div className="bg-[color:var(--bg)] px-1 py-3 md:px-3">
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

      <div className="grid grid-cols-2 border-t border-[color:var(--border)]">
        <div className="p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
            PR histórico (1RM)
          </p>
          <p className="mt-1 text-lg font-black text-[color:var(--text)]">
            {summary.pr || '--'}
          </p>
        </div>
        <div className="border-l border-[color:var(--border)] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
            vs mes anterior
          </p>
          <p className="mt-1 text-lg font-black text-emerald-400">
            {summary.vsPrevious || '--'}
          </p>
        </div>
      </div>
    </section>
  )
}

ExerciseAnalytics.propTypes = {
  exerciseId: PropTypes.string,
  workouts: PropTypes.arrayOf(PropTypes.object),
  mode: PropTypes.oneOf(['light', 'dark']),
  summary: PropTypes.shape({
    pr: PropTypes.string,
    vsPrevious: PropTypes.string,
  }),
}

export default ExerciseAnalytics
