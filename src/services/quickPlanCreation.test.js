import { describe, expect, it, vi } from "vitest";
import { createQuickTrainingPlan } from "./quickPlanCreation";

const routine = { id: "routine-1", name: "Fuerza total" };
const draft = {
  id: "plan-1",
  status: "draft",
  weeklySchedule: [
    { dayIndex: 1, slotId: "slot_fixed_1", type: "training" },
    { dayIndex: 2, slotId: "slot_fixed_2", type: "rest" },
    { dayIndex: 3, slotId: "slot_fixed_3", type: "training" },
  ],
};

describe("createQuickTrainingPlan", () => {
  it("asigna la rutina a todos los días elegidos antes de activar", async () => {
    const calls = [];
    const client = {
      createTrainingPlan: vi.fn(async (payload) => {
        calls.push("create");
        expect(payload.weeklySchedule).toHaveLength(7);
        return draft;
      }),
      assignRoutineToPlanSlot: vi.fn(async (_, slotId) => {
        calls.push(slotId);
        return draft;
      }),
      updateTrainingPlanStatus: vi.fn(async () => {
        calls.push("activate");
        return { ...draft, status: "active" };
      }),
    };

    const plan = await createQuickTrainingPlan({
      client,
      routine,
      selectedDays: [1, 3],
      durationWeeks: 4,
      startDate: "2026-10-01",
    });

    expect(calls).toEqual([
      "create",
      "slot_fixed_1",
      "slot_fixed_3",
      "activate",
    ]);
    expect(client.assignRoutineToPlanSlot).toHaveBeenCalledWith(
      "plan-1",
      "slot_fixed_3",
      "routine-1",
    );
    expect(plan.status).toBe("active");
  });

  it("expone el borrador cuando una asignación falla", async () => {
    const failure = new Error("Sin conexión");
    const client = {
      createTrainingPlan: vi.fn().mockResolvedValue(draft),
      assignRoutineToPlanSlot: vi.fn().mockRejectedValue(failure),
      updateTrainingPlanStatus: vi.fn(),
    };

    await expect(
      createQuickTrainingPlan({
        client,
        routine,
        selectedDays: [1],
        durationWeeks: 4,
        startDate: "2026-10-01",
      }),
    ).rejects.toMatchObject({ draftPlan: draft });
    expect(client.updateTrainingPlanStatus).not.toHaveBeenCalled();
  });
});
