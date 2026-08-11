import { render, screen } from "@testing-library/react";
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
});
