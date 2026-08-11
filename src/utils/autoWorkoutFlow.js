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
