import { buildQuickPlanSchedule } from "../utils/quickPlan";

export const createQuickTrainingPlan = async ({
  client,
  routine,
  selectedDays,
  durationWeeks,
  startDate,
}) => {
  const routineId = String(routine?.id || routine?._id || "");
  if (!routineId || !selectedDays.length) {
    throw new Error("Selecciona una rutina y al menos un día.");
  }

  let draftPlan = null;
  try {
    draftPlan = await client.createTrainingPlan({
      name: `Plan de ${routine.name}`.slice(0, 100),
      goal: "General",
      level: "beginner",
      durationWeeks,
      startDate,
      scheduleMode: "fixed",
      weeklySchedule: buildQuickPlanSchedule(selectedDays),
    });
    const planId = draftPlan._id || draftPlan.id;
    for (const day of draftPlan.weeklySchedule || []) {
      if (day.type !== "training") continue;
      draftPlan = await client.assignRoutineToPlanSlot(
        planId,
        day.slotId,
        routineId,
      );
    }
    return await client.updateTrainingPlanStatus(planId, "active");
  } catch (error) {
    if (draftPlan) error.draftPlan = draftPlan;
    throw error;
  }
};
