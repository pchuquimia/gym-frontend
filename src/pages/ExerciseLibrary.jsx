import { useMemo, useState } from "react";
import ConfirmModal from "../components/library/ConfirmModal";
import DetailModal from "../components/library/DetailModal";
import ExerciseCard from "../components/library/ExerciseCard";
import ExerciseModal from "../components/library/ExerciseModal";
import FilterBar from "../components/library/FilterBar";
import TopBar from "../components/layout/TopBar";
import { useTrainingData } from "../context/TrainingContext";

const slugify = (text) =>
  text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

function ExerciseLibrary({ onNavigate }) {
  const { exercises, addExercise, updateExerciseMeta, deleteExercise } =
    useTrainingData();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Todos");
  const [branchFilter, setBranchFilter] = useState("todos");
  const [activeModal, setActiveModal] = useState(null);
  const [selectedExercise, setSelectedExercise] = useState(null);

  const filteredExercises = useMemo(() => {
    const q = search.trim().toLowerCase();

    const byName = (exercise) =>
      !q || (exercise.name || "").toLowerCase().includes(q);

    const byMuscle = (exercise) =>
      filter === "Todos" || exercise.muscle === filter;

    const byBranch = (exercise) => {
      if (branchFilter === "todos") return true;
      const branches = exercise.branches?.length
        ? exercise.branches
        : ["general"];
      return branches.includes(branchFilter);
    };

    return exercises.filter(
      (exercise) => byName(exercise) && byMuscle(exercise) && byBranch(exercise)
    );
  }, [exercises, search, filter, branchFilter]);

  // Sección "Populares" (puedes cambiar el criterio)
  const popularExercises = useMemo(() => {
    return filteredExercises
      .slice()
      .sort((a, b) => {
        const ai = Boolean(a.thumb || a.image);
        const bi = Boolean(b.thumb || b.image);
        return Number(bi) - Number(ai);
      })
      .slice(0, 6);
  }, [filteredExercises]);

  const handleAdd = () => {
    setSelectedExercise(null);
    setActiveModal("add");
  };

  const handleEdit = (exercise) => {
    setSelectedExercise(exercise);
    setActiveModal("edit");
  };

  const handleView = (exercise) => {
    setSelectedExercise(exercise);
    setActiveModal("detail");
  };

  const handleDelete = (exercise) => {
    setSelectedExercise(exercise);
    setActiveModal("delete");
  };

  const handleSaveExercise = (exercise) => {
    const payload = {
      id: exercise.id || slugify(exercise.name),
      name: exercise.name,
      muscle: exercise.muscle,
      description: exercise.description,
      equipment: exercise.equipment,
      image: exercise.image,
      branches: exercise.branches?.length ? exercise.branches : ["general"],
      type: exercise.type || "custom",
    };

    if (exercise.id) {
      updateExerciseMeta(exercise.id, payload);
    } else {
      addExercise(payload);
    }

    setActiveModal(null);
    setSelectedExercise(null);
  };

  const confirmDelete = () => {
    if (!selectedExercise) return;
    deleteExercise(selectedExercise.id);
    setActiveModal(null);
    setSelectedExercise(null);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedExercise(null);
  };

  return (
    <>
      <TopBar title="Biblioteca de Ejercicios" />

      {/* Contenedor móvil-first como el mock */}
      <div className="mx-auto w-full max-w-md px-4 pb-24 space-y-4">
        {typeof onNavigate === "function" && (
          <div className="md:hidden pt-3">
            <button
              type="button"
              className="secondary-btn w-full text-sm"
              onClick={() => onNavigate("rutinas")}
            >
              Ir a Rutinas y Planificación
            </button>
          </div>
        )}

        {/* Sticky filter bar */}
        <div className="sticky top-0 z-10 bg-[color:var(--bg)] pt-3 pb-3">
          <FilterBar
            search={search}
            onSearch={setSearch}
            activeFilter={filter}
            onFilter={setFilter}
            branch={branchFilter}
            onBranch={setBranchFilter}
          />

          {/* Si quieres mantener el botón grande arriba, descomenta esto */}
          {/*
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:hover:bg-slate-800"
              onClick={handleAdd}
            >
              + Agregar Ejercicio
            </button>
          </div>
          */}
        </div>

        {/* Populares */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[color:var(--text)]">
            Populares
          </h2>
          <button
            type="button"
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            onClick={() => {
              // opcional: podrías setear un estado "showAll" o navegar a otra vista
            }}
          >
            Ver todo &gt;
          </button>
        </div>

        <section className="space-y-3">
          {popularExercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}

          {filteredExercises.length === 0 && (
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-center">
              <p className="text-sm text-[color:var(--text-muted)]">
                No hay ejercicios para los filtros seleccionados.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* FAB (+) como en la imagen */}
      <button
        type="button"
        onClick={handleAdd}
        className="
          fixed bottom-6 right-6 z-20
          h-14 w-14 rounded-full
          bg-emerald-500 text-white
          shadow-lg shadow-emerald-500/30
          grid place-items-center
          hover:bg-emerald-600 active:bg-emerald-700
          focus:outline-none focus:ring-4 focus:ring-emerald-500/25
        "
        aria-label="Agregar ejercicio"
        title="Agregar ejercicio"
      >
        <span className="text-2xl leading-none">+</span>
      </button>

      {(activeModal === "add" || activeModal === "edit") && (
        <ExerciseModal
          mode={activeModal}
          initialData={activeModal === "edit" ? selectedExercise : null}
          onSave={handleSaveExercise}
          onClose={closeModal}
        />
      )}

      {activeModal === "delete" && selectedExercise && (
        <ConfirmModal
          name={selectedExercise.name}
          onConfirm={confirmDelete}
          onClose={closeModal}
        />
      )}

      {activeModal === "detail" && selectedExercise && (
        <DetailModal exercise={selectedExercise} onClose={closeModal} />
      )}
    </>
  );
}

export default ExerciseLibrary;
