import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ExerciseCodexReviewQueue from "./ExerciseCodexReviewQueue";

const apiMocks = vi.hoisted(() => ({
  getCodexImageReviewQueue: vi.fn(),
  reviewCodexImageRequest: vi.fn(),
}));

vi.mock("../../services/api", () => ({ api: apiMocks }));

const readyRequest = {
  id: "request-1",
  exerciseId: "exercise-1",
  exerciseName: "Press de banca",
  referenceImage: "https://example.com/current.webp",
  attempt: 1,
  result: { url: "https://example.com/proposal.webp" },
  exercise: {
    _id: "exercise-1",
    localizedNames: { es: "Press de banca" },
    primaryMuscleGroup: "Pecho",
  },
};

const renderQueue = (onApplied = vi.fn()) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ExerciseCodexReviewQueue onApplied={onApplied} />
    </QueryClientProvider>,
  );
};

describe("ExerciseCodexReviewQueue", () => {
  beforeEach(() => {
    Object.values(apiMocks).forEach((mock) => mock.mockReset());
    apiMocks.getCodexImageReviewQueue.mockResolvedValue({
      requests: [readyRequest],
      summary: { ready: 1, pending: 2, processing: 1, failed: 0 },
      autoQueue: { enabled: true },
    });
  });

  it("aprueba una propuesta y avanza", async () => {
    const onApplied = vi.fn();
    apiMocks.reviewCodexImageRequest.mockResolvedValue({
      exercise: { id: "exercise-1", name: "Press de banca" },
    });
    renderQueue(onApplied);

    await userEvent.click(
      await screen.findByRole("button", { name: /Aprobar y siguiente/i }),
    );

    await waitFor(() =>
      expect(apiMocks.reviewCodexImageRequest).toHaveBeenCalledWith(
        "request-1",
        "approve",
        "",
      ),
    );
    expect(onApplied).toHaveBeenCalled();
  });

  it("regenera con un motivo rapido", async () => {
    apiMocks.reviewCodexImageRequest.mockResolvedValue({
      nextRequest: { id: "request-2", status: "pending" },
    });
    renderQueue();

    await userEvent.click(
      await screen.findByRole("button", { name: /^Regenerar/i }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Músculos incorrectos" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Regenerar y siguiente" }),
    );

    await waitFor(() =>
      expect(apiMocks.reviewCodexImageRequest).toHaveBeenCalledWith(
        "request-1",
        "regenerate",
        "Músculos incorrectos",
      ),
    );
  });
});
