// Helpers para resumen y comparativos de sesiones (sin TypeScript)
import { getHistoryCompatibilitySignature } from './historyCompatibility'
import {
  compareExercisePerformances,
  summarizeExercisePerformance,
} from './exercisePerformance'

const muscleAliases = {
  back: 'espalda',
  bicep: 'biceps',
  biceps: 'biceps',
  chest: 'pecho',
  core: 'core',
  gluteo: 'gluteos',
  gluteos: 'gluteos',
  hombro: 'hombros',
  hombros: 'hombros',
  leg: 'piernas',
  legs: 'piernas',
  pierna: 'piernas',
  piernas: 'piernas',
  shoulder: 'hombros',
  shoulders: 'hombros',
  tricep: 'triceps',
  triceps: 'triceps',
}

const muscleLabels = {
  abdominales: 'Abdominales',
  abductores: 'Abductores',
  aductores: 'Aductores',
  antebrazos: 'Antebrazos',
  biceps: 'Bíceps',
  core: 'Core',
  cuadriceps: 'Cuádriceps',
  espalda: 'Espalda',
  gluteos: 'Glúteos',
  hombros: 'Hombros',
  isquiotibiales: 'Isquiotibiales',
  pantorrillas: 'Pantorrillas',
  pecho: 'Pecho',
  piernas: 'Piernas',
  triceps: 'Tríceps',
}

export const normalizeMuscleGroup = (value = '') => {
  const normalized = String(value || 'otros')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
  return muscleAliases[normalized] || normalized || 'otros'
}

export const formatMuscleGroup = (value = '') => {
  const normalized = normalizeMuscleGroup(value)
  if (muscleLabels[normalized]) return muscleLabels[normalized]
  return normalized
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ')
}

const asArray = (value) => (Array.isArray(value) ? value : [])

export const summarizeSession = (session) => {
  const exercises = asArray(session?.exercises).map((ex) => {
    const performance = summarizeExercisePerformance(ex)
    if (!performance) return null
    return {
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      muscleGroup: normalizeMuscleGroup(ex.muscleGroup),
      ...performance,
      compatibilitySignature: `${getHistoryCompatibilitySignature(ex)}:${performance.comparisonKey}`,
    }
  }).filter(Boolean)

  const groups = exercises.reduce((acc, ex) => {
    const g = normalizeMuscleGroup(ex.muscleGroup)
    if (!acc[g]) acc[g] = { setsCount: 0, repsTotal: 0 }
    acc[g].setsCount += ex.setsCount
    acc[g].repsTotal += ex.repsTotal
    return acc
  }, {})

  return {
    id: session?.id,
    date: session?.date,
    routineName: session?.routineName,
    exercises,
    groups,
  }
}

export const lastComparableSessions = (summaries, comparator, limit = 7, beforeDate) =>
  summaries
    .filter((s) => (!beforeDate ? true : new Date(s.date) < new Date(beforeDate)) && comparator(s))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit)

export const compareExercise = (currentSummary, historySummaries, exerciseId) => {
  const todayEx = currentSummary.exercises.find((e) => e.exerciseId === exerciseId)
  if (!todayEx) return null
  const refs = lastComparableSessions(
    historySummaries,
    (s) =>
      s.exercises.some(
        (e) =>
          e.exerciseId === exerciseId &&
          e.compatibilitySignature === todayEx.compatibilitySignature,
      ),
    1,
    currentSummary.date,
  )
  if (!refs.length) return { today: todayEx, ref: null, delta: null, status: 'Sin referencia', refCount: 0 }
  const previousExercise = refs[0].exercises.find(
    (e) =>
      e.exerciseId === exerciseId &&
      e.compatibilitySignature === todayEx.compatibilitySignature,
  )
  const refMetrics = {
    oneRMTop: previousExercise?.oneRMTop || 0,
    volume: previousExercise?.volume || 0,
    setsCount: previousExercise?.setsCount || 0,
    repsTotal: previousExercise?.repsTotal || 0,
    metric: previousExercise?.metric || 0,
    metricType: previousExercise?.metricType,
    assistanceKg: previousExercise?.assistanceKg ?? null,
    date: refs[0].date,
  }
  const delta = compareExercisePerformances(todayEx, previousExercise)
  const status = classifyDelta(delta, refs.length)
  return { today: todayEx, ref: refMetrics, delta, status, refCount: refs.length }
}

export const formatExerciseProgress = (comparison) => {
  if (!Number.isFinite(comparison?.delta)) {
    return {
      label: '--',
      detail: 'Sin referencia',
      direction: 'neutral',
    }
  }

  const delta = Number(comparison.delta)
  if (Math.abs(delta) < 1) {
    return {
      label: '0%',
      detail: 'Estable',
      direction: 'neutral',
    }
  }

  const improved = delta > 0
  return {
    label: `${improved ? '+' : ''}${Math.round(delta)}%`,
    detail: improved ? 'Mejoró' : 'Bajó',
    direction: improved ? 'up' : 'down',
  }
}

export const classifyDelta = (delta, refCount) => {
  if (!refCount || refCount < 3) return 'Insuficiente data'
  if (delta === null) return 'Sin referencia'
  if (delta >= 1) return 'Mejoró'
  if (delta <= -1) return 'Bajó'
  return 'Estable'
}
