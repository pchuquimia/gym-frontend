import { useMemo, useState } from "react";
import TopBar from "../components/layout/TopBar";
import Modal from "../components/shared/Modal";
import { useRoutines } from "../context/RoutineContext";
import { useTrainingData } from "../context/TrainingContext";

// ================= Helpers =================
const slugify = (text) =>
  text
    ?.toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

// ============ UI helpers (solo presentación) ============
const BranchPill = ({ label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`
      inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition
      border
      ${
        active
          ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-400/30"
          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700"
      }
    `}
  >
    {label}
  </button>
);

const BranchTag = ({ label }) => (
  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
    {label}
  </span>
);

const DotsButton = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="
      h-9 w-9 rounded-xl
      border border-slate-200 bg-white
      grid place-items-center
      text-slate-600
      hover:bg-slate-50 transition
      dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800
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

const ChevronLink = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="
      inline-flex items-center gap-1
      text-sm font-semibold text-blue-700
      hover:text-blue-800 transition
      dark:text-blue-300 dark:hover:text-blue-200
    "
  >
    Ver detalles <span aria-hidden>›</span>
  </button>
);

// ================= Routine Modal =================
function RoutineModal({
  mode = "create",
  initialData,
  onSave,
  onClose,
  availableExercises,
}) {
  const [name, setName] = useState(initialData?.name || "");
  const [branch, setBranch] = useState(initialData?.branch || "general");
  const [branchError, setBranchError] = useState("");
  const [exercises, setExercises] = useState(
    (initialData?.exercises || []).map((ex) => {
      const meta = availableExercises.find(
        (a) => a.id === ex.exerciseId || a.id === ex.id || a.name === ex.name
      );
      return {
        ...ex,
        exerciseId: ex.exerciseId || slugify(ex.name),
        muscle: ex.muscle || meta?.muscle,
        image: ex.image || meta?.thumb || meta?.image,
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
        image: exercise.image || exercise.thumb,
      },
    ]);
  };

  const updateSets = (idx, sets) => {
    setExercises((prev) =>
      prev.map((ex, i) => (i === idx ? { ...ex, sets: Number(sets) || 0 } : ex))
    );
  };

  const removeExercise = (idx) => {
    setExercises((prev) => prev.filter((_, i) => i !== idx));
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
                  {ex.image || ex.thumb ? (
                    <img
                      src={ex.image || ex.thumb}
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
                      {ex.image ? (
                        <img
                          src={ex.image}
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
                      <div className="flex items-center gap-2 text-xs mt-1">
                        <span>Series</span>
                        <input
                          type="number"
                          min="1"
                          className="w-14 rounded-md border border-[color:var(--border)] bg-[color:var(--card)] px-2 py-1 text-[color:var(--text)] text-center"
                          value={ex.sets}
                          onChange={(e) => updateSets(ex.idx, e.target.value)}
                        />
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

  const [modalMode, setModalMode] = useState(null);
  const [selectedRoutine, setSelectedRoutine] = useState(null);
  const { exercises: libraryExercises } = useTrainingData();

  // UI states (solo presentación)
  const [activeBranch, setActiveBranch] = useState("all");
  const [openMenuId, setOpenMenuId] = useState(null);

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
        image: ex.image || ex.thumb,
        thumb: ex.thumb,
        branches: ex.branches,
      }));
  }, [libraryExercises]);

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

  const visibleRoutines = useMemo(() => {
    if (activeBranch === "all") return routines;
    return routines.filter((r) => (r.branch || "general") === activeBranch);
  }, [routines, activeBranch]);

  const branchLabel = (b) => {
    if (!b || b === "general") return "General";
    return b.charAt(0).toUpperCase() + b.slice(1);
  };

  const countByBranch = useMemo(() => {
    const total = routines.length;
    const mir = routines.filter(
      (r) => (r.branch || "general") === "miraflores"
    ).length;
    const sop = routines.filter(
      (r) => (r.branch || "general") === "sopocachi"
    ).length;
    return { total, miraflores: mir, sopocachi: sop };
  }, [routines]);

  return (
    <>
      {/* Si quieres mantener TopBar por consistencia del layout global, puedes dejarlo.
          Pero para replicar la imagen, usamos este header local. */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
          Planificación
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
          Mis Rutinas
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-300">
          Crea, gestiona y monitorea tus planes de entrenamiento diarios.
        </p>

        <button
          type="button"
          onClick={openCreate}
          className="
            mt-2 inline-flex w-full items-center justify-center gap-2
            rounded-2xl bg-blue-600 px-4 py-3
            text-sm font-semibold text-white
            shadow-sm hover:bg-blue-700 active:bg-blue-800 transition
            focus:outline-none focus:ring-2 focus:ring-blue-500/35
          "
        >
          <span className="text-lg leading-none">+</span>
          Crear Nueva Rutina
        </button>
      </div>

      {/* Chips */}
      <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
        <BranchPill
          label={`Todas (${countByBranch.total})`}
          active={activeBranch === "all"}
          onClick={() => setActiveBranch("all")}
        />
        <BranchPill
          label="Miraflores"
          active={activeBranch === "miraflores"}
          onClick={() => setActiveBranch("miraflores")}
        />
        <BranchPill
          label="Sopocachi"
          active={activeBranch === "sopocachi"}
          onClick={() => setActiveBranch("sopocachi")}
        />
      </div>

      {/* Lista */}
      <section className="mt-4 space-y-3">
        {visibleRoutines.map((routine) => (
          <div
            key={routine.id}
            className="
              rounded-2xl border border-slate-200 bg-white
              p-4 shadow-sm
              dark:border-slate-800 dark:bg-slate-900
            "
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-base font-semibold text-slate-900 dark:text-slate-50">
                  {routine.name}
                </p>
                <div className="mt-1">
                  <BranchTag label={branchLabel(routine.branch)} />
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
                  <div
                    className="
                      absolute right-0 mt-2 w-44
                      rounded-2xl border border-slate-200 bg-white
                      shadow-xl overflow-hidden
                      dark:border-slate-800 dark:bg-slate-900
                    "
                  >
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                      onClick={() => {
                        setOpenMenuId(null);
                        openEdit(routine);
                      }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                      onClick={() => {
                        setOpenMenuId(null);
                        duplicateRoutine(routine.id);
                      }}
                    >
                      Duplicar
                    </button>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
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

            <div className="mt-3 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-300">
                <span aria-hidden>↻</span>
                <span>{routine.description}</span>
              </div>

              <ChevronLink onClick={() => openEdit(routine)} />
            </div>
          </div>
        ))}

        {!visibleRoutines.length && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            No tienes rutinas creadas.
          </div>
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
