import { useEffect, useMemo, useState } from 'react'
import TopBar from '../components/layout/TopBar'
import ExerciseAnalytics from '../components/analytics/ExerciseAnalytics'
import Card from '../components/ui/card'
import Badge from '../components/ui/badge'
import { useTrainingData } from '../context/TrainingContext'
import { getExerciseImageUrl } from '../utils/cloudinary'

const slugify = (text) =>
  text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')

const toValidDate = (value) => {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === 'number') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    const normalized = trimmed.length <= 10 ? `${trimmed}T00:00:00` : trimmed
    const d = new Date(normalized)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

const formatShort = (value) => {
  const d = toValidDate(value)
  if (!d) return '--'
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

const getDateTimestamp = (value) => {
  const d = toValidDate(value)
  return d ? d.getTime() : 0
}

const flattenSets = (sets = []) =>
  (sets || []).flatMap((set) => {
    const entries = Array.isArray(set?.entries) && set.entries.length ? set.entries : null
    if (!entries) {
      return [
        {
          weight: Number(set?.weightKg ?? set?.weight ?? set?.kg ?? 0) || 0,
          reps: Number(set?.reps ?? 0) || 0,
        },
      ]
    }
    return entries.map((entry) => ({
      weight: Number(entry?.weightKg ?? entry?.weight ?? entry?.kg ?? 0) || 0,
      reps: Number(entry?.reps ?? 0) || 0,
    }))
  })

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
  const [selectedMuscle, setSelectedMuscle] = useState('')

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
            sets: flattenSets(s.sets || []),
          })),
        // entrenamientos completos
        ...trainings.flatMap((t) =>
          (t.exercises || [])
            .filter((ex) => ex.exerciseId || ex.exerciseName)
            .map((ex) => ({
              exerciseId: ex.exerciseId || slugify(ex.exerciseName || ''),
              date: t.date,
              sets: flattenSets(ex.sets || []),
            })),
        ),
      ],
    [sessions, trainings],
  )

  const muscleOptions = useMemo(() => {
    const set = new Set()
    exercises.forEach((ex) => {
      const group = ex.muscle || ex.muscleGroup || 'Sin grupo'
      set.add(group)
    })
    return Array.from(set)
  }, [exercises])

  const filteredExercises = useMemo(() => {
    if (!selectedMuscle) return exercises
    return exercises.filter(
      (ex) => (ex.muscle || ex.muscleGroup || 'Sin grupo') === selectedMuscle,
    )
  }, [exercises, selectedMuscle])

  useEffect(() => {
    if (!selectedExerciseId && exercises.length) {
      setSelectedExerciseId(exercises[0].id)
    }
  }, [exercises, selectedExerciseId])

  useEffect(() => {
    if (!muscleOptions.length) return
    if (!selectedMuscle) {
      const currentExercise = exercises.find((ex) => ex.id === selectedExerciseId)
      const group = currentExercise?.muscle || currentExercise?.muscleGroup
      setSelectedMuscle(group || muscleOptions[0])
      return
    }
    if (!muscleOptions.includes(selectedMuscle)) {
      setSelectedMuscle(muscleOptions[0])
    }
  }, [muscleOptions, selectedMuscle, exercises, selectedExerciseId])

  useEffect(() => {
    if (!filteredExercises.length) return
    if (!filteredExercises.find((ex) => ex.id === selectedExerciseId)) {
      setSelectedExerciseId(filteredExercises[0].id)
    }
  }, [filteredExercises, selectedExerciseId])

  useEffect(() => {
    if (typeof localStorage === 'undefined') return
    if (!selectedExerciseId) return
    localStorage.setItem('last_exercise_id', selectedExerciseId)
  }, [selectedExerciseId])

  const selectedExercise = useMemo(
    () => exercises.find((ex) => ex.id === selectedExerciseId) || null,
    [exercises, selectedExerciseId],
  )
  const selectedWorkouts = useMemo(
    () => workouts.filter((w) => w.exerciseId === selectedExerciseId),
    [workouts, selectedExerciseId],
  )

  const stats = useMemo(() => {
    let best = null
    let lastDate = null
    let lastTs = 0
    let totalVolume = 0
    selectedWorkouts.forEach((workout) => {
      const ts = getDateTimestamp(workout.date)
      if (ts > lastTs) {
        lastTs = ts
        lastDate = workout.date
      }
      workout.sets.forEach((set) => {
        const weight = Number(set.weight ?? set.weightKg ?? 0) || 0
        const reps = Number(set.reps ?? 0) || 0
        const volume = weight * reps
        totalVolume += volume
        if (weight <= 0 && reps <= 0) return
        if (
          !best ||
          weight > best.weight ||
          (weight === best.weight && reps > best.reps) ||
          (weight === best.weight && reps === best.reps && ts < best.ts)
        ) {
          best = { weight, reps, date: workout.date, ts }
        }
      })
    })
    const totalSessions = selectedWorkouts.length
    const avgVolume = totalSessions ? Math.round(totalVolume / totalSessions) : 0
    return {
      totalSessions,
      lastDate,
      best,
      avgVolume,
    }
  }, [selectedWorkouts])

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
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
          <Card className="p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 rounded-2xl overflow-hidden border border-[color:var(--border)] bg-[color:var(--bg)]">
                {selectedExercise && getExerciseImageUrl(selectedExercise, { width: 240, height: 240 }) ? (
                  <img
                    src={getExerciseImageUrl(selectedExercise, { width: 240, height: 240 })}
                    alt={exerciseName}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-full w-full grid place-items-center text-xs text-[color:var(--text-muted)]">
                    Sin imagen
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-muted)] font-semibold">
                  Ejercicio
                </p>
                <p className="text-base font-semibold text-[color:var(--text)] truncate">{exerciseName}</p>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-[11px]">
                    {selectedExercise?.muscle || selectedExercise?.muscleGroup || 'Sin grupo'}
                  </Badge>
                  <span className="text-xs text-[color:var(--text-muted)]">
                    {stats.totalSessions ? `${stats.totalSessions} sesiones` : 'Sin sesiones'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-[color:var(--text-muted)]">Grupo muscular</p>
              <div className="flex flex-wrap gap-2">
                {muscleOptions.map((group) => (
                  <button
                    key={group}
                    type="button"
                    onClick={() => setSelectedMuscle(group)}
                    className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition ${
                      selectedMuscle === group
                        ? 'border-blue-500/40 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
                        : 'border-[color:var(--border)] text-[color:var(--text-muted)] hover:bg-[color:var(--bg)]'
                    }`}
                  >
                    {group}
                  </button>
                ))}
                {!muscleOptions.length && (
                  <span className="text-xs text-[color:var(--text-muted)]">Sin grupos disponibles</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[color:var(--text-muted)]">Ejercicios</p>
                <span className="text-[11px] text-[color:var(--text-muted)]">
                  {filteredExercises.length} disponibles
                </span>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {filteredExercises.map((ex) => {
                  const thumb = getExerciseImageUrl(ex, { width: 120, height: 120 })
                  const isActive = ex.id === selectedExerciseId
                  return (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => setSelectedExerciseId(ex.id)}
                      className={`w-full flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${
                        isActive
                          ? 'border-blue-500/40 bg-blue-50 dark:bg-blue-500/10'
                          : 'border-[color:var(--border)] hover:bg-[color:var(--bg)]'
                      }`}
                    >
                      <div className="h-10 w-10 rounded-lg overflow-hidden border border-[color:var(--border)] bg-[color:var(--bg)]">
                        {thumb ? (
                          <img src={thumb} alt={ex.name} className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <div className="h-full w-full grid place-items-center text-[11px] text-[color:var(--text-muted)]">
                            {(ex.name || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[color:var(--text)] truncate">{ex.name}</p>
                        <p className="text-[11px] text-[color:var(--text-muted)]">
                          {ex.muscle || ex.muscleGroup || 'Sin grupo'}
                        </p>
                      </div>
                      {isActive && (
                        <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-300">Activo</span>
                      )}
                    </button>
                  )
                })}
                {!filteredExercises.length && (
                  <div className="rounded-xl border border-dashed border-[color:var(--border)] p-3 text-xs text-[color:var(--text-muted)]">
                    No hay ejercicios para este grupo muscular.
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                  Mejor set
                </p>
                <p className="text-sm font-semibold text-[color:var(--text)]">
                  {stats.best ? `${stats.best.weight}kg x ${stats.best.reps}` : '--'}
                </p>
              </div>
              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                  Primera fecha PR
                </p>
                <p className="text-sm font-semibold text-[color:var(--text)]">
                  {stats.best?.date ? formatShort(stats.best.date) : '--'}
                </p>
              </div>
              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                  Ultima sesion
                </p>
                <p className="text-sm font-semibold text-[color:var(--text)]">
                  {stats.lastDate ? formatShort(stats.lastDate) : '--'}
                </p>
              </div>
              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                  Volumen prom.
                </p>
                <p className="text-sm font-semibold text-[color:var(--text)]">
                  {stats.avgVolume ? `${stats.avgVolume} kg` : '--'}
                </p>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <ExerciseAnalytics
              exerciseId={selectedExerciseId || exercises[0]?.id || ''}
              exerciseName={exerciseName}
              workouts={workouts}
              mode={themeMode}
            />
          </div>
        </div>
      </div>
    </>
  )
}

export default ExerciseAnalyticsPage
