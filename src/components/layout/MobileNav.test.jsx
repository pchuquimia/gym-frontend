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
    expect(screen.getAllByRole("button")).toHaveLength(5);
  });
});
