import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchProgressTrainings: vi.fn(),
  getTrainingPlans: vi.fn(),
}));

vi.mock("../../hooks/useProgressData", () => ({
  fetchProgressTrainings: mocks.fetchProgressTrainings,
}));
vi.mock("../../services/api", () => ({
  api: { getTrainingPlans: mocks.getTrainingPlans },
}));
vi.mock("./AppChart", () => ({
  default: ({ title, series, labels }) => (
    <div role="img" aria-label={title} data-points={JSON.stringify(series[0].values)} data-series={JSON.stringify(series)} data-labels={JSON.stringify(labels)} />
  ),
}));

import PlanProgressFocus from "./PlanProgressFocus";

const workout = (id, date, muscleGroup, weightKg) => ({
  _id: id,
  date,
  trainingPlanId: "plan-1",
  routineId: "routine-1",
  progressScopeId: "plan-1",
  exercises: [{
    exerciseId: muscleGroup === "Pecho" ? "press" : "row",
    exerciseName: muscleGroup === "Pecho" ? "Press" : "Remo",
    muscleGroup,
    loadType: "external",
    weightBasis: "total",
    sets: [{ weightKg, reps: 10, done: true }],
  }],
});

beforeEach(() => {
  mocks.getTrainingPlans.mockReset().mockResolvedValue([{
    _id: "plan-1",
    name: "Mes 1 · Continuación",
    status: "active",
    startDate: "2025-09-01",
    endDate: "2025-09-30",
  }]);
  mocks.fetchProgressTrainings.mockReset().mockResolvedValue([
    workout("1", "2025-09-03", "Pecho", 50),
    workout("2", "2025-09-10", "Pecho", 55),
    workout("3", "2025-09-12", "Espalda", 40),
    { ...workout("4", "2025-09-15", "Pecho", 90), trainingPlanId: "other-plan" },
  ]);
});

it("muestra solo la gráfica del plan y permite enfocar un grupo muscular", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onBack = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <PlanProgressFocus owner="athlete-1" planId="plan-1" onNavigate={vi.fn()} onBack={onBack} />
    </QueryClientProvider>,
  );

  expect(await screen.findByRole("img", { name: "Rendimiento de Mes 1 · Continuación" })).toBeVisible();
  expect(screen.getAllByRole("img")).toHaveLength(1);
  expect(screen.queryByText("Entrenamientos por semana")).not.toBeInTheDocument();
  const chart = screen.getByRole("img", { name: "Rendimiento de Mes 1 · Continuación" });
  expect(JSON.parse(chart.dataset.points)).toHaveLength(3);

  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Grupo muscular" }), "Pecho");
  expect(JSON.parse(chart.dataset.points)).toHaveLength(2);
  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Grupo muscular" }), "Espalda");
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  expect(screen.getByText("Ya tienes un punto de partida.")).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "Volver" }));
  expect(onBack).toHaveBeenCalledWith("dashboard");
});

it("compara un segundo plan en la misma gráfica y permite retirarlo", async () => {
  mocks.getTrainingPlans.mockResolvedValue([
    {
      _id: "plan-1", name: "Mes 1 · Continuación", status: "active",
      startDate: "2025-09-01", endDate: "2025-09-30",
    },
    {
      _id: "plan-2", name: "Plan anterior", status: "completed",
      startDate: "2025-05-01", endDate: "2025-05-31",
    },
    {
      _id: "plan-3", name: "Sin seguimiento", status: "completed",
      startDate: "2025-04-01", endDate: "2025-04-30",
    },
  ]);
  mocks.fetchProgressTrainings.mockResolvedValue([
    workout("1", "2025-09-03", "Pecho", 50),
    workout("2", "2025-09-10", "Pecho", 55),
    workout("6", "2025-09-12", "Espalda", 40),
    workout("7", "2025-09-19", "Espalda", 44),
    { ...workout("3", "2025-05-03", "Pecho", 40), trainingPlanId: "plan-2", progressScopeId: "plan-2", routineId: "routine-2" },
    { ...workout("4", "2025-05-17", "Pecho", 44), trainingPlanId: "plan-2", progressScopeId: "plan-2", routineId: "routine-2" },
    { ...workout("8", "2025-05-21", "Espalda", 50), trainingPlanId: "plan-2", progressScopeId: "plan-2", routineId: "routine-2" },
    { ...workout("5", "2025-04-03", "Pecho", 30), trainingPlanId: "plan-3", progressScopeId: "plan-3", routineId: "routine-3" },
  ]);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <PlanProgressFocus owner="athlete-1" planId="plan-1" onNavigate={vi.fn()} />
    </QueryClientProvider>,
  );

  expect(await screen.findByRole("img", { name: "Rendimiento de Mes 1 · Continuación" })).toBeVisible();
  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Grupo muscular" }), "Pecho");
  await userEvent.click(screen.getByRole("button", { name: /Comparar con otra planificación/ }));
  const picker = screen.getByRole("combobox", { name: "Comparar con" });
  expect(screen.getByRole("option", { name: /Sin seguimiento · Sin registros comparables/ })).toBeDisabled();
  await userEvent.selectOptions(picker, "plan-2");

  const chart = screen.getByRole("img", { name: "Comparación de Mes 1 · Continuación y Plan anterior" });
  expect(screen.getAllByRole("img")).toHaveLength(1);
  expect(JSON.parse(chart.dataset.labels)).toEqual(["Semana 1", "Semana 2", "Semana 3"]);
  expect(JSON.parse(chart.dataset.series).map((series) => series.values)).toEqual([
    [100, 110, null],
    [100, null, 110],
  ]);

  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Grupo muscular" }), "Espalda");
  expect(screen.getByRole("img", { name: "Rendimiento de Mes 1 · Continuación" })).toBeVisible();
  expect(picker).toHaveValue("");
  expect(screen.getByRole("option", { name: /Plan anterior · Sin registros comparables/ })).toBeDisabled();
  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Grupo muscular" }), "Pecho");
  await userEvent.selectOptions(picker, "plan-2");
  await userEvent.click(screen.getByRole("button", { name: "Quitar comparación" }));
  expect(screen.getByRole("img", { name: "Rendimiento de Mes 1 · Continuación" })).toBeVisible();
});
