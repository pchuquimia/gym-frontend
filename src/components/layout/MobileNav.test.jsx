import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MobileNav from "./MobileNav";

const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: mockUseAuth,
}));

describe("MobileNav", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it("ofrece acceso directo a rutinas al atleta independiente", async () => {
    const onNavigate = vi.fn();
    const onOpenMenu = vi.fn();
    mockUseAuth.mockReturnValue({
      user: { role: "Cliente", trainingMode: "independent" },
    });

    render(
      <MobileNav
        activePage="dashboard"
        onNavigate={onNavigate}
        onOpenMenu={onOpenMenu}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Rutinas" }));
    expect(onNavigate).toHaveBeenCalledWith("rutinas");
    expect(
      screen.queryByRole("button", { name: "Metricas" }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Más" }));
    expect(onOpenMenu).toHaveBeenCalledTimes(1);
    expect(onNavigate).not.toHaveBeenCalledWith("more");
  });

  it("mantiene rutinas disponible para administradores en movil", () => {
    mockUseAuth.mockReturnValue({ user: { role: "Admin" } });

    render(<MobileNav activePage="rutinas" onNavigate={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Rutinas" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Entrenar" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Biblioteca" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Atletas" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Gestion" }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(5);
  });

  it("muestra la navegación coach al administrador dentro de ese espacio", () => {
    mockUseAuth.mockReturnValue({ user: { role: "Admin" } });

    render(<MobileNav activePage="trainer" onNavigate={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Alumnos" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Mensajes" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Inicio" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("usa un icono sólido solo en la página activa", () => {
    mockUseAuth.mockReturnValue({
      user: { role: "Cliente", trainingMode: "independent" },
    });

    render(<MobileNav activePage="rutinas" onNavigate={vi.fn()} />);

    const activeItem = screen.getByRole("button", { name: "Rutinas" });
    const inactiveItem = screen.getByRole("button", { name: "Entrenar" });

    expect(activeItem).toHaveAttribute("aria-current", "page");
    expect(
      activeItem.querySelector('[data-nav-icon="solid"]'),
    ).toBeInTheDocument();
    expect(
      inactiveItem.querySelector('[data-nav-icon="outline"]'),
    ).toBeInTheDocument();
  });

  it("muestra al coach un inicio operativo y destinos profesionales reales", async () => {
    const onNavigate = vi.fn();
    mockUseAuth.mockReturnValue({ user: { role: "Entrenador" } });

    render(<MobileNav activePage="trainer" onNavigate={onNavigate} />);

    expect(screen.getByRole("button", { name: "Inicio" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("button", { name: "Alumnos" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Planes" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Mensajes" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Más" })).toBeVisible();
    expect(screen.getAllByRole("button")).toHaveLength(5);

    await userEvent.click(screen.getByRole("button", { name: "Alumnos" }));
    expect(onNavigate).toHaveBeenCalledWith("coach_athletes");
  });

  it("prioriza plan y progreso para el alumno vinculado a un coach", () => {
    mockUseAuth.mockReturnValue({
      user: { role: "Cliente", trainingMode: "coach_managed" },
    });

    render(<MobileNav activePage="dashboard" onNavigate={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Inicio" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Entrenar" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Plan" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Progreso" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Más" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Perfil" })).toBeNull();
  });

  it("marca Mas como contexto activo en una pantalla secundaria", () => {
    mockUseAuth.mockReturnValue({
      user: { role: "Cliente", trainingMode: "coach_managed" },
    });

    render(<MobileNav activePage="pesajes" onNavigate={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Más" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
