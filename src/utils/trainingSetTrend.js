const toNumber = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isNaN(parsed) ? null : parsed;
};

const compareValues = (latest, earlier) => {
  const latestValue = toNumber(latest);
  const earlierValue = toNumber(earlier);
  if (latestValue == null || earlierValue == null) return null;
  if (latestValue > earlierValue) return 1;
  if (latestValue < earlierValue) return -1;
  return 0;
};

export function getTrainingSetTrend({
  latestWeight,
  earlierWeight,
  latestReps,
  earlierReps,
}) {
  const comparisons = [
    compareValues(latestWeight, earlierWeight),
    compareValues(latestReps, earlierReps),
  ].filter((value) => value !== null);

  if (!comparisons.length) return null;
  if (comparisons.every((value) => value === 0)) return "same";

  const hasIncrease = comparisons.some((value) => value > 0);
  const hasDecrease = comparisons.some((value) => value < 0);

  if (hasIncrease && hasDecrease) return "mixed";
  if (hasIncrease) return "up";
  if (hasDecrease) return "down";
  return "same";
}

export function getTrainingSetTrendLabel(trend) {
  if (trend === "up") return "Aumentó peso o repeticiones frente a la sesión anterior";
  if (trend === "down") return "Redujo peso o repeticiones frente a la sesión anterior";
  if (trend === "mixed") return "Aumentó una métrica y redujo la otra";
  if (trend === "same") return "Mantuvo peso y repeticiones";
  return "";
}
