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

  it("protege los cambios sin guardar antes de cerrar", async () => {
    const onClose = vi.fn();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
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

    expect(confirm).toHaveBeenCalledWith(
      "Tienes cambios sin guardar. ¿Deseas cerrar la planificación?",
    );
    expect(onClose).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));
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
    await userEvent.click(screen.getByRole("button", { name: "Ciclo libre" }));
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
});
