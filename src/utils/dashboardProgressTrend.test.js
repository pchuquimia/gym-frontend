import { describe, expect, it } from "vitest";
import { prepareTrainings } from "./progressDashboard";
import {
  buildDashboardProgressTrend,
  planColoredSeries,
} from "./dashboardProgressTrend";

const plan = (id, name, startDate, endDate) => ({
  _id: id,
  name,
  startDate,
  endDate,
  status: "completed",
});

const training = (
  id,
  date,
  weightKg,
  trainingPlanId,
  progressScopeId = "cycle",
) => ({
  _id: id,
  date,
  routineId: "push",
  trainingPlanId,
  progressScopeId,
  exercises: [
    {
      exerciseId: "press",
      loadType: "external",
      weightBasis: "total",
      sets: [{ weightKg, reps: 10, done: true }],
    },
  ],
});

describe("dashboard progress trend", () => {
  const forExercise = (id, date, weight, exerciseId = "press") => ({
    ...training(id, date, weight, "a"),
    exercises: training(id, date, weight, "a").exercises.map((exercise) => ({
      ...exercise,
      exerciseId,
    })),
  });

  it("does not compound improvements from independent exercises", () => {
    const sessions = prepareTrainings([
      forExercise("1", "2026-09-01", 50),
      forExercise("2", "2026-09-02", 40, "row"),
      forExercise("3", "2026-09-08", 55),
      forExercise("4", "2026-09-09", 44, "row"),
    ]);
    const trend = buildDashboardProgressTrend(
      sessions,
      [],
      "2026-09-01",
      "2026-09-30",
      "day",
    );
    expect(trend.totalChange).toBe(10);
    expect(
      trend.points
        .filter((point) => point.value !== null)
        .map((point) => point.value),
    ).toEqual([100, 100, 110, 110]);
  });

  it("weights each comparable exercise once rather than weighting training frequency", () => {
    const sessions = prepareTrainings([
      forExercise("1", "2026-09-01", 50),
      forExercise("2", "2026-09-02", 40, "row"),
      forExercise("3", "2026-09-08", 55),
      forExercise("4", "2026-09-09", 55),
      forExercise("5", "2026-09-10", 60),
      forExercise("6", "2026-09-11", 40, "row"),
    ]);
    const trend = buildDashboardProgressTrend(
      sessions,
      [],
      "2026-09-01",
      "2026-09-30",
      "day",
    );
    expect(trend.totalChange).toBe(10); // Median of +20% and 0%.
  });

  it("keeps the final change invariant across day, week and month grouping", () => {
    const sessions = prepareTrainings([
      forExercise("1", "2026-09-01", 50),
      forExercise("2", "2026-09-02", 55),
      forExercise("3", "2026-09-03", 55),
    ]);
    for (const bucket of ["day", "week", "month"]) {
      expect(
        buildDashboardProgressTrend(
          sessions,
          [],
          "2026-09-01",
          "2026-09-30",
          bucket,
        ).totalChange,
      ).toBe(10);
    }
  });

  it("does not dilute progress with first observations of new or incompatible exercises", () => {
    const sessions = prepareTrainings([
      forExercise("1", "2026-09-01", 50),
      forExercise("2", "2026-09-08", 55),
      forExercise("3", "2026-09-09", 100, "new-exercise"),
      {
        ...forExercise("4", "2026-09-10", 500),
        progressScopeId: "other-scope",
      },
    ]);
    const trend = buildDashboardProgressTrend(
      sessions,
      [],
      "2026-09-01",
      "2026-09-30",
      "day",
    );
    expect(trend.totalChange).toBe(10);
    expect(trend.comparisons).toBe(1);
  });

  it("uses actual first-to-latest changes without an arbitrary percentage cap", () => {
    const sessions = prepareTrainings([
      forExercise("1", "2026-09-01", 50),
      forExercise("2", "2026-09-08", 100),
      forExercise("3", "2026-09-15", 50),
    ]);
    const trend = buildDashboardProgressTrend(
      sessions,
      [],
      "2026-09-01",
      "2026-09-30",
      "day",
    );
    expect(
      trend.points
        .filter((point) => point.value !== null)
        .map((point) => point.value),
    ).toEqual([100, 200, 100]);
    expect(trend.totalChange).toBe(0);
  });

  it("anchors each exercise inside the selected period and ignores future records", () => {
    const sessions = prepareTrainings([
      forExercise("old", "2026-08-20", 10),
      forExercise("1", "2026-09-01", 50),
      forExercise("2", "2026-09-08", 55),
      forExercise("future", "2026-10-01", 500),
    ]);
    expect(
      buildDashboardProgressTrend(
        sessions,
        [],
        "2026-09-01",
        "2026-09-30",
        "day",
      ).totalChange,
    ).toBe(10);
  });

  it("shows plan spans and summarizes comparable performance without treating a first session as a decline", () => {
    const sessions = prepareTrainings([
      training("1", "2026-09-01", 50, "a"),
      training("2", "2026-09-08", 55, "a"),
      training("3", "2026-09-15", 55, "b"),
      training("4", "2026-09-22", 45, "b"),
    ]);
    const result = buildDashboardProgressTrend(
      sessions,
      [
        plan("a", "Base", "2026-09-01", "2026-09-14"),
        plan("b", "Fuerza", "2026-09-15", "2026-09-30"),
      ],
      "2026-09-01",
      "2026-09-27",
      "week",
    );

    expect(result.points[0].value).toBe(100);
    expect(result.points[1].change).toBeGreaterThan(0);
    expect(result.points[2].change).toBe(0);
    expect(result.points[3].change).toBeLessThan(0);
    expect(
      result.bands.map(({ name, startIndex, endIndex }) => ({
        name,
        startIndex,
        endIndex,
      })),
    ).toEqual([
      { name: "Base", startIndex: 0, endIndex: 1 },
      { name: "Fuerza", startIndex: 2, endIndex: 3 },
    ]);
    expect(result.bands[0].color).not.toBe(result.bands[1].color);
    const series = planColoredSeries(result);
    expect(series.map(({ color }) => color)).toEqual(
      result.bands.map(({ color }) => color),
    );
    expect(series[0].values.slice(0, 2)).toEqual([
      result.points[0].value,
      result.points[1].value,
    ]);
    expect(series[1].values.slice(1, 3)).toEqual([
      result.points[1].value,
      result.points[2].value,
    ]);
    expect(result.direction).toBe("declining");
  });

  it("requires repeated exercises in the same progression scope before reporting a trend", () => {
    const sessions = prepareTrainings([
      training("1", "2026-09-01", 70, "a", "old"),
      training("2", "2026-09-08", 40, "b", "new"),
    ]);
    const result = buildDashboardProgressTrend(
      sessions,
      [],
      "2026-09-01",
      "2026-09-14",
      "week",
    );
    expect(result.points.every((point) => point.comparisons === 0)).toBe(true);
    expect(result.direction).toBeNull();
  });

  it("keeps weeks without comparable training empty and reports a stable overall trend", () => {
    const sessions = prepareTrainings([
      training("1", "2026-09-01", 50, "a"),
      training("2", "2026-09-08", 51, "a"),
      training("3", "2026-09-22", 51.5, "a"),
    ]);
    const result = buildDashboardProgressTrend(
      sessions,
      [],
      "2026-09-01",
      "2026-09-27",
      "week",
    );
    expect(result.points[2].value).toBeNull();
    expect(result.direction).toBe("steady");
  });
});
