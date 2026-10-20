import { describe, expect, it } from "vitest";
import {
  buildExerciseCatalogIndex,
  getTrainingMuscleSetSummary,
} from "./trainingLoad";

describe("series por músculo de cada entrenamiento", () => {
  it("suma ejercicios del mismo grupo y excluye series pendientes y músculos secundarios", () => {
    const summary = getTrainingMuscleSetSummary({
      exercises: [
        {
          primaryMuscleGroup: "Pecho",
          secondaryMuscles: ["Tríceps"],
          sets: [{ done: true }, { done: true }, { done: false, reps: 8 }],
        },
        { muscleGroup: "Pectoral", sets: [{ done: true }] },
        {
          muscleGroup: "Bíceps",
          sets: [{ entries: [{ done: true }, { done: false }] }],
        },
      ],
    });
    expect(summary).toEqual({
      completedSets: 3,
      byPrimaryMuscle: [{ name: "Pecho", sets: 3 }],
    });
  });

  it("usa el catálogo y muestra las series sin clasificación", () => {
    const catalog = buildExerciseCatalogIndex([
      { _id: "curl", primaryMuscleGroup: "Bíceps" },
    ]);
    expect(
      getTrainingMuscleSetSummary(
        {
          exercises: [
            { exerciseId: "curl", sets: [{ done: true }] },
            { sets: [{ done: true }, { done: true }] },
          ],
        },
        catalog,
      ),
    ).toEqual({
      completedSets: 3,
      byPrimaryMuscle: [
        { name: "Sin grupo muscular", sets: 2 },
        { name: "Bíceps", sets: 1 },
      ],
    });
  });

  it("conserva conteos separados en dos sesiones de la misma rutina", () => {
    const sessions = [1, 3].map((count) => ({
      routineId: "push",
      exercises: [
        {
          muscleGroup: "Pecho",
          sets: Array.from({ length: count }, () => ({ done: true })),
        },
      ],
    }));
    expect(
      sessions.map(
        (session) => getTrainingMuscleSetSummary(session).byPrimaryMuscle,
      ),
    ).toEqual([[{ name: "Pecho", sets: 1 }], [{ name: "Pecho", sets: 3 }]]);
    expect(getTrainingMuscleSetSummary({})).toEqual({
      completedSets: 0,
      byPrimaryMuscle: [],
    });
  });
});
