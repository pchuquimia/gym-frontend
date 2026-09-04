import { estimateSetWorkSeconds } from "./trainingTiming";
import { getRecentRoutineTrainings } from "./sessionDurationEstimate";

const DEFAULT_REFERENCE_WEIGHT_KG = 75;
const REST_SECONDS_PER_INTERVAL = 2 * 60;
const REST_MET = 1.5;
const BASELINE_MET = 1;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toPositiveNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
};

const hasTrackedNumber = (value) =>
  value !== null &&
  value !== undefined &&
  value !== "" &&
  Number.isFinite(Number(value)) &&
  Number(value) >= 0;

const getDurationSeconds = (training = {}) =>
  toPositiveNumber(training.durationOverrideSeconds) ||
  toPositiveNumber(training.durationSeconds);

const fitSegmentsToDuration = (workSeconds, restSeconds, durationSeconds) => {
  const total = workSeconds + restSeconds;
  if (!durationSeconds || total <= durationSeconds || total <= 0) {
    return { workSeconds, restSeconds };
  }
  const scale = durationSeconds / total;
  return {
    workSeconds: workSeconds * scale,
    restSeconds: restSeconds * scale,
  };
};

const getActiveSegmentCalories = (met, seconds, weightKg) =>
  (Math.max(0, met - BASELINE_MET) * 3.5 * weightKg * (seconds / 60)) / 200;

const setLooksCompleted = (set = {}) => {
  const entries = Array.isArray(set.entries) ? set.entries : [];
  if (entries.length) {
    const hasCompletionState = entries.some(
      (entry) => entry?.done !== undefined || entry?.completedAt,
    );
    return hasCompletionState
      ? entries.every((entry) => entry?.done === true || entry?.completedAt)
      : entries.some(
          (entry) =>
            toPositiveNumber(entry?.reps) ||
            toPositiveNumber(entry?.weightKg ?? entry?.weight ?? entry?.kg),
        );
  }
  if (set.done !== undefined || set.completedAt) {
    return set.done === true || Boolean(set.completedAt);
  }
  return Boolean(
    toPositiveNumber(set.reps) ||
    toPositiveNumber(set.weightKg ?? set.weight ?? set.kg),
  );
};

export const countCompletedTrainingSets = (training = {}) =>
  (Array.isArray(training.exercises) ? training.exercises : []).reduce(
    (total, exercise) =>
      total +
      (Array.isArray(exercise?.sets) ? exercise.sets : []).filter(
        setLooksCompleted,
      ).length,
    0,
  );

const estimateCompletedWorkSeconds = (training = {}) =>
  (Array.isArray(training.exercises) ? training.exercises : []).reduce(
    (total, exercise) =>
      total +
      (Array.isArray(exercise?.sets) ? exercise.sets : []).reduce(
        (exerciseTotal, set) =>
          setLooksCompleted(set)
            ? exerciseTotal + estimateSetWorkSeconds(set)
            : exerciseTotal,
        0,
      ),
    0,
  );

