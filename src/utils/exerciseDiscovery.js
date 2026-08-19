const normalizeText = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const FALLBACK_FAMILIES = [
  ["leg-press", "Prensa de piernas", /\b(leg press|prensa de piernas?)\b/],
  ["squat", "Sentadilla", /\b(squat|sentadill\w*)\b/],
  ["deadlift", "Peso muerto", /\b(deadlift|peso muerto)\b/],
  [
    "hip-thrust",
    "Empuje de cadera",
    /\b(hip thrust|glute bridge|puente de glute\w*|empuje de cadera)\b/,
  ],
  ["lunge", "Zancada", /\b(lunge|zancad\w*|estocad\w*)\b/],
  [
    "bench-press",
    "Press de pecho",
    /\b(bench press|chest press|press de banca|press banca|press de pecho)\b/,
  ],
  [
    "shoulder-press",
    "Press de hombros",
    /\b(shoulder press|overhead press|military press|press militar|press de hombros?)\b/,
  ],
  ["push-up", "Flexiones", /\b(push[ -]?ups?|flexiones?|lagartijas?)\b/],
  ["pull-up", "Dominadas", /\b(pull[ -]?ups?|chin[ -]?ups?|dominadas?)\b/],
  [
    "lat-pulldown",
    "Jalón al pecho",
    /\b(lat pulldown|pulldown|jalon(?:es)?(?: al pecho)?)\b/,
  ],
  ["row", "Remo", /\b(rows?|remo(?:s)?)\b/],
  [
    "lateral-raise",
    "Elevación lateral",
    /\b(lateral raises?|elevaciones? laterales?)\b/,
  ],
  [
    "chest-fly",
    "Aperturas de pecho",
    /\b(chest fl(?:y|ies)|pec deck|aperturas?(?: de pecho)?)\b/,
  ],
  [
    "biceps-curl",
    "Curl de bíceps",
    /\b(biceps? curls?|curl(?:es)? de biceps)\b/,
  ],
  [
    "triceps-extension",
    "Extensión de tríceps",
    /\b(triceps? extensions?|pushdowns?|extension(?:es)? de triceps)\b/,
  ],
  [
    "leg-extension",
    "Extensión de piernas",
    /\b(leg extensions?|extension(?:es)? de (?:piernas?|cuadriceps))\b/,
  ],
  ["leg-curl", "Curl femoral", /\b(leg curls?|curl(?:es)? femoral(?:es)?)\b/],
  [
    "calf-raise",
    "Elevación de talones",
    /\b(calf raises?|elevaciones? de talones?|pantorrillas?)\b/,
  ],
  ["plank", "Plancha", /\b(planks?|planchas?)\b/],
  ["crunch", "Abdominales", /\b(crunch(?:es)?|abdominales?)\b/],
];

const ADVANCED_PATTERN =
  /\b(unilateral|alternad\w*|incline|inclinado|decline|declinado|isometric|isometr\w*|pause|pausa|deficit|tempo|explosive|explosiv\w*|single arm|single leg|a una mano|a una pierna|behind the neck|tras nuca|smith|jm press|ez bar|agarre|grip|guillotine|palms|polea|cable|banda elastica|resistance band|amplio|cerrado|inverso)\b/;

const getFallbackDiscovery = (exercise = {}) => {
  const text = normalizeText(
    [
      exercise.localizedNames?.es,
      exercise.localizedNames?.en,
      exercise.name,
      ...(Array.isArray(exercise.aliases) ? exercise.aliases : []),
    ]
      .filter(Boolean)
      .join(" "),
  );
  const family = FALLBACK_FAMILIES.find(([, , pattern]) => pattern.test(text));
  const isAdvanced = ADVANCED_PATTERN.test(text);
  return {
    familyId: family?.[0] || "",
    familyName: family?.[1] || "",
    isEssential: Boolean(family && !isAdvanced),
    isPrimaryVariant: Boolean(family && !isAdvanced),
    score: family ? (isAdvanced ? 90 : 260) : 0,
  };
};

export const getExerciseDiscovery = (exercise = {}) => {
  const fallback = getFallbackDiscovery(exercise);
  const explicit = exercise.discovery || {};
  return {
    ...fallback,
    ...explicit,
    familyId: explicit.familyId || fallback.familyId,
    familyName: explicit.familyName || fallback.familyName,
    isEssential:
      typeof explicit.isEssential === "boolean"
        ? explicit.isEssential
        : fallback.isEssential,
    isPrimaryVariant:
      typeof explicit.isPrimaryVariant === "boolean"
        ? explicit.isPrimaryVariant
        : fallback.isPrimaryVariant,
    score: Number.isFinite(Number(explicit.score))
      ? Number(explicit.score)
      : fallback.score,
  };
};

const variantRank = (exercise, preferInferredFamily = false) => {
  const inferred = getFallbackDiscovery(exercise);
  const discovery =
    preferInferredFamily && inferred.familyId
      ? inferred
      : getExerciseDiscovery(exercise);
  return (
    (discovery.isPrimaryVariant ? 10000 : 0) +
    (discovery.isEssential ? 1000 : 0) +
    Number(discovery.score || 0) -
    String(exercise.name || "").length / 100
  );
};

export const buildExerciseFamilies = (
  exercises = [],
  { preferInferredFamily = false } = {},
) => {
  const families = new Map();
  exercises.forEach((exercise) => {
    const discovery = getExerciseDiscovery(exercise);
    const inferred = getFallbackDiscovery(exercise);
    const familyDiscovery =
      preferInferredFamily && inferred.familyId
        ? {
            ...discovery,
            familyId: inferred.familyId,
            familyName: inferred.familyName,
            isEssential: inferred.isEssential,
            isPrimaryVariant: inferred.isPrimaryVariant,
          }
        : discovery;
    const familyId =
      familyDiscovery.familyId || `exercise:${exercise.id || exercise._id}`;
    if (!families.has(familyId)) {
      families.set(familyId, {
        id: familyId,
        name: familyDiscovery.familyName || exercise.name,
        variants: [],
        isEssential: false,
      });
    }
    const family = families.get(familyId);
    family.variants.push(exercise);
    family.isEssential =
      family.isEssential || Boolean(familyDiscovery.isEssential);
  });

  return Array.from(families.values()).map((family) => {
    const variants = [...family.variants].sort(
      (left, right) =>
        variantRank(right, preferInferredFamily) -
        variantRank(left, preferInferredFamily),
    );
    return { ...family, variants, primary: variants[0] };
  });
};

export const selectEssentialFamilies = (families = [], limit = 18) => {
  const essentials = families.filter((family) => family.isEssential);
  const remaining = families.filter((family) => !family.isEssential);
  return [...essentials, ...remaining].slice(0, limit);
};
