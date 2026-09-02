// Helpers para resumen y comparativos de sesiones (sin TypeScript)
import { estimate1RM } from './trainingMetrics'
import { getEffectiveWeightKg } from './weightConfig'
import { getHistoryCompatibilitySignature } from './historyCompatibility'

export const muscleGroupConfig = {
  espalda: {
    label: 'Espalda',
    weights: { pull_up: 0.35, barbell_row: 0.35, lat_pulldown: 0.2, cable_row: 0.1 },
  },
  pecho: {
    label: 'Pecho',
    weights: { bench_press: 0.4, incline_bench_press: 0.3, dumbbell_press: 0.2, chest_fly: 0.1 },
  },
  piernas: {
    label: 'Pierna',
    weights: { squat: 0.4, leg_press: 0.25, romanian_deadlift: 0.2, lunges: 0.15 },
  },
  hombros: {
    label: 'Hombro',
    weights: { ohp: 0.35, shoulder_press_machine: 0.3, lateral_raise: 0.2, arnold_press: 0.15 },
  },
  triceps: {
    label: 'Tríceps',
    weights: { dips: 0.35, tricep_pushdown: 0.25, skullcrusher: 0.2, close_grip_press: 0.2 },
  },
  biceps: {
    label: 'Bíceps',
    weights: { barbell_curl: 0.35, hammer_curl: 0.25, preacher_curl: 0.2, cable_curl: 0.2 },
  },
}

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

const expandSets = (sets = [], weightConfig = {}) =>
  asArray(sets).flatMap((set) => {
    const entries = Array.isArray(set?.entries) && set.entries.length ? set.entries : null
    if (!entries) {
      return [
        {
          weightKg: getEffectiveWeightKg(
            set?.weightKg ?? set?.weight ?? set?.kg,
            weightConfig,
          ),
          reps: Number(set?.reps ?? 0),
          done: set?.done,
        },
      ]
    }
    return entries.map((entry) => ({
      weightKg: getEffectiveWeightKg(
        entry?.weightKg ?? entry?.weight ?? entry?.kg,
        weightConfig,
      ),
      reps: Number(entry?.reps ?? 0),
      done: entry?.done ?? set?.done,
    }))
  })

const cleanSets = (sets = [], weightConfig = {}) =>
  expandSets(sets, weightConfig).filter(
    (s) =>
      s?.done !== false &&
      Number(s?.weightKg) > 0 &&
      Number(s?.reps) > 0 &&
      Number.isFinite(Number(s?.weightKg)),
  )

const selectTopSet = (sets = []) =>
  [...sets].sort((a, b) => {
    const strengthDifference =
      estimate1RM(b.weightKg, b.reps) - estimate1RM(a.weightKg, a.reps)
    if (strengthDifference) return strengthDifference
    if (Number(b.weightKg) === Number(a.weightKg)) return Number(b.reps) - Number(a.reps)
    return Number(b.weightKg) - Number(a.weightKg)
  })[0]

export const summarizeSession = (session) => {
  const exercises = asArray(session?.exercises).map((ex) => {
    const validSets = cleanSets(ex.sets || [], ex)
    if (!validSets.length) return null
    const topSet = selectTopSet(validSets)
    const oneRMTop = estimate1RM(topSet.weightKg, topSet.reps)
    const volume = validSets.reduce((acc, s) => acc + Number(s.weightKg) * Number(s.reps), 0)
    const repsTotal = validSets.reduce((acc, s) => acc + Number(s.reps), 0)
    return {
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      muscleGroup: normalizeMuscleGroup(ex.muscleGroup),
      topSet,
      oneRMTop,
      volume,
      setsCount: validSets.length,
      repsTotal,
      compatibilitySignature: getHistoryCompatibilitySignature(ex),
    }
  }).filter(Boolean)

  const groups = exercises.reduce((acc, ex) => {
    const g = normalizeMuscleGroup(ex.muscleGroup)
    if (!acc[g]) acc[g] = { volume: 0, bestOneRM: 0, setsCount: 0, repsTotal: 0, strengthIndex: 0 }
    acc[g].volume += ex.volume
    acc[g].bestOneRM = Math.max(acc[g].bestOneRM, ex.oneRMTop)
    acc[g].setsCount += ex.setsCount
    acc[g].repsTotal += ex.repsTotal
    const weightMap = muscleGroupConfig[g]?.weights || {}
    const factor = weightMap[ex.exerciseId] ?? 1
    acc[g].strengthIndex += factor * ex.oneRMTop
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

const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null)

export const compareMuscle = (currentSummary, historySummaries, muscleKey) => {
  const today = currentSummary.groups[muscleKey]
  if (!today) return null
  const refs = lastComparableSessions(historySummaries, (s) => !!s.groups[muscleKey], 7, currentSummary.date)
  if (!refs.length) return { muscleKey, today, ref: null, delta: null, status: 'Sin referencia', refCount: 0 }
  const refMetrics = {
    volume: avg(refs.map((s) => s.groups[muscleKey].volume)),
    bestOneRM: avg(refs.map((s) => s.groups[muscleKey].bestOneRM)),
    setsCount: avg(refs.map((s) => s.groups[muscleKey].setsCount)),
    repsTotal: avg(refs.map((s) => s.groups[muscleKey].repsTotal)),
    strengthIndex: avg(refs.map((s) => s.groups[muscleKey].strengthIndex)),
  }
  const delta = refMetrics.strengthIndex
    ? ((today.strengthIndex - refMetrics.strengthIndex) / refMetrics.strengthIndex) * 100
    : null
  const status = classifyDelta(delta, refs.length)
  return { muscleKey, today, ref: refMetrics, delta, status, refCount: refs.length }
}

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
    date: refs[0].date,
  }
  const delta = refMetrics.oneRMTop
    ? ((todayEx.oneRMTop - refMetrics.oneRMTop) / refMetrics.oneRMTop) * 100
    : null
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
