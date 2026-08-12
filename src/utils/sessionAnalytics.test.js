import { describe, expect, it } from "vitest";
import { summarizeSession } from "./sessionAnalytics";

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
});
