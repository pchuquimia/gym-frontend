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

function ExerciseLibrary() {
  const { exercises, addExercise, updateExerciseMeta, deleteExercise } =
    useTrainingData();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Todos");
  const [activeModal, setActiveModal] = useState(null);
  const [selectedExercise, setSelectedExercise] = useState(null);

  const filteredExercises = useMemo(() => {
    const byName = (exercise) =>
      exercise.name.toLowerCase().includes(search.toLowerCase());
    const byMuscle = (exercise) =>
      filter === "Todos" || exercise.muscle === filter;
    return exercises.filter(
      (exercise) => byName(exercise) && byMuscle(exercise)
    );
  }, [exercises, search, filter]);

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
      <TopBar
        title="Biblioteca de Ejercicios (Navegaci\u00f3n Completa)"
        subtitle="Administra y consulta tu cat\u00e1logo visual de ejercicios"
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <FilterBar
          search={search}
          onSearch={setSearch}
          activeFilter={filter}
          onFilter={setFilter}
        />
        <button
          type="button"
          className="secondary-btn text-sm self-start md:self-auto"
          onClick={handleAdd}
        >
          + Agregar Ejercicio
        </button>
      </div>

      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
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
