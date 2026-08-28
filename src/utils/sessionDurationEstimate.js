const MIN_VALID_SESSION_SECONDS = 10 * 60;
const MAX_VALID_SESSION_SECONDS = 4 * 60 * 60;
const DEFAULT_REST_SECONDS = 90;
const DEFAULT_SET_WORK_SECONDS = 45;
const EXERCISE_TRANSITION_SECONDS = 120;
const SESSION_PREPARATION_SECONDS = 5 * 60;

const positiveNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
};

const normalizeId = (value) => String(value || "").trim();

const getRoutineIds = (routine = {}) =>
  new Set(
    [
      routine.id,
      routine._id,
      routine.sourceRoutineId,
      routine.raw?.id,
      routine.raw?._id,
      routine.raw?.sourceRoutineId,
    ]
      .map(normalizeId)
      .filter(Boolean),
  );

const getSessionSeconds = (training = {}) => {
  const recorded =
    positiveNumber(training.durationOverrideSeconds) ||
    positiveNumber(training.durationSeconds);
  if (recorded) return recorded;

  const workSeconds = positiveNumber(training.workSeconds);
  const restSeconds = positiveNumber(training.restSeconds);
  return workSeconds + restSeconds;
};

const getPlannedSetCount = (exercise = {}) => {
  if (Array.isArray(exercise.sets)) return exercise.sets.length;
  return Math.max(
    1,
    Math.round(
      positiveNumber(exercise.sets) ||
        positiveNumber(exercise.series) ||
        positiveNumber(exercise.setCount) ||
        3,
    ),
  );
};

const estimateFromRoutine = (routine = {}) => {
  const raw = routine.raw || routine;
  const exercises = (Array.isArray(raw.exercises) ? raw.exercises : []).filter(
    (exercise) => !exercise?.isExtra,
  );

  if (!exercises.length) {
    const exerciseCount = Math.max(
      1,
      Math.round(positiveNumber(routine.exerciseCount) || 1),
    );
    return Math.round(5 + exerciseCount * 7.5);
  }

  const estimatedSeconds = exercises.reduce((total, exercise, index) => {
    const setCount = getPlannedSetCount(exercise);
    const restSeconds =
      positiveNumber(exercise.restSeconds) ||
      positiveNumber(exercise.restDurationSeconds) ||
      positiveNumber(exercise.restTime) ||
      DEFAULT_REST_SECONDS;
    const workSeconds = setCount * DEFAULT_SET_WORK_SECONDS;
    const betweenSetRestSeconds = Math.max(0, setCount - 1) * restSeconds;
    const transitionSeconds =
      index < exercises.length - 1 ? EXERCISE_TRANSITION_SECONDS : 0;
    return total + workSeconds + betweenSetRestSeconds + transitionSeconds;
  }, SESSION_PREPARATION_SECONDS);

  return Math.max(20, Math.round(estimatedSeconds / 60));
};

export function estimateFullSessionDuration(
  routine = {},
  trainings = [],
  { maxHistory = 8 } = {},
) {
  const routineIds = getRoutineIds(routine);
  const routineName = String(routine.name || routine.raw?.name || "")
    .trim()
    .toLocaleLowerCase("es");

  const matchingSessions = (Array.isArray(trainings) ? trainings : [])
    .filter((training) => {
      const trainingRoutineId = normalizeId(training?.routineId);
      if (trainingRoutineId && routineIds.has(trainingRoutineId)) return true;
      return (
        !trainingRoutineId &&
        routineName &&
        String(training?.routineName || "")
          .trim()
          .toLocaleLowerCase("es") === routineName
      );
    })
    .map((training) => ({
      seconds: getSessionSeconds(training),
      timestamp: Date.parse(training.date || training.createdAt || 0) || 0,
    }))
    .filter(
      ({ seconds }) =>
        seconds >= MIN_VALID_SESSION_SECONDS &&
        seconds <= MAX_VALID_SESSION_SECONDS,
    )
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, Math.max(1, maxHistory));

  if (matchingSessions.length) {
    const averageSeconds =
      matchingSessions.reduce((sum, session) => sum + session.seconds, 0) /
      matchingSessions.length;
    return {
      minutes: Math.max(1, Math.round(averageSeconds / 60)),
      source: "history",
      sampleSize: matchingSessions.length,
      includesRest: true,
    };
  }

  return {
    minutes: estimateFromRoutine(routine),
    source: "estimate",
    sampleSize: 0,
    includesRest: true,
  };
}

export function formatSessionDuration(totalMinutes = 0) {
  const minutes = Math.max(0, Math.round(Number(totalMinutes) || 0));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (!hours) return `${remainingMinutes} min`;
  if (!remainingMinutes) return `${hours} h`;
  return `${hours} h ${remainingMinutes} min`;
}
