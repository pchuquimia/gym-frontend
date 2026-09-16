import { describe, expect, it } from "vitest";
import {
  buildExerciseConclusion,
  buildExerciseAnalyticsPoints,
  buildMuscleConclusion,
  buildMuscleAnalytics,
  selectExerciseAnalyticsRange,
  summarizeExerciseSets,
  withMovingAverage,
} from "./exerciseAnalyticsData";

describe("exerciseAnalyticsData", () => {
  it("no interpreta la tendencia de un ejercicio con un solo registro", () => {
    const conclusion = buildExerciseConclusion({
      points: [{ strength: 80 }],
      metric: "strength",
    });

    expect(conclusion.trend).toBe("insufficient");
    expect(conclusion.change).toBeNull();
  });

  it("compara bloques recientes para detectar aumento de fuerza", () => {
    const conclusion = buildExerciseConclusion({
      points: [80, 82, 84, 90, 92, 94].map((strength) => ({ strength })),
      metric: "strength",
      metricType: "strength",
      groupBy: "session",
    });

    expect(conclusion.title).toBe("Fuerza en aumento");
    expect(conclusion.confidence).toBe("high");
    expect(conclusion.change).toBeGreaterThan(10);
  });

  it("aclara que un aumento de trabajo no demuestra más fuerza", () => {
    const conclusion = buildExerciseConclusion({
      points: [1000, 1050, 1200, 1250].map((volume) => ({ volume })),
      metric: "volume",
      metricType: "workload",
    });

    expect(conclusion.title).toBe("Trabajo reciente mayor");
    expect(conclusion.limitation).toContain("no implica por sí solo");
  });

  it("reduce la confianza cuando hay demasiadas semanas vacías", () => {
    const conclusion = buildExerciseConclusion({
      points: [
        { strength: 80 },
        { isGap: true, strength: null },
        { isGap: true, strength: null },
        { strength: 82 },
        { isGap: true, strength: null },
        { isGap: true, strength: null },
      ],
      metric: "strength",
      metricType: "strength",
    });

    expect(conclusion.confidence).toBe("low");
    expect(conclusion.limitation).toContain("semanas sin registros");
  });

  it("marca como histórica una tendencia cuyo último registro es antiguo", () => {
    const conclusion = buildExerciseConclusion({
      points: [
        { strength: 80 },
        { strength: 84 },
        { isGap: true, strength: null },
        { isGap: true, strength: null },
        { isGap: true, strength: null },
        { isGap: true, strength: null },
      ],
      metric: "strength",
      metricType: "strength",
    });

    expect(conclusion.title).toContain("histórico");
    expect(conclusion.confidence).toBe("low");
    expect(conclusion.weeksSinceLast).toBe(4);
  });

  it("no concluye cuando faltan semanas comparables", () => {
    const conclusion = buildMuscleConclusion({
      delta: 8,
      comparableExercises: 1,
      observedPoints: 1,
      improved: 1,
    });

    expect(conclusion.trend).toBe("insufficient");
    expect(conclusion.confidence).toBe("insufficient");
  });

  it("marca como preliminar una mejora basada en un solo ejercicio", () => {
    const conclusion = buildMuscleConclusion({
      delta: 10,
      comparableExercises: 1,
      observedPoints: 3,
      improved: 1,
    });

    expect(conclusion.title).toBe("Progreso probable");
    expect(conclusion.confidence).toBe("low");
    expect(conclusion.limitation).toContain("un solo ejercicio");
  });

  it("eleva la confianza cuando varias semanas y ejercicios coinciden", () => {
    const conclusion = buildMuscleConclusion({
      delta: 7.5,
      comparableExercises: 4,
      observedPoints: 6,
      improved: 3,
      stable: 1,
    });

    expect(conclusion.title).toBe("Progreso consistente");
    expect(conclusion.confidence).toBe("high");
    expect(conclusion.agreement).toBe(0.75);
  });

  it("no asigna confianza alta si cada ejercicio tiene pocas observaciones", () => {
    const conclusion = buildMuscleConclusion({
      delta: 8,
      comparableExercises: 3,
      observedPoints: 5,
      totalObservations: 6,
      improved: 3,
    });

    expect(conclusion.confidence).toBe("medium");
    expect(conclusion.evidence).toContain("6 observaciones");
  });

  it("advierte cuando los ejercicios no coinciden en la tendencia", () => {
    const conclusion = buildMuscleConclusion({
      delta: -5,
      comparableExercises: 3,
      observedPoints: 5,
      improved: 1,
      declined: 1,
      stable: 1,
    });

    expect(conclusion.title).toBe("Descenso probable");
    expect(conclusion.confidence).toBe("medium");
    expect(conclusion.limitation).toContain("misma dirección");
  });

  it("elige como serie principal la que produce mayor fuerza estimada", () => {
    const summary = summarizeExerciseSets([
      { weight: 100, reps: 1 },
      { weight: 90, reps: 8 },
    ]);

    expect(summary.topSet).toEqual({ weight: 90, reps: 8 });
    expect(summary.strength).toBeCloseTo(114, 1);
  });

  it("excluye series marcadas como no completadas", () => {
    const summary = summarizeExerciseSets([
      { weight: 200, reps: 10, done: false },
      { weight: 80, reps: 8, done: true },
      { weight: 60, reps: 10 },
    ]);

    expect(summary.setsCount).toBe(2);
    expect(summary.volume).toBe(1240);
    expect(summary.strength).toBeCloseTo(101.33, 2);
  });

  it("alinea la estimación de 1RM para una repetición y series largas", () => {
    expect(summarizeExerciseSets([{ weight: 100, reps: 1 }]).strength).toBe(
      100,
    );
    expect(summarizeExerciseSets([{ weight: 50, reps: 40 }]).strength).toBe(
      100,
    );
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
    expect(points[0].sessionCount).toBe(2);
    expect(points[0].setsCount).toBe(3);
    expect(points[0].volume).toBe(1130);
    expect(points[0].intensityAverage).toBeGreaterThan(0);
  });

  it("conserva trabajo con peso corporal y calcula el promedio por sesión", () => {
    const points = buildExerciseAnalyticsPoints({
      exerciseId: "dominadas",
      workouts: [
        {
          exerciseId: "dominadas",
          date: "2026-08-03",
          sessionKey: "a",
          sets: [
            { weight: 0, reps: 8 },
            { weight: 0, reps: 6 },
          ],
        },
        {
          exerciseId: "dominadas",
          date: "2026-08-05",
          sessionKey: "b",
          sets: [{ weight: 0, reps: 10 }],
        },
      ],
      groupBy: "week",
    });

    expect(points).toHaveLength(1);
    expect(points[0].strength).toBe(0);
    expect(points[0].volume).toBe(0);
    expect(points[0].reps).toBe(24);
    expect(points[0].repsPerSession).toBe(12);
    expect(points[0].setsPerSession).toBe(1.5);
    expect(points[0].topSet).toEqual({ weight: 0, reps: 10 });
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

  it("conserva las semanas calendario sin registros como espacios", () => {
    const points = selectExerciseAnalyticsRange(
      [
        { key: "2026-W31", strength: 50 },
        { key: "2026-W34", strength: 60 },
      ],
      "week",
      4,
    );

    expect(points.map((point) => point.key)).toEqual([
      "2026-W31",
      "2026-W32",
      "2026-W33",
      "2026-W34",
    ]);
    expect(points.filter((point) => point.isGap)).toHaveLength(2);
  });

  it("puede terminar el rango en la semana actual aunque no tenga actividad", () => {
    const points = selectExerciseAnalyticsRange(
      [
        { key: "2026-W31", strength: 50 },
        { key: "2026-W34", strength: 60 },
      ],
      "week",
      4,
      "2026-W38",
    );

    expect(points.map((point) => point.key)).toEqual([
      "2026-W35",
      "2026-W36",
      "2026-W37",
      "2026-W38",
    ]);
    expect(points.every((point) => point.isGap)).toBe(true);
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
    expect(result.observedPoints).toBe(2);
    expect(result.points.filter((point) => point.isGap)).toHaveLength(10);
    expect(result.points.at(-1).index).toBeCloseTo(110, 5);
  });

  it("incorpora peso corporal usando la mejor serie por repeticiones", () => {
    const result = buildMuscleAnalytics({
      workouts: [
        {
          exerciseId: "dominadas",
          date: "2026-08-03",
          sets: [
            { weight: 0, reps: 6 },
            { weight: 0, reps: 8 },
          ],
        },
        {
          exerciseId: "dominadas",
          date: "2026-08-10",
          sets: [{ weight: 0, reps: 10 }],
        },
      ],
      exerciseIds: ["dominadas"],
      exerciseProfiles: new Map([
        ["dominadas", { loadType: "bodyweight" }],
      ]),
    });

    expect(result.comparableExercises).toBe(1);
    expect(result.metricCounts.repetitions).toBe(1);
    expect(result.delta).toBeCloseTo(25, 5);
    expect(result.contributions[0].metricLabel).toBe(
      "mejor serie por repeticiones",
    );
  });

  it("no arrastra valores de ejercicios no medidos en esa semana", () => {
    const result = buildMuscleAnalytics({
      workouts: [
        ["press", "2026-08-03", 100],
        ["remo", "2026-08-03", 100],
        ["remo", "2026-08-10", 110],
        ["press", "2026-08-17", 120],
      ].map(([exerciseId, date, weight]) => ({
        exerciseId,
        date,
        sets: [{ weight, reps: 1 }],
      })),
      exerciseIds: ["press", "remo"],
      rangeWeeks: 3,
    });

    expect(result.points[1].index).toBeCloseTo(110, 5);
    expect(result.points[1].exerciseCount).toBe(1);
    expect(result.points[2].index).toBeCloseTo(120, 5);
    expect(result.totalObservations).toBe(4);
  });

  it("solo compara ejercicios asistidos con la misma asistencia", () => {
    const result = buildMuscleAnalytics({
      workouts: [
        {
          exerciseId: "dominada-asistida",
          date: "2026-08-03",
          sets: [{ weight: 30, reps: 8 }],
        },
        {
          exerciseId: "dominada-asistida",
          date: "2026-08-10",
          sets: [{ weight: 20, reps: 9 }],
        },
      ],
      exerciseIds: ["dominada-asistida"],
      exerciseProfiles: {
        "dominada-asistida": { loadType: "assisted" },
      },
    });

    expect(result.comparableExercises).toBe(0);
    expect(result.assistedPending).toBe(1);
  });

  it("mide repeticiones asistidas cuando la asistencia permanece fija", () => {
    const result = buildMuscleAnalytics({
      workouts: [
        {
          exerciseId: "dominada-asistida",
          date: "2026-08-03",
          sets: [{ weight: 25, reps: 8 }],
        },
        {
          exerciseId: "dominada-asistida",
          date: "2026-08-10",
          sets: [{ weight: 25, reps: 10 }],
        },
      ],
      exerciseIds: ["dominada-asistida"],
      exerciseProfiles: new Map([
        ["dominada-asistida", { loadType: "assisted" }],
      ]),
    });

    expect(result.comparableExercises).toBe(1);
    expect(result.metricCounts.assistedRepetitions).toBe(1);
    expect(result.delta).toBeCloseTo(25, 5);
    expect(result.contributions[0].metricLabel).toContain("25 kg");
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
