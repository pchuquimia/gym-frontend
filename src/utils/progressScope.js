function getEntityId(value) {
  if (value && typeof value === "object") {
    return value._id || value.id || value.slug || "";
  }
  return value || "";
}

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function getTrainingProgressScopeKey(training = {}) {
  const progressScopeId = normalizeKey(training.progressScopeId);
  if (progressScopeId) return `scope:${progressScopeId}`;

  const routineId = normalizeKey(getEntityId(training.routineId));
  if (routineId) return `routine:${routineId}`;

  const routineName = normalizeKey(
    training.routineName || training.routine?.name,
  );
  if (routineName) return `legacy-routine:${routineName}`;

  const trainingId = normalizeKey(getEntityId(training));
  const sessionKey =
    trainingId || `${training.date || ""}:${training.createdAt || ""}`;
  return `isolated-session:${sessionKey || "unknown"}`;
}

export function getScopedExerciseKey(training, exerciseKey) {
  return `${getTrainingProgressScopeKey(training)}::exercise:${normalizeKey(exerciseKey)}`;
}

function sumTrainingValues(trainings, getValue) {
  return trainings.reduce((total, training) => {
    const value = Number(getValue(training));
    return total + (Number.isFinite(value) ? value : 0);
  }, 0);
}

export function buildScopedPeriodComparison(
  currentTrainings = [],
  previousTrainings = [],
  getValue = () => 0,
) {
  const currentScopeKeys = new Set(
    currentTrainings.map(getTrainingProgressScopeKey),
  );
  const previousScopeKeys = new Set(
    previousTrainings.map(getTrainingProgressScopeKey),
  );
  const comparableScopeKeys = new Set(
    Array.from(currentScopeKeys).filter((key) => previousScopeKeys.has(key)),
  );
  const currentComparableTrainings = currentTrainings.filter((training) =>
    comparableScopeKeys.has(getTrainingProgressScopeKey(training)),
  );
  const previousComparableTrainings = previousTrainings.filter((training) =>
    comparableScopeKeys.has(getTrainingProgressScopeKey(training)),
  );
  const currentTotal = sumTrainingValues(currentTrainings, getValue);
  const currentComparable = sumTrainingValues(
    currentComparableTrainings,
    getValue,
  );
  const previousComparable = sumTrainingValues(
    previousComparableTrainings,
    getValue,
  );

  return {
    currentTotal,
    currentComparable,
    previousComparable,
    excludedCurrent: Math.max(0, currentTotal - currentComparable),
    currentScopeCount: currentScopeKeys.size,
    comparableScopeCount: comparableScopeKeys.size,
    newScopeCount: Math.max(
      0,
      currentScopeKeys.size - comparableScopeKeys.size,
    ),
    comparableScopeKeys: Array.from(comparableScopeKeys),
  };
}
