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
    const byName = (exercise) =>
      exercise.name.toLowerCase().includes(search.toLowerCase());
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
      {typeof onNavigate === "function" && (
        <div className="md:hidden mb-3">
          <button
            type="button"
            className="secondary-btn w-full text-sm"
            onClick={() => onNavigate("rutinas")}
          >
            Ir a Rutinas y Planificación
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between sticky top-0 z-10 bg-[color:var(--bg)] py-2">
        <FilterBar
          search={search}
          onSearch={setSearch}
          activeFilter={filter}
          onFilter={setFilter}
          branch={branchFilter}
          onBranch={setBranchFilter}
        />
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2
      rounded-xl
      border border-slate-200
      bg-white
      px-4 py-3
      text-sm font-semibold text-slate-900
      shadow-sm
      transition
      hover:bg-slate-700
      active:bg-slate-100
      focus:outline-none
      focus:ring-2 focus:ring-slate-300/60
      dark:border-slate-700
      dark:bg-slate-900
      dark:text-slate-50
      dark:hover:bg-slate-800 dark:hover:text-slate-500;"
          onClick={handleAdd}
        >
          + Agregar Ejercicio
        </button>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 auto-rows-auto">
        {filteredExercises.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
        {filteredExercises.length === 0 && (
          <div className="card text-center col-span-full">
            <p className="muted">
              No hay ejercicios para los filtros seleccionados.
            </p>
          </div>
        )}
      </section>

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
