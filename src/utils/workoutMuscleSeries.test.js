import { describe, expect, it } from "vitest";
import {
  buildWorkoutMuscleSeries,
  workoutMuscles,
  workoutSetCount,
} from "./workoutMuscleSeries";

describe("historial de series por entrenamiento", () => {
  it("ordena sesiones, omite resúmenes sin ejercicios y conserva el total en las barras apiladas", () => {
    const rows = buildWorkoutMuscleSeries([
      {
        _id: "summary",
        date: "2026-10-20",
        volumeBreakdown: { completedSets: 12 },
      },
      {
        _id: "new",
        date: "2026-10-20",
        routineId: { _id: "upper", name: "Torso" },
        exercises: [
          {
            primaryMuscles: ["Pectoral", "Tríceps"],
            sets: [{ done: true }, { done: true }, { done: false, reps: 8 }],
          },
          { muscleGroup: "Espalda", sets: [{ done: true }] },
          { sets: [{ done: true }] },
        ],
      },
      { _id: "old", date: "2026-09-10", exercises: [] },
    ]);
    expect(rows.map((row) => row.key)).toEqual(["old", "new"]);
    expect(rows[1]).toMatchObject({
      routineKey: "upper",
      name: "Torso",
      completedSets: 4,
    });
    expect(rows[1].byPrimaryMuscle).toEqual([
      { name: "Pecho", sets: 2 },
      { name: "Espalda", sets: 1 },
      { name: "Sin grupo muscular", sets: 1 },
    ]);
    expect(
      rows[1].byPrimaryMuscle.reduce((sum, muscle) => sum + muscle.sets, 0),
    ).toBe(rows[1].completedSets);
    expect(workoutSetCount(rows[1], "Pecho")).toBe(2);
    expect(workoutSetCount(rows[1], "Hombros")).toBe(0);
    expect(workoutMuscles(rows)).toEqual([
      "Espalda",
      "Pecho",
      "Sin grupo muscular",
    ]);
  });
});
