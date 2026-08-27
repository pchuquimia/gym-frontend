import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronRight,
  Clock3,
  Dumbbell,
  GitMerge,
  Images,
  Layers3,
  Library,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import ConfirmModal from "../components/library/ConfirmModal";
import DetailModal from "../components/library/DetailModal";
import ExerciseCard from "../components/library/ExerciseCard";
import ExerciseModal from "../components/library/ExerciseModal";
import ExerciseMigrationPanel from "../components/library/ExerciseMigrationPanel";
import ExerciseImageManager from "../components/library/ExerciseImageManager";
import MobilePageHeader from "../components/layout/MobilePageHeader";
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
import {
  buildExerciseFamilies,
  selectEssentialFamilies,
} from "../utils/exerciseDiscovery";

const PAGE_SIZE = 60;
const LIBRARY_STALE_TIME_MS = 5 * 60 * 1000;
const ROUTINE_LIBRARY_DRAFT_KEY = "routine_edit_library_draft";
const LIBRARY_FIELDS =
  "name,localizedNames,nameSpanish,nameEnglish,aliases,discovery,category,categories,bodyRegion,navigationRegion,primaryMuscleGroup,muscle,primaryMuscle,movementPattern,movementPatterns,equipment,loadType,weightConfig,exerciseType,difficulty,goals,type,ownerId,image,imagePublicId,media.image,media.thumbnail,thumb,isActive";
const ESSENTIAL_FAMILY_LIMIT = 18;
const HOME_FAMILY_LIMIT = 4;
const RECENT_EXERCISES_KEY = "exercise_library_recent";
const HOME_DISCOVERY_QUERY = "press banca|sentadilla|remo|peso muerto";

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

