import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../services/api'

const TrainingContext = createContext(null)

const initialSessions = []
const initialExercises = []
const initialPhotos = []
const initialTrainings = []

const slugify = (text) =>
  text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')

export function TrainingProvider({ children }) {
  const [sessions, setSessions] = useState(initialSessions)
  const [exercises, setExercises] = useState(initialExercises)
  const [photos, setPhotos] = useState(initialPhotos)
  const [trainings, setTrainings] = useState(initialTrainings)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [branch, setBranchState] = useState('general')

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const [exs, sess, ph, tr] = await Promise.all([
          api.getExercises(),
          api.getSessions(),
          api.getPhotos(),
          api.getTrainings(),
        ])
        setExercises(exs.map((e) => ({ ...e, id: e._id || e.id })))
        setSessions(sess.map((s) => ({ ...s, id: s._id || s.id })))
        setPhotos(ph.map((p) => ({ ...p, id: p._id || p.id })))
        setTrainings(tr.map((t) => ({ ...t, id: t._id || t.id })))

        try {
          const pref = await api.getPreference()
          if (pref?.branch) setBranchState(pref.branch)
        } catch (prefErr) {
          console.warn('Preferencia no disponible, usando general', prefErr?.message)
          setBranchState('general')
        }
        setError(null)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

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
      const normalizedPhoto = { ...uploaded, id: uploaded._id || uploaded.id }
      setPhotos((prev) => [normalizedPhoto, ...prev])
      photoUrl = normalizedPhoto.url
    } else if (photoUrl && !session.photoPersisted) {
      const photo = await api.createPhoto({
        date: session.date,
        label: session.exerciseName,
        url: photoUrl,
        type: session.photoType || 'gym',
        sessionId: session.id,
      })
      const normalizedPhoto = { ...photo, id: photo._id || photo.id }
      setPhotos((prev) => [normalizedPhoto, ...prev])
      photoUrl = normalizedPhoto.url
    }

    const payload = { ...session, id: undefined, photoFile: undefined, photoPersisted: undefined, photoUrl }
    const saved = await api.createSession(payload)
    const normalized = { ...saved, id: saved._id || saved.id }
    setSessions((prev) => [normalized, ...prev])
  }

  const addTraining = async (training) => {
    const payload = { ...training, id: undefined, _id: training.id }
    const saved = await api.createTraining(payload)
    const normalized = { ...saved, id: saved._id || saved.id }
    setTrainings((prev) => [normalized, ...prev])
    return normalized
  }

  const addExercise = async (exercise) => {
    const id = exercise.id || slugify(exercise.name)
    const saved = await api.createExercise({ ...exercise, _id: id })
    setExercises((prev) => [...prev, { ...saved, id }])
  }

  const updateExerciseMeta = async (id, payload) => {
    const saved = await api.updateExercise(id, payload)
    setExercises((prev) => prev.map((ex) => (ex.id === id ? { ...ex, ...saved, id } : ex)))
  }

  const deleteExercise = async (id) => {
    await api.deleteExercise(id)
    setExercises((prev) => prev.filter((ex) => ex.id !== id))
  }

  const setBranch = async (value) => {
    const saved = await api.setPreference({ branch: value })
    setBranchState(saved.branch || value)
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
      const normalized = { ...uploaded, id: uploaded._id || uploaded.id }
      setPhotos((prev) => [normalized, ...prev])
      return normalized
    }
    const payload = { ...photo, id: undefined, file: undefined }
    const saved = await api.createPhoto(payload)
    const normalized = { ...saved, id: saved._id || saved.id }
    setPhotos((prev) => [normalized, ...prev])
    return normalized
  }

  const deletePhoto = async (id) => {
    await api.deletePhoto(id)
    setPhotos((prev) => prev.filter((p) => p.id !== id))
  }

  const value = useMemo(
    () => ({
      sessions,
      exercises,
      photos,
      trainings,
      loading,
      error,
      branch,
      addSession,
      addTraining,
      addExercise,
      updateExerciseMeta,
      deleteExercise,
      addPhoto,
      deletePhoto,
      setBranch,
      setTrainings,
    }),
    [sessions, exercises, photos, trainings, loading, error, branch],
  )

  return <TrainingContext.Provider value={value}>{children}</TrainingContext.Provider>
}

export function useTrainingData() {
  const ctx = useContext(TrainingContext)
  if (!ctx) throw new Error('useTrainingData must be used within TrainingProvider')
  return ctx
}
