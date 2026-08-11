import { describe, expect, it } from "vitest";
import { findAutoFlowDestination } from "./autoWorkoutFlow";

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
});
