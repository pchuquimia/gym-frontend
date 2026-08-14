import { describe, expect, it } from "vitest";
import {
  appendHistoryCompatibility,
  computeCompatibleRecentBySet,
  getCompatibleExerciseHistoryKeys,
  getHistoryCompatibilitySignature,
} from "./historyCompatibility";

describe("historyCompatibility", () => {
  it("separa registros bilaterales y unilaterales", () => {
    expect(
      getHistoryCompatibilitySignature({
        movementMode: "bilateral",
        weightBasis: "total",
      }),
    ).not.toBe(
      getHistoryCompatibilitySignature({
        movementMode: "unilateral",
        weightBasis: "total",
      }),
    );
  });

  it("incluye la barra y cantidad de implementos cuando modifican la carga", () => {
    expect(
      appendHistoryCompatibility("press::bilateral", {
        weightBasis: "per_side",
        barWeightKg: 20,
      }),
    ).toContain("per_side:20:1");
    expect(
      appendHistoryCompatibility("curl::bilateral", {
        weightBasis: "per_implement",
        implementCount: 2,
      }),
    ).toContain("per_implement:0:2");
  });

  it("interpreta registros heredados con la configuración inferida", () => {
    expect(
      getHistoryCompatibilitySignature({
        exerciseName: "Press de banca",
        weightBasis: "legacy",
      }),
    ).toBe(
      getHistoryCompatibilitySignature({
        exerciseName: "Press de banca",
        weightBasis: "total",
      }),
    );
  });

  it("elige la referencia compatible más reciente y conserva su procedencia", () => {
    const history = computeCompatibleRecentBySet([
      {
        date: "2026-08-10",
        routineId: "routine_a",
        routineName: "Empuje A",
        trainingPlanId: "plan_1",
        exercises: [
          {
            exerciseId: "press",
            movementMode: "bilateral",
            weightBasis: "total",
            sets: [{ weightKg: 80, reps: 8 }],
          },
        ],
      },
      {
        date: "2026-08-12",
        routineId: "routine_b",
        routineName: "Empuje B",
        trainingPlanId: "plan_1",
        exercises: [
          {
            exerciseId: "press",
            movementMode: "bilateral",
            weightBasis: "total",
            sets: [{ weightKg: 82.5, reps: 6 }],
          },
        ],
      },
      {
        date: "2026-08-13",
        routineId: "routine_c",
        routineName: "Unilateral",
        trainingPlanId: "plan_1",
        exercises: [
          {
            exerciseId: "press",
            movementMode: "unilateral",
            weightBasis: "total",
            sets: [{ weightKg: 40, reps: 10 }],
          },
        ],
      },
    ]);
    const [key] = getCompatibleExerciseHistoryKeys({
      exerciseId: "press",
      movementMode: "bilateral",
      weightBasis: "total",
    });

    expect(history.get(key)?.[0]?.[0]?.latest).toMatchObject({
      weight: 82.5,
      reps: 6,
      routineName: "Empuje B",
      trainingPlanId: "plan_1",
    });
  });

  it("no duplica una sesión incluida por rutina y por plan", () => {
    const training = {
      _id: "training_1",
      date: "2026-08-12",
      routineId: "routine_a",
      trainingPlanId: "plan_1",
      exercises: [
        {
          exerciseId: "press",
          movementMode: "bilateral",
          weightBasis: "total",
          sets: [{ weightKg: 80, reps: 8 }],
        },
      ],
    };
    const history = computeCompatibleRecentBySet([training, training]);
    const [key] = getCompatibleExerciseHistoryKeys(training.exercises[0]);

    expect(history.get(key)?.[0]?.[0]?.latest).toMatchObject({ weight: 80 });
    expect(history.get(key)?.[0]?.[0]?.previous).toBeNull();
  });
});
