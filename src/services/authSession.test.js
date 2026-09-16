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
