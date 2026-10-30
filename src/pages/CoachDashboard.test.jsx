import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CoachDashboard from "./CoachDashboard";

const { mockUseAuth, mockCreateInvitation, mockGetPortfolio, mockGetAthletes } =
  vi.hoisted(() => ({
    mockUseAuth: vi.fn(),
    mockCreateInvitation: vi.fn(),
    mockGetPortfolio: vi.fn(),
    mockGetAthletes: vi.fn(),
  }));

vi.mock("../context/AuthContext", () => ({ useAuth: mockUseAuth }));
vi.mock("../context/UserContext", () => ({
  useUserProfile: () => ({ profile: null }),
}));
vi.mock("../context/RoutineContext", () => ({
  useRoutines: () => ({ routines: [] }),
}));
vi.mock("../services/api", () => ({
  api: {
    getCoachPortfolio: mockGetPortfolio,
    getCoachAthletes: mockGetAthletes,
    getPlanTemplates: () => Promise.resolve([]),
    getCoachPlanCatalog: () => Promise.resolve({ plans: [], routines: [] }),
    getCoachNotifications: () =>
      Promise.resolve({ notifications: [], unread: 0 }),
    createCoachInvitation: mockCreateInvitation,
  },
}));

describe("invitaciones del administrador en modo coach", () => {
  beforeEach(() => {
    sessionStorage.clear();
    mockGetAthletes.mockReset();
    mockGetPortfolio.mockReset();
    mockGetPortfolio.mockResolvedValue({ athletes: [], summary: {} });
    mockUseAuth.mockReturnValue({
      user: { id: "admin_1", role: "Admin", name: "Admin" },
    });
    mockCreateInvitation.mockReset();
    mockCreateInvitation.mockResolvedValue({
      id: "invitation_1",
      invitationUrl: "https://rirfit.com/invite/example",
    });
  });

  it.each(["trainer", "coach_athletes"])(
    "genera un enlace desde %s sin mostrar el código antiguo",
    async (pageId) => {
      render(
        <QueryClientProvider client={new QueryClient()}>
          <CoachDashboard pageId={pageId} />
        </QueryClientProvider>,
      );

      const inviteButtons = await screen.findAllByRole("button", {
        name: "Invitar alumno",
      });
      await userEvent.click(inviteButtons[0]);

      await waitFor(() =>
        expect(mockCreateInvitation).toHaveBeenCalledTimes(1),
      );
      expect(
        await screen.findByRole("textbox", { name: "Enlace de invitación" }),
      ).toHaveValue("https://rirfit.com/invite/example");
      expect(screen.queryByText("Código de vinculación")).toBeNull();
    },
  );

  it("permite reintentar cuando falla la creación del enlace", async () => {
    mockCreateInvitation.mockRejectedValueOnce(new Error("Temporal"));
    render(
      <QueryClientProvider client={new QueryClient()}>
        <CoachDashboard pageId="trainer" />
      </QueryClientProvider>,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Invitar alumno" }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Reintentar" }),
    );

    expect(
      await screen.findByRole("textbox", { name: "Enlace de invitación" }),
    ).toHaveValue("https://rirfit.com/invite/example");
    expect(mockCreateInvitation).toHaveBeenCalledTimes(2);
  });
  it.each(["trainer", "coach_athletes"])(
    "muestra un fallo recuperable en %s sin fingir una cartera vacía",
    async (pageId) => {
      mockGetPortfolio.mockRejectedValueOnce(new Error("No hay conexión"));
      render(
        <QueryClientProvider client={new QueryClient()}>
          <CoachDashboard pageId={pageId} />
        </QueryClientProvider>,
      );
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "No hay conexión",
      );
      expect(screen.queryByText("Aún no tienes atletas")).toBeNull();
      expect(screen.queryByText("Sin prioridades hoy")).toBeNull();
      await userEvent.click(
        screen.getByRole("button", { name: "Reintentar carga" }),
      );
      await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
      expect(mockGetPortfolio).toHaveBeenCalledTimes(2);
    },
  );
  it("filtra alumnos que requieren atención también con una cuenta coach gratuita", async () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "coach_1",
        role: "Entrenador",
        name: "Coach",
        entitlements: [],
      },
    });
    const today = new Date().toLocaleDateString("en-CA");
    mockGetAthletes.mockResolvedValue([
      { id: "ana", name: "Ana", routineCount: 0, trainingCount: 0 },
      {
        id: "luis",
        name: "Luis",
        routineCount: 1,
        trainingCount: 2,
        lastTraining: { date: today },
      },
    ]);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <CoachDashboard pageId="coach_athletes" />
      </QueryClientProvider>,
    );
    await waitFor(() =>
      expect(
        screen.getAllByRole("button", { name: /Luis/ }).length,
      ).toBeGreaterThan(0),
    );
    await userEvent.click(screen.getByRole("button", { name: /Atención/ }));
    expect(screen.queryByRole("button", { name: /Luis/ })).toBeNull();
    expect(
      screen.getAllByRole("button", { name: /Ana/ }).length,
    ).toBeGreaterThan(0);
  });

  it.each(["trainer", "coach_athletes"])(
    "actualiza los avatares en %s al volver a la ventana sin recargar la página",
    async (pageId) => {
      const athlete = {
        id: "ana",
        name: "Ana",
        routineCount: 1,
        trainingCount: 1,
        profile: { avatarId: "gym-02", gender: "female" },
      };
      mockGetPortfolio.mockResolvedValue({ athletes: [athlete], summary: {} });
      const { container, unmount } = render(
        <QueryClientProvider client={new QueryClient()}>
          <CoachDashboard pageId={pageId} />
        </QueryClientProvider>,
      );
      await waitFor(() =>
        expect(
          container.querySelector('[data-avatar-id="gym-02"]'),
        ).not.toBeNull(),
      );
      mockGetPortfolio.mockResolvedValue({
        athletes: [
          { ...athlete, profile: { ...athlete.profile, avatarId: "gym-18" } },
        ],
        summary: {},
      });
      fireEvent.focus(window);
      await waitFor(() =>
        expect(
          container.querySelector('[data-avatar-id="gym-18"]'),
        ).not.toBeNull(),
      );
      expect(container.querySelector('[data-avatar-id="gym-02"]')).toBeNull();
      expect(mockGetPortfolio).toHaveBeenCalledTimes(2);
      unmount();
      fireEvent.focus(window);
      expect(mockGetPortfolio).toHaveBeenCalledTimes(2);
    },
  );
});
