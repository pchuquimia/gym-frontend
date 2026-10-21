import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getTrainings: vi.fn() }));
vi.mock("../../services/api", () => ({
  api: { getTrainings: mocks.getTrainings },
}));
vi.mock("../progress/AppChart", () => ({
  default: ({
    title,
    labels,
    series,
    height,
    hideValueAxisName,
    axisLabelFontSize,
  }) => (
    <div
      role="img"
      aria-label={title}
      data-labels={JSON.stringify(labels)}
      data-points={JSON.stringify(series[0].values)}
      data-height={height}
      data-axis-hidden={hideValueAxisName}
      data-axis-font-size={axisLabelFontSize}
    />
  ),
}));

import DashboardPlanTrend from "./DashboardPlanTrend";

const plan = {
  _id: "plan-1",
  name: "Mes 1 · Continuación",
  status: "active",
  startDate: "2025-09-01",
  endDate: "2025-09-30",
};

const training = (id, date, weightKg) => ({
  _id: id,
  date,
  trainingPlanId: "plan-1",
  progressScopeId: "plan-1",
  routineId: "routine-1",
  exercises: [
    {
      exerciseId: "press",
      exerciseName: "Press",
      muscleGroup: "Pecho",
      loadType: "external",
      weightBasis: "total",
      sets: [{ weightKg, reps: 10, done: true }],
    },
  ],
});

const renderTrend = (recentTrainings = [], renderPlanCard, variant) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const view = render(
    <QueryClientProvider client={client}>
      <DashboardPlanTrend
        ownerId="athlete-1"
        plan={plan}
        recentTrainings={recentTrainings}
        renderPlanCard={renderPlanCard}
        variant={variant}
      />
    </QueryClientProvider>,
  );
  return { client, ...view };
};

beforeEach(() => mocks.getTrainings.mockReset());

it("muestra la evolución compacta solo con las sesiones de la planificación", async () => {
  mocks.getTrainings.mockResolvedValue({
    items: [training("1", "2025-09-03", 50), training("2", "2025-09-10", 55)],
    hasMore: false,
  });
  renderTrend([], (summary) => (
    <div data-testid="plan-summary">
      {summary?.points} pts · {summary?.change} desde 1.ª sesión
    </div>
  ));

  const chart = await screen.findByRole("img", {
    name: "Rendimiento de Mes 1 · Continuación",
  });
  expect(JSON.parse(chart.dataset.points)).toEqual([100, 110]);
  expect(chart.dataset.height).toBe("160");
  expect(chart.dataset.axisHidden).toBe("true");
  expect(chart.dataset.axisFontSize).toBe("10");
  expect(screen.getAllByText("Puntos")).toHaveLength(1);
  expect(mocks.getTrainings).toHaveBeenCalledWith(
    expect.objectContaining({
      athleteId: "athlete-1",
      includeTrainingPlanId: "plan-1",
    }),
  );
  expect(screen.getByTestId("plan-summary")).toHaveTextContent(
    "110 pts · +10% desde 1.ª sesión",
  );
});

it("integra la línea compacta y el porcentaje real sin mezclar sesiones de otros planes", async () => {
  mocks.getTrainings.mockResolvedValue({
    items: [
      training("1", "2025-09-03", 50),
      training("2", "2025-09-10", 55),
      {
        ...training("other", "2025-09-11", 100),
        trainingPlanId: "other",
        progressScopeId: "other",
      },
    ],
    hasMore: false,
  });
  renderTrend(
    [],
    (summary, chart) => (
      <section aria-label="Tu planificación">
        <span>{summary?.change}</span>
        {chart}
      </section>
    ),
    "sparkline",
  );
  const chart = await screen.findByRole("img", {
    name: "Rendimiento de Mes 1 · Continuación",
  });
  expect(chart.tagName.toLowerCase()).toBe("svg");
  expect(screen.getByText("+10%")).toBeVisible();
  expect(screen.getByText("Frente al inicio de cada ejercicio")).toBeVisible();
});

it("explica la falta de comparaciones sin inventar una línea o un porcentaje", async () => {
  mocks.getTrainings.mockResolvedValue({
    items: [training("1", "2025-09-03", 50)],
    hasMore: false,
  });
  renderTrend(
    [],
    (summary, chart) => (
      <section aria-label="Tu planificación">
        <span>{summary?.change}</span>
        {chart}
      </section>
    ),
    "sparkline",
  );
  expect(
    await screen.findByText(
      "La evolución aparecerá al repetir ejercicios comparables.",
    ),
  ).toBeVisible();
  expect(screen.queryByRole("img")).toBeNull();
});

it("permite reintentar si falla la carga del plan", async () => {
  mocks.getTrainings.mockRejectedValue(new Error("Sin conexión"));
  renderTrend(
    [],
    (summary, chart) => (
      <section>
        {summary?.change}
        {chart}
      </section>
    ),
    "sparkline",
  );
  const retry = await screen.findByRole(
    "button",
    { name: "Reintentar" },
    { timeout: 3000 },
  );
  expect(screen.queryByRole("img")).toBeNull();
  mocks.getTrainings.mockResolvedValue({
    items: [training("1", "2025-09-03", 50), training("2", "2025-09-10", 45)],
    hasMore: false,
  });
  fireEvent.click(retry);
  expect(await screen.findByText("-10%")).toBeVisible();
  expect(
    screen.getByRole("img", { name: "Rendimiento de Mes 1 · Continuación" }),
  ).toBeVisible();
});

it("dibuja la gráfica con las sesiones disponibles antes de terminar la consulta", async () => {
  let complete;
  mocks.getTrainings.mockReturnValue(
    new Promise((resolve) => {
      complete = resolve;
    }),
  );
  const { client } = renderTrend([
    training("1", "2025-09-03", 50),
    training("2", "2025-09-10", 55),
  ]);

  const chart = screen.getByRole("img", {
    name: "Rendimiento de Mes 1 · Continuación",
  });
  expect(JSON.parse(chart.dataset.points)).toEqual([100, 110]);
  complete({ items: [], hasMore: false });
  await vi.waitFor(() =>
    expect(
      client.getQueryState(["dashboard-plan-trend", "athlete-1", "plan-1"])
        ?.status,
    ).toBe("success"),
  );
});

it("no ocupa espacio cuando el plan aún no tiene resultados comparables", async () => {
  mocks.getTrainings.mockResolvedValue({
    items: [training("1", "2025-09-03", 50)],
    hasMore: false,
  });
  const { client } = renderTrend();

  await vi.waitFor(() =>
    expect(
      client.getQueryState(["dashboard-plan-trend", "athlete-1", "plan-1"])
        ?.status,
    ).toBe("success"),
  );
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  expect(screen.queryByText("Rendimiento")).not.toBeInTheDocument();
});
