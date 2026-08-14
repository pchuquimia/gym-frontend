import { describe, expect, it } from "vitest";
import {
  getSessionSetCount,
  SESSION_HISTORY_FIELDS,
  TRAINING_LIST_FIELDS,
  TRAINING_SUMMARY_FIELDS,
} from "./trainingListFields";

describe("TRAINING_LIST_FIELDS", () => {
  const fields = new Set(TRAINING_LIST_FIELDS.split(","));

  it("conserva los datos requeridos por dashboard, analítica y planificación", () => {
    [
      "trainingPlanId",
      "trainingPlanSlotId",
      "durationSeconds",
      "totalVolume",
      "exercises.exerciseId",
      "exercises.weightBasis",
      "exercises.sets.entries.weightKg",
      "exercises.sets.entries.reps",
      "exercises.sets.entries.done",
      "exerciseDurations.durationSeconds",
    ].forEach((field) => expect(fields.has(field)).toBe(true));
  });

  it("excluye eventos y textos históricos pesados de la lista inicial", () => {
    expect(fields.has("timeEvents")).toBe(false);
    expect(fields.has("exercises.sets.entries.previousText")).toBe(false);
  });

  it("usa un resumen liviano para desbloquear la aplicación", () => {
    const summaryFields = new Set(TRAINING_SUMMARY_FIELDS.split(","));
    expect(summaryFields.has("trainingPlanId")).toBe(true);
    expect(summaryFields.has("durationSeconds")).toBe(true);
    expect(summaryFields.has("totalVolume")).toBe(true);
    expect(
      [...summaryFields].some((field) => field.startsWith("exercises.")),
    ).toBe(false);
  });

  it("carga el historial sin descargar ejercicios ni series", () => {
    const historyFields = new Set(SESSION_HISTORY_FIELDS.split(","));
    expect(historyFields.has("volumeBreakdown.recordedSets")).toBe(true);
    expect(
      [...historyFields].some((field) => field.startsWith("exercises")),
    ).toBe(false);
  });

  it("usa el resumen de sets y conserva compatibilidad con datos antiguos", () => {
    expect(getSessionSetCount({ volumeBreakdown: { recordedSets: 7 } })).toBe(
      7,
    );
    expect(
      getSessionSetCount({
        exercises: [{ sets: [{}, {}] }, { sets: [{}] }],
      }),
    ).toBe(3);
  });
});
