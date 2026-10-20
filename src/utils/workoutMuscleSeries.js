import { getTrainingMuscleSetSummary } from "./trainingLoad";

const COLORS = {
  Pecho: "#4f78b8",
  Espalda: "#4e9387",
  Hombros: "#9478af",
  Bíceps: "#c37f70",
  Tríceps: "#b56788",
  Antebrazos: "#9b855f",
  Cuádriceps: "#c2a052",
  Isquiotibiales: "#9a8143",
  Glúteos: "#bf8750",
  Pantorrillas: "#a6a361",
  Aductores: "#b6a077",
  Abductores: "#b07d55",
  Core: "#738baa",
  Oblicuos: "#678b99",
  "Sin grupo muscular": "#96918a",
};

export function muscleColor(name) {
  if (COLORS[name]) return COLORS[name];
  const hash = [...name].reduce((total, char) => total + char.charCodeAt(0), 0);
  return `hsl(${hash % 360} 30% 48%)`;
}

export function workoutDate(value) {
  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value || "") ? `${value}T12:00:00` : value,
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatWorkoutDate(value, full = false) {
  return (
    workoutDate(value)?.toLocaleDateString("es-BO", {
      day: "numeric",
      month: "short",
      ...(full ? { year: "numeric" } : {}),
    }) || "Sin fecha"
  );
}

export function buildWorkoutMuscleSeries(trainings, catalogIndex = new Map()) {
  return trainings
    .filter((training) => Array.isArray(training.exercises))
    .map((training, index) => ({
      key: String(training._id || training.id || `${training.date}-${index}`),
      routineKey: String(
        training.routineId?._id ||
          training.routineId?.id ||
          training.routineId ||
          training.routineName ||
          "session",
      ),
      name:
        training.routineName ||
        training.routineId?.name ||
        training.routine?.name ||
        "Sesión",
      date: training.date,
      ...getTrainingMuscleSetSummary(training, catalogIndex),
    }))
    .sort(
      (a, b) =>
        (workoutDate(a.date)?.getTime() || 0) -
          (workoutDate(b.date)?.getTime() || 0) || a.key.localeCompare(b.key),
    );
}

export function workoutMuscles(rows) {
  return [
    ...new Set(
      rows.flatMap((row) => row.byPrimaryMuscle.map((item) => item.name)),
    ),
  ].sort((a, b) => a.localeCompare(b, "es"));
}

export function workoutSetCount(row, muscle = "") {
  return muscle
    ? row.byPrimaryMuscle.find((item) => item.name === muscle)?.sets || 0
    : row.completedSets;
}
