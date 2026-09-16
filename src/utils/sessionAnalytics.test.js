import { describe, expect, it } from "vitest";
import {
  compareExercise,
  formatExerciseProgress,
  summarizeSession,
} from "./sessionAnalytics";

describe("summarizeSession", () => {
  it("usa la carga efectiva para volumen y 1RM", () => {
    const summary = summarizeSession({
      exercises: [
        {
          exerciseId: "press-barra",
          exerciseName: "Press con barra",
          muscleGroup: "pecho",
          weightBasis: "per_side",
          barWeightKg: 20,
          sets: [{ entries: [{ weightKg: 10, reps: 10 }] }],
        },
      ],
    });

    expect(summary.exercises[0].topSet.weightKg).toBe(40);
    expect(summary.exercises[0].volume).toBe(400);
    expect(summary.exercises[0].oneRMTop).toBeCloseTo(53.33, 2);
  });

  it("presenta mejoras, caídas y ejercicios sin referencia", () => {
    expect(formatExerciseProgress({ delta: 12.6 })).toEqual({
      label: "+13%",
      detail: "Mejoró",
      direction: "up",
    });
    expect(formatExerciseProgress({ delta: -7.8 })).toEqual({
      label: "-8%",
      detail: "Bajó",
      direction: "down",
    });
    expect(formatExerciseProgress({ delta: 0.4 })).toEqual({
      label: "0%",
      detail: "Estable",
      direction: "neutral",
    });
    expect(formatExerciseProgress(null)).toEqual({
      label: "--",
      detail: "Sin referencia",
      direction: "neutral",
    });
  });

  it("compara con la sesión compatible anterior e ignora series no completadas", () => {
    const exercise = (date, sets, movementMode = "unilateral") =>
      summarizeSession({
        date,
        exercises: [
          {
            exerciseId: "lateral-polea",
            exerciseName: "Un brazo elevación lateral con polea",
            muscleGroup: "hombros",
            movementMode,
            weightBasis: "machine",
            sets,
          },
        ],
      });

    const current = exercise("2026-08-31", [
      { weightKg: 7.5, reps: 14, done: true },
    ]);
    const comparison = compareExercise(
      current,
      [
        exercise("2026-06-24", [{ weightKg: 32.5, reps: 12, done: true }]),
        exercise("2026-08-21", [
          { weightKg: 32.5, reps: 12, done: false },
          { weightKg: 7.5, reps: 10, done: true },
        ]),
        exercise(
          "2026-08-28",
          [{ weightKg: 50, reps: 10, done: true }],
          "bilateral",
        ),
      ],
      "lateral-polea",
    );

    expect(comparison.ref.date).toBe("2026-08-21");
    expect(comparison.ref.oneRMTop).toBeCloseTo(10, 2);
    expect(comparison.today.oneRMTop).toBeCloseTo(11, 2);
    expect(comparison.delta).toBeCloseTo(10, 2);
    expect(formatExerciseProgress(comparison)).toMatchObject({
      label: "+10%",
      detail: "Mejoró",
      direction: "up",
    });
  });

  it("mide peso corporal por repeticiones aunque registre cero kg", () => {
    const session = (date, reps) =>
      summarizeSession({
        date,
        exercises: [
          {
            exerciseId: "pull-ups",
            exerciseName: "Dominadas",
            muscleGroup: "espalda",
            loadType: "bodyweight",
            sets: [{ weightKg: 0, reps, done: true }],
          },
        ],
      });
    const previous = session("2026-08-21", 8);
    const current = session("2026-08-28", 10);
    const comparison = compareExercise(current, [previous], "pull-ups");

    expect(current.exercises[0]).toMatchObject({
      metricType: "repetitions",
      metric: 10,
      setsCount: 1,
      oneRMTop: 0,
    });
    expect(comparison.delta).toBe(25);
  });

  it("solo compara ejercicios asistidos con la misma asistencia", () => {
    const session = (date, assistanceKg, reps) =>
      summarizeSession({
        date,
        exercises: [
          {
            exerciseId: "assisted-pull-up",
            exerciseName: "Dominada asistida",
            muscleGroup: "espalda",
            loadType: "assisted",
            sets: [{ weightKg: assistanceKg, reps, done: true }],
          },
        ],
      });
    const current = session("2026-08-28", 20, 10);
    const comparison = compareExercise(
      current,
      [
        session("2026-08-21", 30, 12),
        session("2026-08-14", 20, 8),
      ],
      "assisted-pull-up",
    );

    expect(comparison.ref.date).toBe("2026-08-14");
    expect(comparison.ref.assistanceKg).toBe(20);
    expect(comparison.delta).toBe(25);
  });
});
