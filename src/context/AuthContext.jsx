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

const AuthContext = createContext(null);

const normalizeUser = (payload) => payload?.user || payload || null;

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshUser = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.me();
      const nextUser = normalizeUser(data);
      setUser(nextUser);
      return nextUser;
    } catch (_err) {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (payload) => {
    setError("");
    const data = await api.login(payload);
    const nextUser = normalizeUser(data);
    setUser(nextUser);
    return nextUser;
  }, []);

  const register = useCallback(async (payload) => {
    setError("");
    const data = await api.register(payload);
    const nextUser = normalizeUser(data);
    setUser(nextUser);
    return nextUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
      queryClient.clear();
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("active_page");
      }
    }
  }, [queryClient]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      loading,
      error,
      setError,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, loading, error, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
