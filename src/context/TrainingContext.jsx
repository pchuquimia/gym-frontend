import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

const TrainingContext = createContext(null)

const initialGoals = {}

const slugify = (text) =>
  text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')

const normalizeExercise = (exercise) => ({
  ...exercise,
  id: exercise._id || exercise.id,
  branches: exercise.branches?.length ? exercise.branches : ['general'],
})

const normalizeSession = (session) => ({
  ...session,
  id: session._id || session.id,
})

const normalizePhoto = (photo) => ({
  ...photo,
  id: photo._id || photo.id,
})

const normalizeTraining = (training) => ({
  ...training,
  id: training._id || training.id,
})

const EXERCISES_KEY = ['exercises']
const SESSIONS_KEY = ['sessions']
const PHOTOS_KEY = ['photos']
const TRAININGS_KEY = ['trainings', 120]
const PREFS_KEY = ['preferences']

export function TrainingProvider({ children }) {
  const queryClient = useQueryClient()
  const [branch, setBranchState] = useState('general')
  const [goals, setGoals] = useState(initialGoals)

  const exercisesQuery = useQuery({
    queryKey: EXERCISES_KEY,
    queryFn: async () => {
      const exsResponse = await api.getExercises({
        fields: 'name,muscle,branches,type,image,imagePublicId,thumb,updatedAt,createdAt',
        limit: 200,
      })
      const list = Array.isArray(exsResponse) ? exsResponse : exsResponse?.items || []
      return list.map(normalizeExercise)
    },
    staleTime: 5 * 60 * 1000,
  })

  const sessionsQuery = useQuery({
    queryKey: SESSIONS_KEY,
    queryFn: async () => {
      const list = await api.getSessions()
      return (list || []).map(normalizeSession)
    },
    staleTime: 2 * 60 * 1000,
  })

  const photosQuery = useQuery({
    queryKey: PHOTOS_KEY,
    queryFn: async () => {
      const list = await api.getPhotos()
      return (list || []).map(normalizePhoto)
    },
    staleTime: 5 * 60 * 1000,
  })

  const trainingsQuery = useQuery({
    queryKey: TRAININGS_KEY,
    queryFn: async () => {
      const trResp = await api.getTrainings({ limit: 120 })
      const list = Array.isArray(trResp) ? trResp : trResp?.items || []
      return list.map(normalizeTraining)
    },
    staleTime: 60 * 1000,
  })

  const prefsQuery = useQuery({
    queryKey: PREFS_KEY,
    queryFn: async () => api.getPreference(),
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (prefsQuery.data?.branch) setBranchState(prefsQuery.data.branch)
    if (prefsQuery.data?.goals) setGoals(prefsQuery.data.goals)
    if (prefsQuery.error) setBranchState('general')
  }, [prefsQuery.data, prefsQuery.error])

  const addSession = async (session) => {
    let photoUrl = session.photoUrl || ''

    if (session.photoFile) {
      const form = new FormData()
      form.append('file', session.photoFile)
      form.append('date', session.date || new Date().toISOString().slice(0, 10))
      form.append('label', session.exerciseName || '')
      form.append('type', session.photoType || 'gym')
      form.append('sessionId', session.id || '')
      const uploaded = await api.uploadPhoto(form)
      const normalizedPhoto = normalizePhoto(uploaded)
      queryClient.setQueryData(PHOTOS_KEY, (prev = []) => [normalizedPhoto, ...prev])
      photoUrl = normalizedPhoto.url
    } else if (photoUrl && !session.photoPersisted) {
      const photo = await api.createPhoto({
        date: session.date,
        label: session.exerciseName,
        url: photoUrl,
        type: session.photoType || 'gym',
        sessionId: session.id,
      })
      const normalizedPhoto = normalizePhoto(photo)
      queryClient.setQueryData(PHOTOS_KEY, (prev = []) => [normalizedPhoto, ...prev])
      photoUrl = normalizedPhoto.url
    }

    const payload = { ...session, id: undefined, photoFile: undefined, photoPersisted: undefined, photoUrl }
    const saved = await api.createSession(payload)
    const normalized = normalizeSession(saved)
    queryClient.setQueryData(SESSIONS_KEY, (prev = []) => [normalized, ...prev])
  }

  const addTraining = async (training) => {
    const payload = { ...training, id: undefined, _id: training.id }
    const saved = await api.createTraining(payload)
    const normalized = normalizeTraining(saved)
    queryClient.setQueryData(TRAININGS_KEY, (prev = []) => [normalized, ...prev])
    return normalized
  }

  const updateTraining = async (id, training) => {
    const payload = { ...training, id: undefined, _id: undefined }
    const saved = await api.updateTraining(id, payload)
    const normalized = normalizeTraining(saved)
    queryClient.setQueryData(TRAININGS_KEY, (prev = []) =>
      prev.map((t) => (t.id === normalized.id || t._id === normalized.id ? normalized : t)),
    )
    return normalized
  }

  const addExercise = async (exercise) => {
    const id = exercise.id || slugify(exercise.name)
    const payload = { ...exercise, _id: id, branches: exercise.branches?.length ? exercise.branches : ['general'] }
    const saved = await api.createExercise(payload)
    const normalized = normalizeExercise({ ...saved, id, branches: saved.branches || payload.branches })
    queryClient.setQueryData(EXERCISES_KEY, (prev = []) => [...prev, normalized])
  }

  const updateExerciseMeta = async (id, payload) => {
    const body = { ...payload, branches: payload.branches?.length ? payload.branches : ['general'] }
    const saved = await api.updateExercise(id, body)
    const normalized = normalizeExercise({ ...saved, id, branches: saved.branches || body.branches })
    queryClient.setQueryData(EXERCISES_KEY, (prev = []) => prev.map((ex) => (ex.id === id ? normalized : ex)))
  }

  const deleteExercise = async (id) => {
    await api.deleteExercise(id)
    queryClient.setQueryData(EXERCISES_KEY, (prev = []) => prev.filter((ex) => ex.id !== id))
  }

  const updatePreferences = useMutation({
    mutationFn: (payload) => api.setPreference(payload),
    onSuccess: (saved) => {
      queryClient.setQueryData(PREFS_KEY, saved)
      if (saved?.branch) setBranchState(saved.branch)
      if (saved?.goals) setGoals(saved.goals)
    },
  })

  const setBranch = async (value) => {
    const saved = await updatePreferences.mutateAsync({ branch: value, goals })
    return saved
  }

  const saveGoals = async (nextGoals) => {
    const saved = await updatePreferences.mutateAsync({ goals: nextGoals, branch })
    setGoals(saved?.goals || nextGoals)
    return saved
  }

  const addPhoto = async (photo) => {
    if (photo?.file) {
      const form = new FormData()
      form.append('file', photo.file)
      form.append('date', photo.date || new Date().toISOString().slice(0, 10))
      if (photo.label) form.append('label', photo.label)
      if (photo.type) form.append('type', photo.type)
      if (photo.sessionId) form.append('sessionId', photo.sessionId)
      const uploaded = await api.uploadPhoto(form)
      const normalized = normalizePhoto(uploaded)
      queryClient.setQueryData(PHOTOS_KEY, (prev = []) => [normalized, ...prev])
      return normalized
    }
    const payload = { ...photo, id: undefined, file: undefined }
    const saved = await api.createPhoto(payload)
    const normalized = normalizePhoto(saved)
    queryClient.setQueryData(PHOTOS_KEY, (prev = []) => [normalized, ...prev])
    return normalized
  }

  const deletePhoto = async (id) => {
    await api.deletePhoto(id)
    queryClient.setQueryData(PHOTOS_KEY, (prev = []) => prev.filter((p) => p.id !== id))
  }

  const setTrainings = (updater) => {
    queryClient.setQueryData(TRAININGS_KEY, (prev = []) =>
      typeof updater === 'function' ? updater(prev) : updater,
    )
  }

  const setGoalsState = (nextGoals) => {
    setGoals(nextGoals)
    queryClient.setQueryData(PREFS_KEY, (prev = {}) => ({ ...prev, goals: nextGoals }))
  }

  const exercises = exercisesQuery.data || []
  const sessions = sessionsQuery.data || []
  const photos = photosQuery.data || []
  const trainings = trainingsQuery.data || []
  const loading =
    exercisesQuery.isLoading ||
    sessionsQuery.isLoading ||
    photosQuery.isLoading ||
    trainingsQuery.isLoading ||
    prefsQuery.isLoading
  const error =
    exercisesQuery.error?.message ||
    sessionsQuery.error?.message ||
    photosQuery.error?.message ||
    trainingsQuery.error?.message ||
    prefsQuery.error?.message ||
    null

  const value = useMemo(
    () => ({
      sessions,
      exercises,
      photos,
      trainings,
      loading,
      error,
      branch,
      goals,
      addSession,
      addTraining,
      updateTraining,
      addExercise,
      updateExerciseMeta,
      deleteExercise,
      addPhoto,
      deletePhoto,
      setBranch,
      saveGoals,
      setTrainings,
      setGoals: setGoalsState,
    }),
    [sessions, exercises, photos, trainings, loading, error, branch, goals],
  )

  return <TrainingContext.Provider value={value}>{children}</TrainingContext.Provider>
}

export function useTrainingData() {
  const ctx = useContext(TrainingContext)
  if (!ctx) throw new Error('useTrainingData must be used within TrainingProvider')
  return ctx
}
