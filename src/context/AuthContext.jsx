import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { clearAuthToken, setAuthToken } from "../services/tokenStorage";

const AuthContext = createContext(null);
const ACTIVE_TRAINING_KEY = "active_training_snapshot";
const USER_CACHE_KEY = "gym_authenticated_user";
const DEV_AUTO_LOGIN_DISABLED_KEY = "gym_dev_auto_login_disabled";
const scopedTrainingKey = (userId) =>
  userId ? `${ACTIVE_TRAINING_KEY}:${userId}` : "";

const readCachedUser = () => {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem(USER_CACHE_KEY)) || null;
  } catch {
    return null;
  }
};

const cacheUser = (user) => {
  if (typeof window === "undefined") return;
  try {
    if (user) {
      window.localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(USER_CACHE_KEY);
    }
  } catch {
    // Authentication still works when persistent storage is unavailable.
  }
};

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
  "view_training_id",
  "view_training_date",
  "last_training_id",
  "last_exercise_id",
  "coach_athlete_context",
  "training_plan_routine_intent",
  "apex_onboarding_draft",
];

const clearUserScopedStorage = () => {
  if (typeof window === "undefined") return;
  try {
    USER_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith("exercise_thumb_"))
      .forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Some mobile browsers restrict storage in private mode.
  }
};

const archiveActiveTraining = (userId) => {
  if (typeof window === "undefined" || !userId) return;
  const scopedKey = scopedTrainingKey(userId);
  try {
    const raw = window.localStorage.getItem(ACTIVE_TRAINING_KEY);
    if (!raw) return;
    const snapshot = JSON.parse(raw);
    const now = Date.now();
    const lastUpdate = Number(snapshot.lastUpdate || now);
    const durationSeconds =
      Number(snapshot.durationSeconds ?? snapshot.elapsed ?? 0) +
      (snapshot.isRunning
        ? Math.max(0, Math.floor((now - lastUpdate) / 1000))
        : 0);
    const timeEvents = Array.isArray(snapshot.timeEvents)
      ? [...snapshot.timeEvents]
      : [];
    if (snapshot.isRunning) {
      timeEvents.push({
        type: "session_pause",
        exerciseId: snapshot.activeExerciseId || null,
        at: new Date(now).toISOString(),
      });
    }
    window.localStorage.setItem(
      scopedKey,
      JSON.stringify({
        ...snapshot,
        durationSeconds,
        elapsed: durationSeconds,
        isRunning: false,
        activeExerciseId: "",
        lastUpdate: now,
        timeEvents,
      }),
    );
  } catch {
    // Keep any previous valid backup when the latest snapshot is unreadable.
  }
};

const restoreActiveTraining = (userId) => {
  if (typeof window === "undefined" || !userId) return;
  try {
    const scopedKey = scopedTrainingKey(userId);
    const scoped = window.localStorage.getItem(scopedKey);
    if (!scoped) return;
    if (!window.localStorage.getItem(ACTIVE_TRAINING_KEY)) {
      window.localStorage.setItem(ACTIVE_TRAINING_KEY, scoped);
    }
    window.localStorage.removeItem(scopedKey);
  } catch {
    // The next successful login/focus event can retry restoration.
  }
};

const normalizeUser = (payload) => payload?.user || payload || null;

const preserveActiveTraining = (userId) => {
  if (typeof window === "undefined" || !userId) return;
  window.dispatchEvent(new Event("persist-active-training"));
  archiveActiveTraining(userId);
};

const shouldUseDevAdminLogin = () => {
  if (!import.meta.env.DEV || typeof window === "undefined") return false;
  const host = window.location.hostname;
  return (
    ["localhost", "127.0.0.1"].includes(host) ||
    /^192\.168\./.test(host) ||
    /^10\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  );
};

const isDevAutoLoginDisabled = () => {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(DEV_AUTO_LOGIN_DISABLED_KEY) === "true";
};

