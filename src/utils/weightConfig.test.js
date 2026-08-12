import { describe, expect, it } from "vitest";
import {
  getEffectiveWeightKg,
  inferWeightConfig,
} from "./weightConfig";

describe("weightConfig", () => {
  it("mantiene la barra como peso total por defecto", () => {
    expect(
      inferWeightConfig({ name: "Press de banca", equipment: ["Barra"] }),
    ).toMatchObject({ weightBasis: "total" });
  });

  it("infiere dos implementos para mancuernas bilaterales", () => {
    expect(
      inferWeightConfig({
        name: "Press con mancuernas",
        equipment: ["Mancuernas"],
        movementMode: "bilateral",
      }),
    ).toMatchObject({ weightBasis: "per_implement", implementCount: 2 });
  });

  it("calcula carga efectiva por lado incluyendo la barra", () => {
    expect(
      getEffectiveWeightKg(10, {
        weightBasis: "per_side",
        barWeightKg: 20,
      }),
    ).toBe(40);
  });

  it("mantiene intacto el significado de registros históricos", () => {
    expect(getEffectiveWeightKg(40, { weightBasis: "legacy" })).toBe(40);
  });

  it("respeta la configuración persistida en el catálogo", () => {
    expect(
      inferWeightConfig({
        equipment: ["Mancuernas"],
        weightConfig: {
          basis: "per_implement",
          implementCount: 1,
        },
      }),
    ).toMatchObject({ weightBasis: "per_implement", implementCount: 1 });
  });

  it("clasifica el peso corporal como carga adicional", () => {
    expect(
      inferWeightConfig({
        equipment: ["Peso corporal"],
        loadType: "bodyweight",
      }),
    ).toMatchObject({ weightBasis: "additional" });
  });
});
