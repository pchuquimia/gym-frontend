const LOAD_TYPES = new Set([
  "external",
  "machine",
  "bodyweight",
  "assisted",
  "cardio",
  "unknown",
]);

const normalizeText = (value = "") =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const asArray = (value) =>
  (Array.isArray(value) ? value : value ? [value] : []).filter(Boolean);

const includesAny = (text, terms) => terms.some((term) => text.includes(term));

export function buildExerciseCatalogIndex(exercises = []) {
  const index = new Map();
  exercises.forEach((exercise) => {
    const keys = [
      exercise.id,
      exercise._id,
      exercise.slug,
      exercise.name,
      exercise.localizedNames?.es,
      exercise.localizedNames?.en,
    ];
    keys.forEach((key) => {
      const normalized = normalizeText(key);
      if (normalized && !index.has(normalized)) index.set(normalized, exercise);
    });
  });
  return index;
}

export function getCatalogExercise(exercise = {}, catalogIndex = new Map()) {
  const keys = [
    exercise.exerciseId,
    exercise.id,
    exercise._id,
    exercise.slug,
    exercise.exerciseName,
    exercise.name,
  ];
  for (const key of keys) {
    const match = catalogIndex.get(normalizeText(key));
    if (match) return match;
  }
  return null;
}

export function classifyExerciseLoad(exercise = {}, catalog = null) {
  const merged = { ...(catalog || {}), ...exercise };
  if (!asArray(exercise.equipment).length && catalog?.equipment) {
    merged.equipment = catalog.equipment;
  }
  const explicit = normalizeText(merged.loadType);
  if (LOAD_TYPES.has(explicit)) return explicit;

  const equipment = asArray(merged.equipment).map(normalizeText);
  const text = normalizeText(
    [
      merged.exerciseName,
      merged.name,
      ...asArray(merged.aliases),
      ...asArray(merged.tags),
      ...equipment,
    ].join(" "),
  );

  if (includesAny(text, ["asist", "assisted", "gravitron"])) {
    return "assisted";
  }
  if (
    includesAny(text, [
      "caminadora",
      "treadmill",
      "bicicleta",
      "bike",
      "eliptica",
      "ergometro",
      "escaladora",
      "stair",
    ])
  ) {
    return "cardio";
  }
  if (
    includesAny(text, [
      "maquina",
      "machine",
      "polea",
      "cable",
      "smith",
      "landmine",
    ])
  ) {
    return "machine";
  }
  if (includesAny(text, ["lastrad", "weighted"])) return "external";
  if (
    includesAny(text, [
      "peso corporal",
      "bodyweight",
      "sin equipamiento",
      "barra de dominadas",
      "paralelas",
      "suspension",
      "trx",
    ]) ||
    (!equipment.length &&
      includesAny(text, [
        "dominada",
        "pull-up",
        "pull up",
        "flexion",
        "push-up",
        "push up",
        "fondos",
        "dips",
        "plancha",
        "plank",
        "burpee",
      ]))
  ) {
    return "bodyweight";
  }
  if (
    includesAny(text, [
      "barra",
      "barbell",
      "mancuerna",
      "dumbbell",
      "kettlebell",
      "disco",
      "plate",
      "balon medicinal",
      "medicine ball",
      "trineo",
      "sled",
    ])
  ) {
    return "external";
  }
  return "unknown";
}

export function isCompletedSet(set = {}) {
  const entries = Array.isArray(set.entries) ? set.entries : [];
  if (entries.length) return entries.every((entry) => entry.done === true);
  return set.done === true;
}

export function hasRecordedSetData(set = {}) {
  const entries =
    Array.isArray(set.entries) && set.entries.length ? set.entries : [set];
  return entries.some((entry) => {
    const weight = entry.weightKg ?? entry.weight ?? entry.kg;
    const reps = entry.reps ?? entry.repetitions;
    return (
      entry.done === true ||
      Boolean(entry.completedAt) ||
      (weight !== null && weight !== undefined && weight !== "") ||
      (reps !== null && reps !== undefined && reps !== "")
    );
  });
}

function getCompletedSetVolume(set = {}) {
  if (!isCompletedSet(set)) return 0;
  const entries =
    Array.isArray(set.entries) && set.entries.length ? set.entries : [set];
  return entries.reduce((sum, entry) => {
    const weight = Number(entry.weightKg ?? entry.weight ?? entry.kg ?? 0);
    const reps = Number(entry.reps ?? entry.repetitions ?? 0);
    return (
      sum +
      (Number.isFinite(weight) &&
      Number.isFinite(reps) &&
      weight > 0 &&
      reps > 0
        ? weight * reps
        : 0)
    );
  }, 0);
}

