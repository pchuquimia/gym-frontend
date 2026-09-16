import { describe, expect, it } from "vitest";
import { formatCompactWeekLabel, getIsoWeekRange } from "./trainingMetrics";

describe("formatCompactWeekLabel", () => {
  it("muestra la fecha de inicio de la semana en lugar del código ISO", () => {
    expect(formatCompactWeekLabel("2026-W21")).toBe("18 may");
    expect(formatCompactWeekLabel("2026-W24")).toBe("8 jun");
  });

  it("conserva etiquetas que no son semanas ISO", () => {
    expect(formatCompactWeekLabel("2026-08-21")).toBe("2026-08-21");
  });

  it("construye semanas calendario consecutivas incluso al cambiar de año", () => {
    expect(getIsoWeekRange("2026-W02", 4)).toEqual([
      "2025-W51",
      "2025-W52",
      "2026-W01",
      "2026-W02",
    ]);
  });
});
