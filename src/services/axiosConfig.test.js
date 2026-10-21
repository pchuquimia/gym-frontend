import { afterEach, expect, test, vi } from "vitest";
import { axiosClient } from "./axiosConfig";
import { AUTH_SESSION_EXPIRED_EVENT } from "./authSession";
import { clearAuthToken, setAuthToken } from "./tokenStorage";

afterEach(() => {
  clearAuthToken();
  vi.restoreAllMocks();
});

const failingAdapter = (status, data) => async (config) => {
  throw Object.assign(new Error("request failed"), {
    config, response: { status, data, config },
  });
};

test("un 401 de sesión informa su motivo", async () => {
  const listener = vi.fn();
  window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, listener);
  try {
    await expect(axiosClient.get("/api/trainings", {
      adapter: failingAdapter(401, { code: "AUTH_SESSION_REVOKED" }),
    })).rejects.toMatchObject({ status: 401 });
    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0][0].detail.code).toBe("AUTH_SESSION_REVOKED");
  } finally {
    window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, listener);
  }
});

test.each([401, 403, 503])("la verificación controlada no emite cierre global: %s", async (status) => {
  const listener = vi.fn();
  window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, listener);
  try {
    await expect(axiosClient.get("/api/auth/me", {
      skipSessionExpiration: true,
      adapter: failingAdapter(status, { error: "No autenticado" }),
    })).rejects.toMatchObject({ status });
    expect(listener).not.toHaveBeenCalled();
  } finally {
    window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, listener);
  }
});

test("un 401 atrasado de un acceso anterior no cierra el nuevo", async () => {
  const listener = vi.fn();
  window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, listener);
  setAuthToken("previous-access");
  let rejectRequest;
  let requestStarted;
  const started = new Promise((resolve) => { requestStarted = resolve; });
  const request = axiosClient.get("/api/trainings", {
    adapter: (config) => new Promise((_, reject) => {
      rejectRequest = () => reject(Object.assign(new Error("expired"), {
        config, response: { status: 401, data: { code: "AUTH_SESSION_EXPIRED" }, config },
      }));
      requestStarted();
    }),
  });
  const result = expect(request).rejects.toMatchObject({ status: 401 });
  try {
    await started;
    setAuthToken("new-access");
    rejectRequest();
    await result;
    expect(listener).not.toHaveBeenCalled();
  } finally {
    window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, listener);
  }
});
