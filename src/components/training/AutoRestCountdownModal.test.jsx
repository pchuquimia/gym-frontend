import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AutoRestCountdownModal from "./AutoRestCountdownModal";

describe("AutoRestCountdownModal", () => {
  it("muestra únicamente el tiempo y el progreso del descanso", () => {
    const onExit = vi.fn();
    render(
      <AutoRestCountdownModal
        timeLabel="01:30"
        progressPct={25}
        reduceMotion
        onExit={onExit}
      />,
    );

    expect(
      screen.getByRole("dialog", { name: "Descanso automático: 01:30" }),
    ).toBeInTheDocument();
    expect(screen.getByText("01:30")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "25",
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Salir del descanso automático",
      }),
    );
    expect(onExit).toHaveBeenCalledOnce();
  });
});
