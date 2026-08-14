import { inferWeightConfig, normalizeWeightBasis } from "./weightConfig";

export const getHistoryCompatibilitySignature = (exercise = {}) => {
  const movementMode =
    exercise.movementMode === "unilateral" ? "unilateral" : "bilateral";
  const inferredWeightConfig = inferWeightConfig(exercise);
  const weightBasis = normalizeWeightBasis(
    inferredWeightConfig.weightBasis,
    "total",
  );
  const barWeightKg =
    weightBasis === "per_side"
      ? Math.max(0, Number(inferredWeightConfig.barWeightKg || 0))
      : 0;
  const implementCount =
    weightBasis === "per_implement"
      ? Math.min(
          4,
          Math.max(1, Number(inferredWeightConfig.implementCount || 1)),
        )
      : 1;
  return [movementMode, weightBasis, barWeightKg, implementCount].join(":");
};

export const appendHistoryCompatibility = (key, exercise = {}) =>
  `${key}::config-${getHistoryCompatibilitySignature(exercise)}`;

const normalizeExerciseKey = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const getCompatibleExerciseHistoryKeys = (exercise = {}) => {
  const mode =
    exercise.movementMode === "unilateral" ? "unilateral" : "bilateral";
  return Array.from(
    new Set(
      [
        exercise.exerciseId || exercise.id || "",
        normalizeExerciseKey(exercise.exerciseName || exercise.name || ""),
      ]
        .filter(Boolean)
        .map((key) =>
          appendHistoryCompatibility(`${key}::${mode}`, exercise),
        ),
    ),
  );
};

const parseValue = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isNaN(parsed) ? null : parsed;
};

const getTimestamp = (value) => {
  if (!value) return 0;
  const normalized = String(value).length <= 10 ? `${value}T00:00:00` : value;
  const timestamp = Date.parse(normalized);
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

export const computeCompatibleRecentBySet = (
  trainings = [],
  { cutoffDate = null, branch = "" } = {},
) => {
  const map = new Map();
  const cutoffTimestamp = cutoffDate ? getTimestamp(cutoffDate) : null;
  const uniqueTrainings = new Map();
  trainings.forEach((training) => {
    const identity = String(
      training?._id ||
        `${training?.date || training?.createdAt || ""}:${training?.routineId || ""}:${training?.trainingPlanSlotId || ""}`,
    );
    uniqueTrainings.set(identity, training);
  });
  uniqueTrainings.forEach((training) => {
    if (
      branch &&
      String(training.branch || "").toLowerCase() !==
        String(branch).toLowerCase()
    ) {
      return;
    }
    const date = training.date || training.createdAt;
    const timestamp = getTimestamp(date);
    if (cutoffTimestamp && timestamp > cutoffTimestamp) return;
    (training.exercises || []).forEach((exercise) => {
      getCompatibleExerciseHistoryKeys(exercise).forEach((key) => {
        const setsByIndex = map.get(key) || [];
        (exercise.sets || []).forEach((set, setIndex) => {
          const entries =
            Array.isArray(set.entries) && set.entries.length
              ? set.entries
              : [set];
          if (!setsByIndex[setIndex]) setsByIndex[setIndex] = [];
          entries.forEach((entry, entryIndex) => {
            const record = {
              weight: parseValue(
                entry.weightKg ?? entry.weight ?? entry.kg ?? null,
              ),
              reps: parseValue(entry.reps ?? null),
              date,
              ts: timestamp,
              branch: training.branch || "",
              routineId: training.routineId || "",
              routineName: training.routineName || "",
              trainingPlanId: training.trainingPlanId || "",
              progressScopeId: training.progressScopeId || "",
            };
            const slot = setsByIndex[setIndex][entryIndex] || {
              latest: null,
              previous: null,
            };
            if (!slot.latest || timestamp > slot.latest.ts) {
              slot.previous = slot.latest;
              slot.latest = record;
            } else if (!slot.previous || timestamp > slot.previous.ts) {
              slot.previous = record;
            }
            setsByIndex[setIndex][entryIndex] = slot;
          });
        });
        map.set(key, setsByIndex);
      });
    });
  });
  return map;
};

export const getLatestCompatibleReference = (setsByIndex = []) =>
  setsByIndex
    .flatMap((entries) => entries || [])
    .map((slot) => slot?.latest)
    .filter(Boolean)
    .sort((left, right) => right.ts - left.ts)[0] || null;
