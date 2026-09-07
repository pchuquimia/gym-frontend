const isSetComplete = (set) => {
  const entries = Array.isArray(set?.entries) ? set.entries : [];
  return entries.length
    ? entries.every((entry) => Boolean(entry?.done))
    : Boolean(set?.done);
};

const isExerciseComplete = (exercise) => {
  const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];
  return sets.length > 0 && sets.every(isSetComplete);
};

const getPlannedOrder = (exercise, index) => {
  const value = Number(
    exercise?.plannedOrder ??
      exercise?.programmedOrder ??
      exercise?.routineOrder,
  );
  return Number.isFinite(value) && value > 0 ? value : index + 1;
};

const getOrderContext = (plannedOrder, actualOrder, isExtra) => {
  if (isExtra) return "extra";
  if (actualOrder === 1) return plannedOrder === 1 ? "first" : "early";
  if (actualOrder === plannedOrder) return "normal";
  return actualOrder < plannedOrder ? "early" : "fatigued";
};

const hasExerciseActivity = (exercise) =>
  (exercise?.sets || []).some((set) => {
    const entries = Array.isArray(set?.entries) ? set.entries : [];
    return entries.length
      ? entries.some(
          (entry) =>
            Boolean(entry?.done) ||
            Boolean(entry?.completedAt) ||
            Boolean(entry?.userEdited),
        )
      : Boolean(set?.done);
  });

export const markExerciseStartedInPlace = (
  exercises = [],
  exerciseId = "",
) => {
  const safeExercises = Array.isArray(exercises) ? exercises : [];
  const currentIndex = safeExercises.findIndex(
    (exercise) => String(exercise?.id) === String(exerciseId),
  );
  if (currentIndex < 0) return safeExercises;

  const current = safeExercises[currentIndex];
  const nextStartedOrder =
    Number(current.startedOrder) ||
    safeExercises.reduce(
      (maximum, exercise) =>
        Math.max(
          maximum,
          Number(exercise?.startedOrder) ||
            (hasExerciseActivity(exercise)
              ? Number(exercise?.actualOrder ?? exercise?.order) || 0
              : 0),
        ),
      0,
    ) +
      1;

  return safeExercises.map((exercise, index) => {
    if (index !== currentIndex) return exercise;
    const plannedOrder = getPlannedOrder(exercise, index);
    return {
      ...exercise,
      startedOrder: nextStartedOrder,
      actualOrder: nextStartedOrder,
      orderContext: getOrderContext(
        plannedOrder,
        nextStartedOrder,
        Boolean(exercise.isExtra),
      ),
    };
  });
};

export const findAutoFlowDestination = (
  exercises = [],
  currentExerciseId = "",
) => {
  const safeExercises = Array.isArray(exercises) ? exercises : [];
  const currentIndex = safeExercises.findIndex(
    (exercise) => String(exercise?.id) === String(currentExerciseId),
  );
  if (currentIndex < 0) return null;

  const currentExercise = safeExercises[currentIndex];
  const nextSet = (currentExercise.sets || []).find(
    (set) => !isSetComplete(set),
  );
  if (nextSet) {
    return {
      type: "set",
      exerciseId: currentExercise.id,
      setId: nextSet.id,
    };
  }

  const remainingExercises = [
    ...safeExercises.slice(currentIndex + 1),
    ...safeExercises.slice(0, currentIndex),
  ];
  const nextExercise = remainingExercises.find(
    (exercise) => !isExerciseComplete(exercise),
  );

  return nextExercise
    ? { type: "exercise", exerciseId: nextExercise.id }
    : { type: "complete" };
};
