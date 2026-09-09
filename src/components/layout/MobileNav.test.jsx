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
    mockUseAuth.mockReturnValue({
      user: { role: "Cliente", trainingMode: "independent" },
    });

    render(<MobileNav activePage="dashboard" onNavigate={onNavigate} />);

    await userEvent.click(screen.getByRole("button", { name: "Rutinas" }));
    expect(onNavigate).toHaveBeenCalledWith("rutinas");
    expect(
      screen.queryByRole("button", { name: "Metricas" }),
    ).not.toBeInTheDocument();
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
    expect(screen.getByRole("button", { name: "Perfil" })).toBeVisible();
    expect(screen.getAllByRole("button")).toHaveLength(5);

    await userEvent.click(screen.getByRole("button", { name: "Alumnos" }));
    expect(onNavigate).toHaveBeenCalledWith("coach_athletes");
  });
});
