import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TrainingCompletionPanel from "./TrainingCompletionPanel";

const renderPanel = (overrides = {}) => {
  const props = {
    routineName: "Lower A",
    completedExercises: 6,
    totalExercises: 6,
    totalSets: 14,
    durationLabel: "00:48:12",
    photoPreview: "",
    photoError: "",
    onPhotoChange: vi.fn(),
    onClearPhoto: vi.fn(),
    onFinish: vi.fn(),
    isFinalizing: false,
    ...overrides,
  };
  const result = render(<TrainingCompletionPanel {...props} />);
  return { ...result, props };
};

describe("TrainingCompletionPanel", () => {
  it("presenta el resumen final y permite finalizar", () => {
    const { props } = renderPanel();

    expect(
      screen.getByRole("heading", { name: "Rutina completada" }),
    ).toBeInTheDocument();
    expect(screen.getByText("6/6")).toBeInTheDocument();
    expect(screen.getByText("14")).toBeInTheDocument();
    expect(screen.getByText("00:48:12")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Finalizar entrenamiento" }),
    );
    expect(props.onFinish).toHaveBeenCalledOnce();
  });

  it("muestra la foto preparada y permite quitarla", () => {
    const { props } = renderPanel({ photoPreview: "preview.webp" });

    expect(
      screen.getByRole("img", { name: "Vista previa de la foto final" }),
    ).toHaveAttribute("src", "preview.webp");
    fireEvent.click(
      screen.getByRole("button", { name: "Quitar foto final" }),
    );
    expect(props.onClearPhoto).toHaveBeenCalledOnce();
  });
});

