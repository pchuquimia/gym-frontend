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
  getExercises: () => request('/api/exercises'),
  createExercise: (payload) => request('/api/exercises', { method: 'POST', body: JSON.stringify(payload) }),
  updateExercise: (id, payload) => request(`/api/exercises/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteExercise: (id) => request(`/api/exercises/${id}`, { method: 'DELETE' }),

  getRoutines: () => request('/api/routines'),
  createRoutine: (payload) => request('/api/routines', { method: 'POST', body: JSON.stringify(payload) }),
  updateRoutine: (id, payload) => request(`/api/routines/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteRoutine: (id) => request(`/api/routines/${id}`, { method: 'DELETE' }),

  getSessions: () => request('/api/sessions'),
  createSession: (payload) => request('/api/sessions', { method: 'POST', body: JSON.stringify(payload) }),
  deleteSession: (id) => request(`/api/sessions/${id}`, { method: 'DELETE' }),

  getTrainings: () => request('/api/trainings'),
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
