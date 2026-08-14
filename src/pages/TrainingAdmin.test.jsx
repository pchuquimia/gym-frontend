import { StrictMode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_HISTORY_FIELDS } from "../utils/trainingListFields";
import { SessionHistory } from "./TrainingAdmin";

const apiMocks = vi.hoisted(() => ({
  getTrainings: vi.fn(),
}));

vi.mock("../services/api", () => ({ api: apiMocks }));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "admin-1", role: "Admin" } }),
}));

describe("SessionHistory", () => {
  beforeEach(() => {
    apiMocks.getTrainings.mockReset();
  });

  it("comparte una sola carga en StrictMode y solicita solo el resumen", async () => {
    let resolveRequest;
    apiMocks.getTrainings.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <SessionHistory />
        </QueryClientProvider>
      </StrictMode>,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Cargando historial...",
    );
    await waitFor(() => expect(apiMocks.getTrainings).toHaveBeenCalledTimes(1));

    await act(async () => {
      resolveRequest([
        {
          _id: "training-1",
          date: "2026-08-13",
          routineName: "Rutina A",
          durationSeconds: 3600,
          totalVolume: 1200,
          volumeBreakdown: { recordedSets: 7 },
        },
      ]);
    });

    expect(await screen.findByText("Rutina A")).toBeVisible();
    expect(screen.getByText("7")).toBeVisible();
    expect(apiMocks.getTrainings).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: SESSION_HISTORY_FIELDS,
        limit: 5000,
      }),
    );
    expect(SESSION_HISTORY_FIELDS).not.toContain("exercises");
  });
});
