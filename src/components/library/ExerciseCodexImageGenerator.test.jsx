import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ExerciseCodexImageGenerator from "./ExerciseCodexImageGenerator";

const apiMocks = vi.hoisted(() => ({
  getCodexImageRequests: vi.fn(),
  createCodexImageRequest: vi.fn(),
  discardCodexImageRequest: vi.fn(),
  applyCodexImageRequest: vi.fn(),
}));

vi.mock("../../services/api", () => ({ api: apiMocks }));

const renderGenerator = (onApplied = vi.fn()) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    onApplied,
    ...render(
      <QueryClientProvider client={queryClient}>
        <ExerciseCodexImageGenerator
          exercise={{ id: "exercise-1", name: "Press de banca" }}
          currentImage="https://res.cloudinary.com/demo/current.webp"
          onApplied={onApplied}
        />
      </QueryClientProvider>,
    ),
  };
};

describe("ExerciseCodexImageGenerator", () => {
  beforeEach(() => {
    Object.values(apiMocks).forEach((mock) => mock.mockReset());
  });

  it("crea una solicitud para Codex sin requerir una API key", async () => {
    apiMocks.getCodexImageRequests.mockResolvedValue({ requests: [] });
    apiMocks.createCodexImageRequest.mockResolvedValue({
      request: { id: "request-1", status: "pending" },
      reused: false,
    });
    renderGenerator();

    const generate = await screen.findByRole("button", {
      name: "Generar con Codex",
    });
    await userEvent.click(generate);

    await waitFor(() =>
      expect(apiMocks.createCodexImageRequest).toHaveBeenCalledWith(
        "exercise-1",
        "",
      ),
    );
    expect(screen.queryByText("OPENAI_API_KEY")).not.toBeInTheDocument();
  });

  it("muestra una solicitud pendiente y permite cancelarla", async () => {
    apiMocks.getCodexImageRequests.mockResolvedValue({
      requests: [{ id: "request-1", status: "pending", result: {} }],
    });
    apiMocks.discardCodexImageRequest.mockResolvedValue({
      request: { id: "request-1", status: "cancelled" },
    });
    renderGenerator();

    expect(await screen.findByText("Pendiente para Codex")).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: "Cancelar solicitud" }),
    );
    await waitFor(() =>
      expect(apiMocks.discardCodexImageRequest).toHaveBeenCalledWith(
        "request-1",
      ),
    );
  });

  it("permite aplicar una propuesta lista", async () => {
    const onApplied = vi.fn();
    apiMocks.getCodexImageRequests.mockResolvedValue({
      requests: [
        {
          id: "request-1",
          status: "ready",
          result: { url: "https://res.cloudinary.com/demo/proposal.webp" },
        },
      ],
    });
    apiMocks.applyCodexImageRequest.mockResolvedValue({
      exercise: { id: "exercise-1", name: "Press de banca" },
    });
    renderGenerator(onApplied);

    await userEvent.click(
      await screen.findByRole("button", { name: "Usar imagen" }),
    );
    await waitFor(() =>
      expect(apiMocks.applyCodexImageRequest).toHaveBeenCalledWith("request-1"),
    );
    expect(onApplied).toHaveBeenCalledWith({
      id: "exercise-1",
      name: "Press de banca",
    });
  });
});
