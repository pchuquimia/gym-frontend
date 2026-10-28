import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { axiosClient } from "./axiosConfig";
import { AUTH_SESSION_EXPIRED_EVENT } from "./authSession";
import { clearAuthToken, setAuthToken } from "./tokenStorage";

const originalAdapter = axiosClient.defaults.adapter;
beforeEach(() => {
  axiosClient.defaults.adapter = async (config) => {
    if (config.url !== "/api/auth/csrf")
      throw new Error("Unexpected unmocked API request");
    return {
      config,
      status: 200,
      data: { csrfToken: "test-session-token" },
      headers: {},
    };
  };
});
afterEach(() => {
  axiosClient.defaults.adapter = originalAdapter;
  clearAuthToken();
  vi.restoreAllMocks();
});

const failingAdapter = (status, data) => async (config) => {
  throw Object.assign(new Error("request failed"), {
    config,
    response: { status, data, config },
  });
};

test("un 401 de sesión informa su motivo", async () => {
  const listener = vi.fn();
  window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, listener);
  try {
    await expect(
      axiosClient.get("/api/trainings", {
        adapter: failingAdapter(401, { code: "AUTH_SESSION_REVOKED" }),
      }),
    ).rejects.toMatchObject({ status: 401 });
    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0][0].detail.code).toBe("AUTH_SESSION_REVOKED");
  } finally {
    window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, listener);
  }
});

test.each([401, 403, 503])(
  "la verificación controlada no emite cierre global: %s",
  async (status) => {
    const listener = vi.fn();
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, listener);
    try {
      await expect(
        axiosClient.get("/api/auth/me", {
          skipSessionExpiration: true,
          adapter: failingAdapter(status, { error: "No autenticado" }),
        }),
      ).rejects.toMatchObject({ status });
      expect(listener).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, listener);
    }
  },
);

test.each(["AUTH_SESSION_EXPIRED", "AUTH_SESSION_MISSING"])(
  "un 401 atrasado de un acceso anterior no cierra ni reintenta el nuevo: %s",
  async (code) => {
    const listener = vi.fn();
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, listener);
    setAuthToken("previous-access");
    let rejectRequest;
    let requestStarted;
    const started = new Promise((resolve) => {
      requestStarted = resolve;
    });
    const request = axiosClient.get("/api/trainings", {
      adapter: (config) =>
        new Promise((_, reject) => {
          rejectRequest = () =>
            reject(
              Object.assign(new Error("expired"), {
                config,
                response: { status: 401, data: { code }, config },
              }),
            );
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
  },
);

test("recupera una lectura sin credenciales antes de emitir un cierre", async () => {
  const listener = vi.fn();
  window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, listener);
  const adapter = vi.fn(async (config) => {
    if (!config.authRecoveryAttempted) {
      window.sessionStorage.setItem("gym_auth_token", "restored-token");
      return failingAdapter(401, { code: "AUTH_SESSION_MISSING" })(config);
    }
    expect(config.headers.Authorization).toBe("Bearer restored-token");
    return { config, status: 200, data: { ok: true }, headers: {} };
  });
  try {
    const response = await axiosClient.get("/api/auth/me", {
      adapter,
      skipSessionExpiration: true,
    });
    expect(response.data).toEqual({ ok: true });
    expect(adapter).toHaveBeenCalledTimes(2);
    expect(listener).not.toHaveBeenCalled();
  } finally {
    window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, listener);
  }
});

test("si siguen faltando credenciales, reintenta solo una vez y emite un único cierre", async () => {
  const listener = vi.fn();
  window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, listener);
  const adapter = vi.fn(failingAdapter(401, { code: "AUTH_SESSION_MISSING" }));
  try {
    await expect(
      axiosClient.get("/api/trainings", { adapter }),
    ).rejects.toMatchObject({
      status: 401,
      code: "AUTH_SESSION_MISSING",
    });
    expect(adapter).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenCalledOnce();
  } finally {
    window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, listener);
  }
});

test.each([
  "AUTH_SESSION_EXPIRED",
  "AUTH_SESSION_INVALID",
  "AUTH_SESSION_REVOKED",
])("no reintenta un token rechazado por el servidor: %s", async (code) => {
  const adapter = vi.fn(failingAdapter(401, { code }));
  await expect(
    axiosClient.get("/api/trainings", { adapter }),
  ).rejects.toMatchObject({ status: 401, code });
  expect(adapter).toHaveBeenCalledOnce();
});

test.each(["post", "patch", "delete"])(
  "no repite escrituras: %s",
  async (method) => {
    const adapter = vi.fn(
      failingAdapter(401, { code: "AUTH_SESSION_MISSING" }),
    );
    await expect(
      axiosClient.request({ url: "/api/trainings", method, adapter }),
    ).rejects.toMatchObject({ status: 401 });
    expect(adapter).toHaveBeenCalledOnce();
  },
);

test("no reintenta solicitudes sin autenticación", async () => {
  const adapter = vi.fn(failingAdapter(401, { code: "AUTH_SESSION_MISSING" }));
  await expect(
    axiosClient.get("/public", { skipAuth: true, adapter }),
  ).rejects.toMatchObject({ status: 401 });
  expect(adapter).toHaveBeenCalledOnce();
});

test("un rechazo CSRF atrasado no repite una escritura con la nueva sesión", async () => {
  setAuthToken("previous-access");
  let rejectWrite;
  let started;
  const ready = new Promise((resolve) => {
    started = resolve;
  });
  const adapter = vi.fn(
    (config) =>
      new Promise((_, reject) => {
        rejectWrite = () =>
          reject(
            Object.assign(new Error("CSRF rejected"), {
              config,
              response: {
                status: 403,
                data: { code: "INVALID_CSRF_TOKEN" },
                config,
              },
            }),
          );
        started();
      }),
  );
  const pendingWrite = axiosClient.post("/api/hydration", {}, { adapter });
  const result = expect(pendingWrite).rejects.toMatchObject({
    status: 403,
    code: "INVALID_CSRF_TOKEN",
  });
  await ready;
  setAuthToken("new-access");
  rejectWrite();
  await result;
  expect(adapter).toHaveBeenCalledOnce();
});
