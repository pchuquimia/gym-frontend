import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TrainingCompletePage from "./TrainingCompletePage";

const renderModal = (overrides = {}) => {
  const props = {
    routineName: "Upper A",
    completedExercises: 5,
    totalExercises: 5,
    completedSets: 16,
    totalSets: 16,
    progressPercent: 100,
    isComplete: true,
    durationLabel: "00:42:18",
    calorieEstimate: {
      available: true,
      calories: 341,
      minCalories: 280,
      maxCalories: 402,
    },
    photoPreview: "",
    photoError: "",
    onPhotoChange: vi.fn(),
    onClearPhoto: vi.fn(),
    isFinalizing: false,
    onFinish: vi.fn(),
    onDismiss: vi.fn(),
    ...overrides,
  };
  const result = render(<TrainingCompletePage {...props} />);
  return { ...result, props };
};

describe("TrainingCompletePage", () => {
  it("muestra el cierre de la rutina y permite finalizarla", () => {
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

  it("ofrece adjuntar una foto antes de finalizar", () => {
    renderModal();

    expect(screen.getByText("Tomar o elegir una foto")).toBeInTheDocument();
    expect(screen.getByText("Opcional")).toBeInTheDocument();
  });

  it("muestra la foto elegida y permite quitarla", () => {
    const { props } = renderModal({ photoPreview: "workout.webp" });

    expect(
      screen.getByRole("img", { name: "Vista previa de la foto final" }),
    ).toHaveAttribute("src", "workout.webp");
    fireEvent.click(screen.getByRole("button", { name: "Quitar foto final" }));
    expect(props.onClearPhoto).toHaveBeenCalledOnce();
  });

  it("presenta un resumen parcial cuando se finaliza anticipadamente", () => {
    renderModal({
      completedExercises: 3,
      totalExercises: 5,
      completedSets: 9,
      totalSets: 16,
      progressPercent: 56,
      isComplete: false,
    });

    expect(
      screen.getByRole("heading", { name: "Resumen del entrenamiento" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Sesión parcial")).toBeInTheDocument();
    expect(screen.getByText("3/5")).toBeInTheDocument();
    expect(screen.getByText("9/16")).toBeInTheDocument();
    expect(screen.getByText("56%")).toBeInTheDocument();
    expect(screen.getByText("Finalización anticipada")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Finalizar entrenamiento" }),
    ).toBeInTheDocument();
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

    expect(screen.getByRole("button", { name: "Finalizando" })).toBeDisabled();
    screen
      .getAllByRole("button", { name: "Volver al entrenamiento" })
      .forEach((button) => expect(button).toBeDisabled());
  });
});
