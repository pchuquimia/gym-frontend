import { useMemo, useState } from "react";
import Modal from "../components/shared/Modal";
import { getExerciseImageUrl } from "../utils/cloudinary";
import { useRoutines } from "../context/RoutineContext";
import { useTrainingData } from "../context/TrainingContext";
import Card from "../components/ui/card";
import Button from "../components/ui/button";
import Badge from "../components/ui/badge";

// ================= Helpers =================
const slugify = (text) =>
  text
    ?.toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const toValidDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const normalized =
    typeof value === "string" && value.length <= 10
      ? `${value}T00:00:00`
      : value;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatShortDate = (value) => {
  const d = toValidDate(value);
  if (!d) return "--";
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  });
};

const getDateTimestamp = (value) => {
  const d = toValidDate(value);
  return d ? d.getTime() : 0;
};

const getISODateKey = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  const d = toValidDate(value);
  if (!d) return null;
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 10);
};

const titleCase = (text) =>
  text ? text.charAt(0).toUpperCase() + text.slice(1) : "";

const clampText = (text = "", max = 14) => {
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 3))}...`;
};

// ============ UI helpers (solo presentación) ============
const FilterPill = ({ label, count, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
      active
        ? "border-blue-400/50 bg-blue-500/10 text-[color:var(--text)]"
        : "border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--text-muted)] hover:border-blue-400/40"
    }`}
  >
    <span
      className={`h-2 w-2 rounded-full ${
        active ? "bg-blue-500" : "bg-slate-300"
      }`}
    />
    <span>{label}</span>
    {typeof count === "number" && (
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          active
            ? "bg-blue-500/15 text-blue-700 dark:text-blue-200"
            : "bg-[color:var(--bg)] text-[color:var(--text-muted)]"
        }`}
      >
        {count}
      </span>
    )}
  </button>
);

const StatTile = ({ label, value, hint }) => (
  <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)]/70 p-3 sm:p-4 shadow-sm">
    <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.26em] text-[color:var(--text-muted)] font-semibold">
      {label}
    </p>
    <div className="mt-2 text-xl sm:text-2xl font-semibold text-[color:var(--text)]">
      {value}
    </div>
    <p className="text-xs text-[color:var(--text-muted)] mt-1">{hint}</p>
  </div>
);

const DotsButton = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="
      h-9 w-9 rounded-xl
      border border-[color:var(--border)] bg-[color:var(--card)]
      grid place-items-center
      text-[color:var(--text-muted)]
      hover:bg-[color:var(--bg)] transition
      focus:outline-none focus:ring-2 focus:ring-blue-500/25
    "
    aria-label="Opciones"
  >
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 6.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3ZM12 13.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3ZM12 20.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z"
        fill="currentColor"
      />
    </svg>
  </button>
);

const BranchTag = ({ label }) => (
  <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
    {label}
  </Badge>
);

// ================= Routine Modal =================
function RoutineModal({
  mode = "create",
  initialData,
  onSave,
  onClose,
  availableExercises,
}) {
  const resolveExercise = (entry = {}) => {
    const meta = availableExercises.find(
      (a) =>
        a.id === entry.exerciseId ||
        a.id === entry.id ||
        a.name === entry.name
    );
    return {
      exerciseId:
        entry.exerciseId || entry.id || meta?.id || slugify(entry.name || ""),
      name: entry.name || meta?.name || "Ejercicio",
      muscle: entry.muscle || meta?.muscle,
      image: entry.image || meta?.image || "",
      imagePublicId: entry.imagePublicId || meta?.imagePublicId || "",
    };
  };
  const [name, setName] = useState(initialData?.name || "");
  const [branch, setBranch] = useState(initialData?.branch || "general");
  const [branchError, setBranchError] = useState("");
  const [exercises, setExercises] = useState(
    (initialData?.exercises || []).map((ex) => {
      return {
        ...ex,
        ...resolveExercise(ex),
        alternatives: (ex.alternatives || []).map((alt) => resolveExercise(alt)),
        isExtra: Boolean(ex.isExtra),
      };
    })
  );
  const [selectedMuscle, setSelectedMuscle] = useState(
    availableExercises?.[0]?.muscle || "Pecho"
  );
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [dragIndex, setDragIndex] = useState(null);

  const groupedSelected = useMemo(() => {
    const map = new Map();
    exercises.forEach((ex, idx) => {
      const key = ex.muscle || "Sin grupo";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({ ...ex, idx });
    });
    return Array.from(map.entries());
  }, [exercises]);

  const muscleOptions = useMemo(() => {
    const set = new Set();
    availableExercises.forEach((ex) => {
      if (ex.muscle) set.add(ex.muscle);
    });
    const list = Array.from(set);
    return list.length ? list : ["Pecho"];
  }, [availableExercises]);

  const branchMatches = (ex) => {
    if (!branch || branch === "general") return true;
    const b = ex.branches || [];
    return b.includes(branch) || b.includes("general");
  };

  const filteredExercises = useMemo(
    () =>
      availableExercises.filter(
        (ex) =>
          branchMatches(ex) &&
          (!selectedMuscle || ex.muscle === selectedMuscle) &&
          ex.name.toLowerCase().includes(search.trim().toLowerCase())
      ),
    [availableExercises, selectedMuscle, branch, search]
  );

  const addExercise = (exercise) => {
    if (!exercise || !branchMatches(exercise)) {
      setError("Solo puedes agregar ejercicios disponibles en esta sede.");
      return;
    }
    setError("");
    setExercises((prev) => [
      ...prev,
      {
        name: exercise.name,
        exerciseId: exercise.id,
        sets: 3,
        muscle: exercise.muscle,
        image: exercise.image || "",
        imagePublicId: exercise.imagePublicId || "",
        isExtra: false,
        alternatives: [],
      },
    ]);
  };

  const updateSets = (idx, sets) => {
    setExercises((prev) =>
      prev.map((ex, i) => (i === idx ? { ...ex, sets: Number(sets) || 0 } : ex))
    );
  };

  const toggleExtra = (idx) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === idx ? { ...ex, isExtra: !ex.isExtra } : ex
      )
    );
  };

  const removeExercise = (idx) => {
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  };

  const addAlternative = (idx, optionId) => {
    if (!optionId) return;
    const option = availableExercises.find((ex) => ex.id === optionId);
    if (!option) return;
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== idx) return ex;
        const baseId = ex.exerciseId;
        const existing = new Set(
          (ex.alternatives || []).map((alt) => alt.exerciseId)
        );
        if (option.id === baseId || existing.has(option.id)) return ex;
        return {
          ...ex,
          alternatives: [
            ...(ex.alternatives || []),
            resolveExercise(option),
          ],
        };
      })
    );
  };

  const removeAlternative = (idx, altId) => {
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== idx) return ex;
        return {
          ...ex,
          alternatives: (ex.alternatives || []).filter(
            (alt) => alt.exerciseId !== altId
          ),
        };
      })
    );
  };

  const reorderExercises = (from, to) => {
    setExercises((prev) => {
      if (
        from === to ||
        from < 0 ||
        to < 0 ||
        from >= prev.length ||
        to >= prev.length
      )
        return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    if (!branch) {
      setBranchError("Selecciona la sede para esta rutina.");
      return;
    }
    setBranchError("");
    const payload = {
      ...initialData,
      id: initialData?.id || slugify(name),
      name: name.trim(),
      description: `${exercises.length} ejercicios.`,
      branch,
      exercises: exercises.map((ex) => ({
        ...ex,
        exerciseId: ex.exerciseId || slugify(ex.name),
        isExtra: Boolean(ex.isExtra),
        alternatives: (ex.alternatives || []).map((alt) => ({
          exerciseId: alt.exerciseId || slugify(alt.name),
          name: alt.name,
          muscle: alt.muscle,
          image: alt.image || "",
          imagePublicId: alt.imagePublicId || "",
        })),
      })),
    };
    onSave(payload);
  };

  return (
    <Modal
      title={mode === "create" ? "Crear Nueva Rutina" : "Editar Rutina"}
      subtitle="Elige sede, grupo muscular y agrega ejercicios de tu biblioteca."
      onClose={onClose}
      footer={
        <>
          <button
            className="px-3 py-2 rounded-md border border-[color:var(--border)] text-sm"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button className="primary-btn" onClick={handleSubmit}>
            {mode === "create" ? "Guardar Rutina" : "Guardar Cambios"}
          </button>
        </>
      }
    >
      {/* ======= TU CONTENIDO ORIGINAL COMPLETO (sin omitir) ======= */}
      <div className="flex flex-col gap-4 h-full max-h-[75vh] overflow-y-auto bg-[color:var(--bg)] text-[color:var(--text)]">
        <div className="flex flex-col gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm">
          <p className="text-sm font-semibold">Nombre de la Rutina</p>
          <input
            className="rounded-md border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 text-sm text-[color:var(--text)]"
            placeholder="Ej. Dia de Pierna"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm">
          <p className="text-sm font-semibold">Sede / Gym</p>
          <div className="flex gap-2 flex-wrap">
            {["general", "sopocachi", "miraflores"].map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBranch(b)}
                className={`px-3 py-2 rounded-full border text-sm transition focus-visible:outline-none focus-visible:ring-0 ${
                  branch === b
                    ? "border-accent bg-accent/15 text-[color:var(--text)] font-semibold"
                    : "border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--text-muted)] hover:border-accent/40"
                }`}
              >
                {b === "general"
                  ? "General"
                  : b.charAt(0).toUpperCase() + b.slice(1)}
              </button>
            ))}
          </div>
          <p className="text-xs text-[color:var(--text-muted)]">
            Define en que sede aplica esta rutina. General = visible para todas.
          </p>
          {branchError && (
            <p className="text-xs text-accent-red">{branchError}</p>
          )}
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm">
          <p className="text-sm font-semibold">Elige grupo muscular</p>
          <div className="flex gap-2 flex-wrap">
            {muscleOptions.map((muscle) => (
              <button
                key={muscle}
                type="button"
                onClick={() => setSelectedMuscle(muscle)}
                className={`px-3 py-2 rounded-full border text-sm transition focus-visible:outline-none focus-visible:ring-0 ${
                  selectedMuscle === muscle
                    ? "border-accent bg-accent/15 text-[color:var(--text)] font-semibold"
                    : "border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--text-muted)] hover:border-accent/40"
                }`}
              >
                {muscle}
              </button>
            ))}
          </div>
          <p className="text-xs text-[color:var(--text-muted)]">
            Primero selecciona el grupo; abajo veras los ejercicios de tu
            biblioteca para ese musculo y sede.
          </p>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm">
          <p className="text-sm font-semibold">Ejercicios sugeridos</p>
          <input
            className="rounded-md border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-sm text-[color:var(--text)]"
            placeholder="Buscar ejercicio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredExercises.map((ex) => (
              <div
                key={ex.id}
                className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3 flex flex-col gap-2 shadow-sm"
              >
                <div className="aspect-video w-full rounded-xl overflow-hidden border border-[color:var(--border)] bg-slate-100 grid place-items-center">
                  {getExerciseImageUrl(ex, { width: 400, height: 225 }) ? (
                    <img
                      src={getExerciseImageUrl(ex, { width: 400, height: 225 })}
                      alt={ex.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="text-[color:var(--text-muted)] text-sm">
                      Sin imagen
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm leading-tight">
                      {ex.name}
                    </p>
                    <p className="text-xs text-[color:var(--text-muted)]">
                      {ex.muscle}
                    </p>
                  </div>
                  <button
                    className="px-3 py-1 rounded-md border border-[color:var(--border)] text-xs bg-[color:var(--card)] text-[color:var(--text)]"
                    type="button"
                    onClick={() => addExercise(ex)}
                  >
                    Agregar
                  </button>
                </div>
              </div>
            ))}
            {filteredExercises.length === 0 && (
              <div className="border border-dashed border-[color:var(--border)] rounded-xl p-3 text-sm text-[color:var(--text-muted)]">
                No hay ejercicios para este grupo muscular en esta sede.
              </div>
            )}
          </div>
          {error && <p className="text-xs text-accent-red">{error}</p>}
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold">Ejercicios de la rutina</p>
          {groupedSelected.map(([muscle, list]) => (
            <div
              key={muscle}
              className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-3 space-y-2 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[color:var(--text)]">
                  {muscle}
                </span>
                <span className="text-xs text-[color:var(--text-muted)]">
                  {list.length} ejercicios
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {list.map((ex) => (
                  <div
                    key={`${ex.name}-${ex.idx}`}
                    className={`flex items-center gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3 ${
                      dragIndex === ex.idx ? "ring-2 ring-accent/40" : ""
                    }`}
                    draggable
                    onDragStart={() => setDragIndex(ex.idx)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragIndex === null || dragIndex === ex.idx) return;
                      reorderExercises(dragIndex, ex.idx);
                      setDragIndex(ex.idx);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragIndex(null);
                    }}
                    onDragEnd={() => setDragIndex(null)}
                  >
                    <div className="w-14 h-14 rounded-lg overflow-hidden border border-[color:var(--border)] bg-[color:var(--card)] grid place-items-center">
                      {getExerciseImageUrl(ex, { width: 160, height: 160 }) ? (
                        <img
                          src={getExerciseImageUrl(ex, { width: 160, height: 160 })}
                          alt={ex.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-[color:var(--text-muted)] text-sm">
                          {(ex.name || "?").charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {ex.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs mt-1 flex-wrap">
                        <span>Series</span>
                        <input
                          type="number"
                          min="1"
                          className="w-14 rounded-md border border-[color:var(--border)] bg-[color:var(--card)] px-2 py-1 text-[color:var(--text)] text-center"
                          value={ex.sets}
                          onChange={(e) => updateSets(ex.idx, e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => toggleExtra(ex.idx)}
                          className={`px-2 py-1 rounded-full border text-[11px] font-semibold transition ${
                            ex.isExtra
                              ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                              : "border-[color:var(--border)] text-[color:var(--text-muted)] hover:bg-[color:var(--bg)]"
                          }`}
                        >
                          {ex.isExtra ? "Extra" : "Principal"}
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--text-muted)] font-semibold">
                          Alternativas
                        </span>
                        {(ex.alternatives || []).length ? (
                          (ex.alternatives || []).map((alt) => (
                            <span
                              key={alt.exerciseId}
                              className="inline-flex items-center gap-1 rounded-full border border-[color:var(--border)] bg-[color:var(--card)] px-2 py-0.5 text-[11px] text-[color:var(--text)]"
                            >
                              {alt.name}
                              <button
                                type="button"
                                className="text-[color:var(--text-muted)] hover:text-red-500"
                                onClick={() =>
                                  removeAlternative(ex.idx, alt.exerciseId)
                                }
                                aria-label="Quitar alternativa"
                              >
                                ×
                              </button>
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-[color:var(--text-muted)]">
                            Sin alternativas
                          </span>
                        )}
                      </div>
                      <div className="mt-2">
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            const value = e.target.value;
                            if (!value) return;
                            addAlternative(ex.idx, value);
                            e.target.value = "";
                          }}
                          className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--card)] px-2 py-1 text-[11px] text-[color:var(--text)]"
                        >
                          <option value="">Agregar alternativa...</option>
                          {availableExercises
                            .filter(
                              (option) =>
                                branchMatches(option) &&
                                (!ex.muscle || option.muscle === ex.muscle)
                            )
                            .filter(
                              (option) =>
                                option.id !== ex.exerciseId &&
                                !(ex.alternatives || []).some(
                                  (alt) => alt.exerciseId === option.id
                                )
                            )
                            .map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                    <button
                      className="px-3 py-1 rounded-md border border-red-200 text-sm text-red-600"
                      onClick={() => removeExercise(ex.idx)}
                      title="Eliminar"
                      type="button"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {exercises.length === 0 && (
            <div className="text-sm text-[color:var(--text-muted)]">
              Aun no agregas ejercicios.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ===================== Page: Routines =====================
function Routines() {
  const {
    routines,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    duplicateRoutine,
  } = useRoutines();
  const { exercises: libraryExercises, trainings } = useTrainingData();

  const [modalMode, setModalMode] = useState(null);
  const [selectedRoutine, setSelectedRoutine] = useState(null);
  const [activeBranch, setActiveBranch] = useState("all");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const availableExercises = useMemo(() => {
    const seen = new Set();
    return libraryExercises
      .filter((ex) => {
        if (seen.has(ex.id)) return false;
        seen.add(ex.id);
        return true;
      })
      .map((ex) => ({
        id: ex.id,
        name: ex.name,
        muscle: ex.muscle,
        image: ex.image || "",
        imagePublicId: ex.imagePublicId || "",
        branches: ex.branches,
      }));
  }, [libraryExercises]);

  const exerciseMetaMap = useMemo(() => {
    const map = new Map();
    availableExercises.forEach((ex) => {
      map.set(ex.id, ex);
      if (ex.name) map.set(slugify(ex.name), ex);
    });
    return map;
  }, [availableExercises]);

  const routineMuscleMap = useMemo(() => {
    const map = new Map();
    routines.forEach((routine) => {
      const set = new Set();
      (routine.exercises || []).forEach((ex) => {
        const meta =
          exerciseMetaMap.get(ex.exerciseId) ||
          exerciseMetaMap.get(slugify(ex.name));
        const muscle = ex.muscle || meta?.muscle;
        if (muscle) set.add(muscle);
      });
      map.set(routine.id, set);
    });
    return map;
  }, [routines, exerciseMetaMap]);

  const muscleCounts = useMemo(() => {
    const map = new Map();
    routineMuscleMap.forEach((muscles) => {
      muscles.forEach((muscle) => {
        map.set(muscle, (map.get(muscle) || 0) + 1);
      });
    });
    return map;
  }, [routineMuscleMap]);

  const topMuscles = useMemo(() => {
    return Array.from(muscleCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [muscleCounts]);

  const routineHistoryMap = useMemo(() => {
    const map = new Map();
    (trainings || []).forEach((tr) => {
      const routineId = tr?.routineId;
      if (!routineId) return;
      const ts = getDateTimestamp(tr.date || tr.createdAt);
      const current = map.get(routineId) || {
        count: 0,
        lastDate: null,
        lastTs: 0,
      };
      const next = { ...current, count: current.count + 1 };
      if (ts > next.lastTs) {
        next.lastTs = ts;
        next.lastDate = tr.date || tr.createdAt;
      }
      map.set(routineId, next);
    });
    return map;
  }, [trainings]);

  const routineNameMap = useMemo(() => {
    const map = new Map();
    routines.forEach((routine) => {
      if (routine?.id) map.set(routine.id, routine.name || "");
    });
    return map;
  }, [routines]);

  const totals = useMemo(() => {
    let totalExercises = 0;
    let totalExtras = 0;
    let totalSets = 0;
    routines.forEach((routine) => {
      (routine.exercises || []).forEach((ex) => {
        totalExercises += 1;
        totalSets += Number(ex.sets) || 0;
        if (ex.isExtra) totalExtras += 1;
      });
    });
    return {
      routines: routines.length,
      exercises: totalExercises,
      extras: totalExtras,
      sets: totalSets,
    };
  }, [routines]);

  const weekSummary = useMemo(() => {
    const byDate = new Map();
    (trainings || []).forEach((tr) => {
      const key = getISODateKey(tr.date || tr.createdAt);
      if (!key) return;
      const routineName =
        tr.routineName ||
        routineNameMap.get(tr.routineId) ||
        tr.routineId ||
        "";
      const ts = getDateTimestamp(tr.date || tr.createdAt);
      const current = byDate.get(key) || {
        count: 0,
        lastTs: 0,
        routine: "",
      };
      current.count = 1;
      if (routineName && ts >= current.lastTs) {
        current.lastTs = ts;
        current.routine = routineName;
      }
      byDate.set(key, current);
    });
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = getISODateKey(d);
      const label = titleCase(
        d
          .toLocaleDateString("es-ES", { weekday: "short" })
          .replace(".", "")
      );
      const shortLabel = label ? label.slice(0, 1) : "";
      const info = byDate.get(key) || {
        count: 0,
        routine: "",
      };
      const primaryRoutine = info.routine || "";
      days.push({
        key,
        label,
        shortLabel,
        count: info.count || 0,
        routine: primaryRoutine,
        routineShort: clampText(primaryRoutine, 12),
        isToday: i === 0,
      });
    }
    const total = days.reduce((sum, day) => sum + day.count, 0);
    return { days, total };
  }, [trainings, routineNameMap]);

  const branchCounts = useMemo(() => {
    const counts = {
      all: routines.length,
      general: 0,
      miraflores: 0,
      sopocachi: 0,
    };
    routines.forEach((r) => {
      const b = r.branch || "general";
      counts[b] = (counts[b] || 0) + 1;
    });
    return counts;
  }, [routines]);

  const visibleRoutines = useMemo(() => {
    let list = routines;
    if (activeBranch !== "all") {
      list = list.filter((r) => (r.branch || "general") === activeBranch);
    }
    if (searchTerm.trim()) {
      const search = searchTerm.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.name?.toLowerCase().includes(search) ||
          r.description?.toLowerCase().includes(search)
      );
    }
    return list;
  }, [routines, activeBranch, searchTerm]);

  const routineCards = useMemo(() => {
    return visibleRoutines.map((routine) => {
      const exs = routine.exercises || [];
      const muscles = new Set();
      const preview = [];
      let totalSets = 0;
      let extraCount = 0;

      exs.forEach((ex) => {
        totalSets += Number(ex.sets) || 0;
        if (ex.isExtra) extraCount += 1;
        const meta =
          exerciseMetaMap.get(ex.exerciseId) ||
          exerciseMetaMap.get(slugify(ex.name));
        const muscle = ex.muscle || meta?.muscle;
        if (muscle) muscles.add(muscle);
        if (preview.length < 4) {
          const source = meta || ex;
          const url = getExerciseImageUrl(source, { width: 120, height: 120 });
          preview.push({
            url,
            name: ex.name || meta?.name || "Ejercicio",
          });
        }
      });

      const history = routineHistoryMap.get(routine.id) || {
        count: 0,
        lastDate: null,
      };

      return {
        ...routine,
        muscles: Array.from(muscles),
        preview,
        totalSets,
        extraCount,
        sessionsCount: history.count,
        lastDate: history.lastDate,
        exerciseCount: exs.length,
      };
    });
  }, [visibleRoutines, routineHistoryMap, exerciseMetaMap]);

  const openCreate = () => {
    setSelectedRoutine(null);
    setModalMode("create");
  };

  const openEdit = (routine) => {
    setSelectedRoutine(routine);
    setModalMode("edit");
  };

  const closeModal = () => {
    setSelectedRoutine(null);
    setModalMode(null);
  };

  const handleSave = (routine) => {
    if (modalMode === "create") addRoutine(routine);
    if (modalMode === "edit") updateRoutine(routine.id, routine);
    closeModal();
  };

  const branchLabel = (b) => {
    if (!b || b === "general") return "General";
    return b.charAt(0).toUpperCase() + b.slice(1);
  };

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 sm:p-6 shadow-sm">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
        </div>

        <div className="relative z-10 space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold tracking-[0.35em] uppercase text-[color:var(--text-muted)]">
                Planificación
              </p>
              <h1 className="text-2xl sm:text-4xl font-display font-semibold text-[color:var(--text)]">
                Rutinas y planificación
              </h1>
              <p className="text-sm text-[color:var(--text-muted)] max-w-md">
                Organiza tus sesiones, destaca los ejercicios clave y crea
                planes flexibles para cada semana.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button className="w-full sm:w-auto" onClick={openCreate}>
                  Crear nueva rutina
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <StatTile
                label="Rutinas"
                value={totals.routines}
                hint="Activas"
              />
              <StatTile
                label="Ejercicios"
                value={totals.exercises}
                hint={`${totals.extras} extras`}
              />
              <StatTile
                label="Sesiones"
                value={weekSummary.total}
                hint="Últimos 7 días"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="p-4 bg-[color:var(--bg)]/60 border-[color:var(--border)]">
              <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--text-muted)] font-semibold">
                Semana activa
              </p>
              <div className="mt-3 grid grid-cols-4 sm:grid-cols-7 gap-2">
                {weekSummary.days.map((day) => (
                  <div
                    key={day.key}
                    className={`rounded-xl border px-1.5 py-2 sm:px-2 text-center ${
                      day.count > 0
                        ? "border-emerald-300/60 bg-emerald-500/10"
                        : "border-[color:var(--border)] bg-[color:var(--card)]"
                    }`}
                  >
                    <div className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--text-muted)]">
                      <span className="sm:hidden">{day.shortLabel}</span>
                      <span className="hidden sm:inline">{day.label}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-center text-xs font-semibold text-[color:var(--text)]">
                      <span className="max-w-[80px] truncate text-center">
                        {day.routineShort || "Libre"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4 bg-[color:var(--bg)]/60 border-[color:var(--border)]">
              <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--text-muted)] font-semibold">
                Enfoque principal
              </p>
              <p className="mt-2 text-base font-semibold text-[color:var(--text)]">
                {topMuscles.length
                  ? topMuscles[0][0]
                  : "Define un foco esta semana"}
              </p>
              <p className="text-xs text-[color:var(--text-muted)] mt-1">
                Distribuye tu energía según los grupos que más trabajas.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {topMuscles.length ? (
                  topMuscles.map(([muscle, count]) => (
                    <Badge
                      key={muscle}
                      variant="secondary"
                      className="text-[10px]"
                    >
                      {muscle} · {count}
                    </Badge>
                  ))
                ) : (
                  <Badge className="text-[10px]">Sin datos</Badge>
                )}
              </div>
            </Card>
          </div>
        </div>
      </section>

      <Card className="mt-6 p-3 sm:p-4 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[color:var(--text)]">
              Rutinas
            </p>
            <p className="text-xs text-[color:var(--text-muted)]">
              {visibleRoutines.length} de {routines.length} visibles
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar rutina..."
              className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] px-10 py-2 text-sm text-[color:var(--text)] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]">
              ??
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { id: "all", label: "Todas", count: branchCounts.all },
            { id: "general", label: "General", count: branchCounts.general },
            {
              id: "miraflores",
              label: "Miraflores",
              count: branchCounts.miraflores,
            },
            {
              id: "sopocachi",
              label: "Sopocachi",
              count: branchCounts.sopocachi,
            },
          ]
            .filter((item) => item.count > 0 || item.id === "all")
            .map((item) => (
              <FilterPill
                key={item.id}
                label={item.label}
                count={item.count}
                active={activeBranch === item.id}
                onClick={() => setActiveBranch(item.id)}
              />
            ))}
        </div>

      </Card>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {routineCards.map((routine) => (
          <Card
            key={routine.id}
            className="relative overflow-hidden p-4 flex flex-col gap-4"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500/50 via-emerald-400/50 to-transparent" />

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-lg font-semibold text-[color:var(--text)] truncate">
                  {routine.name}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <BranchTag label={branchLabel(routine.branch)} />
                  <span className="text-xs text-[color:var(--text-muted)]">
                    Última vez:{" "}
                    {routine.lastDate
                      ? formatShortDate(routine.lastDate)
                      : "Sin registros"}
                  </span>
                </div>
              </div>
              <div className="relative">
                <DotsButton
                  onClick={() =>
                    setOpenMenuId((prev) =>
                      prev === routine.id ? null : routine.id
                    )
                  }
                />
                {openMenuId === routine.id && (
                  <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-xl overflow-hidden">
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                      onClick={() => {
                        setOpenMenuId(null);
                        deleteRoutine(routine.id);
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex -space-x-3">
                {routine.preview.map((item, idx) => (
                  <div
                    key={`${routine.id}-preview-${idx}`}
                    className="h-10 w-10 rounded-full overflow-hidden border border-[color:var(--border)] bg-[color:var(--bg)]"
                  >
                    {item.url ? (
                      <img
                        src={item.url}
                        alt={item.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-full w-full grid place-items-center text-xs text-[color:var(--text-muted)]">
                        {item.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                ))}
                {routine.exerciseCount > routine.preview.length && (
                  <div className="h-10 w-10 rounded-full border border-[color:var(--border)] bg-[color:var(--bg)] grid place-items-center text-xs font-semibold text-[color:var(--text-muted)]">
                    +{routine.exerciseCount - routine.preview.length}
                  </div>
                )}
              </div>
              <div className="text-xs text-[color:var(--text-muted)]">
                {routine.exerciseCount} ejercicios · {routine.totalSets} series
                {routine.extraCount > 0
                  ? ` · ${routine.extraCount} extras`
                  : ""}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {routine.muscles.slice(0, 3).map((muscle) => (
                <Badge key={muscle} className="text-[10px]">
                  {muscle}
                </Badge>
              ))}
              {routine.muscles.length > 3 && (
                <Badge variant="secondary" className="text-[10px]">
                  +{routine.muscles.length - 3}
                </Badge>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEdit(routine)}
                >
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => duplicateRoutine(routine.id)}
                >
                  Duplicar
                </Button>
              </div>
              <span className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-muted)]">
                {routine.sessionsCount} sesiones
              </span>
            </div>
          </Card>
        ))}

        {!routineCards.length && (
          <Card className="p-6 text-center text-sm text-[color:var(--text-muted)]">
            <p>
              {routines.length
                ? "No hay rutinas con estos filtros."
                : "Aún no tienes rutinas creadas."}
            </p>
            {!routines.length && (
              <div className="mt-4">
                <Button onClick={openCreate}>Crear primera rutina</Button>
              </div>
            )}
          </Card>
        )}
      </section>

      {modalMode && (
        <RoutineModal
          mode={modalMode}
          initialData={selectedRoutine}
          availableExercises={availableExercises}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </>
  );
}

export default Routines;

