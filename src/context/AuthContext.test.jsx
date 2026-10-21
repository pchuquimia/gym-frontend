import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { AuthProvider, useAuth } from "./AuthContext";
import { api } from "../services/api";
import { consumeExpiredSessionNotice } from "../services/authSession";
import { clearAuthToken, getAuthToken, setAuthToken } from "../services/tokenStorage";

vi.mock("../services/api", () => ({
  api: { me: vi.fn(), login: vi.fn(), logout: vi.fn(), devAdminLogin: vi.fn() },
}));

const user = { id: "athlete-1", name: "Atleta", role: "Cliente" };
const cachedUserKey = "gym_authenticated_user";
const renderAuth = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }) => (
    <QueryClientProvider client={client}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
  return renderHook(() => useAuth(), { wrapper });
};

beforeEach(() => {
  vi.stubEnv("DEV", false);
  window.localStorage.clear();
  window.sessionStorage.clear();
  clearAuthToken();
  window.localStorage.setItem(cachedUserKey, JSON.stringify(user));
  api.me.mockReset().mockResolvedValue({ user });
  api.login.mockReset().mockResolvedValue({ user, token: "new-token" });
  api.logout.mockReset().mockResolvedValue({ ok: true });
  api.devAdminLogin.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

test.each([undefined, 403, 429, 500, 503])("conserva el acceso ante un fallo temporal o de permisos (%s)", async (status) => {
  api.me.mockRejectedValue(Object.assign(new Error("temporary failure"), { status }));
  setAuthToken("existing-token");
  const { result } = renderAuth();
  await act(async () => {});
  expect(result.current.isAuthenticated).toBe(true);
  expect(getAuthToken()).toBe("existing-token");
  expect(consumeExpiredSessionNotice()).toBe("");
});

test("una sesión revocada limpia el acceso, explica el motivo y conserva el entrenamiento por usuario", async () => {
  const snapshot = { id: "training-1", durationSeconds: 120, isRunning: false, exercises: [{ id: "exercise-1", sets: [{ reps: 8, weight: 30 }] }] };
  window.localStorage.setItem("active_training_snapshot", JSON.stringify(snapshot));
  setAuthToken("revoked-token");
  api.me.mockRejectedValue(Object.assign(new Error("No autenticado"), {
    status: 401, code: "AUTH_SESSION_REVOKED",
  }));
  const { result } = renderAuth();
  await waitFor(() => expect(result.current.isAuthenticated).toBe(false));
  expect(getAuthToken()).toBe("");
  expect(window.localStorage.getItem(cachedUserKey)).toBeNull();
  expect(window.localStorage.getItem("active_training_snapshot")).toBeNull();
  expect(JSON.parse(window.localStorage.getItem("active_training_snapshot:athlete-1"))).toMatchObject(snapshot);
  expect(consumeExpiredSessionNotice()).toContain("invalidada");

  await act(async () => result.current.login({ identifier: "athlete", password: "test-password" }));
  expect(JSON.parse(window.localStorage.getItem("active_training_snapshot"))).toMatchObject(snapshot);
});

test("verifica de nuevo al recuperar internet, incluso dentro del intervalo de 30 segundos", async () => {
  renderAuth();
  await act(async () => {});
  expect(api.me).toHaveBeenCalledTimes(1);
  await act(async () => window.dispatchEvent(new Event("online")));
  expect(api.me).toHaveBeenCalledTimes(2);
});

test("una verificación atrasada no restaura la sesión después de salir", async () => {
  let resolveVerification;
  api.me.mockReturnValue(new Promise((resolve) => { resolveVerification = resolve; }));
  setAuthToken("old-token");
  const { result } = renderAuth();
  await act(async () => result.current.logout());
  await act(async () => resolveVerification({ user }));
  expect(result.current.isAuthenticated).toBe(false);
  expect(getAuthToken()).toBe("");
  expect(consumeExpiredSessionNotice()).toBe("");
});

test.each(["resolve", "reject"])("una verificación anterior no reemplaza ni cierra un nuevo acceso (%s)", async (outcome) => {
  let resolveVerification;
  let rejectVerification;
  api.me.mockReturnValue(new Promise((resolve, reject) => {
    resolveVerification = resolve;
    rejectVerification = reject;
  }));
  const newUser = { id: "athlete-2", name: "Otro atleta", role: "Cliente" };
  api.login.mockResolvedValue({ user: newUser, token: "new-token" });
  const { result } = renderAuth();
  await act(async () => result.current.login({ identifier: "athlete", password: "test-password" }));
  await act(async () => {
    if (outcome === "resolve") resolveVerification({ user });
    else rejectVerification(Object.assign(new Error("No autenticado"), { status: 401 }));
  });
  expect(result.current.user.id).toBe("athlete-2");
  expect(getAuthToken()).toBe("new-token");
});

test("un error de red no activa el acceso automático de administrador en desarrollo", async () => {
  vi.stubEnv("DEV", true);
  api.me.mockRejectedValue(new Error("Network Error"));
  const { result } = renderAuth();
  await act(async () => {});
  expect(result.current.user.id).toBe(user.id);
  expect(api.devAdminLogin).not.toHaveBeenCalled();
});
