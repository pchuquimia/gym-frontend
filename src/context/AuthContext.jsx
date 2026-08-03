import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { clearAuthToken, setAuthToken } from "../services/tokenStorage";

const AuthContext = createContext(null);

const USER_STORAGE_KEYS = [
  "active_page",
  "active_training",
  "active_training_snapshot",
  "routine_edit_library_draft",
  "training_routines_return",
  "training_routine_edit_target",
  "routine_updated_during_training",
  "edit_training_id",
  "edit_training_date",
  "last_training_id",
  "last_exercise_id",
];

const clearUserScopedStorage = () => {
  if (typeof window === "undefined") return;
  USER_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
  Object.keys(window.localStorage)
    .filter((key) => key.startsWith("exercise_thumb_"))
    .forEach((key) => window.localStorage.removeItem(key));
};

const normalizeUser = (payload) => payload?.user || payload || null;

const shouldUseDevAdminLogin = () => {
  if (!import.meta.env.DEV || typeof window === "undefined") return false;
  return ["localhost", "127.0.0.1"].includes(window.location.hostname);
};

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const developmentAdminMode = shouldUseDevAdminLogin();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshUser = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      setError("");
      try {
        const data = await api.me();
        const nextUser = normalizeUser(data);
        setUser(nextUser);
        return nextUser;
      } catch (_err) {
        if (shouldUseDevAdminLogin()) {
          try {
            const data = await api.devAdminLogin();
            if (data?.token) setAuthToken(data.token);
            const nextUser = normalizeUser(data);
            setUser(nextUser);
            return nextUser;
          } catch {
            // Fall through to normal unauthenticated state.
          }
        }
        clearAuthToken();
        clearUserScopedStorage();
        queryClient.clear();
        setUser(null);
        return null;
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [queryClient],
  );

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    if (!user?.id) return undefined;

    const refreshPermissions = () => refreshUser({ silent: true });
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshPermissions();
    };

    window.addEventListener("focus", refreshPermissions);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    const intervalId = window.setInterval(refreshPermissions, 60_000);

    return () => {
      window.removeEventListener("focus", refreshPermissions);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [refreshUser, user?.id]);

  const login = useCallback(async (payload) => {
    setError("");
    const data = await api.login(payload);
    if (data?.token) setAuthToken(data.token);
    const nextUser = normalizeUser(data);
    setUser(nextUser);
    return nextUser;
  }, []);

  const register = useCallback(async (payload) => {
    setError("");
    const data = await api.register(payload);
    if (data?.verificationRequired) return data;
    if (data?.token) setAuthToken(data.token);
    const nextUser = normalizeUser(data);
    setUser(nextUser);
    return nextUser;
  }, []);

  const verifyEmail = useCallback(async (token) => {
    setError("");
    const data = await api.verifyEmail({ token });
    if (data?.token) setAuthToken(data.token);
    const nextUser = normalizeUser(data);
    setUser(nextUser);
    return nextUser;
  }, []);

  const updateAccount = useCallback(async (payload) => {
    const data = await api.updateAccount(payload);
    const nextUser = normalizeUser(data);
    setUser(nextUser);
    return data;
  }, []);

  const logout = useCallback(async () => {
    if (developmentAdminMode) return false;
    try {
      await api.logout();
    } finally {
      setUser(null);
      clearAuthToken();
      queryClient.clear();
      clearUserScopedStorage();
    }
    return true;
  }, [developmentAdminMode, queryClient]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      loading,
      error,
      setError,
      login,
      register,
      verifyEmail,
      updateAccount,
      logout,
      refreshUser,
      developmentAdminMode,
    }),
    [
      user,
      loading,
      error,
      login,
      register,
      verifyEmail,
      updateAccount,
      logout,
      refreshUser,
      developmentAdminMode,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
