import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import QuickPlanSetup from "./QuickPlanSetup";
import { getMondayFirstDayIndex } from "../../utils/quickPlan";

const routines = [
  {
    id: "routine-1",
    name: "Fuerza total",
    exercises: [{ exerciseId: "exercise-1" }],
  },
];

describe("QuickPlanSetup", () => {
  it("crea una planificación con la rutina y al menos el día actual", async () => {
    const onCreate = vi.fn().mockResolvedValue({ id: "plan-1" });
    const onStart = vi.fn();
    render(
      <QuickPlanSetup
        routines={routines}
        onCreate={onCreate}
        onClose={vi.fn()}
        onStart={onStart}
        onView={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Organiza tu semana." }),
    ).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: "Crear planificación" }),
    );
    await waitFor(() => expect(onCreate).toHaveBeenCalledOnce());
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        routineId: "routine-1",
        selectedDays: [getMondayFirstDayIndex()],
        durationWeeks: 4,
      }),
    );
    expect(
      screen.getByRole("heading", { name: "Tu plan está listo." }),
    ).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: "Ir a entrenar" }),
    );
    expect(onStart).toHaveBeenCalledWith({ id: "plan-1" });
  });

  it("ofrece abrir el borrador si el plan se creó pero no se activó", async () => {
    const draft = { id: "plan-draft", status: "draft" };
    const error = Object.assign(new Error("No se pudo activar"), {
      draftPlan: draft,
    });
    const onView = vi.fn();
    render(
      <QuickPlanSetup
        routines={routines}
        onCreate={vi.fn().mockRejectedValue(error)}
        onClose={vi.fn()}
        onStart={vi.fn()}
        onView={onView}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Crear planificación" }),
    );
    const openDraft = await screen.findByRole("button", {
      name: "Abrir borrador",
    });
    await userEvent.click(openDraft);
    expect(onView).toHaveBeenCalledWith(draft);
  });

  it("lleva al calendario cuando hoy no es día de entrenamiento", async () => {
    const weekdayNames = [
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
      "Domingo",
    ];
    const todayIndex = getMondayFirstDayIndex();
    const nextIndex = (todayIndex % 7) + 1;
    const plan = { id: "plan-2" };
    const onView = vi.fn();
    render(
      <QuickPlanSetup
        routines={routines}
        onCreate={vi.fn().mockResolvedValue(plan)}
        onClose={vi.fn()}
        onStart={vi.fn()}
        onView={onView}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: weekdayNames[todayIndex - 1] }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: weekdayNames[nextIndex - 1] }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Crear planificación" }),
    );
    const viewPlan = await screen.findByRole("button", {
      name: "Ver mi planificación",
    });
    await userEvent.click(viewPlan);
    expect(onView).toHaveBeenCalledWith(plan);
    expect(screen.queryByRole("button", { name: "Ir a entrenar" })).toBeNull();
  });
});
