import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ExerciseCard from "./ExerciseCard";

const createExercise = (setupNote = "") => ({
  id: "exercise-1",
  name: "Press en máquina",
  image: "https://example.com/press.webp",
  setupNote,
  sets: [
    {
      id: "set-1",
      entries: [
        {
          id: "entry-1",
          previousText: "40 kg x 10",
          kg: "40",
          reps: "10",
          done: false,
        },
      ],
    },
  ],
});

const defaultProps = {
  onToggleOpen: vi.fn(),
  onAddSet: vi.fn(),
  onUpdateEntry: vi.fn(),
  onToggleEntry: vi.fn(),
  onRemoveSet: vi.fn(),
  onRemoveExercise: vi.fn(),
};

describe("ExerciseCard", () => {
  it("muestra el ajuste guardado solamente cuando contiene información", () => {
    const { rerender } = render(
      <ExerciseCard exercise={createExercise()} {...defaultProps} />,
    );

    expect(screen.queryByText("Ajuste:")).toBeNull();

    rerender(
      <ExerciseCard
        exercise={createExercise("Asiento 3 · respaldo 5")}
        {...defaultProps}
      />,
    );

    expect(screen.getByText("Ajuste:")).toBeInTheDocument();
    expect(screen.getByText("Asiento 3 · respaldo 5")).toBeInTheDocument();
  });

  it("ignora notas compuestas únicamente por espacios", () => {
    render(<ExerciseCard exercise={createExercise("   ")} {...defaultProps} />);

    expect(screen.queryByText("Ajuste:")).toBeNull();
  });

  it("abre el historial desde la fecha sin expandir la tarjeta", () => {
    const exercise = createExercise();
    exercise.sets[0].entries[0].previousDate = "2026-08-28";
    const onViewTracking = vi.fn();
    const onToggleOpen = vi.fn();

    render(
      <ExerciseCard
        exercise={exercise}
        {...defaultProps}
        onToggleOpen={onToggleOpen}
        onViewTracking={onViewTracking}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Ver historial de Press en máquina" }),
    );

    expect(onViewTracking).toHaveBeenCalledOnce();
    expect(onToggleOpen).not.toHaveBeenCalled();
  });

  it("identifica visual y semánticamente el ejercicio en curso", () => {
    const exercise = { ...createExercise(), isActive: true };
    const { container } = render(
      <ExerciseCard exercise={exercise} {...defaultProps} />,
    );

    expect(screen.getByText("En curso")).toBeInTheDocument();
    expect(
      container.querySelector('[aria-current="step"]'),
    ).toBeInTheDocument();
  });

  it("muestra las opciones directamente desde la tarjeta desplegada", () => {
    render(<ExerciseCard exercise={createExercise()} {...defaultProps} open />);

    const optionsButton = screen.getByRole("button", {
      name: "Opciones de Press en máquina",
    });
    expect(optionsButton).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(optionsButton);

    expect(optionsButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Ajuste del equipo")).toBeInTheDocument();
  });
});
