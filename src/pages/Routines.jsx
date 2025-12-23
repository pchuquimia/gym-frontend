import { useMemo, useState } from "react";
import TopBar from "../components/layout/TopBar";
import Modal from "../components/shared/Modal";
import { useRoutines } from "../context/RoutineContext";
import { useTrainingData } from "../context/TrainingContext";

const slugify = (text) =>
  text
    ?.toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

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

  return (
    <>
      <TopBar
        title="Rutinas y Planificacion"
        subtitle="Crea, gestiona y monitorea tus planes de entrenamiento."
        ctaLabel="Crear Nueva Rutina"
        onCta={openCreate}
      />

      <section className="card flex flex-col gap-3">
        <h3 className="text-lg font-semibold">Mis Rutinas</h3>
        <div className="flex flex-col gap-2">
          {routines.map((routine) => (
            <div
              key={routine.id}
              className="flex items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-3 shadow-sm"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-[color:var(--text)]">
                    {routine.name}
                  </p>
                  <span className="text-xs px-2.5 py-1 rounded-full border border-[color:var(--border)] bg-[color:var(--bg)] text-[color:var(--text-muted)]">
                    {(() => {
                      const b = routine.branch || "general";
                      return b === "general"
                        ? "General"
                        : b.charAt(0).toUpperCase() + b.slice(1);
                    })()}
                  </span>
                </div>
                <p className="text-sm text-[color:var(--text-muted)]">
                  {routine.description}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-1 rounded-md border border-[color:var(--border)] text-sm"
                  onClick={() => openEdit(routine)}
                >
                  Editar
                </button>
                <button
                  className="px-3 py-1 rounded-md border border-[color:var(--border)] text-sm"
                  onClick={() => duplicateRoutine(routine.id)}
                >
                  Duplicar
                </button>
                <button
                  className="px-3 py-1 rounded-md border border-red-200 text-sm text-red-600"
                  onClick={() => deleteRoutine(routine.id)}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
          {!routines.length && (
            <p className="text-sm text-[color:var(--text-muted)]">
              No tienes rutinas creadas.
            </p>
          )}
        </div>
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
