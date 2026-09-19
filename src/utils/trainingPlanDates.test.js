import { describe, expect, it } from "vitest";
import { getCurrentPlanWeek, planStartsInFuture } from "./trainingPlanDates";

describe("planStartsInFuture", () => {
  const now = new Date("2026-08-13T23:30:00-04:00");

  it("no considera futura una planificación que comienza hoy en UTC", () => {
    expect(planStartsInFuture("2026-08-14T00:00:00.000Z", now)).toBe(false);
  });

  it("detecta una planificación programada para un día posterior", () => {
    expect(planStartsInFuture("2026-08-15T00:00:00.000Z", now)).toBe(true);
  });
});

describe("getCurrentPlanWeek", () => {
  const plan = { startDate: "2026-08-24", durationWeeks: 4 };

  it("selecciona la semana del dia actual desde el primer render", () => {
    expect(getCurrentPlanWeek(plan, "2026-09-09")).toBe(2);
  });

  it("limita la semana a los extremos del plan", () => {
    expect(getCurrentPlanWeek(plan, "2026-08-20")).toBe(0);
    expect(getCurrentPlanWeek(plan, "2026-10-01")).toBe(3);
  });
});
