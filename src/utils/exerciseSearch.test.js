import { describe, expect, it } from "vitest";
import { scoreExerciseSearch } from "./exerciseSearch";

describe("búsqueda local de ejercicios", () => {
  const exercise = {
    name: "Press de banca inclinado con mancuernas",
    muscle: "Pecho",
    aliases: ["Press inclinado"],
  };

  it("encuentra rasgos incompletos en cualquier orden", () => {
    expect(scoreExerciseSearch(exercise, "mancu press incli")).toBeGreaterThan(0);
  });

  it("tolera un error pequeño y exige todas las palabras", () => {
    expect(scoreExerciseSearch(exercise, "press mancuerma")).toBeGreaterThan(0);
    expect(scoreExerciseSearch(exercise, "press sentadilla")).toBe(0);
  });
});
