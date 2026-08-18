const hasValue = (value) =>
  value !== null && value !== undefined && String(value).trim() !== "";

export const hasRecordedTrainingData = (exercises = []) =>
  (Array.isArray(exercises) ? exercises : []).some((exercise) =>
    (Array.isArray(exercise?.sets) ? exercise.sets : []).some((set) => {
      const entries =
        Array.isArray(set?.entries) && set.entries.length
          ? set.entries
          : [set];
      return entries.some(
        (entry) =>
          entry?.done === true ||
          hasValue(entry?.kg ?? entry?.weightKg ?? entry?.weight) ||
          hasValue(entry?.reps ?? entry?.repetitions),
      );
    }),
  );

export const getTrainingSaveErrorMessage = (error) => {
  const serverMessage = error?.response?.data?.error;
  if (typeof serverMessage === "string" && serverMessage.trim()) {
    return serverMessage.trim();
  }
  const normalizedMessage =
    typeof error?.message === "string" ? error.message.trim() : "";
  if (error?.code === "ERR_NETWORK" || normalizedMessage === "Network Error") {
    return "No hay conexion con el servidor. Tu entrenamiento sigue guardado en este dispositivo.";
  }
  if (normalizedMessage && normalizedMessage !== "API error") {
    return normalizedMessage;
  }
  return "No se pudo guardar el entrenamiento. Intenta de nuevo; tu progreso no se perdio.";
};
