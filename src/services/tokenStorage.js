const TOKEN_KEY = "gym_auth_token";

const getStorage = (name) => {
  if (typeof window === "undefined") return null;
  if (name === "localStorage") return window.localStorage;
  if (name === "sessionStorage") return window.sessionStorage;
  return null;
};

const configuredStorage =
  import.meta.env.VITE_AUTH_TOKEN_STORAGE || "localStorage";

export const getAuthToken = () => {
  try {
    return getStorage(configuredStorage)?.getItem(TOKEN_KEY) || "";
  } catch (_err) {
    return "";
  }
};

export const setAuthToken = (token) => {
  try {
    const storage = getStorage(configuredStorage);
    if (!storage || !token) return;
    storage.setItem(TOKEN_KEY, token);
  } catch (_err) {
    // Storage can fail in private browsing or strict browser modes.
  }
};

export const clearAuthToken = () => {
  try {
    window.localStorage?.removeItem(TOKEN_KEY);
    window.sessionStorage?.removeItem(TOKEN_KEY);
  } catch (_err) {
    // Ignore storage cleanup failures.
  }
};
