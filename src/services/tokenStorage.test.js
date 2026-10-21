import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearAuthToken,
  getAuthToken,
  setAuthToken,
} from "./tokenStorage";

const TOKEN_KEY = "gym_auth_token";

describe("tokenStorage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    clearAuthToken();
  });

  it("keeps a non-persistent login in session storage", () => {
    setAuthToken("session-token", { persistent: false });

    expect(window.sessionStorage.getItem(TOKEN_KEY)).toBe("session-token");
    expect(window.localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(getAuthToken()).toBe("session-token");
  });

  it("keeps a remembered login in local storage", () => {
    setAuthToken("persistent-token", { persistent: true });

    expect(window.localStorage.getItem(TOKEN_KEY)).toBe("persistent-token");
    expect(window.sessionStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(getAuthToken()).toBe("persistent-token");
  });

  it("removes an older persistent token when login becomes session-only", () => {
    setAuthToken("old-token", { persistent: true });
    setAuthToken("new-token", { persistent: false });

    expect(window.localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(window.sessionStorage.getItem(TOKEN_KEY)).toBe("new-token");
  });

  it("reads a session token even when access to local storage is blocked", () => {
    window.sessionStorage.setItem(TOKEN_KEY, "restored-session");
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("Storage blocked", "SecurityError");
    });
    expect(getAuthToken()).toBe("restored-session");
  });

  it("writes and clears session storage independently of a blocked local store", () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("Storage blocked", "SecurityError");
    });
    setAuthToken("session-token", { persistent: false });
    expect(window.sessionStorage.getItem(TOKEN_KEY)).toBe("session-token");
    clearAuthToken();
    expect(window.sessionStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(getAuthToken()).toBe("");
  });

  it("keeps a restored token in memory if storage later becomes unavailable", () => {
    window.localStorage.setItem(TOKEN_KEY, "restored-token");
    expect(getAuthToken()).toBe("restored-token");
    for (const name of ["localStorage", "sessionStorage"]) {
      vi.spyOn(window, name, "get").mockImplementation(() => {
        throw new DOMException("Storage blocked", "SecurityError");
      });
    }
    expect(getAuthToken()).toBe("restored-token");
    clearAuthToken();
    expect(getAuthToken()).toBe("");
  });
});
