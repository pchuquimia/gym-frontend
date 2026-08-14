import { describe, expect, it } from "vitest";
import { buildExerciseTrackingRows } from "./exerciseTracking";

const targetExercise = {
  id: "leg-extension",
  name: "Extensión de cuádriceps",
  movementMode: "bilateral",
  weightBasis: "machine",
};

describe("exerciseTracking", () => {
  it("reúne todas las series compatibles del ejercicio entre rutinas", () => {
    const rows = buildExerciseTrackingRows(targetExercise, [
      {
        _id: "session-1",
        date: "2026-08-10",
        routineId: "legs-a",
        progressScopeId: "scope-a",
        exercises: [
          {
            exerciseId: "leg-extension",
            movementMode: "bilateral",
            weightBasis: "machine",
            sets: [
              { weightKg: 40, reps: 12 },
              { weightKg: 45, reps: 10 },
            ],
          },
        ],
      },
      {
        _id: "session-2",
        date: "2026-08-12",
        routineId: "legs-b",
        progressScopeId: "scope-b",
        exercises: [
          {
            exerciseId: "leg-extension",
            movementMode: "bilateral",
            weightBasis: "machine",
            sets: [
              { entries: [{ weightKg: 50, reps: 8 }] },
              { entries: [{ weightKg: 50, reps: 7 }] },
              { entries: [{ weightKg: 45, reps: 10 }] },
            ],
          },
        ],
      },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0].sets).toHaveLength(2);
    expect(rows[1].sets).toHaveLength(3);
    expect(rows[1].sets[0][0]).toMatchObject({ weightKg: 50, reps: 8 });
  });

  it("no mezcla configuraciones incompatibles de la misma máquina", () => {
    const rows = buildExerciseTrackingRows(targetExercise, [
      {
        _id: "unilateral-session",
        date: "2026-08-11",
        exercises: [
          {
            exerciseId: "leg-extension",
            movementMode: "unilateral",
            weightBasis: "machine",
            sets: [{ weightKg: 20, reps: 10 }],
          },
        ],
      },
    ]);

    expect(rows).toEqual([]);
  });
});
