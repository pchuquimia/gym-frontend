import { fireEvent, render, screen, within } from "@testing-library/react";
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

  it("abre el historial desde la tarjeta abierta sin contraerla", () => {
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
        open
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
        open
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
        open
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
  it.each([
    "Curl",
    "Curl femoral acostado en máquina de palanca con apoyo ajustable",
  ])(
    "presenta el historial antes del estado activo con el título %s",
    (name) => {
      render(
        <ExerciseCard
          exercise={{
            ...createExercise(),
            name,
            isActive: true,
            hasStoredHistory: true,
            storedHistoryLastDate: "2026-08-12",
          }}
          {...defaultProps}
          open
        />,
      );
      const history = screen.getByText(/Última vez: 12 ago/);
      const status = screen.getByText("En curso");
      expect(
        history.compareDocumentPosition(status) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        screen.getAllByRole("button", { name: `Contraer ${name}` }),
      ).toHaveLength(2);
    },
  );
  it.each([true, false])(
    "muestra la última vez solo al abrir la card (historial interactivo: %s)",
    (interactive) => {
      const exercise = {
        ...createExercise(),
        hasStoredHistory: true,
        storedHistoryLastDate: "2026-08-12",
      };
      const extraProps = { onViewTracking: interactive ? vi.fn() : undefined };
      const { rerender } = render(
        <ExerciseCard exercise={exercise} {...defaultProps} {...extraProps} />,
      );
      expect(screen.queryByText(/Última vez/)).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /Ver historial/ }),
      ).not.toBeInTheDocument();
      rerender(
        <ExerciseCard
          exercise={exercise}
          {...defaultProps}
          {...extraProps}
          open
        />,
      );
      expect(screen.getByText(/Última vez: 12 ago/)).toBeVisible();
      rerender(
        <ExerciseCard exercise={exercise} {...defaultProps} {...extraProps} />,
      );
      expect(screen.queryByText(/Última vez/)).not.toBeInTheDocument();
    },
  );

  it("muestra las opciones directamente desde la tarjeta desplegada", () => {
    render(<ExerciseCard exercise={createExercise()} {...defaultProps} open />);

    const optionsButton = screen.getByRole("button", {
      name: "Opciones de Press en máquina",
    });
    expect(optionsButton).toHaveAttribute("aria-expanded", "false");
    expect(optionsButton).toHaveAttribute("title", "Opciones");
    expect(optionsButton).toHaveTextContent("Opciones");

    fireEvent.click(optionsButton);

    expect(optionsButton).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("textbox", { name: "Ajuste de Press en máquina" }),
    ).toBeInTheDocument();
    expect(
      document.getElementById(optionsButton.getAttribute("aria-controls")),
    ).toContainElement(
      screen.getByRole("textbox", { name: "Ajuste de Press en máquina" }),
    );
  });
  it("oculta las opciones al contraer y en sesiones de solo lectura", () => {
    const { rerender } = render(
      <ExerciseCard exercise={createExercise()} {...defaultProps} />,
    );
    expect(
      screen.queryByRole("button", { name: /Opciones de/ }),
    ).not.toBeInTheDocument();
    rerender(
      <ExerciseCard
        exercise={createExercise()}
        {...defaultProps}
        readOnly
        open
      />,
    );
    expect(
      screen.queryByRole("button", { name: /Opciones de/ }),
    ).not.toBeInTheDocument();
  });
  it("ofrece switches compactos y conserva los cambios de formato, ejecución y equipo", () => {
    const onSeriesTypeChange = vi.fn();
    const onMovementModeChange = vi.fn();
    const onSetupNoteChange = vi.fn();
    render(
      <ExerciseCard
        exercise={{
          ...createExercise("Asiento 3"),
          supportsUnilateral: true,
          seriesType: "biserie",
          movementMode: "unilateral",
          hasStoredHistory: true,
          storedHistoryLastDate: "2026-08-12",
        }}
        {...defaultProps}
        onSeriesTypeChange={onSeriesTypeChange}
        onMovementModeChange={onMovementModeChange}
        onSetupNoteChange={onSetupNoteChange}
        onViewTracking={vi.fn()}
        open
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Opciones de Press en máquina" }),
    );
    const format = screen.getByRole("group", { name: "Formato" });
    const execution = screen.getByRole("group", { name: "Ejecución" });
    expect(
      within(format).getByRole("button", { name: "Biserie" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(execution).getByRole("button", { name: "Unilateral" }),
    ).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(within(format).getByRole("button", { name: "Triserie" }));
    fireEvent.click(
      within(execution).getByRole("button", { name: "Bilateral" }),
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Ajuste de Press en máquina" }),
      { target: { value: "Asiento 5" } },
    );
    expect(onSeriesTypeChange).toHaveBeenCalledWith("triserie");
    expect(onMovementModeChange).toHaveBeenCalledWith("bilateral");
    expect(onSetupNoteChange).toHaveBeenCalledWith("Asiento 5");
  });
  it("no ofrece ejecución unilateral cuando el ejercicio no la admite", () => {
    render(<ExerciseCard exercise={createExercise()} {...defaultProps} open />);
    fireEvent.click(
      screen.getByRole("button", { name: "Opciones de Press en máquina" }),
    );
    expect(screen.getByRole("group", { name: "Formato" })).toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: "Ejecución" }),
    ).not.toBeInTheDocument();
  });
  it("mantiene contraer y opciones juntos en la cabecera sin activar el ejercicio", () => {
    const onToggleOpen = vi.fn();
    const onActivate = vi.fn();
    render(
      <ExerciseCard
        exercise={createExercise()}
        {...defaultProps}
        onToggleOpen={onToggleOpen}
        onActivate={onActivate}
        open
      />,
    );
    const controls = screen.getByRole("group", {
      name: "Controles de Press en máquina",
    });
    const collapse = within(controls).getByRole("button", {
      name: "Contraer Press en máquina",
    });
    expect(collapse).toBeVisible();
    expect(collapse).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(
      screen.getByRole("button", {
        name: "Opciones de Press en máquina",
      }),
    );
    expect(onToggleOpen).not.toHaveBeenCalled();
    fireEvent.click(collapse);
    expect(onToggleOpen).toHaveBeenCalledOnce();
    expect(onActivate).not.toHaveBeenCalled();
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
