import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Badge from "./badge";

describe("Badge", () => {
  it("muestra un indicador vivo para estados en curso", () => {
    render(<Badge variant="active">En curso</Badge>);
    const badge = screen.getByText("En curso");
    expect(badge).toHaveAttribute("data-status", "active");
    expect(badge.querySelector("[data-status-indicator]")).toBeInTheDocument();
  });

  it("diferencia visualmente un estado completado", () => {
    render(<Badge variant="completed">Completado</Badge>);
    const badge = screen.getByText("Completado");
    expect(badge).toHaveAttribute("data-status", "completed");
    expect(badge.querySelector("svg")).toBeInTheDocument();
  });

  it("representa estados habilitados sin el pulso de una actividad en vivo", () => {
    render(<Badge variant="enabled">Activo</Badge>);
    const badge = screen.getByText("Activo");
    expect(badge).toHaveAttribute("data-status", "enabled");
    expect(badge.querySelector("svg")).toBeInTheDocument();
    expect(badge.querySelector(".animate-ping")).not.toBeInTheDocument();
  });
});
