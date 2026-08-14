export const TRAINING_LIST_FIELDS = [
  "date",
  "createdAt",
  "routineId",
  "routineName",
  "trainingPlanId",
  "trainingPlanSlotId",
  "progressScopeId",
  "orderSignature",
  "branch",
  "durationSeconds",
  "durationOverrideSeconds",
  "workSeconds",
  "restSeconds",
  "pauseSeconds",
  "exerciseDurations.exerciseId",
  "exerciseDurations.durationSeconds",
  "exerciseDurations.durationOverrideSeconds",
  "exerciseDurations.workSeconds",
  "exerciseDurations.restSeconds",
  "totalVolume",
  "volumeBreakdown",
  "exercises.exerciseId",
  "exercises.exerciseName",
  "exercises.muscleGroup",
  "exercises.primaryMuscleGroup",
  "exercises.loadType",
  "exercises.weightBasis",
  "exercises.barWeightKg",
  "exercises.implementCount",
  "exercises.order",
  "exercises.plannedOrder",
  "exercises.actualOrder",
  "exercises.orderContext",
  "exercises.movementMode",
  "exercises.seriesType",
  "exercises.sets.weightKg",
  "exercises.sets.reps",
  "exercises.sets.done",
  "exercises.sets.order",
  "exercises.sets.seriesType",
  "exercises.sets.entries.weightKg",
  "exercises.sets.entries.reps",
  "exercises.sets.entries.done",
  "exercises.sets.entries.completedAt",
  "exercises.sets.entries.order",
].join(",");

export const TRAINING_SUMMARY_FIELDS = [
  "date",
  "createdAt",
  "routineId",
  "routineName",
  "trainingPlanId",
  "trainingPlanSlotId",
  "progressScopeId",
  "orderSignature",
  "branch",
  "durationSeconds",
  "durationOverrideSeconds",
  "workSeconds",
  "restSeconds",
  "pauseSeconds",
  "totalVolume",
  "volumeBreakdown",
].join(",");

export const SESSION_HISTORY_FIELDS = [
  "date",
  "routineId",
  "routineName",
  "durationSeconds",
  "totalVolume",
  "volumeBreakdown.recordedSets",
  "branch",
  "routineBranch",
  "sessionType",
  "supervisedBy",
].join(",");

export function getSessionSetCount(training = {}) {
  const summarizedCount = Number(training.volumeBreakdown?.recordedSets);
  if (Number.isFinite(summarizedCount) && summarizedCount >= 0) {
    return summarizedCount;
  }

  return (training.exercises || []).reduce(
    (total, exercise) => total + (exercise.sets?.length || 0),
    0,
  );
}

export const TRAINING_LIST_CACHE_VERSION = "details-v1";
export const TRAINING_SUMMARY_CACHE_VERSION = "summary-v1";
