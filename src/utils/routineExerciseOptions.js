export const buildRoutineExerciseOptionMap = (
  availableExercises = [],
  remoteExerciseOptions = [],
) =>
  new Map(
    [...availableExercises, ...remoteExerciseOptions].map((exercise) => [
      String(exercise.id),
      exercise,
    ]),
  );
