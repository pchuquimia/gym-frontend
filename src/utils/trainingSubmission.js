const hasValue = (value) =>
  value !== null && value !== undefined && String(value).trim() !== "";

const normalizeText = (value = "") =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const usesBodyweightLoad = (exercise = {}) => {
  const weightBasis = String(
    exercise?.weightBasis || exercise?.weightConfig?.basis || "",
  );
  const loadType = String(exercise?.loadType || "").toLowerCase();
  const name = normalizeText(exercise?.name || exercise?.exerciseName);
  return (
    weightBasis === "additional" ||
    weightBasis === "assistance" ||
    loadType === "bodyweight" ||
    loadType === "assisted" ||
    /\b(dominada|dominadas|pull[ -]?up|chin[ -]?up|fondos|dips?)\b/.test(name)
  );
};

export const getBodyweightCompletionIssue = (exercise = {}, entry = {}) => {
  if (!usesBodyweightLoad(exercise)) return null;

  const rawWeight = entry?.kg ?? entry?.weightKg ?? entry?.weight;
  if (!hasValue(rawWeight)) return "missing_weight";
  const weight = Number(String(rawWeight).replace(",", "."));
  if (!Number.isFinite(weight) || weight < 0) return "invalid_weight";

  const rawReps = entry?.reps ?? entry?.repetitions;
  const reps = Number(String(rawReps ?? "").replace(",", "."));
  if (!hasValue(rawReps) || !Number.isFinite(reps) || reps <= 0) {
    return "missing_reps";
  }

  return weight === 0 ? "confirm_bodyweight" : null;
};

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
