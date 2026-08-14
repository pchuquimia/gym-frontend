import { getCompatibleExerciseHistoryKeys } from "./historyCompatibility";

const getDateTimestamp = (value) => {
  if (!value) return 0;
  const normalized = String(value).length <= 10 ? `${value}T00:00:00` : value;
  const timestamp = Date.parse(normalized);
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

export const buildExerciseTrackingRows = (exercise, trainings = []) => {
  if (!exercise) return [];
  const keys = getCompatibleExerciseHistoryKeys(exercise);
  if (!keys.length) return [];
  const keySet = new Set(keys);
  const rows = [];

  (trainings || []).forEach((training) => {
    const date = training.date || training.createdAt;
    const exerciseMatch = (training.exercises || []).find((candidate) =>
      getCompatibleExerciseHistoryKeys(candidate).some((key) =>
        keySet.has(key),
      ),
    );
    if (!exerciseMatch) return;
    const sets = (exerciseMatch.sets || []).map((set) =>
      Array.isArray(set.entries) && set.entries.length ? set.entries : [set],
    );
    if (!sets.length) return;

    rows.push({
      id: String(
        training._id ||
          training.id ||
          `${date || ""}:${training.routineId || ""}:${training.trainingPlanSlotId || ""}`,
      ),
      date: date ? String(date).slice(0, 10) : "",
      ts: getDateTimestamp(date),
      routineName: training.routineName || "",
      routineId: training.routineId || "",
      trainingPlanId: training.trainingPlanId || "",
      progressScopeId: training.progressScopeId || "",
      branch: training.branch || "",
      sets,
    });
  });

  return rows.sort((left, right) => left.ts - right.ts);
};
