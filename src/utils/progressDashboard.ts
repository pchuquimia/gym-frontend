import {
  getExerciseLoadMetrics,
  isCompletedSet,
  toMuscleGroup,
} from "./trainingLoad";
import { summarizeExercisePerformance } from "./exercisePerformance";
import { getHistoryCompatibilitySignature } from "./historyCompatibility";
import { getScopedExerciseKey } from "./progressScope";

// Read-only projections of the existing Training, TrainingPlan and Routine APIs.
export interface Entry {
  weightKg?: number;
  reps?: number;
  done?: boolean;
}
export interface TrainingSet extends Entry {
  entries?: Entry[];
}
export interface Exercise {
  exerciseId: string;
  exerciseName?: string;
  name?: string;
  muscleGroup?: string;
  primaryMuscleGroup?: string;
  muscle?: string;
  loadType?: string;
  weightBasis?: string;
  barWeightKg?: number;
  implementCount?: number;
  movementMode?: string;
  sets: TrainingSet[];
}
export interface Training {
  _id: string;
  date: string;
  createdAt?: string;
  routineId?: string;
  routineName?: string;
  trainingPlanId?: string;
  trainingPlanSlotId?: string;
  progressScopeId?: string;
  durationSeconds?: number;
  durationOverrideSeconds?: number | null;
  exercises: Exercise[];
  branch?: string;
}
export interface Plan {
  _id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  scheduleMode: string;
  frequencyTarget?: number;
  weeklySchedule: {
    slotId: string;
    dayIndex: number;
    type: string;
    routineId?: string;
  }[];
}
export interface Routine {
  _id: string;
  exercises: { exerciseId: string; sets: number; isExtra?: boolean }[];
}
export interface Filters {
  from: string;
  to: string;
  plan: string;
  exercise: string;
  muscle: string;
  load: string;
}
export type Period = "7D" | "1M" | "3M" | "6M" | "1Y" | "ALL";
export const PERIODS: Period[] = ["7D", "1M", "3M", "6M", "1Y", "ALL"];
export const LOAD_LABELS: Record<string, string> = {
  external: "Carga externa",
  machine: "Máquina",
  bodyweight: "Peso corporal",
  assisted: "Asistido",
  cardio: "Cardio",
  unknown: "Sin clasificar",
};
export const DAY = 86400000;
export const dayKey = (date: string) => date.slice(0, 10);
export const shiftDay = (date: string, days: number) =>
  new Date(Date.parse(`${dayKey(date)}T12:00:00Z`) + days * DAY)
    .toISOString()
    .slice(0, 10);
