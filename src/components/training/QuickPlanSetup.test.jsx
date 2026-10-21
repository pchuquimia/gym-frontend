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
const configureWeek = async () => {
  await userEvent.selectOptions(
    screen.getByLabelText("Rutina del lunes"),
    "torso",
  );
  await userEvent.selectOptions(
    screen.getByLabelText("Rutina del jueves"),
    "pierna",
  );
};
afterEach(() => {
  sessionStorage.clear();
  vi.clearAllMocks();
});

describe("QuickPlanSetup", () => {
  it("shows only the week and saves exactly the routines chosen for its days", async () => {
    const onCreate = vi
      .fn()
      .mockResolvedValue({ id: "plan-1", status: "active" });
    const onView = vi.fn();
    render(<QuickPlanSetup {...props} onCreate={onCreate} onView={onView} />);
    expect(
      screen.getByRole("dialog", { name: "Nueva planificación" }),
    ).toBeVisible();
    const create = screen.getByRole("button", { name: "Crear planificación" });
    expect(create).toBeDisabled();
    expect(
      screen.getAllByRole("combobox", { name: /^Rutina del/ }),
    ).toHaveLength(7);
    expect(
      screen.queryByRole("button", { name: /Colocar|Listo, elegir|Ver todas/ }),
    ).toBeNull();
    await configureWeek();
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
  it("replaces a routine without affecting other days and can return all days to rest", async () => {
    render(<QuickPlanSetup {...props} />);
    await configureWeek();
    await userEvent.selectOptions(
      screen.getByLabelText("Rutina del lunes"),
      "pierna",
    );
    expect(screen.getByLabelText("Rutina del jueves")).toHaveValue("pierna");
    await userEvent.selectOptions(
      screen.getByLabelText("Rutina del lunes"),
      "",
    );
    await userEvent.selectOptions(
      screen.getByLabelText("Rutina del jueves"),
      "",
    );
    expect(
      screen.getByRole("button", { name: "Crear planificación" }),
    ).toBeDisabled();
  });
  it("locks a failed server draft and retries that same draft", async () => {
    const draft = { id: "draft-1", status: "draft" };
    const onCreate = vi
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error("Offline"), { draftPlan: draft }),
      )
      .mockResolvedValue({ id: "draft-1", status: "active" });
    render(<QuickPlanSetup {...props} onCreate={onCreate} />);
    await configureWeek();
    await userEvent.click(
      screen.getByRole("button", { name: "Crear planificación" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Offline");
    expect(screen.getByLabelText("Rutina del lunes")).toBeDisabled();
    await userEvent.click(
      screen.getByRole("button", { name: "Reintentar creación" }),
    );
    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(2));
    expect(onCreate.mock.calls[1][0].existingDraft).toEqual(draft);
  });
  it("preserves the week when navigating to create a routine", async () => {
    const onCreateRoutine = vi.fn();
    const { unmount } = render(
      <QuickPlanSetup
        {...props}
        storageKey="test-plan"
        onCreateRoutine={onCreateRoutine}
      />,
    );
    await configureWeek();
    await userEvent.click(screen.getByRole("button", { name: "Crear rutina" }));
    expect(onCreateRoutine).toHaveBeenCalledOnce();
    unmount();
    render(<QuickPlanSetup {...props} storageKey="test-plan" />);
    expect(screen.getByLabelText("Rutina del lunes")).toHaveValue("torso");
    expect(screen.getByLabelText("Rutina del jueves")).toHaveValue("pierna");
  });
  it("restores both earlier draft formats without changing their assignments", () => {
    sessionStorage.setItem(
      "legacy",
      JSON.stringify({
        routineIds: ["torso", "pierna"],
        selectedDays: [1, 4],
        overrides: { 4: "torso" },
      }),
    );
    const { unmount } = render(
      <QuickPlanSetup {...props} storageKey="legacy" />,
    );
    expect(screen.getByLabelText("Rutina del lunes")).toHaveValue("torso");
    expect(screen.getByLabelText("Rutina del jueves")).toHaveValue("torso");
    unmount();
    sessionStorage.setItem(
      "paint",
      JSON.stringify({ dayRoutines: { 2: "pierna" }, paintRoutineId: "torso" }),
    );
    render(<QuickPlanSetup {...props} storageKey="paint" />);
    expect(screen.getByLabelText("Rutina del martes")).toHaveValue("pierna");
    expect(screen.getByLabelText("Rutina del lunes")).toHaveValue("");
  });
  it("offers a clear action when the routine library is empty", async () => {
    const onCreateRoutine = vi.fn();
    render(
      <QuickPlanSetup
        {...props}
        routines={[]}
        onCreateRoutine={onCreateRoutine}
      />,
    );
    expect(screen.getByLabelText("Rutina del lunes")).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Crear planificación" }),
    ).toBeDisabled();
    await userEvent.click(
      screen.getByRole("button", { name: "Crear una rutina" }),
    );
    expect(onCreateRoutine).toHaveBeenCalledOnce();
  });
  it("makes a newly created routine available without assigning an unintended day", async () => {
    render(<QuickPlanSetup {...props} addedRoutineId="pierna" />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Pierna ya está disponible",
    );
    expect(screen.getByLabelText("Rutina del lunes")).toHaveValue("");
    await userEvent.selectOptions(
      screen.getByLabelText("Rutina del lunes"),
      "pierna",
    );
    expect(
      screen.getByRole("button", { name: "Crear planificación" }),
    ).toBeEnabled();
  });
  it("lets unavailable assignments be cleared instead of trapping a restored form", async () => {
    sessionStorage.setItem(
      "missing",
      JSON.stringify({ dayRoutines: { 1: "deleted" } }),
    );
    render(<QuickPlanSetup {...props} storageKey="missing" />);
    expect(
      screen.getByRole("button", { name: "Crear planificación" }),
    ).toBeDisabled();
    await userEvent.selectOptions(
      screen.getByLabelText("Rutina del lunes"),
      "torso",
    );
    expect(
      screen.getByRole("button", { name: "Crear planificación" }),
    ).toBeEnabled();
  });
  it("clears the local form on explicit close without saving", async () => {
    const onClose = vi.fn();
    render(
      <QuickPlanSetup {...props} storageKey="test-plan" onClose={onClose} />,
    );
    await configureWeek();
    await userEvent.click(screen.getByRole("button", { name: "Volver" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(sessionStorage.getItem("test-plan")).toBeNull();
    expect(props.onCreate).not.toHaveBeenCalled();
  });
  it("keeps optional settings collapsed and explains active plan replacement", async () => {
    render(
      <QuickPlanSetup
        {...props}
        activePlan={{ name: "Mes actual" }}
        scheduledPlan={{ name: "Siguiente" }}
      />,
    );
    expect(screen.getByText(/Su historial se conserva/)).toBeVisible();
    expect(screen.getByLabelText("Empieza")).not.toBeVisible();
    await userEvent.click(screen.getByText("Ajustar"));
    fireEvent.change(screen.getByLabelText("Empieza"), {
      target: { value: "2099-01-01" },
    });
    expect(screen.getByText(/Al empezar, se pausará/)).toBeVisible();
    expect(screen.getByText(/Siguiente.*quedará en pausa/)).toBeVisible();
  });
});
