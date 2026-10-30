import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CoachNotifications from "./CoachNotifications";

const { getNotifications, markRead } = vi.hoisted(() => ({
  getNotifications: vi.fn(),
  markRead: vi.fn(),
}));
vi.mock("../../services/api", () => ({
  api: {
    getCoachNotifications: getNotifications,
    markCoachNotificationsRead: markRead,
  },
}));
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "coach" } }),
}));
const message =
  "Pablo Ivan completó su evaluación inicial con información de equipamiento, objetivos y experiencia para preparar su planificación.";
const items = [
  {
    _id: "one",
    type: "intake_submitted",
    title: "Evaluación inicial recibida",
    message,
    athleteId: "athlete",
    createdAt: new Date().toISOString(),
    readAt: null,
  },
  {
    _id: "two",
    type: "athlete_account_deleted",
    title: "Cuenta de alumno eliminada",
    message: "Laura eliminó su cuenta.",
    athleteId: null,
    createdAt: "2026-01-01T12:00:00Z",
    readAt: "2026-01-02T12:00:00Z",
  },
];
const renderNotifications = (onOpenAthlete = vi.fn()) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <CoachNotifications
        athletes={[{ id: "athlete", name: "Pablo Ivan" }]}
        onOpenAthlete={onOpenAthlete}
      />
    </QueryClientProvider>,
  );

describe("CoachNotifications", () => {
  beforeEach(() => {
    getNotifications.mockReset();
    markRead.mockReset();
    getNotifications.mockResolvedValue({ notifications: items, unread: 1 });
    markRead.mockResolvedValue({ ok: true });
  });
  it("resume el aviso en la lista y reserva el contenido completo para el detalle", async () => {
    const onOpen = vi.fn();
    renderNotifications(onOpen);
    await userEvent.click(
      await screen.findByRole("button", { name: "Notificaciones, 1 sin leer" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Notificaciones" });
    expect(within(dialog).getByText("Evaluación inicial lista")).toBeVisible();
    expect(within(dialog).getByText("Pablo Ivan")).toBeVisible();
    expect(within(dialog).queryByText(message)).toBeNull();
    expect(markRead).not.toHaveBeenCalled();
    await userEvent.click(
      within(dialog).getByRole("button", { name: /Evaluación inicial lista/ }),
    );
    expect(screen.getByText(message)).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Ver alumno" }));
    expect(onOpen).toHaveBeenCalledWith("athlete");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("filtra los pendientes y permite marcar todos como leídos", async () => {
    renderNotifications();
    await userEvent.click(
      await screen.findByRole("button", { name: "Notificaciones, 1 sin leer" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Sin leer 1" }));
    expect(screen.queryByText("Cuenta eliminada")).toBeNull();
    await userEvent.click(
      screen.getByRole("button", { name: "Marcar todas como leídas" }),
    );
    expect(await screen.findByText("No tienes avisos sin leer.")).toBeVisible();
    expect(markRead).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole("button", { name: "Todas" }));
    expect(screen.getByText("Cuenta eliminada")).toBeVisible();
  });
  it("conserva los pendientes si falla marcar como leído y evita abrir alumnos eliminados", async () => {
    markRead.mockRejectedValue(new Error("Sin conexión"));
    renderNotifications();
    await userEvent.click(
      await screen.findByRole("button", { name: "Notificaciones, 1 sin leer" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Marcar todas como leídas" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudieron marcar",
    );
    expect(screen.getByRole("button", { name: "Sin leer 1" })).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: /Cuenta eliminada/ }),
    );
    expect(screen.getByText("Laura eliminó su cuenta.")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Ver alumno" })).toBeNull();
    await userEvent.click(
      screen.getByRole("button", { name: "Volver a notificaciones" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Notificaciones" }),
    ).toBeVisible();
  });
  it("permite recuperar un fallo de carga sin presentarlo como una lista vacía", async () => {
    getNotifications.mockRejectedValue(new Error("Sin conexión"));
    renderNotifications();
    await waitFor(() => expect(getNotifications).toHaveBeenCalledOnce());
    await userEvent.click(
      screen.getByRole("button", { name: "Notificaciones" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos cargar los avisos",
    );
    getNotifications.mockResolvedValue({ notifications: [], unread: 0 });
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Estás al día")).toBeVisible();
  });
});
