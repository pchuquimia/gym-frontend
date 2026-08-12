import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AutoRestCompleteModal from "./AutoRestCompleteModal";

describe("AutoRestCompleteModal", () => {
  it("vuelve al entrenamiento al tocar cualquier parte del modal", () => {
    const onContinue = vi.fn();
    render(
      <AutoRestCompleteModal reduceMotion onContinue={onContinue} />,
    );

    expect(screen.getByText("Listo")).toBeInTheDocument();
    expect(screen.getByText("Descanso terminado")).toBeInTheDocument();
    const modal = screen.getByRole("button", {
      name: "Descanso terminado. Volver al entrenamiento",
    });
    fireEvent.click(modal);
    expect(onContinue).toHaveBeenCalledOnce();
  });
});
