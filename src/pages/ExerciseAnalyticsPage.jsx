import { useEffect, useMemo, useState } from 'react'
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
  const { sessions = [], trainings = [], exercises = [] } = useTrainingData()
  const getThemeMode = () => {
    if (typeof document === 'undefined') return 'light'
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  }
  const [themeMode, setThemeMode] = useState(getThemeMode)
  
  const [selectedExerciseId, setSelectedExerciseId] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      const last = localStorage.getItem('last_exercise_id')
      if (last) return last
    }
    return exercises[0]?.id || ''
  })

  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    const root = document.documentElement
    const observer = new MutationObserver(() => {
      setThemeMode(getThemeMode())
    })
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  
  
  const workouts = useMemo(
    () =>
      [
        // sesiones simples
        ...sessions
          .filter((s) => s.exerciseId)
          .map((s) => ({
            exerciseId: s.exerciseId || slugify(s.exerciseName || ''),
            date: s.date,
            sets: (s.sets || []).map((set) => ({
              weight: Number(set.weightKg ?? set.weight) || 0,
              reps: Number(set.reps) || 0,
            })),
          })),
        // entrenamientos completos
        ...trainings.flatMap((t) =>
          (t.exercises || [])
            .filter((ex) => ex.exerciseId || ex.exerciseName)
            .map((ex) => ({
              exerciseId: ex.exerciseId || slugify(ex.exerciseName || ''),
              date: t.date,
              sets: (ex.sets || []).map((set) => ({
                weight: Number(set.weightKg ?? set.weight) || 0,
                reps: Number(set.reps) || 0,
              })),
            })),
        ),
      ],
    [sessions, trainings],
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
            className="rounded-full border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-2 text-sm text-[color:var(--text)] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            value={selectedExerciseId}
            onChange={(e) => setSelectedExerciseId(e.target.value)}
          >
            {exercises.map((ex) => (
              <option key={ex.id} value={ex.id} className="bg-[color:var(--card)] text-[color:var(--text)]">
                {ex.name}
              </option>
            ))}
          </select>
        </div>
        <ExerciseAnalytics
          exerciseId={selectedExerciseId || exercises[0]?.id || ''}
          exerciseName={exerciseName}
          workouts={workouts}
          mode={themeMode}
        />
      </div>
    </>
  )
}

export default ExerciseAnalyticsPage
