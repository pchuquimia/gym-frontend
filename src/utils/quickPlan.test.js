import { describe, expect, it } from "vitest";
import { buildQuickPlanSchedule, getMondayFirstDayIndex } from "./quickPlan";

describe("quickPlan", () => {
  it("construye una semana con los días elegidos y el resto libre", () => {
    const schedule = buildQuickPlanSchedule([1, 3, 5]);
    expect(schedule).toHaveLength(7);
    expect(schedule.map((day) => day.type)).toEqual([
      "training",
      "rest",
      "training",
      "rest",
      "training",
      "rest",
      "rest",
    ]);
    expect(schedule.map((day) => day.slotId)).toEqual(
      Array.from({ length: 7 }, (_, index) => `slot_fixed_${index + 1}`),
    );
  });

  it("usa índices de lunes a domingo", () => {
    expect(getMondayFirstDayIndex(new Date(2026, 8, 28))).toBe(1);
    expect(getMondayFirstDayIndex(new Date(2026, 9, 4))).toBe(7);
  });
});
