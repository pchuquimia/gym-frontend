import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SetRow from "./SetRow";

const renderSet = (overrides = {}) => {
  const props = {
    setId: "set-1",
    index: 1,
    exerciseName: "Press de banca",
    entries: [
      {
        id: "entry-1",
        previousText: "40 kg x 10",
        kg: "",
        reps: "",
        done: false,
      },
    ],
    onChangeEntry: vi.fn(),
    onToggleEntry: vi.fn(),
    onRemove: vi.fn(),
    ...overrides,
  };
  render(<SetRow {...props} />);
  return props;
};

describe("SetRow", () => {
  it("registra peso, repeticiones y la finalizacion de una serie", async () => {
    const user = userEvent.setup();
    const props = renderSet();

    fireEvent.change(
      screen.getByLabelText(/Peso en kilogramos, Press de banca, serie 1/i),
      { target: { value: "42.5" } },
    );
    fireEvent.change(
      screen.getByLabelText(/Repeticiones, Press de banca, serie 1/i),
      { target: { value: "8" } },
    );
    await user.click(
      screen.getByRole("button", {
        name: /Completar Press de banca, serie 1/i,
      }),
    );

    expect(props.onChangeEntry).toHaveBeenCalledWith(
      "entry-1",
      "kg",
      "42.5",
    );
    expect(props.onChangeEntry).toHaveBeenCalledWith("entry-1", "reps", "8");
    expect(props.onToggleEntry).toHaveBeenCalledWith("entry-1");
  });

  it("bloquea la edicion en modo lectura", () => {
    renderSet({ readOnly: true });

    expect(
      screen.getByLabelText(/Peso en kilogramos, Press de banca, serie 1/i),
    ).toHaveAttribute("readonly");
    expect(
      screen.getByRole("button", {
        name: /Completar Press de banca, serie 1/i,
      }),
    ).toBeDisabled();
  });

  it("distingue la mejor marca del resultado de la ultima sesion", () => {
    renderSet({ prSummary: "45 kg x 8 | 15 ago" });

    expect(
      screen.getByText("Mejor marca: 45 kg x 8 | 15 ago"),
    ).toBeInTheDocument();
    expect(screen.getByText("Última sesión")).toBeInTheDocument();
    expect(screen.getByText("40 kg x 10")).toBeInTheDocument();
  });
});
