import { render, screen, waitFor } from "@testing-library/react";
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
const choose = async () => {
  await userEvent.click(
    screen.getByRole("button", { name: /Torso, 1 ejercicio/ }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: /Pierna, 2 ejercicios/ }),
  );
  await userEvent.click(screen.getByRole("button", { name: /Listo, elegir/ }));
  await userEvent.click(screen.getByRole("button", { name: "Lunes" }));
  await userEvent.click(screen.getByRole("button", { name: "Jueves" }));
};
afterEach(() => {
  sessionStorage.clear();
  vi.clearAllMocks();
});

describe("QuickPlanSetup", () => {
  it("requires both choices and previews the exact assignments before saving", async () => {
    const onCreate = vi
      .fn()
      .mockResolvedValue({ id: "plan-1", status: "active" });
    const onView = vi.fn();
    render(<QuickPlanSetup {...props} onCreate={onCreate} onView={onView} />);
    const create = screen.getByRole("button", { name: /Crear planificaci/ });
    expect(create).toBeDisabled();
    await choose();
    expect(screen.getByLabelText("Rutina del lunes")).toHaveValue("torso");
    expect(screen.getByLabelText("Rutina del jueves")).toHaveValue("pierna");
    expect(onCreate).not.toHaveBeenCalled();
    await userEvent.selectOptions(
      screen.getByLabelText("Rutina del lunes"),
      "pierna",
    );
    expect(create).toBeDisabled(); // Every selected routine must actually be used.
    await userEvent.selectOptions(
      screen.getByLabelText("Rutina del jueves"),
      "torso",
    );
    await userEvent.click(create);
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        routineIds: ["torso", "pierna"],
        selectedDays: [1, 4],
        overrides: { 1: "pierna", 4: "torso" },
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
  it("keeps a failed draft locked and retries it without starting over", async () => {
    const draft = { id: "draft-1", status: "draft" };
    const onCreate = vi
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error("Offline"), { draftPlan: draft }),
      )
      .mockResolvedValue({ id: "draft-1", status: "active" });
    render(<QuickPlanSetup {...props} onCreate={onCreate} />);
    await choose();
    await userEvent.click(
      screen.getByRole("button", { name: /Crear planificaci/ }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Offline");
    expect(screen.getByRole("button", { name: "Lunes" })).toBeDisabled();
    await userEvent.click(
      screen.getByRole("button", { name: /Reintentar creaci/ }),
    );
    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(2));
    expect(onCreate.mock.calls[1][0].existingDraft).toEqual(draft);
  });
  it("preserves selections across routine creation and navigation", async () => {
    const onCreateRoutine = vi.fn();
    const { unmount } = render(
      <QuickPlanSetup
        {...props}
        storageKey="test-plan"
        onCreateRoutine={onCreateRoutine}
      />,
    );
    await choose();
    await userEvent.click(
      screen.getByRole("button", { name: "Cambiar rutinas" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Crear una rutina" }),
    );
    expect(onCreateRoutine).toHaveBeenCalledOnce();
    unmount();
    render(<QuickPlanSetup {...props} storageKey="test-plan" />);
    expect(screen.getByRole("button", { name: "Lunes" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByLabelText("Rutina del jueves")).toHaveValue("pierna");
  });
  it("offers routine creation when the library is empty", async () => {
    const onCreateRoutine = vi.fn();
    render(
      <QuickPlanSetup
        {...props}
        routines={[]}
        onCreateRoutine={onCreateRoutine}
      />,
    );
    expect(
      screen.getByRole("button", { name: /Crear planificaci/ }),
    ).toBeDisabled();
    await userEvent.click(
      screen.getByRole("button", { name: "Crear una rutina" }),
    );
    expect(onCreateRoutine).toHaveBeenCalledOnce();
  });
  it("adds a newly saved routine once and lets the user deselect it", async () => {
    const { rerender } = render(
      <QuickPlanSetup {...props} addedRoutineId="pierna" />,
    );
    expect(screen.getByRole("button", { name: "Quitar Pierna" })).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: "Quitar Pierna" }),
    );
    rerender(
      <QuickPlanSetup
        {...props}
        routines={[...routines]}
        addedRoutineId="pierna"
      />,
    );
    expect(screen.queryByRole("button", { name: "Quitar Pierna" })).toBeNull();
  });
  it("clears the local form on explicit close without persisting a plan", async () => {
    const onClose = vi.fn();
    render(
      <QuickPlanSetup {...props} storageKey="test-plan" onClose={onClose} />,
    );
    await choose();
    expect(sessionStorage.getItem("test-plan")).toContain("torso");
    await userEvent.click(
      screen.getByRole("button", { name: /Cerrar creaci/ }),
    );
    expect(onClose).toHaveBeenCalledOnce();
    expect(sessionStorage.getItem("test-plan")).toBeNull();
    expect(props.onCreate).not.toHaveBeenCalled();
  });
  it("explains the active plan replacement and changes the message for future dates", async () => {
    render(
      <QuickPlanSetup
        {...props}
        activePlan={{ name: "Mes actual" }}
        scheduledPlan={{ name: "Siguiente" }}
      />,
    );
    expect(screen.getByText(/Su historial se conserva/)).toBeVisible();
    await userEvent.clear(screen.getByLabelText("Empieza"));
    await userEvent.type(screen.getByLabelText("Empieza"), "2099-01-01");
    expect(
      screen.getByText(/pausará cualquier otro plan activo/),
    ).toBeVisible();
    expect(screen.getByText(/Siguiente/)).toBeVisible();
  });
});
