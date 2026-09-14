const getId = (value) => String(value?._id || value?.id || "");

export const getTrainingPlanLineageIds = (planId, plans = []) => {
  const normalizedPlanId = String(planId || "").trim();
  if (!normalizedPlanId) return [];

  const planById = new Map(
    (plans || [])
      .map((plan) => [getId(plan), plan])
      .filter(([id]) => Boolean(id)),
  );
  const lineageIds = new Set([normalizedPlanId]);
  let changed = true;

  while (changed) {
    changed = false;
    planById.forEach((plan, id) => {
      const sourcePlanId = String(plan?.sourcePlanId || "").trim();
      if (!sourcePlanId || !planById.has(sourcePlanId)) return;
      if (!lineageIds.has(id) && !lineageIds.has(sourcePlanId)) return;
      if (!lineageIds.has(id)) {
        lineageIds.add(id);
        changed = true;
      }
      if (!lineageIds.has(sourcePlanId)) {
        lineageIds.add(sourcePlanId);
        changed = true;
      }
    });
  }

  return Array.from(lineageIds);
};

export const resolveRoutinePlanContext = (
  routine,
  requestedContext = null,
  plans = [],
) => {
  const rawRoutine = routine?.raw || routine || {};
  const routineId = getId(routine) || getId(rawRoutine);
  let planId = String(
    requestedContext?.planId || rawRoutine.trainingPlanId || "",
  );
  let slotId = String(
    requestedContext?.slotId || rawRoutine.trainingPlanSlotId || "",
  );

  let plan = plans.find((candidate) => getId(candidate) === planId) || null;
  if (!plan && routineId) {
    const matchingPlans = plans.filter(
      (candidate) =>
        candidate.status === "active" &&
        (candidate.weeklySchedule || []).some(
          (day) =>
            day.type === "training" &&
            String(day.routineId || "") === routineId,
        ),
    );
    if (matchingPlans.length === 1) {
      plan = matchingPlans[0];
      planId = getId(plan);
    }
  }

  if (plan && !slotId && routineId) {
    const matchingSlots = (plan.weeklySchedule || []).filter(
      (day) =>
        day.type === "training" && String(day.routineId || "") === routineId,
    );
    if (matchingSlots.length === 1) {
      slotId = String(matchingSlots[0].slotId || "");
    }
  }

  if (!planId || !slotId) return requestedContext;
  return {
    ...(requestedContext || {}),
    planId,
    slotId,
  };
};
