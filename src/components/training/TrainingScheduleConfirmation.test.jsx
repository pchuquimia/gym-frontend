import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import TrainingScheduleConfirmation from "./TrainingScheduleConfirmation";

describe("TrainingScheduleConfirmation", () => {
  it("explica el lunes planificado y la fecha de Lower A antes de confirmar", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <TrainingScheduleConfirmation
        routineName="Lower A"
        change={{
          actualDate: "2026-10-29",
          selectedDayIndex: 1,
          scheduleMode: "fixed",
        }}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Lower A está programado para el lunes",
    );
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "jueves, 29 de octubre",
    );
    expect(onConfirm).not.toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole("button", { name: "Confirmar y guardar entrenamiento" }),
    );
    expect(onConfirm).toHaveBeenCalledOnce();
  });
  it("permite volver sin confirmar y explica cómo continúa un ciclo", async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <TrainingScheduleConfirmation
        routineName="Lower A"
        change={{ actualDate: "2026-10-29", scheduleMode: "sequential_cycle" }}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "el ciclo continuará desde esta sesión",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Volver sin guardar" }),
    );
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
