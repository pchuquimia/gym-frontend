import { describe, expect, it, vi } from "vitest";
import { createQuickTrainingPlan } from "./quickPlanCreation";
import { buildQuickPlanSchedule } from "../utils/quickPlan";

const routines = [
  { id: "torso", name: "Torso" },
  { id: "pierna", name: "Pierna" },
];
const configuration = {
  routines,
  selectedDays: [1, 2, 4, 5],
  durationWeeks: 4,
  startDate: "2026-11-01",
};
const setup = () => {
  let saved;
  const calls = [];
  const client = {
    createTrainingPlan: vi.fn(async (payload) => {
      calls.push("create");
      saved = { ...payload, id: "plan-1", status: "draft" };
      return saved;
    }),
    assignRoutineToPlanSlot: vi.fn(async (_, slotId, routineId) => {
      calls.push(slotId);
      saved = {
        ...saved,
        weeklySchedule: saved.weeklySchedule.map((day) =>
          day.slotId === slotId ? { ...day, routineId } : day,
        ),
      };
      return saved;
    }),
    updateTrainingPlanStatus: vi.fn(async () => {
      calls.push("activate");
      return { ...saved, status: "scheduled" };
    }),
    getTrainingPlans: vi.fn(async () => [saved]),
    createRoutine: vi.fn(),
  };
  return { client, calls };
};

describe("createQuickTrainingPlan", () => {
  it("alternates routines and applies overrides before activation", async () => {
    const { client, calls } = setup();
    const result = await createQuickTrainingPlan({
      client,
      ...configuration,
      name: "Mi bloque",
      overrides: { 4: "pierna" },
    });
    expect(client.createTrainingPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Mi bloque",
        weeklySchedule: buildQuickPlanSchedule(configuration.selectedDays),
      }),
    );
    expect(
      client.assignRoutineToPlanSlot.mock.calls.map((call) => call[2]),
    ).toEqual(["torso", "pierna", "pierna", "pierna"]);
    expect(calls).toEqual([
      "create",
      "slot_fixed_1",
      "slot_fixed_2",
      "slot_fixed_4",
      "slot_fixed_5",
      "activate",
    ]);
    expect(result.status).toBe("scheduled");
  });
  it("resumes the same draft, skipping assignments already saved", async () => {
    const { client } = setup();
    client.assignRoutineToPlanSlot.mockImplementationOnce(async () => {
      throw new Error("Offline");
    });
    let failure;
    try {
      await createQuickTrainingPlan({ client, ...configuration });
    } catch (error) {
      failure = error;
    }
    expect(failure.draftPlan.status).toBe("draft");
    expect(client.updateTrainingPlanStatus).not.toHaveBeenCalled();
    await createQuickTrainingPlan({
      client,
      ...configuration,
      existingDraft: failure.draftPlan,
    });
    expect(client.createTrainingPlan).toHaveBeenCalledOnce();
    expect(client.getTrainingPlans).toHaveBeenCalledOnce();
    expect(client.updateTrainingPlanStatus).toHaveBeenCalledOnce();
  });
  it("reconciles an activation whose response was lost even if source routines disappeared", async () => {
    const { client } = setup();
    client.getTrainingPlans.mockResolvedValue([
      { id: "plan-1", status: "active" },
    ]);
    const result = await createQuickTrainingPlan({
      client,
      routines: [],
      existingDraft: { id: "plan-1" },
    });
    expect(result.status).toBe("active");
    expect(client.createTrainingPlan).not.toHaveBeenCalled();
    expect(client.updateTrainingPlanStatus).not.toHaveBeenCalled();
  });
  it("copies a plan-owned routine so pausing its source plan cannot archive it", async () => {
    const { client } = setup();
    client.createRoutine.mockResolvedValue({ id: "copy-1" });
    await createQuickTrainingPlan({
      client,
      ...configuration,
      routines: [
        {
          ...routines[0],
          trainingPlanId: "old-plan",
          exercises: [{ exerciseId: "squat", name: "Squat" }],
        },
      ],
      selectedDays: [1],
    });
    expect(client.createRoutine).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "plan_plan-1_slot_fixed_1",
        trainingPlanId: "plan-1",
        sourceRoutineId: "torso",
        progressMode: "inherit",
      }),
    );
    expect(client.assignRoutineToPlanSlot).not.toHaveBeenCalled();
    expect(client.updateTrainingPlanStatus).toHaveBeenCalledOnce();
  });
  it("does not activate an incomplete response from the server", async () => {
    const { client } = setup();
    client.assignRoutineToPlanSlot.mockResolvedValue({
      id: "plan-1",
      weeklySchedule: buildQuickPlanSchedule([1]),
    });
    await expect(
      createQuickTrainingPlan({ client, ...configuration, selectedDays: [1] }),
    ).rejects.toHaveProperty("draftPlan");
    expect(client.updateTrainingPlanStatus).not.toHaveBeenCalled();
  });
  it("validates selections before creating anything", async () => {
    const { client } = setup();
    await expect(
      createQuickTrainingPlan({ client, ...configuration, selectedDays: [] }),
    ).rejects.toThrow();
    await expect(
      createQuickTrainingPlan({ client, ...configuration, durationWeeks: 0 }),
    ).rejects.toThrow();
    expect(client.createTrainingPlan).not.toHaveBeenCalled();
  });
  it("recovers a copy saved before a failed slot update instead of duplicating it", async () => {
    const { client } = setup();
    const draft = {
      id: "plan-1",
      status: "draft",
      weeklySchedule: buildQuickPlanSchedule([1]),
    };
    client.getTrainingPlans.mockResolvedValue([draft]);
    client.getRoutines = vi
      .fn()
      .mockResolvedValue([
        { id: "plan_plan-1_slot_fixed_1", trainingPlanId: "plan-1" },
      ]);
    client.assignRoutineToPlanSlot.mockResolvedValue({
      ...draft,
      weeklySchedule: draft.weeklySchedule.map((day) =>
        day.dayIndex === 1
          ? { ...day, routineId: "plan_plan-1_slot_fixed_1" }
          : day,
      ),
    });
    await createQuickTrainingPlan({
      client,
      ...configuration,
      selectedDays: [1],
      routines: [{ ...routines[0], trainingPlanId: "old-plan" }],
      existingDraft: draft,
    });
    expect(client.createTrainingPlan).not.toHaveBeenCalled();
    expect(client.createRoutine).not.toHaveBeenCalled();
    expect(client.assignRoutineToPlanSlot).toHaveBeenCalledWith(
      "plan-1",
      "slot_fixed_1",
      "plan_plan-1_slot_fixed_1",
    );
  });
});
