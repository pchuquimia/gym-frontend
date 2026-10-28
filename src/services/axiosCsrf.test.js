import { AxiosError } from "axios";
import { beforeEach, expect, test, vi } from "vitest";

let client;
beforeEach(async () => {
  vi.resetModules();
  window.localStorage.clear();
  window.sessionStorage.clear();
  client = (await import("./axiosConfig")).axiosClient;
});

const response = (config, data, status = 200) => ({
  config,
  data,
  status,
  statusText: "",
  headers: {},
});

test("shares CSRF reads across parallel writes and leaves GET requests untouched", async () => {
  let tokenReads = 0;
  client.defaults.adapter = async (config) => {
    if (config.url === "/api/auth/csrf") {
      tokenReads += 1;
      return response(config, { csrfToken: "session-bound-token" });
    }
    if (config.method === "post")
      expect(config.headers.get("X-CSRF-Token")).toBe("session-bound-token");
    else expect(config.headers.has("X-CSRF-Token")).toBe(false);
    return response(config, {});
  };
  await Promise.all([
    client.post("/api/hydration", {}),
    client.post("/api/check-ins", {}),
  ]);
  await client.get("/api/auth/me");
  expect(tokenReads).toBe(1);
});

test("refreshes the token after login replaces the cookie", async () => {
  let tokenReads = 0;
  client.defaults.adapter = async (config) =>
    config.url === "/api/auth/csrf"
      ? response(config, { csrfToken: `token-${++tokenReads}` })
      : response(config, { received: config.headers.get("X-CSRF-Token") });
  expect((await client.post("/api/auth/login", {})).data.received).toBe(
    "token-1",
  );
  expect((await client.post("/api/hydration", {})).data.received).toBe(
    "token-2",
  );
});

test("retries a rejected CSRF request once and does not retry ordinary failures", async () => {
  let tokenReads = 0;
  let writes = 0;
  client.defaults.adapter = async (config) => {
    if (config.url === "/api/auth/csrf")
      return response(config, { csrfToken: `token-${++tokenReads}` });
    writes += 1;
    throw new AxiosError(
      "Forbidden",
      "ERR_BAD_REQUEST",
      config,
      null,
      response(
        config,
        { error: "Session changed", code: "INVALID_CSRF_TOKEN" },
        403,
      ),
    );
  };
  await expect(client.post("/api/hydration", {})).rejects.toMatchObject({
    code: "INVALID_CSRF_TOKEN",
    status: 403,
  });
  expect(writes).toBe(2);
  expect(tokenReads).toBe(2);

  writes = 0;
  client.defaults.adapter = async (config) => {
    writes += 1;
    throw new AxiosError(
      "Forbidden",
      "ERR_BAD_REQUEST",
      config,
      null,
      response(config, { error: "Forbidden", code: "UNTRUSTED_ORIGIN" }, 403),
    );
  };
  await expect(client.post("/api/hydration", {})).rejects.toMatchObject({
    code: "UNTRUSTED_ORIGIN",
  });
  expect(writes).toBe(1);
});
