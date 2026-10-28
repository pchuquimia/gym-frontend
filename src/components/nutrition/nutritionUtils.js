export const nutritionTimezone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
export const nutritionDate = (date = new Date()) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};
export const shiftNutritionDate = (dateKey, delta) => {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() + delta);
  return nutritionDate(date);
};
export const NUTRIENTS = [
  { key: "calories", label: "Calorías", unit: "kcal", color: "#367c58" },
  { key: "protein", label: "Proteínas", unit: "g", color: "#7262a6" },
  { key: "carbs", label: "Carbohidratos", unit: "g", color: "#b17a38" },
  { key: "fat", label: "Grasas", unit: "g", color: "#4d88a4" },
];
export const nutrientTotal = (foods, key) =>
  foods.length &&
  foods.every(
    (food) =>
      food[key] !== null &&
      food[key] !== undefined &&
      food[key] !== "" &&
      Number.isFinite(Number(food[key])),
  )
    ? Math.round(foods.reduce((sum, food) => sum + Number(food[key]), 0) * 10) /
      10
    : null;
export const nutritionSummary = (meals = [], completed = []) => {
  const foods = meals.flatMap((meal) => meal.foods || []);
  const doneFoods = meals
    .filter((meal) => completed.includes(meal.mealId))
    .flatMap((meal) => meal.foods || []);
  return NUTRIENTS.map((nutrient) => ({
    ...nutrient,
    planned: nutrientTotal(foods, nutrient.key),
    completed: doneFoods.length ? nutrientTotal(doneFoods, nutrient.key) : 0,
  }));
};
