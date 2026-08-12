import { API_URL, axiosClient } from "./axiosConfig";

const EXERCISE_FIELDS =
  "name,localizedNames,nameEnglish,nameSpanish,slug,aliases,category,categories,bodyRegion,navigationRegion,primaryMuscleGroup,muscle,primaryMuscle,primaryMuscles,secondaryMuscles,stabilizerMuscles,movementPattern,movementPatterns,equipment,loadType,weightConfig,exerciseType,laterality,kineticChain,executionType,stability,position,difficulty,goals,mechanics,force,precautions,description,instructions,commonMistakes,branches,tags,type,ownerId,image,imagePublicId,media,thumb,supportsUnilateral,movementMode,source,classificationStatus,isActive,updatedAt,createdAt";

async function request(path, options = {}) {
  const { method = "GET", body, headers, ...config } = options;
  const response = await axiosClient.request({
    url: path,
    method,
    data: body ? JSON.parse(body) : undefined,
    headers,
    timeout: config.timeout ?? (method === "GET" ? 20_000 : 45_000),
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
  getDemoStatus: () => request("/api/auth/demo/status"),
  demoLogin: (role) =>
    request("/api/auth/demo", {
      method: "POST",
      body: JSON.stringify({ role }),
      timeout: 60_000,
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
  getProfileSummary: () => request("/api/auth/profile-summary"),
  updateAccount: (payload) =>
    request("/api/auth/account", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
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
  deleteUser: (id) => request(`/api/users/${id}`, { method: "DELETE" }),
  getAssignedClients: () => request("/api/users/clients"),
  getCoachAthletes: () => request("/api/coach/athletes"),
  getCoachPlanCatalog: () => request("/api/coach/plan-catalog"),
  getCoachLinkCode: () => request("/api/coach/link-code"),
  regenerateCoachLinkCode: () =>
    request("/api/coach/link-code/regenerate", { method: "POST" }),
  getCoachRelationship: () => request("/api/coach/relationship"),
  connectCoach: (coachCode, confirmTransfer = false) =>
    request("/api/coach/relationship", {
      method: "POST",
      body: JSON.stringify({ coachCode, confirmTransfer }),
    }),
  disconnectCoach: () =>
    request("/api/coach/relationship", { method: "DELETE" }),
  releaseCoachAthlete: (athleteId) =>
    request(`/api/coach/athletes/${athleteId}/relationship`, {
      method: "DELETE",
    }),
  getCoachAthleteOverview: (athleteId) =>
    request(`/api/coach/athletes/${athleteId}/overview`),
  assignCoachRoutine: (athleteId, payload) =>
    request(`/api/coach/athletes/${athleteId}/routines`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  duplicateCoachRoutine: (athleteId, routineId, payload = {}) =>
    request(
      `/api/coach/athletes/${athleteId}/routines/${routineId}/duplicate`,
      { method: "POST", body: JSON.stringify(payload) },
    ),
  createCoachPlan: (athleteId, payload) =>
    request(`/api/coach/athletes/${athleteId}/plans`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateCoachPlanStatus: (athleteId, planId, status) =>
    request(`/api/coach/athletes/${athleteId}/plans/${planId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  updateCoachPlan: (athleteId, planId, payload) =>
    request(`/api/coach/athletes/${athleteId}/plans/${planId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteCoachPlan: (athleteId, planId) =>
    request(`/api/coach/athletes/${athleteId}/plans/${planId}`, {
      method: "DELETE",
    }),
  getTrainingPlans: (athleteId = "") =>
    request(`/api/plans${athleteId ? `?athleteId=${athleteId}` : ""}`),
  createTrainingPlan: (payload) =>
    request("/api/plans", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateTrainingPlan: (planId, payload) =>
    request(`/api/plans/${planId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  updateTrainingPlanStatus: (planId, status) =>
    request(`/api/plans/${planId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  getPlanTemplates: () => request("/api/plan-templates"),
  createPlanTemplate: (payload) =>
    request("/api/plan-templates", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updatePlanTemplate: (id, payload) =>
    request(`/api/plan-templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deletePlanTemplate: (id) =>
    request(`/api/plan-templates/${id}`, { method: "DELETE" }),
  assignRoutineToPlanSlot: (planId, slotId, routineId) =>
    request(`/api/plans/${planId}/slots/${slotId}/routine`, {
      method: "POST",
      body: JSON.stringify({ routineId }),
    }),
  advanceTrainingPlanCycle: (planId) =>
    request(`/api/plans/${planId}/cycle/advance`, { method: "POST" }),
  deleteTrainingPlan: (planId) =>
    request(`/api/plans/${planId}`, { method: "DELETE" }),

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
      excludeCategory: params.excludeCategory ?? "",
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
      ownerId: params.ownerId ?? "",
      type: params.type ?? "",
    }).toString();
    return request(`/api/exercises?${query}`);
  },
  getExerciseFacets: () => request("/api/exercises/facets"),
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
  getExerciseMigrationCandidates: () =>
    request("/api/exercises/admin/migrations"),
  migrateExerciseCatalogData: (payload) =>
    request("/api/exercises/admin/migrations", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteLegacyExercise: (id) =>
    request(`/api/exercises/admin/legacy/${id}`, { method: "DELETE" }),
  getExerciseAiImageStatus: () =>
    request("/api/exercises/admin/ai-image/status"),
  generateExerciseAiImage: (id, prompt) =>
    request(`/api/exercises/admin/${id}/ai-image`, {
      method: "POST",
      body: JSON.stringify({ prompt }),
    }),
  replaceExerciseImage: async (id, file) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await axiosClient.post(
      `/api/exercises/admin/${id}/image`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return response.data;
  },
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

  getRoutines: (params = {}) => {
    const query = new URLSearchParams({
      athleteId: params.athleteId ?? "",
      ...(params.kind ? { kind: params.kind } : {}),
    }).toString();
    return request(`/api/routines?${query}`);
  },
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

  getWeighIns: (params = {}) => {
    const query = new URLSearchParams({
      from: params.from ?? "",
      to: params.to ?? "",
      today: params.today ?? "",
      athleteId: params.athleteId ?? "",
    }).toString();
    return request(`/api/weigh-ins?${query}`);
  },
  saveWeighIn: (payload) =>
    request("/api/weigh-ins", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteWeighIn: (id) => request(`/api/weigh-ins/${id}`, { method: "DELETE" }),

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
        "date,createdAt,routineId,routineName,progressScopeId,orderSignature,branch,durationSeconds,durationOverrideSeconds,workSeconds,restSeconds,pauseSeconds,timeEvents,exerciseDurations.exerciseId,exerciseDurations.durationSeconds,exerciseDurations.durationOverrideSeconds,exerciseDurations.workSeconds,exerciseDurations.restSeconds,totalVolume,volumeBreakdown,exercises.exerciseId,exercises.exerciseName,exercises.muscleGroup,exercises.primaryMuscleGroup,exercises.primaryMuscles,exercises.secondaryMuscles,exercises.stabilizerMuscles,exercises.equipment,exercises.loadType,exercises.weightBasis,exercises.barWeightKg,exercises.implementCount,exercises.order,exercises.plannedOrder,exercises.actualOrder,exercises.orderContext,exercises.movementMode,exercises.sets",
      from: params.from ?? "",
      to: params.to ?? "",
      routineId: params.routineId ?? "",
      progressScopeId: params.progressScopeId ?? "",
      excludeProgressScopeId: params.excludeProgressScopeId ?? "",
      athleteId: params.athleteId ?? "",
      meta: params.meta ?? false,
    }).toString();
    return request(`/api/trainings?${query}`, { timeout: 45_000 });
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
      athleteId: params.athleteId ?? "",
    }).toString();
    return request(`/api/trainings/summary?${query}`);
  },
  getRoutineTrainingCounts: (athleteId = "") =>
    request(
      `/api/trainings/routine-counts${athleteId ? `?athleteId=${athleteId}` : ""}`,
    ),
  getTrainingIntelligence: (athleteId = "") =>
    request(
      `/api/analytics/intelligence${athleteId ? `?athleteId=${athleteId}` : ""}`,
    ),

  getPhotos: (params = {}) => {
    const options = typeof params === "string" ? { type: params } : params;
    const query = new URLSearchParams({
      type: options.type ?? "",
      view: options.view ?? "",
      athleteId: options.athleteId ?? "",
      includeProfile: options.includeProfile ?? false,
      page: options.page ?? 1,
      limit: options.limit ?? 50,
      meta: options.meta ?? false,
    }).toString();
    return request(`/api/photos?${query}`);
  },
  getPhotoSummary: (athleteId = "") =>
    request(`/api/photos/summary${athleteId ? `?athleteId=${athleteId}` : ""}`),
  getPhotoContent: async (contentUrl, { width, height } = {}) => {
    const response = await axiosClient.get(contentUrl, {
      params: { width, height },
      responseType: "blob",
    });
    return response.data;
  },
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
