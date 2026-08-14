export const planStartsInFuture = (startDate, now = new Date()) => {
  if (!startDate) return false;
  const todayUtc = new Date(now);
  todayUtc.setUTCHours(0, 0, 0, 0);
  return new Date(startDate).getTime() > todayUtc.getTime();
};
