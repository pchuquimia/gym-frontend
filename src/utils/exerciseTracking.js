import { getCompatibleExerciseHistoryKeys } from "./historyCompatibility";

const getDateTimestamp = (value) => {
  if (!value) return 0;
  const normalized = String(value).length <= 10 ? `${value}T00:00:00` : value;
  const timestamp = Date.parse(normalized);
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const normalizeExerciseIdentity = (value = "") =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const getExerciseIdentityKeys = (exercise = {}) =>
  new Set(
    [
      exercise.exerciseId || exercise.id || "",
      exercise.exerciseName || exercise.name || "",
    ]
      .map(normalizeExerciseIdentity)
      .filter(Boolean),
  );

export const buildExerciseTrackingRows = (
  exercise,
  trainings = [],
  { compatibleOnly = true } = {},
) => {
  if (!exercise) return [];
  const keySet = compatibleOnly
    ? new Set(getCompatibleExerciseHistoryKeys(exercise))
    : getExerciseIdentityKeys(exercise);
  if (!keySet.size) return [];
  const rows = [];

  (trainings || []).forEach((training) => {
    const date = training.date || training.createdAt;
    const exerciseMatch = (training.exercises || []).find((candidate) => {
      const candidateKeys = compatibleOnly
        ? getCompatibleExerciseHistoryKeys(candidate)
        : Array.from(getExerciseIdentityKeys(candidate));
      return candidateKeys.some((key) => keySet.has(key));
    });
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

  return rows.sort((left, right) => right.ts - left.ts);
};

export const getExerciseTrackingEntryWeight = (entry = {}) => {
  const value = entry.weightKg ?? entry.weight ?? entry.kg ?? null;
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const getExerciseTrackingBestWeightsBySet = (rows = []) => {
  const bestBySet = [];
  (rows || []).forEach((row) => {
    (row.sets || []).forEach((entries, setIndex) => {
      (entries || []).forEach((entry) => {
        const weight = getExerciseTrackingEntryWeight(entry);
        if (weight === null) return;
        if (bestBySet[setIndex] == null || weight > bestBySet[setIndex]) {
          bestBySet[setIndex] = weight;
        }
      });
    });
  });
  return bestBySet;
};

export const getExerciseTrackingBestWeightsByPlan = (rows = []) => {
  const rowsByPlan = new Map();
  (rows || []).forEach((row) => {
    const planId = String(row.trainingPlanId || "").trim();
    if (!planId) return;
    if (!rowsByPlan.has(planId)) rowsByPlan.set(planId, []);
    rowsByPlan.get(planId).push(row);
  });

  return {
    global: getExerciseTrackingBestWeightsBySet(rows),
    byPlan: new Map(
      Array.from(rowsByPlan, ([planId, planRows]) => [
        planId,
        getExerciseTrackingBestWeightsBySet(planRows),
      ]),
    ),
  };
};

export const getExerciseTrackingEntryKey = (row, setIndex, entryIndex) =>
  `${String(row?.id || row?.date || "row")}:${setIndex}:${entryIndex}`;

export const getExerciseTrackingBestEntryKeysBySet = (rows = []) => {
  const bestBySet = [];
  (rows || []).forEach((row) => {
    (row.sets || []).forEach((entries, setIndex) => {
      (entries || []).forEach((entry, entryIndex) => {
        const weight = getExerciseTrackingEntryWeight(entry);
        if (weight === null) return;
        const candidate = {
          key: getExerciseTrackingEntryKey(row, setIndex, entryIndex),
          weight,
          timestamp: Number(row.ts) || getDateTimestamp(row.date),
        };
        const current = bestBySet[setIndex];
        if (
          !current ||
          candidate.weight > current.weight ||
          (candidate.weight === current.weight &&
            candidate.timestamp > current.timestamp)
        ) {
          bestBySet[setIndex] = candidate;
        }
      });
    });
  });
  return bestBySet.map((entry) => entry?.key || "");
};

export const getExerciseTrackingBestEntryKeysByPlan = (rows = []) => {
  const rowsByPlan = new Map();
  (rows || []).forEach((row) => {
    const planId = String(row.trainingPlanId || "").trim();
    if (!planId) return;
    if (!rowsByPlan.has(planId)) rowsByPlan.set(planId, []);
    rowsByPlan.get(planId).push(row);
  });

  return {
    global: getExerciseTrackingBestEntryKeysBySet(rows),
    byPlan: new Map(
      Array.from(rowsByPlan, ([planId, planRows]) => [
        planId,
        getExerciseTrackingBestEntryKeysBySet(planRows),
      ]),
    ),
  };
};

export const getExerciseTrackingRoutineKey = (row = {}) => {
  const progressScopeId = String(row.progressScopeId || "").trim();
  if (progressScopeId) return `scope:${progressScopeId}`;
  const routineId = String(row.routineId || "").trim();
  if (routineId) return `id:${routineId}`;
  const routineName = String(row.routineName || "")
    .trim()
    .toLocaleLowerCase("es");
  return routineName ? `name:${routineName}` : "";
};

export const getExerciseTrackingBestEntryKeysByRoutine = (rows = []) => {
  const rowsByRoutine = new Map();
  (rows || []).forEach((row) => {
    const routineKey = getExerciseTrackingRoutineKey(row);
    if (!routineKey) return;
    if (!rowsByRoutine.has(routineKey)) rowsByRoutine.set(routineKey, []);
    rowsByRoutine.get(routineKey).push(row);
  });

  return {
    global: getExerciseTrackingBestEntryKeysBySet(rows),
    byRoutine: new Map(
      Array.from(rowsByRoutine, ([routineKey, routineRows]) => [
        routineKey,
        getExerciseTrackingBestEntryKeysBySet(routineRows),
      ]),
    ),
  };
};

export const collectExerciseTrackingPlanTrainings = ({
  planId = "",
  planIds = [],
  routineIds = [],
  sources = [],
} = {}) => {
  const normalizedPlanId = String(planId || "").trim();
  const planIdSet = new Set(
    [normalizedPlanId, ...(planIds || [])]
      .map((id) => String(id || "").trim())
      .filter(Boolean),
  );
  if (!planIdSet.size) return [];
  const routineIdSet = new Set(
    (routineIds || []).map((id) => String(id || "").trim()).filter(Boolean),
  );
  const unique = new Map();

  (sources || []).flat().forEach((training) => {
    const trainingPlanId = String(training?.trainingPlanId || "").trim();
    const routineId = String(training?.routineId || "").trim();
    const belongsToPlan =
      planIdSet.has(trainingPlanId) ||
      (!trainingPlanId && routineIdSet.has(routineId));
    if (!belongsToPlan) return;
    const key = String(
      training?._id ||
        training?.id ||
        `${training?.date || training?.createdAt || ""}:${routineId}:${training?.trainingPlanSlotId || ""}`,
    );
    unique.set(key, training);
  });

  return Array.from(unique.values());
};

export const collectExerciseTrackingRoutineTrainings = ({
  routineId = "",
  routineName = "",
  progressScopeId = "",
  planId = "",
  slotId = "",
  sources = [],
} = {}) => {
  const normalizedRoutineId = String(routineId || "").trim();
  const normalizedRoutineName = String(routineName || "")
    .trim()
    .toLocaleLowerCase("es");
  const normalizedProgressScopeId = String(progressScopeId || "").trim();
  const normalizedPlanId = String(planId || "").trim();
  const normalizedSlotId = String(slotId || "").trim();
  const hasPlanSlot = Boolean(normalizedPlanId && normalizedSlotId);
  const unique = new Map();

  (sources || []).flat().forEach((training) => {
    const trainingRoutineId = String(training?.routineId || "").trim();
    const trainingRoutineName = String(training?.routineName || "")
      .trim()
      .toLocaleLowerCase("es");
    const trainingPlanId = String(training?.trainingPlanId || "").trim();
    const trainingSlotId = String(training?.trainingPlanSlotId || "").trim();
    const trainingProgressScopeId = String(
      training?.progressScopeId || "",
    ).trim();
    const belongsToProgressScope =
      normalizedProgressScopeId &&
      trainingProgressScopeId === normalizedProgressScopeId;
    const hasDifferentProgressScope =
      normalizedProgressScopeId &&
      trainingProgressScopeId &&
      trainingProgressScopeId !== normalizedProgressScopeId;
    const belongsToPlanSlot =
      hasPlanSlot &&
      trainingPlanId === normalizedPlanId &&
      trainingSlotId === normalizedSlotId;
    const hasDifferentPlanSlot =
      hasPlanSlot &&
      ((trainingPlanId && trainingPlanId !== normalizedPlanId) ||
        (trainingSlotId && trainingSlotId !== normalizedSlotId));
    const belongsToExactRoutine = normalizedRoutineId
      ? trainingRoutineId === normalizedRoutineId ||
        (!trainingRoutineId &&
          normalizedRoutineName &&
          trainingRoutineName === normalizedRoutineName)
      : Boolean(
          normalizedRoutineName &&
          trainingRoutineName === normalizedRoutineName,
        );
    const belongsToRoutine =
      belongsToProgressScope ||
      (!hasDifferentProgressScope &&
        (belongsToPlanSlot ||
          (!hasDifferentPlanSlot && belongsToExactRoutine)));
    if (!belongsToRoutine) return;
    const key = String(
      training?._id ||
        training?.id ||
        `${training?.date || training?.createdAt || ""}:${trainingRoutineId || trainingRoutineName}`,
    );
    unique.set(key, training);
  });

  return Array.from(unique.values());
};

export const getExerciseTrackingRoutineLabel = (row, scope) => {
  if (scope === "routine") return "";
  return row?.routineName || "Sin rutina";
};

export const getInitialExerciseTrackingScope = (
  exercise,
  routineTrainings = [],
  planTrainings = [],
) => {
  if (
    buildExerciseTrackingRows(exercise, routineTrainings, {
      compatibleOnly: false,
    }).length
  ) {
    return "routine";
  }
  if (
    buildExerciseTrackingRows(exercise, planTrainings, {
      compatibleOnly: false,
    }).length
  ) {
    return "plan";
  }
  return "general";
};
