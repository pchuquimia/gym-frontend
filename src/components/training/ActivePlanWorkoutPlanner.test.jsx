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

  it("presenta una rutina completada como estado final y no permite iniciarla otra vez", () => {
    render(
      <ActivePlanWorkoutPlanner
        plan={{
          id: "plan-3",
          name: "Plan vigente",
          goal: "Fuerza",
          startDate: "2026-08-10",
          scheduleMode: "fixed",
          weeklySchedule: [
            {
              slotId: "slot-1",
              type: "training",
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
        trainings={[
          {
            id: "training-1",
            routineId: "routine-1",
            date: "2026-08-10",
          },
        ]}
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

    expect(
      screen.getByRole("status", { name: "Rutina completada" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "INICIAR ENTRENAMIENTO" }),
    ).toBeNull();
  });

  it("mantiene el tiempo promedio completo aunque las calorías usen tiempo efectivo", () => {
    render(
      <ActivePlanWorkoutPlanner
        plan={{
          id: "plan-4",
          name: "Plan vigente",
          startDate: "2026-08-17",
          scheduleMode: "fixed",
          weeklySchedule: [
            { slotId: "slot-1", type: "training", routineId: "lower-b" },
          ],
        }}
        routines={[{ id: "lower-b", name: "Lower B", exercises: [] }]}
        trainings={[
          {
            routineId: "lower-b",
            date: "2026-08-10",
            durationSeconds: 5880,
            workSeconds: 1200,
            restSeconds: 600,
            preparationSeconds: 4080,
          },
        ]}
        loading={false}
        error=""
        selectedWeek={0}
        currentDate="2026-08-17"
        onRetry={vi.fn()}
        onOpenPlans={vi.fn()}
        onStart={vi.fn()}
        onAdvance={vi.fn()}
        advancing={false}
        preparingRoutineId=""
        weightKg={75}
      />,
    );

    expect(screen.getByText("1 h 38 min")).toBeVisible();
    expect(
      screen.getByLabelText(/calorías estimadas, calculadas con el promedio/),
    ).toBeVisible();
  });
});
