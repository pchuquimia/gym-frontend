import { describe, expect, it } from "vitest";
import {
  findAutoFlowDestination,
  markExerciseStartedInPlace,
} from "./autoWorkoutFlow";

const entry = (done) => ({ done });
const set = (id, values) => ({ id, entries: values.map(entry) });

describe("findAutoFlowDestination", () => {
  it("continua con la siguiente serie incompleta del mismo ejercicio", () => {
    const exercises = [
      {
        id: "press",
        sets: [set("press-1", [true]), set("press-2", [false])],
      },
    ];

    expect(findAutoFlowDestination(exercises, "press")).toEqual({
      type: "set",
      exerciseId: "press",
      setId: "press-2",
    });
  });

  it("espera ambas entradas de una serie unilateral", () => {
    const exercises = [
      {
        id: "curl",
        sets: [set("curl-1", [true, false])],
      },
    ];

    expect(findAutoFlowDestination(exercises, "curl")?.setId).toBe("curl-1");
  });

  it("avanza al siguiente ejercicio cuando el actual esta completo", () => {
    const exercises = [
      { id: "press", sets: [set("press-1", [true])] },
      { id: "remo", sets: [set("remo-1", [false])] },
    ];

    expect(findAutoFlowDestination(exercises, "press")).toEqual({
      type: "exercise",
      exerciseId: "remo",
    });
  });

  it("informa que la rutina termino cuando no quedan series", () => {
    const exercises = [
      { id: "press", sets: [set("press-1", [true])] },
      { id: "remo", sets: [set("remo-1", [true])] },
    ];

    expect(findAutoFlowDestination(exercises, "press")).toEqual({
      type: "complete",
    });
  });

  it("devuelve null para un ejercicio inexistente", () => {
    expect(findAutoFlowDestination([], "missing")).toBeNull();
  });

  it("registra el orden de ejecución sin mover un ejercicio extra", () => {
    const exercises = [
      { id: "sentadilla", plannedOrder: 1 },
      { id: "prensa", plannedOrder: 2 },
      { id: "gemelos", plannedOrder: 3, isExtra: true },
    ];

    const result = markExerciseStartedInPlace(exercises, "gemelos");

    expect(result.map((exercise) => exercise.id)).toEqual([
      "sentadilla",
      "prensa",
      "gemelos",
    ]);
    expect(result[2]).toMatchObject({
      startedOrder: 1,
      actualOrder: 1,
      plannedOrder: 3,
      orderContext: "extra",
    });
  });

  it("mantiene estable la lista al comenzar más ejercicios", () => {
    const exercises = [
      { id: "sentadilla", plannedOrder: 1 },
      { id: "prensa", plannedOrder: 2 },
      {
        id: "gemelos",
        plannedOrder: 3,
        isExtra: true,
        startedOrder: 1,
      },
    ];

    const result = markExerciseStartedInPlace(exercises, "sentadilla");

    expect(result.map((exercise) => exercise.id)).toEqual([
      "sentadilla",
      "prensa",
      "gemelos",
    ]);
    expect(result[0].startedOrder).toBe(2);
  });

  it("continúa el orden al añadir un extra a una sesión recuperada", () => {
    const completedSet = {
      id: "set-1",
      entries: [{ done: true, completedAt: "2026-09-07T12:00:00.000Z" }],
    };
    const exercises = [
      {
        id: "sentadilla",
        plannedOrder: 1,
        actualOrder: 1,
        sets: [completedSet],
      },
      {
        id: "prensa",
        plannedOrder: 2,
        actualOrder: 2,
        sets: [completedSet],
      },
      { id: "gemelos", plannedOrder: 3, isExtra: true, sets: [] },
    ];

    const result = markExerciseStartedInPlace(exercises, "gemelos");

    expect(result[2]).toMatchObject({
      startedOrder: 3,
      actualOrder: 3,
      orderContext: "extra",
    });
  });
});
