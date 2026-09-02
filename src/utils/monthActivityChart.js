const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const getMonthActivityBarPercent = ({
  sets = 0,
  maxSets = 0,
  activeDays = 0,
} = {}) => {
  const completedSets = Math.max(0, Number(sets) || 0);
  const scaleMaximum = Math.max(1, Number(maxSets) || 0);
  if (!completedSets) return 0;

  // Leave deliberate headroom so the tallest value never fills the plot.
  // A new month with a single active day needs an even calmer visual scale.
  const peakPercent = activeDays <= 1 ? 54 : 72;
  return clamp((completedSets / scaleMaximum) * peakPercent, 8, peakPercent);
};
