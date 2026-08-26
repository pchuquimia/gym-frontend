const DEFAULT_REFERENCE_WEIGHT_KG = 75;
const MIN_SESSION_MINUTES = 5;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toPositiveNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
};

const getDurationSeconds = (training = {}) =>
  toPositiveNumber(training.durationOverrideSeconds) ||
  toPositiveNumber(training.durationSeconds);

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

export function estimateTrainingCalories(
  training = {},
  { weightKg, referenceWeightKg = DEFAULT_REFERENCE_WEIGHT_KG } = {},
) {
  const recordedSeconds = getDurationSeconds(training);
  const completedSets = countCompletedTrainingSets(training);
  const durationWasEstimated = !recordedSeconds && completedSets > 0;
  const durationMinutes = recordedSeconds
    ? recordedSeconds / 60
    : completedSets
      ? Math.max(MIN_SESSION_MINUTES, completedSets * 2.5)
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
      completedSets,
      met: 0,
      intensityLabel: "Sin datos",
      densityPercent: 0,
      weightKg: effectiveWeightKg || 0,
      usesReferenceWeight,
      durationWasEstimated,
      available: false,
    };
  }

  const workSeconds = toPositiveNumber(training.workSeconds);
  const restSeconds = toPositiveNumber(training.restSeconds);
  const trackedSeconds = workSeconds + restSeconds;
  const hasTimingBreakdown = trackedSeconds > 0;
  const density = hasTimingBreakdown
    ? clamp(workSeconds / trackedSeconds, 0, 1)
    : 0;
  const setsPerMinute = completedSets / durationMinutes;
  const setPaceScore = clamp(setsPerMinute / 0.45, 0, 1);

  // Resistance training commonly spans roughly 3.5–6 MET. We place each
  // session within that range using its recorded work/rest density and set pace.
  const met = hasTimingBreakdown
    ? 3.5 + density * 1.5 + setPaceScore
    : 3.5 + setPaceScore * 1.5;
  const calories = (met * 3.5 * effectiveWeightKg * durationMinutes) / 200;
  const uncertainty = usesReferenceWeight || durationWasEstimated ? 0.25 : 0.18;
  const roundedCalories = Math.max(1, Math.round(calories));

  return {
    calories: roundedCalories,
    minCalories: Math.max(1, Math.round(calories * (1 - uncertainty))),
    maxCalories: Math.max(1, Math.round(calories * (1 + uncertainty))),
    durationMinutes: Math.round(durationMinutes),
    completedSets,
    met: Number(met.toFixed(1)),
    intensityLabel:
      met >= 5.35 ? "Alta" : met >= 4.25 ? "Media-alta" : "Moderada",
    densityPercent: hasTimingBreakdown ? Math.round(density * 100) : 0,
    weightKg: Number(effectiveWeightKg.toFixed(1)),
    usesReferenceWeight,
    durationWasEstimated,
    available: true,
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
    available: available.length > 0,
  };
}

export { DEFAULT_REFERENCE_WEIGHT_KG };
