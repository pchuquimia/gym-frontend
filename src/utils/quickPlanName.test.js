import { describe, expect, it } from "vitest";
import { suggestQuickPlanName } from "./quickPlanName";

const named = (...names) => names.map((name) => ({ name }));

describe("suggestQuickPlanName", () => {
  it.each([
    [
      ["PUSH A", "PULL", "LOWER A", "PUSH B", "LOWER B"],
      "Empuje · Jale · Pierna",
    ],
    [["Pierna B", "Torso A", "Torso B"], "Torso · Pierna"],
    [["Empuje", "Jalón"], "Empuje · Jale"],
    [
      ["Pecho · Tríceps", "Espalda · Bíceps", "Cuádriceps · Femoral"],
      "Empuje · Jale · Pierna",
    ],
    [
      ["Pecho · Bíceps", "Espalda · Hombro · Tríceps", "Piernas"],
      "Torso · Pierna",
    ],
    [["Full body A", "Cuerpo completo B"], "Cuerpo completo"],
    [["Push", "Torso", "Lower"], "Torso · Pierna"],
    [["Full body", "Push"], "Entrenamiento mixto"],
    [["Entrenamiento 1", "Push"], "Plan semanal"],
    [["Core", "Abdominales"], "Core"],
    [["Cardio", "Running"], "Cardio"],
  ])("recognizes %j as %s", (names, expected) => {
    expect(suggestQuickPlanName(named(...names))).toBe(expected);
  });
  it("uses primary muscle data when a routine title has no recognizable split", () => {
    expect(
      suggestQuickPlanName([
        {
          name: "Sesión A",
          exercises: [
            { primaryMuscleGroup: "Pecho" },
            { muscleGroup: "Tríceps" },
            { primaryMuscles: ["Cuádriceps"], isExtra: true },
          ],
        },
        {
          name: "Sesión B",
          exercises: [{ primaryMuscles: ["Dorsal ancho", "Bíceps"] }],
        },
      ]),
    ).toBe("Empuje · Jale");
  });
  it("keeps an explicit split name despite accessory muscles", () => {
    expect(
      suggestQuickPlanName([
        { name: "Push A", exercises: [{ muscleGroup: "Bíceps" }] },
      ]),
    ).toBe("Empuje");
  });
  it("uses a neutral default before any selection", () => {
    expect(suggestQuickPlanName()).toBe("Mi planificación");
  });
});
