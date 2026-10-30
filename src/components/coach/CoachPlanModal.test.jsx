import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CoachPlanModal from "./CoachPlanModal";

const { getCoachWorkflowSettings } = vi.hoisted(() => ({
  getCoachWorkflowSettings: vi.fn(),
}));
vi.mock("../../services/api", () => ({ api: { getCoachWorkflowSettings } }));

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
  beforeEach(() => {
    getCoachWorkflowSettings.mockReset();
    getCoachWorkflowSettings.mockResolvedValue({ followUp: {} });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("permite editar un plan extendido más de un año conservando su fecha final exacta", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <CoachPlanModal
        athlete={{ name: "Laura" }}
        initialData={{
          ...initialPlan,
          durationWeeks: 63,
          startDate: "2026-08-10",
          endDate: "2027-10-26",
        }}
        manageRoutinesSeparately
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(/Finaliza el/)).toHaveTextContent("26 oct");
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onSave.mock.calls[0][0]).toMatchObject({
      durationWeeks: 63,
      startDate: "2026-08-10",
    });
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
      await screen.findByRole("switch", { name: "Activar Peso" }),
    );
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

  it("ofrece solo dos formas de crear y abre directamente una planificación desde cero", async () => {
    render(
      <CoachPlanModal
        athlete={{
          name: "Laura M.",
          profile: { goal: "strength" },
        }}
        manageRoutinesSeparately
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("¿Cómo quieres empezar?")).toBeVisible();
    expect(
      screen.getByRole("button", { name: /Usar una plantilla/ }),
    ).toBeVisible();
    expect(screen.queryByText("Recomendado")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Duplicar plan anterior/ }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: /Plan rápido/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Continuar" })).toBeNull();

    await userEvent.click(
      screen.getByRole("button", { name: /Crear planificación desde cero/ }),
    );
    expect(screen.getByText("Datos del plan")).toBeVisible();
  });

  it("personaliza la plantilla elegida sin asignarla antes de confirmar", async () => {
    const onSave = vi.fn();
    render(
      <CoachPlanModal
        athlete={{ name: "Laura" }}
        planTemplates={[
          {
            ...initialPlan,
            _id: "template-1",
            name: "Fuerza base",
            durationWeeks: 6,
          },
        ]}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Usar una plantilla/ }),
    );
    await userEvent.click(screen.getByRole("button", { name: /Fuerza base/ }));
    expect(screen.getByLabelText("Nombre del plan")).toHaveValue("Fuerza base");
    expect(screen.getByText("Datos del plan")).toBeVisible();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("permite crear desde cero cuando todavía no hay plantillas", async () => {
    render(
      <CoachPlanModal
        athlete={{ name: "Laura" }}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Usar una plantilla/ }),
    );
    expect(screen.getByText("Todavía no tienes plantillas")).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: "Crear planificación desde cero" }),
    );
    expect(screen.getByLabelText("Nombre del plan")).toHaveValue(
      "Nueva planificación",
    );
    expect(screen.queryByText("Plantillas disponibles")).toBeNull();
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

  it("marca los días como entrenamiento y al desmarcarlos muestra descanso sin otro selector", async () => {
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
    expect(screen.queryByText(/Recuperación activa/i)).toBeNull();
    expect(
      screen.getByRole("button", { name: "Entrenar Martes", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(
      screen.getByRole("button", { name: "Entrenar Martes", exact: true }),
    );
    expect(
      screen.getByRole("button", { name: "Entrenar Martes", exact: true }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.queryByRole("button", { name: "Editar sesión de Martes" }),
    ).toBeNull();
    await userEvent.click(
      screen.getByRole("button", { name: "Entrenar Jueves", exact: true }),
    );
    expect(
      screen.getByRole("button", { name: "Entrenar Jueves", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "Editar sesión de Jueves" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("dialog", { name: "Elegir actividad del día" }),
    ).toBeNull();
    expect(screen.getAllByText("Descanso")).toHaveLength(4);
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onSave.mock.calls[0][0].weeklySchedule[1]).toMatchObject({
      type: "rest",
      focus: "",
      sourceRoutineId: "",
      routineId: "",
    });
    expect(onSave.mock.calls[0][0].weeklySchedule[3]).toMatchObject({
      type: "training",
    });
    expect(onSave.mock.calls[0][0].weeklySchedule[0].focus).toBe("Enfoque 1");
  });
  it("también usa entrenamiento o descanso en el ciclo libre y añade días sin marcar", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <CoachPlanModal
        athlete={{ name: "Atleta" }}
        initialData={{ ...initialPlan, scheduleMode: "sequential_cycle" }}
        manageRoutinesSeparately
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("tab", { name: "Semana" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Entrenar día 2", exact: true }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Agregar un día al ciclo" }),
    );
    expect(
      screen.getByRole("button", { name: "Entrenar día 8", exact: true }),
    ).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(
      screen.getByRole("button", { name: "Entrenar día 8", exact: true }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    const days = onSave.mock.calls[0][0].weeklySchedule;
    expect(days[1].type).toBe("rest");
    expect(days[7].type).toBe("training");
    expect(days.every((day) => ["training", "rest"].includes(day.type))).toBe(
      true,
    );
  });

  it.each([false, true])(
    "adapta una planificación anterior con recuperación a descanso (plantilla: %s)",
    async (asTemplate) => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const legacyPlan = {
        ...initialPlan,
        weeklySchedule: createFixedSchedule().map((day, index) =>
          index === 1 ? { ...day, type: "recovery", focus: "Movilidad" } : day,
        ),
      };
      render(
        <CoachPlanModal
          athlete={{ name: "Atleta" }}
          {...(asTemplate
            ? {
                initialPlanTemplateId: legacyPlan._id,
                planTemplates: [legacyPlan],
              }
            : { initialData: legacyPlan })}
          manageRoutinesSeparately
          onSave={onSave}
          onClose={vi.fn()}
        />,
      );
      if (asTemplate)
        await userEvent.click(
          screen.getByRole("button", { name: /Continuar: organizar semana/ }),
        );
      else await userEvent.click(screen.getByRole("tab", { name: "Semana" }));
      expect(
        screen.getByRole("button", { name: "Entrenar Martes", exact: true }),
      ).toHaveAttribute("aria-pressed", "false");
      expect(screen.queryByText(/Recuperación|Movilidad/)).toBeNull();
      await userEvent.click(
        screen.getByRole("button", {
          name: asTemplate ? "Guardar" : "Guardar cambios",
          exact: true,
        }),
      );
      await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
      expect(onSave.mock.calls[0][0].weeklySchedule[1]).toMatchObject({
        type: "rest",
        focus: "",
        sourceRoutineId: "",
        routineId: "",
      });
    },
  );

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
      screen.getByRole("button", { name: "Seleccionar rutina para Lunes" }),
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

    expect(await screen.findByText("Tareas de seguimiento")).toBeVisible();
    expect(screen.getByText("Laura M.")).toBeVisible();
    expect(screen.getByText(/Objetivo/)).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "General del coach" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Personalizado" })).toBeNull();
    expect(screen.getAllByText("General")).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: /Peso/ }));

    expect(screen.getByText("Obligatorio para el alumno")).toBeVisible();
    expect(screen.queryByLabelText("Cerrar edición de seguimiento")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Guardar cambios" }),
    ).toBeVisible();
    await userEvent.click(screen.getByRole("tab", { name: "General" }));
    expect(screen.getByLabelText("Nombre del plan")).toHaveValue("Plan actual");
  });

  it("carga las reglas reales del perfil y conserva las demás tareas al ajustar al alumno", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    getCoachWorkflowSettings.mockResolvedValue({
      followUp: {
        weight: {
          enabled: true,
          frequencyInterval: 2,
          frequencyUnit: "week",
          weekday: 5,
          required: false,
        },
        photos: { enabled: false, views: ["front"] },
        review: { enabled: true, intervalWeeks: 8, leadDays: 3 },
      },
    });
    render(
      <CoachPlanModal
        athlete={{ name: "Laura" }}
        initialData={initialPlan}
        manageRoutinesSeparately
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("tab", { name: "Seguimiento" }));
    expect(
      await screen.findByRole("switch", { name: "Activar Fotos de progreso" }),
    ).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("button", { name: /Peso/ })).toHaveTextContent(
      "Cada 2 semanas · Viernes",
    );
    await userEvent.click(screen.getByRole("switch", { name: "Activar Peso" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onSave.mock.calls[0][0].followUp).toMatchObject({
      useCoachDefaults: false,
      weight: {
        enabled: false,
        frequencyInterval: 2,
        weekday: 5,
        required: false,
      },
      photos: { enabled: false, views: ["front"] },
      review: { intervalWeeks: 8, leadDays: 3 },
    });
  });

  it("consultar las tareas heredadas no marca cambios ni rompe la herencia del perfil", async () => {
    const onClose = vi.fn();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <CoachPlanModal
        athlete={{ name: "Laura" }}
        initialData={initialPlan}
        manageRoutinesSeparately
        onSave={onSave}
        onClose={onClose}
      />,
    );
    await userEvent.click(screen.getByRole("tab", { name: "Seguimiento" }));
    await userEvent.click(await screen.findByRole("button", { name: /Peso/ }));
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onSave.mock.calls[0][0].followUp.useCoachDefaults).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("conserva los ajustes específicos ya guardados para un alumno", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <CoachPlanModal
        athlete={{ name: "Laura" }}
        initialData={{
          ...initialPlan,
          followUp: { useCoachDefaults: false, weight: { enabled: false } },
        }}
        manageRoutinesSeparately
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("tab", { name: "Seguimiento" }));
    expect(
      screen.getByRole("switch", { name: "Activar Peso" }),
    ).toHaveAttribute("aria-checked", "false");
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onSave.mock.calls[0][0].followUp).toMatchObject({
      useCoachDefaults: false,
      weight: { enabled: false },
    });
    expect(getCoachWorkflowSettings).not.toHaveBeenCalled();
  });

  it("muestra el seguimiento efectivo del plan sin sustituirlo por valores predeterminados", async () => {
    render(
      <CoachPlanModal
        athlete={{ name: "Laura" }}
        initialData={{
          ...initialPlan,
          followUp: { useCoachDefaults: true, weight: { enabled: true } },
          effectiveFollowUp: { weight: { enabled: false } },
        }}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("tab", { name: "Seguimiento" }));
    expect(
      screen.getByRole("switch", { name: "Activar Peso" }),
    ).toHaveAttribute("aria-checked", "false");
    expect(getCoachWorkflowSettings).not.toHaveBeenCalled();
  });

  it("no solicita el perfil de coach al crear planes de un usuario independiente", async () => {
    render(
      <CoachPlanModal
        athlete={{ name: "Laura" }}
        initialData={initialPlan}
        loadCoachSettings={false}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("tab", { name: "Seguimiento" }));
    expect(screen.getByRole("switch", { name: "Activar Peso" })).toBeVisible();
    expect(getCoachWorkflowSettings).not.toHaveBeenCalled();
  });

  it("permite reintentar la carga sin editar valores de ejemplo", async () => {
    getCoachWorkflowSettings.mockRejectedValueOnce(new Error("Sin conexión"));
    render(
      <CoachPlanModal
        athlete={{ name: "Laura" }}
        initialData={initialPlan}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("tab", { name: "Seguimiento" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudieron cargar",
    );
    expect(screen.queryByRole("switch", { name: "Activar Peso" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(
      await screen.findByRole("switch", { name: "Activar Peso" }),
    ).toBeVisible();
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
