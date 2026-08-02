import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Dumbbell,
  Filter,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import ConfirmModal from "../components/library/ConfirmModal";
import DetailModal from "../components/library/DetailModal";
import ExerciseCard from "../components/library/ExerciseCard";
import ExerciseModal from "../components/library/ExerciseModal";
import Skeleton from "../components/ui/skeleton";
import Button from "../components/ui/button";
import { useAuth } from "../context/AuthContext";
import { useTrainingData } from "../context/TrainingContext";
import { toast } from "sonner";
import {
  ALL_FILTER_VALUE,
  DIFFICULTY_OPTIONS,
  EQUIPMENT_OPTIONS,
  EXERCISE_CATEGORIES,
  EXERCISE_TYPE_OPTIONS,
  GOAL_OPTIONS,
  LIBRARY_ENTRY_POINTS,
  MOVEMENT_PATTERNS,
  POSITION_OPTIONS,
  canonicalizeMuscleGroup,
  exerciseMatchesValue,
  getBodyRegionForGroup,
  getExerciseBodyRegion,
  getExerciseCategories,
  getExerciseEquipment,
  getExerciseGoals,
  getExerciseMovementPatterns,
  getExerciseSearchText,
  getExerciseType,
  getMovementPatternsForBodyRegion,
  getMuscleGroupsForBodyRegion,
  getNavigationRegionForGroup,
  getPrimaryMuscleGroup,
  listIncludesOption,
  normalizeText,
  optionMatches,
  toArray,
} from "../constants/exerciseTaxonomy";

const slugify = (text) =>
  text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const ROUTINE_LIBRARY_DRAFT_KEY = "routine_edit_library_draft";

const defaultFilters = {
  equipment: ALL_FILTER_VALUE,
  movementPattern: ALL_FILTER_VALUE,
  difficulty: ALL_FILTER_VALUE,
  exerciseType: ALL_FILTER_VALUE,
  position: ALL_FILTER_VALUE,
  goal: ALL_FILTER_VALUE,
};

const INITIAL_VISIBLE_EXERCISES = 24;

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

