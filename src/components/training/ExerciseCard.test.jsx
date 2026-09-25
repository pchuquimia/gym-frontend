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

  it("no muestra el acceso al historial cuando no hay registros previos", () => {
    render(
      <ExerciseCard
        exercise={createExercise()}
        {...defaultProps}
        onViewTracking={vi.fn()}
      />,
    );

    expect(screen.queryByText(/Última vez:/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Ver historial de/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Sin historial previo")).not.toBeInTheDocument();
  });

  it("permite abrir el historial guardado en otra rutina", () => {
    const onViewTracking = vi.fn();

    render(
      <ExerciseCard
        exercise={{
          ...createExercise(),
          hasStoredHistory: true,
          storedHistoryLastDate: "2026-08-12",
        }}
        {...defaultProps}
        onViewTracking={onViewTracking}
      />,
    );

    const historyButton = screen.getByRole("button", {
      name: "Ver historial de Press en máquina",
    });
    expect(historyButton).toHaveTextContent("Última vez: 12 ago");
    expect(historyButton).toHaveTextContent("Otra rutina");

    fireEvent.click(historyButton);
    expect(onViewTracking).toHaveBeenCalledOnce();
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

  it("activa el ejercicio al desplegarlo sin mostrar un boton Iniciar", () => {
    const onActivate = vi.fn();
    const onToggleOpen = vi.fn();
    render(
      <ExerciseCard
        exercise={createExercise()}
        {...defaultProps}
        onActivate={onActivate}
        onToggleOpen={onToggleOpen}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Iniciar Press en máquina" }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getAllByRole("button", { name: "Expandir Press en máquina" })[0],
    );
    expect(onActivate).toHaveBeenCalledOnce();
    expect(onToggleOpen).toHaveBeenCalledOnce();
  });

  it("no activa el cronometro en una sesion de solo lectura", () => {
    const onActivate = vi.fn();
    render(
      <ExerciseCard
        exercise={createExercise()}
        {...defaultProps}
        readOnly
        onActivate={onActivate}
      />,
    );

    fireEvent.click(
      screen.getAllByRole("button", { name: "Expandir Press en máquina" })[0],
    );
    expect(onActivate).not.toHaveBeenCalled();
  });
});
