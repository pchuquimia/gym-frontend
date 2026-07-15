export const ALL_FILTER_VALUE = "Todos";

export const EXERCISE_CATEGORIES = [
  "Fuerza e hipertrofia",
  "Cardio",
  "Movilidad",
  "Activación",
  "Estabilidad",
  "Pliometría",
];

export const BODY_REGION_GROUPS = {
  "Tren superior": [
    "Pecho",
    "Espalda",
    "Hombros",
    "Bíceps",
    "Tríceps",
    "Antebrazos",
  ],
  "Tren inferior": [
    "Cuádriceps",
    "Isquiotibiales",
    "Glúteos",
    "Aductores",
    "Abductores",
    "Pantorrillas",
    "Tibial anterior",
  ],
  "Zona media": [
    "Abdominales",
    "Oblicuos",
    "Transverso abdominal",
    "Erectores espinales",
    "Core global",
  ],
  "Cuerpo completo": [
    "Full body",
    "Levantamientos olímpicos",
    "Ejercicios metabólicos",
    "Movimientos combinados",
  ],
};

export const BODY_REGIONS = Object.keys(BODY_REGION_GROUPS);

export const LIBRARY_ENTRY_POINTS = [
  { id: "upper", label: "Tren superior", bodyRegion: "Tren superior" },
  { id: "lower", label: "Tren inferior", bodyRegion: "Tren inferior" },
  { id: "core", label: "Core", bodyRegion: "Zona media" },
  { id: "full-body", label: "Cuerpo completo", bodyRegion: "Cuerpo completo" },
  { id: "cardio", label: "Cardio", category: "Cardio" },
  { id: "mobility", label: "Movilidad", category: "Movilidad" },
  { id: "activation", label: "Activación", category: "Activación" },
];

export const VISUAL_NAVIGATION_GROUPS = {
  Pecho: ["Pecho"],
  Espalda: ["Espalda"],
  Hombros: ["Hombros"],
  Brazos: ["Bíceps", "Tríceps", "Antebrazos"],
  Piernas: [
    "Cuádriceps",
    "Isquiotibiales",
    "Aductores",
    "Abductores",
    "Pantorrillas",
    "Tibial anterior",
  ],
  Glúteos: ["Glúteos"],
  Core: [
    "Abdominales",
    "Oblicuos",
    "Transverso abdominal",
    "Erectores espinales",
    "Core global",
  ],
  "Cuerpo completo": [
    "Full body",
    "Levantamientos olímpicos",
    "Ejercicios metabólicos",
    "Movimientos combinados",
  ],
};

export const MOVEMENT_PATTERN_GROUPS = {
  "Tren superior": [
    "Empuje horizontal",
    "Empuje vertical",
    "Tracción horizontal",
    "Tracción vertical",
    "Flexión de codo",
    "Extensión de codo",
    "Elevación de hombro",
    "Abducción de hombro",
    "Rotación interna",
    "Rotación externa",
    "Retracción escapular",
    "Protracción escapular",
  ],
  "Tren inferior": [
    "Dominante de rodilla",
    "Dominante de cadera",
    "Sentadilla",
    "Bisagra de cadera",
    "Zancada",
    "Extensión de cadera",
    "Flexión de rodilla",
    "Extensión de rodilla",
    "Abducción de cadera",
    "Aducción de cadera",
    "Flexión plantar",
    "Dorsiflexión",
  ],
  "Zona media": [
    "Flexión de tronco",
    "Extensión de tronco",
    "Rotación",
    "Anti-rotación",
    "Anti-extensión",
    "Anti-flexión lateral",
    "Estabilización lumbo-pélvica",
    "Transporte de cargas",
  ],
  Globales: [
    "Empujar",
    "Jalar",
    "Cargar",
    "Transportar",
    "Lanzar",
    "Saltar",
    "Correr",
    "Trepar",
    "Arrastrar",
  ],
};

export const MOVEMENT_PATTERNS = Array.from(
  new Set(Object.values(MOVEMENT_PATTERN_GROUPS).flat()),
);

export const EQUIPMENT_OPTIONS = [
  "Peso corporal",
  "Barra",
  "Mancuernas",
  "Discos",
  "Kettlebell",
  "Polea",
  "Máquina",
  "Máquina Smith",
  "Banda elástica",
  "TRX o suspensión",
  "Balón medicinal",
  "Fitball",
  "Bosu",
  "Cajón",
  "Banco",
  "Landmine",
  "Trineo",
  "Cuerda",
  "Barra de dominadas",
  "Paralelas",
  "Caminadora",
  "Bicicleta",
  "Elíptica",
  "Remo ergómetro",
  "Escaladora",
  "Sin equipamiento",
];

