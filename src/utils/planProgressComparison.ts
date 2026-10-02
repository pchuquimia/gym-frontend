import { buildDashboardProgressTrend } from "./dashboardProgressTrend";
import {
  daysBetween,
  filterSessions,
  rangeForPlan,
  type Plan,
  type SessionRow,
} from "./progressDashboard";

export interface PlanProgressData {
  plan: Plan;
  from: string;
  to: string;
  points: { date: string; value: number; comparisons: number }[];
  weekly: { week: number; value: number }[];
  comparisons: number;
  totalChange: number | null;
}

export function buildPlanProgressData(
  plan: Plan,
  sessions: SessionRow[],
  muscle: string,
  today: string,
): PlanProgressData | null {
  const range = rangeForPlan(plan, today);
  if (!range || range.from > range.to) return null;
  const selectedSessions = filterSessions(sessions, {
    ...range,
    plan: plan._id,
    exercise: "",
    muscle,
    load: "",
  });
  const trend = buildDashboardProgressTrend(
    selectedSessions,
    [plan],
    range.from,
    range.to,
    "day",
  );
  const points = trend.points.flatMap((point) => point.value === null
    ? []
    : [{ date: point.date, value: point.value, comparisons: point.comparisons }]);
  const weekly = new Map<number, number>();
  points.forEach((point) => {
    const week = Math.floor((daysBetween(range.from, point.date) - 1) / 7) + 1;
    weekly.set(week, point.value);
  });
  const firstWeekValue = weekly.values().next().value || 100;

  return {
    plan,
    ...range,
    points,
    weekly: [...weekly].map(([week, value]) => ({
      week,
      value: Number(((value / firstWeekValue) * 100).toFixed(1)),
    })),
    comparisons: trend.comparisons,
    totalChange: trend.totalChange,
  };
}

export function alignPlanProgressWeeks(
  current: PlanProgressData,
  comparison: PlanProgressData,
) {
  const maxWeek = Math.max(
    current.weekly.at(-1)?.week || 0,
    comparison.weekly.at(-1)?.week || 0,
  );
  const valuesFor = (progress: PlanProgressData) => {
    const byWeek = new Map(progress.weekly.map(({ week, value }) => [week, value]));
    return Array.from({ length: maxWeek }, (_, index) => byWeek.get(index + 1) ?? null);
  };
  return {
    labels: Array.from({ length: maxWeek }, (_, index) => `Semana ${index + 1}`),
    current: valuesFor(current),
    comparison: valuesFor(comparison),
  };
}
