import { describe, expect, it } from "vitest";
import {
  buildExerciseFamilies,
  getExerciseDiscovery,
  selectEssentialFamilies,
} from "./exerciseDiscovery";

describe("exerciseDiscovery", () => {
  it("agrupa variantes y conserva primero el movimiento principal", () => {
    const families = buildExerciseFamilies([
      { id: "smith", name: "Smith press de banca" },
      { id: "incline", name: "Press de banca inclinado" },
      { id: "bench", name: "Press de banca" },
    ]);

    expect(families).toHaveLength(1);
    expect(families[0].name).toBe("Press de pecho");
    expect(families[0].primary.id).toBe("bench");
    expect(families[0].variants).toHaveLength(3);
  });

  it("respeta la clasificación editorial recibida desde el backend", () => {
    const discovery = getExerciseDiscovery({
      id: "custom",
      name: "Movimiento especial",
      discovery: {
        familyId: "hinge",
        familyName: "Bisagra de cadera",
        isEssential: true,
      },
    });

    expect(discovery.familyId).toBe("hinge");
    expect(discovery.isEssential).toBe(true);
  });

  it("conserva la familia inferida cuando el metadato editorial está vacío", () => {
    const discovery = getExerciseDiscovery({
      id: "bench",
      name: "Press de banca con barra",
      discovery: { familyId: "", familyName: "" },
    });

    expect(discovery.familyId).toBe("bench-press");
    expect(discovery.familyName).toBe("Press de pecho");
  });

  it("limita la vista esencial sin perder su prioridad", () => {
    const families = [
      { id: "advanced", isEssential: false },
      { id: "basic", isEssential: true },
      { id: "other", isEssential: false },
    ];
    expect(selectEssentialFamilies(families, 2).map(({ id }) => id)).toEqual([
      "basic",
      "advanced",
    ]);
  });
});
