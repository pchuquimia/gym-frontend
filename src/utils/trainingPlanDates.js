export const planStartsInFuture = (startDate, now = new Date()) => {
  if (!startDate) return false;
  const todayUtc = new Date(now);
  todayUtc.setUTCHours(0, 0, 0, 0);
  return new Date(startDate).getTime() > todayUtc.getTime();
};

export const getCurrentPlanWeek = (plan, dateValue) => {
  if (!plan?.startDate) return 0;
  const start = new Date(plan.startDate);
  start.setUTCHours(0, 0, 0, 0);
  const selectedDate = new Date(`${dateValue.slice(0, 10)}T00:00:00.000Z`);
  return Math.min(
    Math.max(0, Number(plan.durationWeeks || 1) - 1),
    Math.max(0, Math.floor((selectedDate - start) / (7 * 86400000))),
  );
};
