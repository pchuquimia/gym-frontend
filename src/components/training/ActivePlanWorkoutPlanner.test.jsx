import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ActivePlanWorkoutPlanner from "./ActivePlanWorkoutPlanner";

describe("ActivePlanWorkoutPlanner", () => {
  it("muestra el nombre actual de la rutina antes que el foco antiguo del plan", () => {
    render(
      <ActivePlanWorkoutPlanner
        plan={{
          id: "plan-1",
          name: "Plan vigente",
          goal: "Fuerza",
          startDate: "2026-08-10",
          scheduleMode: "fixed",
          weeklySchedule: [
            {
              slotId: "slot-1",
              dayIndex: 1,
              type: "training",
              focus: "Jale",
              routineId: "routine-1",
            },
          ],
        }}
        routines={[
          {
            id: "routine-1",
            name: "Upper",
            exercises: [],
            estimatedDuration: 60,
          },
        ]}
        trainings={[]}
        loading={false}
        error=""
        selectedWeek={0}
        currentDate="2026-08-10"
        onRetry={vi.fn()}
        onOpenPlans={vi.fn()}
        onStart={vi.fn()}
        onAdvance={vi.fn()}
        advancing={false}
        preparingRoutineId=""
      />,
    );

    expect(screen.getByRole("heading", { name: "Upper" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Jale" })).toBeNull();
  });

  it("prioriza hoy y permite revisar otra sesión sin desplegar toda la semana", async () => {
    const user = userEvent.setup();

    render(
      <ActivePlanWorkoutPlanner
        plan={{
          id: "plan-2",
          name: "Mes 1",
          goal: "Fuerza",
          startDate: "2026-08-24",
          scheduleMode: "fixed",
          weeklySchedule: [
            { slotId: "slot-1", type: "training", routineId: "upper" },
            { slotId: "slot-2", type: "training", routineId: "lower" },
            { slotId: "slot-3", type: "rest" },
            { slotId: "slot-4", type: "training", routineId: "lower" },
          ],
        }}
        routines={[
          { id: "upper", name: "Upper", exercises: [] },
          { id: "lower", name: "Lower B", exercises: [] },
        ]}
        trainings={[]}
        loading={false}
        error=""
        selectedWeek={0}
        currentDate="2026-08-26"
        onRetry={vi.fn()}
        onOpenPlans={vi.fn()}
        onStart={vi.fn()}
        onAdvance={vi.fn()}
        advancing={false}
        preparingRoutineId=""
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Descanso completo" }),
    ).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Lower B" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Ver Jue: Lower B" }));

    expect(screen.getByRole("heading", { name: "Lower B" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Entrenar esta rutina" }),
    ).toBeVisible();
  });
});
