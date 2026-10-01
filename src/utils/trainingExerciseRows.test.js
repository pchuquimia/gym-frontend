import { describe, expect, it } from "vitest";
import {
  collapseRepeatedTrainingRows,
  getMissingRoutineSlots,
} from "./trainingExerciseRows";

describe("collapseRepeatedTrainingRows", () => {
  const row = (done, reps = 11) => ({
    exerciseId: "remo-1313",
    plannedOrder: 5,
    sets: [{ entries: [{ weightKg: 60, reps, done }] }],
  });

  it("keeps the completed copy of an otherwise identical saved row", () => {
    const incomplete = row(false);
    const complete = row(true);
    expect(collapseRepeatedTrainingRows([incomplete, complete])).toEqual([complete]);
    expect(collapseRepeatedTrainingRows([complete, incomplete])).toEqual([complete]);
  });

  it("preserves distinct attempts and two completed rows", () => {
    const complete = row(true);
    expect(collapseRepeatedTrainingRows([row(false, 12), complete])).toHaveLength(2);
    expect(collapseRepeatedTrainingRows([complete, row(true)])).toHaveLength(2);
  });
});

describe("getMissingRoutineSlots", () => {
  it("recognizes alternatives and returns missing planned exercises", () => {
    const slots = [
      { exerciseId: "remo-base", alternatives: [{ exerciseId: "remo-1313" }] },
      { exerciseId: "curl-0317" },
      { exerciseId: "optional", isExtra: true },
    ];
    expect(getMissingRoutineSlots(slots, [{ id: "remo-1313" }])).toEqual([slots[1]]);
  });
});
