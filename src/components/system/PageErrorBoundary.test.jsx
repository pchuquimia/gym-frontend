import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

const recovery = vi.hoisted(() => ({
  isRecoverableAssetError: vi.fn(() => true),
  refreshAfterAssetError: vi.fn(),
  reloadForAssetError: vi.fn(() => false),
}));

vi.mock("../../utils/startupRecovery", () => recovery);

import PageErrorBoundary from "./PageErrorBoundary";

function MissingStylesheet() {
  throw new Error("Unable to preload CSS for /assets/Dashboard-BVBRph4_.css");
}

afterEach(() => {
  vi.restoreAllMocks();
  recovery.refreshAfterAssetError.mockClear();
});

it("recarga una versión nueva al reintentar un CSS obsoleto", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});

  render(
    <PageErrorBoundary resetKey="dashboard" onGoHome={vi.fn()}>
      <MissingStylesheet />
    </PageErrorBoundary>,
  );

  fireEvent.click(screen.getByRole("button", { name: "Actualizar app" }));

  expect(recovery.refreshAfterAssetError).toHaveBeenCalledOnce();
});
