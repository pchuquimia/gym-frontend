import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export default function MobileQueryLifecycle() {
  const client = useQueryClient();

  useEffect(() => {
    const refreshActiveQueries = () => {
      client.refetchQueries({ type: "active", stale: true });
    };
    const handlePageShow = (event) => {
      if (event.persisted) refreshActiveQueries();
    };

    window.addEventListener("online", refreshActiveQueries);
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      window.removeEventListener("online", refreshActiveQueries);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [client]);

  return null;
}
