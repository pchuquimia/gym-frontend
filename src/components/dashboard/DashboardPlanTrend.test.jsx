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
import { dateLabel } from "../../utils/progressDashboard";

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
      training("middle", "2025-09-04", 52.5),
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
  expect(screen.getAllByText("+10%")).toHaveLength(2);
  expect(screen.getByText("Evolución de marcas")).toBeVisible();
  expect(screen.getByText("0% · inicio")).toBeVisible();
  expect(screen.getByText(dateLabel("2025-09-03"))).toBeVisible();
  expect(screen.getByText(dateLabel("2025-09-10"))).toBeVisible();
  const coordinates = chart
    .querySelector('path[fill="none"]')
    .getAttribute("d")
    .match(/[ML]([^ ]+)/g)
    .map((point) => point.slice(1).split(",").map(Number));
  // One day and seven days after the first record occupy proportional widths.
  expect(coordinates[1][0] - coordinates[0][0]).toBeCloseTo(
    (coordinates[2][0] - coordinates[0][0]) / 7,
  );
  expect(chart.querySelector(".daily-plan-overview__zero")).toHaveAttribute(
    "y1",
    "104",
  );
  const method = screen.getByText("Cómo se calcula").closest("details");
  expect(method).not.toHaveAttribute("open");
  expect(method).toHaveTextContent("misma configuración");
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
  expect(await screen.findAllByText("-10%")).toHaveLength(2);
  expect(
    screen.getByRole("img", { name: "Rendimiento de Mes 1 · Continuación" }),
  ).toBeVisible();
  const chart = screen.getByRole("img", {
    name: "Rendimiento de Mes 1 · Continuación",
  });
  expect(chart).toHaveClass("is-negative");
  expect(chart.querySelector(".daily-plan-overview__zero")).toHaveAttribute(
    "y1",
    "8",
  );
  expect(screen.getByText("-5%")).toBeVisible();
});

it("mantiene una línea plana y una escala válida cuando las marcas no cambian", async () => {
  mocks.getTrainings.mockResolvedValue({
    items: [training("1", "2025-09-03", 50), training("2", "2025-09-10", 50)],
    hasMore: false,
  });
  renderTrend([], undefined, "sparkline");
  const chart = await screen.findByRole("img", {
    name: "Rendimiento de Mes 1 · Continuación",
  });
  expect(chart.querySelector('path[fill="none"]')).toHaveAttribute(
    "d",
    "M6,104 L474,104",
  );
  expect(screen.getByText("0%")).toBeVisible();
  expect(chart).not.toHaveClass("is-negative");
});

it("muestra un punto centrado si las comparaciones corresponden a un solo día", async () => {
  mocks.getTrainings.mockResolvedValue({
    items: [training("1", "2025-09-03", 50), training("2", "2025-09-03", 55)],
    hasMore: false,
  });
  renderTrend([], undefined, "sparkline");
  const chart = await screen.findByRole("img", {
    name: "Rendimiento de Mes 1 · Continuación",
  });
  expect(chart.querySelector('path[fill="none"]')).toHaveAttribute(
    "d",
    "M240,8",
  );
  expect(screen.getAllByText(dateLabel("2025-09-03"))).toHaveLength(1);
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
