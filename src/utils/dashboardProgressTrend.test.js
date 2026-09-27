import { describe, expect, it } from "vitest";
import { prepareTrainings } from "./progressDashboard";
import { buildDashboardProgressTrend, planColoredSeries } from "./dashboardProgressTrend";

const plan = (id, name, startDate, endDate) => ({
  _id: id,
  name,
  startDate,
  endDate,
  status: "completed",
});

const training = (id, date, weightKg, trainingPlanId, progressScopeId = "cycle") => ({
  _id: id,
  date,
  routineId: "push",
  trainingPlanId,
  progressScopeId,
  exercises: [{
    exerciseId: "press",
    loadType: "external",
    weightBasis: "total",
    sets: [{ weightKg, reps: 10, done: true }],
  }],
});

describe("dashboard progress trend", () => {
  it("shows plan spans and summarizes comparable performance without treating a first session as a decline", () => {
    const sessions = prepareTrainings([
      training("1", "2026-09-01", 50, "a"),
      training("2", "2026-09-08", 55, "a"),
      training("3", "2026-09-15", 55, "b"),
      training("4", "2026-09-22", 45, "b"),
    ]);
    const result = buildDashboardProgressTrend(
      sessions,
      [plan("a", "Base", "2026-09-01", "2026-09-14"), plan("b", "Fuerza", "2026-09-15", "2026-09-30")],
      "2026-09-01",
      "2026-09-27",
      "week",
    );

    expect(result.points[0].value).toBe(100);
    expect(result.points[1].change).toBeGreaterThan(0);
    expect(result.points[2].change).toBe(0);
    expect(result.points[3].change).toBeLessThan(0);
    expect(result.bands.map(({ name, startIndex, endIndex }) => ({ name, startIndex, endIndex }))).toEqual([
      { name: "Base", startIndex: 0, endIndex: 1 },
      { name: "Fuerza", startIndex: 2, endIndex: 3 },
    ]);
    expect(result.bands[0].color).not.toBe(result.bands[1].color);
    const series = planColoredSeries(result);
    expect(series.map(({ color }) => color)).toEqual(result.bands.map(({ color }) => color));
    expect(series[0].values.slice(0, 2)).toEqual([result.points[0].value, result.points[1].value]);
    expect(series[1].values.slice(1, 3)).toEqual([result.points[1].value, result.points[2].value]);
    expect(result.direction).toBe("declining");
  });

  it("requires repeated exercises in the same progression scope before reporting a trend", () => {
    const sessions = prepareTrainings([
      training("1", "2026-09-01", 70, "a", "old"),
      training("2", "2026-09-08", 40, "b", "new"),
    ]);
    const result = buildDashboardProgressTrend(sessions, [], "2026-09-01", "2026-09-14", "week");
    expect(result.points.every((point) => point.comparisons === 0)).toBe(true);
    expect(result.direction).toBeNull();
  });

  it("keeps weeks without comparable training empty and reports a stable overall trend", () => {
    const sessions = prepareTrainings([
      training("1", "2026-09-01", 50, "a"),
      training("2", "2026-09-08", 51, "a"),
      training("3", "2026-09-22", 51.5, "a"),
    ]);
    const result = buildDashboardProgressTrend(sessions, [], "2026-09-01", "2026-09-27", "week");
    expect(result.points[2].value).toBeNull();
    expect(result.direction).toBe("steady");
  });
});
