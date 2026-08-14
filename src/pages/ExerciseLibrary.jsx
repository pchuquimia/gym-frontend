import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronRight,
  Dumbbell,
  GitMerge,
  Images,
  Library,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import ConfirmModal from "../components/library/ConfirmModal";
import DetailModal from "../components/library/DetailModal";
import ExerciseCard from "../components/library/ExerciseCard";
import ExerciseModal from "../components/library/ExerciseModal";
import ExerciseMigrationPanel from "../components/library/ExerciseMigrationPanel";
import ExerciseImageManager from "../components/library/ExerciseImageManager";
import Skeleton from "../components/ui/skeleton";
import Button from "../components/ui/button";
import { useAuth } from "../context/AuthContext";
import { useTrainingData } from "../context/TrainingContext";
import { api } from "../services/api";
import { toast } from "sonner";
import {
  ALL_FILTER_VALUE,
  EXERCISE_CATEGORIES,
  canonicalizeMuscleGroup,
  getBodyRegionForGroup,
  getNavigationRegionForGroup,
  optionMatches,
  toArray,
} from "../constants/exerciseTaxonomy";
import { getExerciseImageUrl } from "../utils/cloudinary";

const PAGE_SIZE = 60;
const LIBRARY_STALE_TIME_MS = 5 * 60 * 1000;
const ROUTINE_LIBRARY_DRAFT_KEY = "routine_edit_library_draft";
const LIBRARY_FIELDS =
  "name,localizedNames,nameSpanish,nameEnglish,aliases,category,categories,bodyRegion,navigationRegion,primaryMuscleGroup,muscle,primaryMuscle,movementPattern,movementPatterns,equipment,loadType,weightConfig,exerciseType,difficulty,goals,type,ownerId,image,imagePublicId,media.image,media.thumbnail,thumb,isActive";

const slugify = (text = "") =>
  text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const defaultFilters = {
  equipment: ALL_FILTER_VALUE,
  movementPattern: ALL_FILTER_VALUE,
  difficulty: ALL_FILTER_VALUE,
  exerciseType: ALL_FILTER_VALUE,
  position: ALL_FILTER_VALUE,
  goal: ALL_FILTER_VALUE,
};

const readRoutineDraftMeta = () => {
  if (typeof localStorage === "undefined") return null;
  try {
    const draft = JSON.parse(
      localStorage.getItem(ROUTINE_LIBRARY_DRAFT_KEY) || "null",
    );
    return draft?.routine
      ? {
          name:
            draft.sourceRoutineName ||
            draft.routine.name ||
            "rutina en edición",
        }
      : null;
  } catch {
    return null;
  }
};

const useDebouncedValue = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timeout);
  }, [delay, value]);
  return debounced;
};

const normalizeExercise = (exercise = {}) => ({
  ...exercise,
  id: exercise._id || exercise.id,
  image: exercise.media?.image?.url || exercise.image || "",
  imagePublicId:
    exercise.media?.image?.publicId || exercise.imagePublicId || "",
});

function FilterSelect({ label, value, options, onChange }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded border border-[color:var(--border)] bg-[color:var(--card)] px-3 text-sm font-bold text-[color:var(--text)] outline-none focus:border-[#ff5722] focus:ring-2 focus:ring-[#ff5722]/15 dark:focus:border-[#e2ff00] dark:focus:ring-[#e2ff00]/15"
      >
        <option value={ALL_FILTER_VALUE}>{ALL_FILTER_VALUE}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {label === "Equipamiento" && option.value === "Sin equipamiento"
              ? "Sin equipamiento (incluye peso corporal)"
              : option.value}
          </option>
        ))}
      </select>
    </label>
  );
}

