import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import FoodMacroLookup from "./FoodMacroLookup";
import NutritionPlanEditor from "./NutritionPlanEditor";
import FoodEditorDialog from "./FoodEditorDialog";
import { scaleFoodPortion, scaleFoodQuantity } from "./foodQuantity";
const { mockSearch, mockPortions } = vi.hoisted(() => ({
  mockSearch: vi.fn(),
  mockPortions: vi.fn(),
}));
vi.mock("../../services/api", () => ({
  api: { searchFoodNutrition: mockSearch, getFoodPortions: mockPortions },
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
  mockPortions.mockResolvedValue({ portions: [] });
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

const eggPortion = { id: "large", label: "huevo grande", gramWeight: 50 };
const egg = { ...result, name: "Huevo", description: "Egg, whole, raw, fresh" };

it("lets the coach enter five eggs by count and preserves the measure when reopening", async () => {
  mockPortions.mockResolvedValue({ portions: [eggPortion] });
  const confirm = vi.fn();
  const { unmount } = render(
    <FoodEditorDialog
      mealName="Desayuno"
      initialFood={egg}
      recentFoods={[]}
      onConfirm={confirm}
      onClose={vi.fn()}
    />,
  );
  const measure = await screen.findByRole("option", { name: /huevo grande/ });
  fireEvent.change(screen.getByLabelText("Medida del alimento"), {
    target: { value: measure.value },
  });
  fireEvent.change(screen.getByLabelText("Cantidad"), {
    target: { value: "5" },
  });
  expect(screen.getByLabelText("Cantidad")).toHaveValue(5);
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
  const food = confirm.mock.calls[0][0];
  expect(food).toMatchObject({
    quantity: "5 × huevo grande",
    calories: 300,
    protein: 56.25,
    nutritionSource: {
      grams: 250,
      portion: { amount: 5, label: "huevo grande", gramWeight: 50 },
    },
  });
  unmount();
  render(
    <FoodEditorDialog
      mealName="Desayuno"
      initialFood={food}
      recentFoods={[]}
      onConfirm={confirm}
      onClose={vi.fn()}
    />,
  );
  expect(screen.getByLabelText("Cantidad")).toHaveValue(5);
  fireEvent.change(screen.getByLabelText("Cantidad"), {
    target: { value: "2" },
  });
  expect(screen.getByLabelText("Proteínas")).toHaveValue(22.5);
  fireEvent.change(screen.getByLabelText("Medida del alimento"), {
    target: { value: "weight" },
  });
  expect(screen.getByLabelText("Cantidad")).toHaveValue("100 g");
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
  expect(confirm.mock.calls[1][0].nutritionSource.portion).toBeUndefined();
});

it("accepts five eggs in the search and carries the count into the selected food", async () => {
  mockSearch.mockResolvedValue({ foods: [egg] });
  mockPortions.mockResolvedValue({ portions: [eggPortion] });
  const confirm = vi.fn();
  render(
    <FoodEditorDialog
      mealName="Desayuno"
      recentFoods={[]}
      onConfirm={confirm}
      onClose={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText("Buscar macros · Desayuno"), {
    target: { value: "5 huevos" },
  });
  fireEvent.click(await screen.findByRole("button", { name: /Huevo/ }));
  await waitFor(() => expect(screen.getByLabelText("Cantidad")).toHaveValue(5));
  expect(mockSearch).toHaveBeenCalledWith(
    "100 g de huevos",
    expect.any(Object),
  );
  fireEvent.change(screen.getByLabelText("Cantidad"), {
    target: { value: "0" },
  });
  expect(
    screen.getByRole("button", { name: "Agregar a Desayuno" }),
  ).toBeDisabled();
  expect(confirm).not.toHaveBeenCalled();
});

it("does not invent unit weights if the provider has no portions or fails", async () => {
  mockPortions.mockRejectedValue(new Error("Catálogo no disponible"));
  render(
    <FoodEditorDialog
      mealName="Desayuno"
      initialFood={egg}
      recentFoods={[]}
      onConfirm={vi.fn()}
      onClose={vi.fn()}
    />,
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Catálogo no disponible",
  );
  expect(screen.getByLabelText("Cantidad")).toHaveValue("200 g");
  mockPortions.mockResolvedValue({ portions: [] });
  fireEvent.click(screen.getByRole("button", { name: "Reintentar medidas" }));
  expect(await screen.findByText(/no tiene medidas por unidad/)).toBeVisible();
});

it("recalculates fractional servings and rejects out-of-range total weights", () => {
  expect(scaleFoodPortion(result, "2,5", eggPortion)).toMatchObject({
    calories: 150,
    nutritionSource: { grams: 125, portion: { amount: 2.5 } },
  });
  for (const count of ["", "0", "-1", "101", "Infinity"]) {
    expect(scaleFoodPortion(result, count, eggPortion)).toMatchObject({
      calories: "",
      nutritionSource: { grams: null },
    });
  }
});

it("does not silently replace a requested egg count with the reference weight", async () => {
  mockSearch.mockResolvedValue({ foods: [egg] });
  mockPortions.mockResolvedValue({ portions: [] });
  render(
    <FoodEditorDialog
      mealName="Desayuno"
      recentFoods={[]}
      onConfirm={vi.fn()}
      onClose={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText("Buscar macros · Desayuno"), {
    target: { value: "5 huevos" },
  });
  fireEvent.click(await screen.findByRole("button", { name: /Huevo/ }));
  await screen.findByText(/no tiene medidas por unidad/);
  expect(
    screen.getByRole("button", { name: "Agregar a Desayuno" }),
  ).toBeDisabled();
  fireEvent.click(
    screen.getByRole("button", { name: "Introducir peso en su lugar" }),
  );
  expect(
    screen.getByRole("button", { name: "Agregar a Desayuno" }),
  ).toBeEnabled();
});
