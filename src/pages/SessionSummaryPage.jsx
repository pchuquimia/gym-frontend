import { useMemo } from 'react'
import PropTypes from 'prop-types'
import TopBar from '../components/layout/TopBar'
import MuscleGroupSummaryCard from '../components/summary/MuscleGroupSummaryCard'
import ExerciseComparisonCard from '../components/summary/ExerciseComparisonCard'
import { muscleGroupConfig, summarizeSession, compareMuscle, compareExercise } from '../utils/sessionAnalytics'
import { useTrainingData } from '../context/TrainingContext'

const formatDateLong = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })

function SessionSummaryPage({
  sessions: propSessions = [],
  currentSession: propCurrentSession,
  onViewExerciseAnalytics = null,
  onNavigate = null,
}) {
  const { sessions: ctxSessions = [], exercises: exerciseMeta = [] } = useTrainingData()

  const normalizedCtxSessions = useMemo(() => {
    if (!ctxSessions.length) return []
    const byDate = new Map()
    ctxSessions.forEach((s) => {
      const date = s.date
      if (!byDate.has(date)) {
        byDate.set(date, { id: date, date, routineName: s.routineName || 'Entrenamiento', exercises: [] })
      }
      const sessionObj = byDate.get(date)
      const muscleGroup = exerciseMeta.find((ex) => ex.id === s.exerciseId)?.muscle || 'Sin grupo'
      const sets = (s.sets || []).map((set) => ({
        weightKg: Number(set.weightKg ?? set.weight) || 0,
        reps: Number(set.reps) || 0,
      }))
      sessionObj.exercises.push({
        exerciseId: s.exerciseId,
        exerciseName: s.exerciseName,
        muscleGroup,
        sets,
      })
    })
    return Array.from(byDate.values())
  }, [ctxSessions, exerciseMeta])

  const { currentSummary, historySummaries, currentDate } = useMemo(() => {
    const baseSessions = propSessions.length ? propSessions : normalizedCtxSessions
    if (!baseSessions.length) return { currentSummary: summarizeSession({}), historySummaries: [], currentDate: '' }
    const current =
      propCurrentSession ||
      baseSessions
        .slice()
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0]
    const curr = summarizeSession(current || {})
    const history = baseSessions
      .filter((s) => s.id !== current?.id)
      .map((s) => summarizeSession(s))
      .filter((s) => s.exercises?.length)
    return { currentSummary: curr, historySummaries: history, currentDate: current?.date }
  }, [propSessions, normalizedCtxSessions, propCurrentSession])

  const muscleKeys = useMemo(() => Object.keys(currentSummary.groups || {}), [currentSummary])

  const muscleComparisons = muscleKeys.map((key) =>
    compareMuscle(currentSummary, historySummaries, key),
  ).filter(Boolean)

  const exerciseComparisons = (currentSummary.exercises || []).map((ex, idx) => {
    const cmp = compareExercise(currentSummary, historySummaries, ex.exerciseId)
    return { ...cmp, muscleGroup: ex.muscleGroup, idx }
  })

  const handleViewProgress = (exerciseId) => {
    if (onViewExerciseAnalytics) onViewExerciseAnalytics(exerciseId)
    else if (onNavigate) onNavigate('ejercicio_analitica')
  }

  return (
    <>
      <TopBar
        title="Resumen de sesión"
        subtitle={`Hoy: ${formatDateLong(currentDate || '')} | Referencia: promedio últimos 7 entrenamientos`}
      />

      <div className="card flex flex-wrap gap-2">
        {muscleComparisons.map((mc) => {
          const label = muscleGroupConfig[mc.muscleKey]?.label || mc.muscleKey
          return (
            <span
              key={mc.muscleKey}
              className="px-3 py-1 rounded-full border border-border-soft bg-white/5 text-xs text-muted"
            >
              {label}: {mc.status} {mc.delta !== null ? `${mc.delta >= 0 ? '+' : ''}${mc.delta.toFixed(1)}%` : ''}
            </span>
          )
        })}
      </div>

      <section className="space-y-3">
        <h3 className="text-base font-semibold">Por grupo muscular</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {muscleComparisons.map((mc) => (
            <MuscleGroupSummaryCard
              key={mc.muscleKey}
              muscleLabel={muscleGroupConfig[mc.muscleKey]?.label || mc.muscleKey}
              today={mc.today}
              refData={mc.ref}
              delta={mc.delta}
              status={mc.status}
              refCount={mc.refCount}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold">Ejercicios de hoy</h3>
        <div className="grid gap-3">
          {exerciseComparisons.map((ex) => (
            <ExerciseComparisonCard
              key={`${ex.today.exerciseId}-${ex.idx}`}
              exercise={ex.today}
              refData={ex.ref}
              delta={ex.delta}
              status={ex.status}
              refCount={ex.refCount}
              onViewProgress={handleViewProgress}
              index={ex.idx}
            />
          ))}
        </div>
      </section>
    </>
  )
}

SessionSummaryPage.propTypes = {
  sessions: PropTypes.arrayOf(PropTypes.object),
  currentSession: PropTypes.object,
  onViewExerciseAnalytics: PropTypes.func,
  onNavigate: PropTypes.func,
}

export default SessionSummaryPage
