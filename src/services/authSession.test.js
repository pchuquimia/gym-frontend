import { afterEach, describe, expect, test, vi } from "vitest";
import {
  AUTH_SESSION_EXPIRED_EVENT,
  consumeExpiredSessionNotice,
  isExpiredSessionResponse,
  notifyExpiredSession,
  storeExpiredSessionNotice,
} from "./authSession";

afterEach(() => {
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("auth session lifecycle", () => {
  test("reconoce un 401 de una ruta protegida", () => {
    expect(
      isExpiredSessionResponse({
        status: 401,
        url: "/api/trainings/123",
        data: { error: "No autenticado" },
      }),
    ).toBe(true);
  });

  test("no confunde credenciales incorrectas con una sesión expirada", () => {
    expect(
      isExpiredSessionResponse({
        status: 401,
        url: "/api/auth/login",
        data: { error: "Credenciales inválidas" },
      }),
    ).toBe(false);
  });

  test.each([403, 429, 500, 503, undefined])("no expira por permisos, red o servidor: %s", (status) => {
    expect(isExpiredSessionResponse({
      status, url: "/api/auth/me", data: { error: "No autenticado" },
    })).toBe(false);
  });

  test("reconoce códigos de sesión aunque cambie el texto", () => {
    expect(isExpiredSessionResponse({
      status: 401, url: "/api/trainings", data: { code: "AUTH_SESSION_REVOKED" },
    })).toBe(true);
  });

  test.each([
    ["AUTH_SESSION_REVOKED", "invalidada"],
    ["AUTH_SESSION_MISSING", "No encontramos"],
    ["AUTH_ACCOUNT_UNAVAILABLE", "soporte"],
    ["AUTH_DEMO_EXPIRED", "demostración terminó"],
  ])("explica por qué terminó el acceso: %s", (code, text) => {
    storeExpiredSessionNotice(code);
    expect(consumeExpiredSessionNotice()).toContain(text);
  });

  test("emite el evento global de expiración", () => {
    const listener = vi.fn();
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, listener, {
      once: true,
    });
    notifyExpiredSession();
    expect(listener).toHaveBeenCalledOnce();
  });

  test("el aviso de sesión se consume una sola vez", () => {
    storeExpiredSessionNotice();
    expect(consumeExpiredSessionNotice()).toContain("sesión venció");
    expect(consumeExpiredSessionNotice()).toBe("");
  });
});
