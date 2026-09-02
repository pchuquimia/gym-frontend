import { describe, expect, it } from "vitest";
import { getMonthActivityBarPercent } from "./monthActivityChart";

describe("getMonthActivityBarPercent", () => {
  it("deja espacio superior cuando el mes solo tiene un día activo", () => {
    expect(
      getMonthActivityBarPercent({ sets: 30, maxSets: 30, activeDays: 1 }),
    ).toBe(54);
  });

  it("conserva las proporciones sin llenar toda la gráfica", () => {
    expect(
      getMonthActivityBarPercent({ sets: 30, maxSets: 30, activeDays: 4 }),
    ).toBe(72);
    expect(
      getMonthActivityBarPercent({ sets: 15, maxSets: 30, activeDays: 4 }),
    ).toBe(36);
  });

  it("mantiene visibles los valores pequeños y oculta los días sin series", () => {
    expect(
      getMonthActivityBarPercent({ sets: 1, maxSets: 30, activeDays: 4 }),
    ).toBe(8);
    expect(
      getMonthActivityBarPercent({ sets: 0, maxSets: 30, activeDays: 4 }),
    ).toBe(0);
  });
});
