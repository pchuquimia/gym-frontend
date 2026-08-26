import { render, screen } from "@testing-library/react";
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
    render(
      <ExerciseCard exercise={createExercise("   ")} {...defaultProps} />,
    );

    expect(screen.queryByText("Ajuste:")).toBeNull();
  });
});
