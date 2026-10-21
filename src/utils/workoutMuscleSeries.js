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

// Build local calendar days rather than adding milliseconds (DST can change
// the duration of a day). Keep empty dates so the weekly rhythm stays visible.
export function buildWorkoutWeeks(rows, referenceDate = new Date()) {
  const today = workoutDate(referenceDate) || new Date();
  today.setHours(12, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - 7);
  const dateKey = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      key: dateKey(date),
      date: dateKey(date),
      name: "",
      completedSets: 0,
      byPrimaryMuscle: [],
      sessions: 0,
      weekday: ["L", "M", "X", "J", "V", "S", "D"][index % 7],
      dayNumber: date.getDate(),
      isToday: date.getTime() === today.getTime(),
      status: date > today ? "future" : date < today ? "rest" : "pending",
    };
  });
  const byDate = new Map(days.map((day) => [day.key, day]));
  rows.forEach((row) => {
    const date = workoutDate(row.date);
    const day = date && byDate.get(dateKey(date));
    if (!day || day.status === "future") return;
    day.sessions += 1;
    day.name = [day.name, row.name].filter(Boolean).join(" + ");
    day.completedSets += row.completedSets;
    row.byPrimaryMuscle.forEach((item) => {
      const existing = day.byPrimaryMuscle.find(
        (entry) => entry.name === item.name,
      );
      if (existing) existing.sets += item.sets;
      else day.byPrimaryMuscle.push({ ...item });
    });
    day.status = day.completedSets > 0 ? "training" : "empty-session";
  });
  return [days.slice(0, 7), days.slice(7)];
}
