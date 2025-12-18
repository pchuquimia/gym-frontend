// Para desarrollo local apuntamos al backend local por defecto.
// En producción, define VITE_API_URL en el entorno del build.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(msg || 'API error')
  }
  return res.json()
}

export const api = {
  getExercises: (params = {}) => {
    const query = new URLSearchParams({
      limit: params.limit ?? 100,
      fields: params.fields ?? 'name,muscle,branches,type,thumb,updatedAt,createdAt',
      page: params.page ?? 1,
      meta: params.meta ?? false,
    }).toString()
    return request(`/api/exercises?${query}`)
  },
  getExercise: (id) => request(`/api/exercises/${id}`),
  createExercise: (payload) => request('/api/exercises', { method: 'POST', body: JSON.stringify(payload) }),
  updateExercise: (id, payload) => request(`/api/exercises/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteExercise: (id) => request(`/api/exercises/${id}`, { method: 'DELETE' }),

  getRoutines: () => request('/api/routines'),
  createRoutine: (payload) => request('/api/routines', { method: 'POST', body: JSON.stringify(payload) }),
  updateRoutine: (id, payload) => request(`/api/routines/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteRoutine: (id) => request(`/api/routines/${id}`, { method: 'DELETE' }),
  getPreference: (userId) => request(`/api/preferences${userId ? `?userId=${userId}` : ''}`),
  setPreference: (payload) => request('/api/preferences', { method: 'POST', body: JSON.stringify(payload) }),

  getSessions: () => request('/api/sessions'),
  createSession: (payload) => request('/api/sessions', { method: 'POST', body: JSON.stringify(payload) }),
  deleteSession: (id) => request(`/api/sessions/${id}`, { method: 'DELETE' }),

  getTrainings: (params = {}) => {
    const query = new URLSearchParams({
      page: params.page ?? 1,
      limit: params.limit ?? 120,
      fields:
        params.fields ??
        'date,routineId,routineName,durationSeconds,totalVolume,exercises.exerciseId,exercises.exerciseName,exercises.muscleGroup,exercises.sets',
      from: params.from ?? '',
      to: params.to ?? '',
      routineId: params.routineId ?? '',
      meta: params.meta ?? false,
    }).toString()
    return request(`/api/trainings?${query}`)
  },
  getTraining: (id) => request(`/api/trainings/${id}`),
  updateTraining: (id, payload) => request(`/api/trainings/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  createTraining: (payload) => request('/api/trainings', { method: 'POST', body: JSON.stringify(payload) }),
  deleteTraining: (id) => request(`/api/trainings/${id}`, { method: 'DELETE' }),

  getPhotos: (type) => request(`/api/photos${type ? `?type=${type}` : ''}`),
  createPhoto: (payload) => request('/api/photos', { method: 'POST', body: JSON.stringify(payload) }),
  updatePhoto: (id, payload) => request(`/api/photos/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deletePhoto: (id) => request(`/api/photos/${id}`, { method: 'DELETE' }),
  uploadPhoto: async (formData) => {
    const res = await fetch(`${API_URL}/api/photos/upload`, { method: 'POST', body: formData })
    if (!res.ok) {
      const msg = await res.text()
      throw new Error(msg || 'API error')
    }
    return res.json()
  },
}
