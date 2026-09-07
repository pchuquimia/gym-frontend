import { describe, expect, test } from "vitest";
import {
  upsertDashboardCheckIn,
  upsertDashboardTraining,
} from "./dashboardBootstrapCache";

describe("dashboard bootstrap cache", () => {
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
