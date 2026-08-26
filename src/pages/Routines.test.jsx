import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getPlanTodayState, TrainingPlanSchedule } from "./Routines";

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

  it("muestra las opciones de rutina solo al editar la agenda", () => {
    render(
      <TrainingPlanSchedule
        plan={{
          _id: "plan_1",
          status: "active",
          scheduleMode: "fixed",
          startDate: "2026-08-24",
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

    expect(screen.queryByLabelText("Opciones de Empuje A")).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Editar distribución" }),
    );
    expect(screen.getByLabelText("Opciones de Empuje A")).toBeVisible();
    expect(
      screen.getByText(
        "Los cambios se aplican a la semana recurrente completa.",
      ),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Cambiar rutina de Lunes" }),
    ).toBeNull();
  });

  it("permite seleccionar otra semana de la planificación", () => {
    const onSelectWeek = vi.fn();
    render(
      <TrainingPlanSchedule
        plan={{
          _id: "plan_1",
          status: "active",
          scheduleMode: "fixed",
          startDate: "2026-08-10",
          durationWeeks: 4,
          weeklySchedule: schedule,
        }}
        routines={[]}
        trainings={[]}
        selectedWeek={0}
        onSelectWeek={onSelectWeek}
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

    fireEvent.click(screen.getByRole("button", { name: "Semana 2" }));
    expect(onSelectWeek).toHaveBeenCalledWith(1);
  });
});

describe("getPlanTodayState", () => {
  it("identifica un descanso programado en la fecha actual", () => {
    const state = getPlanTodayState({
      plan: {
        _id: "plan_1",
        scheduleMode: "fixed",
        startDate: "2026-08-24",
        durationWeeks: 4,
        weeklySchedule: schedule,
      },
      now: new Date(2026, 7, 26, 12),
    });

    expect(state?.index).toBe(2);
    expect(state?.isRest).toBe(true);
    expect(state?.isCompleted).toBe(false);
  });

  it("reconoce la sesión de hoy como completada", () => {
    const trainingDaySchedule = schedule.map((day, index) =>
      index === 2
        ? {
            ...day,
            type: "training",
            routineId: "routine_2",
            focus: "Tirón",
          }
        : day,
    );
    const state = getPlanTodayState({
      plan: {
        _id: "plan_1",
        scheduleMode: "fixed",
        startDate: "2026-08-24",
        durationWeeks: 4,
        weeklySchedule: trainingDaySchedule,
      },
      routines: [{ id: "routine_2", name: "Tirón A", exercises: [] }],
      trainings: [
        {
          date: "2026-08-26T18:00:00.000Z",
          routineId: "routine_2",
          trainingPlanId: "plan_1",
          trainingPlanSlotId: "slot_3",
        },
      ],
      now: new Date(2026, 7, 26, 12),
    });

    expect(state?.routine?.name).toBe("Tirón A");
    expect(state?.isRest).toBe(false);
    expect(state?.isCompleted).toBe(true);
  });
});
