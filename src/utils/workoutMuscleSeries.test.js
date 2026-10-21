import { describe, expect, it } from "vitest";
import {
  buildWorkoutMuscleSeries,
  buildWorkoutWeeks,
  workoutMuscles,
  workoutSetCount,
} from "./workoutMuscleSeries";

describe("historial de series por entrenamiento", () => {
  it("ordena sesiones, omite resúmenes sin ejercicios y conserva el total en las barras apiladas", () => {
    const rows = buildWorkoutMuscleSeries([
      {
        _id: "summary",
        date: "2026-10-20",
        volumeBreakdown: { completedSets: 12 },
      },
      {
        _id: "new",
        date: "2026-10-20",
        routineId: { _id: "upper", name: "Torso" },
        exercises: [
          {
            primaryMuscles: ["Pectoral", "Tríceps"],
            sets: [{ done: true }, { done: true }, { done: false, reps: 8 }],
          },
          { muscleGroup: "Espalda", sets: [{ done: true }] },
          { sets: [{ done: true }] },
        ],
      },
      { _id: "old", date: "2026-09-10", exercises: [] },
    ]);
    expect(rows.map((row) => row.key)).toEqual(["old", "new"]);
    expect(rows[1]).toMatchObject({
      routineKey: "upper",
      name: "Torso",
      completedSets: 4,
    });
    expect(rows[1].byPrimaryMuscle).toEqual([
      { name: "Pecho", sets: 2 },
      { name: "Espalda", sets: 1 },
      { name: "Sin grupo muscular", sets: 1 },
    ]);
    expect(
      rows[1].byPrimaryMuscle.reduce((sum, muscle) => sum + muscle.sets, 0),
    ).toBe(rows[1].completedSets);
    expect(workoutSetCount(rows[1], "Pecho")).toBe(2);
    expect(workoutSetCount(rows[1], "Hombros")).toBe(0);
    expect(workoutMuscles(rows)).toEqual([
      "Espalda",
      "Pecho",
      "Sin grupo muscular",
    ]);
  });
});

describe("calendario semanal de series", () => {
  const session = (date, completedSets = 4, key = date) => ({
    key,
    date,
    name: "Torso",
    completedSets,
    byPrimaryMuscle: [{ name: "Espalda", sets: completedSets }],
  });

  it("mantiene lunes a domingo, incluidos descansos, hoy pendiente y días futuros", () => {
    const weeks = buildWorkoutWeeks([session("2026-10-18")], "2026-10-20");
    expect(weeks.map((week) => [week[0].date, week[6].date])).toEqual([
      ["2026-10-12", "2026-10-18"],
      ["2026-10-19", "2026-10-25"],
    ]);
    expect(weeks[0].map((day) => day.weekday)).toEqual([
      "L",
      "M",
      "X",
      "J",
      "V",
      "S",
      "D",
    ]);
    expect(weeks[0][0].status).toBe("rest");
    expect(weeks[0][6].status).toBe("training");
    expect(weeks[1][1]).toMatchObject({ isToday: true, status: "pending" });
    expect(weeks[1].slice(2).every((day) => day.status === "future")).toBe(
      true,
    );
  });

  it("suma sesiones del mismo día por músculo sin modificar el historial ni incluir futuros", () => {
    const rows = [
      session("2026-10-19", 4, "a"),
      {
        ...session("2026-10-19", 5, "b"),
        name: "Mixto",
        byPrimaryMuscle: [
          { name: "Espalda", sets: 2 },
          { name: "Pecho", sets: 3 },
        ],
      },
      session("2026-10-21", 50),
      session("2026-10-01", 99),
      session("invalid"),
    ];
    const original = structuredClone(rows);
    const days = buildWorkoutWeeks(rows, "2026-10-20").flat();
    expect(days.find((day) => day.date === "2026-10-19")).toMatchObject({
      completedSets: 9,
      sessions: 2,
      name: "Torso + Mixto",
      byPrimaryMuscle: [
        { name: "Espalda", sets: 6 },
        { name: "Pecho", sets: 3 },
      ],
    });
    expect(days.reduce((total, day) => total + day.completedSets, 0)).toBe(9);
    expect(rows).toEqual(original);
  });

  it("no confunde una sesión sin series completadas con descanso", () => {
    const days = buildWorkoutWeeks(
      [session("2026-10-20", 0)],
      "2026-10-20",
    ).flat();
    expect(days.find((day) => day.isToday).status).toBe("empty-session");
  });

  it.each([
    ["2026-01-01", "2025-12-22", "2026-01-04"],
    ["2026-03-09", "2026-03-02", "2026-03-15"],
    ["2026-11-01", "2026-10-19", "2026-11-01"],
  ])(
    "conserva catorce fechas consecutivas al cruzar meses, años o cambios horarios (%s)",
    (today, first, last) => {
      const days = buildWorkoutWeeks([], today).flat();
      expect(days).toHaveLength(14);
      expect(new Set(days.map((day) => day.date)).size).toBe(14);
      expect(days[0].date).toBe(first);
      expect(days[13].date).toBe(last);
      expect(days.filter((day) => day.isToday)).toHaveLength(1);
    },
  );
});