export const EXERCISE_TYPE_OPTIONS = [
  "Monoarticular o aislamiento",
  "Multiarticular o compuesto",
];

export const LATERALITY_OPTIONS = ["Bilateral", "Unilateral", "Alternado"];

export const KINETIC_CHAIN_OPTIONS = [
  "Cadena cinética abierta",
  "Cadena cinética cerrada",
  "Mixta",
];

export const EXECUTION_TYPE_OPTIONS = [
  "Dinámico",
  "Isométrico",
  "Isocinético",
  "Excéntrico",
  "Concéntrico",
  "Reactivo",
  "Balístico",
];

export const STABILITY_OPTIONS = [
  "Estable",
  "Inestable",
  "Guiado por máquina",
  "Peso libre",
];

export const POSITION_OPTIONS = [
  "De pie",
  "Sentado",
  "Acostado en supino",
  "Acostado en prono",
  "Decúbito lateral",
  "Cuadrupedia",
  "Arrodillado",
  "Medio arrodillado",
  "Suspendido",
  "Inclinado",
  "Declinado",
  "Apoyado en banco",
  "En máquina",
];

export const DIFFICULTY_OPTIONS = ["Principiante", "Intermedio", "Avanzado"];

export const GOAL_OPTIONS = [
  "Fuerza máxima",
  "Hipertrofia",
  "Resistencia muscular",
  "Potencia",
  "Velocidad",
  "Acondicionamiento cardiovascular",
  "Pérdida de grasa",
  "Activación",
  "Movilidad",
  "Estabilidad",
  "Coordinación",
  "Equilibrio",
  "Rehabilitación",
  "Técnica",
  "Prevención de lesiones",
];

const MUSCLE_GROUP_ALIASES = {
  biceps: "Bíceps",
  triceps: "Tríceps",
  cuadricep: "Cuádriceps",
  cuadriceps: "Cuádriceps",
  femoral: "Isquiotibiales",
  femorales: "Isquiotibiales",
  isquios: "Isquiotibiales",
  gluteo: "Glúteos",
  gluteos: "Glúteos",
  abdomen: "Abdominales",
  abdominales: "Abdominales",
  core: "Core global",
  "full body": "Full body",
  "cuerpo completo": "Full body",
};

const DEFAULT_PATTERN_BY_GROUP = {
  Pecho: "Empuje horizontal",
  Espalda: "Tracción horizontal",
  Hombros: "Empuje vertical",
  Bíceps: "Flexión de codo",
  Tríceps: "Extensión de codo",
  Antebrazos: "Flexión de codo",
  Cuádriceps: "Dominante de rodilla",
  Isquiotibiales: "Bisagra de cadera",
  Glúteos: "Extensión de cadera",
  Aductores: "Aducción de cadera",
  Abductores: "Abducción de cadera",
  Pantorrillas: "Flexión plantar",
  "Tibial anterior": "Dorsiflexión",
  Abdominales: "Flexión de tronco",
  Oblicuos: "Rotación",
  "Transverso abdominal": "Anti-extensión",
  "Erectores espinales": "Extensión de tronco",
  "Core global": "Estabilización lumbo-pélvica",
  "Full body": "Cargar",
  "Levantamientos olímpicos": "Empujar",
  "Ejercicios metabólicos": "Correr",
  "Movimientos combinados": "Transportar",
};

