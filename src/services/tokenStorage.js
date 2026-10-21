import { advanceAuthSessionVersion } from "./authSession";

const TOKEN_KEY = "gym_auth_token";
let memoryToken = "";

const getStorage = (name) => {
  if (typeof window === "undefined") return null;
  try {
    if (name === "localStorage") return window.localStorage;
    if (name === "sessionStorage") return window.sessionStorage;
  } catch {
    // Access to one store must not prevent using the other store.
  }
  return null;
};

const readToken = (name) => {
  try {
    return getStorage(name)?.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
};

const removeToken = (name) => {
  try {
    getStorage(name)?.removeItem(TOKEN_KEY);
  } catch {
    // Storage cleanup is independent for each store.
  }
};

const configuredStorage =
  import.meta.env.VITE_AUTH_TOKEN_STORAGE || "localStorage";

export const getAuthToken = () => {
  const storedToken =
    readToken(configuredStorage) ||
    readToken("localStorage") ||
    readToken("sessionStorage");
  // Keep the restored credential available if storage becomes unavailable
  // while a mobile browser suspends/resumes the same page.
  if (storedToken) memoryToken = storedToken;
  return storedToken || memoryToken;
};

export const setAuthToken = (
  token,
  { persistent = configuredStorage === "localStorage" } = {},
) => {
  advanceAuthSessionVersion();
  memoryToken = token || "";
  removeToken("localStorage");
  removeToken("sessionStorage");
  try {
    const storage = getStorage(persistent ? "localStorage" : "sessionStorage");
    if (!storage || !token) return;
    storage.setItem(TOKEN_KEY, token);
  } catch (_err) {
    // Storage can fail in private browsing or strict browser modes.
  }
};

export const clearAuthToken = () => {
  advanceAuthSessionVersion();
  memoryToken = "";
  removeToken("localStorage");
  removeToken("sessionStorage");
};
