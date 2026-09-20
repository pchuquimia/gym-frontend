import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CoachDashboard from "./CoachDashboard";

const { mockUseAuth, mockCreateInvitation } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockCreateInvitation: vi.fn(),
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
    getCoachPortfolio: () => Promise.resolve({ athletes: [], summary: {} }),
    getCoachPlanCatalog: () => Promise.resolve({ plans: [], routines: [] }),
    getCoachNotifications: () =>
      Promise.resolve({ notifications: [], unread: 0 }),
    createCoachInvitation: mockCreateInvitation,
  },
}));

describe("invitaciones del administrador en modo coach", () => {
  beforeEach(() => {
    sessionStorage.clear();
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

      await waitFor(() => expect(mockCreateInvitation).toHaveBeenCalledTimes(1));
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

    await userEvent.click(screen.getByRole("button", { name: "Invitar alumno" }));
    await userEvent.click(await screen.findByRole("button", { name: "Reintentar" }));

    expect(
      await screen.findByRole("textbox", { name: "Enlace de invitación" }),
    ).toHaveValue("https://rirfit.com/invite/example");
    expect(mockCreateInvitation).toHaveBeenCalledTimes(2);
  });
});
