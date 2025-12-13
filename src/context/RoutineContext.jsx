import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../services/api'

const RoutineContext = createContext(null)

export function RoutineProvider({ children }) {
  const [routines, setRoutines] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const data = await api.getRoutines()
        setRoutines(data.map((r) => ({ ...r, id: r._id || r.id })))
        setError(null)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const addRoutine = async (routine) => {
    const payload = { ...routine, branch: routine.branch || 'general', _id: routine.id }
    const saved = await api.createRoutine(payload)
    setRoutines((prev) => [{ ...saved, id: routine.id, branch: saved.branch || payload.branch }, ...prev])
  }

  const updateRoutine = async (id, payload) => {
    const body = { ...payload, branch: payload.branch || 'general' }
    const saved = await api.updateRoutine(id, body)
    setRoutines((prev) => prev.map((r) => (r.id === id ? { ...saved, id, branch: saved.branch || body.branch } : r)))
  }

  const deleteRoutine = async (id) => {
    await api.deleteRoutine(id)
    setRoutines((prev) => prev.filter((r) => r.id !== id))
  }

  const duplicateRoutine = async (id) => {
    const found = routines.find((r) => r._id === id || r.id === id)
    if (!found) return
    const copy = { ...found, id: `${id}-copy-${Date.now()}`, name: `${found.name} (Copia)`, branch: found.branch || 'general' }
    await addRoutine(copy)
  }

  const value = useMemo(
    () => ({ routines, loading, error, addRoutine, updateRoutine, deleteRoutine, duplicateRoutine }),
    [routines, loading, error],
  )

  return <RoutineContext.Provider value={value}>{children}</RoutineContext.Provider>
}

export function useRoutines() {
  const ctx = useContext(RoutineContext)
  if (!ctx) throw new Error('useRoutines must be used within RoutineProvider')
  return ctx
}
