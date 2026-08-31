import {
  cleanSets,
  estimate1RM,
  movingAverage,
  toIsoWeek,
} from "./trainingMetrics";

const normalizeDate = (value) => String(value || "").slice(0, 10);

export const summarizeExerciseSets = (sets = [], referenceStrength = 0) => {
  const validSets = cleanSets(sets);
  const topSet = validSets.reduce((best, set) => {
    const strength = estimate1RM(set.weight, set.reps);
    return !best || strength > best.strength
      ? { weight: set.weight, reps: set.reps, strength }
      : best;
  }, null);
  const positiveLoadSets = validSets.filter((set) => Number(set.weight) > 0);
  const intensityReference = Number(referenceStrength) || topSet?.strength || 0;
  const intensities = intensityReference
    ? positiveLoadSets.map(
        (set) => (Number(set.weight) / intensityReference) * 100,
      )
    : [];

  return {
    topSet: topSet ? { weight: topSet.weight, reps: topSet.reps } : null,
    strength: topSet?.strength || 0,
    volume: validSets.reduce(
      (total, set) => total + Number(set.weight) * Number(set.reps),
      0,
    ),
    setsCount: validSets.length,
    reps: validSets.reduce((total, set) => total + Number(set.reps), 0),
    intensityAverage: intensities.length
      ? intensities.reduce((total, value) => total + value, 0) /
        intensities.length
      : 0,
    intensityPeak: intensities.length ? Math.max(...intensities) : 0,
  };
};

export const buildExerciseAnalyticsPoints = ({
  workouts = [],
  exerciseId = "",
  groupBy = "week",
}) => {
  const groups = new Map();

  workouts.forEach((workout, index) => {
    if (workout.exerciseId !== exerciseId) return;
    const date = normalizeDate(workout.date);
    if (!date) return;
    const sessionKey = String(
      workout.sessionKey || workout.id || `${date}:${index}`,
    );
    const key = groupBy === "week" ? toIsoWeek(date) : sessionKey;
    const current = groups.get(key) || {
      key,
      label: groupBy === "week" ? toIsoWeek(date) : date,
      date,
      order: index,
      sets: [],
    };

    current.sets.push(...cleanSets(workout.sets || []));
    if (date > current.date) current.date = date;
    groups.set(key, current);
  });

  const basePoints = Array.from(groups.values())
    .sort((left, right) =>
      left.date === right.date
        ? left.order - right.order
        : left.date.localeCompare(right.date),
    )
    .map((group) => ({
      ...group,
      ...summarizeExerciseSets(group.sets),
    }))
    .filter(
      (point) =>
        point.setsCount > 0 && (point.volume > 0 || point.strength > 0),
    );

  const referenceStrength = basePoints.reduce(
    (best, point) => Math.max(best, point.strength),
    0,
  );

  return basePoints.map((point) => ({
    ...point,
    ...summarizeExerciseSets(point.sets, referenceStrength),
    referenceStrength,
  }));
};

export const withMovingAverage = (
  points = [],
  metric,
  range = 12,
  window = 3,
) => {
  const averages = movingAverage(
    points.map((point) => Number(point[metric]) || 0),
    window,
  );
  return points
    .map((point, index) => ({ ...point, movingAverage: averages[index] }))
    .slice(-range);
};

const median = (values = []) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

export const buildMuscleAnalytics = ({
  workouts = [],
  exerciseIds = [],
  rangeWeeks = 12,
}) => {
  const allowedIds = new Set(exerciseIds);
  const weeklyByExercise = new Map();

  workouts.forEach((workout) => {
    if (!allowedIds.has(workout.exerciseId)) return;
    const date = normalizeDate(workout.date);
    if (!date) return;
    const summary = summarizeExerciseSets(workout.sets || []);
    if (!summary.strength) return;
    const week = toIsoWeek(date);
    if (!weeklyByExercise.has(workout.exerciseId)) {
      weeklyByExercise.set(workout.exerciseId, new Map());
    }
    const exerciseWeeks = weeklyByExercise.get(workout.exerciseId);
    const previous = exerciseWeeks.get(week);
    if (!previous || summary.strength > previous.strength) {
      exerciseWeeks.set(week, {
        week,
        date,
        strength: summary.strength,
        topSet: summary.topSet,
      });
    }
  });

  const allWeeks = Array.from(
    new Set(
      Array.from(weeklyByExercise.values()).flatMap((weeks) => [
        ...weeks.keys(),
      ]),
    ),
  ).sort((left, right) => left.localeCompare(right));
  const visibleWeeks = allWeeks.slice(-rangeWeeks);
  const visibleWeekSet = new Set(visibleWeeks);

  const comparable = Array.from(weeklyByExercise.entries())
    .map(([exerciseId, weeks]) => ({
      exerciseId,
      observations: Array.from(weeks.values())
        .filter((point) => visibleWeekSet.has(point.week))
        .sort((left, right) => left.week.localeCompare(right.week)),
    }))
    .filter((exercise) => exercise.observations.length >= 2)
    .map((exercise) => {
      const baseline = exercise.observations[0];
      const current = exercise.observations.at(-1);
      const change = baseline.strength
        ? ((current.strength - baseline.strength) / baseline.strength) * 100
        : 0;
      return { ...exercise, baseline, current, change };
    });

  const points = visibleWeeks
    .map((week) => {
      const indices = comparable.flatMap((exercise) => {
        const latest = exercise.observations
          .filter((point) => point.week <= week)
          .at(-1);
        if (!latest || week < exercise.baseline.week) return [];
        return [(latest.strength / exercise.baseline.strength) * 100];
      });
      return indices.length
        ? {
            week,
            index: median(indices),
            exerciseCount: indices.length,
          }
        : null;
    })
    .filter(Boolean);

  const delta = comparable.length
    ? median(comparable.map((exercise) => exercise.change))
    : null;
  const improved = comparable.filter((exercise) => exercise.change > 2).length;
  const declined = comparable.filter((exercise) => exercise.change < -2).length;

  return {
    points,
    contributions: comparable.sort(
      (left, right) => Math.abs(right.change) - Math.abs(left.change),
    ),
    delta,
    currentIndex: delta === null ? null : 100 + delta,
    comparableExercises: comparable.length,
    improved,
    declined,
    stable: comparable.length - improved - declined,
    visibleWeeks,
  };
};