export const normalizeText = (value = "") =>
  value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const toArray = (value) => {
  if (Array.isArray(value)) {
    return value.flatMap(toArray).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

export const formatList = (value, fallback = "No especificado") => {
  const list = toArray(value);
  return list.length ? list.join(", ") : fallback;
};

export const optionMatches = (left, right) =>
  normalizeText(left) === normalizeText(right);

export const listIncludesOption = (list, option) =>
  toArray(list).some((item) => optionMatches(item, option));

export const canonicalizeMuscleGroup = (value = "") => {
  const raw = value?.toString().trim() || "";
  if (!raw) return "";
  const normalized = normalizeText(raw);
  const exact = Object.values(BODY_REGION_GROUPS)
    .flat()
    .find((group) => optionMatches(group, raw));
  return exact || MUSCLE_GROUP_ALIASES[normalized] || raw;
};

export const getMuscleGroupsForBodyRegion = (bodyRegion) =>
  BODY_REGION_GROUPS[bodyRegion] || [];

export const getBodyRegionForGroup = (group = "") => {
  const canonical = canonicalizeMuscleGroup(group);
  return (
    BODY_REGIONS.find((region) =>
      BODY_REGION_GROUPS[region].some((item) => optionMatches(item, canonical)),
    ) || ""
  );
};

export const getNavigationRegionForGroup = (group = "") => {
  const canonical = canonicalizeMuscleGroup(group);
  return (
    Object.entries(VISUAL_NAVIGATION_GROUPS).find(([, groups]) =>
      groups.some((item) => optionMatches(item, canonical)),
    )?.[0] || canonical
  );
};

export const getMovementPatternsForBodyRegion = (bodyRegion = "") => {
  if (bodyRegion === "Cuerpo completo") return MOVEMENT_PATTERN_GROUPS.Globales;
  return MOVEMENT_PATTERN_GROUPS[bodyRegion] || MOVEMENT_PATTERNS;
};

export const getDefaultMovementPatternForGroup = (group = "") =>
  DEFAULT_PATTERN_BY_GROUP[canonicalizeMuscleGroup(group)] ||
  "Empuje horizontal";

export const getPrimaryMuscleGroup = (exercise = {}) =>
  canonicalizeMuscleGroup(
    exercise.primaryMuscleGroup || exercise.primaryMuscle || exercise.muscle,
  );

export const getExerciseBodyRegion = (exercise = {}) =>
  exercise.bodyRegion || getBodyRegionForGroup(getPrimaryMuscleGroup(exercise));

export const getExerciseNavigationRegion = (exercise = {}) =>
  exercise.navigationRegion ||
  getNavigationRegionForGroup(getPrimaryMuscleGroup(exercise));

export const getExerciseCategories = (exercise = {}) => {
  const categories = toArray(exercise.categories);
  if (categories.length) return categories;
  return toArray(exercise.category);
};

export const getExerciseMovementPatterns = (exercise = {}) => {
  const patterns = toArray(exercise.movementPatterns);
  if (patterns.length) return patterns;
  return toArray(exercise.movementPattern);
};

export const getExerciseEquipment = (exercise = {}) =>
  toArray(exercise.equipment);

export const getExerciseGoals = (exercise = {}) => toArray(exercise.goals);

export const getExerciseType = (exercise = {}) => {
  if (exercise.exerciseType) return exercise.exerciseType;
  if (exercise.mechanics === "compound") return "Multiarticular o compuesto";
  if (exercise.mechanics === "isolation") return "Monoarticular o aislamiento";
  return "";
};

export const getExerciseLaterality = (exercise = {}) =>
  exercise.laterality ||
  (exercise.movementMode === "unilateral" ? "Unilateral" : "Bilateral");

export const getExerciseSearchText = (exercise = {}) =>
  [
    exercise.name,
    ...toArray(exercise.aliases),
    ...getExerciseCategories(exercise),
    getExerciseBodyRegion(exercise),
    getExerciseNavigationRegion(exercise),
    getPrimaryMuscleGroup(exercise),
    ...toArray(exercise.primaryMuscles),
    ...toArray(exercise.secondaryMuscles),
    ...toArray(exercise.stabilizerMuscles),
    ...getExerciseMovementPatterns(exercise),
    ...getExerciseEquipment(exercise),
    getExerciseType(exercise),
    getExerciseLaterality(exercise),
    exercise.kineticChain,
    exercise.executionType,
    exercise.stability,
    exercise.position,
    exercise.difficulty,
    ...getExerciseGoals(exercise),
    ...toArray(exercise.tags),
  ]
    .filter(Boolean)
    .join(" ");

export const exerciseHasAnyGroup = (exercise, groups = []) => {
  if (!groups.length) return true;
  const group = getPrimaryMuscleGroup(exercise);
  return groups.some((item) => optionMatches(item, group));
};

export const exerciseMatchesValue = (value, expected) => {
  if (!expected || expected === ALL_FILTER_VALUE) return true;
  if (Array.isArray(value))
    return value.some((item) => optionMatches(item, expected));
  return optionMatches(value, expected);
};

export const makeDefaultExerciseTaxonomy = (group = "Pecho") => {
  const primaryMuscleGroup = canonicalizeMuscleGroup(group) || "Pecho";
  const bodyRegion =
    getBodyRegionForGroup(primaryMuscleGroup) || "Tren superior";
  return {
    categories: ["Fuerza e hipertrofia"],
    category: "Fuerza e hipertrofia",
    bodyRegion,
    navigationRegion: getNavigationRegionForGroup(primaryMuscleGroup),
    primaryMuscleGroup,
    primaryMuscles: [],
    secondaryMuscles: [],
    stabilizerMuscles: [],
    movementPatterns: [getDefaultMovementPatternForGroup(primaryMuscleGroup)],
    movementPattern: getDefaultMovementPatternForGroup(primaryMuscleGroup),
    equipment: [],
    exerciseType: "Multiarticular o compuesto",
    laterality: "Bilateral",
    kineticChain: "Cadena cinética abierta",
    executionType: "Dinámico",
    stability: "Peso libre",
    position: "De pie",
    difficulty: "Intermedio",
    goals: ["Hipertrofia"],
    precautions: [],
  };
};
