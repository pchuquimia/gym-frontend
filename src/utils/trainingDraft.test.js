import { describe, expect, it } from "vitest";
import {
  getTrainingDraftSyncLabel,
  isCancelledTrainingSnapshot,
  parseTrainingSnapshot,
  selectLatestTrainingSnapshot,
} from "./trainingDraft";

const snapshot = (lastUpdate, routine = "routine-1") => ({
  selectedRoutineId: routine,
  trainingRequestId: `training-${routine}`,
  lastUpdate,
});

describe("trainingDraft", () => {
  it("elige el borrador mas reciente entre el navegador y el servidor", () => {
    expect(
      selectLatestTrainingSnapshot(snapshot(100), snapshot(200, "routine-2")),
    ).toMatchObject({ selectedRoutineId: "routine-2" });
    expect(
      selectLatestTrainingSnapshot(snapshot(300), snapshot(200, "routine-2")),
    ).toMatchObject({ selectedRoutineId: "routine-1" });
  });

  it("ignora snapshots malformados", () => {
    expect(parseTrainingSnapshot("{malformed")).toBeNull();
    expect(selectLatestTrainingSnapshot(null, snapshot(100))).toMatchObject({
      selectedRoutineId: "routine-1",
    });
  });

  it("bloquea solo el borrador cancelado del mismo usuario y solicitud", () => {
    const cancelled = {
      ...snapshot(100),
      ownerId: "athlete-1",
    };
    expect(
      isCancelledTrainingSnapshot(snapshot(200), cancelled, "athlete-1"),
    ).toBe(true);
    expect(
      isCancelledTrainingSnapshot(snapshot(200), cancelled, "athlete-2"),
    ).toBe(false);
    expect(
      isCancelledTrainingSnapshot(
        { ...snapshot(200), trainingRequestId: "new-training" },
        cancelled,
        "athlete-1",
      ),
    ).toBe(false);
  });

  it("presenta estados breves y comprensibles", () => {
    expect(getTrainingDraftSyncLabel("saving")).toBe("Guardando…");
    expect(getTrainingDraftSyncLabel("saved")).toBe("Guardado");
    expect(getTrainingDraftSyncLabel("offline")).toBe("Sin conexión");
    expect(getTrainingDraftSyncLabel("error")).toBe("Pendiente de sincronizar");
  });
});
