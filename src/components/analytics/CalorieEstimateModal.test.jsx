import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CalorieEstimateModal from "./CalorieEstimateModal";

const estimate = {
  id: "training-1",
  date: "2026-08-25",
  routineName: "Pull",
  available: true,
  calories: 420,
  minCalories: 344,
  maxCalories: 496,
  durationMinutes: 55,
  completedSets: 16,
  intensityLabel: "Media-alta",
  weightKg: 82.5,
};

describe("CalorieEstimateModal", () => {
  it("explica el rango y permite cerrar el detalle", () => {
    const onClose = vi.fn();
    render(
      <CalorieEstimateModal
        open
        onClose={onClose}
        summary={{ ...estimate, sessions: 1 }}
        estimates={[estimate]}
        periodLabel="Entrenamiento completado"
      />,
    );

    expect(
      screen.getByRole("dialog", { name: "Calorías quemadas" }),
    ).toBeInTheDocument();
    expect(screen.getByText("~420")).toBeInTheDocument();
    expect(screen.getByText(/344–496 kcal/)).toBeInTheDocument();
    expect(
      screen.getByText(/sesión, peso e intensidad registrada/i),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Cerrar detalle de calorías quemadas",
      }),
    );
    expect(onClose).toHaveBeenCalledOnce();
  });
});
