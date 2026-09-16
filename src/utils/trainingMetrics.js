// Utilidades de métricas y fechas para analítica de ejercicios

export const estimate1RM = (weightKg = 0, reps = 0) => {
  const w = Number(weightKg) || 0;
  const r = Number(reps) || 0;
  if (w <= 0 || r <= 0) return 0;
  if (r === 1) return w;
  return w * (1 + Math.min(r, 30) / 30); // Epley, acotado para altas repeticiones
};

export const toIsoWeek = (isoDate) => {
  const date = new Date(`${isoDate}T00:00:00`);
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
};

export const getIsoWeekStartDate = (weekKey) => {
  const match = String(weekKey || "").match(/^(\d{4})-W(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const week = Number(match[2]);
  const januaryFourth = new Date(Date.UTC(year, 0, 4));
  const januaryFourthDay = januaryFourth.getUTCDay() || 7;
  const monday = new Date(januaryFourth);
  monday.setUTCDate(
    januaryFourth.getUTCDate() - januaryFourthDay + 1 + (week - 1) * 7,
  );
  return monday;
};

export const getIsoWeekRange = (endWeek, count = 12) => {
  const end = getIsoWeekStartDate(endWeek);
  const size = Math.max(0, Number(count) || 0);
  if (!end || !size) return [];
  return Array.from({ length: size }, (_, index) => {
    const monday = new Date(end);
    monday.setUTCDate(end.getUTCDate() - (size - index - 1) * 7);
    return toIsoWeek(monday.toISOString().slice(0, 10));
  });
};

export const formatCompactWeekLabel = (weekKey) => {
  const monday = getIsoWeekStartDate(weekKey);
  if (!monday) return String(weekKey || "");
  return monday
    .toLocaleDateString("es-BO", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    })
    .replace(".", "");
};

const expandSets = (sets = []) =>
  sets.flatMap((set) => {
    const entries =
      Array.isArray(set?.entries) && set.entries.length ? set.entries : null;
    if (!entries) {
      return [
        {
          ...set,
          weight: Number(set?.weight ?? set?.weightKg ?? set?.kg ?? 0),
          reps: Number(set?.reps ?? 0),
        },
      ];
    }
    return entries.map((entry) => ({
      ...entry,
      weight: Number(entry?.weight ?? entry?.weightKg ?? entry?.kg ?? 0),
      reps: Number(entry?.reps ?? 0),
      done: entry?.done ?? set?.done,
    }));
  });

export const cleanSets = (sets = []) =>
  expandSets(sets).filter(
    (s) =>
      s?.done !== false &&
      Number(s?.weight) >= 0 &&
      Number(s?.reps) > 0 &&
      Number.isFinite(Number(s?.reps)),
  );

export const flattenWorkouts = (workouts = []) =>
  workouts.flatMap((w) =>
    (w.sets || []).map((s) => ({
      date: w.date,
      exerciseId: s.exerciseId || w.exerciseId,
      weight: Number(s.weight) || 0,
      reps: Number(s.reps) || 0,
    })),
  );

export const movingAverage = (values, window) => {
  const res = [];
  for (let i = 0; i < values.length; i += 1) {
    if (i + 1 < window) {
      res.push(null);
      continue;
    }
    const slice = values.slice(i - window + 1, i + 1);
    const avg = slice.reduce((acc, v) => acc + v, 0) / window;
    res.push(Number(avg.toFixed(1)));
  }
  return res;
};
