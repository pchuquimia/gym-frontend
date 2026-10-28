import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import FoodMacroLookup from "./FoodMacroLookup";
import NutritionPlanEditor from "./NutritionPlanEditor";
import { scaleFoodQuantity } from "./foodQuantity";
const mockSearch = vi.hoisted(() => vi.fn());
vi.mock("../../services/api", () => ({
  api: { searchFoodNutrition: mockSearch },
}));
const source = {
  provider: "usda",
  foodId: "1234",
  description: "Chicken breast, raw",
  grams: 200,
  per100g: { calories: 120, protein: 22.5, carbs: 0, fat: 2.5 },
};
const result = {
  name: "Pechuga de pollo · Crudo",
  foodId: "1234",
  description: "Chicken breast, raw",
  quantity: "200 g",
  calories: 240,
  protein: 45,
  carbs: 0,
  fat: 5,
  nutritionSource: source,
};
beforeEach(() => {
  vi.clearAllMocks();
  mockSearch.mockResolvedValue({ foods: [result] });
});
it("automatically searches the typed quantity and applies the selected preparation", async () => {
  const apply = vi.fn();
  render(<FoodMacroLookup label="comida 1" onApply={apply} />);
  fireEvent.change(screen.getByLabelText("Buscar macros · comida 1"), {
    target: { value: "200g de pechuga de pollo" },
  });
  const option = await screen.findByRole("button", {
    name: /Pechuga de pollo/,
  });
  expect(mockSearch).toHaveBeenCalledWith(
    "200g de pechuga de pollo",
    expect.any(Object),
  );
  expect(apply).not.toHaveBeenCalled();
  fireEvent.click(option);
  expect(apply).toHaveBeenCalledWith(
    expect.objectContaining({
      quantity: "200 g",
      calories: 240,
      protein: 45,
      nutritionSource: source,
    }),
  );
});
it("recalculates from the original per-100g data without compounding rounding", () => {
  const food = { ...result, nutritionSource: source };
  const changed = scaleFoodQuantity(food, "150g");
  expect(changed).toMatchObject({ calories: 180, protein: 33.75, fat: 3.75 });
  expect(scaleFoodQuantity({ ...food, ...changed }, "0,2 kg")).toMatchObject({
    calories: 240,
    protein: 45,
  });
});
it("keeps the base while typing a new quantity and clears stale macros", () => {
  const temporary = scaleFoodQuantity(result, "");
  expect(temporary.calories).toBe("");
  expect(temporary.nutritionSource.grams).toBeNull();
  expect(scaleFoodQuantity({ ...result, ...temporary }, "150 g").protein).toBe(
    33.75,
  );
});
it("does not fabricate values when lookup fails", async () => {
  mockSearch.mockRejectedValue(new Error("Catálogo no disponible"));
  const apply = vi.fn();
  render(<FoodMacroLookup label="comida 1" onApply={apply} />);
  fireEvent.change(screen.getByLabelText("Buscar macros · comida 1"), {
    target: { value: "200g de pollo" },
  });
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Catálogo no disponible",
  );
  expect(apply).not.toHaveBeenCalled();
});
it("updates the actual editor food and recalculates after changing grams", async () => {
  const onSave = vi.fn();
  const meal = {
    mealId: "meal-1",
    name: "Desayuno",
    foods: [
      { name: "", quantity: "", calories: "", protein: "", carbs: "", fat: "" },
    ],
  };
  render(
    <NutritionPlanEditor
      initialPlan={{ content: { name: "Dieta", meals: [meal] } }}
      onSave={onSave}
      onCancel={vi.fn()}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Agregar alimento a Desayuno" }),
  );
  fireEvent.change(screen.getByLabelText("Buscar macros · Desayuno"), {
    target: { value: "200g de pechuga de pollo" },
  });
  fireEvent.click(
    await screen.findByRole("button", { name: /Pechuga de pollo/ }),
  );
  expect(screen.getByLabelText("Cantidad")).toHaveValue("200 g");
  fireEvent.change(screen.getByLabelText("Cantidad"), {
    target: { value: "150 g" },
  });
  expect(screen.getByLabelText("Proteínas")).toHaveValue(33.75);
  fireEvent.click(screen.getByRole("button", { name: "Agregar a Desayuno" }));
  expect(onSave).not.toHaveBeenCalled();
  fireEvent.submit(
    screen.getByRole("form", { name: "Editor de alimentación" }),
  );
  await waitFor(() =>
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        meals: [
          expect.objectContaining({
            foods: [
              expect.objectContaining({
                quantity: "150 g",
                calories: 180,
                protein: 33.75,
                nutritionSource: expect.objectContaining({ grams: 150 }),
              }),
            ],
          }),
        ],
      }),
    ),
  );
});

it("accepts a plain food search and uses 100 g as the initial catalog quantity", async () => {
  render(<FoodMacroLookup label="Desayuno" onApply={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Buscar macros · Desayuno"), {
    target: { value: "pechuga de pollo" },
  });
  await screen.findByRole("button", { name: /Pechuga de pollo/ });
  expect(mockSearch).toHaveBeenCalledWith(
    "100 g de pechuga de pollo",
    expect.any(Object),
  );
});
