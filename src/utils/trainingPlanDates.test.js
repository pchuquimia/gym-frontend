import { describe, expect, it } from "vitest";
import { planStartsInFuture } from "./trainingPlanDates";

describe("planStartsInFuture", () => {
  const now = new Date("2026-08-13T23:30:00-04:00");

  it("no considera futura una planificación que comienza hoy en UTC", () => {
    expect(planStartsInFuture("2026-08-14T00:00:00.000Z", now)).toBe(false);
  });

  it("detecta una planificación programada para un día posterior", () => {
    expect(planStartsInFuture("2026-08-15T00:00:00.000Z", now)).toBe(true);
  });
});
