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
    expect(screen.getByText("Define la base del plan")).toBeVisible();
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

  it("crea bloques nuevos al cambiar de semana fija a ciclo libre", async () => {
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

    await userEvent.click(screen.getByRole("button", { name: /Continuar/ }));
    await userEvent.click(
      screen.getByRole("button", { name: /Ciclo flexible/ }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const payload = onSave.mock.calls[0][0];
    expect(payload.scheduleMode).toBe("sequential_cycle");
    expect(payload.weeklySchedule).toHaveLength(4);
    expect(payload.weeklySchedule).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slotId: expect.stringMatching(/^slot_sequential_cycle_/),
          sourceRoutineId: "",
        }),
      ]),
    );
    expect(
      payload.weeklySchedule.some((day) =>
        day.slotId.startsWith("existing_slot_"),
      ),
    ).toBe(false);
  });

  it("edita un solo día a la vez desde el resumen semanal", async () => {
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

    await userEvent.click(screen.getByRole("button", { name: /Continuar/ }));

    expect(screen.queryByLabelText("Enfoque de Lunes")).toBeNull();
    expect(screen.queryByLabelText("Enfoque de Martes")).toBeNull();

    await userEvent.click(
      screen.getByRole("button", { name: "Editar Lunes: Entrenar" }),
    );
    expect(screen.getByLabelText("Enfoque de Lunes")).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: "Cerrar edición del día" }),
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Editar Martes: Entrenar" }),
    );
    expect(screen.getByLabelText("Enfoque de Martes")).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: "Descansar" }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar día" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].weeklySchedule[1]).toMatchObject({
      type: "rest",
      sourceRoutineId: "",
    });
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
});
