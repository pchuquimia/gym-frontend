import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

export default function MobileQueryLifecycle() {
  const client = useQueryClient();
  const lastRefreshRef = useRef(0);

  useEffect(() => {
    const refreshActiveQueries = ({ force = false } = {}) => {
      if (!navigator.onLine) return;
      const now = Date.now();
      if (!force && now - lastRefreshRef.current < 5_000) return;
      lastRefreshRef.current = now;
      client.resumePausedMutations();
      client.refetchQueries({
        type: "active",
        ...(force ? {} : { stale: true }),
      });
    };
    const handlePageShow = (event) => {
      if (event.persisted) refreshActiveQueries();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refreshActiveQueries();
    };
    const handleRetry = () => refreshActiveQueries({ force: true });

    window.addEventListener("online", refreshActiveQueries);
    window.addEventListener("focus", refreshActiveQueries);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("app-page-retry", handleRetry);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("online", refreshActiveQueries);
      window.removeEventListener("focus", refreshActiveQueries);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("app-page-retry", handleRetry);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [client]);

  return null;
}
