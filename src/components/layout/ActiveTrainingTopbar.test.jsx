import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import ActiveTrainingTopbar from "./ActiveTrainingTopbar";

describe("ActiveTrainingTopbar", () => {
  test("muestra el entrenamiento activo y permite volver", () => {
    const onReturn = vi.fn();
    render(
      <ActiveTrainingTopbar
        training={{
          elapsed: 3723,
          isRunning: true,
          selectedRoutine: { name: "Fuerza superior" },
        }}
        onReturn={onReturn}
      />,
    );

    expect(screen.getAllByText("Entrenamiento en curso").length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText("Fuerza superior").length).toBeGreaterThan(0);
    expect(screen.getAllByText("01:02:03").length).toBeGreaterThan(0);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Volver al entrenamiento en curso",
      }),
    );
    expect(onReturn).toHaveBeenCalledTimes(1);
  });

  test("identifica visualmente una sesión pausada", () => {
    render(
      <ActiveTrainingTopbar
        training={{
          elapsed: 90,
          isRunning: false,
          selectedRoutine: { name: "Piernas" },
        }}
        onReturn={() => {}}
      />,
    );

    expect(screen.getByText("Pausado")).toBeInTheDocument();
  });
});
