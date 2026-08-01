import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

const RoutineContext = createContext(null);
const DEFAULT_BRANCH = "sopocachi";
const normalizeBranch = (value) =>
  value === "miraflores" || value === "sopocachi" ? value : DEFAULT_BRANCH;
const compactObject = (value) =>
  Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  );

export function RoutineProvider({ children }) {
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await api.getRoutines();
        setRoutines(data.map((r) => ({ ...r, id: r._id || r.id })));
        setError(null);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const addRoutine = async (routine) => {
    const payload = compactObject({
      ...routine,
      branch: normalizeBranch(routine.branch),
      _id: routine.id,
    });
    const saved = await api.createRoutine(payload);
    const merged = {
      ...saved,
      ...payload,
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
    const copy = {
      ...baseCopy,
      id: `${id}-copy-${Date.now()}`,
      name: `${found.name} (Copia)`,
      branch: normalizeBranch(found.branch),
      progressMode: "fresh",
      sourceRoutineId,
    };
    return addRoutine(copy);
  };

  const value = useMemo(
    () => ({
      routines,
      loading,
      error,
      addRoutine,
      updateRoutine,
      deleteRoutine,
      duplicateRoutine,
    }),
    [routines, loading, error],
  );

  return (
    <RoutineContext.Provider value={value}>{children}</RoutineContext.Provider>
  );
}

export function useRoutines() {
  const ctx = useContext(RoutineContext);
  if (!ctx) throw new Error("useRoutines must be used within RoutineProvider");
  return ctx;
}
