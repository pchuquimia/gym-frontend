import { describe, expect, test } from "vitest";
import {
  getDashboardActivitySnapshot,
  getDashboardAnalyticsSnapshot,
  getDashboardCoreSnapshot,
  getDashboardHistorySnapshot,
  getDashboardSnapshotKey,
  mergeDashboardBootstrapSections,
  readDashboardSnapshot,
  upsertDashboardCheckIn,
  upsertDashboardTraining,
  writeDashboardSnapshot,
} from "./dashboardBootstrapCache";

describe("dashboard bootstrap cache", () => {
  test("separa y recompone la carga esencial y la actividad sin perder datos", () => {
    const snapshot = {
      ownerId: "athlete-1",
      planning: { status: "draft" },
      trainings: { summaries: [{ _id: "old" }], details: [] },
    };
    const core = {
      ...getDashboardCoreSnapshot(snapshot),
      planning: { status: "active" },
      generatedAt: "core-now",
    };
    const activity = {
      ...getDashboardActivitySnapshot(snapshot),
      trainings: { summaries: [{ _id: "new" }] },
      generatedAt: "activity-now",
    };
    const history = {
      ...getDashboardHistorySnapshot(snapshot),
      trainings: { details: [{ _id: "detail-new" }] },
    };
    const analytics = {
      ...getDashboardAnalyticsSnapshot(snapshot),
      dailyMetrics: [{ dateKey: "2026-09-15" }],
    };

    expect(
      mergeDashboardBootstrapSections({
        snapshot,
        core,
        activity,
        history,
        analytics,
      }),
    ).toMatchObject({
      ownerId: "athlete-1",
      planning: { status: "active" },
      trainings: {
        summaries: [{ _id: "new" }],
        details: [{ _id: "detail-new" }],
      },
      dailyMetrics: [{ dateKey: "2026-09-15" }],
      generatedAt: "core-now",
    });
  });

  test("recupera solamente una vista reciente y aislada por usuario", () => {
    const key = getDashboardSnapshotKey({
      userId: "user-1",
      ownerId: "athlete-1",
      today: "2026-09-15",
    });
    writeDashboardSnapshot(key, { ownerId: "athlete-1" }, 1_000);

    expect(readDashboardSnapshot(key, 2_000)).toEqual({
      ownerId: "athlete-1",
    });
    expect(readDashboardSnapshot(key, 13 * 60 * 60 * 1000)).toBeNull();
    expect(key).toContain("user-1:athlete-1:2026-09-15");
  });

  test("marca el check-in del día sin perder las métricas existentes", () => {
    const snapshot = {
      ownerId: "athlete-1",
      dailyMetrics: [
        { dateKey: "2026-09-07", sessionCount: 1, readinessScore: null },
      ],
    };

    const result = upsertDashboardCheckIn(snapshot, {
      athleteId: "athlete-1",
      dateKey: "2026-09-07",
      readinessScore: 82,
      readinessState: "ready",
    });

    expect(result.dailyMetrics[0]).toEqual({
      dateKey: "2026-09-07",
      sessionCount: 1,
      readinessScore: 82,
      readinessState: "ready",
    });
  });

  test("añade el entrenamiento a las dos ventanas que consume Inicio", () => {
    const training = {
      _id: "training-2",
      ownerId: "athlete-1",
      date: "2026-09-07",
      routineName: "LOWER A",
    };
    const snapshot = {
      ownerId: "athlete-1",
      trainings: {
        summaries: [{ _id: "training-1" }],
        details: [{ _id: "training-1" }],
      },
    };

    const result = upsertDashboardTraining(snapshot, training);

    expect(result.trainings.summaries[0]).toEqual(training);
    expect(result.trainings.details[0]).toEqual(training);
  });

  test("no mezcla datos cuando el dashboard pertenece a otro atleta", () => {
    const snapshot = {
      ownerId: "athlete-2",
      trainings: { summaries: [], details: [] },
    };

    expect(
      upsertDashboardTraining(snapshot, {
        _id: "training-1",
        ownerId: "athlete-1",
      }),
    ).toBe(snapshot);
  });
});
