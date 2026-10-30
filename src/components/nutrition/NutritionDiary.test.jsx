import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, expect, it, vi } from "vitest";
import NutritionDiary from "./NutritionDiary";
import NutritionPlanEditor from "./NutritionPlanEditor";
import { nutritionDate, nutritionSummary } from "./nutritionUtils";
const mocks = vi.hoisted(() => ({ day: vi.fn(), complete: vi.fn() }));
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "athlete", role: "Cliente" } }),
}));
vi.mock("../../services/api", () => ({
  api: { getNutritionDay: mocks.day, completeNutritionMeal: mocks.complete },
}));
const mealId = "95d624ba-78cb-4366-8ab7-7c75131ce573";
const plan = {
  _id: "plan-1",
  content: {
    name: "Plan del coach",
    meals: [
      {
        mealId,
        name: "Desayuno",
        time: "08:00",
        foods: [
          {
            name: "Preparación del coach",
            quantity: "1 porción",
            calories: 300,
            protein: 20,
            carbs: 40,
            fat: 6,
          },
        ],
      },
    ],
  },
};
const data = (completed = []) => ({
  plan,
  day: { completedMealIds: completed },
  dateKey: nutritionDate(),
  today: nutritionDate(),
  canComplete: true,
});
const wrap = (component) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      {component}
    </QueryClientProvider>,
  );
