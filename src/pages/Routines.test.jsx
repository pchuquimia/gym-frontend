import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getAssignableRoutines,
  getPlanTodayState,
  RoutineModal,
  TrainingPlanSchedule,
} from "./Routines";

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

afterEach(() => {
  localStorage.removeItem("routine_edit_library_draft");
});

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
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    expect(screen.getByLabelText("Opciones de Empuje A")).toBeVisible();
    expect(screen.getByRole("button", { name: "Listo" })).toBeVisible();
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

  it("reconoce una rutina completada aunque se entrene otro día de la misma semana", () => {
    render(
      <TrainingPlanSchedule
        plan={{
          _id: "plan_1",
          status: "completed",
          scheduleMode: "fixed",
          startDate: "2026-08-10",
          durationWeeks: 4,
          weeklySchedule: schedule,
        }}
        routines={[
          {
            id: "routine_1",
            name: "Empuje A",
            exercises: [{ name: "Press", sets: 3 }],
          },
        ]}
        trainings={[
          {
            date: "2026-09-02",
            routineId: "routine_1",
            trainingPlanId: "plan_1",
            trainingPlanSlotId: "slot_1",
          },
        ]}
        selectedWeek={3}
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

    expect(screen.getByText("1 de 2 realizados")).toBeVisible();
    expect(screen.getByText("Completada")).toBeVisible();
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

describe("getAssignableRoutines", () => {
  it("muestra una sola opción por rutina y prioriza la copia del plan actual", () => {
    const original = {
      id: "routine_lower",
      name: "Lower A",
      kind: "personal",
    };
    const continuationCopy = {
      id: "routine_lower_continuation",
      name: "Lower A",
      kind: "assigned",
      sourceRoutineId: "routine_lower",
      trainingPlanId: "plan_continuation",
      isAvailableForTraining: false,
    };
    const result = getAssignableRoutines([original, continuationCopy], {
      id: "plan_continuation",
      weeklySchedule: [
        { type: "training", routineId: "routine_lower_continuation" },
      ],
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("routine_lower_continuation");
  });

  it("conserva una copia creada por el usuario cuando tiene otro nombre", () => {
    const result = getAssignableRoutines(
      [
        { id: "routine_lower", name: "Lower A", kind: "personal" },
        {
          id: "routine_lower_copy",
          name: "Lower A (Copia)",
          sourceRoutineId: "routine_lower",
          kind: "personal",
        },
      ],
      { id: "plan_new", weeklySchedule: [] },
    );

    expect(result.map((routine) => routine.id)).toEqual([
      "routine_lower",
      "routine_lower_copy",
    ]);
  });
});

describe("RoutineModal drafts", () => {
  it("guarda automáticamente el avance de una rutina nueva", async () => {
    localStorage.removeItem("routine_edit_library_draft");
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      value: vi.fn(),
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const availableExercises = [
      { id: "press", name: "Press", muscle: "Pecho", branches: ["general"] },
      {
        id: "raise",
        name: "Elevación lateral",
        muscle: "Hombros",
        branches: ["general"],
      },
      {
        id: "extension",
        name: "Extensión",
        muscle: "Triceps",
        branches: ["general"],
      },
    ];

    render(
      <QueryClientProvider client={queryClient}>
        <RoutineModal
          mode="create"
          availableExercises={availableExercises}
          existingRoutines={[]}
          onSave={vi.fn()}
          onClose={vi.fn()}
        />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Empuje" }));

    await waitFor(() => {
      expect(localStorage.getItem("routine_edit_library_draft")).toBeTruthy();
    });
    const draft = JSON.parse(
      localStorage.getItem("routine_edit_library_draft"),
    );
    expect(draft.origin).toBe("autosave");
    expect(draft.editor.routineType).toBe("push");
    expect(draft.editor.selectedSetupMuscles).toEqual([
      "Pecho",
      "Hombros",
      "Triceps",
    ]);
    expect(draft.routine.name).toBe("Pecho · Hombros · Triceps");
  });
});
