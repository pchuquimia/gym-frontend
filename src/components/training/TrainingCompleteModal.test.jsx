import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TrainingCompleteModal from "./TrainingCompleteModal";

const renderModal = (overrides = {}) => {
  const props = {
    routineName: "Upper A",
    completedExercises: 5,
    totalExercises: 5,
    totalSets: 16,
    durationLabel: "00:42:18",
    isFinalizing: false,
    onFinish: vi.fn(),
    onDismiss: vi.fn(),
    ...overrides,
  };
  const result = render(<TrainingCompleteModal {...props} />);
  return { ...result, props };
};

describe("TrainingCompleteModal", () => {
  it("muestra el cierre de la rutina y permite guardarla", () => {
    const { props } = renderModal();

    expect(
      screen.getByRole("dialog", { name: "Rutina completada" }),
    ).toBeInTheDocument();
    expect(screen.getByText("5/5")).toBeInTheDocument();
    expect(screen.getByText("16")).toBeInTheDocument();
    expect(screen.getByText("00:42:18")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Finalizar entrenamiento" }),
    );
    expect(props.onFinish).toHaveBeenCalledOnce();
  });

  it("vuelve al entrenamiento al pulsar fuera del contenido", () => {
    const { props } = renderModal();

    fireEvent.click(
      screen.getAllByRole("button", { name: "Volver al entrenamiento" })[0],
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
