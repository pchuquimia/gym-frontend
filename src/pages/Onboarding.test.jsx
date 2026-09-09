import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Onboarding from "./Onboarding";

const auth = {
  user: {
    id: "new-user",
    name: "Atleta",
    username: null,
    role: "Cliente",
    onboarding: { accountType: null, status: "pending" },
    profile: {},
  },
  completeOnboarding: vi.fn(),
  completeCoachOnboarding: vi.fn(),
  selectOnboardingAccountType: vi.fn().mockResolvedValue({}),
  logout: vi.fn(),
};

vi.mock("../context/AuthContext", () => ({
  useAuth: () => auth,
}));

describe("Onboarding account type", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.clearAllMocks();
    auth.selectOnboardingAccountType.mockResolvedValue({});
  });

  it("separa la eleccion de uso del formulario de registro", () => {
    render(<Onboarding />);

    expect(
      screen.getByRole("heading", { name: /cómo quieres usar rirfit/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /entreno para mí/i })).toBeVisible();
    expect(
      screen.getByRole("radio", { name: /soy entrenador\/a/i }),
    ).toBeVisible();
  });

  it("abre la configuracion profesional despues de elegir entrenador", async () => {
    render(<Onboarding />);

    fireEvent.click(screen.getByRole("radio", { name: /soy entrenador\/a/i }));
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));

    await waitFor(() =>
      expect(auth.selectOnboardingAccountType).toHaveBeenCalledWith("coach"),
    );
    expect(
      await screen.findByRole("heading", { name: /preséntate ante tus alumnos/i }),
    ).toBeVisible();
    expect(screen.getByLabelText(/nombre público del entrenador/i)).toBeVisible();
  });
});
