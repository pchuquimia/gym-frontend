import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import RestTimingControl from "./RestTimingControl";

function ControlledRest({ initialEnabled = false, animateExpansion = true }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [duration, setDuration] = useState(120);
  return (
    <RestTimingControl
      enabled={enabled}
      durationSeconds={duration}
      onToggle={setEnabled}
      onDurationChange={setDuration}
      animateExpansion={animateExpansion}
    />
  );
}

beforeEach(() => vi.mocked(Element.prototype.scrollIntoView).mockClear());

it.each([false, true])(
  "permite elegir el descanso y cerrar las opciones sin desplazar la página, con animación: %s",
  async (animateExpansion) => {
    const user = userEvent.setup();
    render(<ControlledRest animateExpansion={animateExpansion} />);
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("switch", { name: "Usar tiempos de descanso" }),
    );
    expect(screen.getByRole("button", { name: "5 min" })).toBeVisible();
    const lastOption = screen.getByRole("button", { name: "5 min" });

    await user.click(screen.getByRole("button", { name: "3 min" }));
    expect(screen.getByRole("button", { name: "3 min" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(
      screen.getByRole("switch", { name: "Usar tiempos de descanso" }),
    );
    expect(screen.queryByRole("button", { name: "5 min" })).toBeNull();
    if (animateExpansion) expect(lastOption).toBeDisabled();
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  },
);

it("conserva la posición al entrar con el descanso ya activado", () => {
  render(<ControlledRest initialEnabled />);
  expect(screen.getByRole("button", { name: "5 min" })).toBeVisible();
  expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
});