export const daysBetween = (from: string, to: string) =>
  Math.round(
    (Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / DAY,
  ) + 1;
export const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const number = (n: number, digits = 1) =>
  new Intl.NumberFormat("es-BO", { maximumFractionDigits: digits }).format(n);
export const dateLabel = (date: string) =>
  new Date(`${dayKey(date)}T12:00:00Z`).toLocaleDateString("es-BO", {
    day: "numeric",
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
export const change = (value: number, previous: number) =>
  previous > 0 ? ((value - previous) / previous) * 100 : null;
export function rangeFor(period: Period, today: string, earliest?: string) {
  const lengths = { "7D": 7, "1M": 30, "3M": 90, "6M": 180, "1Y": 365 };
  return {
    from:
      period === "ALL"
        ? earliest || shiftDay(today, -29)
        : shiftDay(today, -(lengths[period] - 1)),
    to: today,
  };
}
export function exerciseStats(exercise: Exercise) {
  const load = getExerciseLoadMetrics(exercise);
  const sets = exercise.sets.filter(isCompletedSet);
  const reps = sets.reduce(
    (total, set) =>
      total +
      (set.entries?.length ? set.entries : [set]).reduce(
        (n, entry) => n + Math.max(0, Number(entry.reps) || 0),
        0,
      ),
    0,
  );
  const performance =
    load.loadType === "unknown"
      ? null
      : summarizeExercisePerformance({ ...exercise, sets });
  return {
    ...load,
    reps,
    performance,
    muscle: String(
      toMuscleGroup(
        exercise.primaryMuscleGroup ||
          exercise.muscleGroup ||
          exercise.muscle ||
          "",
      ) || "Sin clasificar",
    ),
  };
}
export type ExerciseStats = ReturnType<typeof exerciseStats>;
export interface ExerciseRow extends Exercise {
  stats: ExerciseStats;
}
export interface SessionRow extends Training {
  exercises: ExerciseRow[];
}
export function prepareTrainings(trainings: Training[]): SessionRow[] {
  return [...new Map(trainings.map((t) => [t._id, t])).values()]
    .filter(
      (t) =>
        /^\d{4}-\d{2}-\d{2}/.test(t.date) &&
        Number.isFinite(Date.parse(t.date)),
    )
    .map((t) => ({
      ...t,
      date: dayKey(t.date),
      exercises: (t.exercises || []).map((e) => ({
        ...e,
        sets: e.sets || [],
        stats: exerciseStats({ ...e, sets: e.sets || [] }),
      })),
    }))
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        (a.createdAt || a._id).localeCompare(b.createdAt || b._id),
    );
}
export function filterSessions(
  sessions: SessionRow[],
  filters: Filters,
): SessionRow[] {
  return sessions
    .filter(
      (s) =>
        s.date >= filters.from &&
        s.date <= filters.to &&
        (!filters.plan || s.trainingPlanId === filters.plan),
    )
    .map((s) => ({
      ...s,
      exercises: s.exercises.filter(
        (e) =>
          (!filters.exercise || e.exerciseId === filters.exercise) &&
          (!filters.muscle || e.stats.muscle === filters.muscle) &&
          (!filters.load || e.stats.loadType === filters.load),
      ),
    }))
    .filter((s) => s.exercises.some((e) => e.stats.completedSets > 0));
}
export function totals(sessions: SessionRow[], from: string, to: string) {
  const exercises = sessions.flatMap((s) => s.exercises);
  const activeDays = new Set(sessions.map((s) => s.date)).size;
  const timed = sessions.filter(
    (s) => Number(s.durationOverrideSeconds ?? s.durationSeconds) > 0,
  );
  return {
    sessions: sessions.length,
    activeDays,
    days: Math.max(1, daysBetween(from, to)),
    volume: exercises.reduce((n, e) => n + e.stats.externalKg, 0),
    machine: exercises.reduce((n, e) => n + e.stats.machineKg, 0),
    unknown: exercises.reduce((n, e) => n + e.stats.unknownKg, 0),
    sets: exercises.reduce((n, e) => n + e.stats.completedSets, 0),
    reps: exercises.reduce((n, e) => n + e.stats.reps, 0),
    minutes: timed.reduce(
      (n, s) => n + Number(s.durationOverrideSeconds ?? s.durationSeconds) / 60,
      0,
    ),
    timed: timed.length,
    frequency: (sessions.length * 7) / Math.max(1, daysBetween(from, to)),
    exerciseCount: exercises.filter((e) => e.stats.completedSets > 0).length,
  };
}
export type Totals = ReturnType<typeof totals>;
export type Metric = "volume" | "sets" | "reps" | "sessions" | "minutes";
export const METRICS: Record<Metric, { label: string; unit: string }> = {
  volume: { label: "Volumen externo", unit: "kg" },
  sets: { label: "Series completadas", unit: "series" },
  reps: { label: "Repeticiones", unit: "reps" },
  sessions: { label: "Entrenamientos", unit: "sesiones" },
  minutes: { label: "Tiempo registrado", unit: "min" },
};
export function timeline(
  sessions: SessionRow[],
  from: string,
  to: string,
  bucket: "day" | "week" | "month" = "week",
) {
  const keyFor = (d: string) =>
    bucket === "month"
      ? `${d.slice(0, 7)}-01`
      : bucket === "week"
        ? shiftDay(d, -((new Date(`${d}T12:00:00Z`).getUTCDay() + 6) % 7))
        : d;
  const groups = new Map<string, SessionRow[]>();
  for (let day = from; day <= to; day = shiftDay(day, 1))
    groups.set(keyFor(day), []);
  sessions.forEach((s) => groups.get(keyFor(s.date))?.push(s));
  return [...groups].map(([date, rows]) => ({
    date,
    ...totals(rows, from, to),
  }));
}
export interface RecordRow {
  id: string;
  date: string;
  exerciseId: string;
  name: string;
  value: number;
  previous: number;
  unit: string;
  detail: string;
  sessionId: string;
  key: string;
}
export function performanceKey(session: SessionRow, exercise: ExerciseRow) {
  const p = exercise.stats.performance;
  return [
    getScopedExerciseKey(session, exercise.exerciseId),
    getHistoryCompatibilitySignature(exercise),
    p?.comparisonKey || exercise.stats.loadType,
    session.branch || "unspecified",
    p?.loadType === "bodyweight" ? p.topSet.weightKg : "",
  ].join(":");
}
// Compare only completed performances in the same progression scope and configuration.
// A first observation is a baseline, never a personal record.
export function personalRecords(sessions: SessionRow[]): RecordRow[] {
  const best = new Map<string, number>();
  const records: RecordRow[] = [];
  for (const s of sessions) {
    const sessionBest = new Map<string, ExerciseRow>();
    for (const e of s.exercises) {
      const key = performanceKey(s, e);
      if (
        (e.stats.performance?.metric ?? 0) >
        (sessionBest.get(key)?.stats.performance?.metric ?? 0)
      )
        sessionBest.set(key, e);
    }
    for (const e of sessionBest.values()) {
      const p = e.stats.performance;
      if (!p || e.stats.loadType === "unknown") continue;
      const key = performanceKey(s, e);
      const previous = best.get(key);
      if (previous !== undefined && p.metric > previous)
        records.push({
          id: `${s._id}:${e.exerciseId}:${key}`,
          date: s.date,
          exerciseId: e.exerciseId,
          name: e.exerciseName || e.name || e.exerciseId,
          value: p.metric,
          previous,
          unit: p.metricType === "strength" ? "kg · 1RM estimado" : "reps",
          detail:
            p.metricType === "assistedRepetitions"
              ? `${number(p.assistanceKg ?? 0)} kg de asistencia`
              : `${number(p.topSet.weightKg)} kg × ${p.topSet.reps} reps`,
          sessionId: s._id,
          key,
        });
      best.set(key, Math.max(previous ?? 0, p.metric));
    }
  }
  return records;
}
export function recordsInSelection(
  records: RecordRow[],
  sessions: SessionRow[],
) {
  const selected = new Set(
    sessions.flatMap((s) => s.exercises.map((e) => `${s._id}:${e.exerciseId}`)),
  );
  return records.filter((r) => selected.has(`${r.sessionId}:${r.exerciseId}`));
}
export function planning(
  plan: Plan | undefined,
  sessions: SessionRow[],
  routines: Routine[],
  from: string,
  to: string,
  today = todayKey(),
) {
  if (
    !plan ||
    plan.scheduleMode !== "fixed" ||
    !["active", "completed"].includes(plan.status)
  )
    return null;
  const start = [from, dayKey(plan.startDate)].sort().at(-1)!;
  const end = [to, dayKey(plan.endDate), today].sort()[0];
  if (
    start > end ||
    !plan.weeklySchedule?.length ||
    plan.weeklySchedule.some((s) => s.dayIndex > 7)
  )
    return null;
  const routineMap = new Map(routines.map((r) => [r._id, r]));
  const due: { date: string; slot: Plan["weeklySchedule"][number] }[] = [];
  for (let date = start; date <= end; date = shiftDay(date, 1)) {
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay() || 7;
    plan.weeklySchedule
      .filter((s) => s.type === "training" && s.dayIndex === weekday)
      .forEach((slot) => due.push({ date, slot }));
  }
  const linked = sessions.filter(
    (s) => s.trainingPlanId === plan._id && s.date >= start && s.date <= end,
  );
  const matched = new Set<string>();
  let completed = 0,
    exercises = 0,
    sets = 0,
    omitted = 0,
    added = 0,
    missingRoutines = false;
  for (const item of due) {
    const session = linked.find(
      (s) =>
        !matched.has(s._id) &&
        s.date === item.date &&
        s.trainingPlanSlotId === item.slot.slotId,
    );
    if (session) {
      completed++;
      matched.add(session._id);
    }
    const routine = routineMap.get(item.slot.routineId || "");
    if (!routine) {
      missingRoutines = true;
      continue;
    }
    const expected = routine.exercises.filter((e) => !e.isExtra);
    exercises += expected.length;
    sets += expected.reduce((n, e) => n + e.sets, 0);
    const done =
      session?.exercises.filter((e) => e.stats.completedSets > 0) || [];
    omitted += expected.filter(
      (e) => !done.some((d) => d.exerciseId === e.exerciseId),
    ).length;
    added += done.filter(
      (e) => !expected.some((d) => d.exerciseId === e.exerciseId),
    ).length;
  }
  const matchedSessions = linked.filter((s) => matched.has(s._id));
  return {
    due: due.length,
    completed,
    adherence: due.length ? (completed / due.length) * 100 : null,
    exercises: missingRoutines ? null : exercises,
    sets: missingRoutines ? null : sets,
    omitted: missingRoutines ? null : omitted,
    added: missingRoutines ? null : added,
    unmatched: linked.length - matched.size,
    actual: totals(matchedSessions, start, end),
    dueDates: due.map((d) => d.date),
  };
}
export function comparePlans(
  plans: Plan[],
  aId: string,
  bId: string,
  sessions: SessionRow[],
  filters: Filters,
  today = todayKey(),
) {
  const a = plans.find((p) => p._id === aId),
    b = plans.find((p) => p._id === bId);
  if (!a || !b || a._id === b._id) return null;
  const elapsed = (p: Plan) =>
    Math.max(
      0,
      daysBetween(dayKey(p.startDate), [dayKey(p.endDate), today].sort()[0]),
    );
  const days = Math.min(elapsed(a), elapsed(b));
  if (!days) return null;
  const project = (p: Plan) => {
    const from = dayKey(p.startDate),
      to = shiftDay(from, days - 1);
    const selected = filterSessions(sessions, {
      ...filters,
      from,
      to,
      plan: p._id,
    });
    return {
      plan: p,
      from,
      to,
      sessions: selected,
      totals: totals(selected, from, to),
    };
  };
  return { a: project(a), b: project(b), days };
}
