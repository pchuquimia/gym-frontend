import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useMemo } from "react";
import { api } from "../services/api";

const DashboardBootstrapContext = createContext({
  enabled: false,
  data: null,
  isLoading: false,
  isFetching: false,
  error: null,
  refetch: async () => null,
});

const localTodayKey = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

export function DashboardBootstrapProvider({
  children,
  enabled = false,
  ownerId = "",
}) {
  const today = localTodayKey();
  const query = useQuery({
    queryKey: ["dashboard-bootstrap", ownerId || "self", today],
    queryFn: () => api.getDashboardBootstrap({ athleteId: ownerId, today }),
    enabled,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => error?.status !== 401 && failureCount < 2,
  });
  const value = useMemo(
    () => ({
      enabled,
      data: query.data || null,
      isLoading: enabled && query.isLoading,
      isFetching: enabled && query.isFetching,
      error: query.error || null,
      refetch: query.refetch,
    }),
    [
      enabled,
      query.data,
      query.error,
      query.isFetching,
      query.isLoading,
      query.refetch,
    ],
  );
  return (
    <DashboardBootstrapContext.Provider value={value}>
      {children}
    </DashboardBootstrapContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useDashboardBootstrap = () =>
  useContext(DashboardBootstrapContext);
