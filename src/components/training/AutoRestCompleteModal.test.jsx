import { useState } from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { AnimatePresence } from "framer-motion";
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

  it("libera la interfaz al terminar su animación de salida", async () => {
    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <AnimatePresence>
          {open ? (
            <AutoRestCompleteModal
              onContinue={() => setOpen(false)}
            />
          ) : null}
        </AnimatePresence>
      );
    }

    render(<Harness />);
    const overlay = screen.getByRole("button", {
      name: "Descanso terminado. Volver al entrenamiento",
    });
    fireEvent.click(overlay);
    expect(overlay).toHaveClass("pointer-events-none");
    await waitFor(() => expect(overlay).not.toBeInTheDocument());
  });
});