function FilterSelect({ label, value, options, onChange }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-3 text-sm font-semibold text-[color:var(--text)] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
      >
        {[ALL_FILTER_VALUE, ...options].map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ScopeCard({ label, count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[82px] items-center justify-between gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-left shadow-sm transition hover:border-blue-300/60 hover:shadow-md"
    >
      <div className="min-w-0">
        <p className="truncate text-base font-black text-[color:var(--text)]">
          {label}
        </p>
        <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
          {count} ejercicios
        </p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-blue-300 transition group-hover:translate-x-0.5" />
    </button>
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
  const [selectedCategory, setSelectedCategory] = useState(ALL_FILTER_VALUE);
  const [selectedBodyRegion, setSelectedBodyRegion] = useState("");
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState("");
  const [filters, setFilters] = useState(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_EXERCISES);
  const [activeModal, setActiveModal] = useState(null);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [routineDraftMeta] = useState(readRoutineDraftMeta);
  const hasRoutineDraft = Boolean(routineDraftMeta);

  const resetVisibleCount = () => setVisibleCount(INITIAL_VISIBLE_EXERCISES);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    resetVisibleCount();
  };

  const clearTechnicalFilters = () => {
    setFilters(defaultFilters);
    resetVisibleCount();
  };

  const resetScope = () => {
    setSelectedCategory(ALL_FILTER_VALUE);
    setSelectedBodyRegion("");
    setSelectedMuscleGroup("");
    setSearch("");
    setFiltersOpen(false);
    clearTechnicalFilters();
  };

  const goBackScope = () => {
    if (selectedMuscleGroup) {
      setSelectedMuscleGroup("");
      resetVisibleCount();
      return;
    }
    if (selectedBodyRegion) {
      setSelectedBodyRegion("");
      resetVisibleCount();
      return;
    }
    if (selectedCategory !== ALL_FILTER_VALUE) {
      setSelectedCategory(ALL_FILTER_VALUE);
      resetVisibleCount();
    }
  };

  const selectEntryPoint = (entry) => {
    setSelectedMuscleGroup("");
    setSelectedBodyRegion(entry.bodyRegion || "");
    setSelectedCategory(entry.category || selectedCategory);
    setFiltersOpen(false);
    clearTechnicalFilters();
  };

  const selectCategory = (category) => {
    setSelectedCategory(category);
    if (category !== ALL_FILTER_VALUE) {
      setSelectedBodyRegion("");
      setSelectedMuscleGroup("");
    }
    setFiltersOpen(false);
    resetVisibleCount();
  };

  const selectMuscleGroup = (group) => {
    setSelectedMuscleGroup(group);
    resetVisibleCount();
  };

  const setSearchValue = (value) => {
    setSearch(value);
    resetVisibleCount();
  };

  const entryCounts = useMemo(() => {
    const map = new Map();
    LIBRARY_ENTRY_POINTS.forEach((entry) => {
      const count = exercises.filter((exercise) => {
        if (entry.category) {
          return listIncludesOption(
            getExerciseCategories(exercise),
            entry.category,
          );
        }
        return optionMatches(getExerciseBodyRegion(exercise), entry.bodyRegion);
      }).length;
      map.set(entry.id, count);
    });
    return map;
  }, [exercises]);

  const groupCounts = useMemo(() => {
    const map = new Map();
    getMuscleGroupsForBodyRegion(selectedBodyRegion).forEach((group) => {
      map.set(
        group,
        exercises.filter((exercise) =>
          optionMatches(getPrimaryMuscleGroup(exercise), group),
        ).length,
      );
    });
    return map;
  }, [exercises, selectedBodyRegion]);

  const movementOptions = useMemo(() => {
    if (selectedBodyRegion) {
      return getMovementPatternsForBodyRegion(selectedBodyRegion);
    }
    return MOVEMENT_PATTERNS;
  }, [selectedBodyRegion]);

  const filteredExercises = useMemo(() => {
    const query = normalizeText(search);
    return exercises.filter((exercise) => {
      const categories = getExerciseCategories(exercise);
      const bodyRegion = getExerciseBodyRegion(exercise);
      const muscleGroup = getPrimaryMuscleGroup(exercise);
      const matchesCategory =
        selectedCategory === ALL_FILTER_VALUE ||
        listIncludesOption(categories, selectedCategory);
      const matchesBodyRegion =
        !selectedBodyRegion || optionMatches(bodyRegion, selectedBodyRegion);
      const matchesMuscleGroup =
        !selectedMuscleGroup || optionMatches(muscleGroup, selectedMuscleGroup);
      const matchesSearch =
        !query ||
        normalizeText(getExerciseSearchText(exercise)).includes(query);

      return (
        matchesCategory &&
        matchesBodyRegion &&
        matchesMuscleGroup &&
        matchesSearch &&
        exerciseMatchesValue(
          getExerciseEquipment(exercise),
          filters.equipment,
        ) &&
        exerciseMatchesValue(
          getExerciseMovementPatterns(exercise),
          filters.movementPattern,
        ) &&
        exerciseMatchesValue(exercise.difficulty, filters.difficulty) &&
        exerciseMatchesValue(getExerciseType(exercise), filters.exerciseType) &&
        exerciseMatchesValue(exercise.position, filters.position) &&
        exerciseMatchesValue(getExerciseGoals(exercise), filters.goal)
      );
    });
  }, [
    exercises,
    filters,
    search,
    selectedBodyRegion,
    selectedCategory,
    selectedMuscleGroup,
  ]);

  const visibleExercises = filteredExercises.slice(0, visibleCount);
  const hasMore = filteredExercises.length > visibleExercises.length;
  const showEntryPoints =
    !selectedBodyRegion &&
    selectedCategory === ALL_FILTER_VALUE &&
    !search.trim();
  const showGroups = Boolean(
    selectedBodyRegion && !selectedMuscleGroup && !search.trim(),
  );
  const activeTitle =
    selectedMuscleGroup ||
    selectedBodyRegion ||
    (selectedCategory !== ALL_FILTER_VALUE
      ? selectedCategory
      : "Explorar ejercicios");
  const activeSubtitle = selectedMuscleGroup
    ? `${selectedBodyRegion} / ${selectedMuscleGroup}`
    : selectedBodyRegion
      ? "Ahora elige el grupo que quieres revisar."
      : selectedCategory !== ALL_FILTER_VALUE
        ? "Resultados por tipo de entrenamiento."
        : "Empieza por una zona o busca directo.";

  const handleAdd = () => {
    setSelectedExercise(null);
    setActiveModal("add");
  };

  const canManageExercise = (exercise) =>
    user?.role === "Admin" || exercise?.type !== "system";

  const handleSaveExercise = async (exercise) => {
    const primaryMuscleGroup = canonicalizeMuscleGroup(
      exercise.primaryMuscleGroup || exercise.primaryMuscle || exercise.muscle,
    );
    const bodyRegion =
      exercise.bodyRegion || getBodyRegionForGroup(primaryMuscleGroup);
    const navigationRegion =
      exercise.navigationRegion ||
      getNavigationRegionForGroup(primaryMuscleGroup);
    const categories = toArray(exercise.categories).length
      ? toArray(exercise.categories)
      : toArray(exercise.category);
    const movementPatterns = toArray(exercise.movementPatterns).length
      ? toArray(exercise.movementPatterns)
      : toArray(exercise.movementPattern);
    const laterality = exercise.laterality || "Bilateral";

    const payload = {
      id: exercise.id || slugify(exercise.name),
      name: exercise.name,
      aliases: toArray(exercise.aliases),
      category: categories[0] || "",
      categories,
      bodyRegion,
      navigationRegion,
      primaryMuscleGroup,
      muscle: primaryMuscleGroup,
      primaryMuscle: primaryMuscleGroup,
      primaryMuscles: toArray(exercise.primaryMuscles),
      secondaryMuscles: toArray(exercise.secondaryMuscles),
      stabilizerMuscles: toArray(exercise.stabilizerMuscles),
      movementPattern: movementPatterns[0] || "",
      movementPatterns,
      equipment: toArray(exercise.equipment),
      exerciseType: exercise.exerciseType || "",
      laterality,
      kineticChain: exercise.kineticChain || "",
      executionType: exercise.executionType || "",
      stability: exercise.stability || "",
      position: exercise.position || "",
      difficulty: exercise.difficulty || "",
      goals: toArray(exercise.goals),
      mechanics:
        exercise.mechanics && typeof exercise.mechanics === "object"
          ? exercise.mechanics
          : {
              forceType: "",
              contraction: exercise.executionType || "",
            },
      precautions: toArray(exercise.precautions),
      description: exercise.description,
      tags: toArray(exercise.tags),
      movementMode: optionMatches(laterality, "Unilateral")
        ? "unilateral"
        : "bilateral",
      supportsUnilateral:
        Boolean(exercise.supportsUnilateral) ||
        optionMatches(laterality, "Unilateral"),
      image: exercise.image,
      imagePublicId: exercise.imagePublicId || "",
      imageFile: exercise.imageFile || null,
      branches: exercise.branches?.length ? exercise.branches : ["general"],
      type: user?.role === "Admin" ? exercise.type || "system" : "custom",
    };

    try {
      if (exercise.id) {
        await updateExerciseMeta(exercise.id, payload);
      } else {
        await addExercise(payload);
      }
      toast.success(
        exercise.id ? "Ejercicio actualizado" : "Ejercicio creado",
        {
          description: exercise.name,
        },
      );
    } catch (error) {
      toast.error(error.message || "No se pudo guardar el ejercicio");
      throw error;
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
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Skeleton key={idx} className="h-[104px] w-full rounded-xl" />
          ))}
        </div>
      );
    }
    return (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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

  const activeFilterCount = Object.values(filters).filter(
    (value) => value !== ALL_FILTER_VALUE,
  ).length;

  return (
    <>
      <div className="mx-auto w-full max-w-6xl space-y-5 pb-24">
        <section className="space-y-4 px-1 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700 dark:text-blue-200">
                Biblioteca
              </p>
              <h1 className="text-2xl font-black text-[color:var(--text)]">
                {activeTitle}
              </h1>
              <p className="mt-1 text-sm font-semibold text-[color:var(--text-muted)]">
                {activeSubtitle}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {(selectedMuscleGroup ||
                selectedBodyRegion ||
                selectedCategory !== ALL_FILTER_VALUE) && (
                <Button variant="outline" size="sm" onClick={goBackScope}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={resetScope}>
                Limpiar
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-black text-[color:var(--text-muted)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span
              className={`shrink-0 rounded-full px-3 py-1.5 ${
                !selectedBodyRegion && selectedCategory === ALL_FILTER_VALUE
                  ? "bg-blue-600 text-white"
                  : "bg-[color:var(--card)]"
              }`}
            >
              1. Explorar
            </span>
            <span
              className={`shrink-0 rounded-full px-3 py-1.5 ${
                selectedBodyRegion && !selectedMuscleGroup
                  ? "bg-blue-600 text-white"
                  : "bg-[color:var(--card)]"
              }`}
            >
              2. Grupo
            </span>
            <span
              className={`shrink-0 rounded-full px-3 py-1.5 ${
                selectedMuscleGroup || search.trim()
                  ? "bg-blue-600 text-white"
                  : "bg-[color:var(--card)]"
              }`}
            >
              3. Ejercicios
            </span>
          </div>

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
              onChange={(event) => setSearchValue(event.target.value)}
              type="search"
              placeholder="Buscar ejercicio..."
              className="h-14 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] pl-11 pr-4 text-sm font-semibold text-[color:var(--text)] outline-none placeholder:text-[color:var(--text-muted)] focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[ALL_FILTER_VALUE, ...EXERCISE_CATEGORIES].map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => selectCategory(category)}
                className={`h-9 shrink-0 rounded-full px-4 text-xs font-black transition ${
                  selectedCategory === category
                    ? "bg-emerald-500 text-slate-950"
                    : "border border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--text)]"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </section>

        {showEntryPoints ? (
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Dumbbell className="h-4 w-4 text-[color:var(--text-muted)]" />
              <h2 className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                Explorar ejercicios
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {LIBRARY_ENTRY_POINTS.map((entry) => (
                <ScopeCard
                  key={entry.id}
                  label={entry.label}
                  count={entryCounts.get(entry.id) || 0}
                  onClick={() => selectEntryPoint(entry)}
                />
              ))}
            </div>
          </section>
        ) : null}

        {showGroups ? (
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Filter className="h-4 w-4 text-[color:var(--text-muted)]" />
              <h2 className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                Grupos musculares
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {getMuscleGroupsForBodyRegion(selectedBodyRegion).map((group) => (
                <ScopeCard
                  key={group}
                  label={group}
                  count={groupCounts.get(group) || 0}
                  onClick={() => selectMuscleGroup(group)}
                />
              ))}
            </div>
          </section>
        ) : null}

        {!showEntryPoints && !showGroups ? (
          <section className="space-y-4">
            <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-[color:var(--text-muted)]" />
                  <p className="text-sm font-black text-[color:var(--text)]">
                    Filtros
                  </p>
                  {activeFilterCount ? (
                    <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-black text-blue-700 dark:text-blue-300">
                      {activeFilterCount}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {activeFilterCount ? (
                    <button
                      type="button"
                      onClick={clearTechnicalFilters}
                      className="text-xs font-black uppercase tracking-[0.14em] text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
                    >
                      Limpiar
                    </button>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFiltersOpen((value) => !value)}
                  >
                    {filtersOpen ? "Ocultar" : "Afinar"}
                  </Button>
                </div>
              </div>
              {filtersOpen ? (
                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <FilterSelect
                    label="Equipamiento"
                    value={filters.equipment}
                    options={EQUIPMENT_OPTIONS}
                    onChange={(value) => updateFilter("equipment", value)}
                  />
                  <FilterSelect
                    label="Patrón"
                    value={filters.movementPattern}
                    options={movementOptions}
                    onChange={(value) => updateFilter("movementPattern", value)}
                  />
                  <FilterSelect
                    label="Dificultad"
                    value={filters.difficulty}
                    options={DIFFICULTY_OPTIONS}
                    onChange={(value) => updateFilter("difficulty", value)}
                  />
                  <FilterSelect
                    label="Tipo"
                    value={filters.exerciseType}
                    options={EXERCISE_TYPE_OPTIONS}
                    onChange={(value) => updateFilter("exerciseType", value)}
                  />
                  <FilterSelect
                    label="Posición"
                    value={filters.position}
                    options={POSITION_OPTIONS}
                    onChange={(value) => updateFilter("position", value)}
                  />
                  <FilterSelect
                    label="Objetivo"
                    value={filters.goal}
                    options={GOAL_OPTIONS}
                    onChange={(value) => updateFilter("goal", value)}
                  />
                </div>
              ) : null}
            </div>

            {!loading && filteredExercises.length === 0 ? (
              <section className="rounded-xl border border-dashed border-[color:var(--border)] bg-[color:var(--card)] p-8 text-center">
                <Dumbbell className="mx-auto h-9 w-9 text-[color:var(--text-muted)]" />
                <h2 className="mt-3 text-base font-semibold text-[color:var(--text)]">
                  Sin resultados
                </h2>
                <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                  Cambia la búsqueda o quita filtros.
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
                    Mostrando {visibleExercises.length} de{" "}
                    {filteredExercises.length} ejercicios
                  </p>
                  {hasMore ? (
                    <Button
                      variant="outline"
                      className="h-11 rounded-xl px-8 text-xs font-black uppercase"
                      onClick={() =>
                        setVisibleCount(
                          (count) => count + INITIAL_VISIBLE_EXERCISES,
                        )
                      }
                    >
                      Cargar mas
                    </Button>
                  ) : null}
                </div>
              </section>
            )}
          </section>
        ) : null}
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
            try {
              await deleteExercise(selectedExercise.id);
              toast.success("Ejercicio eliminado", {
                description: selectedExercise.name,
              });
              closeModal();
            } catch (error) {
              toast.error(error.message || "No se pudo eliminar el ejercicio");
            }
          }}
          onClose={closeModal}
        />
      )}

      {activeModal === "detail" && selectedExercise && (
        <DetailModal
          exercise={selectedExercise}
          canManage={canManageExercise(selectedExercise)}
          onClose={closeModal}
          onEdit={() => setActiveModal("edit")}
          onDelete={() => setActiveModal("delete")}
        />
      )}
    </>
  );
}

export default ExerciseLibrary;