beforeEach(() => {
  vi.clearAllMocks();
  mocks.day.mockResolvedValue(data());
  mocks.complete.mockResolvedValue(data([mealId]));
});
it("expands a whole meal and records it with a single check", async () => {
  wrap(<NutritionDiary />);
  fireEvent.click(
    await screen.findByRole("button", { name: "Ver alimentos de Desayuno" }),
  );
  expect(screen.getByText("Preparación del coach")).toBeVisible();
  expect(screen.getByText("1 porción")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Completar Desayuno" }));
  expect(
    await screen.findByRole("button", { name: "Desmarcar Desayuno" }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(mocks.complete).toHaveBeenCalledWith(
    expect.objectContaining({
      planId: "plan-1",
      mealId,
      completed: true,
      dateKey: nutritionDate(),
    }),
  );
  expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
});
it("does not change completion if saving fails", async () => {
  mocks.complete.mockRejectedValue(new Error("Sin conexión"));
  wrap(<NutritionDiary />);
  fireEvent.click(
    await screen.findByRole("button", { name: "Completar Desayuno" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "No se guardó el cambio",
  );
  expect(
    screen.getByRole("button", { name: "Completar Desayuno" }),
  ).toHaveAttribute("aria-pressed", "false");
});
it("disables completion for previewed future dates", async () => {
  mocks.day.mockResolvedValue({ ...data(), canComplete: false });
  wrap(<NutritionDiary />);
  expect(
    await screen.findByRole("button", { name: "Completar Desayuno" }),
  ).toBeDisabled();
});
it("provides the dashboard a compact plan entry", async () => {
  const onOpen = vi.fn();
  wrap(<NutritionDiary compact onOpen={onOpen} />);
  await screen.findByRole("button", { name: "Completar Desayuno" });
  fireEvent.click(screen.getByRole("button", { name: /Ver plan/ }));
  expect(onOpen).toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: "Día anterior" })).toBeNull();
});
it("shows the coach the athlete's meal records without fetching or changing their own diary", async () => {
  wrap(<NutritionDiary readOnly dayData={data([mealId])} />);
  expect(
    screen.getByRole("img", { name: "Desayuno", exact: true }),
  ).toHaveAttribute("src", "/images/nutrition/breakfast.webp");
  expect(
    screen.getByRole("img", { name: "Completada: Desayuno" }),
  ).toBeVisible();
  expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
  expect(
    screen.queryByRole("button", { name: /Completar|Desmarcar/ }),
  ).toBeNull();
  expect(screen.queryByRole("button", { name: "Día anterior" })).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Ver alimentos de Desayuno" }),
  );
  expect(screen.getByText("1 porción")).toBeVisible();
  expect(mocks.day).not.toHaveBeenCalled();
  expect(mocks.complete).not.toHaveBeenCalled();
});
it("lets the athlete expand and complete lunch directly on the compact dashboard", async () => {
  const lunch = {
    ...plan,
    content: {
      ...plan.content,
      meals: [{ ...plan.content.meals[0], name: "Almuerzo" }],
    },
  };
  mocks.day.mockResolvedValue({ ...data(), plan: lunch });
  mocks.complete.mockResolvedValue({ ...data([mealId]), plan: lunch });
  wrap(<NutritionDiary compact onOpen={vi.fn()} />);
  fireEvent.click(
    await screen.findByRole("button", { name: "Ver alimentos de Almuerzo" }),
  );
  expect(screen.getByText("Preparación del coach")).toBeVisible();
  expect(screen.getByText("1 porción")).toBeVisible();
  expect(screen.queryByText("ENERGÍA DE TU PLAN")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Completar Almuerzo" }));
  expect(
    await screen.findByRole("button", { name: "Desmarcar Almuerzo" }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
});
it("treats missing nutritional data as unknown instead of zero", () => {
  const summary = nutritionSummary(
    [
      {
        mealId,
        foods: [
          { calories: 300, protein: 20 },
          { calories: null, protein: 10 },
        ],
      },
    ],
    [mealId],
  );
  expect(summary[0].planned).toBeNull();
  expect(summary[0].completed).toBeNull();
  expect(summary[1].planned).toBe(30);
});
it("creates meals with quantities and optional macros without inventing values", () => {
  const onSave = vi.fn();
  render(
    <NutritionPlanEditor
      initialPlan={plan}
      onSave={onSave}
      onCancel={vi.fn()}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", {
      name: "Editar Preparación del coach de Desayuno",
    }),
  );
  fireEvent.change(screen.getByLabelText("Cantidad"), {
    target: { value: "2 porciones" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
  expect(onSave).not.toHaveBeenCalled();
  fireEvent.submit(
    screen.getByRole("form", { name: "Editor de alimentación" }),
  );
  expect(onSave).toHaveBeenCalledWith(
    expect.objectContaining({
      meals: [
        expect.objectContaining({
          foods: [
            expect.objectContaining({ quantity: "2 porciones", calories: 300 }),
          ],
        }),
      ],
    }),
  );
});
it("can add and remove a complete meal without removing the last meal", () => {
  render(
    <NutritionPlanEditor
      initialPlan={plan}
      onSave={vi.fn()}
      onCancel={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Editar Desayuno" }));
  expect(
    screen.getByRole("button", { name: "Eliminar comida" }),
  ).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
  fireEvent.click(screen.getByRole("button", { name: /Agregar comida/ }));
  fireEvent.click(screen.getByRole("button", { name: "Editar Almuerzo" }));
  expect(screen.getByLabelText("Nombre de la comida")).toHaveValue("Almuerzo");
  fireEvent.click(screen.getByRole("button", { name: "Eliminar comida" }));
  expect(screen.queryByRole("region", { name: "Almuerzo" })).toBeNull();
});

it("blocks assigning empty meals and keeps cancelled food edits out of the plan", () => {
  const onSave = vi.fn();
  render(<NutritionPlanEditor onSave={onSave} onCancel={vi.fn()} />);
  fireEvent.submit(
    screen.getByRole("form", { name: "Editor de alimentación" }),
  );
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Agrega al menos un alimento a Desayuno",
  );
  expect(onSave).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("button", { name: "Agregar alimento a Desayuno" }),
  );
  fireEvent.click(screen.getByRole("button", { name: /Crear alimento/ }));
  fireEvent.change(screen.getByLabelText("Nombre del alimento"), {
    target: { value: "Borrador sin guardar" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
  expect(
    screen.queryByRole("button", { name: /Editar Borrador sin guardar/ }),
  ).toBeNull();
});
