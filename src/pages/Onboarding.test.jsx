import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Onboarding from "./Onboarding";

const mocks = vi.hoisted(() => ({
  getCoachIntakeForm: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("../services/api", () => ({
  api: { getCoachIntakeForm: mocks.getCoachIntakeForm },
}));

vi.mock("sonner", () => ({
  toast: {
    error: mocks.toastError,
    success: mocks.toastSuccess,
  },
}));

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

describe("Onboarding managed evaluation", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.clearAllMocks();
    auth.completeOnboarding.mockResolvedValue({});
    mocks.getCoachIntakeForm.mockResolvedValue({ questions: [] });
  });

  const setManagedUser = (profile) => {
    auth.user = {
      id: "managed-user",
      name: "Laura M.",
      username: "laura",
      role: "Cliente",
      trainingMode: "coach_managed",
      assignedTrainerId: "coach-1",
      onboarding: { accountType: "athlete", status: "complete" },
      coachIntake: { coachId: "coach-1", status: "pending" },
      profile: {
        goal: "mantenimiento",
        experienceLevel: "beginner",
        weeklyFrequency: 3,
        height: 165,
        ...profile,
      },
    };
    window.localStorage.setItem(
      "rirfit_onboarding_draft",
      JSON.stringify({ step: 3, intakeCoachId: "coach-1" }),
    );
  };

  it("avisa y vuelve al perfil cuando faltan datos antes de enviar", async () => {
    setManagedUser({ weight: "" });

    render(<Onboarding />);
    fireEvent.click(
      await screen.findByRole("button", { name: /enviar evaluación/i }),
    );

    expect(mocks.toastError).toHaveBeenCalledWith(
      "Revisa los datos de tu perfil",
      expect.any(Object),
    );
    expect(
      screen.getByRole("heading", { name: /completa tu perfil base/i }),
    ).toBeVisible();
    expect(auth.completeOnboarding).not.toHaveBeenCalled();
  });

  it("confirma el formulario y abre el dashboard al enviarlo", async () => {
    const onNavigate = vi.fn();
    setManagedUser({ weight: 60 });

    render(<Onboarding onNavigate={onNavigate} />);
    fireEvent.click(
      await screen.findByRole("button", { name: /enviar evaluación/i }),
    );

    await waitFor(() => expect(auth.completeOnboarding).toHaveBeenCalled());
    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      "Formulario enviado",
      expect.any(Object),
    );
    expect(onNavigate).toHaveBeenCalledWith("dashboard", { replace: true });
  });
});

describe("Onboarding account type", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.clearAllMocks();
    auth.user = {
      id: "new-user",
      name: "Atleta",
      username: null,
      role: "Cliente",
      onboarding: { accountType: null, status: "pending" },
      profile: {},
    };
    auth.selectOnboardingAccountType.mockResolvedValue({});
    auth.completeOnboarding.mockResolvedValue({});
    mocks.getCoachIntakeForm.mockResolvedValue({ questions: [] });
  });

  it("separa la eleccion de uso del formulario de registro", () => {
    render(<Onboarding />);

    expect(
      screen.getByRole("heading", { name: /cómo quieres usar rirfit/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /entreno para mí/i }),
    ).toBeVisible();
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
      await screen.findByRole("heading", {
        name: /preséntate ante tus alumnos/i,
      }),
    ).toBeVisible();
    expect(
      screen.getByLabelText(/nombre público del entrenador/i),
    ).toBeVisible();
  });
});
