import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { API_URL } from "../services/axiosConfig";
import { useAuth } from "./AuthContext";
import { useDashboardBootstrap } from "./DashboardBootstrapContext";
import {
  getExerciseBodyRegion,
  getExerciseCategories,
  getExerciseEquipment,
  getExerciseGoals,
  getExerciseLaterality,
  getExerciseMovementPatterns,
  getExerciseNavigationRegion,
  getExerciseType,
  getPrimaryMuscleGroup,
} from "../constants/exerciseTaxonomy";
import {
  TRAINING_LIST_CACHE_VERSION,
  TRAINING_LIST_FIELDS,
  TRAINING_SUMMARY_CACHE_VERSION,
  TRAINING_SUMMARY_FIELDS,
} from "../utils/trainingListFields";

const TrainingContext = createContext(null);

const initialGoals = {};
const DEFAULT_BRANCH = "sopocachi";
const BRANCH_OPTIONS = ["sopocachi", "miraflores"];
const normalizeBranch = (value) =>
  value === "miraflores" || value === "sopocachi" ? value : DEFAULT_BRANCH;
const normalizeLocationMode = (value) =>
  ["single", "multiple", "disabled"].includes(value) ? value : "single";
const normalizeAllowedBranches = (value, mode, branch) => {
  if (mode === "disabled") return [];
  if (mode === "single") return [normalizeBranch(branch)];
  const allowed = Array.from(
    new Set(
      (Array.isArray(value) ? value : []).filter((item) =>
        BRANCH_OPTIONS.includes(item),
      ),
    ),
  );
  return allowed.length >= 2 ? allowed : [...BRANCH_OPTIONS];
};

const slugify = (text) =>
  text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const EXERCISE_FIELDS =
  "name,localizedNames,nameSpanish,nameEnglish,slug,aliases,category,categories,bodyRegion,navigationRegion,primaryMuscleGroup,muscle,primaryMuscle,primaryMuscles,secondaryMuscles,stabilizerMuscles,movementPattern,movementPatterns,equipment,loadType,weightConfig,exerciseType,laterality,difficulty,goals,tags,branches,type,ownerId,image,imagePublicId,media.image,media.thumbnail,thumb,supportsUnilateral,movementMode,isActive,updatedAt";

const normalizeExercise = (exercise) => {
  const primaryMuscleGroup = getPrimaryMuscleGroup(exercise);
  const normalized = {
    ...exercise,
    primaryMuscleGroup,
  };
  const categories = getExerciseCategories(normalized);
  const movementPatterns = getExerciseMovementPatterns(normalized);
  const equipment = getExerciseEquipment(normalized);
  const goals = getExerciseGoals(normalized);

  return {
    ...normalized,
    id: exercise._id || exercise.id,
    category: exercise.category || categories[0] || "",
    categories,
    bodyRegion: getExerciseBodyRegion(normalized),
    navigationRegion: getExerciseNavigationRegion(normalized),
    muscle: primaryMuscleGroup,
    primaryMuscle: primaryMuscleGroup,
    movementPattern: exercise.movementPattern || movementPatterns[0] || "",
    movementPatterns,
    equipment,
    exerciseType: getExerciseType(normalized),
    laterality: getExerciseLaterality(normalized),
    goals,
    image: exercise.media?.image?.url || exercise.image || "",
    imagePublicId:
      exercise.media?.image?.publicId || exercise.imagePublicId || "",
    branches: exercise.branches?.length ? exercise.branches : ["general"],
  };
};

const normalizeSession = (session) => ({
  ...session,
  id: session._id || session.id,
});

const normalizePhoto = (photo) => ({
  ...photo,
  id: photo._id || photo.id,
  url: photo.contentUrl ? `${API_URL}${photo.contentUrl}` : photo.url || "",
});

const normalizeTraining = (training) => ({
  ...training,
  id: training._id || training.id,
});

const mergeTrainingDetailWindow = (summaries = [], details = []) => {
  if (!details.length) return summaries;
  const detailById = new Map(
    details.map((training) => [String(training.id || training._id), training]),
  );
  const merged = summaries.map((summary) => {
    const detail = detailById.get(String(summary.id || summary._id));
    if (!detail) return summary;
    detailById.delete(String(summary.id || summary._id));
    return { ...summary, ...detail };
  });
  return [...merged, ...detailById.values()];
};

const localDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const EXERCISES_KEY = ["exercises", "taxonomy-v5", "all-active"];
const SESSIONS_KEY = ["sessions"];
const PREFS_KEY = ["preferences"];

