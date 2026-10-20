export const planStartsInFuture = (startDate, now = new Date()) => {
  if (!startDate) return false;
  const todayUtc = new Date(now);
  todayUtc.setUTCHours(0, 0, 0, 0);
  return new Date(startDate).getTime() > todayUtc.getTime();
};

export const getPlanExtensionPreview = (
  plan,
  additionalWeeks,
  now = new Date(),
) => {
  const weeks = Number(additionalWeeks);
  if (!plan?.endDate || !Number.isInteger(weeks) || weeks < 1 || weeks > 52)
    return null;
  const end = new Date(plan.endDate);
  const start = new Date(plan.startDate);
  const today = new Date(now);
  [end, start, today].forEach((date) => date.setUTCHours(0, 0, 0, 0));
  if (
    ![end, start, today].every((date) => Number.isFinite(date.getTime())) ||
    end < start
  )
    return null;
  const endDate = new Date(
    Math.max(end.getTime(), today.getTime() - 86400000) + weeks * 7 * 86400000,
  );
  return {
    endDate,
    durationWeeks: Math.ceil(((endDate - start) / 86400000 + 1) / 7),
  };
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
