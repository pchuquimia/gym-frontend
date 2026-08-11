import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { API_URL } from "../services/axiosConfig";
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
  "name,localizedNames,nameSpanish,nameEnglish,slug,aliases,category,categories,bodyRegion,navigationRegion,primaryMuscleGroup,muscle,primaryMuscle,primaryMuscles,secondaryMuscles,stabilizerMuscles,movementPattern,movementPatterns,equipment,loadType,exerciseType,laterality,difficulty,goals,tags,branches,type,ownerId,image,imagePublicId,media.image,media.thumbnail,thumb,supportsUnilateral,movementMode,isActive,updatedAt";

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
  loadExercises = true,
  loadPhotos = true,
}) {
  const queryClient = useQueryClient();
  const trainingsKey = useMemo(
    () => ["trainings", 120, ownerId || "self"],
    [ownerId],
  );
  const exercisesKey = useMemo(
    () => [...EXERCISES_KEY, ownerId || "self"],
    [ownerId],
  );
  const photosKey = useMemo(() => ["photos", ownerId || "self"], [ownerId]);
  const [branch, setBranchState] = useState(DEFAULT_BRANCH);
  const [locationMode, setLocationMode] = useState("single");
  const [allowedBranches, setAllowedBranches] = useState([DEFAULT_BRANCH]);
  const [goals, setGoals] = useState(initialGoals);

  const exercisesQuery = useQuery({
    queryKey: exercisesKey,
    queryFn: async () => {
      const firstPage = await api.getExercises({
        fields: EXERCISE_FIELDS,
        limit: 500,
        page: 1,
        meta: true,
        ownerId: ownerId || undefined,
      });
      if (Array.isArray(firstPage)) return firstPage.map(normalizeExercise);
      const list = [...(firstPage?.items || [])];
      const totalPages = Math.ceil((firstPage?.total || list.length) / 500);
      if (totalPages > 1) {
        const remainingPages = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, index) =>
            api.getExercises({
              fields: EXERCISE_FIELDS,
              limit: 500,
              page: index + 2,
              meta: true,
              ownerId: ownerId || undefined,
            }),
          ),
        );
        remainingPages.forEach((response) => {
          list.push(...(response?.items || []));
        });
      }
      return list.map(normalizeExercise);
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
    enabled: loadExercises,
  });

  const sessionsQuery = useQuery({
    queryKey: SESSIONS_KEY,
    queryFn: async () => {
      const list = await api.getSessions();
      return (list || []).map(normalizeSession);
    },
    staleTime: 2 * 60 * 1000,
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
    enabled: loadPhotos,
  });

  const trainingsQuery = useQuery({
    queryKey: trainingsKey,
    queryFn: async () => {
      const trResp = await api.getTrainings({
        limit: 120,
        athleteId: ownerId,
      });
      const list = Array.isArray(trResp) ? trResp : trResp?.items || [];
      return list.map(normalizeTraining);
    },
    staleTime: 60 * 1000,
  });

  const prefsQuery = useQuery({
    queryKey: PREFS_KEY,
    queryFn: async () => api.getPreference(),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (prefsQuery.data) {
      const nextBranch = normalizeBranch(prefsQuery.data.branch);
      const nextMode = normalizeLocationMode(prefsQuery.data.locationMode);
      // React Query is the external source; mirror its persisted preferences locally.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBranchState(nextBranch);
      setLocationMode(nextMode);
      setAllowedBranches(
        normalizeAllowedBranches(
          prefsQuery.data.allowedBranches,
          nextMode,
          nextBranch,
        ),
      );
    }
    if (prefsQuery.data?.goals) setGoals(prefsQuery.data.goals);
    if (prefsQuery.error) setBranchState(DEFAULT_BRANCH);
  }, [prefsQuery.data, prefsQuery.error]);

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
    queryClient.setQueryData(SESSIONS_KEY, (prev = []) => [
      normalized,
      ...prev,
    ]);
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
    queryClient.setQueryData(trainingsKey, (prev = []) => [
      normalized,
      ...prev,
    ]);
    queryClient.invalidateQueries({ queryKey: ["routine-training-counts"] });
    return normalized;
  };

  const updateTraining = async (id, training) => {
    const payload = { ...training, id: undefined, _id: undefined };
    const saved = await api.updateTraining(id, payload);
    const normalized = normalizeTraining(saved);
    queryClient.setQueryData(trainingsKey, (prev = []) =>
      prev.map((t) =>
        t.id === normalized.id || t._id === normalized.id ? normalized : t,
      ),
    );
    queryClient.invalidateQueries({ queryKey: ["routine-training-counts"] });
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
      queryClient.setQueryData(PREFS_KEY, saved);
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
    queryClient.invalidateQueries({ queryKey: PREFS_KEY });
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
    queryClient.setQueryData(trainingsKey, (prev = []) =>
      typeof updater === "function" ? updater(prev) : updater,
    );
  };

  const setGoalsState = (nextGoals) => {
    setGoals(nextGoals);
    queryClient.setQueryData(PREFS_KEY, (prev = {}) => ({
      ...prev,
      goals: nextGoals,
    }));
  };

  const exercises = exercisesQuery.data || [];
  const sessions = sessionsQuery.data || [];
  const photos = photosQuery.data || [];
  const trainings = trainingsQuery.data || [];
  const loading =
    (loadExercises && exercisesQuery.isLoading) ||
    sessionsQuery.isLoading ||
    (loadPhotos && photosQuery.isLoading) ||
    trainingsQuery.isLoading ||
    prefsQuery.isLoading;
  const error =
    exercisesQuery.error?.message ||
    sessionsQuery.error?.message ||
    photosQuery.error?.message ||
    trainingsQuery.error?.message ||
    prefsQuery.error?.message ||
    null;

  const value = {
    sessions,
    exercises,
    photos,
    trainings,
    loading,
    error,
    branch,
    locationMode,
    allowedBranches,
    dataOwnerId: ownerId,
    preferencesLoading: prefsQuery.isLoading,
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
