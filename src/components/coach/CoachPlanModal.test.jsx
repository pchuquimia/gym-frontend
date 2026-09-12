import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import CoachPlanModal from "./CoachPlanModal";

const createFixedSchedule = () =>
  Array.from({ length: 7 }, (_, index) => ({
    dayIndex: index + 1,
    slotId: `existing_slot_${index + 1}`,
    order: index + 1,
    type: index < 3 ? "training" : "rest",
    focus: index < 3 ? `Enfoque ${index + 1}` : "",
    sourceRoutineId: index < 3 ? `routine_${index + 1}` : "",
    routineId: index < 3 ? `routine_${index + 1}` : null,
  }));

const initialPlan = {
  _id: "plan_1",
  name: "Plan actual",
  level: "intermediate",
  goal: "Fuerza",
  durationWeeks: 8,
  startDate: "2026-08-13",
  scheduleMode: "fixed",
  notes: "",
  weeklySchedule: createFixedSchedule(),
};

describe("CoachPlanModal", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("conserva los datos entre pestañas y guarda directamente desde seguimiento", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <CoachPlanModal
        athlete={{ name: "Laura" }}
        initialData={initialPlan}
        manageRoutinesSeparately
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );
    await userEvent.clear(screen.getByLabelText("Nombre del plan"));
    await userEvent.type(
      screen.getByLabelText("Nombre del plan"),
      "Fuerza actualizada",
    );
    await userEvent.click(screen.getByRole("tab", { name: "Seguimiento" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Personalizado" }),
    );
    await userEvent.click(screen.getByRole("switch", { name: "Activar Peso" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onSave.mock.calls[0][0]).toMatchObject({
      name: "Fuerza actualizada",
      followUp: { useCoachDefaults: false, weight: { enabled: false } },
    });
  });

  it("dirige a General y explica un dato inválido al guardar desde otra pestaña", async () => {
    const onSave = vi.fn();
    render(
      <CoachPlanModal
        athlete={{ name: "Laura" }}
        initialData={initialPlan}
        manageRoutinesSeparately
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );
    await userEvent.clear(screen.getByLabelText("Nombre del plan"));
    await userEvent.click(screen.getByRole("tab", { name: "Semana" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("tab", { name: "General" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Escribe un nombre para el plan.")).toBeVisible();
  });

  it("mantiene la selección de inicio antes de crear la planificación", async () => {
    render(
      <CoachPlanModal
        athlete={{
          name: "Laura M.",
          profile: { goal: "strength" },
        }}
        replacingPlan={initialPlan}
        manageRoutinesSeparately
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("¿Cómo quieres empezar?")).toBeVisible();
    expect(screen.getByText("Recomendado")).toBeVisible();
    expect(screen.getByRole("button", { name: /Desde cero/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByRole("button", { name: /Usar plantilla/ }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: /Duplicar plan anterior/ }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: /Plan rápido/ })).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("Datos del plan")).toBeVisible();
  });

  it("protege los cambios sin guardar antes de cerrar", async () => {
    const onClose = vi.fn();
    const confirm = vi.spyOn(window, "confirm");
    render(
      <CoachPlanModal
        athlete={{ name: "Atleta" }}
        initialData={initialPlan}
        manageRoutinesSeparately
        onSave={vi.fn()}
        onClose={onClose}
      />,
    );

    await userEvent.clear(screen.getByLabelText("Nombre del plan"));
    await userEvent.type(screen.getByLabelText("Nombre del plan"), "Otro plan");
    await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));

    expect(confirm).not.toHaveBeenCalled();
    expect(screen.getByText("¿Salir de la planificación?")).toBeVisible();
    expect(onClose).not.toHaveBeenCalled();

    await userEvent.click(
      screen.getByRole("button", { name: "Seguir editando" }),
    );
    expect(screen.queryByText("¿Salir de la planificación?")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Descartar cambios" }),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("conserva las sesiones al cambiar de semana fija a ciclo libre", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <CoachPlanModal
        athlete={{ name: "Atleta" }}
        initialData={initialPlan}
        manageRoutinesSeparately
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("tab", { name: "Semana" }));
    await userEvent.click(
      screen.getByRole("button", { name: /Ciclo flexible/ }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Aplicar cambio" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const payload = onSave.mock.calls[0][0];
    expect(payload.scheduleMode).toBe("sequential_cycle");
    expect(payload.weeklySchedule).toHaveLength(7);
    expect(payload.weeklySchedule).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slotId: "existing_slot_1",
          sourceRoutineId: "routine_1",
        }),
      ]),
    );
    expect(
      payload.weeklySchedule.some((day) =>
        day.slotId.startsWith("existing_slot_"),
      ),
    ).toBe(true);
  });

  it("elige la actividad del día sin confirmación y no cierra al tocar fuera", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <CoachPlanModal
        athlete={{ name: "Atleta" }}
        initialData={initialPlan}
        manageRoutinesSeparately
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("tab", { name: "Semana" }));

    await userEvent.click(
      screen.getByRole("button", { name: "Editar Lunes: Entrenar" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Elegir actividad del día" }),
    ).toBeVisible();

    await userEvent.click(screen.getByTestId("day-activity-backdrop"));
    expect(
      screen.getByRole("dialog", { name: "Elegir actividad del día" }),
    ).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: "Cerrar selección de actividad" }),
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Editar Martes: Entrenar" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Elegir Descanso" }),
    );
    expect(
      screen.queryByRole("dialog", { name: "Elegir actividad del día" }),
    ).toBeNull();
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].weeklySchedule[0].focus).toBe("Enfoque 1");
    expect(onSave.mock.calls[0][0].weeklySchedule[1]).toMatchObject({
      type: "rest",
      sourceRoutineId: "",
    });
  });

  it("abre directamente la edición de una rutina ya asignada", async () => {
    const onEditRoutine = vi.fn();
    const sourceRoutine = {
      id: "source_1",
      name: "Plantilla global",
      exercises: [],
    };
    const assignedRoutine = {
      id: "assigned_1",
      name: "Tren superior del alumno",
      exercises: [],
    };
    const personalizedPlan = {
      ...initialPlan,
      weeklySchedule: createFixedSchedule().map((day, index) =>
        index === 0
          ? {
              ...day,
              sourceRoutineId: "source_1",
              routineId: "assigned_1",
            }
          : day,
      ),
    };
    render(
      <CoachPlanModal
        athlete={{ name: "Atleta" }}
        initialData={personalizedPlan}
        templates={[sourceRoutine]}
        assignedRoutines={[assignedRoutine]}
        onEditRoutine={onEditRoutine}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("tab", { name: "Semana" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Editar sesión de Lunes" }),
    );

    expect(onEditRoutine).toHaveBeenCalledWith(
      assignedRoutine,
      expect.objectContaining({
        sourceRoutineId: "source_1",
        routineId: "assigned_1",
      }),
    );
    expect(
      screen.queryByRole("dialog", { name: "Elegir actividad del día" }),
    ).toBeNull();
  });

  it("abre la biblioteca al seleccionar una rutina y vuelve a Semana al elegirla", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const planWithoutMondayRoutine = {
      ...initialPlan,
      weeklySchedule: createFixedSchedule().map((day, index) =>
        index === 0
          ? { ...day, focus: "", sourceRoutineId: "", routineId: null }
          : day,
      ),
    };
    render(
      <CoachPlanModal
        athlete={{ name: "Atleta" }}
        initialData={planWithoutMondayRoutine}
        templates={[
          {
            id: "routine_push",
            name: "Empuje completo",
            exercises: [{ id: "exercise_1" }, { id: "exercise_2" }],
            exerciseOrderMode: "free",
          },
        ]}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("tab", { name: "Semana" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Editar Lunes: Entrenar" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Elegir Entrenamiento" }),
    );

    expect(
      screen.getByRole("heading", { name: "Seleccionar rutina" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Buscar rutina")).toBeVisible();
    expect(screen.getByText("2 ejercicios · Orden libre")).toBeVisible();

    await userEvent.click(
      screen.getByRole("button", { name: "Elegir rutina Empuje completo" }),
    );

    expect(screen.getByRole("tab", { name: "Semana" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Empuje completo")).toBeVisible();

    await userEvent.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].weeklySchedule[0].sourceRoutineId).toBe(
      "routine_push",
    );
  });

  it("precarga la base del plan desde la evaluación del alumno", () => {
    render(
      <CoachPlanModal
        athlete={{
          name: "Laura M.",
          profile: {
            goal: "strength",
            experienceLevel: "intermediate",
            weeklyFrequency: 3,
          },
          coachIntake: {
            status: "submitted",
            submittedAt: "2026-09-09T12:00:00.000Z",
            answers: [],
          },
        }}
        initialSource="evaluation"
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Sugerido desde su evaluación")).toBeVisible();
    expect(screen.getByLabelText("Nombre del plan")).toHaveValue(
      "Fuerza · Bloque inicial",
    );
    expect(
      screen.getByRole("button", { name: "Ganar fuerza" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("permite activar ahora o programar el inicio al revisar un plan nuevo", async () => {
    render(
      <CoachPlanModal
        athlete={{
          name: "Laura M.",
          coachIntake: {
            status: "submitted",
            submittedAt: "2026-09-09T12:00:00.000Z",
            answers: [],
          },
        }}
        initialSource="evaluation"
        manageRoutinesSeparately
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /Continuar: organizar semana/ }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Revisar planificación/ }),
    );

    expect(screen.getByText("Inicio del plan")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Activar ahora" }),
    ).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(
      screen.getByRole("button", { name: "Programar fecha" }),
    );
    expect(screen.getByText("Fecha de activación")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Crear planificación" }),
    ).toBeVisible();
  });

  it("gestiona el seguimiento del alumno en cards editables sin abrir otro panel", async () => {
    render(
      <CoachPlanModal
        athlete={{ name: "Laura M." }}
        initialData={initialPlan}
        manageRoutinesSeparately
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("tab", { name: "Seguimiento" }));

    expect(screen.getByText("Tareas de seguimiento")).toBeVisible();
    expect(screen.getByText("Laura M.")).toBeVisible();
    expect(screen.getByText(/Objetivo/)).toBeVisible();
    expect(screen.getAllByText("General")).toHaveLength(7);

    await userEvent.click(
      screen.getByRole("button", { name: "Personalizado" }),
    );
    await userEvent.click(screen.getByRole("button", { name: /Peso/ }));

    expect(screen.getByText("Obligatorio para el alumno")).toBeVisible();
    expect(screen.queryByLabelText("Cerrar edición de seguimiento")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Guardar cambios" }),
    ).toBeVisible();
    await userEvent.click(screen.getByRole("tab", { name: "General" }));
    expect(screen.getByLabelText("Nombre del plan")).toHaveValue("Plan actual");
  });

  it("permite guardar y asignar un borrador existente desde móvil", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <CoachPlanModal
        athlete={{ name: "Laura M." }}
        initialData={{ ...initialPlan, status: "draft" }}
        manageRoutinesSeparately
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Guardar borrador" }),
    ).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar y asignar" }),
    );
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onSave.mock.calls[0][1]).toEqual({
      activate: true,
      notifyAthlete: true,
    });
  });
});