const setDevAutoLoginDisabled = (disabled) => {
  if (typeof window === "undefined") return;
  if (disabled) {
    window.sessionStorage.setItem(DEV_AUTO_LOGIN_DISABLED_KEY, "true");
  } else {
    window.sessionStorage.removeItem(DEV_AUTO_LOGIN_DISABLED_KEY);
  }
};

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const developmentAdminMode = shouldUseDevAdminLogin();
  const [user, setUser] = useState(readCachedUser);
  const [loading, setLoading] = useState(() => !readCachedUser());
  const [error, setError] = useState("");
  const userRef = useRef(user);
  const refreshInFlightRef = useRef(null);
  const lastVerifiedAtRef = useRef(0);

  const commitUser = useCallback((nextUser) => {
    userRef.current = nextUser;
    if (nextUser) lastVerifiedAtRef.current = Date.now();
    setUser(nextUser);
    cacheUser(nextUser);
  }, []);

  const refreshUser = useCallback(
    ({ silent = false, force = false } = {}) => {
      if (
        shouldUseDevAdminLogin() &&
        isDevAutoLoginDisabled() &&
        !userRef.current
      ) {
        if (!silent) setLoading(false);
        return Promise.resolve(null);
      }
      if (refreshInFlightRef.current) return refreshInFlightRef.current;
      if (
        silent &&
        !force &&
        userRef.current &&
        Date.now() - lastVerifiedAtRef.current < 30_000
      ) {
        return Promise.resolve(userRef.current);
      }

      if (!silent) setLoading(true);
      setError("");

      const operation = (async () => {
        try {
          const data = await api.me();
          const nextUser = normalizeUser(data);
          restoreActiveTraining(nextUser?.id || nextUser?._id);
          commitUser(nextUser);
          return nextUser;
        } catch (requestError) {
          if (shouldUseDevAdminLogin() && !isDevAutoLoginDisabled()) {
            try {
              const data = await api.devAdminLogin();
              if (data?.token) setAuthToken(data.token);
              const nextUser = normalizeUser(data);
              restoreActiveTraining(nextUser?.id || nextUser?._id);
              commitUser(nextUser);
              return nextUser;
            } catch (devError) {
              if (devError?.status !== 401 && devError?.status !== 403) {
                return userRef.current;
              }
            }
          }

          if (requestError?.status !== 401) {
            if (!silent) {
              setError(
                "No se pudo verificar la sesión. Conservamos tus datos y volveremos a intentarlo.",
              );
            }
            return userRef.current;
          }

          const currentUser = userRef.current;
          preserveActiveTraining(currentUser?.id || currentUser?._id);
          clearAuthToken();
          clearUserScopedStorage();
          queryClient.clear();
          commitUser(null);
          return null;
        } finally {
          if (!silent) setLoading(false);
        }
      })();

      refreshInFlightRef.current = operation;
      const clearInFlight = () => {
        if (refreshInFlightRef.current === operation) {
          refreshInFlightRef.current = null;
        }
      };
      operation.then(clearInFlight, clearInFlight);
      return operation;
    },
    [commitUser, queryClient],
  );

  useEffect(() => {
    refreshUser({ silent: Boolean(userRef.current) });
  }, [refreshUser]);

  useEffect(() => {
    if (!user?.id) return undefined;

    const refreshPermissions = () => refreshUser({ silent: true });
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshPermissions();
    };

    window.addEventListener("focus", refreshPermissions);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    const intervalId = window.setInterval(refreshPermissions, 2 * 60_000);

    return () => {
      window.removeEventListener("focus", refreshPermissions);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [refreshUser, user?.id]);

  const login = useCallback(
    async (payload) => {
      setError("");
      setDevAutoLoginDisabled(false);
      const data = await api.login(payload);
      if (data?.token) setAuthToken(data.token);
      queryClient.clear();
      const nextUser = normalizeUser(data);
      restoreActiveTraining(nextUser?.id || nextUser?._id);
      commitUser(nextUser);
      return nextUser;
    },
    [commitUser, queryClient],
  );

  const loginDemo = useCallback(
    async (role) => {
      setError("");
      setDevAutoLoginDisabled(false);
      const data = await api.demoLogin(role);
      if (data?.token) setAuthToken(data.token);
      queryClient.clear();
      clearUserScopedStorage();
      const nextUser = normalizeUser(data);
      commitUser(nextUser);
      return nextUser;
    },
    [commitUser, queryClient],
  );

  const register = useCallback(
    async (payload) => {
      setError("");
      setDevAutoLoginDisabled(false);
      const data = await api.register(payload);
      if (data?.verificationRequired) return data;
      if (data?.token) setAuthToken(data.token);
      queryClient.clear();
      const nextUser = normalizeUser(data);
      restoreActiveTraining(nextUser?.id || nextUser?._id);
      commitUser(nextUser);
      return nextUser;
    },
    [commitUser, queryClient],
  );

  const verifyEmail = useCallback(
    async (token) => {
      setError("");
      const data = await api.verifyEmail({ token });
      if (data?.token) setAuthToken(data.token);
      queryClient.clear();
      const nextUser = normalizeUser(data);
      restoreActiveTraining(nextUser?.id || nextUser?._id);
      commitUser(nextUser);
      return nextUser;
    },
    [commitUser, queryClient],
  );

  const updateAccount = useCallback(
    async (payload) => {
      const data = await api.updateAccount(payload);
      const nextUser = normalizeUser(data);
      commitUser(nextUser);
      return data;
    },
    [commitUser],
  );

  const completeOnboarding = useCallback(
    async (payload) => {
      const data = await api.completeOnboarding(payload);
      const nextUser = normalizeUser(data);
      commitUser(nextUser);
      return nextUser;
    },
    [commitUser],
  );

  const logout = useCallback(async () => {
    const userId = userRef.current?.id || userRef.current?._id;
    preserveActiveTraining(userId);
    if (developmentAdminMode) setDevAutoLoginDisabled(true);
    try {
      await api.logout();
    } finally {
      clearAuthToken();
      queryClient.clear();
      clearUserScopedStorage();
      commitUser(null);
    }
    return true;
  }, [commitUser, developmentAdminMode, queryClient]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      loading,
      error,
      setError,
      login,
      loginDemo,
      register,
      verifyEmail,
      updateAccount,
      completeOnboarding,
      logout,
      refreshUser,
      developmentAdminMode,
    }),
    [
      user,
      loading,
      error,
      login,
      loginDemo,
      register,
      verifyEmail,
      updateAccount,
      completeOnboarding,
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
