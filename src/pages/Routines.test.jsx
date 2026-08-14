import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TrainingPlanSchedule } from "./Routines";

const schedule = [
  {
    slotId: "slot_1",
    dayIndex: 1,
    type: "training",
    focus: "Empuje",
    routineId: "routine_1",
  },
  {
    slotId: "slot_2",
    dayIndex: 2,
    type: "training",
    focus: "Piernas",
    routineId: null,
  },
  ...Array.from({ length: 5 }, (_, index) => ({
    slotId: `slot_${index + 3}`,
    dayIndex: index + 3,
    type: "rest",
    focus: "",
    routineId: null,
  })),
];

describe("TrainingPlanSchedule", () => {
  it("no ofrece acciones de edición cuando la planificación finalizó", () => {
    render(
      <TrainingPlanSchedule
        plan={{
          _id: "plan_1",
          status: "completed",
          scheduleMode: "fixed",
          startDate: "2026-08-10",
          weeklySchedule: schedule,
        }}
        routines={[
          {
            id: "routine_1",
            name: "Empuje A",
            exercises: [{ name: "Press", sets: 3 }],
          },
        ]}
        trainings={[]}
        selectedWeek={0}
        isManagedClient={false}
        onChooseRoutine={vi.fn()}
        onOpenRoutine={vi.fn()}
        onDuplicateRoutine={vi.fn()}
        onDeleteRoutine={vi.fn()}
        duplicatingRoutineId=""
        onStartRoutine={vi.fn()}
        onAdvanceCycle={vi.fn()}
        advancingCycle={false}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Ver ejercicios de Empuje A" }),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: "Asignar" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Cambiar rutina de Lunes" }),
    ).toBeNull();
    expect(screen.queryByLabelText("Opciones de Empuje A")).toBeNull();
  });
});