export function estimateTrainingCalories(
  training = {},
  { weightKg, referenceWeightKg = DEFAULT_REFERENCE_WEIGHT_KG } = {},
) {
  const recordedSeconds = getDurationSeconds(training);
  const completedSets = countCompletedTrainingSets(training);
  const hasWorkTracking = hasTrackedNumber(training.workSeconds);
  const hasRestTracking = hasTrackedNumber(training.restSeconds);
  const hasTimingBreakdown = hasWorkTracking || hasRestTracking;
  const eventWorkSeconds = (
    Array.isArray(training.timeEvents) ? training.timeEvents : []
  )
    .filter((event) => event?.type === "set_complete")
    .reduce((sum, event) => sum + toPositiveNumber(event.workSeconds), 0);
  const hasReliableStoredWork =
    hasWorkTracking &&
    (eventWorkSeconds > 0 || hasTrackedNumber(training.preparationSeconds));
  const estimatedWorkSeconds = estimateCompletedWorkSeconds(training);
  const recordedWorkSeconds =
    eventWorkSeconds ||
    (hasReliableStoredWork ? Number(training.workSeconds) : 0);
  const workWasEstimated = completedSets > 0 && recordedWorkSeconds <= 0;
  const durationWasEstimated = !recordedSeconds && completedSets > 0;
  const breakdownWasEstimated =
    completedSets > 0 && (!hasTimingBreakdown || workWasEstimated);

  let workSeconds =
    recordedWorkSeconds > 0 ? recordedWorkSeconds : estimatedWorkSeconds;
  let restSeconds = hasRestTracking
    ? Number(training.restSeconds)
    : Math.max(0, completedSets - 1) * REST_SECONDS_PER_INTERVAL;

  ({ workSeconds, restSeconds } = fitSegmentsToDuration(
    workSeconds,
    restSeconds,
    recordedSeconds,
  ));

  const usesWholeSessionFallback =
    !completedSets && !hasTimingBreakdown && recordedSeconds > 0;
  if (usesWholeSessionFallback) {
    workSeconds = recordedSeconds;
    restSeconds = 0;
  }

  const calculatedSeconds = workSeconds + restSeconds;
  const durationMinutes = calculatedSeconds / 60;
  const sessionMinutes = recordedSeconds
    ? recordedSeconds / 60
    : durationMinutes;
  const excludedSeconds = recordedSeconds
    ? Math.max(0, recordedSeconds - calculatedSeconds)
    : 0;
  const validWeight = toPositiveNumber(weightKg);
  const effectiveWeightKg = validWeight || toPositiveNumber(referenceWeightKg);
  const usesReferenceWeight = !validWeight;

  if (!durationMinutes || !effectiveWeightKg) {
    return {
      calories: 0,
      minCalories: 0,
      maxCalories: 0,
      durationMinutes: 0,
      activeSeconds: 0,
      sessionMinutes: Math.round(sessionMinutes),
      workMinutes: 0,
      restMinutes: 0,
      excludedMinutes: Math.round(excludedSeconds / 60),
      completedSets,
      met: 0,
      intensityLabel: "Sin datos",
      densityPercent: 0,
      weightKg: effectiveWeightKg || 0,
      usesReferenceWeight,
      durationWasEstimated,
      breakdownWasEstimated,
      activeCalories: true,
      available: false,
    };
  }

  const density = calculatedSeconds
    ? clamp(workSeconds / calculatedSeconds, 0, 1)
    : 0;
  const workMinutes = workSeconds / 60;
  const setsPerWorkMinute = workMinutes ? completedSets / workMinutes : 0;
  const setPaceScore = completedSets ? clamp(setsPerWorkMinute / 0.5, 0, 1) : 0;
  const workMet = usesWholeSessionFallback ? 3.5 : 3.5 + setPaceScore * 1.5;
  const workCalories = getActiveSegmentCalories(
    workMet,
    workSeconds,
    effectiveWeightKg,
  );
  const restCalories = getActiveSegmentCalories(
    REST_MET,
    restSeconds,
    effectiveWeightKg,
  );
  const calories = workCalories + restCalories;
  const met = calculatedSeconds
    ? (workMet * workSeconds + REST_MET * restSeconds) / calculatedSeconds
    : 0;
  const uncertainty =
    usesReferenceWeight || durationWasEstimated || breakdownWasEstimated
      ? 0.3
      : 0.2;
  const roundedCalories = Math.max(1, Math.round(calories));

  return {
    calories: roundedCalories,
    minCalories: Math.max(1, Math.round(calories * (1 - uncertainty))),
    maxCalories: Math.max(1, Math.round(calories * (1 + uncertainty))),
    durationMinutes: Math.round(durationMinutes),
    activeSeconds: Math.max(0, Math.round(calculatedSeconds)),
    sessionMinutes: Math.round(sessionMinutes),
    workMinutes: Math.round(workMinutes),
    restMinutes: Math.round(restSeconds / 60),
    excludedMinutes: Math.round(excludedSeconds / 60),
    completedSets,
    met: Number(met.toFixed(1)),
    intensityLabel:
      met >= 5.35 ? "Alta" : met >= 4.25 ? "Media-alta" : "Moderada",
    densityPercent: Math.round(density * 100),
    weightKg: Number(effectiveWeightKg.toFixed(1)),
    usesReferenceWeight,
    durationWasEstimated,
    breakdownWasEstimated,
    activeCalories: true,
    available: true,
  };
}

export function estimateRoutineCaloriesFromHistory(
  routine = {},
  trainings = [],
  { maxHistory = 8, ...calorieOptions } = {},
) {
  const estimates = getRecentRoutineTrainings(routine, trainings, {
    maxHistory,
  })
    .map((training) => estimateTrainingCalories(training, calorieOptions))
    .filter((estimate) => estimate.available && estimate.activeSeconds > 0);

  if (!estimates.length) return null;

  const average = (field) =>
    estimates.reduce(
      (total, estimate) => total + Number(estimate[field] || 0),
      0,
    ) / estimates.length;

  return {
    calories: Math.max(1, Math.round(average("calories"))),
    minCalories: Math.max(1, Math.round(average("minCalories"))),
    maxCalories: Math.max(1, Math.round(average("maxCalories"))),
    activeSeconds: Math.max(1, Math.round(average("activeSeconds"))),
    sampleSize: estimates.length,
    source: "history",
  };
}

export function summarizeCalorieEstimates(estimates = []) {
  const available = estimates.filter((estimate) => estimate?.available);
  const durationMinutes = available.reduce(
    (sum, estimate) => sum + Number(estimate.durationMinutes || 0),
    0,
  );
  const weightedMetTotal = available.reduce(
    (sum, estimate) =>
      sum + Number(estimate.met || 0) * Number(estimate.durationMinutes || 0),
    0,
  );
  return {
    calories: available.reduce(
      (sum, estimate) => sum + Number(estimate.calories || 0),
      0,
    ),
    minCalories: available.reduce(
      (sum, estimate) => sum + Number(estimate.minCalories || 0),
      0,
    ),
    maxCalories: available.reduce(
      (sum, estimate) => sum + Number(estimate.maxCalories || 0),
      0,
    ),
    durationMinutes,
    workMinutes: available.reduce(
      (sum, estimate) => sum + Number(estimate.workMinutes || 0),
      0,
    ),
    restMinutes: available.reduce(
      (sum, estimate) => sum + Number(estimate.restMinutes || 0),
      0,
    ),
    excludedMinutes: available.reduce(
      (sum, estimate) => sum + Number(estimate.excludedMinutes || 0),
      0,
    ),
    completedSets: available.reduce(
      (sum, estimate) => sum + Number(estimate.completedSets || 0),
      0,
    ),
    met: durationMinutes
      ? Number((weightedMetTotal / durationMinutes).toFixed(1))
      : 0,
    sessions: available.length,
    usesReferenceWeight: available.some(
      (estimate) => estimate.usesReferenceWeight,
    ),
    durationWasEstimated: available.some(
      (estimate) => estimate.durationWasEstimated,
    ),
    breakdownWasEstimated: available.some(
      (estimate) => estimate.breakdownWasEstimated,
    ),
    activeCalories: true,
    available: available.length > 0,
  };
}

export { DEFAULT_REFERENCE_WEIGHT_KG };
