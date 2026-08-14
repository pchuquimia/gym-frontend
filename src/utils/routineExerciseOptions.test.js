import { describe, expect, it } from "vitest";
import { buildRoutineExerciseOptionMap } from "./routineExerciseOptions";

describe("buildRoutineExerciseOptionMap", () => {
  it("conserva ejercicios encontrados remotamente fuera de la carga inicial", () => {
    const options = buildRoutineExerciseOptionMap(
      [{ id: "local", name: "Sentadilla" }],
      [{ id: "remote", name: "Sentadilla frontal" }],
    );

    expect(options.get("remote")).toEqual({
      id: "remote",
      name: "Sentadilla frontal",
    });
  });

  it("prefiere los metadatos normalizados de la búsqueda remota", () => {
    const options = buildRoutineExerciseOptionMap(
      [{ id: "shared", name: "Nombre anterior" }],
      [{ id: "shared", name: "Nombre localizado" }],
    );

    expect(options.get("shared")?.name).toBe("Nombre localizado");
  });
});