function ScopeCard({ label, count, onClick, image, kicker, description }) {
  const imageSrc = image
    ? getExerciseImageUrl(image, { width: 720, height: 360 })
    : "";
  if (imageSrc) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group relative min-h-[164px] overflow-hidden rounded border border-[color:var(--border)] border-t-2 border-t-[#ff5722] bg-[color:var(--card)] text-left shadow-sm transition hover:border-[#ff5722] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5722]/30 dark:border-t-[#e2ff00] dark:hover:border-[#e2ff00] dark:focus-visible:ring-[#e2ff00]/30"
      >
        <img
          src={imageSrc}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover opacity-35 grayscale transition duration-300 group-hover:scale-[1.03] group-hover:opacity-45 dark:opacity-25 dark:group-hover:opacity-35"
        />
        <span className="absolute inset-0 bg-gradient-to-r from-[color:var(--card)] via-[color:var(--card)]/85 to-transparent" />
        <span className="relative flex min-h-[164px] flex-col justify-end p-4">
          {kicker ? (
            <span className="mb-2 w-fit bg-[#1a1a1a] px-2 py-1 text-[9px] font-black uppercase text-white dark:bg-[#e2ff00] dark:text-black">
              {kicker}
            </span>
          ) : null}
          <span className="flex items-end justify-between gap-4">
            <span className="min-w-0">
              <span className="block font-condensed text-2xl font-black uppercase leading-none text-[color:var(--text)]">
                {label}
              </span>
              <span className="mt-2 block max-w-sm text-xs font-semibold text-[color:var(--text-muted)]">
                {description}
              </span>
              <span className="mt-2 block text-[10px] font-black uppercase text-[#ff5722] dark:text-[#e2ff00]">
                {Number.isFinite(count)
                  ? `${count} ejercicios`
                  : "Explorar ejercicios"}
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-[#ff5722] transition group-hover:translate-x-1 dark:text-[#e2ff00]" />
          </span>
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[74px] items-center justify-between gap-3 rounded border border-[color:var(--border)] border-t-2 border-t-transparent bg-[color:var(--card)] p-4 text-left shadow-sm transition hover:border-[#ff5722] hover:border-t-[#ff5722] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5722]/30 dark:hover:border-[#e2ff00] dark:hover:border-t-[#e2ff00] dark:focus-visible:ring-[#e2ff00]/30"
    >
      <div className="min-w-0">
        <p className="truncate text-base font-black text-[color:var(--text)]">
          {label}
        </p>
        <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
          {Number.isFinite(count)
            ? `${count} ejercicios`
            : "Explorar ejercicios"}
        </p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-[#ff5722] transition group-hover:translate-x-0.5 dark:text-[#e2ff00]" />
    </button>
  );
}

function ErrorState({ onRetry }) {
  return (
    <section className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-500/20 dark:bg-red-500/10">
      <h2 className="text-base font-black text-[color:var(--text)]">
        No pudimos cargar los ejercicios
      </h2>
      <p className="mt-1 text-sm text-[color:var(--text-muted)]">
        Revisa tu conexión e intenta nuevamente.
      </p>
      <Button className="mt-4 gap-2" onClick={onRetry}>
        <RefreshCw className="h-4 w-4" />
        Reintentar
      </Button>
    </section>
  );
}

export default function ExerciseLibrary({ onNavigate }) {
  const { user } = useAuth();
  const { addExercise, updateExerciseMeta, deleteExercise } = useTrainingData();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());
  const [selectedCategory, setSelectedCategory] = useState(ALL_FILTER_VALUE);
  const [selectedBodyRegion, setSelectedBodyRegion] = useState("");
  const [selectedBodyLabel, setSelectedBodyLabel] = useState("");
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState("");
  const [filters, setFilters] = useState(defaultFilters);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [routineDraftMeta] = useState(readRoutineDraftMeta);

  const facetsQuery = useQuery({
    queryKey: ["exercise-facets", user?.id || user?._id || "self"],
    queryFn: ({ signal }) => api.getExerciseFacets({ signal }),
    staleTime: LIBRARY_STALE_TIME_MS,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const facets = facetsQuery.data || {};
  const categoryOptions = useMemo(() => {
    const available = new Map(
      (facets.categories || []).map((item) => [item.value, item.count]),
    );
    return EXERCISE_CATEGORIES.filter((category) =>
      available.has(category),
    ).map((category) => ({ value: category, count: available.get(category) }));
  }, [facets.categories]);
  const groups = facets.groupsByRegion?.[selectedBodyRegion] || [];
  const entryPoints = useMemo(() => {
    const entryCounts = facets.entryCounts || {};
    const entryCount = (key) =>
      facetsQuery.data ? entryCounts[key] || 0 : null;
    return [
      {
        id: "upper",
        label: "Tren superior",
        bodyRegion: "Tren superior",
        kicker: "Fuerza",
        description: "Pecho, espalda, hombros y brazos",
        preview: facets.entryPreviews?.upper,
        count: entryCount("upper"),
      },
      {
        id: "lower",
        label: "Tren inferior",
        bodyRegion: "Tren inferior",
        kicker: "Potencia",
        description: "Cuádriceps, isquiotibiales, glúteos y pantorrillas",
        preview: facets.entryPreviews?.lower,
        count: entryCount("lower"),
      },
      {
        id: "core",
        label: "Core",
        bodyRegion: "Zona media",
        kicker: "Estabilidad",
        description: "Abdominales, oblicuos y control lumbo-pélvico",
        preview: facets.entryPreviews?.core,
        count: entryCount("core"),
      },
      {
        id: "fullBody",
        label: "Cuerpo completo",
        bodyRegion: "Cuerpo completo",
        excludeCategory: "Cardio",
        kicker: "Global",
        description: "Movimientos combinados y levantamientos olímpicos",
        preview: facets.entryPreviews?.fullBody || facets.entryPreviews?.cardio,
        count: entryCount("fullBody"),
      },
      {
        id: "cardio",
        label: "Cardio",
        category: "Cardio",
        kicker: "Resistencia",
        description: "Acondicionamiento y capacidad cardiovascular",
        preview: facets.entryPreviews?.cardio,
        count: entryCount("cardio"),
      },
      {
        id: "mobility",
        label: "Movilidad",
        category: "Movilidad",
        kicker: "Movimiento",
        description: "Rango articular, control y calidad de movimiento",
        preview: facets.entryPreviews?.mobility || facets.entryPreviews?.core,
        count: entryCount("mobility"),
      },
      {
        id: "activation",
        label: "Activación",
        category: "Activación",
        kicker: "Preparación",
        description: "Preparación muscular antes de la carga principal",
        preview:
          facets.entryPreviews?.activation || facets.entryPreviews?.upper,
        count: entryCount("activation"),
      },
    ].filter((entry) => entry.count === null || entry.count > 0);
  }, [facets.entryCounts, facets.entryPreviews, facetsQuery.data]);

  const showEntryPoints =
    !selectedBodyRegion &&
    selectedCategory === ALL_FILTER_VALUE &&
    sourceFilter === "all" &&
    !search.trim();
  const showGroups = Boolean(
    sourceFilter === "all" &&
    selectedBodyRegion &&
    !selectedMuscleGroup &&
    !search.trim(),
  );
  const showMigration = sourceFilter === "migration" && user?.role === "Admin";
  const showImageManager = sourceFilter === "images" && user?.role === "Admin";
  const showAdminPanel = showMigration || showImageManager;
  const showResults = !showAdminPanel && !showEntryPoints && !showGroups;
  const fullBodyExcludesCardio =
    selectedBodyRegion === "Cuerpo completo" &&
    selectedCategory === ALL_FILTER_VALUE;

  const resultsQuery = useInfiniteQuery({
    queryKey: [
      "exercise-library",
      user?.id || user?._id || "self",
      debouncedSearch,
      selectedCategory,
      selectedBodyRegion,
      selectedMuscleGroup,
      sourceFilter,
      filters,
    ],
    enabled: showResults,
    staleTime: LIBRARY_STALE_TIME_MS,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      api.getExercises(
        {
          fields: LIBRARY_FIELDS,
          limit: PAGE_SIZE,
          page: pageParam,
          meta: true,
          q: debouncedSearch,
          category:
            selectedCategory === ALL_FILTER_VALUE ? "" : selectedCategory,
          excludeCategory: fullBodyExcludesCardio ? "Cardio" : "",
          bodyRegion: selectedBodyRegion,
          primaryMuscleGroup: selectedMuscleGroup,
          type: sourceFilter === "all" ? "" : sourceFilter,
          equipment:
            filters.equipment === ALL_FILTER_VALUE ? "" : filters.equipment,
          movementPattern:
            filters.movementPattern === ALL_FILTER_VALUE
              ? ""
              : filters.movementPattern,
          difficulty:
            filters.difficulty === ALL_FILTER_VALUE ? "" : filters.difficulty,
          exerciseType:
            filters.exerciseType === ALL_FILTER_VALUE
              ? ""
              : filters.exerciseType,
          position:
            filters.position === ALL_FILTER_VALUE ? "" : filters.position,
          goal: filters.goal === ALL_FILTER_VALUE ? "" : filters.goal,
        },
        { signal },
      ),
    getNextPageParam: (lastPage) => {
      const loaded = lastPage.page * lastPage.limit;
      return loaded < lastPage.total ? lastPage.page + 1 : undefined;
    },
  });

  const exercises = (resultsQuery.data?.pages || [])
    .flatMap((page) => page.items || [])
    .map(normalizeExercise);
  const total = resultsQuery.data?.pages?.[0]?.total || 0;
  const canWrite =
    user?.role === "Admin" || user?.trainingMode !== "coach_managed";
  const canCreate = Boolean(canWrite);
  const canManageExercise = (exercise) =>
    canWrite && (user?.role === "Admin" || exercise?.type !== "system");
  const hasScope = Boolean(
    selectedBodyRegion ||
    selectedCategory !== ALL_FILTER_VALUE ||
    selectedMuscleGroup ||
    sourceFilter !== "all" ||
    search.trim() ||
    Object.values(filters).some((value) => value !== ALL_FILTER_VALUE),
  );

  const activeTitle =
    (showMigration ? "Migración de catálogo" : "") ||
    (showImageManager ? "Imágenes de ejercicios" : "") ||
    selectedMuscleGroup ||
    selectedBodyLabel ||
    (sourceFilter === "custom"
      ? "Mis ejercicios"
      : sourceFilter === "system"
        ? "Catálogo"
        : "") ||
    (selectedCategory !== ALL_FILTER_VALUE
      ? selectedCategory
      : "Explorar ejercicios");
  const activeSubtitle = selectedMuscleGroup
    ? `${selectedBodyLabel || selectedBodyRegion} / ${selectedMuscleGroup}`
    : selectedBodyRegion
      ? "Selecciona un grupo muscular o busca dentro de esta región."
      : showMigration
        ? "Reasigna historial y rutinas al catálogo importado."
        : showImageManager
          ? "Reemplaza la imagen maestra y revisa cada formato antes de publicarlo."
          : sourceFilter === "custom"
            ? "Ejercicios personalizados creados para tu cuenta."
            : sourceFilter === "system"
              ? "Ejercicios disponibles en el catálogo general."
              : selectedCategory !== ALL_FILTER_VALUE
                ? "Ejercicios disponibles para esta categoría."
                : "Busca por nombre o explora una región corporal.";

  const clearTechnicalFilters = () => setFilters(defaultFilters);
  const resetScope = () => {
    setSelectedCategory(ALL_FILTER_VALUE);
    setSelectedBodyRegion("");
    setSelectedBodyLabel("");
    setSelectedMuscleGroup("");
    setSourceFilter("all");
    setSearch("");
    setFiltersOpen(false);
    clearTechnicalFilters();
  };
  const goBackScope = () => {
    if (selectedMuscleGroup) return setSelectedMuscleGroup("");
    if (selectedBodyRegion) {
      setSelectedBodyRegion("");
      setSelectedBodyLabel("");
      return;
    }
    if (selectedCategory !== ALL_FILTER_VALUE) {
      setSelectedCategory(ALL_FILTER_VALUE);
    }
  };
  const selectCategory = (category) => {
    setSelectedCategory(category);
    setSelectedBodyRegion("");
    setSelectedBodyLabel("");
    setSelectedMuscleGroup("");
    setFiltersOpen(false);
    clearTechnicalFilters();
  };
  const selectEntryPoint = (entry) => {
    setSelectedCategory(entry.category || ALL_FILTER_VALUE);
    setSelectedBodyRegion(entry.bodyRegion || "");
    setSelectedBodyLabel(entry.label);
    setSelectedMuscleGroup("");
    setFiltersOpen(false);
    clearTechnicalFilters();
  };
  const updateFilter = (key, value) =>
    setFilters((current) => ({ ...current, [key]: value }));

  const selectSource = (source) => {
    setSourceFilter(source);
    setSelectedBodyRegion("");
    setSelectedBodyLabel("");
    setSelectedMuscleGroup("");
    setFiltersOpen(false);
    clearTechnicalFilters();
  };

  const openDetail = async (exercise) => {
    setSelectedExercise(exercise);
    setActiveModal("detail");
    try {
      const full = await api.getExercise(exercise.id);
      setSelectedExercise(normalizeExercise(full));
    } catch (error) {
      toast.error(error.message || "No se pudo cargar la ficha técnica");
    }
  };
  const handleAdd = () => {
    setSelectedExercise(null);
    setActiveModal("add");
  };
  const closeModal = () => {
    setActiveModal(null);
    setSelectedExercise(null);
  };

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
    const laterality = exercise.laterality || "";
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
      loadType: exercise.loadType || "",
      weightConfig: exercise.weightConfig,
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
          : { forceType: "", contraction: exercise.executionType || "" },
      precautions: toArray(exercise.precautions),
      description: exercise.description || "",
      tags: toArray(exercise.tags),
      movementMode: optionMatches(laterality, "Unilateral")
        ? "unilateral"
        : exercise.movementMode || "bilateral",
      supportsUnilateral:
        Boolean(exercise.supportsUnilateral) ||
        optionMatches(laterality, "Unilateral"),
      image: exercise.image || "",
      imagePublicId: exercise.imagePublicId || "",
      imageFile: exercise.imageFile || null,
      branches: exercise.branches?.length ? exercise.branches : ["general"],
      type: user?.role === "Admin" ? exercise.type || "system" : "custom",
    };
    try {
      if (exercise.id) await updateExerciseMeta(exercise.id, payload);
      else await addExercise(payload);
      toast.success(
        exercise.id ? "Ejercicio actualizado" : "Ejercicio creado",
        { description: exercise.name },
      );
      closeModal();
    } catch (error) {
      toast.error(error.message || "No se pudo guardar el ejercicio");
      throw error;
    }
  };

  const technicalFilters = [
    ["equipment", "Equipamiento", facets.equipment || []],
    ["movementPattern", "Patrón", facets.movementPatterns || []],
    ["difficulty", "Dificultad", facets.difficulties || []],
    ["exerciseType", "Tipo", facets.exerciseTypes || []],
    ["position", "Posición", facets.positions || []],
    ["goal", "Objetivo", facets.goals || []],
  ].filter(([, , options]) => options.length > 0);
  const activeFilterCount = Object.values(filters).filter(
    (value) => value !== ALL_FILTER_VALUE,
  ).length;
  const sourceTabs = [
    { value: "all", label: "Todos", mobileLabel: "Todos", icon: Dumbbell },
    {
      value: "system",
      label: "Catálogo",
      mobileLabel: "Catálogo",
      icon: Library,
    },
    {
      value: "custom",
      label: "Mis ejercicios",
      mobileLabel: "Míos",
      icon: UserRound,
    },
    ...(user?.role === "Admin"
      ? [
          {
            value: "migration",
            label: "Migrar catálogo",
            mobileLabel: "Migrar",
            icon: GitMerge,
          },
          {
            value: "images",
            label: "Gestionar imágenes",
            mobileLabel: "Fotos",
            icon: Images,
          },
        ]
      : []),
  ];

  return (
    <>
      <div className="mx-auto w-full max-w-6xl space-y-5 pb-24 font-condensed">
        <section className="space-y-4 px-1 pt-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ff5722] dark:text-[#e2ff00]">
                Biblioteca
              </p>
              <h1 className="text-2xl font-black uppercase leading-none text-[color:var(--text)] sm:text-3xl">
                {activeTitle}
              </h1>
              <p className="mt-1 text-sm font-semibold text-[color:var(--text-muted)]">
                {activeSubtitle}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {hasScope && !showAdminPanel ? (
                <Button variant="outline" size="sm" onClick={resetScope}>
                  Restablecer
                </Button>
              ) : null}
              {canCreate && !showAdminPanel ? (
                <Button size="sm" className="gap-2" onClick={handleAdd}>
                  <Plus className="h-4 w-4" />
                  Nuevo
                </Button>
              ) : null}
            </div>
          </div>

          {selectedBodyRegion ||
          selectedMuscleGroup ||
          selectedCategory !== ALL_FILTER_VALUE ? (
            <nav
              aria-label="Ruta de navegación"
              className="flex flex-wrap items-center gap-1 text-xs font-bold text-[color:var(--text-muted)]"
            >
              <button
                type="button"
                onClick={resetScope}
                className="hover:text-[#ff5722] dark:hover:text-[#e2ff00]"
              >
                Explorar
              </button>
              <ChevronRight className="h-3.5 w-3.5" />
              {selectedBodyRegion ? (
                <button
                  type="button"
                  onClick={() => setSelectedMuscleGroup("")}
                  className="hover:text-[#ff5722] dark:hover:text-[#e2ff00]"
                >
                  {selectedBodyLabel || selectedBodyRegion}
                </button>
              ) : (
                <span>{selectedCategory}</span>
              )}
              {selectedMuscleGroup ? (
                <>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="text-[color:var(--text)]">
                    {selectedMuscleGroup}
                  </span>
                </>
              ) : null}
            </nav>
          ) : null}

          {typeof onNavigate === "function" && routineDraftMeta ? (
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

          {!showAdminPanel ? (
            <label className="relative block">
              <span className="sr-only">Buscar ejercicios</span>
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                type="search"
                inputMode="search"
                placeholder="Buscar por nombre, músculo o equipo"
                className="h-12 w-full rounded border border-[color:var(--border)] bg-[color:var(--card)] pl-11 pr-4 text-base font-semibold text-[color:var(--text)] outline-none placeholder:text-[color:var(--text-muted)] focus:border-[#ff5722] focus:ring-2 focus:ring-[#ff5722]/15 dark:focus:border-[#e2ff00] dark:focus:ring-[#e2ff00]/15 sm:text-sm"
              />
            </label>
          ) : null}

          <div
            className={`grid border border-[color:var(--border)] bg-[color:var(--card)] p-1 ${
              user?.role === "Admin" ? "grid-cols-5" : "grid-cols-3"
            }`}
            role="tablist"
            aria-label="Origen de los ejercicios"
          >
            {sourceTabs.map(({ value, label, mobileLabel, icon: Icon }) => {
              const active = sourceFilter === value;
              const count = facets.sourceCounts?.[value];
              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => selectSource(value)}
                  className={`flex h-11 min-w-0 items-center justify-center gap-1.5 px-2 text-xs font-black uppercase transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ff5722]/30 dark:focus-visible:ring-[#e2ff00]/30 ${
                    active
                      ? "bg-[#ff5722] text-white dark:bg-[#e2ff00] dark:text-black"
                      : "text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="sm:hidden">{mobileLabel}</span>
                  <span className="hidden sm:inline">{label}</span>
                  {Number.isFinite(count) ? (
                    <span
                      className={`hidden text-[10px] sm:inline ${
                        active ? "opacity-80" : "text-[color:var(--text-muted)]"
                      }`}
                    >
                      {count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {!facetsQuery.isLoading && categoryOptions.length && showResults ? (
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Categoría de ejercicio"
            >
              {[
                { value: ALL_FILTER_VALUE, count: facets.total },
                ...categoryOptions,
              ].map((category) => (
                <button
                  key={category.value}
                  type="button"
                  onClick={() => selectCategory(category.value)}
                  aria-pressed={selectedCategory === category.value}
                  className={`h-9 rounded px-4 text-xs font-black uppercase transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5722]/30 dark:focus-visible:ring-[#e2ff00]/30 ${
                    selectedCategory === category.value
                      ? "bg-[#ff5722] text-white dark:bg-[#e2ff00] dark:text-black"
                      : "border border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--text)]"
                  }`}
                >
                  {category.value}
                </button>
              ))}
            </div>
          ) : null}
        </section>

        {showImageManager ? (
          <ExerciseImageManager />
        ) : showMigration ? (
          <ExerciseMigrationPanel />
        ) : facetsQuery.isError && !showResults ? (
          <ErrorState onRetry={() => facetsQuery.refetch()} />
        ) : showEntryPoints ? (
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Dumbbell className="h-4 w-4 text-[color:var(--text-muted)]" />
              <h2 className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                Regiones y categorías
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {entryPoints.map((entry) => (
                <ScopeCard
                  key={entry.id}
                  label={entry.label}
                  count={entry.count}
                  image={entry.preview}
                  kicker={entry.kicker}
                  description={entry.description}
                  onClick={() => selectEntryPoint(entry)}
                />
              ))}
            </div>
          </section>
        ) : showGroups ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3 px-1">
              <h2 className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                Grupos musculares
              </h2>
              <Button variant="ghost" size="sm" onClick={goBackScope}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                Volver
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => (
                <ScopeCard
                  key={group.value}
                  label={group.value}
                  count={group.count}
                  onClick={() => setSelectedMuscleGroup(group.value)}
                />
              ))}
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            {technicalFilters.length ? (
              <div className="rounded border border-[color:var(--border)] border-t-2 border-t-[#ff5722] bg-[color:var(--card)] p-3 dark:border-t-[#e2ff00]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-[color:var(--text-muted)]" />
                    <p className="text-sm font-black text-[color:var(--text)]">
                      Filtros
                    </p>
                    {activeFilterCount ? (
                      <span className="rounded bg-[#ff5722]/10 px-2 py-0.5 text-xs font-black text-[#c52d00] dark:bg-[#e2ff00]/10 dark:text-[#e2ff00]">
                        {activeFilterCount}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {activeFilterCount ? (
                      <button
                        type="button"
                        onClick={clearTechnicalFilters}
                        className="text-xs font-black text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
                      >
                        Quitar filtros
                      </button>
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      aria-expanded={filtersOpen}
                      onClick={() => setFiltersOpen((value) => !value)}
                    >
                      {filtersOpen ? "Ocultar" : "Filtrar"}
                    </Button>
                  </div>
                </div>
                {filtersOpen ? (
                  <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {technicalFilters.map(([key, label, options]) => (
                      <FilterSelect
                        key={key}
                        label={label}
                        value={filters[key]}
                        options={options}
                        onChange={(value) => updateFilter(key, value)}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {resultsQuery.isError ? (
              <ErrorState onRetry={() => resultsQuery.refetch()} />
            ) : resultsQuery.isLoading ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-[104px] rounded-lg" />
                ))}
              </div>
            ) : exercises.length === 0 ? (
              <section className="rounded-lg border border-dashed border-[color:var(--border)] bg-[color:var(--card)] p-8 text-center">
                {sourceFilter === "custom" ? (
                  <UserRound className="mx-auto h-9 w-9 text-[color:var(--text-muted)]" />
                ) : (
                  <Dumbbell className="mx-auto h-9 w-9 text-[color:var(--text-muted)]" />
                )}
                <h2 className="mt-3 text-base font-semibold text-[color:var(--text)]">
                  {sourceFilter === "custom"
                    ? "Todavía no creaste ejercicios"
                    : "Sin resultados"}
                </h2>
                <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                  {sourceFilter === "custom"
                    ? "Crea uno adaptado a tu equipo, técnica o variante personal."
                    : "Prueba otra búsqueda o restablece los filtros."}
                </p>
                {canCreate ? (
                  <Button className="mt-4 gap-2" onClick={handleAdd}>
                    <Plus className="h-4 w-4" />
                    Crear ejercicio personal
                  </Button>
                ) : null}
              </section>
            ) : (
              <section className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                    Ejercicios
                  </h2>
                  <span className="text-xs font-black text-[color:var(--text)]">
                    {total} resultados
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {exercises.map((exercise) => (
                    <ExerciseCard
                      key={exercise.id}
                      exercise={exercise}
                      onView={openDetail}
                    />
                  ))}
                </div>
                <div className="flex flex-col items-center gap-3">
                  <p className="text-xs font-semibold text-[color:var(--text-muted)]">
                    Mostrando {exercises.length} de {total} ejercicios
                  </p>
                  {resultsQuery.hasNextPage ? (
                    <Button
                      variant="outline"
                      className="h-11 px-8"
                      disabled={resultsQuery.isFetchingNextPage}
                      onClick={() => resultsQuery.fetchNextPage()}
                    >
                      {resultsQuery.isFetchingNextPage
                        ? "Cargando..."
                        : "Cargar más"}
                    </Button>
                  ) : null}
                </div>
              </section>
            )}
          </section>
        )}
      </div>

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
