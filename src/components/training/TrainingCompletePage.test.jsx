import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TrainingCompletePage from "./TrainingCompletePage";

const renderModal = (overrides = {}) => {
  const props = {
    routineName: "Upper A",
    completedExercises: 5,
    totalExercises: 5,
    totalSets: 16,
    durationLabel: "00:42:18",
    calorieEstimate: {
      available: true,
      calories: 341,
      minCalories: 280,
      maxCalories: 402,
    },
    isFinalizing: false,
    onFinish: vi.fn(),
    onDismiss: vi.fn(),
    ...overrides,
  };
  const result = render(<TrainingCompletePage {...props} />);
  return { ...result, props };
};

describe("TrainingCompletePage", () => {
  it("muestra el cierre de la rutina y permite guardarla", () => {
    const { props } = renderModal();

    expect(
      screen.getByRole("heading", { name: "Rutina completada" }),
    ).toBeInTheDocument();
    expect(screen.getByText("5/5")).toBeInTheDocument();
    expect(screen.getByText("16")).toBeInTheDocument();
    expect(screen.getByText("00:42:18")).toBeInTheDocument();
    expect(screen.getByText("~341 kcal")).toBeInTheDocument();
    expect(screen.getByText(/280–402 kcal/i)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Finalizar entrenamiento" }),
    );
    expect(props.onFinish).toHaveBeenCalledOnce();
  });

  it("vuelve al entrenamiento desde la acción secundaria", () => {
    const { props } = renderModal();

    fireEvent.click(
      screen.getByRole("button", { name: "Volver al entrenamiento" }),
    );
    expect(props.onDismiss).toHaveBeenCalledOnce();
  });

  it("bloquea las acciones mientras se guarda la sesion", () => {
    renderModal({ isFinalizing: true });

    expect(
      screen.getByRole("button", { name: "Finalizando" }),
    ).toBeDisabled();
    screen
      .getAllByRole("button", { name: "Volver al entrenamiento" })
      .forEach((button) => expect(button).toBeDisabled());
  });
});
