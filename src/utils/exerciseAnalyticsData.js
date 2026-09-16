import {
  cleanSets,
  estimate1RM,
  getIsoWeekRange,
  getIsoWeekStartDate,
  movingAverage,
  toIsoWeek,
} from "./trainingMetrics";

const normalizeDate = (value) => String(value || "").slice(0, 10);

export const summarizeExerciseSets = (sets = [], referenceStrength = 0) => {
  const validSets = cleanSets(sets);
  const topSet = validSets.reduce((best, set) => {
    const strength = estimate1RM(set.weight, set.reps);
    return !best ||
      strength > best.strength ||
      (strength === best.strength && Number(set.reps) > best.reps)
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
      sessionKeys: new Set(),
    };

    current.sessionKeys.add(sessionKey);
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
    .map((group) => {
      const { sessionKeys, ...point } = group;
      return {
        ...point,
        sessionCount: sessionKeys.size,
        ...summarizeExerciseSets(group.sets),
      };
    })
    .filter((point) => point.setsCount > 0);

  const referenceStrength = basePoints.reduce(
    (best, point) => Math.max(best, point.strength),
    0,
  );

  return basePoints.map((point) => {
    const summary = summarizeExerciseSets(point.sets, referenceStrength);
    const sessionCount = Math.max(1, Number(point.sessionCount) || 1);
    return {
      ...point,
      ...summary,
      volumePerSession: summary.volume / sessionCount,
      repsPerSession: summary.reps / sessionCount,
      setsPerSession: summary.setsCount / sessionCount,
      referenceStrength,
    };
  });
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

export const selectExerciseAnalyticsRange = (
  points = [],
  groupBy = "week",
  range = 12,
  endWeek = "",
) => {
  if (groupBy !== "week") return points.slice(-range);
  const sorted = [...points].sort((left, right) =>
    String(left.key).localeCompare(String(right.key)),
  );
  const resolvedEndWeek = endWeek || sorted.at(-1)?.key;
  const weekKeys = getIsoWeekRange(resolvedEndWeek, range);
  const pointByWeek = new Map(sorted.map((point) => [point.key, point]));

  return weekKeys.map((week) => {
    const point = pointByWeek.get(week);
    if (point) return point;
    const monday = getIsoWeekStartDate(week);
    return {
      key: week,
      label: week,
      date: monday?.toISOString().slice(0, 10) || "",
      sessionCount: 0,
      setsCount: 0,
      reps: 0,
      repsPerSession: 0,
      volume: 0,
      volumePerSession: 0,
      setsPerSession: 0,
      strength: null,
      intensityAverage: null,
      intensityPeak: null,
      movingAverage: null,
      topSet: null,
      isGap: true,
    };
  });
};

const median = (values = []) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

const mean = (values = []) =>
  values.length
    ? values.reduce((total, value) => total + value, 0) / values.length
    : 0;

export const buildExerciseConclusion = ({
  points = [],
  metric = "strength",
  metricType = "strength",
  groupBy = "week",
} = {}) => {
  const observed = points.filter(
    (point) =>
      !point?.isGap &&
      Number.isFinite(Number(point?.[metric])) &&
      Number(point[metric]) > 0,
  );
  const evidenceUnit = groupBy === "week" ? "semanas" : "sesiones";
  if (observed.length < 2) {
    return {
      trend: "insufficient",
      title: "Datos insuficientes",
      confidence: "insufficient",
      confidenceLabel: "Sin confianza calculable",
      summary: `Se necesitan al menos dos ${evidenceUnit} con datos para interpretar la tendencia.`,
      evidence: `${observed.length} ${evidenceUnit} con datos`,
      limitation: "Un solo registro describe un punto, no una tendencia.",
      change: null,
    };
  }

  const windowSize = Math.min(3, Math.floor(observed.length / 2));
  const values = observed.map((point) => Number(point[metric]));
  const recentAverage = mean(values.slice(-windowSize));
  const previousAverage = mean(values.slice(-windowSize * 2, -windowSize));
  const change = previousAverage
    ? ((recentAverage - previousAverage) / previousAverage) * 100
    : 0;
  const threshold = metricType === "workload" ? 5 : 2;
  const trend =
    change > threshold ? "rising" : change < -threshold ? "falling" : "stable";
  const coverage =
    groupBy === "week" && points.length ? observed.length / points.length : 1;
  const lastObservedIndex =
    groupBy === "week"
      ? points.reduce(
          (latest, point, index) =>
            !point?.isGap && Number(point?.[metric]) > 0 ? index : latest,
          -1,
        )
      : points.length - 1;
  const weeksSinceLast =
    groupBy === "week" && lastObservedIndex >= 0
      ? points.length - 1 - lastObservedIndex
      : 0;
  let confidence =
    observed.length >= 6 && coverage >= 0.65
      ? "high"
      : observed.length >= 4 && coverage >= 0.4
        ? "medium"
        : "low";
  if (weeksSinceLast >= 4) confidence = "low";
  else if (weeksSinceLast >= 2 && confidence === "high") confidence = "medium";
  const confidenceLabel = {
    low: "Confianza baja",
    medium: "Confianza media",
    high: "Confianza alta",
  }[confidence];
  const titles = {
    strength: {
      rising: "Fuerza en aumento",
      falling: "Fuerza en descenso",
      stable: "Fuerza estable",
    },
    workload: {
      rising: "Trabajo reciente mayor",
      falling: "Trabajo reciente menor",
      stable: "Trabajo reciente similar",
    },
    intensity: {
      rising: "Carga relativa mayor",
      falling: "Carga relativa menor",
      stable: "Carga relativa estable",
    },
  };
  const summary =
    trend === "stable"
      ? `El promedio de los últimos ${windowSize} ${evidenceUnit} cambió ${change > 0 ? "+" : ""}${change.toFixed(1)}% frente al bloque anterior, dentro del margen estable.`
      : `El promedio de los últimos ${windowSize} ${evidenceUnit} es ${Math.abs(change).toFixed(1)}% ${change > 0 ? "mayor" : "menor"} que el bloque anterior.`;
  const limitations = [];
  if (observed.length < 4) limitations.push("el historial todavía es corto");
  if (coverage < 0.5) limitations.push("hay varias semanas sin registros");
  if (metricType === "workload") {
    limitations.push("más trabajo no implica por sí solo mayor fuerza");
  }
  if (metricType === "intensity") {
    limitations.push("una intensidad mayor no siempre representa progreso");
  }

  const baseTitle = titles[metricType]?.[trend] || titles.strength[trend];
  if (weeksSinceLast >= 2) {
    limitations.push(
      `el último registro fue hace ${weeksSinceLast} semanas y no describe el estado actual`,
    );
  }

  return {
    trend,
    title: weeksSinceLast >= 3 ? `${baseTitle} (histórico)` : baseTitle,
    confidence,
    confidenceLabel,
    summary,
    evidence: `${observed.length} ${evidenceUnit} con datos · ${windowSize} por bloque comparable`,
    limitation: limitations.length
      ? `${limitations.join("; ")}.`
      : "La continuidad de registros respalda esta lectura.",
    change,
    weeksSinceLast,
  };
};

export const buildMuscleConclusion = ({
  delta = null,
  comparableExercises = 0,
  observedPoints = 0,
  totalObservations,
  weeksSinceLast = 0,
  improved = 0,
  declined = 0,
  stable = 0,
} = {}) => {
  if (
    !Number.isFinite(delta) ||
    comparableExercises < 1 ||
    observedPoints < 2
  ) {
    return {
      trend: "insufficient",
      title: "Datos insuficientes",
      confidence: "insufficient",
      confidenceLabel: "Sin confianza calculable",
      summary:
        "Todavía no hay dos semanas comparables para emitir una conclusión.",
      evidence: `${comparableExercises} ejercicios comparables · ${observedPoints} semanas observadas`,
      limitation: "Registra nuevamente el mismo ejercicio para crear una base.",
      agreement: 0,
    };
  }

  const trend = delta > 2 ? "improving" : delta < -2 ? "declining" : "stable";
  const alignedCount =
    trend === "improving"
      ? improved
      : trend === "declining"
        ? declined
        : stable;
  const agreement = comparableExercises
    ? alignedCount / comparableExercises
    : 0;
  const effectiveObservations = Number.isFinite(totalObservations)
    ? totalObservations
    : comparableExercises * observedPoints;
  const observationsPerExercise = comparableExercises
    ? effectiveObservations / comparableExercises
    : 0;
  let confidence =
    comparableExercises >= 3 &&
    observedPoints >= 5 &&
    observationsPerExercise >= 3 &&
    agreement >= 2 / 3
      ? "high"
      : (comparableExercises >= 2 && observedPoints >= 3) ||
          (observedPoints >= 5 && observationsPerExercise >= 2)
        ? "medium"
        : "low";
  if (weeksSinceLast >= 4) confidence = "low";
  else if (weeksSinceLast >= 2 && confidence === "high") confidence = "medium";
  const confidenceLabel = {
    low: "Confianza baja",
    medium: "Confianza media",
    high: "Confianza alta",
  }[confidence];
  const title =
    trend === "improving"
      ? confidence === "high"
        ? "Progreso consistente"
        : "Progreso probable"
      : trend === "declining"
        ? confidence === "high"
          ? "Descenso consistente"
          : "Descenso probable"
        : confidence === "low"
          ? "Sin cambio concluyente"
          : "Tendencia estable";
  const formattedDelta = `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`;
  const directionText =
    trend === "improving"
      ? `${improved} de ${comparableExercises} ejercicios mejoran`
      : trend === "declining"
        ? `${declined} de ${comparableExercises} ejercicios bajan`
        : `${stable} de ${comparableExercises} ejercicios permanecen estables`;
  const limitations = [];
  if (comparableExercises === 1) {
    limitations.push("La conclusión depende de un solo ejercicio");
  }
  if (observedPoints < 4) {
    limitations.push("el historial todavía es corto");
  }
  if (agreement < 2 / 3) {
    limitations.push("los ejercicios no avanzan en la misma dirección");
  }
  if (weeksSinceLast >= 2) {
    limitations.push(
      `el último registro fue hace ${weeksSinceLast} semanas y la tendencia es histórica`,
    );
  }

  return {
    trend,
    title: weeksSinceLast >= 3 ? `${title} (histórico)` : title,
    confidence,
    confidenceLabel,
    summary: `${directionText}; el cambio mediano es ${formattedDelta}.`,
    evidence: `${comparableExercises} ${comparableExercises === 1 ? "ejercicio comparable" : "ejercicios comparables"} · ${observedPoints} ${observedPoints === 1 ? "semana observada" : "semanas observadas"} · ${effectiveObservations} observaciones`,
    limitation: limitations.length
      ? `${limitations.join("; ")}.`
      : "La mayoría de los ejercicios respalda la misma tendencia.",
    agreement,
    weeksSinceLast,
  };
};

export const buildMuscleAnalytics = ({
  workouts = [],
  exerciseIds = [],
  rangeWeeks = 12,
  exerciseProfiles = new Map(),
  endWeek = "",
}) => {
  const allowedIds = new Set(exerciseIds);
  const performanceByExercise = new Map();

  const getProfile = (exerciseId, workout) => {
    const configured =
      exerciseProfiles instanceof Map
        ? exerciseProfiles.get(exerciseId)
        : exerciseProfiles?.[exerciseId];
    return {
      loadType: configured?.loadType || workout?.loadType || "external",
      weightBasis: configured?.weightBasis || workout?.weightBasis || "",
    };
  };

  const saveObservation = ({
    exerciseId,
    cohortKey,
    loadType,
    metricKind,
    metricLabel,
    week,
    date,
    metric,
    topSet,
  }) => {
    if (!Number.isFinite(metric) || metric <= 0) return;
    if (!performanceByExercise.has(exerciseId)) {
      performanceByExercise.set(exerciseId, new Map());
    }
    const cohorts = performanceByExercise.get(exerciseId);
    if (!cohorts.has(cohortKey)) {
      cohorts.set(cohortKey, {
        cohortKey,
        loadType,
        metricKind,
        metricLabel,
        weeks: new Map(),
      });
    }
    const cohort = cohorts.get(cohortKey);
    const previous = cohort.weeks.get(week);
    if (!previous || metric > previous.metric) {
      cohort.weeks.set(week, { week, date, metric, topSet });
    }
  };

  workouts.forEach((workout) => {
    if (!allowedIds.has(workout.exerciseId)) return;
    const date = normalizeDate(workout.date);
    if (!date) return;
    const sets = cleanSets(workout.sets || []);
    if (!sets.length) return;
    const profile = getProfile(workout.exerciseId, workout);
    if (profile.loadType === "cardio") return;
    const week = toIsoWeek(date);

    if (profile.loadType === "assisted") {
      sets.forEach((set) => {
        const assistance = Math.max(0, Number(set.weight) || 0);
        saveObservation({
          exerciseId: workout.exerciseId,
          cohortKey: `assistance:${assistance}`,
          loadType: profile.loadType,
          metricKind: "assistedRepetitions",
          metricLabel: assistance
            ? `mejor serie con ${assistance} kg de asistencia`
            : "mejor serie con asistencia fija",
          week,
          date,
          metric: Number(set.reps) || 0,
          topSet: { weight: assistance, reps: Number(set.reps) || 0 },
        });
      });
      return;
    }

    if (profile.loadType === "bodyweight") {
      const topSet = sets.reduce(
        (best, set) =>
          !best || Number(set.reps) > best.reps
            ? { weight: Number(set.weight) || 0, reps: Number(set.reps) || 0 }
            : best,
        null,
      );
      saveObservation({
        exerciseId: workout.exerciseId,
        cohortKey: "bodyweight-repetitions",
        loadType: profile.loadType,
        metricKind: "repetitions",
        metricLabel: "mejor serie por repeticiones",
        week,
        date,
        metric: topSet?.reps || 0,
        topSet,
      });
      return;
    }

    const summary = summarizeExerciseSets(workout.sets || []);
    if (!summary.strength) return;
    saveObservation({
      exerciseId: workout.exerciseId,
      cohortKey: "estimated-strength",
      loadType: profile.loadType,
      metricKind: "strength",
      metricLabel: "fuerza estimada (e1RM)",
      week,
      date,
      metric: summary.strength,
      topSet: summary.topSet,
    });
  });

  const allWeeks = Array.from(
    new Set(
      Array.from(performanceByExercise.values()).flatMap((cohorts) =>
        Array.from(cohorts.values()).flatMap((cohort) => [
          ...cohort.weeks.keys(),
        ]),
      ),
    ),
  ).sort((left, right) => left.localeCompare(right));
  const visibleWeeks = getIsoWeekRange(endWeek || allWeeks.at(-1), rangeWeeks);
  const visibleWeekSet = new Set(visibleWeeks);
  let assistedPending = 0;

  const comparable = Array.from(performanceByExercise.entries())
    .map(([exerciseId, cohorts]) => {
      const candidates = Array.from(cohorts.values())
        .map((cohort) => ({
          ...cohort,
          observations: Array.from(cohort.weeks.values())
            .filter((point) => visibleWeekSet.has(point.week))
            .sort((left, right) => left.week.localeCompare(right.week)),
        }))
        .filter((cohort) => cohort.observations.length >= 2)
        .sort((left, right) => {
          const countDifference =
            right.observations.length - left.observations.length;
          if (countDifference) return countDifference;
          return right.observations
            .at(-1)
            .week.localeCompare(left.observations.at(-1).week);
        });
      const selected = candidates[0];
      if (!selected) {
        if (
          Array.from(cohorts.values()).some(
            (cohort) => cohort.loadType === "assisted",
          )
        ) {
          assistedPending += 1;
        }
        return null;
      }
      const baseline = selected.observations[0];
      const current = selected.observations.at(-1);
      const change = baseline.metric
        ? ((current.metric - baseline.metric) / baseline.metric) * 100
        : 0;
      return {
        exerciseId,
        ...selected,
        baseline,
        current,
        change,
      };
    })
    .filter(Boolean);

  const points = comparable.length
    ? visibleWeeks
        .map((week) => {
          const indices = comparable.flatMap((exercise) => {
            const observation = exercise.observations.find(
              (point) => point.week === week,
            );
            return observation
              ? [(observation.metric / exercise.baseline.metric) * 100]
              : [];
          });
          return indices.length
            ? {
                week,
                index: median(indices),
                exerciseCount: indices.length,
              }
            : { week, index: null, exerciseCount: 0, isGap: true };
        })
    : [];

  const delta = comparable.length
    ? median(comparable.map((exercise) => exercise.change))
    : null;
  const improved = comparable.filter((exercise) => exercise.change > 2).length;
  const declined = comparable.filter((exercise) => exercise.change < -2).length;
  const metricCounts = comparable.reduce(
    (counts, exercise) => {
      counts[exercise.metricKind] = (counts[exercise.metricKind] || 0) + 1;
      return counts;
    },
    { strength: 0, repetitions: 0, assistedRepetitions: 0 },
  );
  const observedPoints = points.filter((point) => !point.isGap).length;
  const totalObservations = comparable.reduce(
    (total, exercise) => total + exercise.observations.length,
    0,
  );
  const lastObservedIndex = points.reduce(
    (latest, point, index) => (!point.isGap ? index : latest),
    -1,
  );
  const weeksSinceLast =
    lastObservedIndex >= 0 ? points.length - 1 - lastObservedIndex : 0;
  const conclusion = buildMuscleConclusion({
    delta,
    comparableExercises: comparable.length,
    observedPoints,
    totalObservations,
    weeksSinceLast,
    improved,
    declined,
    stable: comparable.length - improved - declined,
  });

  return {
    points,
    contributions: comparable.sort(
      (left, right) => Math.abs(right.change) - Math.abs(left.change),
    ),
    delta,
    currentIndex: delta === null ? null : 100 + delta,
    observedPoints,
    comparableExercises: comparable.length,
    improved,
    declined,
    stable: comparable.length - improved - declined,
    visibleWeeks,
    metricCounts,
    assistedPending,
    totalObservations,
    weeksSinceLast,
    conclusion,
  };
};
