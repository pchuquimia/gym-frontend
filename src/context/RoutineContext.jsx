import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { api } from "../services/api";

const RoutineContext = createContext(null);
const DEFAULT_BRANCH = "sopocachi";
const normalizeBranch = (value) =>
  value === "miraflores" || value === "sopocachi" ? value : DEFAULT_BRANCH;
const compactObject = (value) =>
  Object.entries(value).reduce((result, [key, item]) => {
    if (item !== undefined) result[key] = item;
    return result;
  }, {});

export function RoutineProvider({ children, ownerId = "" }) {
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const requestInFlightRef = useRef(null);
  const requestVersionRef = useRef(0);

  const loadRoutines = useCallback(
    ({ silent = false } = {}) => {
      const requestOwnerId = String(ownerId || "");
      if (requestInFlightRef.current?.ownerId === requestOwnerId) {
        return requestInFlightRef.current.promise;
      }
      const requestVersion = ++requestVersionRef.current;
      if (!silent) setLoading(true);

      const operation = api
        .getRoutines({ athleteId: ownerId })
        .then((data) => {
          const normalized = (Array.isArray(data) ? data : []).map((routine) => ({
            ...routine,
            id: routine._id || routine.id,
          }));
          if (requestVersion === requestVersionRef.current) {
            setRoutines(normalized);
            setError(null);
          }
          return normalized;
        })
        .catch((requestError) => {
          if (requestVersion === requestVersionRef.current) {
            setError(requestError.message);
          }
          return null;
        })
        .finally(() => {
          if (requestInFlightRef.current?.promise === operation) {
            requestInFlightRef.current = null;
          }
          if (!silent && requestVersion === requestVersionRef.current) {
            setLoading(false);
          }
        });

      requestInFlightRef.current = { ownerId: requestOwnerId, promise: operation };
      return operation;
    },
    [ownerId],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => loadRoutines(),
      0,
    );
    return () => window.clearTimeout(timeoutId);
  }, [loadRoutines]);

  useEffect(() => {
    const refresh = () => loadRoutines({ silent: true });
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const handlePageShow = () => refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("exercise-catalog-migrated", refresh);
    document.addEventListener("visibilitychange", handleVisibility);
    const intervalId = window.setInterval(refresh, 2 * 60_000);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("exercise-catalog-migrated", refresh);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.clearInterval(intervalId);
    };
  }, [loadRoutines]);

  const addRoutine = async (routine) => {
    const payload = compactObject({
      ...routine,
      ownerId: ownerId || undefined,
      branch: normalizeBranch(routine.branch),
      _id: routine.id,
    });
    const saved = await api.createRoutine(payload);
    const merged = {
      ...saved,
      ...payload,
      ownerId: ownerId || undefined,
      id: routine.id,
      branch: saved.branch || payload.branch,
      exercises: payload.exercises || saved.exercises,
    };
    setRoutines((prev) => [merged, ...prev]);
    return merged;
  };

  const updateRoutine = async (id, payload) => {
    const body = compactObject({
      ...payload,
      branch: normalizeBranch(payload.branch),
    });
    const saved = await api.updateRoutine(id, body);
    const merged = {
      ...saved,
      ...body,
      id,
      branch: saved.branch || body.branch,
      exercises: body.exercises || saved.exercises,
    };
    setRoutines((prev) => prev.map((r) => (r.id === id ? merged : r)));
  };

  const deleteRoutine = async (id) => {
    await api.deleteRoutine(id);
    setRoutines((prev) => prev.filter((r) => r.id !== id));
  };

  const duplicateRoutine = async (id, options = {}) => {
    const found = routines.find((r) => r._id === id || r.id === id);
    if (!found) return;
    const progressMode =
      options.progressMode === "inherit" ? "inherit" : "fresh";
    const baseCopy = { ...found };
    const sourceRoutineId = found.id || found._id || id;
    delete baseCopy._id;
    delete baseCopy.progressScopeId;
    delete baseCopy.trainingPlanId;
    delete baseCopy.trainingPlanSlotId;
    delete baseCopy.assignedByCoachId;
    delete baseCopy.assignedAt;
    delete baseCopy.isArchived;
    delete baseCopy.isAvailableForTraining;
    delete baseCopy.visibility;
    delete baseCopy.kind;
    delete baseCopy.version;
    const copy = {
      ...baseCopy,
      id: `${id}-copy-${Date.now()}`,
      name: `${found.name} (Copia)`,
      branch: normalizeBranch(found.branch),
      progressMode,
      sourceRoutineId,
      assignmentType: "personal",
      isArchived: false,
      isAvailableForTraining: true,
    };
    return addRoutine(copy);
  };

  const value = {
    routines,
    loading,
    error,
    reloadRoutines: loadRoutines,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    duplicateRoutine,
  };

  return (
    <RoutineContext.Provider value={value}>{children}</RoutineContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRoutines() {
  const ctx = useContext(RoutineContext);
  if (!ctx) throw new Error("useRoutines must be used within RoutineProvider");
  return ctx;
}
