export const parseLocalCalendarDate = (value) => {
  if (!value) return null;
  const normalized =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
      ? `${value.trim()}T00:00:00`
      : value;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};
