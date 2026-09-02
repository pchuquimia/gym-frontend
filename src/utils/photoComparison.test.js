import { describe, expect, it } from "vitest";
import {
  canComparePhoto,
  comparisonDayGap,
  orderComparisonPhotos,
} from "./photoComparison";

describe("photoComparison", () => {
  it("ordena antes y después por fecha aunque se seleccionen al revés", () => {
    const newer = { id: "new", date: "2026-08-04", view: "front" };
    const older = { id: "old", date: "2026-07-03", view: "front" };
    expect(
      orderComparisonPhotos([newer, older]).map((photo) => photo.id),
    ).toEqual(["old", "new"]);
    expect(comparisonDayGap([newer, older])).toBe(32);
  });

  it("solo compara fotografías de la misma vista corporal", () => {
    expect(
      canComparePhoto([{ id: "front", view: "front" }], {
        id: "side",
        view: "side",
      }),
    ).toBe(false);
    expect(
      canComparePhoto([{ id: "front", view: "front" }], {
        id: "front-2",
        view: "front",
      }),
    ).toBe(true);
  });
});
