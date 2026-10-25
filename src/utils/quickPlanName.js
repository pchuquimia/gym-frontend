const normalize = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const matches = (text, pattern) => pattern.test(text);
const patterns = {
  push: /\b(push|empuje)\b/,
  pull: /\b(pull|jale|jalon|traccion|tiron)\b/,
  legs: /\b(lower|low|legs?|piernas?|tren inferior)\b/,
  torso: /\b(upper|torso|tren superior)\b/,
  full: /\b(full[ -]?body|cuerpo completo)\b/,
  pushMuscles:
    /\b(pecho|pectoral\w*|chest|tricep\w*|hombro\w*|deltoid\w*|shoulder\w*)\b/,
  pullMuscles:
    /\b(espalda|dorsal\w*|back|bicep\w*|trapec\w*|romboid\w*|antebrazo\w*|forearm\w*)\b/,
  legMuscles:
    /\b(cuadricep\w*|quadricep\w*|femoral\w*|isqui\w*|hamstring\w*|glute\w*|pantorr\w*|gemelo\w*|calf|calves|aduct\w*|abduct\w*)\b/,
  core: /\b(core|abdomen|abdominal\w*|abs|oblic\w*|zona media)\b/,
  cardio: /\b(cardio|carrera|running|ciclismo|cycling)\b/,
};

const distribution = ({ push, pull, legs, torso }) => {
  const upper = push || pull || torso;
  if (upper && legs) return "Cuerpo completo";
  if (torso || (push && pull)) return "Torso";
  if (legs) return "Pierna";
  if (push) return "Empuje";
  if (pull) return "Jale";
  return "";
};

const routineType = (routine) => {
  const title = normalize(routine.name);
  if (matches(title, patterns.full)) return "Cuerpo completo";
  // Explicit split names describe the user's intent, even with accessory work.
  const explicit = distribution(
    Object.fromEntries(
      ["push", "pull", "legs", "torso"].map((key) => [
        key,
        matches(title, patterns[key]),
      ]),
    ),
  );
  if (explicit) return explicit;

  const muscles = (routine.exercises || [])
    .filter((exercise) => !exercise.isExtra)
    .flatMap((exercise) => [
      exercise.primaryMuscleGroup || exercise.muscleGroup || exercise.muscle,
      exercise.primaryMuscle,
      ...(Array.isArray(exercise.primaryMuscles)
        ? exercise.primaryMuscles
        : [exercise.primaryMuscles]),
    ])
    .filter((value) => typeof value === "string");
  const focus = normalize([routine.name, ...muscles].join(" "));
  return (
    distribution({
      push: matches(focus, patterns.pushMuscles),
      pull: matches(focus, patterns.pullMuscles),
      legs: matches(focus, patterns.legMuscles),
    }) ||
    (matches(focus, patterns.core)
      ? "Core"
      : matches(focus, patterns.cardio)
        ? "Cardio"
        : "")
  );
};

/** A compact split suggestion, without copying routine titles or A/B suffixes. */
export const suggestQuickPlanName = (routines = []) => {
  if (!routines.length) return "Mi planificación";
  const types = new Set(routines.map(routineType));
  if (types.has("")) return "Plan semanal";
  if (types.size === 1) return [...types][0];
  if (types.has("Cuerpo completo") || types.has("Cardio"))
    return "Entrenamiento mixto";
  if (types.has("Torso")) {
    types.delete("Empuje");
    types.delete("Jale");
  }
  return ["Empuje", "Jale", "Torso", "Pierna", "Core"]
    .filter((type) => types.has(type))
    .join(" · ");
};
