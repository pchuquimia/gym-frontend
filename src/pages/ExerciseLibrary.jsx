import { useMemo, useState } from "react";
import ConfirmModal from "../components/library/ConfirmModal";
import DetailModal from "../components/library/DetailModal";
import ExerciseCard from "../components/library/ExerciseCard";
import ExerciseModal from "../components/library/ExerciseModal";
import FilterBar from "../components/library/FilterBar";
import Skeleton from "../components/ui/skeleton";
import Button from "../components/ui/button";
import Badge from "../components/ui/badge";
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
  const {
    exercises,
    addExercise,
    updateExerciseMeta,
    deleteExercise,
    loading,
  } = useTrainingData();

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

  const stats = useMemo(() => {
    const total = exercises.length;
    const filtered = filteredExercises.length;
    const muscles = new Set(
      exercises.map((ex) => ex.muscle).filter(Boolean)
    ).size;
    const withImages = exercises.filter(
      (ex) => ex.imagePublicId || ex.thumb || ex.image
    ).length;
    return { total, filtered, muscles, withImages };
  }, [exercises, filteredExercises]);

  const popularExercises = useMemo(() => {
    return filteredExercises
      .slice()
      .sort((a, b) => {
        const ai = Boolean(a.imagePublicId || a.thumb || a.image);
        const bi = Boolean(b.imagePublicId || b.thumb || b.image);
        return Number(bi) - Number(ai);
      })
      .slice(0, 6);
  }, [filteredExercises]);

  const popularIds = useMemo(
    () => new Set(popularExercises.map((exercise) => exercise.id)),
    [popularExercises]
  );
  const remainingExercises = useMemo(
    () =>
      filteredExercises.filter((exercise) => !popularIds.has(exercise.id)),
    [filteredExercises, popularIds]
  );

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
      imagePublicId: exercise.imagePublicId || "",
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
      <div className="mx-auto w-full max-w-md md:max-w-3xl lg:max-w-6xl xl:max-w-7xl px-3 sm:px-4 md:px-6 pb-24 space-y-4 lg:space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 sm:p-6 shadow-sm">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/40 to-transparent" />
          </div>

          <div className="relative z-10 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-[0.35em] text-[color:var(--text-muted)] font-semibold">
                Biblioteca
              </p>
              <h1 className="text-2xl sm:text-4xl font-display font-semibold text-[color:var(--text)]">
                Ejercicios
              </h1>
              <p className="text-sm text-[color:var(--text-muted)] max-w-md">
                Encuentra y organiza tus ejercicios por grupo muscular y sede.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button className="w-full sm:w-auto" onClick={handleAdd}>
                  Agregar ejercicio
                </Button>
                {typeof onNavigate === "function" && (
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => onNavigate("rutinas")}
                  >
                    Ir a rutinas
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="rounded-2xl border border-sky-200/70 bg-sky-50/60 p-2.5 sm:p-3 shadow-sm dark:border-sky-400/30 dark:bg-sky-500/10">
                <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-[color:var(--text-muted)] font-semibold">
                  Ejercicios
                </p>
                <p className="mt-2 text-base sm:text-lg font-semibold text-[color:var(--text)]">
                  {stats.total}
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/60 p-2.5 sm:p-3 shadow-sm dark:border-emerald-400/30 dark:bg-emerald-500/10">
                <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-[color:var(--text-muted)] font-semibold">
                  Con imagen
                </p>
                <p className="mt-2 text-base sm:text-lg font-semibold text-[color:var(--text)]">
                  {stats.withImages}
                </p>
              </div>
              <div className="rounded-2xl border border-violet-200/70 bg-violet-50/60 p-2.5 sm:p-3 shadow-sm dark:border-violet-400/30 dark:bg-violet-500/10">
                <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-[color:var(--text-muted)] font-semibold">
                  Grupos
                </p>
                <p className="mt-2 text-base sm:text-lg font-semibold text-[color:var(--text)]">
                  {stats.muscles}
                </p>
              </div>
              <div className="rounded-2xl border border-amber-200/70 bg-amber-50/60 p-2.5 sm:p-3 shadow-sm dark:border-amber-400/30 dark:bg-amber-500/10">
                <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-[color:var(--text-muted)] font-semibold">
                  Resultados
                </p>
                <p className="mt-2 text-base sm:text-lg font-semibold text-[color:var(--text)]">
                  {stats.filtered}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="sticky top-0 z-10 bg-[color:var(--bg)]/95 backdrop-blur-sm pt-2 pb-2">
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-3 sm:p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--text-muted)] font-semibold">
                  Filtros
                </p>
                <p className="text-xs text-[color:var(--text-muted)]">
                  {stats.filtered} resultados activos
                </p>
              </div>
              <Badge variant="secondary" className="text-[11px]">
                {filter === "Todos" ? "Todos" : filter}
              </Badge>
            </div>
            <FilterBar
              search={search}
              onSearch={setSearch}
              activeFilter={filter}
              onFilter={setFilter}
              branch={branchFilter}
              onBranch={setBranchFilter}
            />
          </div>
        </section>

        <section className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-[color:var(--text)]">
                Destacados
              </h2>
              <p className="text-xs text-[color:var(--text-muted)]">
                Ejercicios con mejor contenido visual
              </p>
            </div>
            <Badge variant="secondary" className="text-[11px]">
              {popularExercises.length}
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {loading
              ? Array.from({ length: 6 }).map((_, idx) => (
                <Skeleton key={idx} className="h-20 w-full md:h-64" />
                ))
              : popularExercises.map((exercise) => (
                  <ExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    onView={handleView}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
          </div>
        </section>

        {remainingExercises.length > 0 && (
          <section className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-[color:var(--text)]">
                  Biblioteca completa
                </h2>
                <p className="text-xs text-[color:var(--text-muted)]">
                  {remainingExercises.length} ejercicios adicionales
                </p>
              </div>
              <Badge variant="secondary" className="text-[11px]">
                {remainingExercises.length}
              </Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {remainingExercises.map((exercise) => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  onView={handleView}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </section>
        )}

        {!loading && filteredExercises.length === 0 && (
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-center">
            <p className="text-sm text-[color:var(--text-muted)]">
              No hay ejercicios para los filtros seleccionados.
            </p>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleAdd}
        className="
          fixed bottom-5 right-5 z-20
          h-12 w-12 sm:h-14 sm:w-14 rounded-full
          bg-emerald-500 text-white
          shadow-lg shadow-emerald-500/30
          grid place-items-center
          hover:bg-emerald-600 active:bg-emerald-700
          focus:outline-none focus:ring-4 focus:ring-emerald-500/25
        "
        aria-label="Agregar ejercicio"
        title="Agregar ejercicio"
      >
        <span className="text-xl sm:text-2xl leading-none">+</span>
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