export function TrainingProvider({
  children,
  ownerId = "",
  enabled = true,
  loadExercises = true,
  loadPhotos = true,
  loadSessions = true,
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const dashboardBootstrap = useDashboardBootstrap();
  const useBootstrap = enabled && dashboardBootstrap.enabled;
  const requesterId = String(user?.id || user?._id || "anonymous");
  const dataScopeId = String(ownerId || requesterId);
  const trainingsKey = useMemo(
    () => ["trainings", TRAINING_LIST_CACHE_VERSION, 45, dataScopeId],
    [dataScopeId],
  );
  const trainingSummariesKey = useMemo(
    () => ["trainings", TRAINING_SUMMARY_CACHE_VERSION, 120, dataScopeId],
    [dataScopeId],
  );
  const exercisesKey = useMemo(
    () => [
      ...EXERCISES_KEY,
      dataScopeId,
      user?.profile?.language === "en" ? "en" : "es",
    ],
    [dataScopeId, user?.profile?.language],
  );
  const photosKey = useMemo(() => ["photos", dataScopeId], [dataScopeId]);
  const sessionsKey = useMemo(
    () => [...SESSIONS_KEY, dataScopeId],
    [dataScopeId],
  );
  const prefsKey = useMemo(() => [...PREFS_KEY, requesterId], [requesterId]);
  const [branch, setBranchState] = useState(DEFAULT_BRANCH);
  const [locationMode, setLocationMode] = useState("single");
  const [allowedBranches, setAllowedBranches] = useState([DEFAULT_BRANCH]);
  const [goals, setGoals] = useState(initialGoals);

  const exercisesQuery = useQuery({
    queryKey: exercisesKey,
    queryFn: async () => {
      const list = await api.getVersionedExerciseCatalog({
        fields: EXERCISE_FIELDS,
        ownerId: ownerId || undefined,
        language: user?.profile?.language || "es",
      });
      return list.map(normalizeExercise);
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: enabled && loadExercises,
  });

  const sessionsQuery = useQuery({
    queryKey: sessionsKey,
    queryFn: async () => {
      const list = await api.getSessions({ athleteId: ownerId, limit: 500 });
      return (list || []).map(normalizeSession);
    },
    staleTime: 2 * 60 * 1000,
    enabled: enabled && loadSessions,
  });

  const photosQuery = useQuery({
    queryKey: photosKey,
    queryFn: async () => {
      const list = await api.getPhotos({
        athleteId: ownerId,
        includeProfile: true,
        limit: 100,
      });
      return (list || []).map(normalizePhoto);
    },
    staleTime: 5 * 60 * 1000,
    enabled: enabled && loadPhotos,
  });

  const trainingSummariesQuery = useQuery({
    queryKey: trainingSummariesKey,
    queryFn: async () => {
      const trResp = await api.getTrainings({
        limit: 120,
        athleteId: ownerId,
        fields: TRAINING_SUMMARY_FIELDS,
      });
      const list = Array.isArray(trResp) ? trResp : trResp?.items || [];
      return list.map(normalizeTraining);
    },
    staleTime: 60 * 1000,
    retry: (failureCount, requestError) =>
      requestError?.status !== 401 && failureCount < 2,
    enabled: enabled && !useBootstrap,
  });

  const trainingsQuery = useQuery({
    queryKey: trainingsKey,
    queryFn: async () => {
      const trResp = await api.getTrainings({
        limit: 45,
        athleteId: ownerId,
        fields: TRAINING_LIST_FIELDS,
      });
      const list = Array.isArray(trResp) ? trResp : trResp?.items || [];
      return list.map(normalizeTraining);
    },
    staleTime: 60 * 1000,
    retry: (failureCount, requestError) =>
      requestError?.status !== 401 && failureCount < 2,
    enabled: enabled && !useBootstrap && trainingSummariesQuery.isSuccess,
  });

  const prefsQuery = useQuery({
    queryKey: prefsKey,
    queryFn: async () => api.getPreference(),
    staleTime: 5 * 60 * 1000,
    enabled: enabled && !useBootstrap,
  });

  const preferenceData = useBootstrap
    ? dashboardBootstrap.data?.preference
    : prefsQuery.data;
  const preferenceError = useBootstrap
    ? dashboardBootstrap.error
    : prefsQuery.error;

  useEffect(() => {
    if (preferenceData) {
      const nextBranch = normalizeBranch(preferenceData.branch);
      const nextMode = normalizeLocationMode(preferenceData.locationMode);
      // React Query is the external source; mirror its persisted preferences locally.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBranchState(nextBranch);
      setLocationMode(nextMode);
      setAllowedBranches(
        normalizeAllowedBranches(
          preferenceData.allowedBranches,
          nextMode,
          nextBranch,
        ),
      );
    }
    if (preferenceData?.goals) setGoals(preferenceData.goals);
    if (preferenceError) setBranchState(DEFAULT_BRANCH);
  }, [preferenceData, preferenceError]);

  const addSession = async (session) => {
    let photoUrl = session.photoUrl || "";

    if (session.photoFile) {
      const form = new FormData();
      form.append("file", session.photoFile);
      form.append(
        "date",
        session.date || new Date().toISOString().slice(0, 10),
      );
      form.append("label", session.exerciseName || "");
      form.append("type", session.photoType || "gym");
      form.append("sessionId", session.id || "");
      form.append("view", session.photoView || "front");
      if (session.routineName) form.append("routineName", session.routineName);
      if (ownerId) form.append("ownerId", ownerId);
      const uploaded = await api.uploadPhoto(form);
      const normalizedPhoto = normalizePhoto(uploaded);
      queryClient.setQueryData(photosKey, (prev = []) => [
        normalizedPhoto,
        ...prev,
      ]);
      photoUrl = normalizedPhoto.url;
    } else if (photoUrl && !session.photoPersisted) {
      const photo = await api.createPhoto({
        date: session.date,
        label: session.exerciseName,
        url: photoUrl,
        type: session.photoType || "gym",
        view: session.photoView || "front",
        routineName: session.routineName || "",
        sessionId: session.id,
        ownerId: ownerId || undefined,
      });
      const normalizedPhoto = normalizePhoto(photo);
      queryClient.setQueryData(photosKey, (prev = []) => [
        normalizedPhoto,
        ...prev,
      ]);
      photoUrl = normalizedPhoto.url;
    }

    const payload = {
      ...session,
      id: undefined,
      photoFile: undefined,
      photoPersisted: undefined,
      photoUrl,
    };
    const saved = await api.createSession(payload);
    const normalized = normalizeSession(saved);
    queryClient.setQueryData(sessionsKey, (prev = []) => [normalized, ...prev]);
  };

  const addTraining = async (training) => {
    const payload = {
      ...training,
      ownerId: ownerId || undefined,
      id: undefined,
      _id: training.id,
    };
    const saved = await api.createTraining(payload);
    const normalized = normalizeTraining(saved);
    [trainingsKey, trainingSummariesKey].forEach((queryKey) => {
      queryClient.setQueryData(queryKey, (prev = []) => [normalized, ...prev]);
    });
    queryClient.invalidateQueries({ queryKey: ["routine-training-counts"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-bootstrap"] });
    return normalized;
  };

  const updateTraining = async (id, training) => {
    const payload = { ...training, id: undefined, _id: undefined };
    const saved = await api.updateTraining(id, payload);
    const normalized = normalizeTraining(saved);
    [trainingsKey, trainingSummariesKey].forEach((queryKey) => {
      queryClient.setQueryData(queryKey, (prev = []) =>
        prev.map((t) =>
          t.id === normalized.id || t._id === normalized.id ? normalized : t,
        ),
      );
    });
    queryClient.invalidateQueries({ queryKey: ["routine-training-counts"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-bootstrap"] });
    return normalized;
  };

  const addExercise = async (exercise) => {
    const id = exercise.id || slugify(exercise.name);
    const { imageFile, ...rest } = exercise;
    const payload = {
      ...rest,
      _id: id,
      branches: rest.branches?.length ? rest.branches : ["general"],
    };
    let saved = await api.createExercise(payload);
    if (imageFile) {
      const form = new FormData();
      form.append("file", imageFile);
      form.append("kind", "main");
      saved = await api.uploadExerciseMedia(saved._id || saved.id || id, form);
    }
    const normalized = normalizeExercise({
      ...saved,
      id: saved._id || saved.id || id,
      branches: saved.branches || payload.branches,
    });
    queryClient.setQueryData(exercisesKey, (prev = []) => [
      ...prev,
      normalized,
    ]);
    queryClient.invalidateQueries({ queryKey: ["exercise-library"] });
    queryClient.invalidateQueries({ queryKey: ["exercise-facets"] });
    return normalized;
  };

  const updateExerciseMeta = async (id, payload) => {
    const { imageFile, ...rest } = payload;
    const body = {
      ...rest,
      branches: rest.branches?.length ? rest.branches : ["general"],
    };
    let saved = await api.updateExercise(id, body);
    if (imageFile) {
      const form = new FormData();
      form.append("file", imageFile);
      form.append("kind", "main");
      saved = await api.uploadExerciseMedia(saved._id || saved.id || id, form);
    }
    const normalized = normalizeExercise({
      ...saved,
      id,
      branches: saved.branches || body.branches,
    });
    queryClient.setQueryData(exercisesKey, (prev = []) =>
      prev.map((ex) => (ex.id === id ? normalized : ex)),
    );
    queryClient.invalidateQueries({ queryKey: ["exercise-library"] });
    queryClient.invalidateQueries({ queryKey: ["exercise-facets"] });
    return normalized;
  };

  const deleteExercise = async (id) => {
    await api.deleteExercise(id);
    queryClient.setQueryData(exercisesKey, (prev = []) =>
      prev.filter((ex) => ex.id !== id),
    );
    queryClient.invalidateQueries({ queryKey: ["exercise-library"] });
    queryClient.invalidateQueries({ queryKey: ["exercise-facets"] });
  };

  const updatePreferences = useMutation({
    mutationFn: (payload) => api.setPreference(payload),
    onSuccess: (saved) => {
      queryClient.setQueryData(prefsKey, saved);
      if (saved?.branch) {
        const nextBranch = normalizeBranch(saved.branch);
        const nextMode = normalizeLocationMode(saved.locationMode);
        setBranchState(nextBranch);
        setLocationMode(nextMode);
        setAllowedBranches(
          normalizeAllowedBranches(saved.allowedBranches, nextMode, nextBranch),
        );
      }
      if (saved?.goals) setGoals(saved.goals);
    },
  });

  const setBranch = async (value) => {
    const saved = await updatePreferences.mutateAsync({
      branch: normalizeBranch(value),
      goals,
    });
    return saved;
  };

  const saveLocationPreferences = async (nextPreferences) => {
    const nextMode = normalizeLocationMode(nextPreferences?.locationMode);
    const nextBranch = normalizeBranch(nextPreferences?.branch || branch);
    const nextAllowed = normalizeAllowedBranches(
      nextPreferences?.allowedBranches,
      nextMode,
      nextBranch,
    );
    return updatePreferences.mutateAsync({
      locationMode: nextMode,
      branch: nextBranch,
      allowedBranches: nextAllowed,
    });
  };

  const saveGoals = async (nextGoals) => {
    const saved = await updatePreferences.mutateAsync({
      goals: nextGoals,
      branch,
    });
    setGoals(saved?.goals || nextGoals);
    queryClient.invalidateQueries({ queryKey: prefsKey });
    queryClient.invalidateQueries({
      predicate: (q) =>
        Array.isArray(q.queryKey) && q.queryKey[0] === "dashboardSummary",
    });
    return saved;
  };

  const addPhoto = async (photo) => {
    if (photo?.file) {
      const form = new FormData();
      form.append("file", photo.file);
      form.append("date", photo.date || localDateString());
      if (photo.label) form.append("label", photo.label);
      if (photo.type) form.append("type", photo.type);
      if (photo.view) form.append("view", photo.view);
      if (photo.sessionId) form.append("sessionId", photo.sessionId);
      if (photo.routineName) form.append("routineName", photo.routineName);
      if (ownerId) form.append("ownerId", ownerId);
      const uploaded = await api.uploadPhoto(form);
      const normalized = normalizePhoto(uploaded);
      queryClient.setQueryData(photosKey, (prev = []) => [normalized, ...prev]);
      queryClient.invalidateQueries({ queryKey: ["photo-library"] });
      queryClient.invalidateQueries({ queryKey: ["photo-summary"] });
      return normalized;
    }
    const payload = {
      ...photo,
      ownerId: photo.ownerId || ownerId || undefined,
      id: undefined,
      file: undefined,
    };
    const saved = await api.createPhoto(payload);
    const normalized = normalizePhoto(saved);
    queryClient.setQueryData(photosKey, (prev = []) => [normalized, ...prev]);
    queryClient.invalidateQueries({ queryKey: ["photo-library"] });
    queryClient.invalidateQueries({ queryKey: ["photo-summary"] });
    return normalized;
  };

  const updatePhoto = async (id, payload) => {
    const saved = normalizePhoto(await api.updatePhoto(id, payload));
    queryClient.setQueryData(photosKey, (prev = []) =>
      prev.map((photo) => (photo.id === id ? saved : photo)),
    );
    queryClient.invalidateQueries({ queryKey: ["photo-library"] });
    queryClient.invalidateQueries({ queryKey: ["photo-summary"] });
    return saved;
  };

  const deletePhoto = async (id) => {
    await api.deletePhoto(id);
    queryClient.setQueryData(photosKey, (prev = []) =>
      prev.filter((p) => p.id !== id),
    );
    queryClient.invalidateQueries({ queryKey: ["photo-library"] });
    queryClient.invalidateQueries({ queryKey: ["photo-summary"] });
  };

  const setTrainings = (updater) => {
    [trainingsKey, trainingSummariesKey].forEach((queryKey) => {
      queryClient.setQueryData(queryKey, (prev = []) =>
        typeof updater === "function" ? updater(prev) : updater,
      );
    });
  };

  const setGoalsState = (nextGoals) => {
    setGoals(nextGoals);
    queryClient.setQueryData(prefsKey, (prev = {}) => ({
      ...prev,
      goals: nextGoals,
    }));
  };

  const exercises = exercisesQuery.data || [];
  const sessions = sessionsQuery.data || [];
  const photos = photosQuery.data || [];
  const trainings = useMemo(
    () =>
      mergeTrainingDetailWindow(
        useBootstrap
          ? dashboardBootstrap.data?.trainings?.summaries || []
          : trainingSummariesQuery.data || [],
        useBootstrap
          ? dashboardBootstrap.data?.trainings?.details || []
          : trainingsQuery.data || [],
      ),
    [
      dashboardBootstrap.data?.trainings?.details,
      dashboardBootstrap.data?.trainings?.summaries,
      trainingSummariesQuery.data,
      trainingsQuery.data,
      useBootstrap,
    ],
  );
  const loading =
    (loadExercises && exercisesQuery.isLoading) ||
    (loadSessions && sessionsQuery.isLoading) ||
    (loadPhotos && photosQuery.isLoading) ||
    (useBootstrap
      ? dashboardBootstrap.isLoading
      : trainingSummariesQuery.isLoading || prefsQuery.isLoading);
  const error =
    exercisesQuery.error?.message ||
    (loadSessions ? sessionsQuery.error?.message : null) ||
    (loadPhotos ? photosQuery.error?.message : null) ||
    (useBootstrap
      ? dashboardBootstrap.error?.message
      : trainingSummariesQuery.error?.message || prefsQuery.error?.message) ||
    null;

  const value = {
    sessions,
    exercises,
    photos,
    trainings,
    trainingsLoading: useBootstrap
      ? dashboardBootstrap.isLoading
      : trainingSummariesQuery.isLoading,
    trainingsFetching:
      (useBootstrap && dashboardBootstrap.isFetching) ||
      (!useBootstrap &&
        (trainingSummariesQuery.isFetching || trainingsQuery.isFetching)),
    trainingsError:
      (useBootstrap
        ? dashboardBootstrap.error?.message
        : trainingSummariesQuery.error?.message ||
          trainingsQuery.error?.message) || null,
    reloadTrainings: () =>
      useBootstrap
        ? dashboardBootstrap.refetch()
        : Promise.all([
            trainingSummariesQuery.refetch(),
            trainingsQuery.refetch(),
          ]),
    loading,
    error,
    branch,
    locationMode,
    allowedBranches,
    dataOwnerId: ownerId,
    preferencesLoading: useBootstrap
      ? dashboardBootstrap.isLoading
      : prefsQuery.isLoading,
    dashboardBootstrap: dashboardBootstrap.data,
    goals,
    addSession,
    addTraining,
    updateTraining,
    addExercise,
    updateExerciseMeta,
    deleteExercise,
    addPhoto,
    updatePhoto,
    deletePhoto,
    setBranch,
    saveLocationPreferences,
    saveGoals,
    setTrainings,
    setGoals: setGoalsState,
  };

  return (
    <TrainingContext.Provider value={value}>
      {children}
    </TrainingContext.Provider>
  );
}

// This colocated hook is the public API of the provider.
// eslint-disable-next-line react-refresh/only-export-components
export function useTrainingData() {
  const ctx = useContext(TrainingContext);
  if (!ctx)
    throw new Error("useTrainingData must be used within TrainingProvider");
  return ctx;
}
