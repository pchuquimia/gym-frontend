import { API_URL, axiosClient } from "./axiosConfig";

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
  logout: () => request("/api/auth/logout", { method: "POST" }),
  me: () => request("/api/auth/me"),

  getUsers: () => request("/api/users"),
  updateUser: (id, payload) =>
    request(`/api/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  getAssignedClients: () => request("/api/users/clients"),

  getExercises: (params = {}) => {
    const query = new URLSearchParams({
      limit: params.limit ?? 100,
      fields:
        params.fields ??
        "name,slug,muscle,primaryMuscle,secondaryMuscles,equipment,branches,tags,type,ownerId,image,imagePublicId,media,thumb,supportsUnilateral,movementMode,isActive,updatedAt,createdAt",
      page: params.page ?? 1,
      meta: params.meta ?? false,
      q: params.q ?? "",
      branch: params.branch ?? "",
      muscle: params.muscle ?? "",
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
        "date,routineId,routineName,branch,durationSeconds,timeEvents,exerciseDurations,totalVolume,exercises.exerciseId,exercises.exerciseName,exercises.muscleGroup,exercises.order,exercises.plannedOrder,exercises.actualOrder,exercises.orderContext,exercises.movementMode,exercises.sets",
      from: params.from ?? "",
      to: params.to ?? "",
      routineId: params.routineId ?? "",
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