const readRecentExerciseIds = () => {
  if (typeof localStorage === "undefined") return [];
  try {
    const stored = JSON.parse(
      localStorage.getItem(RECENT_EXERCISES_KEY) || "[]",
    );
    return Array.isArray(stored) ? stored.map(String).slice(0, 12) : [];
  } catch {
    return [];
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
        className="h-11 w-full rounded border border-[color:var(--border)] bg-[color:var(--card)] px-3 text-sm font-bold text-[color:var(--text)] outline-none focus:border-[#352018] focus:ring-2 focus:ring-[#352018]/15 dark:focus:border-[#e2ff00] dark:focus:ring-[#e2ff00]/15"
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
        className="group relative min-h-[164px] overflow-hidden rounded border border-[color:var(--border)] border-t-2 border-t-[#352018] bg-[color:var(--card)] text-left shadow-sm transition hover:border-[#352018] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#352018]/30 dark:border-t-[#e2ff00] dark:hover:border-[#e2ff00] dark:focus-visible:ring-[#e2ff00]/30"
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
              <span className="mt-2 block text-[10px] font-black uppercase text-[#352018] dark:text-[#e2ff00]">
                {Number.isFinite(count)
                  ? `${count} ejercicios`
                  : "Explorar ejercicios"}
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-[#352018] transition group-hover:translate-x-1 dark:text-[#e2ff00]" />
          </span>
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[74px] items-center justify-between gap-3 rounded border border-[color:var(--border)] border-t-2 border-t-transparent bg-[color:var(--card)] p-4 text-left shadow-sm transition hover:border-[#352018] hover:border-t-[#352018] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#352018]/30 dark:hover:border-[#e2ff00] dark:hover:border-t-[#e2ff00] dark:focus-visible:ring-[#e2ff00]/30"
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
      <ChevronRight className="h-5 w-5 shrink-0 text-[#352018] transition group-hover:translate-x-0.5 dark:text-[#e2ff00]" />
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
  const {
    exercises: catalogExercises = [],
    addExercise,
    updateExerciseMeta,
    deleteExercise,
  } = useTrainingData();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());
  const [selectedCategory, setSelectedCategory] = useState(ALL_FILTER_VALUE);
  const [selectedBodyRegion, setSelectedBodyRegion] = useState("");
  const [selectedBodyLabel, setSelectedBodyLabel] = useState("");
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState("");
  const [filters, setFilters] = useState(defaultFilters);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [viewMode, setViewMode] = useState("essential");
  const [selectedFamilyId, setSelectedFamilyId] = useState("");
  const [visibleVariantCount, setVisibleVariantCount] = useState(8);
  const [recentExerciseIds, setRecentExerciseIds] = useState(
    readRecentExerciseIds,
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [isMobileLibrary, setIsMobileLibrary] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 639px)").matches
      : false,
  );
  const mobileFilterStripRef = useRef(null);
  const [activeModal, setActiveModal] = useState(null);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [routineDraftMeta] = useState(readRoutineDraftMeta);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const updateViewport = () => setIsMobileLibrary(media.matches);
    updateViewport();
    media.addEventListener("change", updateViewport);
    return () => media.removeEventListener("change", updateViewport);
  }, []);

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
  const categoryChildOptions =
    selectedCategory !== ALL_FILTER_VALUE
      ? facets.groupsByCategory?.[selectedCategory] || []
      : [];
  const mobileChildOptions = selectedBodyRegion
    ? groups
    : categoryChildOptions;
  const selectedMobileChildOption = selectedMuscleGroup;
  const orderedMobileChildOptions = selectedMobileChildOption
    ? [
        mobileChildOptions.find(
          (option) => option.value === selectedMobileChildOption,
        ),
        ...mobileChildOptions.filter(
          (option) => option.value !== selectedMobileChildOption,
        ),
      ].filter(Boolean)
    : mobileChildOptions;
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

  const showDiscoveryHome =
    !selectedBodyRegion &&
    selectedCategory === ALL_FILTER_VALUE &&
    sourceFilter === "all" &&
    Object.values(filters).every((value) => value === ALL_FILTER_VALUE) &&
    !search.trim();
  const showGroups = Boolean(
    !isMobileLibrary &&
    sourceFilter === "all" &&
    selectedBodyRegion &&
    !selectedMuscleGroup &&
    !search.trim(),
  );
  const showMigration = sourceFilter === "migration" && user?.role === "Admin";
  const showImageManager = sourceFilter === "images" && user?.role === "Admin";
  const showAdminPanel = showMigration || showImageManager;
  const showResults = !showAdminPanel && !showGroups;
  const fullBodyExcludesCardio =
    selectedBodyRegion === "Cuerpo completo" &&
    selectedCategory === ALL_FILTER_VALUE;
  const effectiveSearch =
    showDiscoveryHome && viewMode !== "complete" && viewMode !== "recent"
      ? HOME_DISCOVERY_QUERY
      : debouncedSearch;

  const resultsQuery = useInfiniteQuery({
    queryKey: [
      "exercise-library",
      user?.id || user?._id || "self",
      effectiveSearch,
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
          q: effectiveSearch,
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
          sort: "discovery",
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
  const isSearching = Boolean(search.trim());
  const exerciseFamilies = useMemo(() => {
    const recentIds = new Set(recentExerciseIds);
    return buildExerciseFamilies(exercises, {
      preferInferredFamily: showDiscoveryHome,
    })
      .map((family, index) => ({
        ...family,
        originalIndex: index,
        isRecent: family.variants.some((exercise) =>
          recentIds.has(String(exercise.id)),
        ),
      }))
      .sort((left, right) => {
        if (left.isRecent !== right.isRecent) return left.isRecent ? -1 : 1;
        return left.originalIndex - right.originalIndex;
      });
  }, [exercises, recentExerciseIds, showDiscoveryHome]);
  const essentialFamilies = useMemo(
    () => selectEssentialFamilies(exerciseFamilies, ESSENTIAL_FAMILY_LIMIT),
    [exerciseFamilies],
  );
  const catalogFamilies = useMemo(
    () =>
      buildExerciseFamilies(catalogExercises.map(normalizeExercise), {
        preferInferredFamily: true,
      }),
    [catalogExercises],
  );
  const homeEssentialFamilies = useMemo(() => {
    const preferredFamilyIds = ["bench-press", "squat", "row", "deadlift"];
    const availableFamilies = [...exerciseFamilies, ...catalogFamilies];
    const preferred = preferredFamilyIds
      .map((familyId) =>
        availableFamilies.find((family) => family.id === familyId),
      )
      .filter(Boolean);
    const selectedIds = new Set(preferred.map((family) => family.id));
    const fallback = selectEssentialFamilies(
      availableFamilies,
      HOME_FAMILY_LIMIT,
    )
      .filter((family) => !selectedIds.has(family.id))
      .slice(0, HOME_FAMILY_LIMIT - preferred.length);
    return [...preferred, ...fallback];
  }, [catalogFamilies, exerciseFamilies]);
  const recentFamilies = useMemo(() => {
    const catalogById = new Map(
      catalogExercises.map((exercise) => [
        String(exercise.id || exercise._id),
        normalizeExercise(exercise),
      ]),
    );
    const recentExercises = recentExerciseIds
      .map((id) => catalogById.get(String(id)))
      .filter(Boolean);
    return buildExerciseFamilies(recentExercises).map((family) => ({
      ...family,
      isRecent: true,
    }));
  }, [catalogExercises, recentExerciseIds]);
  const personalizedFamilies = useMemo(() => {
    const seen = new Set();
    return [
      ...recentFamilies,
      ...homeEssentialFamilies,
      ...essentialFamilies,
    ].filter((family) => {
      if (seen.has(family.id)) return false;
      seen.add(family.id);
      return true;
    });
  }, [essentialFamilies, homeEssentialFamilies, recentFamilies]);
  const familyView = viewMode !== "complete";
  const visibleFamilyGroups = useMemo(() => {
    const basicFamilies = showDiscoveryHome
      ? homeEssentialFamilies
      : essentialFamilies.filter((family) => family.isEssential);
    const families =
      viewMode === "recent"
        ? recentFamilies
        : viewMode === "basics"
          ? basicFamilies
          : showDiscoveryHome
            ? personalizedFamilies
            : essentialFamilies;
    const limit = showDiscoveryHome
      ? HOME_FAMILY_LIMIT
      : ESSENTIAL_FAMILY_LIMIT;
    return families.slice(0, limit);
  }, [
    essentialFamilies,
    homeEssentialFamilies,
    personalizedFamilies,
    recentFamilies,
    showDiscoveryHome,
    viewMode,
  ]);
  const selectedFamily = selectedFamilyId
    ? [...exerciseFamilies, ...visibleFamilyGroups].find(
        (family) => family.id === selectedFamilyId,
      )
    : null;
  const visibleVariants = selectedFamily
    ? selectedFamily.variants.slice(0, visibleVariantCount)
    : [];
  const hasMoreVariants = Boolean(
    selectedFamily && visibleVariantCount < selectedFamily.variants.length,
  );
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
    Object.values(filters).some((value) => value !== ALL_FILTER_VALUE),
  );

  const activeTitle =
    (selectedFamily ? selectedFamily.name : "") ||
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
      : showDiscoveryHome
        ? "Encuentra tu próximo ejercicio"
        : "Explorar ejercicios");
  const activeSubtitle = selectedFamily
    ? `${selectedFamily.variants.length} variantes ordenadas desde la opción más simple.`
    : selectedMuscleGroup
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
                  : showDiscoveryHome
                    ? "Elige un movimiento esencial o busca por nombre, músculo o equipo."
                    : "Busca por nombre o explora una región corporal.";
  const isLibraryChild = Boolean(
    showAdminPanel ||
      selectedFamily ||
      selectedBodyRegion ||
      selectedMuscleGroup ||
      selectedCategory !== ALL_FILTER_VALUE,
  );
  const mobileLibraryTitle = selectedFamily
    ? selectedFamily.name
    : showMigration
      ? "Migración de catálogo"
      : showImageManager
        ? "Imágenes de ejercicios"
        : selectedBodyRegion
          ? selectedBodyLabel || selectedBodyRegion
          : selectedCategory !== ALL_FILTER_VALUE
            ? selectedCategory
            : activeTitle;

  const clearTechnicalFilters = () => setFilters(defaultFilters);
  const getScrollBehavior = () =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";
  const scrollLibraryToTop = () => {
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: getScrollBehavior() });
      });
    });
  };
  const focusMobileFilter = () => {
    if (
      typeof window === "undefined" ||
      !window.matchMedia?.("(max-width: 639px)").matches
    )
      return;
    window.setTimeout(() => {
      const strip = mobileFilterStripRef.current;
      if (strip) {
        const start = strip.scrollLeft;
        const reduceMotion = getScrollBehavior() === "auto";
        if (reduceMotion || start <= 0) {
          strip.scrollLeft = 0;
        } else {
          const duration = 320;
          const startedAt = window.performance.now();
          const move = (now) => {
            const progress = Math.min(1, (now - startedAt) / duration);
            const eased = 1 - (1 - progress) ** 3;
            strip.scrollLeft = Math.round(start * (1 - eased));
            if (progress < 1) {
              window.requestAnimationFrame(move);
            } else {
              strip.scrollLeft = 0;
            }
          };
          window.requestAnimationFrame(move);
        }
      }
      window.scrollTo({ top: 0, behavior: getScrollBehavior() });
    }, 80);
  };
  const selectMuscleGroup = (group) => {
    setSelectedMuscleGroup(group);
    setSelectedFamilyId("");
    setVisibleVariantCount(8);
    setFiltersOpen(false);
    setMobileSearchOpen(false);
    focusMobileFilter();
  };
  const resetMuscleGroup = () => {
    setSelectedMuscleGroup("");
    setSelectedFamilyId("");
    setVisibleVariantCount(8);
    focusMobileFilter();
  };
  const selectMobileChildOption = (option) => {
    selectMuscleGroup(option);
  };
  const resetMobileChildOption = () => {
    resetMuscleGroup();
  };
  const resetScope = () => {
    setSelectedCategory(ALL_FILTER_VALUE);
    setSelectedBodyRegion("");
    setSelectedBodyLabel("");
    setSelectedMuscleGroup("");
    setSourceFilter("all");
    setSearch("");
    setViewMode("essential");
    setSelectedFamilyId("");
    setVisibleVariantCount(8);
    setFiltersOpen(false);
    clearTechnicalFilters();
  };
  const goBackScope = () => {
    if (selectedFamilyId) {
      setSelectedFamilyId("");
      setVisibleVariantCount(8);
      return;
    }
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
  const goBackMobileScope = () => {
    if (selectedFamilyId) {
      setSelectedFamilyId("");
      setVisibleVariantCount(8);
      return;
    }
    resetScope();
  };
  const selectCategory = (category) => {
    setSelectedCategory(category);
    setSelectedBodyRegion("");
    setSelectedBodyLabel("");
    setSelectedMuscleGroup("");
    setSelectedFamilyId("");
    setVisibleVariantCount(8);
    setFiltersOpen(false);
    clearTechnicalFilters();
  };
  const selectEntryPoint = (entry) => {
    setSelectedCategory(entry.category || ALL_FILTER_VALUE);
    setSelectedBodyRegion(entry.bodyRegion || "");
    setSelectedBodyLabel(entry.label);
    setSelectedMuscleGroup("");
    setSelectedFamilyId("");
    setVisibleVariantCount(8);
    setViewMode("complete");
    setFiltersOpen(false);
    clearTechnicalFilters();
    scrollLibraryToTop();
  };
  const updateFilter = (key, value) =>
    setFilters((current) => ({ ...current, [key]: value }));

  const selectSource = (source) => {
    setSourceFilter(source);
    setSelectedBodyRegion("");
    setSelectedBodyLabel("");
    setSelectedMuscleGroup("");
    setSelectedFamilyId("");
    setVisibleVariantCount(8);
    setFiltersOpen(false);
    clearTechnicalFilters();
  };

  const openDetail = async (exercise) => {
    const exerciseId = String(exercise.id || exercise._id || "");
    if (exerciseId) {
      setRecentExerciseIds((current) => {
        const next = [
          exerciseId,
          ...current.filter((id) => id !== exerciseId),
        ].slice(0, 12);
        localStorage.setItem(RECENT_EXERCISES_KEY, JSON.stringify(next));
        return next;
      });
    }
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
  const quickFilters = [
    { key: "equipment", value: "Sin equipamiento", label: "Sin equipo" },
    { key: "equipment", value: "Mancuernas", label: "Mancuernas" },
    { key: "equipment", value: "Máquina", label: "Máquinas" },
    { key: "difficulty", value: "Principiante", label: "Principiante" },
  ];
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
  ];
  const adminTools = [
    {
      value: "migration",
      label: "Migrar catálogo",
      description: "Unificar ejercicios e historial",
      icon: GitMerge,
    },
    {
      value: "images",
      label: "Gestionar imágenes",
      description: "Revisar recursos del catálogo",
      icon: Images,
    },
  ];

  return (
    <>
      <div className="library-reference-shell mx-auto w-full max-w-6xl space-y-5 px-[6px] pb-24 font-condensed md:px-0">
        <section className="space-y-4 px-1 pt-1">
          <div className="md:hidden">
            <MobilePageHeader
              title={isLibraryChild ? mobileLibraryTitle : "Biblioteca"}
              variant={isLibraryChild ? "detail" : "main"}
              onBack={() => {
                if (showAdminPanel) {
                  selectSource("all");
                } else {
                  goBackMobileScope();
                }
                scrollLibraryToTop();
              }}
            />

            {!showAdminPanel && !selectedFamily ? (
              <div
                key={
                  selectedBodyRegion
                    ? `${selectedBodyRegion}:${selectedMobileChildOption || "grupos"}`
                    : selectedCategory !== ALL_FILTER_VALUE
                      ? `${selectedCategory}:${selectedMobileChildOption || "subgrupos"}`
                    : "colecciones"
                }
                ref={mobileFilterStripRef}
                className={`library-filter-strip -mx-[10px] flex gap-2.5 overflow-x-auto border-b border-[color:var(--detail-row-divider)] px-[10px] pb-5 pt-3 ${selectedMobileChildOption ? "library-filter-strip--focused" : ""}`}
              >
                {isLibraryChild ? (
                  <>
                    {selectedMobileChildOption ? (
                      <button
                        type="button"
                        onClick={resetMobileChildOption}
                        className="library-reset-chip flex h-12 shrink-0 items-center gap-2 rounded-full border border-[color:var(--border-strong)] bg-transparent px-5 font-sans text-[15px] font-medium text-[color:var(--text)]"
                      >
                        <RefreshCw className="h-4 w-4" strokeWidth={2} />
                        Restablecer
                      </button>
                    ) : null}
                    {orderedMobileChildOptions.map((option) => {
                      const active =
                        selectedMobileChildOption === option.value;
                      const locked = Boolean(
                        selectedMobileChildOption && !active,
                      );
                      return (
                        <button
                          key={option.value}
                          type="button"
                          data-library-filter={slugify(option.value)}
                          aria-pressed={active}
                          disabled={locked}
                          onClick={(event) => {
                            event.currentTarget.blur();
                            selectMobileChildOption(option.value);
                          }}
                          className={`h-12 shrink-0 rounded-full px-5 font-sans text-[15px] font-medium transition-[opacity,transform,background-color,color] duration-300 ${
                            active
                              ? "scale-[1.02] bg-[#251a12] text-[#fffdf8] dark:bg-[#e2ff00] dark:text-black"
                              : "bg-[color:var(--surface-subtle)] text-[color:var(--text)]"
                          } ${locked ? "cursor-not-allowed opacity-35" : "opacity-100"}`}
                        >
                          {option.value}
                        </button>
                      );
                    })}
                    {!mobileChildOptions.length ? (
                      <span className="flex h-12 shrink-0 items-center rounded-full bg-[color:var(--surface-subtle)] px-5 font-sans text-[15px] text-[color:var(--text-muted)]">
                        Cargando subgrupos…
                      </span>
                    ) : null}
                  </>
                ) : (
                  <>
                    {[
                      { value: "essential", label: "Para ti" },
                      { value: "basics", label: "Básicos" },
                      { value: "recent", label: "Recientes" },
                      { value: "complete", label: "Catálogo" },
                    ].map(({ value, label }) => {
                      const active = viewMode === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={active}
                          onClick={() => {
                            setViewMode(value);
                            setSelectedFamilyId("");
                            setMobileSearchOpen(false);
                          }}
                          className={`h-12 shrink-0 rounded-full px-5 font-sans text-[15px] font-medium transition-colors ${
                            active
                              ? "bg-[#251a12] text-[#fffdf8] dark:bg-[#e2ff00] dark:text-black"
                              : "bg-[color:var(--surface-subtle)] text-[color:var(--text)]"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      aria-pressed={mobileSearchOpen || Boolean(search)}
                      onClick={() => {
                        setMobileSearchOpen((value) => !value);
                        setFiltersOpen(false);
                      }}
                      className={`flex h-12 shrink-0 items-center gap-2 rounded-full px-5 font-sans text-[15px] font-medium transition-colors ${
                        mobileSearchOpen || search
                          ? "bg-[#251a12] text-[#fffdf8] dark:bg-[#e2ff00] dark:text-black"
                          : "bg-[color:var(--surface-subtle)] text-[color:var(--text)]"
                      }`}
                    >
                      <Search className="h-4 w-4" strokeWidth={2} />
                      Buscar
                    </button>
                    <button
                      type="button"
                      aria-pressed={filtersOpen || activeFilterCount > 0}
                      onClick={() => {
                        setFiltersOpen((value) => !value);
                        setMobileSearchOpen(false);
                      }}
                      className={`flex h-12 shrink-0 items-center gap-2 rounded-full px-5 font-sans text-[15px] font-medium transition-colors ${
                        filtersOpen || activeFilterCount
                          ? "bg-[#251a12] text-[#fffdf8] dark:bg-[#e2ff00] dark:text-black"
                          : "bg-[color:var(--surface-subtle)] text-[color:var(--text)]"
                      }`}
                    >
                      <SlidersHorizontal className="h-4 w-4" strokeWidth={2} />
                      Filtros
                      {activeFilterCount ? ` ${activeFilterCount}` : ""}
                    </button>
                    {canCreate ? (
                      <button
                        type="button"
                        onClick={handleAdd}
                        className="flex h-12 shrink-0 items-center gap-2 rounded-full bg-[color:var(--surface-subtle)] px-5 font-sans text-[15px] font-medium text-[color:var(--text)]"
                      >
                        <Plus className="h-4 w-4" strokeWidth={2} />
                        Crear
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}
          </div>

          <div className="hidden flex-wrap items-start justify-between gap-3 md:flex">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#352018] dark:text-[#e2ff00]">
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
              {showAdminPanel ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => selectSource("all")}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Biblioteca
                </Button>
              ) : null}
              {hasScope && !showAdminPanel && !selectedFamily ? (
                <Button variant="outline" size="sm" onClick={resetScope}>
                  Restablecer
                </Button>
              ) : null}
              {canCreate &&
              !showAdminPanel &&
              !isSearching &&
              !selectedFamily ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleAdd}
                >
                  <Plus className="h-4 w-4" />
                  Crear
                </Button>
              ) : null}
            </div>
          </div>

          {!selectedFamily &&
          (selectedBodyRegion ||
            selectedMuscleGroup ||
            selectedCategory !== ALL_FILTER_VALUE) ? (
            <nav
              aria-label="Ruta de navegación"
              className="hidden flex-wrap items-center gap-1 text-xs font-bold text-[color:var(--text-muted)] md:flex"
            >
              <button
                type="button"
                onClick={resetScope}
                className="hover:text-[#352018] dark:hover:text-[#e2ff00]"
              >
                Explorar
              </button>
              <ChevronRight className="h-3.5 w-3.5" />
              {selectedBodyRegion ? (
                <button
                  type="button"
                  onClick={() => setSelectedMuscleGroup("")}
                  className="hover:text-[#352018] dark:hover:text-[#e2ff00]"
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

          {!showAdminPanel && !selectedFamily ? (
            <label
              className={`relative ${mobileSearchOpen ? "block" : "hidden"} md:block`}
            >
              <span className="sr-only">Buscar ejercicios</span>
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setViewMode("essential");
                  setSelectedFamilyId("");
                  setVisibleVariantCount(8);
                }}
                type="search"
                inputMode="search"
                placeholder="Buscar por nombre, músculo o equipo"
                className="h-12 w-full rounded-full border border-[color:var(--border)] bg-[color:var(--card)] pl-11 pr-4 font-sans text-[16px] font-normal text-[color:var(--text)] outline-none placeholder:text-[color:var(--text-muted)] focus:border-[#352018] focus:ring-2 focus:ring-[#352018]/15 md:rounded md:text-sm md:font-semibold dark:focus:border-[#e2ff00] dark:focus:ring-[#e2ff00]/15"
              />
            </label>
          ) : null}

          {!facetsQuery.isLoading &&
          categoryOptions.length &&
          showResults &&
          !showDiscoveryHome &&
          !isSearching &&
          !selectedFamily ? (
            <div
              className="hidden flex-wrap gap-2 md:flex"
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
                  className={`h-9 rounded px-4 text-xs font-black uppercase transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#352018]/30 dark:focus-visible:ring-[#e2ff00]/30 ${
                    selectedCategory === category.value
                      ? "bg-[#352018] text-white dark:bg-[#e2ff00] dark:text-black"
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
        ) : showGroups ? (
          <section className="space-y-3">
            <div className="px-2 py-10 text-center md:hidden">
              <p className="font-sans text-[16px] font-medium text-[color:var(--text)]">
                Elige un grupo muscular arriba
              </p>
              <p className="mt-1 font-sans text-[14px] text-[color:var(--text-muted)]">
                La biblioteca mostrará solo los ejercicios de ese grupo.
              </p>
            </div>
            <div className="hidden items-center justify-between gap-3 px-1 md:flex">
              <h2 className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                Grupos musculares
              </h2>
              <Button variant="ghost" size="sm" onClick={goBackScope}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                Volver
              </Button>
            </div>
            <div className="hidden gap-3 md:grid md:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => (
                <ScopeCard
                  key={group.value}
                  label={group.value}
                  count={group.count}
                  onClick={() => selectMuscleGroup(group.value)}
                />
              ))}
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            {!selectedFamily ? (
              <>
                <div className="hidden flex-col gap-2 rounded border border-[color:var(--border)] bg-[color:var(--card)] p-1 md:flex md:flex-row md:items-center">
                  <div
                    className="grid min-w-0 flex-1 grid-cols-3"
                    role="tablist"
                    aria-label="Colecciones de ejercicios"
                  >
                    {[
                      {
                        value: "essential",
                        label: "Para ti",
                        icon: Sparkles,
                      },
                      {
                        value: "basics",
                        label: "Básicos",
                        icon: Dumbbell,
                      },
                      {
                        value: "recent",
                        label: "Recientes",
                        icon: Clock3,
                      },
                    ].map(({ value, label, icon: Icon }) => {
                      const active = viewMode === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => {
                            setViewMode(value);
                            setSelectedFamilyId("");
                          }}
                          className={`flex h-10 min-w-0 items-center justify-center gap-1.5 px-2 text-xs font-black uppercase transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#352018]/30 dark:focus-visible:ring-[#e2ff00]/30 ${
                            active
                              ? "bg-[#1a1a1a] text-white dark:bg-[#e2ff00] dark:text-black"
                              : "text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 gap-1 sm:flex">
                    <button
                      type="button"
                      aria-pressed={viewMode === "complete"}
                      aria-label="Catálogo completo"
                      onClick={() => {
                        setViewMode("complete");
                        setSelectedFamilyId("");
                      }}
                      className={`flex h-10 items-center justify-center gap-1.5 rounded px-3 text-xs font-black uppercase transition ${
                        viewMode === "complete"
                          ? "bg-[#1a1a1a] text-white dark:bg-[#e2ff00] dark:text-black"
                          : "text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
                      }`}
                    >
                      <Layers3 className="h-3.5 w-3.5" />
                      Catálogo
                    </button>
                    <button
                      type="button"
                      aria-label="Filtros y herramientas"
                      aria-expanded={filtersOpen}
                      onClick={() => setFiltersOpen((value) => !value)}
                      className={`flex h-10 items-center gap-1.5 rounded px-3 text-xs font-black transition ${
                        filtersOpen || activeFilterCount
                          ? "bg-[color:var(--accent)] text-[color:var(--accent-contrast)]"
                          : "text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
                      }`}
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      <span>Filtros</span>
                      {activeFilterCount ? (
                        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#352018] px-1 text-[10px] text-white dark:bg-[#e2ff00] dark:text-black">
                          {activeFilterCount}
                        </span>
                      ) : null}
                    </button>
                  </div>
                </div>

                <div
                  className={`${filtersOpen ? "flex" : "hidden"} library-filter-strip gap-2 overflow-x-auto pb-1 md:flex`}
                  role="group"
                  aria-label="Filtros rápidos"
                >
                  {quickFilters.map(({ key, value, label }) => {
                    const active = filters[key] === value;
                    return (
                      <button
                        key={`${key}-${value}`}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          updateFilter(key, active ? ALL_FILTER_VALUE : value);
                          setSelectedFamilyId("");
                        }}
                        className={`h-8 shrink-0 rounded-full px-3 text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#352018]/30 dark:focus-visible:ring-[#e2ff00]/30 ${
                          active
                            ? "bg-[#352018] text-white dark:bg-[#e2ff00] dark:text-black"
                            : "border border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--text)]"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {filtersOpen ? (
                  <div className="space-y-4 rounded border border-[color:var(--border)] bg-[color:var(--card)] p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-xs font-black uppercase text-[color:var(--text)]">
                        Afinar resultados
                      </p>
                      {activeFilterCount ? (
                        <button
                          type="button"
                          onClick={clearTechnicalFilters}
                          className="text-xs font-black text-[#2a1711] dark:text-[#e2ff00]"
                        >
                          Limpiar
                        </button>
                      ) : null}
                    </div>
                    {technicalFilters.length ? (
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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

                    <div className="border-t border-[color:var(--border)] pt-4">
                      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                        Origen
                      </p>
                      <div
                        className="grid grid-cols-3 gap-2"
                        role="group"
                        aria-label="Origen de los ejercicios"
                      >
                        {sourceTabs.map(
                          ({ value, label, mobileLabel, icon: Icon }) => {
                            const active = sourceFilter === value;
                            return (
                              <button
                                key={value}
                                type="button"
                                aria-pressed={active}
                                onClick={() => selectSource(value)}
                                className={`flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded px-2 text-xs font-black uppercase transition ${
                                  active
                                    ? "bg-[#352018] text-white dark:bg-[#e2ff00] dark:text-black"
                                    : "bg-[color:var(--bg)] text-[color:var(--text-muted)]"
                                }`}
                              >
                                <Icon className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate sm:hidden">
                                  {mobileLabel}
                                </span>
                                <span className="hidden truncate sm:inline">
                                  {label}
                                </span>
                              </button>
                            );
                          },
                        )}
                      </div>
                    </div>

                    {user?.role === "Admin" ? (
                      <div className="border-t border-[color:var(--border)] pt-4">
                        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                          Herramientas administrativas
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {adminTools.map(
                            ({ value, label, description, icon: Icon }) => (
                              <button
                                key={value}
                                type="button"
                                onClick={() => selectSource(value)}
                                className="flex items-center gap-3 rounded bg-[color:var(--bg)] p-3 text-left text-[color:var(--text)] transition hover:text-[#352018] dark:hover:text-[#e2ff00]"
                              >
                                <Icon className="h-4 w-4 shrink-0" />
                                <span>
                                  <span className="block text-xs font-black uppercase">
                                    {label}
                                  </span>
                                  <span className="block text-[10px] font-semibold text-[color:var(--text-muted)]">
                                    {description}
                                  </span>
                                </span>
                              </button>
                            ),
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : null}

            {resultsQuery.isError ? (
              <ErrorState onRetry={() => resultsQuery.refetch()} />
            ) : resultsQuery.isLoading ? (
              <div className="space-y-3" aria-live="polite">
                <p className="px-1 text-xs font-black uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                  Buscando las mejores opciones…
                </p>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-[104px] rounded-lg" />
                  ))}
                </div>
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
                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-2">
                    {selectedFamily ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-2"
                        onClick={() => {
                          setSelectedFamilyId("");
                          setVisibleVariantCount(8);
                        }}
                      >
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        Resultados
                      </Button>
                    ) : null}
                    <h2 className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                      {selectedFamily
                        ? "Elige una variante"
                        : isSearching
                          ? `Resultados para “${debouncedSearch || search}”`
                          : viewMode === "recent"
                            ? "Usados recientemente"
                            : viewMode === "complete"
                              ? "Todos los ejercicios"
                              : viewMode === "basics"
                                ? "Movimientos esenciales"
                                : "Recomendados para ti"}
                    </h2>
                  </div>
                  <span className="text-xs font-black text-[color:var(--text)]">
                    {selectedFamily
                      ? `${Math.min(
                          visibleVariantCount,
                          selectedFamily.variants.length,
                        )} de ${selectedFamily.variants.length}`
                      : familyView
                        ? `${visibleFamilyGroups.length} movimientos`
                        : `${total} resultados`}
                  </span>
                </div>
                {selectedFamily ? (
                  <>
                    <div className="grid gap-0 md:grid-cols-2 md:gap-3 xl:grid-cols-3">
                      {visibleVariants.map((exercise, index) => (
                        <ExerciseCard
                          key={exercise.id}
                          exercise={exercise}
                          isEssential={index === 0}
                          isRecent={recentExerciseIds.includes(
                            String(exercise.id),
                          )}
                          onView={openDetail}
                        />
                      ))}
                    </div>
                    {hasMoreVariants ? (
                      <div className="flex flex-col items-center gap-2 pt-1">
                        <p className="text-xs font-semibold text-[color:var(--text-muted)]">
                          Mostrando primero las variantes más simples y comunes.
                        </p>
                        <Button
                          variant="outline"
                          className="h-10 px-6"
                          onClick={() =>
                            setVisibleVariantCount((current) => current + 8)
                          }
                        >
                          Mostrar 8 más
                        </Button>
                      </div>
                    ) : null}
                  </>
                ) : familyView && visibleFamilyGroups.length ? (
                  <>
                    <div className="grid gap-0 md:grid-cols-2 md:gap-3">
                      {visibleFamilyGroups.map((family) => (
                        <ExerciseCard
                          key={family.id}
                          exercise={family.primary}
                          displayName={
                            showDiscoveryHome || family.variants.length > 1
                              ? family.name
                              : family.primary.name
                          }
                          isEssential={family.isEssential}
                          isRecent={family.isRecent}
                          featured={showDiscoveryHome}
                          variantCount={family.variants.length}
                          onShowVariants={
                            family.variants.length > 1
                              ? () => {
                                  setSelectedFamilyId(family.id);
                                  setVisibleVariantCount(8);
                                  setFiltersOpen(false);
                                }
                              : undefined
                          }
                          onView={openDetail}
                        />
                      ))}
                    </div>
                    {showDiscoveryHome ? (
                      <div className="space-y-3 pt-3">
                        <div className="flex items-center justify-between gap-3 px-1">
                          <h2 className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                            Explora por zona
                          </h2>
                          <button
                            type="button"
                            onClick={() => setViewMode("complete")}
                            className="text-xs font-black uppercase text-[#352018] dark:text-[#e2ff00]"
                          >
                            Ver catálogo
                          </button>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          {entryPoints.slice(0, 4).map((entry) => (
                            <ScopeCard
                              key={entry.id}
                              label={entry.label}
                              count={entry.count}
                              onClick={() => selectEntryPoint(entry)}
                            />
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : familyView ? (
                  <section className="rounded-lg border border-dashed border-[color:var(--border)] bg-[color:var(--card)] p-8 text-center">
                    <Clock3 className="mx-auto h-9 w-9 text-[color:var(--text-muted)]" />
                    <h3 className="mt-3 text-base font-black text-[color:var(--text)]">
                      Aún no hay ejercicios recientes
                    </h3>
                    <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                      Abre una ficha y aparecerá aquí para volver a encontrarla
                      rápido.
                    </p>
                  </section>
                ) : (
                  <>
                    <div className="grid gap-0 md:grid-cols-2 md:gap-3 xl:grid-cols-3">
                      {exercises.map((exercise) => (
                        <ExerciseCard
                          key={exercise.id}
                          exercise={exercise}
                          isRecent={recentExerciseIds.includes(
                            String(exercise.id),
                          )}
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
                  </>
                )}
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
