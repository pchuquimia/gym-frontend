import { describe, expect, it } from "vitest";
import {
  countCompletedTrainingSets,
  estimateRoutineCaloriesFromHistory,
  estimateTrainingCalories,
  summarizeCalorieEstimates,
} from "./calorieEstimate";

const completedSets = (count) =>
  Array.from({ length: count }, () => ({ done: true, reps: 10, weightKg: 20 }));

describe("estimateTrainingCalories", () => {
  it("calculates active calories from work and rest segments", () => {
    const estimate = estimateTrainingCalories(
      {
        durationSeconds: 3600,
        workSeconds: 1800,
        restSeconds: 1200,
        preparationSeconds: 600,
        exercises: [{ sets: completedSets(12) }],
      },
      { weightKg: 80 },
    );

    expect(estimate.available).toBe(true);
    expect(estimate.durationMinutes).toBe(50);
    expect(estimate.sessionMinutes).toBe(60);
    expect(estimate.workMinutes).toBe(30);
    expect(estimate.restMinutes).toBe(20);
    expect(estimate.excludedMinutes).toBe(10);
    expect(estimate.densityPercent).toBe(60);
    expect(estimate.weightKg).toBe(80);
    expect(estimate.calories).toBeGreaterThan(130);
    expect(estimate.calories).toBeLessThan(180);
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

    expect(estimate.durationMinutes).toBe(25);
    expect(estimate.sessionMinutes).toBe(60);
    expect(estimate.excludedMinutes).toBe(35);
    expect(estimate.durationWasEstimated).toBe(false);
    expect(estimate.breakdownWasEstimated).toBe(true);
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
    expect(estimate.durationMinutes).toBe(19);
    expect(estimate.workMinutes).toBe(5);
    expect(estimate.restMinutes).toBe(14);
    expect(estimate.available).toBe(true);
  });

  it("does not turn preparation time into exercise calories", () => {
    const base = estimateTrainingCalories(
      {
        durationSeconds: 4500,
        workSeconds: 2400,
        restSeconds: 2100,
        preparationSeconds: 0,
        exercises: [{ sets: completedSets(20) }],
      },
      { weightKg: 75 },
    );
    const withPreparation = estimateTrainingCalories(
      {
        durationSeconds: 7680,
        workSeconds: 2400,
        restSeconds: 2100,
        preparationSeconds: 3180,
        exercises: [{ sets: completedSets(20) }],
      },
      { weightKg: 75 },
    );

    expect(withPreparation.calories).toBe(base.calories);
    expect(withPreparation.durationMinutes).toBe(75);
    expect(withPreparation.excludedMinutes).toBe(53);
  });

  it("estimates legacy work time from completed repetitions", () => {
    const estimate = estimateTrainingCalories(
      {
        durationSeconds: 7680,
        workSeconds: 5580,
        restSeconds: 2100,
        exercises: [{ sets: completedSets(20) }],
      },
      { weightKg: 75 },
    );

    expect(estimate.workMinutes).toBe(13);
    expect(estimate.restMinutes).toBe(35);
    expect(estimate.excludedMinutes).toBe(80);
    expect(estimate.breakdownWasEstimated).toBe(true);
  });

  it("values rest at a lower intensity than active work", () => {
    const withoutRest = estimateTrainingCalories(
      {
        durationSeconds: 1200,
        workSeconds: 1200,
        restSeconds: 0,
        preparationSeconds: 0,
        exercises: [{ sets: completedSets(10) }],
      },
      { weightKg: 75 },
    );
    const withRest = estimateTrainingCalories(
      {
        durationSeconds: 2400,
        workSeconds: 1200,
        restSeconds: 1200,
        preparationSeconds: 0,
        exercises: [{ sets: completedSets(10) }],
      },
      { weightKg: 75 },
    );

    expect(withRest.calories).toBeGreaterThan(withoutRest.calories);
    expect(withRest.calories - withoutRest.calories).toBeLessThan(20);
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

describe("estimateRoutineCaloriesFromHistory", () => {
  it("promedia el mismo tiempo activo y las calorías que usa el dashboard", () => {
    const result = estimateRoutineCaloriesFromHistory(
      { id: "lower-b", name: "Lower B" },
      [
        {
          routineId: "lower-b",
          date: "2026-08-20",
          durationSeconds: 5880,
          workSeconds: 1200,
          restSeconds: 600,
          preparationSeconds: 4080,
        },
        {
          routineId: "lower-b",
          date: "2026-08-13",
          durationSeconds: 5400,
          workSeconds: 1500,
          restSeconds: 900,
          preparationSeconds: 3000,
        },
      ],
      { weightKg: 75 },
    );

    expect(result).toMatchObject({
      activeSeconds: 2100,
      sampleSize: 2,
      source: "history",
    });
    expect(result.calories).toBeGreaterThan(0);
  });
});
