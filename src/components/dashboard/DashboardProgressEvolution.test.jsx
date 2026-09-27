import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import DashboardProgressEvolution from "./DashboardProgressEvolution";

vi.mock("../../hooks/useProgressData", () => ({
  fetchProgressTrainings: vi.fn(async () =>
    [14, 7].map((days, index) => {
      const date = new Date();
      date.setDate(date.getDate() - days);
      return {
        _id: String(index),
        date: date.toISOString(),
        progressScopeId: "cycle",
        routineId: "push",
        exercises: [
          {
            exerciseId: "press",
            loadType: "external",
            weightBasis: "total",
            sets: [{ weightKg: 50 + index * 5, reps: 10, done: true }],
          },
        ],
      };
    }),
  ),
}));
vi.mock("../../services/api", () => ({
  api: { getTrainingPlans: vi.fn(async () => []) },
}));
vi.mock("../progress/AppChart", () => ({
  default: ({ sparkline, height, loading }) => (
    <div
      data-testid={sparkline ? "preview-chart" : "detail-chart"}
      data-height={height}
      data-loading={loading}
    />
  ),
}));

afterEach(() => {
  document.body.style.overflow = "";
  delete HTMLDialogElement.prototype.showModal;
  delete HTMLDialogElement.prototype.close;
});

it("resume el rendimiento en la gráfica compacta y abre el detalle con período, regreso y foco", async () => {
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: {
      configurable: true,
      value: function () {
        this.setAttribute("open", "");
      },
    },
    close: {
      configurable: true,
      value: function () {
        this.removeAttribute("open");
      },
    },
  });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <DashboardProgressEvolution ownerId="athlete" />
    </QueryClientProvider>,
  );
  await waitFor(() =>
    expect(screen.getByTestId("preview-chart")).toHaveAttribute(
      "data-loading",
      "false",
    ),
  );
  expect(screen.getByTestId("preview-chart")).toHaveAttribute(
    "data-height",
    "32",
  );
  expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  expect(screen.getByText("Rendimiento")).toBeVisible();
  expect(screen.getByText("En tus ejercicios")).toBeVisible();
  expect(screen.getByText("Mejorando · +10%")).toBeVisible();
  expect(
    screen.queryByRole("heading", { name: "Tu progreso en el tiempo" }),
  ).not.toBeInTheDocument();

  const user = userEvent.setup();
  const preview = screen.getByRole("button", {
    name: "Ver detalle de tu progreso en el tiempo",
  });
  await user.click(preview);
  expect(
    screen.getByRole("dialog", { name: "Tu progreso en el tiempo" }),
  ).toBeVisible();
  expect(screen.getByTestId("detail-chart")).toHaveAttribute(
    "data-height",
    "280",
  );
  await user.selectOptions(
    screen.getByRole("combobox", { name: "Período" }),
    "3M",
  );
  expect(screen.getByRole("combobox")).toHaveValue("3M");
  await user.click(screen.getByRole("button", { name: "Volver al dashboard" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByText("Mejorando · +10%")).toBeVisible();
  expect(preview).toHaveFocus();
  expect(document.body.style.overflow).toBe("");
  client.clear();
});
