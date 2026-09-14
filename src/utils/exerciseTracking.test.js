import { describe, expect, it } from "vitest";
import {
  buildExerciseTrackingRows,
  collectExerciseTrackingPlanTrainings,
  collectExerciseTrackingRoutineTrainings,
  getExerciseTrackingBestEntryKeysByPlan,
  getExerciseTrackingBestEntryKeysByRoutine,
  getExerciseTrackingBestEntryKeysBySet,
  getExerciseTrackingBestWeightsByPlan,
  getExerciseTrackingBestWeightsBySet,
  getExerciseTrackingEntryKey,
  getExerciseTrackingEntryWeight,
  getExerciseTrackingRoutineLabel,
  getExerciseTrackingRoutineKey,
  getInitialExerciseTrackingScope,
} from "./exerciseTracking";

const targetExercise = {
  id: "leg-extension",
  name: "Extensión de cuádriceps",
  movementMode: "bilateral",
  weightBasis: "machine",
};

describe("exerciseTracking", () => {
  it("reúne todas las series compatibles del ejercicio entre rutinas", () => {
    const rows = buildExerciseTrackingRows(targetExercise, [
      {
        _id: "session-1",
        date: "2026-08-10",
        routineId: "legs-a",
        progressScopeId: "scope-a",
        exercises: [
          {
            exerciseId: "leg-extension",
            movementMode: "bilateral",
            weightBasis: "machine",
            sets: [
              { weightKg: 40, reps: 12 },
              { weightKg: 45, reps: 10 },
            ],
          },
        ],
      },
      {
        _id: "session-2",
        date: "2026-08-12",
        routineId: "legs-b",
        progressScopeId: "scope-b",
        exercises: [
          {
            exerciseId: "leg-extension",
            movementMode: "bilateral",
            weightBasis: "machine",
            sets: [
              { entries: [{ weightKg: 50, reps: 8 }] },
              { entries: [{ weightKg: 50, reps: 7 }] },
              { entries: [{ weightKg: 45, reps: 10 }] },
            ],
          },
        ],
      },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0].sets).toHaveLength(3);
    expect(rows[1].sets).toHaveLength(2);
    expect(rows[0].sets[0][0]).toMatchObject({ weightKg: 50, reps: 8 });
  });

  it("no mezcla configuraciones incompatibles de la misma máquina", () => {
    const rows = buildExerciseTrackingRows(targetExercise, [
      {
        _id: "unilateral-session",
        date: "2026-08-11",
        exercises: [
          {
            exerciseId: "leg-extension",
            movementMode: "unilateral",
            weightBasis: "machine",
            sets: [{ weightKg: 20, reps: 10 }],
          },
        ],
      },
    ]);

    expect(rows).toEqual([]);
  });

  it("incluye todas las configuraciones del ejercicio al mostrar historial", () => {
    const rows = buildExerciseTrackingRows(
      targetExercise,
      [
        {
          _id: "unilateral-session",
          date: "2026-08-11",
          exercises: [
            {
              exerciseId: "leg-extension",
              movementMode: "unilateral",
              weightBasis: "machine",
              sets: [{ weightKg: 20, reps: 10 }],
            },
          ],
        },
      ],
      { compatibleOnly: false },
    );

    expect(rows).toHaveLength(1);
  });

  it("muestra la rutina de origen al consultar el plan o el historial general", () => {
    const row = { routineName: "Piernas B" };

    expect(getExerciseTrackingRoutineLabel(row, "routine")).toBe("");
    expect(getExerciseTrackingRoutineLabel(row, "plan")).toBe("Piernas B");
    expect(getExerciseTrackingRoutineLabel(row, "general")).toBe("Piernas B");
    expect(getExerciseTrackingRoutineLabel({}, "plan")).toBe("Sin rutina");
  });

  it("abre el plan cuando el ejercicio solo tiene historial en otra rutina", () => {
    const otherRoutineTraining = {
      _id: "other-routine-session",
      date: "2026-08-12",
      routineId: "legs-b",
      exercises: [
        {
          exerciseId: "leg-extension",
          movementMode: "bilateral",
          weightBasis: "machine",
          sets: [{ weightKg: 50, reps: 8 }],
        },
      ],
    };

    expect(
      getInitialExerciseTrackingScope(
        targetExercise,
        [],
        [otherRoutineTraining],
      ),
    ).toBe("plan");
  });

  it("prioriza la rutina actual y usa todo como respaldo", () => {
    const currentRoutineTraining = {
      _id: "current-routine-session",
      date: "2026-08-14",
      routineId: "legs-a",
      exercises: [
        {
          exerciseId: "leg-extension",
          movementMode: "bilateral",
          weightBasis: "machine",
          sets: [{ weightKg: 45, reps: 10 }],
        },
      ],
    };

    expect(
      getInitialExerciseTrackingScope(
        targetExercise,
        [currentRoutineTraining],
        [currentRoutineTraining],
      ),
    ).toBe("routine");
    expect(getInitialExerciseTrackingScope(targetExercise, [], [])).toBe(
      "general",
    );
  });

  it("calcula el mejor peso del historial visible", () => {
    const rows = [
      {
        sets: [[{ weightKg: 40, reps: 12 }], [{ weightKg: "52,5", reps: 8 }]],
      },
      {
        sets: [
          [
            { weightKg: 50, reps: 10 },
            { weightKg: null, reps: 12 },
          ],
        ],
      },
    ];

    expect(getExerciseTrackingBestWeightsBySet(rows)).toEqual([50, 52.5]);
    expect(getExerciseTrackingEntryWeight({ weightKg: "52,5" })).toBe(52.5);
    expect(getExerciseTrackingEntryWeight({ reps: 12 })).toBeNull();
  });

  it("calcula los mejores pesos por serie para cada plan", () => {
    const rows = [
      {
        trainingPlanId: "plan-a",
        sets: [[{ weightKg: 40 }], [{ weightKg: 30 }]],
      },
      {
        trainingPlanId: "plan-a",
        sets: [[{ weightKg: 45 }], [{ weightKg: 35 }]],
      },
      {
        trainingPlanId: "plan-b",
        sets: [[{ weightKg: 60 }], [{ weightKg: 25 }]],
      },
      { sets: [[{ weightKg: 50 }], [{ weightKg: 40 }]] },
    ];

    const best = getExerciseTrackingBestWeightsByPlan(rows);
    expect(best.byPlan.get("plan-a")).toEqual([45, 35]);
    expect(best.byPlan.get("plan-b")).toEqual([60, 25]);
    expect(best.global).toEqual([60, 40]);
  });

  it("marca solo la fecha más reciente cuando el mejor peso se repite", () => {
    const rows = [
      {
        id: "newest",
        date: "2026-05-16",
        ts: Date.parse("2026-05-16T00:00:00"),
        trainingPlanId: "plan-a",
        sets: [[{ weightKg: 55 }]],
      },
      {
        id: "older",
        date: "2026-04-25",
        ts: Date.parse("2026-04-25T00:00:00"),
        trainingPlanId: "plan-a",
        sets: [[{ weightKg: 55 }]],
      },
    ];

    const best = getExerciseTrackingBestEntryKeysByPlan(rows);
    expect(best.byPlan.get("plan-a")).toEqual([
      getExerciseTrackingEntryKey(rows[0], 0, 0),
    ]);
    expect(getExerciseTrackingBestEntryKeysBySet(rows)).toEqual([
      getExerciseTrackingEntryKey(rows[0], 0, 0),
    ]);
  });

  it("calcula un único mejor registro por serie para cada rutina", () => {
    const rows = [
      {
        id: "routine-a-new",
        date: "2026-05-16",
        ts: Date.parse("2026-05-16T00:00:00"),
        routineId: "routine-a",
        sets: [[{ weightKg: 55 }]],
      },
      {
        id: "routine-a-old",
        date: "2026-04-25",
        ts: Date.parse("2026-04-25T00:00:00"),
        routineId: "routine-a",
        sets: [[{ weightKg: 55 }]],
      },
      {
        id: "routine-b-best",
        date: "2026-03-20",
        ts: Date.parse("2026-03-20T00:00:00"),
        routineId: "routine-b",
        sets: [[{ weightKg: 70 }]],
      },
    ];

    const best = getExerciseTrackingBestEntryKeysByRoutine(rows);
    expect(best.byRoutine.get(getExerciseTrackingRoutineKey(rows[0]))).toEqual([
      getExerciseTrackingEntryKey(rows[0], 0, 0),
    ]);
    expect(best.byRoutine.get(getExerciseTrackingRoutineKey(rows[2]))).toEqual([
      getExerciseTrackingEntryKey(rows[2], 0, 0),
    ]);
  });

  it("reúne las rutinas del plan y recupera sesiones antiguas sin planId", () => {
    const currentPlan = {
      _id: "session-plan-a",
      trainingPlanId: "plan-a",
      routineId: "routine-a",
    };
    const secondRoutine = {
      _id: "session-plan-b",
      trainingPlanId: "plan-a",
      routineId: "routine-b",
    };
    const legacyRoutine = {
      _id: "session-legacy",
      routineId: "routine-b",
    };
    const otherPlan = {
      _id: "session-other",
      trainingPlanId: "plan-b",
      routineId: "routine-b",
    };

    expect(
      collectExerciseTrackingPlanTrainings({
        planId: "plan-a",
        routineIds: ["routine-a", "routine-b"],
        sources: [
          [currentPlan],
          [currentPlan, secondRoutine, legacyRoutine, otherPlan],
        ],
      }).map((training) => training._id),
    ).toEqual(["session-plan-a", "session-plan-b", "session-legacy"]);
  });

  it("reúne las sesiones de todos los planes de una continuación", () => {
    const sourcePlanSession = {
      _id: "source-plan",
      trainingPlanId: "plan-a",
      routineId: "routine-a-old",
    };
    const continuationSession = {
      _id: "continuation-plan",
      trainingPlanId: "plan-b",
      routineId: "routine-a-new",
    };
    const unrelatedSession = {
      _id: "unrelated-plan",
      trainingPlanId: "plan-c",
      routineId: "routine-a-new",
    };

    expect(
      collectExerciseTrackingPlanTrainings({
        planId: "plan-b",
        planIds: ["plan-a", "plan-b"],
        routineIds: ["routine-a-old", "routine-a-new"],
        sources: [sourcePlanSession, continuationSession, unrelatedSession],
      }).map((training) => training._id),
    ).toEqual(["source-plan", "continuation-plan"]);
  });

  it("limita Rutina a su propio routineId aunque comparta historial", () => {
    const currentRoutine = {
      _id: "current",
      routineId: "routine-a",
      routineName: "Piernas A",
      progressScopeId: "shared-scope",
    };
    const inheritedRoutine = {
      _id: "inherited",
      routineId: "routine-b",
      routineName: "Piernas B",
      progressScopeId: "shared-scope",
    };
    const legacyCurrentRoutine = {
      _id: "legacy",
      routineName: "Piernas A",
    };

    expect(
      collectExerciseTrackingRoutineTrainings({
        routineId: "routine-a",
        routineName: "Piernas A",
        sources: [
          [currentRoutine, inheritedRoutine],
          [currentRoutine, legacyCurrentRoutine],
        ],
      }).map((training) => training._id),
    ).toEqual(["current", "legacy"]);
  });

  it("conserva las sesiones de un bloque del plan aunque cambie el ID de la rutina", () => {
    const currentVersion = {
      _id: "current-version",
      trainingPlanId: "plan-a",
      trainingPlanSlotId: "slot-2",
      routineId: "routine-new",
      routineName: "Piernas actualizada",
    };
    const previousVersion = {
      _id: "previous-version",
      trainingPlanId: "plan-a",
      trainingPlanSlotId: "slot-2",
      routineId: "routine-old",
      routineName: "Piernas anterior",
    };
    const anotherSlot = {
      _id: "another-slot",
      trainingPlanId: "plan-a",
      trainingPlanSlotId: "slot-4",
      routineId: "routine-new",
      routineName: "Piernas actualizada",
    };
    const anotherPlan = {
      _id: "another-plan",
      trainingPlanId: "plan-b",
      trainingPlanSlotId: "slot-2",
      routineId: "routine-new",
      routineName: "Piernas actualizada",
    };
    const anotherPlanWithoutSlot = {
      _id: "another-plan-without-slot",
      trainingPlanId: "plan-b",
      routineId: "routine-new",
      routineName: "Piernas actualizada",
    };

    expect(
      collectExerciseTrackingRoutineTrainings({
        routineId: "routine-new",
        routineName: "Piernas actualizada",
        planId: "plan-a",
        slotId: "slot-2",
        sources: [
          currentVersion,
          previousVersion,
          anotherSlot,
          anotherPlan,
          anotherPlanWithoutSlot,
        ],
      }).map((training) => training._id),
    ).toEqual(["current-version", "previous-version"]);
  });

  it("reúne las copias históricas de una rutina por progressScopeId", () => {
    const previousPlanRoutine = {
      _id: "previous-plan-routine",
      trainingPlanId: "plan-a",
      trainingPlanSlotId: "slot-1",
      routineId: "routine-old",
      progressScopeId: "scope-lower-a",
    };
    const continuationRoutine = {
      _id: "continuation-routine",
      trainingPlanId: "plan-b",
      trainingPlanSlotId: "slot-1",
      routineId: "routine-new",
      progressScopeId: "scope-lower-a",
    };
    const lowerB = {
      _id: "lower-b",
      trainingPlanId: "plan-b",
      trainingPlanSlotId: "slot-4",
      routineId: "routine-lower-b",
      progressScopeId: "scope-lower-b",
    };

    expect(
      collectExerciseTrackingRoutineTrainings({
        routineId: "routine-new",
        progressScopeId: "scope-lower-a",
        planId: "plan-b",
        slotId: "slot-1",
        sources: [previousPlanRoutine, continuationRoutine, lowerB],
      }).map((training) => training._id),
    ).toEqual(["previous-plan-routine", "continuation-routine"]);
  });
});
