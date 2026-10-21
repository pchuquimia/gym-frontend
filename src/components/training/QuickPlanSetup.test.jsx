import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import QuickPlanSetup from "./QuickPlanSetup";

const routines = [
  { id: "torso", name: "Torso", exercises: [{}] },
  { id: "pierna", name: "Pierna", exercises: [{}, {}] },
];
const props = {
  routines,
  onCreate: vi.fn(),
  onClose: vi.fn(),
  onView: vi.fn(),
};
const placeWeek = async () => {
  await userEvent.click(
    screen.getByRole("button", { name: "Lunes: Descanso", exact: true }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Colocar Pierna", exact: true }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Jueves: Descanso", exact: true }),
  );
};
afterEach(() => {
  sessionStorage.clear();
  vi.clearAllMocks();
});

describe("QuickPlanSetup", () => {
  it("uses the routine creation dialog and creates directly from the visible week", async () => {
    const onCreate = vi
      .fn()
      .mockResolvedValue({ id: "plan-1", status: "active" });
    const onView = vi.fn();
    render(<QuickPlanSetup {...props} onCreate={onCreate} onView={onView} />);
    expect(
      screen.getByRole("dialog", { name: "Nueva planificación" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Volver" })).toBeVisible();
    const create = screen.getByRole("button", { name: "Crear planificación" });
    expect(create).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Listo, elegir/ })).toBeNull();
    expect(screen.queryByLabelText("Rutina del lunes")).toBeNull();
    await placeWeek();
    expect(screen.getByRole("button", { name: "Lunes: Torso" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Jueves: Pierna" }),
    ).toBeVisible();
    expect(onCreate).not.toHaveBeenCalled();
    await userEvent.click(create);
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        routineIds: ["torso", "pierna"],
        selectedDays: [1, 4],
        overrides: { 1: "torso", 4: "pierna" },
        durationWeeks: 4,
      }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Ver mi plan" }),
    );
    expect(onView).toHaveBeenCalledWith(
      expect.objectContaining({ id: "plan-1" }),
    );
  });
  it("replaces a routine on a day and supports both direct toggle and rest mode", async () => {
    render(<QuickPlanSetup {...props} />);
    await placeWeek();
    await userEvent.click(screen.getByRole("button", { name: "Lunes: Torso" }));
    expect(screen.getByRole("button", { name: "Lunes: Pierna" })).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: "Lunes: Pierna" }),
    );
    expect(
      screen.getByRole("button", { name: "Lunes: Descanso" }),
    ).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: "Colocar descanso" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Jueves: Pierna" }),
    );
    expect(
      screen.getByRole("button", { name: "Crear planificación" }),
    ).toBeDisabled();
  });
  it("keeps a failed draft locked and retries the same plan", async () => {
    const draft = { id: "draft-1", status: "draft" };
    const onCreate = vi
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error("Offline"), { draftPlan: draft }),
      )
      .mockResolvedValue({ id: "draft-1", status: "active" });
    render(<QuickPlanSetup {...props} onCreate={onCreate} />);
    await placeWeek();
    await userEvent.click(
      screen.getByRole("button", { name: "Crear planificación" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Offline");
    expect(screen.getByRole("button", { name: "Lunes: Torso" })).toBeDisabled();
    await userEvent.click(
      screen.getByRole("button", { name: "Reintentar creación" }),
    );
    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(2));
    expect(onCreate.mock.calls[1][0].existingDraft).toEqual(draft);
  });
  it("preserves the painted week across creating a routine and navigation", async () => {
    const onCreateRoutine = vi.fn();
    const { unmount } = render(
      <QuickPlanSetup
        {...props}
        storageKey="test-plan"
        onCreateRoutine={onCreateRoutine}
      />,
    );
    await placeWeek();
    await userEvent.click(
      screen.getByRole("button", { name: "Crear una rutina" }),
    );
    expect(onCreateRoutine).toHaveBeenCalledOnce();
    unmount();
    render(<QuickPlanSetup {...props} storageKey="test-plan" />);
    expect(
      screen.getByRole("button", { name: "Lunes: Torso" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "Jueves: Pierna" }),
    ).toBeVisible();
  });
  it("restores drafts from the previous multi-selection form", () => {
    sessionStorage.setItem(
      "legacy",
      JSON.stringify({
        routineIds: ["torso", "pierna"],
        selectedDays: [1, 4],
        overrides: { 4: "torso" },
      }),
    );
    render(<QuickPlanSetup {...props} storageKey="legacy" />);
    expect(screen.getByRole("button", { name: "Lunes: Torso" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Jueves: Torso" })).toBeVisible();
  });
  it("offers routine creation from an empty library", async () => {
    const onCreateRoutine = vi.fn();
    render(
      <QuickPlanSetup
        {...props}
        routines={[]}
        onCreateRoutine={onCreateRoutine}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Lunes: Descanso" }),
    );
    expect(
      screen.getByRole("button", { name: "Crear planificación" }),
    ).toBeDisabled();
    await userEvent.click(
      screen.getByRole("button", { name: "Crear una rutina" }),
    );
    expect(onCreateRoutine).toHaveBeenCalledOnce();
  });
  it("arms a newly created routine without assigning an unintended day", async () => {
    const { rerender } = render(
      <QuickPlanSetup {...props} addedRoutineId="pierna" />,
    );
    expect(
      screen.getByRole("button", { name: "Colocar Pierna" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "Crear planificación" }),
    ).toBeDisabled();
    await userEvent.click(
      screen.getByRole("button", { name: "Colocar Torso" }),
    );
    rerender(
      <QuickPlanSetup
        {...props}
        routines={[...routines]}
        addedRoutineId="pierna"
      />,
    );
    expect(
      screen.getByRole("button", { name: "Colocar Torso" }),
    ).toHaveAttribute("aria-pressed", "true");
  });
  it("clears the local form on explicit close without saving a plan", async () => {
    const onClose = vi.fn();
    render(
      <QuickPlanSetup {...props} storageKey="test-plan" onClose={onClose} />,
    );
    await placeWeek();
    expect(sessionStorage.getItem("test-plan")).toContain("torso");
    await userEvent.click(screen.getByRole("button", { name: "Volver" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(sessionStorage.getItem("test-plan")).toBeNull();
    expect(props.onCreate).not.toHaveBeenCalled();
  });
  it("keeps date and duration optional and explains switching active plans", async () => {
    render(
      <QuickPlanSetup
        {...props}
        activePlan={{ name: "Mes actual" }}
        scheduledPlan={{ name: "Siguiente" }}
      />,
    );
    expect(screen.getByText(/Su historial se conserva/)).toBeVisible();
    await userEvent.click(screen.getByText("Ajustar"));
    fireEvent.change(screen.getByLabelText("Empieza"), {
      target: { value: "2099-01-01" },
    });
    expect(screen.getByText(/Se activará en la fecha elegida/)).toBeVisible();
    expect(screen.getByText(/Siguiente.*quedará en pausa/)).toBeVisible();
  });
});
