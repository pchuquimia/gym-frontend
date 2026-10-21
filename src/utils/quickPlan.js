export const QUICK_PLAN_INTENT_KEY = "rirfit_create_quick_plan_intent";

export const getLocalPlanDate = (date = new Date()) => {
  const local = new Date(date);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 10);
};

export const getMondayFirstDayIndex = (date = new Date()) =>
  ((date.getDay() + 6) % 7) + 1;

export const buildQuickPlanSchedule = (selectedDays) => {
  const days = new Set(selectedDays);
  return Array.from({ length: 7 }, (_, index) => {
    const dayIndex = index + 1;
    return {
      dayIndex,
      slotId: `slot_fixed_${dayIndex}`,
      type: days.has(dayIndex) ? "training" : "rest",
      focus: "",
    };
  });
};

export const getQuickPlanAssignments = (
  routineIds,
  selectedDays,
  overrides = {},
) => {
  let position = 0;
  return buildQuickPlanSchedule(selectedDays).map((day) => {
    if (day.type !== "training") return day;
    const suggested = routineIds[position++ % routineIds.length] || "";
    return {
      ...day,
      routineId: routineIds.includes(overrides[day.dayIndex])
        ? overrides[day.dayIndex]
        : suggested,
    };
  });
};
