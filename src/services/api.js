import { API_URL, axiosClient } from "./axiosConfig";

const EXERCISE_FIELDS =
  "name,slug,aliases,category,categories,bodyRegion,navigationRegion,primaryMuscleGroup,muscle,primaryMuscle,primaryMuscles,secondaryMuscles,stabilizerMuscles,movementPattern,movementPatterns,equipment,exerciseType,laterality,kineticChain,executionType,stability,position,difficulty,goals,mechanics,force,precautions,description,instructions,commonMistakes,branches,tags,type,ownerId,image,imagePublicId,media,thumb,supportsUnilateral,movementMode,isActive,updatedAt,createdAt";

async function request(path, options = {}) {
  const { method = "GET", body, headers, ...config } = options;
  const response = await axiosClient.request({
    url: path,
    method,
    data: body ? JSON.parse(body) : undefined,
    headers,
    ...config,
  });
  return response.data;
}

export const api = {
  register: (payload) =>
    request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  login: (payload) =>
    request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  forgotPassword: (payload) =>
    request("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  resetPassword: (payload) =>
    request("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  verifyEmail: (payload) =>
    request("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  devAdminLogin: () => request("/api/auth/dev-admin", { method: "POST" }),
  logout: () => request("/api/auth/logout", { method: "POST" }),
  me: () => request("/api/auth/me"),
  getProfile: () => request("/api/auth/profile"),
  updateProfile: (payload) =>
    request("/api/auth/profile", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  updateSecurity: (payload) =>
    request("/api/auth/security", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  changePassword: (payload) =>
    request("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getAuthSessions: () => request("/api/auth/sessions"),
  logoutAllSessions: () => request("/api/auth/logout-all", { method: "POST" }),

  getUsers: () => request("/api/users"),
  updateUser: (id, payload) =>
    request(`/api/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  getAssignedClients: () => request("/api/users/clients"),

  getExercises: (params = {}) => {
    const query = new URLSearchParams({
      limit: params.limit ?? 1000,
      fields: params.fields ?? EXERCISE_FIELDS,
      page: params.page ?? 1,
      meta: params.meta ?? false,
      q: params.q ?? "",
      branch: params.branch ?? "",
      muscle: params.muscle ?? "",
      category: params.category ?? "",
      bodyRegion: params.bodyRegion ?? "",
      navigationRegion: params.navigationRegion ?? "",
      primaryMuscleGroup: params.primaryMuscleGroup ?? "",
      movementPattern: params.movementPattern ?? "",
      equipment: params.equipment ?? "",
      exerciseType: params.exerciseType ?? "",
      laterality: params.laterality ?? "",
      kineticChain: params.kineticChain ?? "",
      executionType: params.executionType ?? "",
      stability: params.stability ?? "",
      position: params.position ?? "",
      difficulty: params.difficulty ?? "",
      goal: params.goal ?? "",
      type: params.type ?? "",
    }).toString();
    return request(`/api/exercises?${query}`);
  },
  getExercise: (id) => request(`/api/exercises/${id}`),
  createExercise: (payload) =>
    request("/api/exercises", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateExercise: (id, payload) =>
    request(`/api/exercises/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteExercise: (id) => request(`/api/exercises/${id}`, { method: "DELETE" }),
  uploadExerciseMedia: async (id, formData) => {
    const response = await axiosClient.post(
      `/api/exercises/${id}/media`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return response.data;
  },

  getRoutines: () => request("/api/routines"),
  createRoutine: (payload) =>
    request("/api/routines", { method: "POST", body: JSON.stringify(payload) }),
  updateRoutine: (id, payload) =>
    request(`/api/routines/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteRoutine: (id) => request(`/api/routines/${id}`, { method: "DELETE" }),
  getPreference: (userId) =>
    request(`/api/preferences${userId ? `?userId=${userId}` : ""}`),
  setPreference: (payload) =>
    request("/api/preferences", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getSessions: () => request("/api/sessions"),
  createSession: (payload) =>
    request("/api/sessions", { method: "POST", body: JSON.stringify(payload) }),
  deleteSession: (id) => request(`/api/sessions/${id}`, { method: "DELETE" }),

  getTrainings: (params = {}) => {
    const query = new URLSearchParams({
      page: params.page ?? 1,
      limit: params.limit ?? 120,
      fields:
        params.fields ??
        "date,routineId,routineName,progressScopeId,orderSignature,branch,durationSeconds,timeEvents,exerciseDurations,totalVolume,exercises.exerciseId,exercises.exerciseName,exercises.muscleGroup,exercises.order,exercises.plannedOrder,exercises.actualOrder,exercises.orderContext,exercises.movementMode,exercises.sets",
      from: params.from ?? "",
      to: params.to ?? "",
      routineId: params.routineId ?? "",
      progressScopeId: params.progressScopeId ?? "",
      excludeProgressScopeId: params.excludeProgressScopeId ?? "",
      meta: params.meta ?? false,
    }).toString();
    return request(`/api/trainings?${query}`);
  },
  getTraining: (id) => request(`/api/trainings/${id}`),
  updateTraining: (id, payload) =>
    request(`/api/trainings/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  updateTrainingDuration: (id, durationSeconds) =>
    request(`/api/trainings/${id}/duration`, {
      method: "PATCH",
      body: JSON.stringify({ durationSeconds }),
    }),
  createTraining: (payload) =>
    request("/api/trainings", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteTraining: (id) => request(`/api/trainings/${id}`, { method: "DELETE" }),
  getTrainingsSummary: (params = {}) => {
    const query = new URLSearchParams({
      from: params.from ?? "",
      to: params.to ?? "",
      routineId: params.routineId ?? "",
    }).toString();
    return request(`/api/trainings/summary?${query}`);
  },

  getPhotos: (type) => request(`/api/photos${type ? `?type=${type}` : ""}`),
  createPhoto: (payload) =>
    request("/api/photos", { method: "POST", body: JSON.stringify(payload) }),
  updatePhoto: (id, payload) =>
    request(`/api/photos/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deletePhoto: (id) => request(`/api/photos/${id}`, { method: "DELETE" }),
  uploadPhoto: async (formData) => {
    const response = await axiosClient.post(
      `${API_URL}/api/photos/upload`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return response.data;
  },
};
