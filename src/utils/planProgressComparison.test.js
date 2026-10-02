import { describe, expect, it } from "vitest";
import { prepareTrainings } from "./progressDashboard";
import { alignPlanProgressWeeks, buildPlanProgressData } from "./planProgressComparison";

const plans = [
  { _id: "new", name: "Plan nuevo", status: "active", startDate: "2025-09-01", endDate: "2025-09-30" },
  { _id: "old", name: "Plan anterior", status: "completed", startDate: "2025-05-01", endDate: "2025-05-31" },
];

const training = (id, planId, date, weightKg, muscleGroup = "Pecho") => ({
  _id: id,
  date,
  trainingPlanId: planId,
  progressScopeId: planId,
  routineId: `${planId}-routine`,
  exercises: [{
    exerciseId: muscleGroup === "Pecho" ? "press" : "row",
    exerciseName: muscleGroup === "Pecho" ? "Press" : "Remo",
    muscleGroup,
    loadType: "external",
    weightBasis: "total",
    sets: [{ weightKg, reps: 10, done: true }],
  }],
});

describe("comparación de planificaciones", () => {
  it("alinea semanas relativas, normaliza el inicio y deja huecos sin inventar sesiones", () => {
    const sessions = prepareTrainings([
      training("n1", "new", "2025-09-03", 50),
      training("n2", "new", "2025-09-10", 55),
      training("o1", "old", "2025-05-03", 40),
      training("o2", "old", "2025-05-17", 44),
      training("wrong", "other", "2025-09-12", 90),
    ]);
    const current = buildPlanProgressData(plans[0], sessions, "", "2025-10-01");
    const previous = buildPlanProgressData(plans[1], sessions, "", "2025-10-01");

    expect(current.comparisons).toBe(1);
    expect(previous.comparisons).toBe(1);
    expect(alignPlanProgressWeeks(current, previous)).toEqual({
      labels: ["Semana 1", "Semana 2", "Semana 3"],
      current: [100, 110, null],
      comparison: [100, null, 110],
    });
  });

  it("aplica el filtro muscular a ambos planes y detecta falta de comparaciones", () => {
    const sessions = prepareTrainings([
      training("n1", "new", "2025-09-03", 50),
      training("n2", "new", "2025-09-10", 55),
      training("o1", "old", "2025-05-03", 40),
      training("o2", "old", "2025-05-17", 44),
      training("o3", "old", "2025-05-21", 60, "Espalda"),
    ]);
    const previousChest = buildPlanProgressData(plans[1], sessions, "Pecho", "2025-10-01");
    const previousBack = buildPlanProgressData(plans[1], sessions, "Espalda", "2025-10-01");

    expect(previousChest.points).toHaveLength(2);
    expect(previousChest.comparisons).toBe(1);
    expect(previousBack.points).toHaveLength(1);
    expect(previousBack.comparisons).toBe(0);
  });
});
