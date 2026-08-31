import { describe, expect, it } from "vitest";
import {
  buildExerciseAnalyticsPoints,
  buildMuscleAnalytics,
  summarizeExerciseSets,
  withMovingAverage,
} from "./exerciseAnalyticsData";

describe("exerciseAnalyticsData", () => {
  it("elige como serie principal la que produce mayor fuerza estimada", () => {
    const summary = summarizeExerciseSets([
      { weight: 100, reps: 1 },
      { weight: 90, reps: 8 },
    ]);

    expect(summary.topSet).toEqual({ weight: 90, reps: 8 });
    expect(summary.strength).toBeCloseTo(114, 1);
  });

  it("conserva todas las series al calcular una semana", () => {
    const points = buildExerciseAnalyticsPoints({
      exerciseId: "press",
      workouts: [
        {
          exerciseId: "press",
          date: "2026-08-03",
          sessionKey: "a",
          sets: [
            { weight: 40, reps: 10 },
            { weight: 50, reps: 8 },
          ],
        },
        {
          exerciseId: "press",
          date: "2026-08-05",
          sessionKey: "b",
          sets: [{ weight: 55, reps: 6 }],
        },
      ],
      groupBy: "week",
    });

    expect(points).toHaveLength(1);
    expect(points[0].setsCount).toBe(3);
    expect(points[0].volume).toBe(1130);
    expect(points[0].intensityAverage).toBeGreaterThan(0);
  });

  it("mantiene separadas dos sesiones realizadas el mismo día", () => {
    const points = buildExerciseAnalyticsPoints({
      exerciseId: "remo",
      workouts: [
        {
          exerciseId: "remo",
          date: "2026-08-10",
          sessionKey: "morning",
          sets: [{ weight: 30, reps: 10 }],
        },
        {
          exerciseId: "remo",
          date: "2026-08-10",
          sessionKey: "evening",
          sets: [{ weight: 35, reps: 10 }],
        },
      ],
      groupBy: "session",
    });

    expect(points).toHaveLength(2);
    expect(points[0].strength).toBeCloseTo(40, 5);
    expect(points[1].strength).toBeCloseTo(46.67, 2);
  });

  it("calcula la tendencia antes de recortar el rango visible", () => {
    const points = [10, 20, 30, 40].map((strength, index) => ({
      key: String(index),
      strength,
    }));

    expect(withMovingAverage(points, "strength", 2, 3)).toEqual([
      { key: "2", strength: 30, movingAverage: 20 },
      { key: "3", strength: 40, movingAverage: 30 },
    ]);
  });

  it("normaliza ejercicios con cargas distintas antes de combinar el grupo", () => {
    const workouts = [
      ["press", "2026-08-03", 75, 10],
      ["press", "2026-08-10", 82.5, 10],
      ["aperturas", "2026-08-03", 15, 10],
      ["aperturas", "2026-08-10", 16.5, 10],
    ].map(([exerciseId, date, weight, reps], index) => ({
      exerciseId,
      date,
      sessionKey: String(index),
      sets: [{ weight, reps }],
    }));

    const result = buildMuscleAnalytics({
      workouts,
      exerciseIds: ["press", "aperturas"],
      rangeWeeks: 12,
    });

    expect(result.comparableExercises).toBe(2);
    expect(result.delta).toBeCloseTo(10, 5);
    expect(result.currentIndex).toBeCloseTo(110, 5);
    expect(result.points.at(-1).index).toBeCloseTo(110, 5);
  });

  it("excluye ejercicios sin una segunda observación comparable", () => {
    const result = buildMuscleAnalytics({
      workouts: [
        {
          exerciseId: "press",
          date: "2026-08-03",
          sets: [{ weight: 75, reps: 10 }],
        },
      ],
      exerciseIds: ["press"],
    });

    expect(result.comparableExercises).toBe(0);
    expect(result.delta).toBeNull();
    expect(result.points).toEqual([]);
  });
});
