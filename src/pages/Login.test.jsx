import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import Login from "./Login";
import { useAuth } from "../context/AuthContext";

vi.mock("../context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("../config/googleAuth", () => ({ isGoogleSignInConfigured: false }));

const login = vi.fn();
beforeEach(() => {
  login.mockReset().mockResolvedValue({ id: "athlete-1", role: "Cliente" });
  useAuth.mockReturnValue({ login });
});

test.each([true, false])("respeta la persistencia elegida al iniciar sesión: %s", async (remember) => {
  render(<Login onNavigate={vi.fn()} />);
  const checkbox = screen.getByRole("checkbox", { name: "Mantener mi sesión iniciada" });
  expect(checkbox).toBeChecked();
  if (!remember) {
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
    expect(checkbox).toHaveAccessibleDescription(/Al volver a abrir el navegador/);
  }
  fireEvent.change(screen.getByLabelText("Correo o usuario"), { target: { value: "atleta" } });
  fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "test-password" } });
  fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));
  await waitFor(() => expect(login).toHaveBeenCalledWith(
    { identifier: "atleta", password: "test-password" }, { remember },
  ));
});
