import { describe, expect, it } from "vitest";
import { resolveRoutinePlanContext } from "./trainingPlanContext";

const plan = {
  _id: "plan_1",
  status: "active",
  weeklySchedule: [
    {
      slotId: "slot_1",
      type: "training",
      routineId: "routine_1",
    },
  ],
};

describe("resolveRoutinePlanContext", () => {
  it("conserva el contexto elegido explícitamente", () => {
    expect(
      resolveRoutinePlanContext(
        { id: "routine_1" },
        { planId: "plan_1", slotId: "slot_1", scheduleOverride: true },
        [plan],
      ),
    ).toEqual({
      planId: "plan_1",
      slotId: "slot_1",
      scheduleOverride: true,
    });
  });

  it("recupera el plan y el bloque de una rutina asignada", () => {
    expect(
      resolveRoutinePlanContext(
        {
          id: "routine_1",
          raw: {
            trainingPlanId: "plan_1",
            trainingPlanSlotId: "slot_1",
          },
        },
        null,
        [plan],
      ),
    ).toEqual({ planId: "plan_1", slotId: "slot_1" });
  });

  it("deduce un único bloque del plan activo sin inventar uno ambiguo", () => {
    expect(
      resolveRoutinePlanContext({ id: "routine_1" }, null, [plan]),
    ).toEqual({ planId: "plan_1", slotId: "slot_1" });

    expect(
      resolveRoutinePlanContext({ id: "routine_1" }, null, [
        {
          ...plan,
          weeklySchedule: [
            ...plan.weeklySchedule,
            {
              slotId: "slot_4",
              type: "training",
              routineId: "routine_1",
            },
          ],
        },
      ]),
    ).toBeNull();
  });
});
