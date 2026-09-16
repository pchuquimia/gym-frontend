import { useQuery } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { api } from "../services/api";
import {
  getDashboardActivitySnapshot,
  getDashboardAnalyticsSnapshot,
  getDashboardCoreSnapshot,
  getDashboardHistorySnapshot,
  getDashboardSnapshotKey,
  mergeDashboardBootstrapSections,
  readDashboardSnapshot,
  writeDashboardSnapshot,
} from "../utils/dashboardBootstrapCache";
import { useAuth } from "./AuthContext";

const DashboardBootstrapContext = createContext({
  enabled: false,
  data: null,
  isLoading: false,
  activityLoading: false,
  historyLoading: false,
  historyError: null,
  analyticsLoading: false,
  analyticsError: null,
  isFetching: false,
  error: null,
  refetch: async () => null,
});

const localTodayKey = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

const shouldRetry = (failureCount, error) =>
  error?.status !== 401 &&
  error?.code !== "ERR_CANCELED" &&
  failureCount < 1;

export function DashboardBootstrapProvider({
  children,
  enabled = false,
  ownerId = "",
}) {
  const { user } = useAuth();
  const today = localTodayKey();
  const snapshotKey = useMemo(
    () =>
      getDashboardSnapshotKey({
        userId: user?.id || user?._id,
        ownerId,
        today,
      }),
    [ownerId, today, user?.id, user?._id],
  );
  const initialSnapshot = useMemo(
    () => (enabled ? readDashboardSnapshot(snapshotKey) : null),
    [enabled, snapshotKey],
  );
  const initialCore = useMemo(
    () => getDashboardCoreSnapshot(initialSnapshot),
    [initialSnapshot],
  );
  const initialActivity = useMemo(
    () => getDashboardActivitySnapshot(initialSnapshot),
    [initialSnapshot],
  );
  const initialHistory = useMemo(
    () => getDashboardHistorySnapshot(initialSnapshot),
    [initialSnapshot],
  );
  const initialAnalytics = useMemo(
    () => getDashboardAnalyticsSnapshot(initialSnapshot),
    [initialSnapshot],
  );

  const coreQuery = useQuery({
    queryKey: ["dashboard-bootstrap", "core", ownerId || "self", today],
    queryFn: ({ signal }) =>
      api.getDashboardBootstrapSection(
        "core",
        { athleteId: ownerId, today },
        { signal },
      ),
    enabled,
    initialData: initialCore || undefined,
    initialDataUpdatedAt: initialCore ? 0 : undefined,
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: shouldRetry,
    retryDelay: 750,
  });
  const activityQuery = useQuery({
    queryKey: ["dashboard-bootstrap", "activity", ownerId || "self", today],
    queryFn: ({ signal }) =>
      api.getDashboardBootstrapSection(
        "activity",
        { athleteId: ownerId, today },
        { signal },
      ),
    enabled,
    initialData: initialActivity || undefined,
    initialDataUpdatedAt: initialActivity ? 0 : undefined,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: shouldRetry,
    retryDelay: 750,
  });
  const historyQuery = useQuery({
    queryKey: ["dashboard-bootstrap", "history", ownerId || "self", today],
    queryFn: ({ signal }) =>
      api.getDashboardBootstrapSection(
        "history",
        { athleteId: ownerId, today },
        { signal },
      ),
    enabled,
    initialData: initialHistory || undefined,
    initialDataUpdatedAt: initialHistory ? 0 : undefined,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: shouldRetry,
    retryDelay: 750,
  });
  const analyticsQuery = useQuery({
    queryKey: ["dashboard-bootstrap", "analytics", ownerId || "self", today],
    queryFn: ({ signal }) =>
      api.getDashboardBootstrapSection(
        "analytics",
        { athleteId: ownerId, today },
        { signal },
      ),
    enabled,
    initialData: initialAnalytics || undefined,
    initialDataUpdatedAt: initialAnalytics ? 0 : undefined,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: shouldRetry,
    retryDelay: 750,
  });
  const {
    data: coreData,
    error: coreError,
    isFetching: coreFetching,
    isLoading: coreLoading,
    refetch: refetchCore,
  } = coreQuery;
  const {
    data: activityData,
    error: activityError,
    isFetching: activityFetching,
    isLoading: activityLoading,
    refetch: refetchActivity,
  } = activityQuery;
  const {
    data: historyData,
    error: historyError,
    isFetching: historyFetching,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = historyQuery;
  const {
    data: analyticsData,
    error: analyticsError,
    isFetching: analyticsFetching,
    isLoading: analyticsLoading,
    refetch: refetchAnalytics,
  } = analyticsQuery;
  const data = useMemo(
    () =>
      mergeDashboardBootstrapSections({
        snapshot: initialSnapshot,
        core: coreData,
        activity: activityData,
        history: historyData,
        analytics: analyticsData,
      }),
    [activityData, analyticsData, coreData, historyData, initialSnapshot],
  );

  useEffect(() => {
    if (!enabled || !data) return;
    writeDashboardSnapshot(snapshotKey, data);
  }, [data, enabled, snapshotKey]);

  const refetch = useCallback(
    () =>
      Promise.all([
        refetchCore(),
        refetchActivity(),
        refetchHistory(),
        refetchAnalytics(),
      ]),
    [refetchActivity, refetchAnalytics, refetchCore, refetchHistory],
  );
  const value = useMemo(
    () => ({
      enabled,
      data,
      isLoading: enabled && coreLoading,
      activityLoading: enabled && activityLoading,
      historyLoading: enabled && historyLoading,
      historyError: historyError || null,
      analyticsLoading: enabled && analyticsLoading,
      analyticsError: analyticsError || null,
      isFetching:
        enabled &&
        (coreFetching ||
          activityFetching ||
          historyFetching ||
          analyticsFetching),
      error: coreError || activityError || null,
      refetch,
    }),
    [
      activityError,
      activityFetching,
      activityLoading,
      analyticsError,
      analyticsFetching,
      analyticsLoading,
      coreError,
      coreFetching,
      coreLoading,
      data,
      enabled,
      historyError,
      historyFetching,
      historyLoading,
      refetch,
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
