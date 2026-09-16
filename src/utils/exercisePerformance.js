import { classifyExerciseLoad } from "./trainingLoad";
import { estimate1RM } from "./trainingMetrics";
import { getEffectiveWeightKg } from "./weightConfig";

const completedEntries = (exercise = {}) =>
  (exercise.sets || []).flatMap((set, setIndex) => {
    const entries =
      Array.isArray(set?.entries) && set.entries.length ? set.entries : [set];
    return entries
      .map((entry, entryIndex) => ({
        setIndex,
        entryIndex,
        weightKg: getEffectiveWeightKg(
          entry?.weightKg ?? entry?.weight ?? entry?.kg,
          exercise,
        ),
        reps: Number(entry?.reps ?? entry?.repetitions ?? 0),
        done: entry?.done ?? set?.done,
      }))
      .filter(
        (entry) =>
          entry.done !== false &&
          Number.isFinite(entry.weightKg) &&
          entry.weightKg >= 0 &&
          Number.isFinite(entry.reps) &&
          entry.reps > 0,
      );
  });

const selectHighest = (entries, metric) =>
  entries.reduce((best, entry) => {
    const value = metric(entry);
    if (!best || value > best.metric) return { ...entry, metric: value };
    if (value === best.metric && entry.reps > best.reps) {
      return { ...entry, metric: value };
    }
    return best;
  }, null);

export const summarizeExercisePerformance = (exercise = {}) => {
  const entries = completedEntries(exercise);
  if (!entries.length) return null;
  const loadType = classifyExerciseLoad(exercise);
  if (loadType === "cardio") return null;

  const setsCount = new Set(entries.map((entry) => entry.setIndex)).size;
  const repsTotal = entries.reduce((sum, entry) => sum + entry.reps, 0);
  const base = { loadType, setsCount, repsTotal };

  if (loadType === "bodyweight") {
    const top = selectHighest(entries, (entry) => entry.reps);
    return {
      ...base,
      metricType: "repetitions",
      metric: top.metric,
      comparisonKey: "bodyweight:repetitions",
      topSet: { weightKg: top.weightKg, reps: top.reps },
      assistanceKg: null,
      oneRMTop: 0,
      volume: 0,
    };
  }

  if (loadType === "assisted") {
    const assistanceKg = Math.min(...entries.map((entry) => entry.weightKg));
    const comparable = entries.filter(
      (entry) => entry.weightKg === assistanceKg,
    );
    const top = selectHighest(comparable, (entry) => entry.reps);
    return {
      ...base,
      metricType: "assistedRepetitions",
      metric: top.metric,
      comparisonKey: `assisted:${assistanceKg}:repetitions`,
      topSet: { weightKg: top.weightKg, reps: top.reps },
      assistanceKg,
      oneRMTop: 0,
      volume: 0,
    };
  }

  const top = selectHighest(entries, (entry) =>
    estimate1RM(entry.weightKg, entry.reps),
  );
  if (!top?.metric) return null;
  return {
    ...base,
    metricType: "strength",
    metric: top.metric,
    comparisonKey: `${loadType}:estimated-strength`,
    topSet: { weightKg: top.weightKg, reps: top.reps },
    assistanceKg: null,
    oneRMTop: top.metric,
    volume: entries.reduce(
      (sum, entry) => sum + entry.weightKg * entry.reps,
      0,
    ),
  };
};

export const compareExercisePerformances = (current, previous) => {
  if (
    !current ||
    !previous ||
    current.comparisonKey !== previous.comparisonKey ||
    !Number(previous.metric)
  ) {
    return null;
  }
  return ((Number(current.metric) - Number(previous.metric)) / previous.metric) * 100;
};

export const formatExercisePerformanceValue = (performance = {}) => {
  if (performance.metricType === "repetitions") {
    return `${performance.topSet?.reps || 0} reps`;
  }
  if (performance.metricType === "assistedRepetitions") {
    return `${performance.topSet?.reps || 0} reps · ${performance.assistanceKg || 0} kg de asistencia`;
  }
  const weight = Number(performance.topSet?.weightKg || 0);
  const reps = Number(performance.topSet?.reps || 0);
  return `${Number.isInteger(weight) ? weight : weight.toFixed(1)} kg × ${reps}`;
};
