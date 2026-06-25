import { useMemo, useState } from "react";
import { ArrowLeft, Dumbbell, ImageIcon, Plus, Shapes } from "lucide-react";
import ConfirmModal from "../components/library/ConfirmModal";
import DetailModal from "../components/library/DetailModal";
import ExerciseCard from "../components/library/ExerciseCard";
import ExerciseModal from "../components/library/ExerciseModal";
import FilterBar from "../components/library/FilterBar";
import Skeleton from "../components/ui/skeleton";
import Button from "../components/ui/button";
import Badge from "../components/ui/badge";
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

function Stat({ icon: Icon, label, value, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
    emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  };
  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-3">
      <div className="flex items-center gap-2">
        <span
          className={`grid h-8 w-8 place-items-center rounded-lg ${tones[tone]}`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            {label}
          </p>
          <p className="text-lg font-semibold text-[color:var(--text)]">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

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
  const [branchFilter, setBranchFilter] = useState("todos");
  const [typeFilter, setTypeFilter] = useState("todos");
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
          branches.includes("general")) &&
        (typeFilter === "todos" || exercise.type === typeFilter)
      );
    });
  }, [exercises, search, filter, branchFilter, typeFilter]);

  const stats = useMemo(() => {
    const total = exercises.length;
    const system = exercises.filter((ex) => ex.type === "system").length;
    const custom = exercises.filter((ex) => ex.type === "custom").length;
    const withImages = exercises.filter(
      (ex) => ex.media?.image?.publicId || ex.imagePublicId || ex.image,
    ).length;
    return { total, system, custom, withImages };
  }, [exercises]);

  const systemExercises = filteredExercises.filter(
    (ex) => ex.type === "system",
  );
  const customExercises = filteredExercises.filter(
    (ex) => ex.type === "custom",
  );

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
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Skeleton key={idx} className="h-32 w-full md:h-72" />
          ))}
        </div>
      );
    }
    return (
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        {items.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            onView={(item) => {
              setSelectedExercise(item);
              setActiveModal("detail");
            }}
            onEdit={(item) => {
              setSelectedExercise(item);
              setActiveModal("edit");
            }}
            onDelete={(item) => {
              setSelectedExercise(item);
              setActiveModal("delete");
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="mx-auto w-full max-w-7xl space-y-4 pb-24 sm:px-2 lg:space-y-5">
        <section className="px-1 pt-1 md:rounded-xl md:border md:border-[color:var(--border)] md:bg-[color:var(--card)] md:p-5 md:shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="hidden flex-wrap items-center gap-2 md:flex">
                <Badge variant="secondary" className="text-[11px]">
                  Biblioteca
                </Badge>
                <Badge className="text-[11px]">{user?.role || "Cliente"}</Badge>
              </div>
              <h1 className="text-2xl font-semibold tracking-normal text-[color:var(--text)] md:mt-3 md:text-3xl">
                Biblioteca de Ejercicios
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-5 text-[color:var(--text-muted)]">
                Explora y gestiona tu catalogo personalizado de entrenamientos.
              </p>
            </div>

            <div className="flex gap-2 sm:flex-row">
              {typeof onNavigate === "function" ? (
                <Button
                  variant="outline"
                  className="h-10 flex-1 gap-2 sm:flex-none"
                  onClick={() => onNavigate("rutinas")}
                >
                  <ArrowLeft className="h-4 w-4" />
                  {hasRoutineDraft
                    ? `Volver a ${routineDraftMeta.name}`
                    : "Rutinas"}
                </Button>
              ) : null}
              <Button
                className="hidden w-full gap-2 sm:w-auto md:inline-flex"
                onClick={handleAdd}
              >
                <Plus className="h-4 w-4" />
                Nuevo ejercicio
              </Button>
            </div>
          </div>

          <div className="mt-4 hidden gap-2 md:grid sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={Dumbbell} label="Total" value={stats.total} />
            <Stat
              icon={Shapes}
              label="Catalogo"
              value={stats.system}
              tone="emerald"
            />
            <Stat
              icon={Plus}
              label="Personal"
              value={stats.custom}
              tone="amber"
            />
            <Stat
              icon={ImageIcon}
              label="Con imagen"
              value={stats.withImages}
            />
          </div>
        </section>

        <section className="sticky top-0 z-20 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)]/95 p-3 shadow-sm backdrop-blur md:top-4">
          <FilterBar
            search={search}
            onSearch={setSearch}
            activeFilter={filter}
            onFilter={setFilter}
            branch={branchFilter}
            onBranch={setBranchFilter}
            type={typeFilter}
            onType={setTypeFilter}
          />
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
          <div className="space-y-5">
            {(typeFilter === "todos" || typeFilter === "system") && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-[color:var(--text)]">
                      Catalogo global
                    </h2>
                    <p className="hidden text-xs text-[color:var(--text-muted)] md:block">
                      Disponible para todos los usuarios.
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[11px]">
                    {systemExercises.length}
                  </Badge>
                </div>
                {renderGrid(systemExercises)}
              </section>
            )}

            {(typeFilter === "todos" || typeFilter === "custom") &&
              customExercises.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-[color:var(--text)]">
                        Personalizados
                      </h2>
                      <p className="hidden text-xs text-[color:var(--text-muted)] md:block">
                        Creados para necesidades especificas.
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-[11px]">
                      {customExercises.length}
                    </Badge>
                  </div>
                  {renderGrid(customExercises)}
                </section>
              )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleAdd}
        className="fixed bottom-5 right-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-300 focus:outline-none focus:ring-4 focus:ring-emerald-400/25 md:hidden"
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
