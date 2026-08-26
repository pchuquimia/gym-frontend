import { describe, expect, it } from "vitest";
import {
  countCompletedTrainingSets,
  estimateTrainingCalories,
  summarizeCalorieEstimates,
} from "./calorieEstimate";

const completedSets = (count) =>
  Array.from({ length: count }, () => ({ done: true, reps: 10, weightKg: 20 }));

describe("estimateTrainingCalories", () => {
  it("uses duration, body weight and training density", () => {
    const estimate = estimateTrainingCalories(
      {
        durationSeconds: 3600,
        workSeconds: 1800,
        restSeconds: 1200,
        exercises: [{ sets: completedSets(12) }],
      },
      { weightKg: 80 },
    );

    expect(estimate.available).toBe(true);
    expect(estimate.durationMinutes).toBe(60);
    expect(estimate.densityPercent).toBe(60);
    expect(estimate.weightKg).toBe(80);
    expect(estimate.calories).toBeGreaterThan(400);
    expect(estimate.minCalories).toBeLessThan(estimate.calories);
    expect(estimate.maxCalories).toBeGreaterThan(estimate.calories);
  });

  it("falls back to recorded duration when no positive override exists", () => {
    const estimate = estimateTrainingCalories(
      {
        durationOverrideSeconds: 0,
        durationSeconds: 3600,
        exercises: [{ sets: completedSets(10) }],
      },
      { weightKg: 80 },
    );

    expect(estimate.durationMinutes).toBe(60);
    expect(estimate.durationWasEstimated).toBe(false);
  });

  it("uses a clearly identified reference weight when profile weight is missing", () => {
    const estimate = estimateTrainingCalories(
      { durationSeconds: 1800, exercises: [{ sets: completedSets(6) }] },
      {},
    );

    expect(estimate.usesReferenceWeight).toBe(true);
    expect(estimate.weightKg).toBe(75);
  });

  it("can estimate duration from completed sets for legacy sessions", () => {
    const estimate = estimateTrainingCalories(
      { exercises: [{ sets: completedSets(8) }] },
      { weightKg: 70 },
    );

    expect(estimate.durationWasEstimated).toBe(true);
    expect(estimate.durationMinutes).toBe(20);
    expect(estimate.available).toBe(true);
  });

  it("counts entry-based and normalized completed sets", () => {
    expect(
      countCompletedTrainingSets({
        exercises: [
          {
            sets: [
              { entries: [{ done: true }, { done: true }] },
              { reps: 8, weightKg: 30 },
              { done: false, reps: 8 },
            ],
          },
        ],
      }),
    ).toBe(2);
  });

  it("aggregates session ranges for a weekly summary", () => {
    const first = estimateTrainingCalories(
      { durationSeconds: 1800, exercises: [{ sets: completedSets(5) }] },
      { weightKg: 75 },
    );
    const second = estimateTrainingCalories(
      { durationSeconds: 2700, exercises: [{ sets: completedSets(8) }] },
      { weightKg: 75 },
    );
    const summary = summarizeCalorieEstimates([first, second]);

    expect(summary.sessions).toBe(2);
    expect(summary.calories).toBe(first.calories + second.calories);
    expect(summary.minCalories).toBe(first.minCalories + second.minCalories);
  });
});
