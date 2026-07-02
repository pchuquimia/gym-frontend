import { useMemo, useState } from "react";
import { ArrowLeft, Dumbbell, Plus, Search } from "lucide-react";
import ConfirmModal from "../components/library/ConfirmModal";
import DetailModal from "../components/library/DetailModal";
import ExerciseCard from "../components/library/ExerciseCard";
import ExerciseModal from "../components/library/ExerciseModal";
import Skeleton from "../components/ui/skeleton";
import Button from "../components/ui/button";
import { useAuth } from "../context/AuthContext";
import { useTrainingData } from "../context/TrainingContext";

const slugify = (text) =>
  text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const ROUTINE_LIBRARY_DRAFT_KEY = "routine_edit_library_draft";

const readRoutineDraftMeta = () => {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(ROUTINE_LIBRARY_DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    return draft?.routine
      ? {
          name:
            draft.sourceRoutineName ||
            draft.routine.name ||
            "rutina en edicion",
        }
      : null;
  } catch {
    return null;
  }
};

const splitList = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

function ExerciseLibrary({ onNavigate }) {
  const { user } = useAuth();
  const {
    exercises,
    addExercise,
    updateExerciseMeta,
    deleteExercise,
    loading,
  } = useTrainingData();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Todos");
  const branchFilter = "todos";
  const [visibleCount, setVisibleCount] = useState(6);
  const [activeModal, setActiveModal] = useState(null);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [routineDraftMeta] = useState(readRoutineDraftMeta);
  const hasRoutineDraft = Boolean(routineDraftMeta);

  const filteredExercises = useMemo(() => {
    const q = search.trim().toLowerCase();
    return exercises.filter((exercise) => {
      const haystack = [
        exercise.name,
        exercise.muscle,
        exercise.primaryMuscle,
        exercise.equipment,
        ...(exercise.tags || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const branches = exercise.branches?.length
        ? exercise.branches
        : ["general"];
      return (
        (!q || haystack.includes(q)) &&
        (filter === "Todos" ||
          exercise.muscle === filter ||
          exercise.primaryMuscle === filter) &&
        (branchFilter === "todos" ||
          branches.includes(branchFilter) ||
          branches.includes("general"))
      );
    });
  }, [exercises, search, filter, branchFilter]);

  const muscleOptions = useMemo(() => {
    const preferred = ["Pecho", "Espalda", "Piernas", "Biceps", "Triceps", "Hombros"];
    const available = new Set(
      exercises
        .map((exercise) => exercise.primaryMuscle || exercise.muscle)
        .filter(Boolean),
    );
    return ["Todos", ...preferred.filter((muscle) => available.has(muscle))];
  }, [exercises]);

  const visibleExercises = filteredExercises.slice(0, visibleCount);
  const hasMore = filteredExercises.length > visibleExercises.length;

  const resetVisibleCount = () => {
    setVisibleCount(6);
  };

  const handleSearchChange = (value) => {
    setSearch(value);
    resetVisibleCount();
  };

  const handleFilterChange = (value) => {
    setFilter(value);
    resetVisibleCount();
  };

  const handleAdd = () => {
    setSelectedExercise(null);
    setActiveModal("add");
  };

  const handleSaveExercise = async (exercise) => {
    const payload = {
      id: exercise.id || slugify(exercise.name),
      name: exercise.name,
      muscle: exercise.primaryMuscle || exercise.muscle,
      primaryMuscle: exercise.primaryMuscle || exercise.muscle,
      secondaryMuscles: splitList(exercise.secondaryMuscles),
      description: exercise.description,
      equipment: exercise.equipment,
      tags: splitList(exercise.tags),
      movementMode: exercise.movementMode,
      supportsUnilateral: exercise.supportsUnilateral,
      image: exercise.image,
      imagePublicId: exercise.imagePublicId || "",
      imageFile: exercise.imageFile || null,
      branches: exercise.branches?.length ? exercise.branches : ["general"],
      type: user?.role === "Admin" ? exercise.type || "system" : "custom",
    };

    if (exercise.id) {
      await updateExerciseMeta(exercise.id, payload);
    } else {
      await addExercise(payload);
    }

    setActiveModal(null);
    setSelectedExercise(null);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedExercise(null);
  };

  const renderGrid = (items) => {
    if (loading) {
      return (
        <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Skeleton key={idx} className="h-[88px] w-full rounded-xl" />
          ))}
        </div>
      );
    }
    return (
      <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 xl:grid-cols-3">
        {items.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            onView={(item) => {
              setSelectedExercise(item);
              setActiveModal("detail");
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="mx-auto w-full max-w-5xl space-y-5 pb-24">
        <section className="space-y-4 px-1 pt-1">
          {typeof onNavigate === "function" && hasRoutineDraft ? (
            <button
              type="button"
              onClick={() => onNavigate("rutinas")}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--card)] px-3 text-xs font-black text-[color:var(--text)] md:hidden"
              aria-label={`Volver a ${routineDraftMeta.name}`}
            >
              <ArrowLeft className="h-4 w-4" />
              Rutina
            </button>
          ) : null}

          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
            <input
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
              type="search"
              placeholder="Buscar ejercicio..."
              className="h-14 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] pl-11 pr-4 text-sm font-semibold text-[color:var(--text)] outline-none placeholder:text-[color:var(--text-muted)] focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {muscleOptions.map((muscle) => (
              <button
                key={muscle}
                type="button"
                onClick={() => handleFilterChange(muscle)}
                className={`h-9 shrink-0 rounded-full px-4 text-xs font-black transition ${
                  filter === muscle
                    ? "bg-emerald-500 text-slate-950"
                    : "border border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--text)]"
                }`}
              >
                {muscle}
              </button>
            ))}
          </div>
        </section>

        {!loading && filteredExercises.length === 0 ? (
          <section className="rounded-xl border border-dashed border-[color:var(--border)] bg-[color:var(--card)] p-8 text-center">
            <Dumbbell className="mx-auto h-9 w-9 text-[color:var(--text-muted)]" />
            <h2 className="mt-3 text-base font-semibold text-[color:var(--text)]">
              Sin resultados
            </h2>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              Ajusta los filtros o crea un ejercicio personalizado.
            </p>
            <Button className="mt-4 gap-2" onClick={handleAdd}>
              <Plus className="h-4 w-4" />
              Nuevo ejercicio
            </Button>
          </section>
        ) : (
          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                Ejercicios
              </h2>
              <span className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--text)]">
                {filteredExercises.length} total
              </span>
            </div>
            {renderGrid(visibleExercises)}
            <div className="flex flex-col items-center gap-3">
              <p className="text-xs font-semibold text-[color:var(--text-muted)]">
                Mostrando {visibleExercises.length} de {filteredExercises.length} ejercicios
              </p>
              {hasMore ? (
                <Button
                  variant="outline"
                  className="h-11 rounded-xl px-8 text-xs font-black uppercase"
                  onClick={() => setVisibleCount((count) => count + 6)}
                >
                  Cargar mas
                </Button>
              ) : null}
            </div>
          </section>
        )}
      </div>

      <button
        type="button"
        onClick={handleAdd}
        className="fixed bottom-5 right-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-300 focus:outline-none focus:ring-4 focus:ring-emerald-400/25"
        aria-label="Agregar ejercicio"
      >
        <Plus className="h-6 w-6" />
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
          onConfirm={async () => {
            await deleteExercise(selectedExercise.id);
            closeModal();
          }}
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
