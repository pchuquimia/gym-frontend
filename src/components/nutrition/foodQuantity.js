const keys = ["calories", "protein", "carbs", "fat"];
export const scaleFoodQuantity = (food, quantity) => {
  if (!food.nutritionSource) return { quantity };
  const { portion: _portion, ...source } = food.nutritionSource;
  const match = String(quantity)
    .trim()
    .match(/^(\d+(?:[.,]\d+)?)\s*(kilogramos?|kilos?|kg|gramos?|grs?|g)$/i);
  const parsedGrams = match
    ? Number(match[1].replace(",", ".")) *
      (/^(kg|kilo)/i.test(match[2]) ? 1000 : 1)
    : NaN;
  const grams = Math.round(parsedGrams * 1000) / 1000;
  if (!Number.isFinite(grams) || grams < 0.1 || grams > 5000) {
    return {
      quantity,
      nutritionSource: { ...source, grams: null },
      ...Object.fromEntries(keys.map((key) => [key, ""])),
    };
  }
  return {
    quantity,
    nutritionSource: { ...source, grams },
    ...Object.fromEntries(
      keys.map((key) => [
        key,
        Math.round(food.nutritionSource.per100g[key] * grams) / 100,
      ]),
    ),
  };
};
export const scaleFoodPortion = (food, input, portion) => {
  const amount = Number(String(input).replace(",", "."));
  const grams = Math.round(amount * portion.gramWeight * 1000) / 1000;
  const valid =
    Number.isFinite(amount) &&
    amount >= 0.001 &&
    amount <= 50000 &&
    Number.isFinite(grams) &&
    grams >= 0.1 &&
    grams <= 5000;
  return {
    quantity: `${Number.isFinite(amount) ? amount : input} × ${portion.label}`,
    nutritionSource: {
      ...food.nutritionSource,
      grams: valid ? grams : null,
      portion: {
        amount: valid ? amount : null,
        label: portion.label,
        gramWeight: portion.gramWeight,
      },
    },
    ...Object.fromEntries(
      keys.map((key) => [
        key,
        valid
          ? Math.round(food.nutritionSource.per100g[key] * grams) / 100
          : "",
      ]),
    ),
  };
};
export const clearFoodSource = () => ({
  nutritionSource: null,
  ...Object.fromEntries(keys.map((key) => [key, ""])),
});
