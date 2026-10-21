import {
  dayKey,
  performanceKey,
  shiftDay,
  timeline,
  type Plan,
  type SessionRow,
} from "./progressDashboard";

export type TrendBucket = "day" | "week" | "month";
export type TrendDirection = "improving" | "steady" | "declining";

export interface TrendPoint {
  date: string;
  value: number | null;
  change: number | null;
  comparisons: number;
  planId: string;
  planName: string;
}

export interface PlanBand {
  planId: string;
  name: string;
  color: string;
  startIndex: number;
  endIndex: number;
}

export interface ProgressTrend {
  points: TrendPoint[];
  bands: PlanBand[];
  direction: TrendDirection | null;
  totalChange: number | null;
  comparisons: number;
}

export interface ColoredTrendSeries {
  name: string;
  color: string;
  values: (number | null)[];
}

export function planColoredSeries(trend: ProgressTrend): ColoredTrendSeries[] {
  return trend.bands
    .map((band, index) => {
      const values = trend.points.map((point, position) =>
        position >= band.startIndex && position <= band.endIndex
          ? point.value
          : null,
      );
      const before = band.startIndex - 1;
      if (
        before >= 0 &&
        values[band.startIndex] !== null &&
        trend.points[before].value !== null
      )
        values[before] = trend.points[before].value;
      return { name: `${band.name} ${index + 1}`, color: band.color, values };
    })
    .filter((series) => series.values.some((value) => value !== null));
}

const PLAN_COLORS = [
  "#8b5cf6",
  "#0ea5a4",
  "#e88c37",
  "#4f78d1",
  "#c05d9a",
  "#87912f",
];

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

const bucketKey = (date: string, bucket: TrendBucket) =>
  bucket === "month"
    ? `${date.slice(0, 7)}-01`
    : bucket === "week"
      ? shiftDay(date, -((new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7))
      : date;

const visiblePlan = (plan: Plan) =>
  ["active", "paused", "completed", "cancelled"].includes(plan.status);

export function buildDashboardProgressTrend(
  sessions: SessionRow[],
  plans: Plan[],
  from: string,
  to: string,
  bucket: TrendBucket,
): ProgressTrend {
  const dates = timeline([], from, to, bucket).map((point) => point.date);
  const relevantPlans = plans
    .filter(visiblePlan)
    .sort((a, b) => dayKey(a.startDate).localeCompare(dayKey(b.startDate)));
  const descendingPlans = [...relevantPlans].reverse();
  const planColors = new Map(
    relevantPlans.map((plan, index) => [
      plan._id,
      PLAN_COLORS[index % PLAN_COLORS.length],
    ]),
  );
  const planById = new Map(relevantPlans.map((plan) => [plan._id, plan]));
  const grouped = new Map<string, SessionRow[]>(
    dates.map((date) => [date, []]),
  );
  const baseline = new Map<string, number>();
  const relativePerformance = new Map<string, number>();

  for (const session of sessions) {
    if (session.date > to) continue;
    if (session.date < from) continue;
    grouped.get(bucketKey(session.date, bucket))?.push(session);
  }

  let index = 100;
  const points = dates.map((date, position): TrendPoint => {
    const rows = grouped.get(date) || [];
    let comparisons = 0;
    let hasPerformance = false;
    for (const session of rows) {
      const current = new Map<string, number>();
      for (const exercise of session.exercises) {
        const metric = exercise.stats.performance?.metric;
        if (
          !metric ||
          !Number.isFinite(metric) ||
          metric <= 0 ||
          exercise.stats.loadType === "unknown"
        )
          continue;
        const key = performanceKey(session, exercise);
        current.set(key, Math.max(current.get(key) ?? 0, metric));
      }
      for (const [key, metric] of current) {
        hasPerformance = true;
        const first = baseline.get(key);
        if (first !== undefined) {
          // Each compatible exercise contributes once, relative to its own
          // first observation. Never compound gains from different exercises.
          relativePerformance.set(key, metric / first);
          comparisons += 1;
        } else {
          baseline.set(key, metric);
        }
      }
    }
    const nextIndex = relativePerformance.size
      ? median([...relativePerformance.values()]) * 100
      : 100;
    const change = comparisons ? ((nextIndex - index) / index) * 100 : null;
    index = nextIndex;

    const linkedCounts = new Map<string, number>();
    rows.forEach((session) => {
      if (session.trainingPlanId && planById.has(session.trainingPlanId))
        linkedCounts.set(
          session.trainingPlanId,
          (linkedCounts.get(session.trainingPlanId) || 0) + 1,
        );
    });
    const linkedPlanId = [...linkedCounts].sort((a, b) => b[1] - a[1])[0]?.[0];
    const bucketEnd =
      position + 1 < dates.length ? shiftDay(dates[position + 1], -1) : to;
    const scheduledPlan = descendingPlans.find(
      (plan) =>
        dayKey(plan.startDate) <= bucketEnd && dayKey(plan.endDate) >= date,
    );
    const plan = planById.get(linkedPlanId || "") || scheduledPlan;
    return {
      date,
      value: hasPerformance ? Number(index.toFixed(1)) : null,
      change: change === null ? null : Number(change.toFixed(1)),
      comparisons,
      planId: plan?._id || "",
      planName: plan?.name || "Sin planificación",
    };
  });

  const bands: PlanBand[] = [];
  points.forEach((point, position) => {
    const last = bands.at(-1);
    if (last && last.planId === point.planId) {
      last.endIndex = position;
    } else {
      bands.push({
        planId: point.planId,
        name: point.planName,
        color: planColors.get(point.planId) || "#92979f",
        startIndex: position,
        endIndex: position,
      });
    }
  });
  const measured = points.filter((point) => point.value !== null);
  const last = measured.at(-1)?.value;
  const comparisons = measured.reduce(
    (total, point) => total + point.comparisons,
    0,
  );
  const totalChange =
    comparisons > 0 && last !== null && last !== undefined
      ? Number((last - 100).toFixed(1))
      : null;
  const direction =
    totalChange === null
      ? null
      : totalChange > 3
        ? "improving"
        : totalChange < -3
          ? "declining"
          : "steady";

  return {
    points,
    bands,
    direction,
    totalChange,
    comparisons,
  };
}
