const recordedSets = (exercise) => (exercise.sets || []).map((set) => {
  const entries = Array.isArray(set.entries) && set.entries.length
    ? set.entries
    : [set];
  return entries.map((entry) => ({
    weight: Number(entry.weightKg ?? entry.kg ?? entry.weight ?? 0),
    reps: Number(entry.reps ?? entry.repetitions ?? 0),
  }));
});

const completedEntries = (exercise) => (exercise.sets || []).reduce(
  (count, set) => count + (
    Array.isArray(set.entries) && set.entries.length
      ? set.entries.filter((entry) => entry.done).length
      : Number(Boolean(set.done))
  ),
  0,
);

export const collapseRepeatedTrainingRows = (exercises = []) => {
  const rows = [...exercises];
  for (let index = 0; index < rows.length; index += 1) {
    const current = rows[index];
    const currentCompleted = completedEntries(current);
    for (let otherIndex = index + 1; otherIndex < rows.length; otherIndex += 1) {
      const other = rows[otherIndex];
      const otherCompleted = completedEntries(other);
      if (
        !current.exerciseId ||
        current.exerciseId !== other.exerciseId ||
        Number(current.plannedOrder || 0) !== Number(other.plannedOrder || 0) ||
        !((currentCompleted === 0 && otherCompleted > 0) || (otherCompleted === 0 && currentCompleted > 0)) ||
        JSON.stringify(recordedSets(current)) !== JSON.stringify(recordedSets(other))
      ) continue;
      if (currentCompleted > 0) rows.splice(otherIndex, 1);
      else {
        rows.splice(index, 1);
        index -= 1;
      }
      break;
    }
  }
  return rows;
};

export const getMissingRoutineSlots = (routineExercises = [], sessionExercises = []) => {
  const representedIds = new Set(sessionExercises.flatMap((exercise) => [
    exercise.id || exercise.exerciseId,
    ...(exercise.variants || []).map((variant) => variant.exerciseId),
  ]).filter(Boolean));
  return routineExercises.filter((slot) =>
    !slot.isExtra &&
    ![slot.exerciseId, ...(slot.alternatives || []).map((alt) => alt.exerciseId)]
      .some((id) => representedIds.has(id)),
  );
};
