import { describe, expect, it } from "vitest";
import {
  getTrainingDraftSyncLabel,
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

  it("presenta estados breves y comprensibles", () => {
    expect(getTrainingDraftSyncLabel("saving")).toBe("Guardando…");
    expect(getTrainingDraftSyncLabel("saved")).toBe("Guardado");
    expect(getTrainingDraftSyncLabel("offline")).toBe("Sin conexión");
    expect(getTrainingDraftSyncLabel("error")).toBe("Pendiente de sincronizar");
  });
});
