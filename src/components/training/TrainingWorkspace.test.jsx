import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  RoutineLibraryGroups,
  TrainingPlanOverview,
  TrainingWorkspaceSection,
} from "./TrainingWorkspace";

const days = Array.from({ length: 7 }, (_, index) => ({
  slotId: `slot-${index}`,
  type: [0, 1, 3, 4].includes(index) ? "training" : "rest",
  focus: "Torso",
}));
const plan = {
  name: "Mes 1",
  status: "active",
  goal: "Fuerza",
  scheduleMode: "fixed",
  durationWeeks: 8,
  startDate: "2026-10-01",
  weeklySchedule: days,
};

describe("TrainingPlanOverview", () => {
  it("shows duration progress and the actual four programmed days", () => {
    const onOpen = vi.fn();
    render(
      <TrainingPlanOverview plan={plan} currentWeek={4} onOpen={onOpen} />,
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "50",
    );
    expect(screen.getByRole("progressbar")).toHaveAccessibleName(
      "Avance de las semanas del plan",
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuetext",
      "Semana 4 de 8",
    );
    const schedule = screen.getByRole("list", {
      name: "Días programados de la semana",
    });
    expect(within(schedule).getAllByRole("listitem")).toHaveLength(7);
    expect(schedule.querySelectorAll(".is-training")).toHaveLength(4);
    expect(within(schedule).getByLabelText("Sábado: Descanso")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Iniciar entrenamiento" }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Ver planificación" }));
    expect(onOpen).toHaveBeenCalledOnce();
  });
  it("keeps sequential cycles separate from weekdays", () => {
    render(
      <TrainingPlanOverview
        plan={{
          ...plan,
          scheduleMode: "sequential",
          weeklySchedule: days.slice(0, 3),
        }}
        currentWeek={2}
      />,
    );
    expect(screen.getByText("Fuerza · 2 días por ciclo")).toBeVisible();
    expect(screen.getByRole("list", { name: "Orden del ciclo" })).toBeVisible();
    expect(screen.getByLabelText("Día 3: Descanso")).toBeVisible();
    expect(
      screen.queryByRole("list", { name: "Días programados de la semana" }),
    ).toBeNull();
  });
  it.each([-2, 99])(
    "clamps the duration progress to the plan: %s",
    (currentWeek) => {
      render(<TrainingPlanOverview plan={plan} currentWeek={currentWeek} />);
      expect(
        Number(screen.getByRole("progressbar").getAttribute("aria-valuenow")),
      ).toBeLessThanOrEqual(100);
      expect(
        Number(screen.getByRole("progressbar").getAttribute("aria-valuenow")),
      ).toBeGreaterThan(0);
    },
  );
  it("does not invent progress when the start date is missing", () => {
    render(
      <TrainingPlanOverview
        plan={{ ...plan, startDate: null }}
        currentWeek={1}
      />,
    );
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.getByText("Fecha de inicio pendiente")).toBeVisible();
  });
});

describe("Training workspace actions", () => {
  it.each([
    ["plans", "Nuevo plan"],
    ["routines", "Nueva rutina"],
  ])("names the creation action for %s", (view, label) => {
    const onCreate = vi.fn();
    render(
      <TrainingWorkspaceSection view={view} canCreate onCreate={onCreate} />,
    );
    fireEvent.click(screen.getByRole("button", { name: label }));
    expect(onCreate).toHaveBeenCalledOnce();
  });
  it("does not offer creation to a managed athlete", () => {
    render(<TrainingWorkspaceSection view="plans" canCreate={false} />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});

const routine = {
  id: "torso",
  name: "Torso A",
  exercises: [{}],
  totalExerciseCount: 6,
  estimatedMinutes: 50,
  preview: [{ url: "/images/routine-upper.webp" }],
};
const groups = [
  { id: "plan-1", status: "active", title: "Mes 1", routines: [routine] },
];
describe("Routine library rows", () => {
  it("opens the original routine and retains its image and edit actions", () => {
    const onOpen = vi.fn(),
      onEdit = vi.fn(),
      onDuplicate = vi.fn(),
      onDelete = vi.fn();
    render(
      <RoutineLibraryGroups
        groups={groups}
        canEdit
        onOpen={onOpen}
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
      />,
    );
    const open = screen.getByRole("button", {
      name: "Ver ejercicios de Torso A",
    });
    expect(open.querySelector("img")).toHaveAttribute(
      "src",
      routine.preview[0].url,
    );
    expect(screen.getByText("6 ejercicios · 50 min aprox.")).toBeVisible();
    fireEvent.click(open);
    expect(onOpen).toHaveBeenCalledWith(routine);
    for (const [name, handler] of [
      ["Editar", onEdit],
      ["Duplicar", onDuplicate],
      ["Eliminar", onDelete],
    ]) {
      fireEvent.click(screen.getByLabelText("Opciones de Torso A"));
      fireEvent.click(screen.getByRole("button", { name }));
      expect(handler).toHaveBeenCalledWith(routine);
    }
  });
  it("leaves routines readable without offering editing to managed athletes", () => {
    render(
      <RoutineLibraryGroups groups={groups} canEdit={false} onOpen={vi.fn()} />,
    );
    expect(
      screen.getByRole("button", { name: "Ver ejercicios de Torso A" }),
    ).toBeVisible();
    expect(screen.queryByLabelText("Opciones de Torso A")).toBeNull();
  });
});
