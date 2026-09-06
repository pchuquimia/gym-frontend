import { afterEach, describe, expect, it } from "vitest";
import {
  clearAuthToken,
  getAuthToken,
  setAuthToken,
} from "./tokenStorage";

const TOKEN_KEY = "gym_auth_token";

describe("tokenStorage", () => {
  afterEach(() => clearAuthToken());

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
});
