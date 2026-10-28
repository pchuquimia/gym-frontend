export const foodEmoji = (name = "") => {
  const text = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const options = [
    [/pollo|pechuga|pavo|chicken|turkey/, "🍗"],
    [/huevo|clara|egg/, "🥚"],
    [/arroz|rice|quinua|quinoa/, "🍚"],
    [/avena|oat|cereal/, "🥣"],
    [/leche|milk/, "🥛"],
    [/yogur|yogurt/, "🥛"],
    [/pan|bread|tostada/, "🍞"],
    [/platano|banana/, "🍌"],
    [/manzana|apple/, "🍎"],
    [/aguacate|palta|avocado/, "🥑"],
    [/pescado|salmon|atun|fish|tuna/, "🐟"],
    [/carne|beef|cerdo|pork/, "🥩"],
    [/papa|patata|potato/, "🥔"],
    [/brocoli|broccoli/, "🥦"],
    [/ensalada|verdura|salad|vegetable/, "🥗"],
    [/frijol|lenteja|bean|lentil/, "🫘"],
    [/almendra|nuez|mani|nut|almond/, "🥜"],
    [/aceite|oil/, "🫒"],
    [/queso|cheese/, "🧀"],
    [/pasta|fideo/, "🍝"],
  ];
  return options.find(([pattern]) => pattern.test(text))?.[1] || "🍽️";
};

export const displayNutrient = (value) =>
  value === "" || value == null || !Number.isFinite(Number(value))
    ? "—"
    : new Intl.NumberFormat("es", { maximumFractionDigits: 1 }).format(
        Number(value),
      );

export const blankNutritionFood = () => ({
  name: "",
  quantity: "",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
});
