import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ApplicationErrorBoundary from "./ApplicationErrorBoundary";

function BrokenApplication() {
  throw new Error("Unexpected render failure");
}

describe("ApplicationErrorBoundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("replaces a failed application with a usable recovery screen", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ApplicationErrorBoundary>
        <BrokenApplication />
      </ApplicationErrorBoundary>,
    );

    expect(
      screen.getByRole("heading", { name: "No pudimos abrir RIRFIT" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Recargar aplicación" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Diagnóstico RIR-/)).toBeInTheDocument();
  });
});

