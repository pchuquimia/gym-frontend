import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { api } from "../services/api";

const RoutineContext = createContext(null);
const DEFAULT_BRANCH = "sopocachi";
const normalizeBranch = (value) =>
  value === "miraflores" || value === "sopocachi" ? value : DEFAULT_BRANCH;
const compactObject = (value) =>
  Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  );

export function RoutineProvider({ children, ownerId = "" }) {
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadRoutines = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!silent) setLoading(true);
        const data = await api.getRoutines({ athleteId: ownerId });
        setRoutines(data.map((r) => ({ ...r, id: r._id || r.id })));
        setError(null);
      } catch (e) {
        setError(e.message);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [ownerId],
  );

  useEffect(() => {
    loadRoutines();
  }, [loadRoutines]);

  useEffect(() => {
    const refresh = () => loadRoutines({ silent: true });
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", handleVisibility);
    const intervalId = window.setInterval(refresh, 60_000);
    return () => {
      window.removeEventListener("focus", refresh);
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

  const duplicateRoutine = async (id) => {
    const found = routines.find((r) => r._id === id || r.id === id);
    if (!found) return;
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
      progressMode: "fresh",
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
