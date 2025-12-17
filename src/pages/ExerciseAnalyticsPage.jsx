import { useMemo, useState } from 'react'
import TopBar from '../components/layout/TopBar'
import ExerciseAnalytics from '../components/analytics/ExerciseAnalytics'
import { useTrainingData } from '../context/TrainingContext'

const slugify = (text) =>
  text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')

function ExerciseAnalyticsPage() {
  const { sessions = [], exercises = [] } = useTrainingData()
  const [selectedExerciseId, setSelectedExerciseId] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      const last = localStorage.getItem('last_exercise_id')
      if (last) return last
    }
    return exercises[0]?.id || ''
  })

  const workouts = useMemo(
    () =>
      sessions
        .filter((s) => s.exerciseId)
        .map((s) => ({
          exerciseId: s.exerciseId || slugify(s.exerciseName || ''),
          date: s.date,
          sets: (s.sets || []).map((set) => ({
            weight: Number(set.weightKg ?? set.weight) || 0,
            reps: Number(set.reps) || 0,
          })),
        })),
    [sessions],
  )

  const exerciseName =
    exercises.find((ex) => ex.id === selectedExerciseId)?.name ||
    sessions.find((s) => s.exerciseId === selectedExerciseId)?.exerciseName ||
    'Ejercicio'

  return (
    <>
      <TopBar
        title="Gráficas y análisis"
        subtitle="Analiza fuerza, volumen e intensidad por ejercicio"
      />
      <div className="card space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm text-muted">Selecciona ejercicio</p>
          <select
            className="rounded-full border border-border-soft bg-white/5 px-4 py-2 text-sm text-white"
            value={selectedExerciseId}
            onChange={(e) => setSelectedExerciseId(e.target.value)}
          >
            {exercises.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </select>
        </div>
        <ExerciseAnalytics
          exerciseId={selectedExerciseId || exercises[0]?.id || ''}
          exerciseName={exerciseName}
          workouts={workouts}
          mode="dark"
        />
      </div>
    </>
  )
}

export default ExerciseAnalyticsPage
