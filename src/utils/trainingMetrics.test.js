import { describe, expect, it } from "vitest";
import { formatCompactWeekLabel } from "./trainingMetrics";

describe("formatCompactWeekLabel", () => {
  it("muestra la fecha de inicio de la semana en lugar del código ISO", () => {
    expect(formatCompactWeekLabel("2026-W21")).toBe("18 may");
    expect(formatCompactWeekLabel("2026-W24")).toBe("8 jun");
  });

  it("conserva etiquetas que no son semanas ISO", () => {
    expect(formatCompactWeekLabel("2026-08-21")).toBe("2026-08-21");
  });
});
