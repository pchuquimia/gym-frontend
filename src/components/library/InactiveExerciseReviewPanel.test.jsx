import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import InactiveExerciseReviewPanel from "./InactiveExerciseReviewPanel";
import { api } from "../../services/api";

vi.mock("../../services/api", () => ({
  api: {
    getInactiveExercises: vi.fn(),
    restoreInactiveExercise: vi.fn(),
    permanentlyDeleteInactiveExercise: vi.fn(),
  },
}));

const items = [
  { id: "face-pull", name: "Face Pull", muscle: "Hombros", source: "previous_catalog", reason: "previous_catalog", references: { total: 0 } },
  { id: "merged", name: "Face Pull duplicado", muscle: "Espalda", source: "hasaneyldrm", reason: "merged", mergedIntoExerciseId: "target", references: { total: 0 } },
  { id: "used", name: "Remo antiguo", muscle: "Espalda", source: "hasaneyldrm", reason: "review", references: { total: 2, routines: 1, trainings: 1 } },
];

const renderPanel = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <InactiveExerciseReviewPanel />
  </QueryClientProvider>,
);

describe("InactiveExerciseReviewPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getInactiveExercises.mockResolvedValue({ items });
    api.restoreInactiveExercise.mockResolvedValue({ ok: true });
    api.permanentlyDeleteInactiveExercise.mockResolvedValue({ ok: true });
  });

  it("muestra el motivo y bloquea el borrado de fichas con referencias", async () => {
    renderPanel();
    expect(await screen.findByText("Face Pull")).toBeVisible();
    expect(screen.getByText(/3 desactivados/)).toBeVisible();
    expect(screen.getByLabelText("Seleccionar Remo antiguo para eliminar")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Ya fusionado" })).toBeDisabled();
  });

  it("pide confirmación antes de borrar una ficha seleccionada", async () => {
    renderPanel();
    await screen.findByText("Face Pull");
    await userEvent.click(screen.getByLabelText("Seleccionar Face Pull para eliminar"));
    await userEvent.click(screen.getByRole("button", { name: "Eliminar seleccionados" }));
    expect(api.permanentlyDeleteInactiveExercise).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Eliminar definitivamente" }));
    await waitFor(() => expect(api.permanentlyDeleteInactiveExercise).toHaveBeenCalledWith("face-pull"));
  });

  it("permite devolver una ficha sin fusionar al catálogo", async () => {
    renderPanel();
    await screen.findByText("Face Pull");
    await userEvent.click(screen.getAllByRole("button", { name: "Conservar" })[0]);
    await waitFor(() => expect(api.restoreInactiveExercise).toHaveBeenCalledWith("face-pull"));
  });
});
