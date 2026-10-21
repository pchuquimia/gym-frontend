import { getQuickPlanAssignments } from "../utils/quickPlan";

const idOf = (item) => String(item?.id || item?._id || "");

export const createQuickTrainingPlan = async ({
  client,
  routines,
  routine,
  selectedDays,
  overrides = {},
  durationWeeks,
  startDate,
  name,
  goal = "General",
  level = "beginner",
  notes = "",
  existingDraft = null,
}) => {
  if (existingDraft) {
    try {
      const plans = await client.getTrainingPlans();
      existingDraft = plans.find((plan) => idOf(plan) === idOf(existingDraft));
      if (!existingDraft) throw new Error("El borrador ya no está disponible.");
      if (["active", "scheduled"].includes(existingDraft.status))
        return existingDraft;
      if (existingDraft.status !== "draft")
        throw new Error("Abre el plan para revisar su estado.");
      if (
        existingDraft.weeklySchedule.every(
          (day) => day.type !== "training" || day.routineId,
        )
      ) {
        return await client.updateTrainingPlanStatus(
          idOf(existingDraft),
          "active",
        );
      }
    } catch (error) {
      if (existingDraft) error.draftPlan = existingDraft;
      throw error;
    }
  }
  const selected = routines || (routine ? [routine] : []);
  const ids = selected.map(idOf);
  if (
    !ids.length ||
    ids.some((id) => !id) ||
    !selectedDays?.length ||
    selectedDays.some((day) => !Number.isInteger(day) || day < 1 || day > 7)
  ) {
    throw new Error("Selecciona rutinas y al menos un día válido.");
  }
  if (
    !Number.isInteger(durationWeeks) ||
    durationWeeks < 1 ||
    durationWeeks > 52 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(startDate || "") ||
    Number.isNaN(Date.parse(startDate))
  ) {
    throw new Error("Revisa la fecha de inicio y la duración del plan.");
  }
  const schedule = getQuickPlanAssignments(ids, selectedDays, overrides);
  let draftPlan = existingDraft;
  try {
    if (!draftPlan) {
      draftPlan = await client.createTrainingPlan({
        name: (
          name?.trim() ||
          `Plan de ${selected.map((item) => item.name).join(" + ")}`
        ).slice(0, 100),
        goal,
        level,
        notes,
        durationWeeks,
        startDate,
        scheduleMode: "fixed",
        weeklySchedule: schedule.map((day) => ({
          dayIndex: day.dayIndex,
          slotId: day.slotId,
          type: day.type,
          focus: "",
        })),
      });
    }
    const planId = idOf(draftPlan);
    for (const day of schedule.filter((item) => item.type === "training")) {
      const savedDay = draftPlan.weeklySchedule?.find(
        (item) => item.slotId === day.slotId,
      );
      if (!savedDay)
        throw new Error(
          "El calendario guardado no coincide. Abre el borrador para revisarlo.",
        );
      if (savedDay.routineId) continue;
      const source = selected.find((item) => idOf(item) === day.routineId);
      if (source.trainingPlanId && String(source.trainingPlanId) !== planId) {
        // These routines are archived with the original plan. Use an independent
        // copy, retaining progression, so pausing that plan cannot disable this one.
        const copyId = `plan_${planId}_${day.slotId}`;
        const recoveredCopy = existingDraft
          ? (await client.getRoutines({ includeArchived: true })).find(
              (item) =>
                idOf(item) === copyId && String(item.trainingPlanId) === planId,
            )
          : null;
        const copy =
          recoveredCopy ||
          (await client.createRoutine({
            id: copyId,
            name: source.name,
            description: source.description,
            exercises: source.exercises,
            branch: source.branch,
            exerciseOrderMode: source.exerciseOrderMode,
            sourceRoutineId: idOf(source),
            progressMode: "inherit",
            trainingPlanId: planId,
            trainingPlanSlotId: day.slotId,
          }));
        if (recoveredCopy) {
          draftPlan = await client.assignRoutineToPlanSlot(
            planId,
            day.slotId,
            copyId,
          );
          continue;
        }
        draftPlan = {
          ...draftPlan,
          weeklySchedule: draftPlan.weeklySchedule.map((item) =>
            item.slotId === day.slotId
              ? {
                  ...item,
                  routineId: idOf(copy),
                  sourceRoutineId: idOf(source),
                }
              : item,
          ),
        };
      } else {
        draftPlan = await client.assignRoutineToPlanSlot(
          planId,
          day.slotId,
          day.routineId,
        );
      }
    }
    if (
      draftPlan.weeklySchedule.some(
        (day) => day.type === "training" && !day.routineId,
      )
    ) {
      throw new Error(
        "Faltan rutinas por asignar. Reintenta para completar el borrador.",
      );
    }
    // The server schedules future plans and switches active plans atomically.
    return await client.updateTrainingPlanStatus(planId, "active");
  } catch (error) {
    if (draftPlan) error.draftPlan = draftPlan;
    throw error;
  }
};