export function getExerciseLoadMetrics(
  exercise = {},
  catalogIndex = new Map(),
) {
  const catalog = getCatalogExercise(exercise, catalogIndex);
  const loadType = classifyExerciseLoad(exercise, catalog);
  const recordedSets = (exercise.sets || []).filter(hasRecordedSetData);
  const completedSets = recordedSets.filter(isCompletedSet);
  const recordedKg = completedSets.reduce(
    (sum, set) => sum + getCompletedSetVolume(set),
    0,
  );
  const metrics = {
    loadType,
    recordedSets: recordedSets.length,
    completedSets: completedSets.length,
    incompleteSets: recordedSets.length - completedSets.length,
    externalKg: 0,
    machineKg: 0,
    unknownKg: 0,
    assistanceKg: 0,
    bodyweightSets: 0,
    assistedSets: 0,
    machineSets: 0,
    cardioSets: 0,
    unknownSets: 0,
  };

  if (loadType === "external") metrics.externalKg = recordedKg;
  else if (loadType === "machine") {
    metrics.machineKg = recordedKg;
    metrics.machineSets = completedSets.length;
  } else if (loadType === "assisted") {
    metrics.assistanceKg = recordedKg;
    metrics.assistedSets = completedSets.length;
  } else if (loadType === "bodyweight") {
    metrics.bodyweightSets = completedSets.length;
  } else if (loadType === "cardio") {
    metrics.cardioSets = completedSets.length;
  } else {
    metrics.unknownKg = recordedKg;
    metrics.unknownSets = completedSets.length;
  }

  return metrics;
}

export function getTrainingLoadMetrics(
  training = {},
  catalogIndex = new Map(),
) {
  const total = {
    recordedSets: 0,
    completedSets: 0,
    incompleteSets: 0,
    externalKg: 0,
    machineKg: 0,
    unknownKg: 0,
    assistanceKg: 0,
    bodyweightSets: 0,
    assistedSets: 0,
    machineSets: 0,
    cardioSets: 0,
    unknownSets: 0,
  };
  (training.exercises || []).forEach((exercise) => {
    const metrics = getExerciseLoadMetrics(exercise, catalogIndex);
    Object.keys(total).forEach((key) => {
      total[key] += Number(metrics[key] || 0);
    });
  });
  total.recordedKg = total.externalKg + total.machineKg + total.unknownKg;
  return total;
}

export function toMuscleGroup(value = "") {
  const key = normalizeText(value);
  if (!key) return "";
  const groups = [
    [["pectoral", "pecho", "chest"], "Pecho"],
    [
      [
        "dorsal",
        "latiss",
        "espalda",
        "trapec",
        "trap",
        "romboid",
        "rhomboid",
        "back",
      ],
      "Espalda",
    ],
    [["deltoid", "hombro", "rotador", "shoulder"], "Hombros"],
    [["bicep"], "Bíceps"],
    [["tricep"], "Tríceps"],
    [["antebrazo", "forearm"], "Antebrazos"],
    [["cuadricep", "quadricep"], "Cuádriceps"],
    [["isqui", "femoral", "hamstring"], "Isquiotibiales"],
    [["glute"], "Glúteos"],
    [["aductor", "adductor"], "Aductores"],
    [["abductor"], "Abductores"],
    [["pantorr", "gemelo", "soleo", "calf", "calv"], "Pantorrillas"],
    [["tibial"], "Tibial anterior"],
    [["oblic", "obliq"], "Oblicuos"],
    [["transvers"], "Transverso abdominal"],
    [["erector", "lumbar"], "Erectores espinales"],
    [["abdominal", "core", "zona media"], "Core"],
  ];
  return groups.find(([terms]) => includesAny(key, terms))?.[1] || value;
}

export function getExerciseMuscleWeights(
  exercise = {},
  catalogIndex = new Map(),
) {
  const catalog = getCatalogExercise(exercise, catalogIndex) || {};
  const merged = { ...catalog, ...exercise };
  const weights = new Map();
  const add = (value, weight) => {
    const group = toMuscleGroup(value);
    const key = normalizeText(group);
    if (!key || key === "sin grupo") return;
    const current = weights.get(key);
    if (!current || current.weight < weight)
      weights.set(key, { group, weight });
  };

  const primaryGroup =
    merged.primaryMuscleGroup || merged.muscleGroup || merged.muscle;
  if (primaryGroup) add(primaryGroup, 1);
  else {
    const primaryMuscles = asArray(exercise.primaryMuscles).length
      ? exercise.primaryMuscles
      : catalog.primaryMuscles || merged.primaryMuscle;
    asArray(primaryMuscles).forEach((muscle) => add(muscle, 1));
  }
  const secondaryMuscles = asArray(exercise.secondaryMuscles).length
    ? exercise.secondaryMuscles
    : catalog.secondaryMuscles;
  const stabilizerMuscles = asArray(exercise.stabilizerMuscles).length
    ? exercise.stabilizerMuscles
    : catalog.stabilizerMuscles;
  asArray(secondaryMuscles).forEach((muscle) => add(muscle, 0.5));
  asArray(stabilizerMuscles).forEach((muscle) => add(muscle, 0.25));
  if (!weights.size) add("Sin grupo", 1);
  return Array.from(weights.values());
}

export function getExerciseMuscleExposure(
  exercise = {},
  catalogIndex = new Map(),
) {
  const completedSets = getExerciseLoadMetrics(
    exercise,
    catalogIndex,
  ).completedSets;
  return getExerciseMuscleWeights(exercise, catalogIndex).map((muscle) => ({
    ...muscle,
    equivalentSets: completedSets * muscle.weight,
  }));
}
