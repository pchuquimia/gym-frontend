import { beforeEach, describe, expect, it } from "vitest";
import {
  clearActiveTrainingSnapshot,
  readActiveTrainingSnapshot,
} from "./activeTraining";

describe("limpieza de entrenamientos activos", () => {
  beforeEach(() => localStorage.clear());

  it("borra la copia actual, la antigua y el respaldo del usuario", () => {
    const snapshot = JSON.stringify({
      selectedRoutineId: "routine-1",
      hasStarted: true,
    });
    localStorage.setItem("active_training_snapshot", snapshot);
    localStorage.setItem("active_training", snapshot);
    localStorage.setItem("active_training_snapshot:user-1", snapshot);
    localStorage.setItem("active_training_snapshot:user-2", snapshot);

    clearActiveTrainingSnapshot("user-1");

    expect(readActiveTrainingSnapshot()).toBeNull();
    expect(localStorage.getItem("active_training_snapshot:user-1")).toBeNull();
    expect(localStorage.getItem("active_training_snapshot:user-2")).toBe(
      snapshot,
    );
  });
});
