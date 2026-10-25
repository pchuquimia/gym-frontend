import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import QuickPlanSetup from "./QuickPlanSetup";

const routines = [
  {
    id: "torso",
    name: "Torso",
    exercises: [{ image: "/exercise-torso.webp" }],
  },
  { id: "pierna", name: "Pierna", exercises: [{}, {}] },
];
const props = {
  routines,
  onCreate: vi.fn(),
  onClose: vi.fn(),
  onView: vi.fn(),
};
const choose = async (day, routine) => {
  await userEvent.click(
    screen.getByRole("button", { name: new RegExp(`^${day}:`) }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: routine, exact: true }),
  );
};
const configureWeek = async () => {
  await choose("Lunes", "Torso");
  await choose("Jueves", "Pierna");
};
afterEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  vi.clearAllMocks();
});

describe("QuickPlanSetup", () => {
  it("offers seven empty days and keeps date editing separate from optional fields", async () => {
    render(<QuickPlanSetup {...props} />);
    expect(
      screen.getByRole("heading", { name: "Organiza tu semana" }),
    ).toBeVisible();
    expect(
      screen.getAllByRole("button", { name: /: Añadir rutina$/ }),
    ).toHaveLength(7);
    expect(screen.getByText("0 días")).toBeVisible();
    expect(
      screen.getByText("Los días sin rutina quedan de descanso."),
    ).toBeVisible();
    expect(screen.getByLabelText("Empieza")).not.toBeVisible();
    expect(screen.getByLabelText("Nombre del plan")).toBeVisible();
    expect(screen.getByLabelText("Objetivo")).not.toBeVisible();
    await userEvent.click(screen.getByText("Editar"));
    expect(screen.getByLabelText("Empieza")).toBeVisible();
    expect(screen.getByLabelText("Objetivo")).not.toBeVisible();
    await userEvent.click(screen.getByText("Más opciones"));
    expect(screen.getByLabelText("Objetivo")).toBeVisible();
  });
  it("remembers explicitly chosen rest days without requiring every day to be configured", async () => {
    const onCreate = vi.fn().mockResolvedValue({ id: "plan" });
    const { unmount } = render(
      <QuickPlanSetup {...props} storageKey="rests" />,
    );
    await choose("Lunes", "Torso");
    await choose("Martes", "Descanso");
    expect(
      screen.getByRole("button", { name: "Martes: Descanso" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Domingo: Añadir rutina" }),
    ).toBeVisible();
    unmount();
    render(
      <QuickPlanSetup {...props} storageKey="rests" onCreate={onCreate} />,
    );
    expect(
      screen.getByRole("button", { name: "Martes: Descanso" }),
    ).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: "Martes: Descanso" }),
    );
    expect(
      screen.getByRole("button", { name: "Descanso", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "Volver" }));
    expect(
      screen.getByText("1 día de entrenamiento · 4 semanas"),
    ).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: "Crear planificación" }),
    );
    await waitFor(() =>
      expect(onCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedDays: [1],
          overrides: { 1: "torso" },
        }),
      ),
    );
    expect(
      await screen.findByRole("button", { name: "Ver mi plan" }),
    ).toBeVisible();
    expect(screen.queryByText("Añadir rutina")).toBeNull();
  });
  it("submits the edited schedule and optional details together", async () => {
    const onCreate = vi.fn().mockResolvedValue({ id: "plan" });
    render(<QuickPlanSetup {...props} onCreate={onCreate} />);
    await choose("Lunes", "Torso");
    await userEvent.click(screen.getByText("Editar"));
    fireEvent.change(screen.getByLabelText("Empieza"), {
      target: { value: "2099-01-01" },
    });
    await userEvent.selectOptions(screen.getByLabelText("Duración"), "1");
    await userEvent.click(screen.getByText("Más opciones"));
    await userEvent.type(
      screen.getByLabelText("Nombre del plan"),
      "Mi nuevo plan",
    );
    await userEvent.selectOptions(screen.getByLabelText("Objetivo"), "Fuerza");
    await userEvent.selectOptions(
      screen.getByLabelText("Nivel"),
      "intermediate",
    );
    await userEvent.type(screen.getByLabelText("Notas"), "Semana habitual");
    expect(screen.getByText("1 día de entrenamiento · 1 semana")).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: "Crear planificación" }),
    );
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Mi nuevo plan",
        startDate: "2099-01-01",
        durationWeeks: 1,
        goal: "Fuerza",
        level: "intermediate",
        notes: "Semana habitual",
      }),
    );
  });
  it("shows a simple week and opens a styled picker instead of a native day select", async () => {
    const onCreate = vi
      .fn()
      .mockResolvedValue({ id: "plan-1", status: "active" });
    const onView = vi.fn();
    render(<QuickPlanSetup {...props} onCreate={onCreate} onView={onView} />);
    expect(
      screen.getByRole("button", { name: "Crear planificación" }),
    ).toBeDisabled();
    expect(screen.queryByRole("combobox", { name: /^Rutina del/ })).toBeNull();
    await userEvent.click(
      screen.getByRole("button", { name: "Lunes: Añadir rutina" }),
    );
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getByRole("dialog", { name: "Lunes" })).toBeVisible();
    expect(
      screen.getByRole("searchbox", { name: "Buscar rutina" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Crear planificación" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Descanso", exact: true }),
    ).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(
      screen.getByRole("button", { name: "Torso", exact: true }),
    );
    expect(screen.getByRole("button", { name: "Lunes: Torso" })).toHaveFocus();
    await choose("Jueves", "Pierna");
    expect(onCreate).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Nombre del plan")).toHaveAttribute(
      "placeholder",
      "Torso · Pierna",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Crear planificación" }),
    );
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        routineIds: ["torso", "pierna"],
        selectedDays: [1, 4],
        overrides: { 1: "torso", 4: "pierna" },
        durationWeeks: 4,
        name: "Torso · Pierna",
      }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Ver mi plan" }),
    );
    expect(onView).toHaveBeenCalledWith(
      expect.objectContaining({ id: "plan-1" }),
    );
  });
  it("replaces or clears only the chosen day", async () => {
    render(<QuickPlanSetup {...props} />);
    await configureWeek();
    await choose("Lunes", "Pierna");
    expect(
      screen.getByRole("button", { name: "Jueves: Pierna" }),
    ).toBeVisible();
    await choose("Lunes", "Descanso");
    await choose("Jueves", "Descanso");
    expect(
      screen.getByRole("button", { name: "Crear planificación" }),
    ).toBeDisabled();
  });
  it("updates the suggestion while preserving a name written by the user", async () => {
    render(<QuickPlanSetup {...props} />);
    await choose("Lunes", "Torso");
    expect(screen.getByLabelText("Nombre del plan")).toHaveAttribute(
      "placeholder",
      "Torso",
    );
    await userEvent.type(
      screen.getByLabelText("Nombre del plan"),
      "Mi bloque de fuerza",
    );
    await choose("Jueves", "Pierna");
    expect(screen.getByLabelText("Nombre del plan")).toHaveValue(
      "Mi bloque de fuerza",
    );
    await userEvent.clear(screen.getByLabelText("Nombre del plan"));
    expect(screen.getByLabelText("Nombre del plan")).toHaveAttribute(
      "placeholder",
      "Torso · Pierna",
    );
  });
  it("returns from the picker without changing or discarding the week", async () => {
    const onClose = vi.fn();
    render(
      <StrictMode>
        <QuickPlanSetup {...props} onClose={onClose} storageKey="week" />
      </StrictMode>,
    );
    await configureWeek();
    await userEvent.click(
      screen.getByRole("button", { name: "Jueves: Pierna" }),
    );
    expect(
      screen.getByRole("button", { name: "Pierna", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "Volver" }));
    expect(
      screen.getByRole("button", { name: "Jueves: Pierna" }),
    ).toHaveFocus();
    expect(onClose).not.toHaveBeenCalled();
    expect(localStorage.getItem("week")).toContain("pierna");
    await userEvent.click(screen.getByRole("button", { name: "Lunes: Torso" }));
    await userEvent.keyboard("{Escape}");
    expect(
      screen.getByRole("dialog", { name: "Nueva planificación" }),
    ).toBeVisible();
    expect(onClose).not.toHaveBeenCalled();
  });
  it("filters accents and case, and lets the user recover from an empty search", async () => {
    render(
      <QuickPlanSetup
        {...props}
        routines={[
          ...routines,
          { id: "biceps", name: "Bíceps", exercises: [] },
        ]}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Lunes: Añadir rutina" }),
    );
    await userEvent.type(screen.getByRole("searchbox"), "BICEPS");
    expect(
      screen.getByRole("button", { name: "Bíceps", exact: true }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Torso", exact: true }),
    ).toBeNull();
    await userEvent.clear(screen.getByRole("searchbox"));
    await userEvent.type(screen.getByRole("searchbox"), "no existe");
    expect(screen.getByText("No hay rutinas con ese nombre.")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Descanso", exact: true }),
    ).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: "Ver todas las rutinas" }),
    );
    expect(
      screen.getByRole("button", { name: "Torso", exact: true }),
    ).toBeVisible();
  });
  it("distinguishes routines with the same name by their source group", async () => {
    const onCreate = vi.fn().mockResolvedValue({ id: "plan" });
    render(
      <QuickPlanSetup
        {...props}
        onCreate={onCreate}
        routines={[
          routines[0],
          { ...routines[0], id: "assigned", trainingPlanId: "old" },
        ]}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Lunes: Añadir rutina" }),
    );
    const group = screen.getByRole("region", { name: "De mi planificación" });
    await userEvent.click(
      within(group).getByRole("button", { name: "Torso", exact: true }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Crear planificación" }),
    );
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({ routineIds: ["assigned"] }),
    );
  });
  it("uses exercise photos and recovers from broken images without losing the assignment", async () => {
    render(<QuickPlanSetup {...props} />);
    await choose("Lunes", "Torso");
    const day = screen.getByRole("button", { name: "Lunes: Torso" });
    expect(day.querySelector("img")).toHaveAttribute(
      "src",
      "/exercise-torso.webp",
    );
    fireEvent.error(day.querySelector("img"));
    expect(day.querySelector("img")).toHaveAttribute(
      "src",
      "/images/routine-upper.webp",
    );
    fireEvent.error(day.querySelector("img"));
    expect(day.querySelector("img")).toBeNull();
    expect(day).toHaveTextContent("Torso");
  });
  it("locks a failed server draft and retries the same draft", async () => {
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
    expect(screen.getByRole("button", { name: "Lunes: Torso" })).toBeDisabled();
    await userEvent.click(
      screen.getByRole("button", { name: "Reintentar creación" }),
    );
    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(2));
    expect(onCreate.mock.calls[1][0].existingDraft).toEqual(draft);
  });
  it("preserves the week when creating a routine from the picker", async () => {
    const onCreateRoutine = vi.fn();
    const { unmount } = render(
      <QuickPlanSetup
        {...props}
        storageKey="test-plan"
        onCreateRoutine={onCreateRoutine}
      />,
    );
    await configureWeek();
    await userEvent.click(screen.getByRole("button", { name: "Lunes: Torso" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Crear una rutina" }),
    );
    expect(onCreateRoutine).toHaveBeenCalledOnce();
    unmount();
    render(<QuickPlanSetup {...props} storageKey="test-plan" />);
    expect(screen.getByRole("button", { name: "Lunes: Torso" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Jueves: Pierna" }),
    ).toBeVisible();
  });
  it("restores earlier draft formats without changing assignments", () => {
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
    expect(screen.getByRole("button", { name: "Lunes: Torso" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Jueves: Torso" })).toBeVisible();
    unmount();
    sessionStorage.setItem(
      "paint",
      JSON.stringify({ dayRoutines: { 2: "pierna" }, paintRoutineId: "torso" }),
    );
    render(<QuickPlanSetup {...props} storageKey="paint" />);
    expect(
      screen.getByRole("button", { name: "Martes: Pierna" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Lunes: Añadir rutina" }),
    ).toBeVisible();
  });
  it("shows the newly created routine when returning to an open day picker", async () => {
    const onCreateRoutine = vi.fn();
    const { rerender } = render(
      <QuickPlanSetup {...props} onCreateRoutine={onCreateRoutine} />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Lunes: Añadir rutina" }),
    );
    await userEvent.type(screen.getByRole("searchbox"), "no existe");
    await userEvent.click(
      screen.getByRole("button", { name: "Crear una rutina" }),
    );
    const added = { id: "new", name: "Nueva rutina", exercises: [] };
    rerender(
      <QuickPlanSetup
        {...props}
        routines={[...routines, added]}
        addedRoutineId="new"
        onCreateRoutine={onCreateRoutine}
      />,
    );
    expect(screen.getByRole("searchbox")).toHaveValue("Nueva rutina");
    expect(
      screen.getByRole("button", { name: "Nueva rutina", exact: true }),
    ).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: "Nueva rutina", exact: true }),
    );
    expect(
      screen.getByRole("button", { name: "Lunes: Nueva rutina" }),
    ).toBeVisible();
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
      screen.getByRole("button", { name: "Crear planificación" }),
    ).toBeDisabled();
    await userEvent.click(
      screen.getByRole("button", { name: "Crear una rutina" }),
    );
    expect(onCreateRoutine).toHaveBeenCalledOnce();
  });
  it("makes new routines available without assigning a day by accident", async () => {
    render(<QuickPlanSetup {...props} addedRoutineId="pierna" />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Pierna ya está disponible",
    );
    expect(
      screen.getByRole("button", { name: "Crear planificación" }),
    ).toBeDisabled();
    await choose("Lunes", "Pierna");
    expect(
      screen.getByRole("button", { name: "Crear planificación" }),
    ).toBeEnabled();
  });
  it("allows unavailable assignments to be replaced or cleared", async () => {
    sessionStorage.setItem(
      "missing",
      JSON.stringify({ dayRoutines: { 1: "deleted" } }),
    );
    render(<QuickPlanSetup {...props} storageKey="missing" />);
    expect(
      screen.getByRole("button", { name: "Crear planificación" }),
    ).toBeDisabled();
    await choose("Lunes", "Torso");
    expect(
      screen.getByRole("button", { name: "Crear planificación" }),
    ).toBeEnabled();
  });
  it("restores the full draft after leaving the week and starting a new browser session", async () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <QuickPlanSetup {...props} storageKey="test-plan" onClose={onClose} />,
    );
    await configureWeek();
    await choose("Martes", "Descanso");
    await userEvent.type(screen.getByLabelText("Nombre del plan"), "Mi bloque");
    await userEvent.click(screen.getByText("Editar"));
    fireEvent.change(screen.getByLabelText("Empieza"), {
      target: { value: "2099-01-01" },
    });
    await userEvent.selectOptions(screen.getByLabelText("Duración"), "8");
    await userEvent.click(screen.getByText("Más opciones"));
    await userEvent.selectOptions(screen.getByLabelText("Objetivo"), "Fuerza");
    await userEvent.selectOptions(
      screen.getByLabelText("Nivel"),
      "intermediate",
    );
    await userEvent.type(screen.getByLabelText("Notas"), "Progresar sin prisa");
    await userEvent.click(screen.getByRole("button", { name: "Volver" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(localStorage.getItem("test-plan")).toContain("pierna");
    expect(props.onCreate).not.toHaveBeenCalled();
    unmount();
    sessionStorage.clear();
    render(<QuickPlanSetup {...props} storageKey="test-plan" />);
    expect(screen.getByRole("button", { name: "Lunes: Torso" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Jueves: Pierna" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Martes: Descanso" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Nombre del plan")).toHaveValue("Mi bloque");
    expect(screen.getByLabelText("Empieza")).toHaveValue("2099-01-01");
    expect(screen.getByLabelText("Duración")).toHaveValue("8");
    expect(screen.getByLabelText("Objetivo")).toHaveValue("Fuerza");
    expect(screen.getByLabelText("Nivel")).toHaveValue("intermediate");
    expect(screen.getByLabelText("Notas")).toHaveValue("Progresar sin prisa");
  });
  it("discards only the local draft when explicitly requested", async () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <QuickPlanSetup {...props} storageKey="discard" onClose={onClose} />,
    );
    await configureWeek();
    expect(
      screen.getByText("Borrador guardado automáticamente."),
    ).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: "Descartar borrador" }),
    );
    expect(onClose).toHaveBeenCalledOnce();
    expect(localStorage.getItem("discard")).toBeNull();
    expect(sessionStorage.getItem("discard")).toBeNull();
    expect(props.onCreate).not.toHaveBeenCalled();
    unmount();
    render(<QuickPlanSetup {...props} storageKey="discard" />);
    expect(
      screen.getAllByRole("button", { name: /: Añadir rutina$/ }),
    ).toHaveLength(7);
    expect(screen.getByLabelText("Nombre del plan")).toHaveValue("");
  });
  it("clears both draft stores only after a successful creation", async () => {
    sessionStorage.setItem(
      "created",
      JSON.stringify({ dayRoutines: { 1: "torso" } }),
    );
    const onCreate = vi
      .fn()
      .mockRejectedValueOnce(new Error("Offline"))
      .mockResolvedValue({ id: "plan" });
    render(
      <QuickPlanSetup {...props} storageKey="created" onCreate={onCreate} />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Crear planificación" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Offline");
    expect(localStorage.getItem("created")).not.toBeNull();
    await userEvent.click(
      screen.getByRole("button", { name: "Crear planificación" }),
    );
    expect(
      await screen.findByRole("button", { name: "Ver mi plan" }),
    ).toBeVisible();
    expect(localStorage.getItem("created")).toBeNull();
    expect(sessionStorage.getItem("created")).toBeNull();
  });
  it("keeps a partial server draft attached when leaving and returning to retry", async () => {
    const draft = { id: "partial", status: "draft" };
    const onCreate = vi
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error("Offline"), { draftPlan: draft }),
      )
      .mockResolvedValue({ id: "partial" });
    const { unmount } = render(
      <QuickPlanSetup {...props} storageKey="retry" onCreate={onCreate} />,
    );
    await configureWeek();
    await userEvent.click(
      screen.getByRole("button", { name: "Crear planificación" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Offline");
    await userEvent.click(screen.getByRole("button", { name: "Volver" }));
    unmount();
    render(
      <QuickPlanSetup {...props} storageKey="retry" onCreate={onCreate} />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Reintentar creación" }),
    );
    expect(onCreate.mock.calls[1][0].existingDraft).toEqual(draft);
  });
  it("keeps optional settings collapsed and explains switching active plans", async () => {
    render(
      <QuickPlanSetup
        {...props}
        activePlan={{ name: "Mes actual" }}
        scheduledPlan={{ name: "Siguiente" }}
      />,
    );
    expect(screen.getByText(/Su historial se conserva/)).toBeVisible();
    expect(screen.getByLabelText("Empieza")).not.toBeVisible();
    await userEvent.click(screen.getByText("Editar"));
    fireEvent.change(screen.getByLabelText("Empieza"), {
      target: { value: "2099-01-01" },
    });
    expect(screen.getByText(/Al empezar, se pausará/)).toBeVisible();
    expect(screen.getByText(/Siguiente.*quedará en pausa/)).toBeVisible();
  });
});
